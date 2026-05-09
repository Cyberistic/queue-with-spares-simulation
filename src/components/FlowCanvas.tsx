import { useMemo, useCallback, useEffect } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type {
  SimulationParams,
  SimulationMode,
  SimState,
} from "@/lib/simulation"

interface FlowCanvasProps {
  params: SimulationParams
  mode: SimulationMode
  currentState: SimState | null
  stateVisits: Map<string, number>
}

function StateNode1D({
  data,
}: {
  data: {
    label: string
    active: boolean
    visits: number
    maxVisits: number
    rateIn: string
    rateOut: string
  }
}) {
  const intensity = data.maxVisits > 0 ? data.visits / data.maxVisits : 0
  return (
    <div
      className={`relative rounded-lg border-2 px-4 py-2 font-mono text-xs font-semibold transition-all duration-300 ${
        data.active
          ? "scale-110 border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20"
          : "border-border bg-card text-foreground"
      }`}
      style={{
        backgroundColor: data.active
          ? undefined
          : `rgba(var(--primary-rgb), ${0.05 + intensity * 0.15})`,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !bg-primary"
      />
      <div className="text-center">
        <div>{data.label}</div>
        {data.rateIn && (
          <div className="mt-0.5 text-[9px] text-muted-foreground">
            {data.rateIn}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !bg-primary"
      />
    </div>
  )
}

function StateNode2D({
  data,
}: {
  data: {
    label: string
    active: boolean
    visits: number
    maxVisits: number
    n: number
    j: number
  }
}) {
  const intensity = data.maxVisits > 0 ? data.visits / data.maxVisits : 0
  return (
    <div
      className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-md border-2 font-mono text-[10px] font-semibold transition-all duration-300 ${
        data.active
          ? "z-10 scale-110 border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20"
          : "border-border bg-card text-foreground"
      }`}
      style={{
        backgroundColor: data.active
          ? undefined
          : `rgba(var(--primary-rgb), ${0.05 + intensity * 0.2})`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !bg-primary"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !bg-primary"
      />
      <div className="text-center leading-tight">
        <div>
          ({data.n},{data.j})
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !bg-primary"
      />
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
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const maxVisits = useMemo(() => {
    if (stateVisits.size === 0) return 1
    return Math.max(...stateVisits.values())
  }, [stateVisits])

  const build1D = useCallback((): { nodes: Node[]; edges: Edge[] } => {
    const { M, s, K, lambda, mu } = params
    const nodeList: Node[] = []
    const edgeList: Edge[] = []
    const spacing = 140

    for (let n = 0; n <= K; n++) {
      const arrivalRate = n < K ? (M - n) * lambda : 0
      const serviceRate = n > 0 ? Math.min(n, s) * mu : 0

      nodeList.push({
        id: `n${n}`,
        type: "state1d",
        position: { x: n * spacing, y: 0 },
        data: {
          label: `S${n}`,
          active: currentState?.n === n,
          visits: stateVisits.get(`${n}`) || 0,
          maxVisits,
          rateIn: n < K ? `λ=${arrivalRate.toFixed(2)}` : "",
          rateOut: n > 0 ? `μ=${serviceRate.toFixed(2)}` : "",
        },
      })

      if (n < K) {
        edgeList.push({
          id: `e-${n}-${n + 1}`,
          source: `n${n}`,
          target: `n${n + 1}`,
          type: "default",
          animated: currentState?.n === n,
          label: `${((M - n) * lambda).toFixed(2)}`,
          labelStyle: {
            fontSize: 10,
            fill: "var(--foreground)",
            fontFamily: "monospace",
          },
          labelBgStyle: { fill: "var(--background)", fillOpacity: 0.8 },
          labelBgPadding: [4, 4],
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          style: { stroke: "var(--primary)", strokeWidth: 2 },
        })
      }

      if (n > 0) {
        edgeList.push({
          id: `e-${n}-${n - 1}`,
          source: `n${n}`,
          target: `n${n - 1}`,
          type: "default",
          animated: currentState?.n === n,
          label: `${(Math.min(n, s) * mu).toFixed(2)}`,
          labelStyle: {
            fontSize: 10,
            fill: "var(--foreground)",
            fontFamily: "monospace",
          },
          labelBgStyle: { fill: "var(--background)", fillOpacity: 0.8 },
          labelBgPadding: [4, 4],
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          style: { stroke: "var(--chart-2)", strokeWidth: 2 },
        })
      }
    }

    return { nodes: nodeList, edges: edgeList }
  }, [params, currentState, stateVisits, maxVisits])

  const build2D = useCallback((): { nodes: Node[]; edges: Edge[] } => {
    const { s, K, Y } = params
    const maxJ = s + Y
    const nodeList: Node[] = []
    const edgeList: Edge[] = []
    const xSpacing = 90
    const ySpacing = 90

    for (let n = 0; n <= K; n++) {
      for (let j = 0; j <= maxJ; j++) {
        const cj = Math.min(s, s + Y - j)
        const isActive = currentState?.n === n && (currentState as any)?.j === j

        nodeList.push({
          id: `s-${n}-${j}`,
          type: "state2d",
          position: { x: n * xSpacing, y: j * ySpacing },
          data: {
            label: `(${n},${j})`,
            active: isActive,
            visits: stateVisits.get(`${n},${j}`) || 0,
            maxVisits,
            n,
            j,
          },
        })

        // Arrival: (n,j) -> (n+1,j)
        if (n < K) {
          edgeList.push({
            id: `a-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n + 1}-${j}`,
            type: "default",
            animated: isActive,
            markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
            style: { stroke: "var(--primary)", strokeWidth: 1.5, opacity: 0.6 },
          })
        }

        // Service: (n,j) -> (n-1,j)
        if (n > 0 && cj > 0) {
          edgeList.push({
            id: `sv-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n - 1}-${j}`,
            type: "default",
            animated: isActive,
            markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
            style: { stroke: "var(--chart-2)", strokeWidth: 1.5, opacity: 0.6 },
          })
        }

        // Failure: (n,j) -> (n,j+1)
        if (j < maxJ) {
          edgeList.push({
            id: `f-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n}-${j + 1}`,
            type: "default",
            animated: isActive,
            markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
            style: {
              stroke: "var(--destructive)",
              strokeWidth: 1.5,
              opacity: 0.6,
            },
          })
        }

        // Repair: (n,j) -> (n,j-1)
        if (j > 0) {
          edgeList.push({
            id: `r-${n}-${j}`,
            source: `s-${n}-${j}`,
            target: `s-${n}-${j - 1}`,
            type: "default",
            animated: isActive,
            markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
            style: { stroke: "var(--chart-3)", strokeWidth: 1.5, opacity: 0.6 },
          })
        }
      }
    }

    return { nodes: nodeList, edges: edgeList }
  }, [params, currentState, stateVisits, maxVisits])

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } =
      mode === "1d" ? build1D() : build2D()
    setNodes(newNodes)
    setEdges(newEdges)
  }, [
    mode,
    params,
    currentState,
    stateVisits,
    build1D,
    build2D,
    setNodes,
    setEdges,
  ])

  return (
    <div className="relative h-full flex-1 bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
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
