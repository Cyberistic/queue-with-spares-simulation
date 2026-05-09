import { useMemo, useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type {
  SimulationParams,
  SimulationMode,
  SimState,
} from "@/lib/simulation"
import { Latex } from "@/components/Latex"

function edgeStyle(color: string, active: boolean, width = 1.5) {
  return {
    stroke: color,
    strokeWidth: active ? width + 0.75 : width,
    opacity: active ? 1 : 0.6,
  }
}

interface FlowCanvasProps {
  params: SimulationParams
  mode: SimulationMode
  currentState: SimState | null
  stateVisits: Map<string, number>
  selectedState: SimState | null
  onNodeClick: (state: SimState) => void
  layoutVersion: number
}

/* ─── 1-D node ─── */
function StateNode1D({
  data,
}: {
  data: {
    label: string
    active: boolean
    selected: boolean
    visits: number
    maxVisits: number
    rateIn: string
    rateOut: string
    onClick: () => void
  }
}) {
  const intensity = data.maxVisits > 0 ? data.visits / data.maxVisits : 0
  return (
    <div
      onClick={data.onClick}
      className={`relative min-w-[88px] cursor-pointer rounded-lg border-2 px-3 py-2 font-mono text-xs font-semibold transition-all duration-300 ${
        data.active
          ? "z-10 scale-110 border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20"
          : data.selected
            ? "z-10 scale-105 border-chart-3 bg-chart-3/20 text-chart-3 shadow-lg shadow-chart-3/20"
            : "border-border bg-card text-foreground hover:border-primary/50"
      }`}
      style={{
        backgroundColor:
          data.active || data.selected
            ? undefined
            : `rgba(var(--primary-rgb), ${0.05 + intensity * 0.15})`,
      }}
    >
      {/* Arrival handles — top corners */}
      <Handle
        type="target"
        position={Position.Left}
        id="tl"
        className="!h-1.5 !w-1.5 !border-0 !bg-primary/50"
        style={{ top: 6, bottom: "auto" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="tr"
        className="!h-1.5 !w-1.5 !border-0 !bg-primary/50"
        style={{ top: 6, bottom: "auto" }}
      />

      {/* Service handles — bottom corners */}
      <Handle
        type="target"
        position={Position.Right}
        id="br"
        className="!h-1.5 !w-1.5 !border-0 !bg-chart-2/50"
        style={{ top: "auto", bottom: 6 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="bl"
        className="!h-1.5 !w-1.5 !border-0 !bg-chart-2/50"
        style={{ top: "auto", bottom: 6 }}
      />

      <div className="text-center">
        <div>{data.label}</div>
        {data.rateIn && (
          <Latex className="mt-0.5 block text-[9px] text-muted-foreground">
            {data.rateIn}
          </Latex>
        )}
      </div>
    </div>
  )
}

/* ─── 2-D node ─── */
function StateNode2D({
  data,
}: {
  data: {
    label: string
    active: boolean
    selected: boolean
    visits: number
    maxVisits: number
    n: number
    j: number
    onClick: () => void
  }
}) {
  const intensity = data.maxVisits > 0 ? data.visits / data.maxVisits : 0
  return (
    <div
      onClick={data.onClick}
      className={`relative flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-md border-2 font-mono text-[10px] font-semibold transition-all duration-300 ${
        data.active
          ? "z-10 scale-110 border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20"
          : data.selected
            ? "z-10 scale-105 border-chart-3 bg-chart-3/20 text-chart-3 shadow-lg shadow-chart-3/20"
            : "border-border bg-card text-foreground hover:border-primary/50"
      }`}
      style={{
        backgroundColor:
          data.active || data.selected
            ? undefined
            : `rgba(var(--primary-rgb), ${0.05 + intensity * 0.2})`,
      }}
    >
      {/* Arrival: top-right out → top-left in  (arc above) */}
      <Handle
        type="target"
        position={Position.Left}
        id="atl"
        className="!h-1 !w-1 !border-0 !bg-primary/50"
        style={{ top: 6, bottom: "auto" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="atr"
        className="!h-1 !w-1 !border-0 !bg-primary/50"
        style={{ top: 6, bottom: "auto" }}
      />

      {/* Service: bottom-left out → bottom-right in  (arc below) */}
      <Handle
        type="target"
        position={Position.Right}
        id="abr"
        className="!h-1 !w-1 !border-0 !bg-chart-2/50"
        style={{ top: "auto", bottom: 6 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="abl"
        className="!h-1 !w-1 !border-0 !bg-chart-2/50"
        style={{ top: "auto", bottom: 6 }}
      />

      {/* Failure: bottom-right out → top-right in  (arc right side) */}
      <Handle
        type="target"
        position={Position.Top}
        id="fr"
        className="!h-1 !w-1 !border-0 !bg-destructive/50"
        style={{ left: "auto", right: 6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="fbr"
        className="!h-1 !w-1 !border-0 !bg-destructive/50"
        style={{ left: "auto", right: 6 }}
      />

      {/* Repair: top-left out → bottom-left in  (arc left side) */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="rbl"
        className="!h-1 !w-1 !border-0 !bg-chart-3/50"
        style={{ left: 6, right: "auto" }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="rtl"
        className="!h-1 !w-1 !border-0 !bg-chart-3/50"
        style={{ left: 6, right: "auto" }}
      />

      <div className="text-center leading-tight">
        <div>
          ({data.n},{data.j})
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  state1d: StateNode1D,
  state2d: StateNode2D,
}

export function FlowCanvas({
  params,
  mode,
  currentState,
  stateVisits,
  selectedState,
  onNodeClick,
  layoutVersion,
}: FlowCanvasProps) {
  const maxVisits = useMemo(() => {
    if (stateVisits.size === 0) return 1
    return Math.max(...stateVisits.values())
  }, [stateVisits])

  const build1D = useCallback((): { nodes: Node[]; edges: Edge[] } => {
    const { M, s, K, lambda, mu } = params
    const nodeList: Node[] = []
    const edgeList: Edge[] = []
    const spacing = 190
    const xOffset = (K * spacing) / 2

    for (let n = 0; n <= K; n++) {
      nodeList.push({
        id: `n${n}`,
        type: "state1d",
        position: { x: n * spacing - xOffset, y: 0 },
        data: {
          label: `S${n}`,
          active: currentState?.n === n,
          selected: selectedState?.n === n,
          visits: stateVisits.get(`${n}`) || 0,
          maxVisits,
          rateIn: "",
          rateOut: "",
          onClick: () => onNodeClick({ n }),
        },
      })

      // Arrival: n → n+1  (top-right of n  →  top-left of n+1)
      if (n < K) {
        edgeList.push({
          id: `e-${n}-${n + 1}`,
          source: `n${n}`,
          target: `n${n + 1}`,
          sourceHandle: "tr",
          targetHandle: "tl",
          type: "default",
          label: `${((M - n) * lambda).toFixed(2)}`,
          labelStyle: {
            fontSize: 10,
            fill: "var(--foreground)",
            fontFamily: "monospace",
          },
          labelBgStyle: { fill: "var(--background)", fillOpacity: 0.8 },
          labelBgPadding: [4, 4],
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
          },
          style: edgeStyle("var(--primary)", currentState?.n === n, 2),
        })
      }

      // Service: n → n-1  (bottom-left of n  →  bottom-right of n-1)
      if (n > 0) {
        edgeList.push({
          id: `e-${n}-${n - 1}`,
          source: `n${n}`,
          target: `n${n - 1}`,
          sourceHandle: "bl",
          targetHandle: "br",
          type: "default",
          label: `${(Math.min(n, s) * mu).toFixed(2)}`,
          labelStyle: {
            fontSize: 10,
            fill: "var(--foreground)",
            fontFamily: "monospace",
          },
          labelBgStyle: { fill: "var(--background)", fillOpacity: 0.8 },
          labelBgPadding: [4, 4],
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
          },
          style: edgeStyle("var(--chart-2)", currentState?.n === n, 2),
        })
      }
    }

    return { nodes: nodeList, edges: edgeList }
  }, [params, currentState, selectedState, stateVisits, maxVisits, onNodeClick])

  const build2D = useCallback((): { nodes: Node[]; edges: Edge[] } => {
    const { s, K, Y } = params
    const maxJ = s + Y
    const nodeList: Node[] = []
    const edgeList: Edge[] = []
    const xSpacing = 90
    const ySpacing = 90
    const xOffset = (K * xSpacing) / 2
    const yOffset = (maxJ * ySpacing) / 2

    for (let n = 0; n <= K; n++) {
      for (let j = 0; j <= maxJ; j++) {
        const cj = Math.min(s, s + Y - j)
        const isActive = currentState?.n === n && (currentState as any)?.j === j
        const isSelected =
          selectedState?.n === n && (selectedState as any)?.j === j

        nodeList.push({
          id: `s-${n}-${j}`,
          type: "state2d",
          position: { x: n * xSpacing - xOffset, y: j * ySpacing - yOffset },
          data: {
            label: `(${n},${j})`,
            active: isActive,
            selected: isSelected,
            visits: stateVisits.get(`${n},${j}`) || 0,
            maxVisits,
            n,
            j,
            onClick: () => onNodeClick({ n, j }),
          },
        })

        // Arrival: (n,j) → (n+1,j)  top-right → top-left  (arc above)
        if (n < K) {
          edgeList.push({
            id: `a-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n + 1}-${j}`,
            sourceHandle: "atr",
            targetHandle: "atl",
            type: "default",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 10,
              height: 10,
            },
            style: edgeStyle("var(--primary)", isActive),
          })
        }

        // Service: (n,j) → (n-1,j)  bottom-left → bottom-right  (arc below)
        if (n > 0 && cj > 0) {
          edgeList.push({
            id: `sv-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n - 1}-${j}`,
            sourceHandle: "abl",
            targetHandle: "abr",
            type: "default",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 10,
              height: 10,
            },
            style: edgeStyle("var(--chart-2)", isActive),
          })
        }

        // Failure: (n,j) → (n,j+1)  bottom-right → top-right  (arc right)
        if (j < maxJ) {
          edgeList.push({
            id: `f-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n}-${j + 1}`,
            sourceHandle: "fbr",
            targetHandle: "fr",
            type: "default",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 10,
              height: 10,
            },
            style: edgeStyle("var(--destructive)", isActive),
          })
        }

        // Repair: (n,j) → (n,j-1)  top-left → bottom-left  (arc left)
        if (j > 0) {
          edgeList.push({
            id: `r-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n}-${j - 1}`,
            sourceHandle: "rtl",
            targetHandle: "rbl",
            type: "default",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 10,
              height: 10,
            },
            style: edgeStyle("var(--chart-3)", isActive),
          })
        }
      }
    }

    return { nodes: nodeList, edges: edgeList }
  }, [params, currentState, selectedState, stateVisits, maxVisits, onNodeClick])

  const { nodes, edges } = useMemo(
    () => (mode === "1d" ? build1D() : build2D()),
    [mode, build1D, build2D]
  )

  const flowKey = useMemo(
    () => `${mode}-${params.K}-${params.s}-${params.Y}-${layoutVersion}`,
    [mode, params.K, params.s, params.Y, layoutVersion]
  )

  return (
    <div className="relative h-full flex-1 bg-muted/30">
      <ReactFlow
        key={flowKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
      >
        <Background color="var(--border)" gap={20} size={1} />
        <Controls className="!border-border !bg-card !shadow-md" />
      </ReactFlow>
      <div className="absolute top-3 left-3 rounded-md border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-sm backdrop-blur-sm">
        {mode === "1d"
          ? "1D State Transition Diagram"
          : "2D State Transition Diagram"}
      </div>
      {mode === "2d" && (
        <div className="absolute bottom-3 left-3 flex gap-3 rounded-md border border-border bg-card/90 px-3 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" /> Arrival
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />{" "}
            Service
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive" /> Failure
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--chart-3)]" /> Repair
          </span>
        </div>
      )}
    </div>
  )
}
