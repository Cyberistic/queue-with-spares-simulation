import type { SimulationParams, SimulationMode } from "./simulation"

export interface TheoreticalResults1D {
  P: number[] // P[n] for n = 0..K
  L: number // Average number in system
  Lq: number // Average number in queue
  W: number // Average time in system
  Wq: number // Average time in queue
  throughput: number // Effective throughput
  blockingProb: number // Probability system is full
  serverUtilization: number // Average server utilization
}

export interface TheoreticalResults2D {
  P: number[][] // P[n][j] for n = 0..K, j = 0..s+Y
  Pn: number[] // Marginal P[n]
  Lj: number[] // Marginal P[j]
  L: number // Average number of customers
  L_failed: number // Average number of failed servers
  throughput: number // Effective throughput
  blockingProb: number // Probability system is full
  availability: number // System availability
}

export function computeTheoretical1D(
  params: SimulationParams
): TheoreticalResults1D {
  const { M, s, K, lambda, mu } = params
  const rho = lambda / mu

  // Compute P0
  let sum = 0

  // n = 0 to s
  for (let n = 0; n <= Math.min(s, K); n++) {
    const binom = factorial(M) / (factorial(M - n) * factorial(n))
    sum += binom * Math.pow(rho, n)
  }

  // n = s+1 to K
  for (let n = s + 1; n <= K; n++) {
    // P_n = [M! / ((M-n)! s! s^(n-s))] * rho^n * P_0
    const numerator = factorial(M) / factorial(M - n)
    const denominator = factorial(s) * Math.pow(s, n - s)
    sum += (numerator / denominator) * Math.pow(rho, n)
  }

  // Wait, let me use the formula directly:
  // P_n = [M! / ((M-n)! n!)] * rho^n * P_0  for n <= s
  // P_n = [M! / ((M-n)! s! s^(n-s))] * rho^n * P_0 for n > s

  sum = 0
  for (let n = 0; n <= K; n++) {
    if (n <= s) {
      const coeff = factorial(M) / (factorial(M - n) * factorial(n))
      sum += coeff * Math.pow(rho, n)
    } else {
      const coeff =
        factorial(M) / (factorial(M - n) * factorial(s) * Math.pow(s, n - s))
      sum += coeff * Math.pow(rho, n)
    }
  }

  const P0 = 1 / sum
  const P: number[] = []

  for (let n = 0; n <= K; n++) {
    if (n <= s) {
      const coeff = factorial(M) / (factorial(M - n) * factorial(n))
      P[n] = coeff * Math.pow(rho, n) * P0
    } else {
      const coeff =
        factorial(M) / (factorial(M - n) * factorial(s) * Math.pow(s, n - s))
      P[n] = coeff * Math.pow(rho, n) * P0
    }
  }

  // Average number in system
  let L = 0
  for (let n = 0; n <= K; n++) {
    L += n * P[n]
  }

  // Average number in queue
  let Lq = 0
  for (let n = s + 1; n <= K; n++) {
    Lq += (n - s) * P[n]
  }

  // Effective arrival rate
  const lambda_eff = lambda * (M - L)

  // Throughput = effective arrival rate (at steady state)
  const throughput = lambda_eff

  // Average time in system (Little's law)
  const W = lambda_eff > 0 ? L / lambda_eff : 0

  // Average time in queue
  const Wq = lambda_eff > 0 ? Lq / lambda_eff : 0

  // Blocking probability = P_K * (M-K) / (M-L)
  const blockingProb = K < M ? (P[K] * (M - K)) / (M - L) : 0

  // Server utilization
  let serverUtilization = 0
  for (let n = 1; n <= s; n++) {
    serverUtilization += (n / s) * P[n]
  }
  for (let n = s + 1; n <= K; n++) {
    serverUtilization += P[n]
  }

  return { P, L, Lq, W, Wq, throughput, blockingProb, serverUtilization }
}

function factorial(n: number): number {
  if (n < 0) return 0
  if (n === 0 || n === 1) return 1
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

export function computeTheoretical2D(
  params: SimulationParams
): TheoreticalResults2D {
  const { M, s, K, lambda, mu, alpha, beta, Y } = params
  const maxJ = s + Y

  // Build the generator matrix Q and solve pi * Q = 0
  // We'll use iterative method (Gauss-Seidel) for stability

  const numStates = (K + 1) * (maxJ + 1)

  // Flatten state (n,j) -> idx = n * (maxJ+1) + j
  const getIdx = (n: number, j: number) => n * (maxJ + 1) + j

  // Initialize uniform distribution
  let pi = new Array(numStates).fill(1 / numStates)

  // Gauss-Seidel iteration
  for (let iter = 0; iter < 5000; iter++) {
    let maxDiff = 0

    for (let n = 0; n <= K; n++) {
      for (let j = 0; j <= maxJ; j++) {
        const idx = getIdx(n, j)
        const cj = Math.min(s, s + Y - j)

        // Calculate total outgoing rate
        let totalOut = 0
        if (n < K) totalOut += (M - n) * lambda
        if (n > 0 && cj > 0) totalOut += Math.min(n, cj) * mu
        if (j < maxJ) totalOut += cj * alpha
        if (j > 0) totalOut += j * beta

        if (totalOut === 0) continue

        // Sum of incoming probabilities * rates
        let inSum = 0

        // From (n-1, j) via arrival
        if (n > 0) {
          const fromIdx = getIdx(n - 1, j)
          inSum += pi[fromIdx] * (M - (n - 1)) * lambda
        }

        // From (n+1, j) via service
        if (n < K) {
          const fromIdx = getIdx(n + 1, j)
          const cj_next = Math.min(s, s + Y - j)
          if (cj_next > 0) {
            inSum += pi[fromIdx] * Math.min(n + 1, cj_next) * mu
          }
        }

        // From (n, j-1) via failure
        if (j > 0) {
          const fromIdx = getIdx(n, j - 1)
          const cj_prev = Math.min(s, s + Y - (j - 1))
          inSum += pi[fromIdx] * cj_prev * alpha
        }

        // From (n, j+1) via repair
        if (j < maxJ) {
          const fromIdx = getIdx(n, j + 1)
          inSum += pi[fromIdx] * (j + 1) * beta
        }

        const newVal = inSum / totalOut
        maxDiff = Math.max(maxDiff, Math.abs(newVal - pi[idx]))
        pi[idx] = newVal
      }
    }

    // Normalize
    const sum = pi.reduce((a, b) => a + b, 0)
    pi = pi.map((p) => p / sum)

    if (maxDiff < 1e-12) break
  }

  // Build result matrices
  const P: number[][] = []
  const Pn: number[] = new Array(K + 1).fill(0)
  const Lj: number[] = new Array(maxJ + 1).fill(0)

  for (let n = 0; n <= K; n++) {
    P[n] = []
    for (let j = 0; j <= maxJ; j++) {
      const p = pi[getIdx(n, j)]
      P[n][j] = p
      Pn[n] += p
      Lj[j] += p
    }
  }

  // Average customers
  let L = 0
  for (let n = 0; n <= K; n++) {
    L += n * Pn[n]
  }

  // Average failed servers
  let L_failed = 0
  for (let j = 0; j <= maxJ; j++) {
    L_failed += j * Lj[j]
  }

  // Throughput
  let throughput = 0
  for (let n = 0; n <= K; n++) {
    for (let j = 0; j <= maxJ; j++) {
      const cj = Math.min(s, s + Y - j)
      if (cj > 0) {
        throughput += P[n][j] * Math.min(n, cj) * mu
      }
    }
  }

  // Blocking probability = P_K * (M-K) / (M-L)
  const blockingProb = K < M ? (Pn[K] * (M - K)) / (M - L) : 0

  // Availability = probability that at least one server is available
  let availability = 0
  for (let j = 0; j <= maxJ; j++) {
    const cj = Math.min(s, s + Y - j)
    if (cj > 0) {
      availability += Lj[j]
    }
  }

  return { P, Pn, Lj, L, L_failed, throughput, blockingProb, availability }
}

export function computeTheoretical(
  params: SimulationParams,
  mode: SimulationMode
): TheoreticalResults1D | TheoreticalResults2D {
  if (mode === "1d") {
    return computeTheoretical1D(params)
  }
  return computeTheoretical2D(params)
}
