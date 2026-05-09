import { useState, useCallback, useEffect, useRef } from "react"
import { ControlPanel } from "@/components/ControlPanel"
import { FlowCanvas } from "@/components/FlowCanvas"
import { StatsPanel } from "@/components/StatsPanel"
import { ComparisonTable } from "@/components/ComparisonTable"
import {
  QueueSimulation,
  type SimulationParams,
  type SimulationMode,
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
  alpha: 0.1,
  beta: 1,
  Y: 1,
}

export function App() {
  const [params, setParams] = useState<SimulationParams>({ ...defaultParams })
  const [mode, setMode] = useState<SimulationMode>("1d")
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [maxCycles, setMaxCycles] = useState(10000)
  const [infiniteMode, setInfiniteMode] = useState(true)
  const [currentCycle, setCurrentCycle] = useState(0)

  const simRef = useRef<QueueSimulation | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastStepTimeRef = useRef<number>(0)

  const [simState, setSimState] = useState({
    currentState: simRef.current?.currentState || { n: 0 },
    stateVisits: new Map<string, number>(),
    totalTransitions: 0,
    currentTime: 0,
    avgCustomers: 0,
    avgFailedServers: 0,
    throughput: 0,
    blockingProb: 0,
  })

  const [theoretical, setTheoretical] = useState<
    TheoreticalResults1D | TheoreticalResults2D | null
  >(null)

  // Initialize/reinitialize simulation
  useEffect(() => {
    const sim = new QueueSimulation(params, mode)
    simRef.current = sim
    setCurrentCycle(0)
    setSimState({
      currentState: sim.currentState,
      stateVisits: new Map(sim.stateVisits),
      totalTransitions: 0,
      currentTime: 0,
      avgCustomers: 0,
      avgFailedServers: 0,
      throughput: 0,
      blockingProb: 0,
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
      totalTransitions: sim.totalTransitions,
      currentTime: sim.currentTime,
      avgCustomers: sim.getAverageCustomers(),
      avgFailedServers: sim.getAverageFailedServers(),
      throughput: sim.getThroughput(),
      blockingProb: sim.getBlockingProbability(),
    })
    setCurrentCycle(sim.totalTransitions)
  }, [])

  // Animation loop
  const runStep = useCallback(() => {
    const sim = simRef.current
    if (!sim) return false

    const event = sim.step()
    if (!event) return false

    return true
  }, [])

  const animate = useCallback(
    (timestamp: number) => {
      if (!isRunning) return

      const sim = simRef.current
      if (!sim) return

      // Check if we should stop
      if (!infiniteMode && sim.totalTransitions >= maxCycles) {
        setIsRunning(false)
        refreshSimState()
        return
      }

      // Run multiple steps per frame based on speed
      const elapsed = timestamp - lastStepTimeRef.current
      const stepsPerFrame = Math.max(1, Math.floor(speed * 10))
      const stepInterval = 1000 / (speed * 60) // target ~60 steps/sec at 1x

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

  const handleModeChange = useCallback((newMode: SimulationMode) => {
    setMode(newMode)
    setTheoretical(null)
  }, [])

  const handleStart = useCallback(() => {
    setIsRunning(true)
  }, [])

  const handlePause = useCallback(() => {
    setIsRunning(false)
    refreshSimState()
  }, [refreshSimState])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    const sim = new QueueSimulation(params, mode)
    simRef.current = sim
    setCurrentCycle(0)
    setSimState({
      currentState: sim.currentState,
      stateVisits: new Map(sim.stateVisits),
      totalTransitions: 0,
      currentTime: 0,
      avgCustomers: 0,
      avgFailedServers: 0,
      throughput: 0,
      blockingProb: 0,
    })
  }, [params, mode])

  const handleStep = useCallback(() => {
    runStep()
    refreshSimState()
  }, [runStep, refreshSimState])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left: Controls */}
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
        currentCycle={currentCycle}
      />

      {/* Center: Flow Canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <FlowCanvas
            params={params}
            mode={mode}
            currentState={simState.currentState}
            stateVisits={simState.stateVisits}
          />
        </div>

        {/* Bottom: Comparison Table */}
        <ComparisonTable
          params={params}
          mode={mode}
          simResults={{
            avgCustomers: simState.avgCustomers,
            avgFailedServers: simState.avgFailedServers,
            throughput: simState.throughput,
            blockingProb: simState.blockingProb,
            totalTransitions: simState.totalTransitions,
            currentTime: simState.currentTime,
          }}
          theoretical={theoretical}
        />
      </div>

      {/* Right: Stats */}
      <StatsPanel
        params={params}
        mode={mode}
        currentState={simState.currentState}
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
  )
}

export default App
