export interface SimulationParams {
  M: number // Population
  s: number // Servers
  K: number // Capacity
  lambda: number // Arrival rate per user
  mu: number // Service rate per server
  alpha: number // Failure rate (2D only)
  beta: number // Repair rate (2D only)
  Y: number // Spare servers (2D only)
}

export type SimulationMode = "1d" | "2d"

export interface State1D {
  n: number // number of customers in system
}

export interface State2D {
  n: number // number of customers in system
  j: number // number of failed servers
}

export type SimState = State1D | State2D

export interface Transition {
  from: SimState
  to: SimState
  rate: number
  type: "arrival" | "service" | "failure" | "repair"
}

export interface SimulationEvent {
  time: number
  state: SimState
  transition: Transition | null
}

export class QueueSimulation {
  params: SimulationParams
  mode: SimulationMode
  currentTime: number = 0
  currentState: SimState
  history: SimulationEvent[] = []
  stateVisits: Map<string, number> = new Map()
  totalTransitions: number = 0

  // Stats
  totalArrivals: number = 0
  totalServices: number = 0
  totalFailures: number = 0
  totalRepairs: number = 0
  timeInStates: Map<string, number> = new Map()
  lastStateChangeTime: number = 0

  // For 1D
  timeWeightedCustomers: number = 0
  lastCustomerCount: number = 0
  timeWeightedQueueLength: number = 0
  lastQueueLength: number = 0
  timeWeightedBusyServers: number = 0
  lastBusyServers: number = 0
  timeWeightedAvailability: number = 0
  lastAvailability: number = 1

  // For 2D
  timeWeightedFailedServers: number = 0
  lastFailedCount: number = 0

  blockedArrivals: number = 0

  constructor(params: SimulationParams, mode: SimulationMode) {
    this.params = { ...params }
    this.mode = mode
    this.currentState = mode === "1d" ? { n: 0 } : { n: 0, j: 0 }
    this.recordState()
  }

  reset() {
    this.currentTime = 0
    this.currentState = this.mode === "1d" ? { n: 0 } : { n: 0, j: 0 }
    this.history = []
    this.stateVisits = new Map()
    this.totalTransitions = 0
    this.totalArrivals = 0
    this.totalServices = 0
    this.totalFailures = 0
    this.totalRepairs = 0
    this.timeInStates = new Map()
    this.lastStateChangeTime = 0
    this.timeWeightedCustomers = 0
    this.lastCustomerCount = 0
    this.timeWeightedQueueLength = 0
    this.lastQueueLength = 0
    this.timeWeightedBusyServers = 0
    this.lastBusyServers = 0
    this.timeWeightedAvailability = 0
    this.lastAvailability = 1
    this.timeWeightedFailedServers = 0
    this.lastFailedCount = 0
    this.blockedArrivals = 0
    this.recordState()
  }

  private getEffectiveCapacity(state: SimState): number {
    if (this.mode === "1d") {
      return this.params.s
    }

    const { j } = state as State2D
    return Math.min(this.params.s, this.params.s + this.params.Y - j)
  }

  private getQueueLength(state: SimState): number {
    return Math.max(0, state.n - this.getEffectiveCapacity(state))
  }

  private getBusyServers(state: SimState): number {
    return Math.min(state.n, this.getEffectiveCapacity(state))
  }

  private getAvailabilityIndicator(state: SimState): number {
    return this.getEffectiveCapacity(state) > 0 ? 1 : 0
  }

  getStateKey(state: SimState): string {
    if (this.mode === "1d") {
      return `${(state as State1D).n}`
    }
    return `${(state as State2D).n},${(state as State2D).j}`
  }

  recordState() {
    const key = this.getStateKey(this.currentState)
    this.stateVisits.set(key, (this.stateVisits.get(key) || 0) + 1)

    // Update time-weighted stats
    const dt = this.currentTime - this.lastStateChangeTime
    if (dt > 0) {
      this.timeInStates.set(key, (this.timeInStates.get(key) || 0) + dt)
      this.timeWeightedCustomers += this.lastCustomerCount * dt
      this.timeWeightedQueueLength += this.lastQueueLength * dt
      this.timeWeightedBusyServers += this.lastBusyServers * dt
      this.timeWeightedAvailability += this.lastAvailability * dt
      if (this.mode === "2d") {
        this.timeWeightedFailedServers += this.lastFailedCount * dt
      }
    }

    this.lastCustomerCount = this.currentState.n
    this.lastQueueLength = this.getQueueLength(this.currentState)
    this.lastBusyServers = this.getBusyServers(this.currentState)
    this.lastAvailability = this.getAvailabilityIndicator(this.currentState)
    if (this.mode === "2d") {
      this.lastFailedCount = (this.currentState as State2D).j
    }
    this.lastStateChangeTime = this.currentTime

    this.history.push({
      time: this.currentTime,
      state: { ...this.currentState },
      transition: null,
    })
  }

  getTransitions(state: SimState): Transition[] {
    const { M, s, K, lambda, mu, alpha, beta, Y } = this.params
    const transitions: Transition[] = []

    if (this.mode === "1d") {
      const { n } = state as State1D

      // Arrival: n -> n+1 with rate (M-n)λ
      if (n < K) {
        transitions.push({
          from: { n },
          to: { n: n + 1 },
          rate: (M - n) * lambda,
          type: "arrival",
        })
      }

      // Service: n -> n-1 with rate min(n,s)μ
      if (n > 0) {
        transitions.push({
          from: { n },
          to: { n: n - 1 },
          rate: Math.min(n, s) * mu,
          type: "service",
        })
      }
    } else {
      const { n, j } = state as State2D
      const cj = Math.min(s, s + Y - j) // effective service capacity

      // Arrival: (n,j) -> (n+1,j) with rate (M-n)λ
      if (n < K) {
        transitions.push({
          from: { n, j },
          to: { n: n + 1, j },
          rate: (M - n) * lambda,
          type: "arrival",
        })
      }

      // Service: (n,j) -> (n-1,j) with rate min(n,c(j))μ
      if (n > 0 && cj > 0) {
        transitions.push({
          from: { n, j },
          to: { n: n - 1, j },
          rate: Math.min(n, cj) * mu,
          type: "service",
        })
      }

      // Failure: (n,j) -> (n,j+1) with rate c(j)α
      if (j < s + Y) {
        transitions.push({
          from: { n, j },
          to: { n, j: j + 1 },
          rate: cj * alpha,
          type: "failure",
        })
      }

      // Repair: (n,j) -> (n,j-1) with rate jβ
      if (j > 0) {
        transitions.push({
          from: { n, j },
          to: { n, j: j - 1 },
          rate: j * beta,
          type: "repair",
        })
      }
    }

    return transitions
  }

  step(): SimulationEvent | null {
    const transitions = this.getTransitions(this.currentState)
    if (transitions.length === 0) return null

    const totalRate = transitions.reduce((sum, t) => sum + t.rate, 0)
    if (totalRate === 0) return null

    // Sample time to next event
    const dt = -Math.log(Math.random()) / totalRate
    this.currentTime += dt

    // Sample which transition occurs
    let r = Math.random() * totalRate
    let chosen: Transition = transitions[0]
    for (const t of transitions) {
      r -= t.rate
      if (r <= 0) {
        chosen = t
        break
      }
    }

    // Update stats
    if (chosen.type === "arrival") this.totalArrivals++
    if (chosen.type === "service") this.totalServices++
    if (chosen.type === "failure") this.totalFailures++
    if (chosen.type === "repair") this.totalRepairs++
    if (chosen.type === "arrival" && this.currentState.n >= this.params.K) {
      this.blockedArrivals++
    }

    // Apply transition
    this.currentState = { ...chosen.to }
    this.totalTransitions++

    // Record time in previous state
    const prevKey = this.getStateKey(chosen.from)
    const timeInPrev = this.currentTime - this.lastStateChangeTime
    this.timeInStates.set(
      prevKey,
      (this.timeInStates.get(prevKey) || 0) + timeInPrev
    )
    this.timeWeightedCustomers += this.lastCustomerCount * timeInPrev
    this.timeWeightedQueueLength += this.lastQueueLength * timeInPrev
    this.timeWeightedBusyServers += this.lastBusyServers * timeInPrev
    this.timeWeightedAvailability += this.lastAvailability * timeInPrev
    if (this.mode === "2d") {
      this.timeWeightedFailedServers += this.lastFailedCount * timeInPrev
    }

    this.lastCustomerCount = this.currentState.n
    this.lastQueueLength = this.getQueueLength(this.currentState)
    this.lastBusyServers = this.getBusyServers(this.currentState)
    this.lastAvailability = this.getAvailabilityIndicator(this.currentState)
    if (this.mode === "2d") {
      this.lastFailedCount = (this.currentState as State2D).j
    }
    this.lastStateChangeTime = this.currentTime

    // Record new state
    const key = this.getStateKey(this.currentState)
    this.stateVisits.set(key, (this.stateVisits.get(key) || 0) + 1)

    const event: SimulationEvent = {
      time: this.currentTime,
      state: { ...this.currentState },
      transition: chosen,
    }
    this.history.push(event)

    return event
  }

  // Run multiple steps
  runSteps(count: number): SimulationEvent[] {
    const events: SimulationEvent[] = []
    for (let i = 0; i < count; i++) {
      const event = this.step()
      if (!event) break
      events.push(event)
    }
    return events
  }

  // Get empirical state probabilities
  getEmpiricalProbabilities(): Map<string, number> {
    const total = Array.from(this.timeInStates.values()).reduce(
      (a, b) => a + b,
      0
    )
    if (total === 0) return new Map()

    const probs = new Map<string, number>()
    for (const [key, time] of this.timeInStates) {
      probs.set(key, time / total)
    }
    // Current state time
    const currentKey = this.getStateKey(this.currentState)
    const dt = this.currentTime - this.lastStateChangeTime
    const currentTime = (this.timeInStates.get(currentKey) || 0) + dt
    const newTotal = total + dt

    const result = new Map<string, number>()
    for (const [key, time] of this.timeInStates) {
      result.set(key, time / newTotal)
    }
    result.set(currentKey, currentTime / newTotal)
    return result
  }

  // Get average number of customers
  getAverageCustomers(): number {
    if (this.currentTime === 0) return 0
    const dt = this.currentTime - this.lastStateChangeTime
    const totalWeighted =
      this.timeWeightedCustomers + this.lastCustomerCount * dt
    return totalWeighted / this.currentTime
  }

  getAverageQueueLength(): number {
    if (this.currentTime === 0) return 0
    const dt = this.currentTime - this.lastStateChangeTime
    const totalWeighted =
      this.timeWeightedQueueLength + this.lastQueueLength * dt
    return totalWeighted / this.currentTime
  }

  // Get average number of failed servers (2D only)
  getAverageFailedServers(): number {
    if (this.mode !== "2d" || this.currentTime === 0) return 0
    const dt = this.currentTime - this.lastStateChangeTime
    const totalWeighted =
      this.timeWeightedFailedServers + this.lastFailedCount * dt
    return totalWeighted / this.currentTime
  }

  // Get throughput
  getThroughput(): number {
    if (this.currentTime === 0) return 0
    return this.totalServices / this.currentTime
  }

  getAvailability(): number {
    if (this.currentTime === 0) return 0
    const dt = this.currentTime - this.lastStateChangeTime
    const totalWeighted =
      this.timeWeightedAvailability + this.lastAvailability * dt
    return totalWeighted / this.currentTime
  }

  getServerUtilization(): number {
    if (this.currentTime === 0 || this.params.s <= 0) return 0
    const dt = this.currentTime - this.lastStateChangeTime
    const totalWeighted =
      this.timeWeightedBusyServers + this.lastBusyServers * dt
    return totalWeighted / (this.currentTime * this.params.s)
  }

  getAverageTimeInSystem(): number {
    const throughput = this.getThroughput()
    if (throughput <= 0) return 0
    return this.getAverageCustomers() / throughput
  }

  getAverageTimeInQueue(): number {
    const throughput = this.getThroughput()
    if (throughput <= 0) return 0
    return this.getAverageQueueLength() / throughput
  }

  // Get blocking probability
  // In finite-source system: P(blocking) = P_K * (M-K) / (M - L)
  getBlockingProbability(): number {
    const probs = this.getEmpiricalProbabilities()
    let pk = 0
    if (this.mode === "1d") {
      pk = probs.get(`${this.params.K}`) || 0
    } else {
      for (let j = 0; j <= this.params.s + this.params.Y; j++) {
        pk += probs.get(`${this.params.K},${j}`) || 0
      }
    }
    const avgCustomers = this.getAverageCustomers()
    const denominator = this.params.M - avgCustomers
    if (denominator <= 0) return 0
    return (pk * (this.params.M - this.params.K)) / denominator
  }
}
