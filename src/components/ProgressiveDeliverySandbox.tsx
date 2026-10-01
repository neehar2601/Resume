import { NavBrand } from './NavBrand'
import { useEffect, useMemo, useState } from 'react'
import { ArchitectureDiagram } from './sandbox/ArchitectureDiagram'
import { TrafficMap } from './sandbox/TrafficMap'
import { MetricsPanel } from './sandbox/MetricsPanel'
import { Terminal } from './sandbox/Terminal'
import type { MetricPoint, SandboxPhase } from '../types/sandbox'

const version = 'v2.4.0'
const stages = ['GitHub', 'Jenkins', 'Docker', 'Helm', 'Argo CD', 'Kubernetes', 'Istio', 'Prometheus', 'Flagger']
const trafficSteps = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const techDetails = [
  ['github', 'GitHub', 'Source & Helm Repository', 'Houses application source code, git tags (v2.4.0), and the Helm chart repository.'],
  ['jenkins', 'Jenkins CI', 'Continuous Integration', 'Compiles code, runs tests, executes docker build -t app:v2.4.0, pushes to Docker Hub, and commits updated image tags to the Helm repository.'],
  ['docker', 'Docker Hub', 'Container Registry', 'Stores immutable tagged container images (registry/cafe-web:v2.4.0) produced by the Jenkins CI pipeline.'],
  ['helm', 'Helm', 'Packaging & Release Manifests', 'Versioned Helm charts defining Kubernetes deployments; values.yaml image.tag is updated by Jenkins to trigger GitOps.'],
  ['argocd', 'Argo CD', 'In-Cluster GitOps Delivery', 'Continuously monitors GitHub for Helm chart updates and reconciles the desired state into the Kubernetes cluster.'],
  ['k8s', 'Multi-Node Kubernetes', 'Distributed Cluster Runtime', 'Runs workloads across Node 01 (worker-alpha: Ingress + Stable) and Node 02 (worker-beta: Canary + Observability) connected via CNI.'],
  ['istio', 'Istio Service Mesh', 'Traffic Control & Gateway', 'Ingress Gateway and VirtualService on Node 01 dynamically shift HTTP traffic between stable and canary revisions without downtime.'],
  ['stable', 'Stable Pods (v1)', 'Production Baseline', 'The proven revision (v2.3.0) running on Node 01 (worker-alpha), serving baseline production traffic.'],
  ['canary', 'Canary Pod (v2.4.0)', 'Deployment Candidate', 'The newly packaged release running on Node 02 (worker-beta) with an Istio Envoy sidecar proxy receiving experimental traffic.'],
  ['prom', 'Prometheus', 'Real-Time Observability', 'Scrapes HTTP error rates, request rates, and p95 latency from Canary Envoy sidecars on Node 02.'],
  ['flagger', 'Flagger Controller', 'Progressive Delivery Operator', 'Executes metric analysis on Node 02 and commands the Istio VirtualService on Node 01 to advance weights or trigger automated rollback.'],
]

const baseErrorSeries: MetricPoint[] = [
  { label: 't0', value: .2 }, { label: 't1', value: .3 }, { label: 't2', value: .4 }, { label: 't3', value: .35 },
]
const baseLatencySeries: MetricPoint[] = [
  { label: 't0', value: 124 }, { label: 't1', value: 132 }, { label: 't2', value: 138 }, { label: 't3', value: 133 },
]

const metricForTraffic = (nextTraffic: number) => ({
  error: nextTraffic === 100 ? .2 : Math.max(.2, .7 - nextTraffic * .004),
  latency: Math.round(138 - nextTraffic * .12),
  requests: Math.round(58 + nextTraffic * .48),
})

export function ProgressiveDeliverySandbox() {
  const [phase, setPhase] = useState<SandboxPhase>('idle')
  const [activeStage, setActiveStage] = useState(-1)
  const [traffic, setTraffic] = useState(0)
  const [errorRate, setErrorRate] = useState(.2)
  const [latency, setLatency] = useState(124)
  const [requests, setRequests] = useState(18)
  const [preArmFailure, setPreArmFailure] = useState(false)
  const [rollbackFrom, setRollbackFrom] = useState(0)
  const [selectedNode, setSelectedNode] = useState<string | null>('github')
  const [errorSeries, setErrorSeries] = useState<MetricPoint[]>(baseErrorSeries)
  const [latencySeries, setLatencySeries] = useState<MetricPoint[]>(baseLatencySeries)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

  const statusLabel = useMemo(() => {
    switch (phase) {
      case 'build': return 'BUILD / TEST'
      case 'sync': return 'GITOPS / SYNC'
      case 'canary': return `CANARY / ${traffic}%`
      case 'promoting': return 'PROMOTION'
      case 'failed': return 'THRESHOLD BREACHED'
      case 'rollback': return 'AUTOMATIC ROLLBACK'
      case 'success': return 'PROMOTED'
      case 'rolledBack': return 'ROLLED BACK'
      default: return 'READY'
    }
  }, [phase, traffic])

  // Delivery chain: GitHub → Jenkins → Docker → Helm → Argo CD → Kubernetes.
  useEffect(() => {
    if (phase !== 'build' || !isAutoPlaying) return

    const timer = window.setTimeout(() => {
      if (activeStage < 4) {
        setActiveStage((current) => current + 1)
      } else {
        setPhase('sync')
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [phase, activeStage, isAutoPlaying])

  // GitOps sync hands traffic control to Istio, Prometheus and Flagger.
  useEffect(() => {
    if (phase !== 'sync') return

    setActiveStage(5) // Stage 5: Kubernetes schedules Canary Pod on Node 02

    if (!isAutoPlaying) return

    const timer = window.setTimeout(() => {
      const first = metricForTraffic(10)
      setActiveStage(8) // Stage 8: Flagger analysis & routing control loop
      setTraffic(10)
      setErrorRate(first.error)
      setLatency(first.latency)
      setRequests(first.requests)
      setErrorSeries((points) => [...points, { label: '10', value: first.error }])
      setLatencySeries((points) => [...points, { label: '10', value: first.latency }])
      setPhase('canary')
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [phase, isAutoPlaying])

  // The normal rollout continuously evaluates and increases canary traffic in 10% steps.
  useEffect(() => {
    if (phase !== 'canary' || !isAutoPlaying) return
    if (traffic >= 100) {
      setPhase('promoting')
      return
    }

    const timer = window.setTimeout(() => {
      const nextTraffic = Math.min(traffic + 10, 100)

      if (preArmFailure && nextTraffic === 50) {
        setTraffic(50)
        setActiveStage(8)
        setErrorRate(8.2)
        setLatency(298)
        setRequests(96)
        setErrorSeries((points) => [...points, { label: '50!', value: 8.2 }])
        setLatencySeries((points) => [...points, { label: '50!', value: 298 }])
            setRollbackFrom(50)
        setPhase('failed')
        return
      }

      const next = metricForTraffic(nextTraffic)
      setTraffic(nextTraffic)
      setActiveStage(8)
      setErrorRate(next.error)
      setLatency(next.latency)
      setRequests(next.requests)
      setErrorSeries((points) => [...points, { label: `${nextTraffic}`, value: next.error }])
      setLatencySeries((points) => [...points, { label: `${nextTraffic}`, value: next.latency }])

      if (nextTraffic === 100) {
        setPhase('promoting')
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [phase, traffic, preArmFailure])

  // Keep the telemetry alive between traffic decisions so the sandbox feels like a running system.
  useEffect(() => {
    if (phase !== 'canary') return

    const timer = window.setInterval(() => {
      const jitter = (Math.random() - .5) * .12
      const nextError = Math.max(.1, errorRate + jitter)
      const nextLatency = Math.max(108, Math.round(latency + (Math.random() - .5) * 8))
      const nextRequests = Math.max(40, Math.round(requests + (Math.random() - .5) * 10))
      setErrorRate(nextError)
      setLatency(nextLatency)
      setRequests(nextRequests)
      setErrorSeries((points) => [...points.slice(-11), { label: `${traffic}%`, value: Number(nextError.toFixed(2)) }])
      setLatencySeries((points) => [...points.slice(-11), { label: `${traffic}%`, value: nextLatency }])
    }, 500)

    return () => window.clearInterval(timer)
  }, [phase, traffic, errorRate, latency, requests])

  // Failure is intentionally followed by an automatic, direct return to stable 100%.
  useEffect(() => {
    if (phase !== 'failed') return

    const timer = window.setTimeout(() => {
      setTraffic(0)
      setErrorRate(.3)
      setLatency(126)
      setRequests(104)
      setErrorSeries((points) => [...points, { label: '0 / stable', value: .3 }])
      setLatencySeries((points) => [...points, { label: '0 / stable', value: 126 }])
      setActiveStage(8)
      setPhase('rollback')
    }, 850)

    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'rollback') return

    const timer = window.setTimeout(() => {
      setPhase('rolledBack')
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'promoting') return

    const timer = window.setTimeout(() => setPhase('success'), 900)
    return () => window.clearTimeout(timer)
  }, [phase])

  const deploy = () => {
    setIsAutoPlaying(true)
    setPhase('build')
    setActiveStage(0)
    setTraffic(0)
    setErrorRate(.2)
    setLatency(124)
    setRequests(18)
    setRollbackFrom(0)
    setErrorSeries(baseErrorSeries)
    setLatencySeries(baseLatencySeries)
  }

  const handleStepNext = () => {
    setIsAutoPlaying(false)
    if (activeStage < 0 || phase === 'idle') {
      setPhase('build')
      setActiveStage(0)
      setTraffic(0)
      return
    }
    if (activeStage < 4) {
      setActiveStage(activeStage + 1)
      return
    }
    if (activeStage === 4) {
      setActiveStage(5)
      setPhase('sync')
      return
    }
    if (activeStage === 5) {
      const first = metricForTraffic(10)
      setActiveStage(6)
      setTraffic(10)
      setErrorRate(first.error)
      setLatency(first.latency)
      setRequests(first.requests)
      setErrorSeries((points) => [...points, { label: '10', value: first.error }])
      setLatencySeries((points) => [...points, { label: '10', value: first.latency }])
      setPhase('canary')
      return
    }
    if (activeStage === 6) {
      setActiveStage(7)
      return
    }
    if (activeStage === 7) {
      setActiveStage(8)
      return
    }
    if (activeStage === 8) {
      const nextTraffic = Math.min(traffic + 10, 100)
      if (preArmFailure && nextTraffic === 50) {
        setTraffic(50)
        setErrorRate(8.2)
        setLatency(298)
        setRequests(96)
        setErrorSeries((points) => [...points, { label: '50!', value: 8.2 }])
        setLatencySeries((points) => [...points, { label: '50!', value: 298 }])
        setRollbackFrom(50)
        setPhase('failed')
        return
      }
      const next = metricForTraffic(nextTraffic)
      setTraffic(nextTraffic)
      setErrorRate(next.error)
      setLatency(next.latency)
      setRequests(next.requests)
      setErrorSeries((points) => [...points, { label: `${nextTraffic}`, value: next.error }])
      setLatencySeries((points) => [...points, { label: `${nextTraffic}`, value: next.latency }])
      if (nextTraffic === 100) {
        setPhase('promoting')
      }
    }
  }

  const handleStepPrev = () => {
    setIsAutoPlaying(false)
    if (traffic > 10) {
      const prevTraffic = traffic - 10
      const prevMetric = metricForTraffic(prevTraffic)
      setTraffic(prevTraffic)
      setErrorRate(prevMetric.error)
      setLatency(prevMetric.latency)
      setRequests(prevMetric.requests)
      return
    }
    if (traffic === 10) {
      setTraffic(0)
      setActiveStage(5)
      setPhase('sync')
      return
    }
    if (activeStage > 0) {
      setActiveStage(activeStage - 1)
      if (activeStage - 1 < 5) {
        setPhase('build')
      }
    } else {
      reset()
    }
  }

  const toggleAutoPlay = () => {
    if (phase === 'idle' || activeStage < 0) {
      deploy()
    } else {
      setIsAutoPlaying(!isAutoPlaying)
    }
  }

  const reset = () => {
    setIsAutoPlaying(false)
    setPhase('idle')
    setActiveStage(-1)
    setTraffic(0)
    setErrorRate(.2)
    setLatency(124)
    setRequests(18)
    setRollbackFrom(0)
    setErrorSeries(baseErrorSeries)
    setLatencySeries(baseLatencySeries)
    setPreArmFailure(false)
  }

  const injectFailure = () => {
    if (phase !== 'canary' || traffic < 10) return

    setRollbackFrom(traffic)
    setActiveStage(8)
    setErrorRate(8.2)
    setLatency(298)
    setRequests(96)
    setErrorSeries((points) => [...points, { label: `${traffic}!`, value: 8.2 }])
    setLatencySeries((points) => [...points, { label: `${traffic}!`, value: 298 }])
    setPhase('failed')
  }

  const decision = useMemo(() => {
    if (phase === 'failed') return { label: 'THRESHOLD BREACHED', detail: 'Flagger blocks promotion and starts automatic rollback.', tone: 'danger' }
    if (phase === 'rollback') return { label: 'ROLLING BACK → STABLE', detail: `Canary ${rollbackFrom}% → 0%. Stable returns to 100%.`, tone: 'warn' }
    if (phase === 'success') return { label: 'PROMOTED', detail: 'v2.4.0 is now the stable serving revision.', tone: 'healthy' }
    if (phase === 'rolledBack') return { label: 'ROLLED BACK', detail: `Canary ${rollbackFrom}% was removed. Stable v1 is serving 100% of traffic.`, tone: 'warn' }
    if (phase === 'promoting') return { label: 'PROMOTE', detail: '100% traffic reached with healthy signals.', tone: 'healthy' }
    if (phase === 'canary') return { label: 'HEALTHY / INCREASE', detail: traffic < 100 ? `Signals healthy. Move canary toward ${traffic + 10}%.` : 'Final promotion check.', tone: 'healthy' }
    if (phase === 'build' || phase === 'sync') return { label: 'WAITING FOR CANARY', detail: 'Delivery is preparing the serving path.', tone: 'neutral' }
    return { label: 'READY', detail: 'Deploy v2.4.0 to start the control loop.', tone: 'neutral' }
  }, [phase, rollbackFrom, traffic])

  return (
    <div className="sandbox-shell">
      <header className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <NavBrand href="/" />
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
                <p>Operate a frontend simulation of a Kubernetes canary release. Deploy it, watch traffic continuously move, read the signals, inject degradation, and observe an automatic rollback without another click.</p>
              </div>
              <div className={`sandbox-status ${phase}`}><span /> {statusLabel}</div>
            </div>

            <div className="sandbox-controls">
              <div className="release-card">
                <span className="control-label">release candidate</span>
                <strong>{version}</strong>
                <small>stable v1 → canary v2</small>
              </div>
              <button className="button primary sandbox-action" type="button" onClick={deploy} disabled={!['idle', 'success', 'rolledBack'].includes(phase)}>▶ deploy {version}</button>
              <button className="button sandbox-action" type="button" onClick={injectFailure} disabled={phase !== 'canary'}>⚠ inject degradation</button>
              <button className="button sandbox-action" type="button" onClick={reset}>reset</button>
              <label className="failure-toggle">
                <input type="checkbox" checked={preArmFailure} onChange={(event) => setPreArmFailure(event.target.checked)} disabled={!['idle', 'success', 'rolledBack'].includes(phase)} />
                <span /> pre-arm failure at 50%
              </label>
            </div>

            <div className="control-loop-panel">
              <div className="control-loop-head">
                <div>
                  <span className="control-label">progressive delivery control loop</span>
                  <strong>Signals before decisions</strong>
                </div>
                <span className="control-loop-live"><i /> LIVE SIMULATION</span>
              </div>

              <div className="canary-progress-block">
                <div className="control-loop-labels">
                  <span>stable {100 - traffic}%</span>
                  <b>canary {traffic}%</b>
                </div>
                <div className="canary-bar"><span style={{ width: `${traffic}%` }} /></div>
                <div className="canary-ticks">
                  {trafficSteps.map((step) => <span className={traffic >= step ? 'reached' : ''} key={step}>{step}%</span>)}
                </div>
              </div>

              <div className="signal-decision-grid">
                <div className="signals-card">
                  <div className="loop-card-heading"><span>signals</span><b>Prometheus</b></div>
                  <div className="loop-metrics">
                    <div><small>error rate</small><strong className={errorRate > 1 ? 'metric-bad' : 'metric-good'}>{errorRate.toFixed(1)}%</strong></div>
                    <div><small>p95 latency</small><strong className={latency > 220 ? 'metric-bad' : 'metric-good'}>{latency}ms</strong></div>
                    <div><small>requests</small><strong>{requests}</strong></div>
                  </div>
                  <div className={`signal-state ${errorRate > 1 || latency > 220 ? 'bad' : 'good'}`}>
                    {errorRate > 1 || latency > 220 ? '▲ threshold exceeded' : '● metrics healthy'}
                  </div>
                </div>

                <div className={`decision-card ${decision.tone}`}>
                  <div className="loop-card-heading"><span>decision</span><b>Flagger</b></div>
                  <strong>{decision.label}</strong>
                  <p>{decision.detail}</p>
                  <div className="decision-arrow">{decision.tone === 'danger' ? '↘' : decision.tone === 'warn' ? '↩' : '→'}</div>
                </div>
              </div>
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

            {activeStage >= 0 && (
              <div className="stage-detail-callout" style={{
                marginTop: '1rem',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(10, 16, 24, 0.75)',
                border: '1px solid var(--line-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: phase === 'failed' ? '#ff4d4f' : activeStage < 5 ? '#e8a33d' : '#4fd1c5',
                    boxShadow: phase === 'failed' ? '0 0 8px rgba(255, 77, 79, 0.8)' : '0 0 8px rgba(79, 209, 197, 0.6)',
                  }} />
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {activeStage === 0 && 'Stage 01 [GitHub]: Release tag v2.4.0 pushed. Webhook triggers Jenkins CI pipeline.'}
                    {activeStage === 1 && 'Stage 02 [Jenkins]: Jenkins compiles code, runs test suite, and builds Docker image (docker build -t cafe-web:v2.4.0 .).'}
                    {activeStage === 2 && 'Stage 03 [Docker Hub]: Jenkins pushes tagged image (cafe-web:v2.4.0) to container registry.'}
                    {activeStage === 3 && 'Stage 04 [Helm]: Jenkins updates charts/cafe-web/values.yaml (tag: v2.4.0) and commits to Git repository.'}
                    {activeStage === 4 && 'Stage 05 [Argo CD]: Argo CD detects Helm chart commit, pulling changes and initiating GitOps sync.'}
                    {activeStage === 5 && 'Stage 06 [Kubernetes]: Cluster schedules Canary Pod v2.4.0 on Node 02 (worker-beta) with Envoy sidecar.'}
                    {activeStage === 6 && 'Stage 07 [Istio]: Ingress Gateway & VirtualService on Node 01 initialize traffic diversion across nodes.'}
                    {activeStage === 7 && 'Stage 08 [Prometheus]: Scraping HTTP error rate and p95 latency from Canary Envoy sidecar on Node 02.'}
                    {activeStage === 8 && (phase === 'failed'
                      ? 'Stage 09 [Flagger]: Metric threshold exceeded! Flagger triggers instant automated rollback to 100% Stable v1.'
                      : 'Stage 09 [Flagger]: Real-time analysis loop active. Evaluating metrics and commanding Istio VirtualService weights.')}
                  </span>
                </div>
                <code style={{ color: 'var(--amber)', fontSize: '10px' }}>
                  {activeStage <= 3 ? 'Jenkins CI Pipeline' : activeStage === 4 ? 'GitOps Controller' : 'Multi-Node Cluster'}
                </code>
              </div>
            )}

            {(phase === 'failed' || phase === 'rollback') && (
              <div className={`rollback-panel ${phase}`}>
                <div>
                  <span className="rollback-kicker">automated recovery path</span>
                  <strong>{phase === 'failed' ? 'FLAGGER ROLLBACK ARMED' : 'FLAGGER ROLLBACK'}</strong>
                  <p>{phase === 'failed' ? `Metrics breached the configured simulation threshold at ${rollbackFrom}% canary traffic. No human intervention is required.` : `Canary traffic is removed directly: ${rollbackFrom}% → 0%. Stable v1 returns to 100% of serving traffic.`}</p>
                </div>
                <div className="rollback-flow"><span>canary {rollbackFrom}%</span><b>→ 0%</b><span>stable 100%</span></div>
              </div>
            )}
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <TrafficMap
              traffic={traffic}
              phase={phase}
              activeStage={activeStage}
              errorRate={errorRate}
              latency={latency}
              onStepNext={handleStepNext}
              onStepPrev={handleStepPrev}
              onAutoPlay={toggleAutoPlay}
              isAutoPlaying={isAutoPlaying}
              onReset={reset}
              onInjectFailure={injectFailure}
            />
            <div style={{ height: '4rem' }} />
            <div className="sandbox-section-heading"><span>01 / architecture</span><h2>The release decision loop</h2></div>
            <ArchitectureDiagram activeNode={selectedNode} onSelect={setSelectedNode} />
          </div>
        </section>

        <section className="section sandbox-section" id="observability">
          <div className="container">
            <div className="sandbox-section-heading"><span>02 / observability detail</span><h2>Live telemetry under the rollout</h2></div>
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
                <div className="experiment-step"><b>01</b><div><strong>Deploy</strong><p>Start {version}. The delivery chain runs automatically until the canary loop begins.</p></div></div>
                <div className="experiment-step"><b>02</b><div><strong>Observe</strong><p>Watch traffic move 10% at a time while Prometheus-style signals update continuously.</p></div></div>
                <div className="experiment-step"><b>03</b><div><strong>Break it</strong><p>Inject degradation now or pre-arm the 50% failure path before deployment.</p></div></div>
                <div className="experiment-step"><b>04</b><div><strong>Recover</strong><p>Flagger automatically removes the canary from traffic: the rollback is direct, not gradual.</p></div></div>
                <div className="experiment-step future"><b>05</b><div><strong>Future policy lab</strong><p>Later we can let visitors set thresholds, intervals and step weights, then preview the corresponding Flagger YAML.</p></div></div>
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
