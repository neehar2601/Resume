import { useEffect, useMemo, useState } from 'react'
import type { Project } from '../data/projects'
import type { PipelineState, SimulationSnapshot } from '../types/simulation'
import { failureSnapshots, successSnapshots } from '../simulations/canary'

type Props = {
  project: Project
}

export function Pipeline({ project }: Props) {
  const isProgressive = project.id === 'progressive'
  const [state, setState] = useState<PipelineState>('idle')
  const [stageIndex, setStageIndex] = useState(-1)
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null)
  const [runId, setRunId] = useState(0)

  const snapshots = useMemo(() => {
    if (!isProgressive) return []
    return runId % 3 === 2 ? failureSnapshots : successSnapshots
  }, [isProgressive, runId])

  useEffect(() => {
    if (!runId || !isProgressive) return
    setState('running')
    setStageIndex(-1)
    setSnapshot(null)

    let cancelled = false
    const timers: number[] = []
    snapshots.forEach((item, index) => {
      timers.push(window.setTimeout(() => {
        if (cancelled) return
        setStageIndex(item.stageIndex)
        setSnapshot(item)
      }, 480 * (index + 1)))
    })

    const finalTimer = window.setTimeout(() => {
      if (cancelled) return
      const failed = snapshots[snapshots.length - 1].errorRate > 1
      setState(failed ? 'failure' : 'success')
    }, 480 * (snapshots.length + 1))
    timers.push(finalTimer)

    return () => {
      cancelled = true
      timers.forEach(window.clearTimeout)
    }
  }, [runId, snapshots, isProgressive])

  const run = () => setRunId((value) => value + 1)

  const stageClass = (index: number) => {
    if (state === 'failure' && project.id === 'progressive' && index === stageIndex) return 'stage is-fail'
    if (index === stageIndex) return 'stage is-active'
    if (index < stageIndex) return 'stage is-done'
    return 'stage'
  }

  const statusText = state === 'idle'
    ? 'idle — run the simulation'
    : state === 'running'
      ? `running — ${stageIndex + 1}/${project.stages.length} stages` 
      : state === 'failure'
        ? 'rollback complete — stable revision restored'
        : 'promotion complete — 100% traffic shifted'

  const projectSnapshots = isProgressive ? snapshot : null

  return (
    <div className="pipeline-panel">
      <div className="pipeline-toolbar">
        <span className="pipeline-label">{isProgressive ? 'CI/CD + canary flow' : 'delivery flow preview'}</span>
        <button
          className={`pipeline-run ${state}`}
          type="button"
          onClick={isProgressive ? run : undefined}
          disabled={!isProgressive}
        >
          {isProgressive ? '↻ run simulation' : 'phase 2 sandbox'}
        </button>
      </div>

      <div className="pipeline-canvas">
        <div className="pipeline-row">
          {project.stages.map((stage, index) => (
            <div className="stage-wrap" key={stage.id}>
              <div className={stageClass(index)}>
                <div className="stage-node">{stage.short}</div>
                <div className="stage-name">{stage.name}</div>
                <div className="stage-detail">{stage.detail}</div>
              </div>
              {index < project.stages.length - 1 && (
                <div className={`connector ${index < stageIndex ? 'lit' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {isProgressive && (
        <div className="canary-grid">
          <div className="metric-card">
            <div className="metric-head"><span>traffic split</span><span>Istio</span></div>
            <div className="traffic-bar">
              <div className="traffic-stable" style={{ width: `${100 - (projectSnapshots?.traffic ?? 0)}%` }} />
              <div className="traffic-canary" style={{ width: `${projectSnapshots?.traffic ?? 0}%` }} />
            </div>
            <div className="traffic-legend"><span>stable {100 - (projectSnapshots?.traffic ?? 0)}%</span><span>canary {projectSnapshots?.traffic ?? 0}%</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-head"><span>analysis</span><span>Prometheus → Flagger</span></div>
            <div className="metric-value">{projectSnapshots ? `${projectSnapshots.errorRate.toFixed(1)}%` : '—'}</div>
            <div className="metric-sub">error rate · latency {projectSnapshots ? `${projectSnapshots.latency}ms` : '—'} · {projectSnapshots?.requests ?? '—'} req/min</div>
          </div>
        </div>
      )}

      <div className={`pipeline-status ${state === 'success' ? 'ok' : state === 'failure' ? 'fail' : ''}`}>
        <span className="pipeline-bullet" />
        <span>{statusText}</span>
      </div>
    </div>
  )
}
