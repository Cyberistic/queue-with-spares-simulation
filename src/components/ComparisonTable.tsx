import { useState, useCallback, useMemo } from "react"
import type { SimulationParams, SimulationMode } from "@/lib/simulation"
import type { TheoreticalResults1D, TheoreticalResults2D } from "@/lib/theory"
import { Latex } from "@/components/Latex"
import { getBalanceEquationSummary } from "@/components/BalanceEquationBar"
import { StateProbabilityChart } from "@/components/StateProbabilityChart"

interface ComparisonTableProps {
  params: SimulationParams
  mode: SimulationMode
  simResults: {
    avgCustomers: number
    avgQueueLength: number
    avgFailedServers: number
    throughput: number
    blockingProb: number
    availability: number
    serverUtilization: number
    avgTimeInSystem: number
    avgTimeInQueue: number
    totalTransitions: number
    currentTime: number
  }
  theoretical: TheoreticalResults1D | TheoreticalResults2D | null
  empiricalProbabilities: Map<string, number>
  fullscreen?: boolean
}

type MetricRow = {
  metric: string
  symbol: string
  sim: number
  theo: number
  formula: string
  filled: string
}

type StateRow = {
  state: string
  key: string
  sim: number
  theo: number
}

export function ComparisonTable({
  params,
  mode,
  simResults,
  theoretical,
  empiricalProbabilities,
  fullscreen = false,
}: ComparisonTableProps) {
  const [showAllStates, setShowAllStates] = useState(false)
  const [copied, setCopied] = useState(false)

  const rows = useMemo<MetricRow[]>(() => {
    if (mode === "1d") {
      const theo = theoretical as TheoreticalResults1D | null
      return [
        {
          metric: "Avg Customers",
          symbol: "L",
          sim: simResults.avgCustomers,
          theo: theo?.L ?? NaN,
          formula: `L = \\sum_{n=0}^{K} n P_n`,
          filled: `L = ${theo?.L?.toFixed(6) ?? "0.000000"}`,
        },
        {
          metric: "Avg in Queue",
          symbol: "L_q",
          sim: simResults.avgQueueLength,
          theo: theo?.Lq ?? NaN,
          formula: `L_q = \\sum_{n=s+1}^{K} (n-s) P_n`,
          filled: `L_q = ${theo?.Lq?.toFixed(6) ?? "0.000000"}`,
        },
        {
          metric: "Throughput",
          symbol: "X",
          sim: simResults.throughput,
          theo: theo?.throughput ?? NaN,
          formula: `X = \\lambda_{eff} = \\lambda (M - L)`,
          filled: `X = ${params.lambda.toFixed(3)}(${params.M} - ${(theo?.L ?? 0).toFixed(6)}) = ${theo?.throughput?.toFixed(6) ?? "0.000000"}`,
        },
        {
          metric: "Blocking Prob",
          symbol: "P_{block}",
          sim: simResults.blockingProb,
          theo: theo?.blockingProb ?? NaN,
          formula: `P_{block} = \\frac{P_K (M-K)}{M-L}`,
          filled: `P_{block} = ${theo ? `\\frac{${(theo.P[params.K] ?? 0).toFixed(6)}(${params.M}-${params.K})}{${params.M}-${theo.L.toFixed(6)}}` : "0"} = ${theo?.blockingProb?.toFixed(6) ?? "0.000000"}`,
        },
        {
          metric: "Server Utilization",
          symbol: "U",
          sim: simResults.serverUtilization,
          theo: theo?.serverUtilization ?? NaN,
          formula: `U = \\frac{1}{s}\\sum_{n=1}^{K} \\min(n,s) P_n`,
          filled: `U = ${theo?.serverUtilization?.toFixed(6) ?? "0.000000"}`,
        },
        {
          metric: "Avg Time in System",
          symbol: "W",
          sim: simResults.avgTimeInSystem,
          theo: theo?.W ?? NaN,
          formula: `W = \\frac{L}{X}`,
          filled: `W = \\frac{${(theo?.L ?? 0).toFixed(6)}}{${(theo?.throughput ?? 0).toFixed(6)}} = ${theo?.W?.toFixed(6) ?? "0.000000"}`,
        },
        {
          metric: "Avg Time in Queue",
          symbol: "W_q",
          sim: simResults.avgTimeInQueue,
          theo: theo?.Wq ?? NaN,
          formula: `W_q = \\frac{L_q}{X}`,
          filled: `W_q = \\frac{${(theo?.Lq ?? 0).toFixed(6)}}{${(theo?.throughput ?? 0).toFixed(6)}} = ${theo?.Wq?.toFixed(6) ?? "0.000000"}`,
        },
      ]
    }

    const theo = theoretical as TheoreticalResults2D | null
    return [
      {
        metric: "Avg Customers",
        symbol: "L",
        sim: simResults.avgCustomers,
        theo: theo?.L ?? NaN,
        formula: `L = \\sum_{n=0}^{K} \\sum_{j=0}^{s+Y} n P_{n,j}`,
        filled: `L = ${theo?.L?.toFixed(6) ?? "0.000000"}`,
      },
      {
        metric: "Avg Failed Servers",
        symbol: "j_{avg}",
        sim: simResults.avgFailedServers,
        theo: theo?.L_failed ?? NaN,
        formula: `j_{avg} = \\sum_{n=0}^{K} \\sum_{j=0}^{s+Y} j P_{n,j}`,
        filled: `j_{avg} = ${theo?.L_failed?.toFixed(6) ?? "0.000000"}`,
      },
      {
        metric: "Throughput",
        symbol: "X",
        sim: simResults.throughput,
        theo: theo?.throughput ?? NaN,
        formula: `X = \\sum_{n=0}^{K} \\sum_{j=0}^{s+Y} P_{n,j}\\min(n,c(j))\\mu`,
        filled: `X = ${theo?.throughput?.toFixed(6) ?? "0.000000"}`,
      },
      {
        metric: "Blocking Prob",
        symbol: "P_{block}",
        sim: simResults.blockingProb,
        theo: theo?.blockingProb ?? NaN,
        formula: `P_{block} = \\frac{P_K (M-K)}{M-L}`,
        filled: `P_{block} = \\frac{${(theo?.Pn?.[params.K] ?? 0).toFixed(6)}(${params.M}-${params.K})}{${params.M}-${(theo?.L ?? 0).toFixed(6)}} = ${theo?.blockingProb?.toFixed(6) ?? "0.000000"}`,
      },
      {
        metric: "Availability",
        symbol: "A",
        sim: simResults.availability,
        theo: theo?.availability ?? NaN,
        formula: `A = \\sum_{j: c(j) > 0} P_j`,
        filled: `A = ${theo?.availability?.toFixed(6) ?? "0.000000"}`,
      },
    ]
  }, [mode, theoretical, simResults])

  const stateRows = useMemo<StateRow[]>(() => {
    if (!theoretical) return []

    if (mode === "1d") {
      const theo = theoretical as TheoreticalResults1D
      return theo.P.map((p, n) => ({
        state: `S${n}`,
        key: `${n}`,
        sim: empiricalProbabilities.get(`${n}`) ?? 0,
        theo: p,
      }))
    }

    const theo = theoretical as TheoreticalResults2D
    const rows: StateRow[] = []
    for (let n = 0; n <= params.K; n++) {
      for (let j = 0; j <= params.s + params.Y; j++) {
        const key = `${n},${j}`
        rows.push({
          state: `(${n},${j})`,
          key,
          sim: empiricalProbabilities.get(key) ?? 0,
          theo: typeof theo.P[n]?.[j] === "number" ? theo.P[n][j] : 0,
        })
      }
    }
    return rows
  }, [mode, theoretical, params, empiricalProbabilities])

  const balanceEquationSummary = useMemo(
    () => getBalanceEquationSummary(params, mode),
    [params, mode]
  )

  const generateMarkdown = useCallback(() => {
    const lines: string[] = []
    lines.push("# Queueing System Simulation Results")
    lines.push("")
    lines.push("## Parameters")
    lines.push("")
    lines.push(`$M = ${params.M}$`)
    lines.push(`$s = ${params.s}$`)
    lines.push(`$K = ${params.K}$`)
    lines.push(`$\\lambda = ${params.lambda}$`)
    lines.push(`$\\mu = ${params.mu}$`)
    if (mode === "2d") {
      lines.push(`$Y = ${params.Y}$`)
      lines.push(`$\\alpha = ${params.alpha}$`)
      lines.push(`$\\beta = ${params.beta}$`)
    }
    lines.push(`$T_{sim} = ${simResults.currentTime.toFixed(2)}$`)
    lines.push(
      `$N_{transitions} = ${simResults.totalTransitions.toLocaleString()}$`
    )
    lines.push("")
    lines.push("## Performance Metrics")
    lines.push("")
    lines.push("| Metric | Symbol | Simulation | Theoretical | Error % |")
    lines.push("|--------|--------|-----------|-------------|---------|")
    for (const row of rows) {
      if (!isNaN(row.sim) && row.theo > 0) {
        const error = Math.abs((row.sim - row.theo) / row.theo) * 100
        lines.push(
          `| ${row.metric} | ${row.symbol} | ${row.sim.toFixed(6)} | ${row.theo.toFixed(6)} | ${error.toFixed(2)}% |`
        )
      } else if (!isNaN(row.sim)) {
        lines.push(
          `| ${row.metric} | ${row.symbol} | ${row.sim.toFixed(6)} | ${row.theo.toFixed(6)} | N/A |`
        )
      } else {
        lines.push(
          `| ${row.metric} | ${row.symbol} | N/A | ${row.theo.toFixed(6)} | N/A |`
        )
      }
    }
    lines.push("")
    lines.push("## State Probabilities")
    lines.push("")
    lines.push("| State | Simulation P | Theoretical P |")
    lines.push("|-------|--------------|---------------|")
    const displayStates = showAllStates ? stateRows : stateRows.slice(0, 20)
    for (const row of displayStates) {
      lines.push(
        `| ${row.state} | ${row.sim.toFixed(6)} | ${row.theo.toFixed(6)} |`
      )
    }
    if (!showAllStates && stateRows.length > 20) {
      lines.push(`| ... (${stateRows.length - 20} more) | | |`)
    }
    lines.push("")
    lines.push(`## ${balanceEquationSummary.title}`)
    lines.push("")
    for (const item of balanceEquationSummary.items) {
      lines.push(`### ${item.label}`)
      lines.push("")
      lines.push(`$$${item.formula}$$`)
      lines.push("")
      lines.push(`$$${item.filled}$$`)
      lines.push("")
    }
    return lines.join("\n")
  }, [
    params,
    mode,
    simResults,
    rows,
    stateRows,
    showAllStates,
    balanceEquationSummary,
  ])

  const copyToClipboard = useCallback(() => {
    const markdown = generateMarkdown()
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generateMarkdown])

  const MetricsTable = (
    <div className="overflow-visible rounded-lg border border-border bg-muted/20">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
              Metric
            </th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              Simulation
            </th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              Theoretical
            </th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              Error %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasSim = !isNaN(row.sim)
            const error =
              hasSim &&
              typeof row.theo === "number" &&
              !isNaN(row.theo) &&
              row.theo > 0
                ? Math.abs((row.sim - row.theo) / row.theo) * 100
                : null
            return (
              <tr
                key={row.metric}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="px-4 py-2.5">
                  <div className="group relative inline-flex items-center">
                    <span>{row.metric}</span>
                    <Latex className="ml-2 inline-block text-[11px] text-muted-foreground">
                      {`(${row.symbol})`}
                    </Latex>
                    <div className="pointer-events-none absolute top-full left-0 z-20 mt-2 hidden w-80 rounded-md border border-border bg-popover p-3 text-[11px] shadow-lg group-hover:block">
                      <div className="space-y-2">
                        <div>
                          <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                            Formula
                          </p>
                          <Latex display>{row.formula}</Latex>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                            With Values
                          </p>
                          <Latex display>{row.filled}</Latex>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                  {hasSim ? row.sim.toFixed(6) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                  {typeof row.theo === "number" && !isNaN(row.theo)
                    ? row.theo.toFixed(6)
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                  {error !== null ? (
                    <span
                      className={
                        error < 5
                          ? "text-green-600"
                          : error < 15
                            ? "text-amber-600"
                            : "text-destructive"
                      }
                    >
                      {error.toFixed(2)}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const StateProbabilities = (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              State
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              Simulation
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              Theoretical
            </th>
          </tr>
        </thead>
        <tbody>
          {(showAllStates ? stateRows : stateRows.slice(0, 20)).map((row) => (
            <tr key={row.state} className="border-b border-border/30">
              <td className="px-4 py-2 font-mono">{row.state}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">
                {row.sim.toFixed(6)}
              </td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                {typeof row.theo === "number" && !isNaN(row.theo)
                  ? row.theo.toFixed(6)
                  : "—"}
              </td>
            </tr>
          ))}
          {!showAllStates && stateRows.length > 20 && (
            <tr>
              <td
                colSpan={3}
                className="px-4 py-2 text-center text-muted-foreground"
              >
                ... {stateRows.length - 20} more states
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  if (fullscreen) {
    return (
      <div className="flex flex-col gap-4 bg-card p-4">
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-foreground/70 uppercase">
            Theoretical vs Simulation
          </h2>
          <div className="flex items-center gap-2">
            {stateRows.length > 20 && (
              <button
                onClick={() => setShowAllStates(!showAllStates)}
                className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAllStates ? "Show Less" : "Show All States"}
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {copied ? "Copied!" : "Copy as Markdown"}
            </button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Performance Metrics
            </h3>
            {MetricsTable}
          </div>

          <div className="min-w-0">
            <h3 className="mb-2 shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              State Probabilities
            </h3>
            {StateProbabilities}
          </div>
        </div>

        <StateProbabilityChart
          params={params}
          mode={mode}
          theoretical={theoretical}
          empiricalProbabilities={empiricalProbabilities}
        />
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-col gap-3 bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/70 uppercase">
          Theoretical vs Simulation
        </h2>
        <div className="flex items-center gap-2">
          {stateRows.length > 20 && (
            <button
              onClick={() => setShowAllStates(!showAllStates)}
              className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {showAllStates ? "Show Less" : "Show All States"}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              copied
                ? "bg-green-600 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {copied ? "Copied!" : "Copy as Markdown"}
          </button>
        </div>
      </div>

      {MetricsTable}

      <StateProbabilityChart
        params={params}
        mode={mode}
        theoretical={theoretical}
        empiricalProbabilities={empiricalProbabilities}
      />

      <div className="mt-2">
        <h3 className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          State Probabilities
        </h3>
        {StateProbabilities}
      </div>
    </div>
  )
}
