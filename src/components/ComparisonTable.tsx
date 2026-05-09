import { useState, useCallback, useMemo } from "react"
import type { SimulationParams, SimulationMode } from "@/lib/simulation"
import type { TheoreticalResults1D, TheoreticalResults2D } from "@/lib/theory"

interface ComparisonTableProps {
  params: SimulationParams
  mode: SimulationMode
  simResults: {
    avgCustomers: number
    avgFailedServers: number
    throughput: number
    blockingProb: number
    totalTransitions: number
    currentTime: number
  }
  theoretical: TheoreticalResults1D | TheoreticalResults2D | null
}

export function ComparisonTable({
  params,
  mode,
  simResults,
  theoretical,
}: ComparisonTableProps) {
  const [showAllStates, setShowAllStates] = useState(false)
  const [copied, setCopied] = useState(false)

  const rows = useMemo(() => {
    if (!theoretical) return []

    // Defensive: ensure theoretical matches the current mode
    if (mode === "1d" && "Lq" in theoretical) {
      const theo = theoretical as TheoreticalResults1D
      return [
        {
          metric: "Avg Customers (L)",
          sim: simResults.avgCustomers,
          theo: theo.L,
        },
        { metric: "Avg in Queue (Lq)", sim: NaN, theo: theo.Lq },
        {
          metric: "Throughput",
          sim: simResults.throughput,
          theo: theo.throughput,
        },
        {
          metric: "Blocking Prob",
          sim: simResults.blockingProb,
          theo: theo.blockingProb,
        },
        {
          metric: "Server Utilization",
          sim: NaN,
          theo: theo.serverUtilization,
        },
        { metric: "Avg Time in System (W)", sim: NaN, theo: theo.W },
        { metric: "Avg Time in Queue (Wq)", sim: NaN, theo: theo.Wq },
      ]
    } else if (mode === "2d" && "L_failed" in theoretical) {
      const theo = theoretical as TheoreticalResults2D
      return [
        {
          metric: "Avg Customers (L)",
          sim: simResults.avgCustomers,
          theo: theo.L,
        },
        {
          metric: "Avg Failed Servers",
          sim: simResults.avgFailedServers,
          theo: theo.L_failed,
        },
        {
          metric: "Throughput",
          sim: simResults.throughput,
          theo: theo.throughput,
        },
        {
          metric: "Blocking Prob",
          sim: simResults.blockingProb,
          theo: theo.blockingProb,
        },
        { metric: "Availability", sim: NaN, theo: theo.availability },
      ]
    }
    return []
  }, [mode, theoretical, simResults])

  const stateRows = useMemo(() => {
    if (!theoretical) return []
    if (mode === "1d" && "Lq" in theoretical) {
      const theo = theoretical as TheoreticalResults1D
      return theo.P.map((p, n) => ({ state: `S${n}`, theo: p }))
    } else if (mode === "2d" && "L_failed" in theoretical) {
      const theo = theoretical as TheoreticalResults2D
      const rows: { state: string; theo: number }[] = []
      for (let n = 0; n <= params.K; n++) {
        for (let j = 0; j <= params.s + params.Y; j++) {
          rows.push({ state: `(${n},${j})`, theo: theo.P[n][j] })
        }
      }
      return rows
    }
    return []
  }, [mode, theoretical, params])

  const generateMarkdown = useCallback(() => {
    const lines: string[] = []
    lines.push("# Queueing System Simulation Results")
    lines.push("")
    lines.push("## Parameters")
    lines.push("")
    lines.push("| Parameter | Value |")
    lines.push("|-----------|-------|")
    lines.push(`| Mode | ${mode.toUpperCase()} |`)
    lines.push(`| Population (M) | ${params.M} |`)
    lines.push(`| Servers (s) | ${params.s} |`)
    lines.push(`| Capacity (K) | ${params.K} |`)
    lines.push(`| Arrival Rate (λ) | ${params.lambda} |`)
    lines.push(`| Service Rate (μ) | ${params.mu} |`)
    if (mode === "2d") {
      lines.push(`| Spare Servers (Y) | ${params.Y} |`)
      lines.push(`| Failure Rate (α) | ${params.alpha} |`)
      lines.push(`| Repair Rate (β) | ${params.beta} |`)
    }
    lines.push(`| Simulated Time | ${simResults.currentTime.toFixed(2)} |`)
    lines.push(
      `| Total Transitions | ${simResults.totalTransitions.toLocaleString()} |`
    )
    lines.push("")
    lines.push("## Performance Metrics")
    lines.push("")
    lines.push("| Metric | Simulation | Theoretical | Error % |")
    lines.push("|--------|-----------|-------------|---------|")
    for (const row of rows) {
      if (!isNaN(row.sim) && row.theo > 0) {
        const error = Math.abs((row.sim - row.theo) / row.theo) * 100
        lines.push(
          `| ${row.metric} | ${row.sim.toFixed(6)} | ${row.theo.toFixed(6)} | ${error.toFixed(2)}% |`
        )
      } else if (!isNaN(row.sim)) {
        lines.push(
          `| ${row.metric} | ${row.sim.toFixed(6)} | ${row.theo.toFixed(6)} | N/A |`
        )
      } else {
        lines.push(`| ${row.metric} | N/A | ${row.theo.toFixed(6)} | N/A |`)
      }
    }
    lines.push("")
    lines.push("## State Probabilities")
    lines.push("")
    lines.push("| State | Theoretical P |")
    lines.push("|-------|---------------|")
    const displayStates = showAllStates ? stateRows : stateRows.slice(0, 20)
    for (const row of displayStates) {
      lines.push(`| ${row.state} | ${row.theo.toFixed(6)} |`)
    }
    if (!showAllStates && stateRows.length > 20) {
      lines.push(`| ... (${stateRows.length - 20} more) | |`)
    }
    lines.push("")
    return lines.join("\n")
  }, [params, mode, simResults, rows, stateRows, showAllStates])

  const copyToClipboard = useCallback(() => {
    const markdown = generateMarkdown()
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generateMarkdown])

  return (
    <div className="flex max-h-80 shrink-0 flex-col gap-3 overflow-y-auto border-t border-border bg-card p-4">
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

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 pr-4 text-left font-medium text-muted-foreground">
                Metric
              </th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                Simulation
              </th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                Theoretical
              </th>
              <th className="py-1.5 pl-2 text-right font-medium text-muted-foreground">
                Error %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasSim = !isNaN(row.sim)
              const error =
                hasSim && row.theo > 0
                  ? Math.abs((row.sim - row.theo) / row.theo) * 100
                  : null
              return (
                <tr
                  key={row.metric}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <td className="py-1.5 pr-4">{row.metric}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {hasSim ? row.sim.toFixed(6) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-muted-foreground tabular-nums">
                    {typeof row.theo === "number" && !isNaN(row.theo)
                      ? row.theo.toFixed(6)
                      : "—"}
                  </td>
                  <td className="py-1.5 pl-2 text-right font-mono tabular-nums">
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

      {/* State probabilities table */}
      <div className="mt-2">
        <h3 className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          State Probabilities
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1 pr-3 text-left font-medium text-muted-foreground">
                  State
                </th>
                <th className="px-2 py-1 text-right font-medium text-muted-foreground">
                  Theoretical
                </th>
              </tr>
            </thead>
            <tbody>
              {(showAllStates ? stateRows : stateRows.slice(0, 20)).map(
                (row) => (
                  <tr key={row.state} className="border-b border-border/30">
                    <td className="py-1 pr-3 font-mono">{row.state}</td>
                    <td className="px-2 py-1 text-right font-mono text-muted-foreground tabular-nums">
                      {row.theo.toFixed(6)}
                    </td>
                  </tr>
                )
              )}
              {!showAllStates && stateRows.length > 20 && (
                <tr>
                  <td
                    colSpan={2}
                    className="py-1 text-center text-muted-foreground"
                  >
                    ... {stateRows.length - 20} more states
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
