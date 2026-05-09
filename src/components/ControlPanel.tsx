import { useCallback } from "react"
import type { SimulationParams, SimulationMode } from "@/lib/simulation"

interface ControlPanelProps {
  params: SimulationParams
  setParams: (params: SimulationParams) => void
  mode: SimulationMode
  setMode: (mode: SimulationMode) => void
  isRunning: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onStep: () => void
  speed: number
  setSpeed: (speed: number) => void
  maxCycles: number
  setMaxCycles: (cycles: number) => void
  infiniteMode: boolean
  setInfiniteMode: (inf: boolean) => void
  currentCycle: number
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  format = (v) => v.toString(),
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
  format?: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground/80">
          {label}
        </label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:opacity-50"
      />
    </div>
  )
}

export function ControlPanel({
  params,
  setParams,
  mode,
  setMode,
  isRunning,
  onStart,
  onPause,
  onReset,
  onStep,
  speed,
  setSpeed,
  maxCycles,
  setMaxCycles,
  infiniteMode,
  setInfiniteMode,
  currentCycle,
}: ControlPanelProps) {
  const updateParam = useCallback(
    (key: keyof SimulationParams, value: number) => {
      setParams({ ...params, [key]: value })
    },
    [params, setParams]
  )

  return (
    <div className="flex h-full w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/70 uppercase">
          Parameters
        </h2>
        <div className="flex rounded-md bg-muted p-0.5">
          <button
            onClick={() => setMode("1d")}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              mode === "1d"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            1D
          </button>
          <button
            onClick={() => setMode("2d")}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              mode === "2d"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            2D
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Slider
          label="Population (M)"
          value={params.M}
          min={1}
          max={50}
          step={1}
          onChange={(v) => updateParam("M", v)}
        />
        <Slider
          label="Servers (s)"
          value={params.s}
          min={1}
          max={10}
          step={1}
          onChange={(v) => {
            updateParam("s", v)
            if (params.K < v) updateParam("K", v)
          }}
        />
        <Slider
          label="Capacity (K)"
          value={params.K}
          min={params.s}
          max={params.M}
          step={1}
          onChange={(v) => updateParam("K", v)}
        />
        <Slider
          label="Arrival Rate (λ)"
          value={params.lambda}
          min={0.01}
          max={5}
          step={0.01}
          onChange={(v) => updateParam("lambda", v)}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Service Rate (μ)"
          value={params.mu}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => updateParam("mu", v)}
          format={(v) => v.toFixed(1)}
        />

        {mode === "2d" && (
          <>
            <div className="my-1 h-px bg-border" />
            <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Spare Parameters
            </p>
            <Slider
              label="Spare Servers (Y)"
              value={params.Y}
              min={0}
              max={10}
              step={1}
              onChange={(v) => updateParam("Y", v)}
            />
            <Slider
              label="Failure Rate (α)"
              value={params.alpha}
              min={0.001}
              max={2}
              step={0.001}
              onChange={(v) => updateParam("alpha", v)}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="Repair Rate (β)"
              value={params.beta}
              min={0.01}
              max={10}
              step={0.01}
              onChange={(v) => updateParam("beta", v)}
              format={(v) => v.toFixed(2)}
            />
          </>
        )}
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
          Simulation Control
        </p>

        <Slider
          label="Speed"
          value={speed}
          min={0.1}
          max={5}
          step={0.1}
          onChange={setSpeed}
          format={(v) => `${v.toFixed(1)}x`}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInfiniteMode(!infiniteMode)}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
              infiniteMode
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className="flex h-3 w-3 items-center justify-center rounded-full border border-current">
              {infiniteMode && (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            Infinite
          </button>
          {!infiniteMode && (
            <div className="flex flex-1 items-center gap-2">
              <label className="text-xs text-muted-foreground">Cycles:</label>
              <input
                type="number"
                value={maxCycles}
                onChange={(e) =>
                  setMaxCycles(Math.max(1, Number(e.target.value)))
                }
                className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-xs tabular-nums"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Start
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-500 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-500/90"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
          )}
          <button
            onClick={onStep}
            disabled={isRunning}
            className="rounded-md bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            Step
          </button>
          <button
            onClick={onReset}
            className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            Reset
          </button>
        </div>

        {currentCycle > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Cycle:{" "}
            <span className="font-mono text-foreground">
              {currentCycle.toLocaleString()}
            </span>
            {!infiniteMode && (
              <span className="font-mono"> / {maxCycles.toLocaleString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
