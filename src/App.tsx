import { useState, useCallback, useEffect, useRef } from "react"
import { Moon, Sun, RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { ControlPanel } from "@/components/ControlPanel"
import { FlowCanvas } from "@/components/FlowCanvas"
import { StatsPanel } from "@/components/StatsPanel"
import { ComparisonTable } from "@/components/ComparisonTable"
import { BalanceEquationBar } from "@/components/BalanceEquationBar"
import { useTheme } from "@/components/theme-provider"
import {
  QueueSimulation,
  type SimulationParams,
  type SimulationMode,
  type SimState,
} from "@/lib/simulation"
import {
  computeTheoretical,
  type TheoreticalResults1D,
  type TheoreticalResults2D,
} from "@/lib/theory"

const defaultParams: SimulationParams = {
  M: 10,
  s: 2,
  K: 5,
  lambda: 0.5,
  mu: 2,
  alpha: 1,
  beta: 1.5,
  Y: 5,
}

const DEFAULT_LEFT_WIDTH = 288
const DEFAULT_RIGHT_WIDTH = 320
const DEFAULT_BOTTOM_HEIGHT = 280
const MIN_PANEL_SIZE = 180

export function App() {
  const [params, setParams] = useState<SimulationParams>({ ...defaultParams })
  const [mode, setMode] = useState<SimulationMode>("1d")
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [maxCycles, setMaxCycles] = useState(10000)
  const [infiniteMode, setInfiniteMode] = useState(true)
  const [nonVisualMode, setNonVisualMode] = useState(false)
  const [currentCycle, setCurrentCycle] = useState(0)
  const [selectedState, setSelectedState] = useState<SimState | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)

  // Panel sizes
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH)
  const [bottomHeight, setBottomHeight] = useState(DEFAULT_BOTTOM_HEIGHT)
  const [bottomFullscreen, setBottomFullscreen] = useState(false)

  // Theme
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const simRef = useRef<QueueSimulation | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastStepTimeRef = useRef<number>(0)

  const [simState, setSimState] = useState({
    currentState: simRef.current?.currentState || { n: 0 },
    stateVisits: new Map<string, number>(),
    empiricalProbabilities: new Map<string, number>(),
    totalTransitions: 0,
    currentTime: 0,
    avgCustomers: 0,
    avgQueueLength: 0,
    avgFailedServers: 0,
    throughput: 0,
    blockingProb: 0,
    availability: 0,
    serverUtilization: 0,
    avgTimeInSystem: 0,
    avgTimeInQueue: 0,
  })

  const [theoretical, setTheoretical] = useState<
    TheoreticalResults1D | TheoreticalResults2D | null
  >(null)

  // Initialize/reinitialize simulation
  useEffect(() => {
    const sim = new QueueSimulation(params, mode)
    simRef.current = sim
    setCurrentCycle(0)
    setSelectedState(null)
    setSimState({
      currentState: sim.currentState,
      stateVisits: new Map(sim.stateVisits),
      empiricalProbabilities: new Map(sim.getEmpiricalProbabilities()),
      totalTransitions: 0,
      currentTime: 0,
      avgCustomers: 0,
      avgQueueLength: 0,
      avgFailedServers: 0,
      throughput: 0,
      blockingProb: 0,
      availability: 0,
      serverUtilization: 0,
      avgTimeInSystem: 0,
      avgTimeInQueue: 0,
    })

    try {
      const theo = computeTheoretical(params, mode)
      setTheoretical(theo)
    } catch (e) {
      console.error("Theoretical computation failed:", e)
      setTheoretical(null)
    }
  }, [params, mode])

  // Update sim state from ref
  const refreshSimState = useCallback(() => {
    const sim = simRef.current
    if (!sim) return
    setSimState({
      currentState: { ...sim.currentState },
      stateVisits: new Map(sim.stateVisits),
      empiricalProbabilities: new Map(sim.getEmpiricalProbabilities()),
      totalTransitions: sim.totalTransitions,
      currentTime: sim.currentTime,
      avgCustomers: sim.getAverageCustomers(),
      avgQueueLength: sim.getAverageQueueLength(),
      avgFailedServers: sim.getAverageFailedServers(),
      throughput: sim.getThroughput(),
      blockingProb: sim.getBlockingProbability(),
      availability: sim.getAvailability(),
      serverUtilization: sim.getServerUtilization(),
      avgTimeInSystem: sim.getAverageTimeInSystem(),
      avgTimeInQueue: sim.getAverageTimeInQueue(),
    })
    setCurrentCycle(sim.totalTransitions)
  }, [])

  // Animation loop
  const runStep = useCallback(() => {
    const sim = simRef.current
    if (!sim) return false
    const event = sim.step()
    return !!event
  }, [])

  const animate = useCallback(
    (timestamp: number) => {
      if (!isRunning) return
      const sim = simRef.current
      if (!sim) return

      if (!infiniteMode && sim.totalTransitions >= maxCycles) {
        setIsRunning(false)
        refreshSimState()
        return
      }

      const elapsed = timestamp - lastStepTimeRef.current
      const stepsPerFrame = Math.max(1, Math.floor(speed * 10))
      const stepInterval = 1000 / (speed * 60)

      if (elapsed >= stepInterval || lastStepTimeRef.current === 0) {
        lastStepTimeRef.current = timestamp
        for (let i = 0; i < stepsPerFrame; i++) {
          if (!infiniteMode && sim.totalTransitions >= maxCycles) {
            setIsRunning(false)
            break
          }
          if (!runStep()) {
            setIsRunning(false)
            break
          }
        }
        refreshSimState()
      }
      animFrameRef.current = requestAnimationFrame(animate)
    },
    [isRunning, infiniteMode, maxCycles, speed, runStep, refreshSimState]
  )

  useEffect(() => {
    if (isRunning) {
      lastStepTimeRef.current = 0
      animFrameRef.current = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(animFrameRef.current)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isRunning, animate])

  const handleStart = useCallback(() => {
    const sim = simRef.current
    if (!sim) return

    if (!infiniteMode && nonVisualMode) {
      setIsRunning(false)
      for (let i = sim.totalTransitions; i < maxCycles; i++) {
        if (!sim.step()) break
      }
      refreshSimState()
      return
    }

    setIsRunning(true)
  }, [infiniteMode, nonVisualMode, maxCycles, refreshSimState])
  const handlePause = useCallback(() => {
    setIsRunning(false)
    refreshSimState()
  }, [refreshSimState])
  const handleReset = useCallback(() => {
    setIsRunning(false)
    const sim = new QueueSimulation(params, mode)
    simRef.current = sim
    setCurrentCycle(0)
    setSelectedState(null)
    setSimState({
      currentState: sim.currentState,
      stateVisits: new Map(sim.stateVisits),
      empiricalProbabilities: new Map(sim.getEmpiricalProbabilities()),
      totalTransitions: 0,
      currentTime: 0,
      avgCustomers: 0,
      avgQueueLength: 0,
      avgFailedServers: 0,
      throughput: 0,
      blockingProb: 0,
      availability: 0,
      serverUtilization: 0,
      avgTimeInSystem: 0,
      avgTimeInQueue: 0,
    })
  }, [params, mode])
  const handleStep = useCallback(() => {
    runStep()
    refreshSimState()
  }, [runStep, refreshSimState])
  const handleModeChange = useCallback((newMode: SimulationMode) => {
    setMode(newMode)
    setTheoretical(null)
    setSelectedState(null)
  }, [])
  const handleNodeClick = useCallback((state: SimState) => {
    setSelectedState(state)
  }, [])

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark")
  }, [isDark, setTheme])

  // Reset layout
  const resetLayout = useCallback(() => {
    setLeftWidth(DEFAULT_LEFT_WIDTH)
    setRightWidth(DEFAULT_RIGHT_WIDTH)
    setBottomHeight(DEFAULT_BOTTOM_HEIGHT)
    setBottomFullscreen(false)
    setLayoutVersion((v) => v + 1)
  }, [])

  // Resizing logic
  const [resizing, setResizing] = useState<null | "left" | "right" | "bottom">(
    null
  )

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (resizing === "left") {
        setLeftWidth(() =>
          Math.max(MIN_PANEL_SIZE, Math.min(e.clientX - 8, 500))
        )
      } else if (resizing === "right") {
        const w = Math.max(
          MIN_PANEL_SIZE,
          Math.min(window.innerWidth - e.clientX - 8, 500)
        )
        setRightWidth(w)
      } else if (resizing === "bottom") {
        const h = Math.max(
          MIN_PANEL_SIZE,
          Math.min(window.innerHeight - e.clientY - 8, window.innerHeight * 0.7)
        )
        setBottomHeight(h)
      }
    }

    const handleMouseUp = () => setResizing(null)

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor =
      resizing === "bottom" ? "ns-resize" : "ew-resize"
    document.body.style.userSelect = "none"

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [resizing])

  const bottomPanelHeight = bottomFullscreen
    ? "calc(100vh - 48px)"
    : bottomHeight

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">Queue Simulator</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {mode.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Toggle theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={resetLayout}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Reset layout"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left panel */}
        <div className="shrink-0 overflow-hidden" style={{ width: leftWidth }}>
          <ControlPanel
            params={params}
            setParams={setParams}
            mode={mode}
            setMode={handleModeChange}
            isRunning={isRunning}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onStep={handleStep}
            speed={speed}
            setSpeed={setSpeed}
            maxCycles={maxCycles}
            setMaxCycles={setMaxCycles}
            infiniteMode={infiniteMode}
            setInfiniteMode={setInfiniteMode}
            nonVisualMode={nonVisualMode}
            setNonVisualMode={setNonVisualMode}
            currentCycle={currentCycle}
          />
        </div>

        {/* Left resize handle */}
        <div
          className="z-50 w-1 cursor-ew-resize bg-transparent hover:bg-primary/30"
          onMouseDown={() => setResizing("left")}
        />

        {/* Center + Bottom */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Flow canvas */}
          <div className="min-h-0 flex-1">
            <FlowCanvas
              params={params}
              mode={mode}
              currentState={simState.currentState}
              stateVisits={simState.stateVisits}
              selectedState={selectedState}
              onNodeClick={handleNodeClick}
              layoutVersion={layoutVersion}
            />
          </div>

          {/* Bottom resize handle */}
          {!bottomFullscreen && (
            <div
              className="z-50 h-1 cursor-ns-resize bg-transparent hover:bg-primary/30"
              onMouseDown={() => setResizing("bottom")}
            />
          )}

          {/* Bottom panel */}
          <div
            className={`shrink-0 overflow-hidden border-t border-border bg-card transition-all ${
              bottomFullscreen ? "fixed inset-x-0 bottom-0 z-40" : ""
            }`}
            style={{ height: bottomPanelHeight }}
          >
            <div className="flex h-full min-h-0 flex-col">
              {bottomFullscreen && (
                <div className="flex h-10 items-center justify-between border-b border-border px-3">
                  <span className="text-xs font-semibold">
                    Comparison Table
                  </span>
                  <button
                    onClick={() => setBottomFullscreen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Minimize2 size={14} />
                  </button>
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {!bottomFullscreen && (
                  <div className="flex items-center justify-end border-b border-border px-3 py-1">
                    <button
                      onClick={() => setBottomFullscreen(true)}
                      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Maximize2 size={10} />
                      Fullscreen
                    </button>
                  </div>
                )}
                <ComparisonTable
                  params={params}
                  mode={mode}
                  simResults={{
                    avgCustomers: simState.avgCustomers,
                    avgQueueLength: simState.avgQueueLength,
                    avgFailedServers: simState.avgFailedServers,
                    throughput: simState.throughput,
                    blockingProb: simState.blockingProb,
                    availability: simState.availability,
                    serverUtilization: simState.serverUtilization,
                    avgTimeInSystem: simState.avgTimeInSystem,
                    avgTimeInQueue: simState.avgTimeInQueue,
                    totalTransitions: simState.totalTransitions,
                    currentTime: simState.currentTime,
                  }}
                  theoretical={theoretical}
                  empiricalProbabilities={simState.empiricalProbabilities}
                  fullscreen={bottomFullscreen}
                />
                <BalanceEquationBar params={params} mode={mode} />
              </div>
            </div>
          </div>
        </div>

        {/* Right resize handle */}
        <div
          className="z-50 w-1 cursor-ew-resize bg-transparent hover:bg-primary/30"
          onMouseDown={() => setResizing("right")}
        />

        {/* Right panel */}
        <div className="shrink-0 overflow-hidden" style={{ width: rightWidth }}>
          <StatsPanel
            params={params}
            mode={mode}
            currentState={simState.currentState}
            selectedState={selectedState}
            onDeselect={() => setSelectedState(null)}
            stateVisits={simState.stateVisits}
            totalTransitions={simState.totalTransitions}
            currentTime={simState.currentTime}
            avgCustomers={simState.avgCustomers}
            avgFailedServers={simState.avgFailedServers}
            throughput={simState.throughput}
            blockingProb={simState.blockingProb}
            theoretical={theoretical}
          />
        </div>
      </div>
    </div>
  )
}

export default App
