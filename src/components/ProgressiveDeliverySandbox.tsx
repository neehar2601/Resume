import { useEffect, useMemo, useState } from 'react'
import { ArchitectureDiagram } from './sandbox/ArchitectureDiagram'
import { MetricsPanel } from './sandbox/MetricsPanel'
import { Terminal } from './sandbox/Terminal'
import type { MetricPoint, SandboxPhase } from '../types/sandbox'

const version = 'v2.4.0'
const stages = ['GitHub', 'Jenkins', 'Docker', 'Helm', 'Argo CD', 'Kubernetes', 'Istio', 'Prometheus', 'Flagger']
const trafficSteps = [10, 25, 50, 100]
const techDetails = [
  ['github', 'GitHub', 'Source control', 'A commit is the trigger for the delivery chain.'],
  ['jenkins', 'Jenkins', 'Continuous integration', 'Builds, tests and produces the application artifact in the modeled flow.'],
  ['helm', 'Helm', 'Packaging', 'Represents the Kubernetes release package consumed by the deployment path.'],
  ['argocd', 'Argo CD', 'GitOps delivery', 'Keeps the cluster aligned with the desired application state.'],
  ['istio', 'Istio', 'Traffic control', 'Splits request traffic between stable and canary revisions.'],
  ['prom', 'Prometheus', 'Observability', 'Supplies the error and latency signals used for analysis.'],
  ['flagger', 'Flagger', 'Progressive analysis', 'Evaluates metrics and decides whether to promote or rollback.'],
  ['k8s', 'Kubernetes', 'Runtime', 'Runs the workload revisions and the services that receive traffic.'],
  ['stable', 'Stable v1', 'Baseline', 'The known-good revision that receives traffic during the rollout.'],
  ['canary', 'Canary v2', 'Candidate', 'The new revision exposed to a controlled percentage of traffic.'],
]

const baseErrorSeries: MetricPoint[] = [
  { label: 't0', value: .2 }, { label: 't1', value: .3 }, { label: 't2', value: .4 }, { label: 't3', value: .35 },
]
const baseLatencySeries: MetricPoint[] = [
  { label: 't0', value: 124 }, { label: 't1', value: 132 }, { label: 't2', value: 138 }, { label: 't3', value: 133 },
]

export function ProgressiveDeliverySandbox() {
  const [phase, setPhase] = useState<SandboxPhase>('idle')
  const [activeStage, setActiveStage] = useState(-1)
  const [traffic, setTraffic] = useState(0)
  const [errorRate, setErrorRate] = useState(.2)
  const [latency, setLatency] = useState(124)
  const [requests, setRequests] = useState(18)
  const [failureMode, setFailureMode] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>('github')
  const [errorSeries, setErrorSeries] = useState<MetricPoint[]>(baseErrorSeries)
  const [latencySeries, setLatencySeries] = useState<MetricPoint[]>(baseLatencySeries)

  const statusLabel = useMemo(() => {
    switch (phase) {
      case 'build': return 'BUILD / TEST'
      case 'sync': return 'GITOPS / SYNC'
      case 'canary': return `CANARY / ${traffic}%`
      case 'promoting': return 'PROMOTION'
      case 'failed': return 'DEGRADED'
      case 'rollback': return 'ROLLBACK'
      case 'success': return 'PROMOTED'
      default: return 'READY'
    }
  }, [phase, traffic])

  useEffect(() => {
    if (phase === 'idle' || phase === 'success' || phase === 'failed') return

    let cancelled = false
    const timers: number[] = []
    const schedule = (ms: number, callback: () => void) => {
      const id = window.setTimeout(() => {
        if (!cancelled) callback()
      }, ms)
      timers.push(id)
    }

    if (phase === 'build') {
      if (activeStage < 4) {
        schedule(420, () => setActiveStage((current) => current + 1))
      } else {
        schedule(420, () => setPhase('sync'))
      }
    } else if (phase === 'sync') {
      setActiveStage(4)
      schedule(650, () => {
        setActiveStage(5)
        setPhase('canary')
        setTraffic(10)
        setErrorRate(.3)
        setLatency(138)
        setRequests(62)
        setErrorSeries((points) => [...points, { label: '10', value: .3 }])
        setLatencySeries((points) => [...points, { label: '10', value: 138 }])
      })
    } else if (phase === 'canary') {
      const nextTraffic = traffic === 10 ? 25 : traffic === 25 ? 50 : 100
      schedule(500, () => setActiveStage(6))
      schedule(860, () => setActiveStage(7))
      schedule(1220, () => {
        if (failureMode && nextTraffic === 50) {
          setTraffic(25)
          setActiveStage(8)
          setErrorRate(8.2)
          setLatency(298)
          setRequests(96)
          setErrorSeries((points) => [...points, { label: 'fail', value: 8.2 }])
          setLatencySeries((points) => [...points, { label: 'fail', value: 298 }])
          setPhase('failed')
          return
        }

        const nextError = nextTraffic === 100 ? .2 : nextTraffic === 50 ? .5 : .7
        const nextLatency = nextTraffic === 100 ? 127 : nextTraffic === 50 ? 133 : 142
        const nextRequests = nextTraffic === 100 ? 104 : nextTraffic === 50 ? 92 : 75

        setTraffic(nextTraffic)
        setErrorRate(nextError)
        setLatency(nextLatency)
        setRequests(nextRequests)
        setActiveStage(8)
        setErrorSeries((points) => [...points, { label: `${nextTraffic}`, value: nextError }])
        setLatencySeries((points) => [...points, { label: `${nextTraffic}`, value: nextLatency }])
        if (nextTraffic === 100) setPhase('promoting')
      })
    } else if (phase === 'promoting') {
      schedule(650, () => setPhase('success'))
    } else if (phase === 'rollback') {
      schedule(850, () => {
        setTraffic(0)
        setErrorRate(.4)
        setLatency(126)
        setRequests(100)
        setErrorSeries((points) => [...points, { label: 'restore', value: .4 }])
        setLatencySeries((points) => [...points, { label: 'restore', value: 126 }])
        setActiveStage(0)
        setPhase('success')
      })
    }

    return () => {
      cancelled = true
      timers.forEach(window.clearTimeout)
    }
  }, [phase, activeStage, traffic, failureMode])


  const deploy = () => {
    setPhase('build')
    setActiveStage(0)
    setTraffic(0)
    setErrorRate(.2)
    setLatency(124)
    setRequests(18)
    setErrorSeries(baseErrorSeries)
    setLatencySeries(baseLatencySeries)
  }

  const reset = () => {
    setPhase('idle')
    setActiveStage(-1)
    setTraffic(0)
    setErrorRate(.2)
    setLatency(124)
    setRequests(18)
    setErrorSeries(baseErrorSeries)
    setLatencySeries(baseLatencySeries)
    setFailureMode(false)
  }

  const injectFailure = () => {
    if (phase !== 'canary' || traffic < 10) return
    setFailureMode(true)
    setTraffic(25)
    setActiveStage(8)
    setErrorRate(8.2)
    setLatency(298)
    setRequests(96)
    setErrorSeries((points) => [...points, { label: 'inject', value: 8.2 }])
    setLatencySeries((points) => [...points, { label: 'inject', value: 298 }])
    setPhase('failed')
  }

  const recover = () => {
    setPhase('rollback')
    setActiveStage(8)
  }

  return (
    <div className="sandbox-shell">
      <header className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <a className="brand" href="/">neehara<span className="brand-dot">.</span>dev</a>
          <div className="sandbox-breadcrumb">LAB / PROGRESSIVE DELIVERY / {version}</div>
          <a className="sandbox-back" href="/">← portfolio</a>
        </div>
      </header>

      <main>
        <section className="sandbox-hero section">
          <div className="container">
            <div className="sandbox-title-row">
              <div>
                <div className="kicker"><span className="kicker-dot" /> interactive deployment lab</div>
                <h1>Progressive Delivery Sandbox</h1>
                <p>Operate a frontend simulation of a Kubernetes canary release. Trigger a deployment, watch traffic move, read the metrics, inject degradation, and observe the recovery path.</p>
              </div>
              <div className={`sandbox-status ${phase}`}><span /> {statusLabel}</div>
            </div>

            <div className="sandbox-controls">
              <div className="release-card">
                <span className="control-label">release candidate</span>
                <strong>{version}</strong>
                <small>stable v1 → canary v2</small>
              </div>
              <button className="button primary sandbox-action" type="button" onClick={deploy} disabled={phase !== 'idle' && phase !== 'success'}>▶ deploy {version}</button>
              <button className="button sandbox-action" type="button" onClick={injectFailure} disabled={phase !== 'canary'}>⚠ inject degradation</button>
              <button className="button sandbox-action" type="button" onClick={phase === 'failed' ? recover : reset}>{phase === 'failed' ? '↻ rollback' : 'reset'}</button>
              <label className="failure-toggle">
                <input type="checkbox" checked={failureMode} onChange={(event) => setFailureMode(event.target.checked)} disabled={phase !== 'idle' && phase !== 'success'} />
                <span /> pre-arm failure at 50%
              </label>
            </div>

            <div className="pipeline-track">
              {stages.map((stage, index) => (
                <div className="track-item" key={stage}>
                  <div className={`track-dot ${index === activeStage ? 'active' : index < activeStage ? 'done' : ''} ${phase === 'failed' && index === 8 ? 'failed' : ''}`}>{String(index + 1).padStart(2, '0')}</div>
                  <span>{stage}</span>
                  {index < stages.length - 1 && <div className={`track-line ${index < activeStage ? 'lit' : ''}`} />}
                </div>
              ))}
            </div>

            {(phase === 'failed' || phase === 'rollback') && (
              <div className={`rollback-panel ${phase}`}>
                <div>
                  <span className="rollback-kicker">automated recovery path</span>
                  <strong>{phase === 'failed' ? 'FLAGGER STOPPED PROMOTION' : 'RESTORING STABLE REVISION'}</strong>
                  <p>{phase === 'failed' ? 'Metric threshold breached at 50% canary traffic. Stable remains the recovery target.' : 'Traffic is moving back to stable v1 and the failed candidate is being removed from the serving path.'}</p>
                </div>
                <div className="rollback-flow"><span>canary v2</span><b>←</b><span>stable v1</span></div>
              </div>
            )}
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading"><span>01 / architecture</span><h2>The release decision loop</h2></div>
            <ArchitectureDiagram activeNode={selectedNode} onSelect={setSelectedNode} />
          </div>
        </section>

        <section className="section sandbox-section" id="observability">
          <div className="container">
            <div className="sandbox-section-heading"><span>02 / observability</span><h2>Signals before decisions</h2></div>
            <MetricsPanel traffic={traffic} errorRate={errorRate} latency={latency} requests={requests} errorSeries={errorSeries} latencySeries={latencySeries} />
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container sandbox-two-col">
            <div>
              <div className="sandbox-section-heading"><span>03 / operator console</span><h2>See the system like an operator</h2></div>
              <Terminal phase={phase} traffic={traffic} version={version} />
            </div>
            <div>
              <div className="sandbox-section-heading"><span>04 / controls</span><h2>What to try</h2></div>
              <div className="experiment-card">
                <div className="experiment-step"><b>01</b><div><strong>Deploy</strong><p>Start {version} and follow the pipeline until the first canary slice reaches the service mesh.</p></div></div>
                <div className="experiment-step"><b>02</b><div><strong>Observe</strong><p>Watch error rate, latency, requests and the stable/canary traffic split change together.</p></div></div>
                <div className="experiment-step"><b>03</b><div><strong>Break it</strong><p>Inject degradation or pre-arm the 50% failure path. Flagger should stop promotion.</p></div></div>
                <div className="experiment-step"><b>04</b><div><strong>Recover</strong><p>Run rollback and watch traffic return to the stable revision.</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading"><span>05 / technology map</span><h2>Click the building blocks</h2></div>
            <div className="tech-grid">
              {techDetails.map(([id, name, role, detail]) => (
                <button
                  id={`tech-${id}`}
                  key={id}
                  className={`tech-card ${selectedNode === id ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedNode(id)}
                >
                  <span>{role}</span>
                  <strong>{name}</strong>
                  <p>{detail}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section sandbox-section sandbox-footer-section">
          <div className="container sandbox-disclaimer">
            <span className="kicker-dot" /> <span>This is a deterministic browser simulation. No live Kubernetes cluster, AWS account, Prometheus server or Flagger instance is connected.</span>
          </div>
        </section>
      </main>
    </div>
  )
}
