import { useMemo } from "react"
import { X } from "lucide-react"
import type {
  SimulationParams,
  SimulationMode,
  SimState,
} from "@/lib/simulation"
import type { TheoreticalResults1D, TheoreticalResults2D } from "@/lib/theory"
import { getStateDetails } from "@/lib/balance-equations"
import { Latex } from "@/components/Latex"

interface StatsPanelProps {
  params: SimulationParams
  mode: SimulationMode
  currentState: SimState | null
  selectedState: SimState | null
  onDeselect: () => void
  stateVisits: Map<string, number>
  totalTransitions: number
  currentTime: number
  avgCustomers: number
  avgFailedServers: number
  throughput: number
  blockingProb: number
  theoretical: TheoreticalResults1D | TheoreticalResults2D | null
}

export function StatsPanel({
  params,
  mode,
  currentState,
  selectedState,
  onDeselect,
  stateVisits,
  totalTransitions,
  currentTime,
  avgCustomers,
  avgFailedServers,
  throughput,
  blockingProb,
  theoretical,
}: StatsPanelProps) {
  const { s, K, Y } = params
  const maxJ = mode === "2d" ? s + Y : 0

  // When no state is selected, auto-follow the current state
  const displayState = selectedState ?? currentState

  const stateDetails = useMemo(() => {
    if (!displayState) return null
    return getStateDetails(displayState, mode, params)
  }, [displayState, mode, params])

  // Build heatmap data
  const heatmapData = useMemo(() => {
    if (mode === "1d") {
      const data: { n: number; visits: number; prob: number }[] = []
      const totalVisits = Array.from(stateVisits.values()).reduce(
        (a, b) => a + b,
        0
      )
      for (let n = 0; n <= K; n++) {
        const visits = stateVisits.get(`${n}`) || 0
        data.push({
          n,
          visits,
          prob: totalVisits > 0 ? visits / totalVisits : 0,
        })
      }
      return { type: "1d" as const, data }
    } else {
      const data: {
        n: number
        j: number
        visits: number
        prob: number
      }[] = []
      const totalVisits = Array.from(stateVisits.values()).reduce(
        (a, b) => a + b,
        0
      )
      for (let n = 0; n <= K; n++) {
        for (let j = 0; j <= maxJ; j++) {
          const visits = stateVisits.get(`${n},${j}`) || 0
          data.push({
            n,
            j,
            visits,
            prob: totalVisits > 0 ? visits / totalVisits : 0,
          })
        }
      }
      return { type: "2d" as const, data, maxJ }
    }
  }, [mode, stateVisits, K, maxJ])

  const maxProb = useMemo(() => {
    if (heatmapData.type === "1d") {
      return Math.max(...heatmapData.data.map((d) => d.prob), 0.001)
    }
    return Math.max(...heatmapData.data.map((d) => d.prob), 0.001)
  }, [heatmapData])

  const theoPn = useMemo(() => {
    if (!theoretical) return null
    if (mode === "1d") {
      return (theoretical as TheoreticalResults1D).P
    }
    return (theoretical as TheoreticalResults2D).Pn
  }, [theoretical, mode])

  const transitionRows = useMemo(() => {
    if (!stateDetails) return []

    const orderedTypes =
      mode === "1d"
        ? (["Arrival", "Service"] as const)
        : (["Arrival", "Service", "Failure", "Repair"] as const)

    return orderedTypes.map((type) => {
      const transition = stateDetails.transitions.find((t) => t.type === type)
      return {
        type,
        active: Boolean(transition),
        to: transition?.to ?? "-",
        rate: transition?.rate ?? 0,
      }
    })
  }, [stateDetails, mode])

  return (
    <div className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-wide text-foreground/70 uppercase">
        Statistics
      </h2>

      {/* Current State */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Current State
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">State</span>
          <span className="font-mono text-sm font-semibold text-primary">
            {mode === "1d"
              ? `S${currentState?.n ?? 0}`
              : `(${currentState?.n ?? 0},${(currentState as any)?.j ?? 0})`}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sim Time</span>
          <span className="font-mono text-xs">{currentTime.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Transitions</span>
          <span className="font-mono text-xs">
            {totalTransitions.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Selected / Auto-follow State Details */}
      {stateDetails && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {selectedState ? "Selected State" : "Live State"}
              </p>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {stateDetails.stateLabel}
              </span>
            </div>
            {selectedState && (
              <button
                onClick={onDeselect}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Deselect"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <p className="mb-2 text-[10px] text-muted-foreground">
            {stateDetails.stateType}
          </p>

          {/* Transitions */}
          <div className="mb-3">
            <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Transitions
            </p>
            {transitionRows.map((t) => (
              <div
                key={t.type}
                className={`flex min-h-7 items-center justify-between border-b border-border/30 py-1 last:border-0 ${
                  t.active ? "" : "opacity-40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      t.type === "Arrival"
                        ? "bg-primary"
                        : t.type === "Service"
                          ? "bg-[var(--chart-2)]"
                          : t.type === "Failure"
                            ? "bg-destructive"
                            : "bg-[var(--chart-3)]"
                    }`}
                  />
                  <span className="text-[10px]">{t.type}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] tabular-nums">
                    {t.active ? t.rate.toFixed(3) : "-"}
                  </span>
                  <span className="ml-1 text-[9px] text-muted-foreground">
                    → {t.to}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Balance Equations */}
          <div className="space-y-2">
            {stateDetails.equations.map((eq, i) => (
              <div key={i}>
                <p className="mb-0.5 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                  {eq.description}
                </p>
                <div className="rounded bg-background/50 px-2 py-1">
                  <div className="overflow-x-auto text-[11px] leading-tight">
                    <Latex display>{eq.formula}</Latex>
                  </div>
                  <div className="mt-1 overflow-x-auto border-t border-border/30 pt-1 text-[11px] leading-tight">
                    <Latex display>{eq.filled}</Latex>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Metrics */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Simulation Metrics
        </p>
        <MetricRow
          label="Avg Customers"
          value={avgCustomers}
          theo={
            theoretical
              ? mode === "1d"
                ? (theoretical as TheoreticalResults1D).L
                : (theoretical as TheoreticalResults2D).L
              : null
          }
        />
        {mode === "2d" && (
          <MetricRow
            label="Avg Failed"
            value={avgFailedServers}
            theo={
              theoretical
                ? (theoretical as TheoreticalResults2D).L_failed
                : null
            }
          />
        )}
        <MetricRow
          label="Throughput"
          value={throughput}
          theo={
            theoretical
              ? mode === "1d"
                ? (theoretical as TheoreticalResults1D).throughput
                : (theoretical as TheoreticalResults2D).throughput
              : null
          }
        />
        <MetricRow
          label="Blocking P"
          value={blockingProb}
          theo={
            theoretical
              ? mode === "1d"
                ? (theoretical as TheoreticalResults1D).blockingProb
                : (theoretical as TheoreticalResults2D).blockingProb
              : null
          }
        />
      </div>

      {/* Heatmap */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          State Visit Heatmap
        </p>
        {heatmapData.type === "1d" ? (
          <div className="flex flex-col gap-0.5">
            {heatmapData.data.map((d) => {
              const intensity = d.prob / maxProb
              return (
                <div key={d.n} className="flex items-center gap-2">
                  <span className="w-6 text-right font-mono text-[10px] text-muted-foreground">
                    S{d.n}
                  </span>
                  <div className="relative flex-1 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-4 bg-primary/60 transition-all duration-300"
                      style={{ width: `${intensity * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-1 font-mono text-[9px] text-foreground/60">
                      {d.visits.toLocaleString()} ({(d.prob * 100).toFixed(1)}%)
                    </span>
                  </div>
                  {theoPn && (
                    <span className="w-10 text-right font-mono text-[9px] text-muted-foreground">
                      {(theoPn[d.n] * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex">
              <div className="w-4" />
              {Array.from({ length: K + 1 }, (_, n) => (
                <div
                  key={n}
                  className="w-6 text-center font-mono text-[8px] text-muted-foreground"
                >
                  n{n}
                </div>
              ))}
            </div>
            {Array.from({ length: maxJ + 1 }, (_, j) => (
              <div key={j} className="flex items-center">
                <div className="w-4 pr-0.5 text-right font-mono text-[8px] text-muted-foreground">
                  j{j}
                </div>
                {Array.from({ length: K + 1 }, (_, n) => {
                  const cell = heatmapData.data.find(
                    (d) => d.n === n && d.j === j
                  )
                  const prob = cell?.prob || 0
                  const visits = cell?.visits || 0
                  const intensity = prob / maxProb
                  const isActive =
                    currentState?.n === n && (currentState as any)?.j === j
                  return (
                    <div
                      key={n}
                      className={`flex h-6 w-6 items-center justify-center rounded-sm border font-mono text-[7px] transition-all duration-200 ${
                        isActive
                          ? "z-10 border-primary shadow-sm"
                          : "border-transparent"
                      }`}
                      style={{
                        backgroundColor: `rgba(var(--primary-rgb), ${0.05 + intensity * 0.85})`,
                      }}
                      title={`(${n},${j}): ${visits.toLocaleString()} visits (${(prob * 100).toFixed(1)}%)`}
                    >
                      {visits > 0 && visits < 1000
                        ? visits
                        : visits >= 1000
                          ? `${(visits / 1000).toFixed(1)}k`
                          : ""}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricRow({
  label,
  value,
  theo,
}: {
  label: string
  value: number
  theo: number | null
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium">
          {value.toFixed(4)}
        </span>
        {theo !== null && (
          <span className="font-mono text-[10px] text-muted-foreground">
            ({theo.toFixed(4)})
          </span>
        )}
      </div>
    </div>
  )
}
