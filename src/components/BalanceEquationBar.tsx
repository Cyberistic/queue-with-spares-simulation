import { useMemo } from "react"
import type { SimulationParams, SimulationMode } from "@/lib/simulation"
import { Latex } from "@/components/Latex"

interface BalanceEquationBarProps {
  params: SimulationParams
  mode: SimulationMode
}

export function getBalanceEquationSummary(
  params: SimulationParams,
  mode: SimulationMode
) {
  const { M, s, K, lambda, mu, alpha, beta, Y } = params

  if (mode === "1d") {
    return {
      title: "1D Balance Equations",
      items: [
        {
          label: "General (n ≤ s)",
          formula: `P_n = \\binom{M}{n} \\left(\\frac{\\lambda}{\\mu}\\right)^n P_0`,
          filled: `P_n = \\binom{${M}}{n} \\left(${(lambda / mu).toFixed(3)}\\right)^n P_0`,
        },
        {
          label: "General (n > s)",
          formula: `P_n = \\frac{n!}{s! \\, s^{n-s}} \\binom{M}{n} \\left(\\frac{\\lambda}{\\mu}\\right)^n P_0`,
          filled: `P_n = \\frac{n!}{${s}! \\, ${s}^{n-${s}}} \\binom{${M}}{n} \\left(${(lambda / mu).toFixed(3)}\\right)^n P_0`,
        },
        {
          label: "Normalization",
          formula: `\\sum_{n=0}^{K} P_n = 1`,
          filled: `\\sum_{n=0}^{${K}} P_n = 1`,
        },
      ],
    }
  }

  const maxJ = s + Y
  return {
    title: "2D Balance Equations",
    items: [
      {
        label: "Arrival Rate",
        formula: `\\lambda_n = (M - n) \\lambda`,
        filled: `\\lambda_n = (${M} - n) \\times ${lambda.toFixed(2)}`,
      },
      {
        label: "Service Rate",
        formula: `\\mu_{n,j} = \\min(n, c(j)) \\mu, \\quad c(j) = \\min(s, s+Y-j)`,
        filled: `\\mu_{n,j} = \\min(n, c(j)) \\times ${mu.toFixed(2)}, \\quad c(j) = \\min(${s}, ${s + Y}-j)`,
      },
      {
        label: "Failure Rate",
        formula: `\\alpha_j = c(j) \\alpha`,
        filled: `\\alpha_j = c(j) \\times ${alpha.toFixed(3)}`,
      },
      {
        label: "Repair Rate",
        formula: `\\beta_j = j \\beta`,
        filled: `\\beta_j = j \\times ${beta.toFixed(2)}`,
      },
      {
        label: "Normalization",
        formula: `\\sum_{n=0}^{K} \\sum_{j=0}^{${maxJ}} P_{n,j} = 1`,
        filled: `\\sum_{n=0}^{${K}} \\sum_{j=0}^{${maxJ}} P_{n,j} = 1`,
      },
    ],
  }
}

export function BalanceEquationBar({ params, mode }: BalanceEquationBarProps) {
  const equations = useMemo(
    () => getBalanceEquationSummary(params, mode),
    [params, mode]
  )

  return (
    <div className="shrink-0 border-t border-border bg-card p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {equations.title}
      </p>
      <div className="flex flex-wrap gap-4">
        {equations.items.map((item, i) => (
          <div key={i} className="min-w-[200px] flex-1">
            <p className="mb-0.5 text-[9px] text-muted-foreground">
              {item.label}
            </p>
            <div className="overflow-x-auto rounded bg-muted/30 px-2 py-1">
              <Latex>{item.formula}</Latex>
            </div>
            <div className="mt-0.5 overflow-x-auto rounded bg-primary/5 px-2 py-1">
              <Latex>{item.filled}</Latex>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
