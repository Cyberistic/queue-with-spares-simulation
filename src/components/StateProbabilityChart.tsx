import { useCallback, useMemo, useRef, useState } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  Line,
} from "recharts"
import { Latex } from "@/components/Latex"
import type { SimulationParams, SimulationMode } from "@/lib/simulation"
import type { TheoreticalResults1D, TheoreticalResults2D } from "@/lib/theory"

interface StateProbabilityChartProps {
  params: SimulationParams
  mode: SimulationMode
  theoretical: TheoreticalResults1D | TheoreticalResults2D | null
  empiricalProbabilities: Map<string, number>
}

export function StateProbabilityChart({
  params,
  mode,
  theoretical,
  empiricalProbabilities,
}: StateProbabilityChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [copied, setCopied] = useState(false)

  const data = useMemo(() => {
    if (!theoretical) return []

    if (mode === "1d") {
      const theo = theoretical as TheoreticalResults1D
      return theo.P.map((p, n) => ({
        state: `S${n}`,
        sim: empiricalProbabilities.get(`${n}`) ?? 0,
        stationary: p,
      }))
    }

    const theo = theoretical as TheoreticalResults2D
    const rows: { state: string; sim: number; stationary: number }[] = []
    for (let n = 0; n <= params.K; n++) {
      for (let j = 0; j <= params.s + params.Y; j++) {
        const key = `${n},${j}`
        rows.push({
          state: `(${n},${j})`,
          sim: empiricalProbabilities.get(key) ?? 0,
          stationary: typeof theo.P[n]?.[j] === "number" ? theo.P[n][j] : 0,
        })
      }
    }

    return rows
  }, [mode, params, theoretical, empiricalProbabilities])

  const chartWidth = useMemo(() => {
    const perStateWidth = mode === "1d" ? 24 : 16
    return Math.max(520, data.length * perStateWidth)
  }, [data.length, mode])

  const copyAsPng = useCallback(async () => {
    const svg = chartRef.current?.querySelector("svg")
    if (!svg) return

    const serialized = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    })
    const url = URL.createObjectURL(svgBlob)

    try {
      const image = new Image()
      image.decoding = "async"
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error("Failed to load chart image"))
      })
      image.src = url
      await loaded

      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, svg.clientWidth * 2)
      canvas.height = Math.max(1, svg.clientHeight * 2)
      const context = canvas.getContext("2d")
      if (!context) return

      context.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim()
        ? `hsl(${getComputedStyle(document.documentElement)
            .getPropertyValue("--background")
            .trim()})`
        : "white"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )

      if (!blob) return

      if (navigator.clipboard && "write" in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ])
      }

      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])

  if (!theoretical) return null

  return (
    <div className="group rounded-lg border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          State Probability Comparison
        </p>
        <button
          onClick={copyAsPng}
          className="rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
        >
          {copied ? "Copied PNG" : "Copy as PNG"}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <div
          className="flex justify-center"
          style={{ width: `max(100%, ${chartWidth}px)` }}
        >
          <div
            ref={chartRef}
            className="relative h-56"
            style={{ width: chartWidth }}
          >
            <Latex className="absolute top-1 left-2 z-10 text-[10px] text-muted-foreground">
              {mode === "1d" ? `P_n` : `P_{n,j}`}
            </Latex>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
                barCategoryGap="0%"
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="state"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  angle={-90}
                  textAnchor="end"
                  height={90}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => value.toFixed(2)}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? value.toFixed(6) : String(value)
                  }
                />
                <Legend />
                <Bar
                  dataKey="sim"
                  name="Simulation"
                  fill="var(--primary)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={mode === "1d" ? 24 : 16}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="stationary"
                  name="Theoretical"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--chart-2)" }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
