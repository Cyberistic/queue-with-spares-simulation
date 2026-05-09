import type { SimulationParams, SimulationMode, SimState } from "./simulation"

export interface BalanceEquation {
  description: string
  formula: string
  filled: string
  value: number
}

export interface StateDetails {
  stateLabel: string
  stateType: string
  equations: BalanceEquation[]
  transitions: {
    type: string
    to: string
    rate: number
    formula: string
    filled: string
  }[]
}

export function getStateDetails(
  state: SimState,
  mode: SimulationMode,
  params: SimulationParams
): StateDetails {
  if (mode === "1d") {
    return get1DStateDetails(state as { n: number }, params)
  }
  return get2DStateDetails(state as { n: number; j: number }, params)
}

function get1DStateDetails(
  state: { n: number },
  params: SimulationParams
): StateDetails {
  const { n } = state
  const { M, s, K, lambda, mu } = params
  const label = `S${n}`
  const equations: BalanceEquation[] = []
  const transitions: StateDetails["transitions"] = []

  const arrivalInRate = n > 0 ? (M - n + 1) * lambda : 0
  const serviceInRate = n < K ? Math.min(n + 1, s) * mu : 0
  const arrivalOutRate = n < K ? (M - n) * lambda : 0
  const serviceOutRate = n > 0 ? Math.min(n, s) * mu : 0
  const totalOutRate = arrivalOutRate + serviceOutRate

  if (n === 0) {
    equations.push({
      description: "Balance Equation (Boundary)",
      formula: `M\\lambda P_0 = \\mu P_1`,
      filled: `${M} \\times ${lambda.toFixed(2)} P_0 = ${mu.toFixed(2)} P_1`,
      value: 0,
    })
    equations.push({
      description: "Rate Out",
      formula: `\\lambda_0 = M\\lambda`,
      filled: `${M} \\times ${lambda.toFixed(2)} = ${totalOutRate.toFixed(2)}`,
      value: totalOutRate,
    })
    equations.push({
      description: "Rate In (from S₁)",
      formula: `\\mu_1 = \\mu`,
      filled: `${mu.toFixed(2)}`,
      value: serviceInRate,
    })
  } else if (n === K) {
    equations.push({
      description: "Balance Equation (Boundary)",
      formula: `(M-K+1)\\lambda P_{K-1} = \\min(K,s)\\mu P_K`,
      filled: `(${M}-${K}+1) \\times ${lambda.toFixed(2)} P_${K - 1} = \\min(${K},${s}) \\times ${mu.toFixed(2)} P_${K}`,
      value: 0,
    })
    equations.push({
      description: "Rate In (from S_{K-1})",
      formula: `\\lambda_{K-1} = (M-K+1)\\lambda`,
      filled: `(${M}-${K}+1) \\times ${lambda.toFixed(2)} = ${arrivalInRate.toFixed(2)}`,
      value: arrivalInRate,
    })
    equations.push({
      description: "Rate Out",
      formula: `\\mu_K = \\min(K,s)\\mu`,
      filled: `\\min(${K},${s}) \\times ${mu.toFixed(2)} = ${serviceOutRate.toFixed(2)}`,
      value: serviceOutRate,
    })
  } else {
    equations.push({
      description: "Balance Equation (Interior)",
      formula: `[(M-n)\\lambda + \\min(n,s)\\mu]P_n = (M-n+1)\\lambda P_{n-1} + \\min(n+1,s)\\mu P_{n+1}`,
      filled: `[(${M}-${n})\\times${lambda.toFixed(2)} + \\min(${n},${s})\\times${mu.toFixed(2)}]P_${n} = (${M}-${n}+1)\\times${lambda.toFixed(2)} P_${n - 1} + \\min(${n}+1,${s})\\times${mu.toFixed(2)} P_${n + 1}`,
      value: 0,
    })
    equations.push({
      description: "Total Rate Out",
      formula: `(M-n)\\lambda + \\min(n,s)\\mu`,
      filled: `(${M}-${n})\\times${lambda.toFixed(2)} + \\min(${n},${s})\\times${mu.toFixed(2)} = ${totalOutRate.toFixed(2)}`,
      value: totalOutRate,
    })
    equations.push({
      description: "Rate In from S_{n-1}",
      formula: `(M-n+1)\\lambda`,
      filled: `(${M}-${n}+1)\\times${lambda.toFixed(2)} = ${arrivalInRate.toFixed(2)}`,
      value: arrivalInRate,
    })
    equations.push({
      description: "Rate In from S_{n+1}",
      formula: `\\min(n+1,s)\\mu`,
      filled: `\\min(${n + 1},${s})\\times${mu.toFixed(2)} = ${serviceInRate.toFixed(2)}`,
      value: serviceInRate,
    })
  }

  if (n < K) {
    transitions.push({
      type: "Arrival",
      to: `S${n + 1}`,
      rate: arrivalOutRate,
      formula: `\\lambda_${n} = (M-${n})\\lambda`,
      filled: `(${M}-${n}) \\times ${lambda.toFixed(2)} = ${arrivalOutRate.toFixed(2)}`,
    })
  }
  if (n > 0) {
    transitions.push({
      type: "Service",
      to: `S${n - 1}`,
      rate: serviceOutRate,
      formula: `\\mu_${n} = \\min(${n},s)\\mu`,
      filled: `\\min(${n},${s}) \\times ${mu.toFixed(2)} = ${serviceOutRate.toFixed(2)}`,
    })
  }

  return {
    stateLabel: label,
    stateType:
      n === 0 ? "Left Boundary" : n === K ? "Right Boundary" : "Interior",
    equations,
    transitions,
  }
}

function get2DStateDetails(
  state: { n: number; j: number },
  params: SimulationParams
): StateDetails {
  const { n, j } = state
  const { M, s, K, lambda, mu, alpha, beta, Y } = params
  const maxJ = s + Y
  const cj = Math.min(s, s + Y - j)
  const label = `(${n},${j})`
  const equations: BalanceEquation[] = []
  const transitions: StateDetails["transitions"] = []

  const arrivalOutRate = n < K ? (M - n) * lambda : 0
  const serviceOutRate = n > 0 && cj > 0 ? Math.min(n, cj) * mu : 0
  const failureOutRate = j < maxJ ? cj * alpha : 0
  const repairOutRate = j > 0 ? j * beta : 0
  const totalOutRate =
    arrivalOutRate + serviceOutRate + failureOutRate + repairOutRate

  const isLeftBoundary = n === 0
  const isRightBoundary = n === K
  const isBottomBoundary = j === 0
  const isTopBoundary = j === maxJ

  let stateType = "Interior"
  if (isLeftBoundary && isBottomBoundary) stateType = "Corner (0,0)"
  else if (isRightBoundary && isBottomBoundary) stateType = "Corner (K,0)"
  else if (isLeftBoundary && isTopBoundary) stateType = `Corner (0,${maxJ})`
  else if (isRightBoundary && isTopBoundary) stateType = `Corner (K,${maxJ})`
  else if (isLeftBoundary) stateType = "Left Boundary"
  else if (isRightBoundary) stateType = "Right Boundary"
  else if (isBottomBoundary) stateType = "Bottom Boundary"
  else if (isTopBoundary) stateType = "Top Boundary"

  // Build balance equation
  let formula = ""
  let filled = ""

  if (isLeftBoundary && isBottomBoundary) {
    formula = `[M\\lambda + s\\alpha]P_{0,0} = \\mu P_{1,0} + \\beta P_{0,1}`
    filled = `[${M}\\times${lambda.toFixed(2)} + ${s}\\times${alpha.toFixed(3)}]P_{0,0} = ${mu.toFixed(2)}P_{1,0} + ${beta.toFixed(2)}P_{0,1}`
  } else if (isRightBoundary && isBottomBoundary) {
    formula = `[s\\mu + s\\alpha]P_{K,0} = (M-K+1)\\lambda P_{K-1,0} + \\beta P_{K,1}`
    filled = `[${s}\\times${mu.toFixed(2)} + ${s}\\times${alpha.toFixed(3)}]P_{${K},0} = (${M}-${K}+1)\\times${lambda.toFixed(2)} P_{${K - 1},0} + ${beta.toFixed(2)}P_{${K},1}`
  } else if (isLeftBoundary && isTopBoundary) {
    formula = `[M\\lambda + ${maxJ}\\beta]P_{0,${maxJ}} = \\alpha P_{0,${maxJ - 1}}`
    filled = `[${M}\\times${lambda.toFixed(2)} + ${maxJ}\\times${beta.toFixed(2)}]P_{0,${maxJ}} = ${alpha.toFixed(3)}P_{0,${maxJ - 1}}`
  } else if (isRightBoundary && isTopBoundary) {
    formula = `${maxJ}\\beta P_{K,${maxJ}} = (M-K+1)\\lambda P_{K-1,${maxJ}} + \\alpha P_{K,${maxJ - 1}}`
    filled = `${maxJ}\\times${beta.toFixed(2)} P_{${K},${maxJ}} = (${M}-${K}+1)\\times${lambda.toFixed(2)} P_{${K - 1},${maxJ}} + ${alpha.toFixed(3)}P_{${K},${maxJ - 1}}`
  } else if (isBottomBoundary) {
    formula = `[(M-n)\\lambda + \\min(n,s)\\mu + s\\alpha]P_{n,0} = (M-n+1)\\lambda P_{n-1,0} + \\min(n+1,s)\\mu P_{n+1,0} + \\beta P_{n,1}`
    filled = `[(${M}-${n})\\times${lambda.toFixed(2)} + \\min(${n},${s})\\times${mu.toFixed(2)} + ${s}\\times${alpha.toFixed(3)}]P_{${n},0} = (${M}-${n}+1)\\times${lambda.toFixed(2)} P_{${n - 1},0} + \\min(${n + 1},${s})\\times${mu.toFixed(2)} P_{${n + 1},0} + ${beta.toFixed(2)}P_{${n},1}`
  } else if (isTopBoundary) {
    formula = `[(M-n)\\lambda + ${maxJ}\\beta]P_{n,${maxJ}} = (M-n+1)\\lambda P_{n-1,${maxJ}} + \\alpha P_{n,${maxJ - 1}}`
    filled = `[(${M}-${n})\\times${lambda.toFixed(2)} + ${maxJ}\\times${beta.toFixed(2)}]P_{${n},${maxJ}} = (${M}-${n}+1)\\times${lambda.toFixed(2)} P_{${n - 1},${maxJ}} + ${alpha.toFixed(3)}P_{${n},${maxJ - 1}}`
  } else if (isLeftBoundary) {
    formula = `[M\\lambda + c(j)\\alpha + j\\beta]P_{0,j} = \\mu P_{1,j} + c(j-1)\\alpha P_{0,j-1} + (j+1)\\beta P_{0,j+1}`
    filled = `[${M}\\times${lambda.toFixed(2)} + ${cj.toFixed(0)}\\times${alpha.toFixed(3)} + ${j}\\times${beta.toFixed(2)}]P_{0,${j}} = ${mu.toFixed(2)}P_{1,${j}} + ${Math.min(s, s + Y - (j - 1)).toFixed(0)}\\times${alpha.toFixed(3)} P_{0,${j - 1}} + ${j + 1}\\times${beta.toFixed(2)} P_{0,${j + 1}}`
  } else if (isRightBoundary) {
    formula = `[c(j)\\mu + c(j)\\alpha + j\\beta]P_{K,j} = (M-K+1)\\lambda P_{K-1,j} + c(j-1)\\alpha P_{K,j-1} + (j+1)\\beta P_{K,j+1}`
    filled = `[${cj.toFixed(0)}\\times${mu.toFixed(2)} + ${cj.toFixed(0)}\\times${alpha.toFixed(3)} + ${j}\\times${beta.toFixed(2)}]P_{${K},${j}} = (${M}-${K}+1)\\times${lambda.toFixed(2)} P_{${K - 1},${j}} + ${Math.min(s, s + Y - (j - 1)).toFixed(0)}\\times${alpha.toFixed(3)} P_{${K},${j - 1}} + ${j + 1}\\times${beta.toFixed(2)} P_{${K},${j + 1}}`
  } else {
    formula = `[(M-n)\\lambda + \\min(n,c(j))\\mu + c(j)\\alpha + j\\beta]P_{n,j} = (M-n+1)\\lambda P_{n-1,j} + \\min(n+1,c(j))\\mu P_{n+1,j} + c(j-1)\\alpha P_{n,j-1} + (j+1)\\beta P_{n,j+1}`
    filled = `[(${M}-${n})\\times${lambda.toFixed(2)} + \\min(${n},${cj.toFixed(0)})\\times${mu.toFixed(2)} + ${cj.toFixed(0)}\\times${alpha.toFixed(3)} + ${j}\\times${beta.toFixed(2)}]P_{${n},${j}} = (${M}-${n}+1)\\times${lambda.toFixed(2)} P_{${n - 1},${j}} + \\min(${n + 1},${cj.toFixed(0)})\\times${mu.toFixed(2)} P_{${n + 1},${j}} + ${Math.min(s, s + Y - (j - 1)).toFixed(0)}\\times${alpha.toFixed(3)} P_{${n},${j - 1}} + ${j + 1}\\times${beta.toFixed(2)} P_{${n},${j + 1}}`
  }

  equations.push({
    description: `Balance Equation (${stateType})`,
    formula,
    filled,
    value: totalOutRate,
  })

  equations.push({
    description: "Total Rate Out",
    formula: `\\lambda_n + \\mu_n + \\alpha_j + \\beta_j`,
    filled: `${arrivalOutRate.toFixed(2)} + ${serviceOutRate.toFixed(2)} + ${failureOutRate.toFixed(3)} + ${repairOutRate.toFixed(2)} = ${totalOutRate.toFixed(2)}`,
    value: totalOutRate,
  })

  // Transitions
  if (n < K) {
    transitions.push({
      type: "Arrival",
      to: `(${n + 1},${j})`,
      rate: arrivalOutRate,
      formula: `(M-n)\\lambda`,
      filled: `(${M}-${n}) \\times ${lambda.toFixed(2)} = ${arrivalOutRate.toFixed(2)}`,
    })
  }
  if (n > 0 && cj > 0) {
    transitions.push({
      type: "Service",
      to: `(${n - 1},${j})`,
      rate: serviceOutRate,
      formula: `\\min(n,c(j))\\mu`,
      filled: `\\min(${n},${cj.toFixed(0)}) \\times ${mu.toFixed(2)} = ${serviceOutRate.toFixed(2)}`,
    })
  }
  if (j < maxJ) {
    transitions.push({
      type: "Failure",
      to: `(${n},${j + 1})`,
      rate: failureOutRate,
      formula: `c(j)\\alpha`,
      filled: `${cj.toFixed(0)} \\times ${alpha.toFixed(3)} = ${failureOutRate.toFixed(3)}`,
    })
  }
  if (j > 0) {
    transitions.push({
      type: "Repair",
      to: `(${n},${j - 1})`,
      rate: repairOutRate,
      formula: `j\\beta`,
      filled: `${j} \\times ${beta.toFixed(2)} = ${repairOutRate.toFixed(2)}`,
    })
  }

  return {
    stateLabel: label,
    stateType,
    equations,
    transitions,
  }
}
