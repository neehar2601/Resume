import React from 'react'
import type { SandboxPhase } from '../../types/sandbox'

interface InfrastructureArchitectureProps {
  traffic: number
  phase?: SandboxPhase
  activeStage?: number
  errorRate?: number
  latency?: number
  onStepNext?: () => void
  onStepPrev?: () => void
  onAutoPlay?: () => void
  isAutoPlaying?: boolean
  onReset?: () => void
  onInjectFailure?: () => void
}

export const STAGE_DESCRIPTIONS = [
  {
    stage: 1,
    title: 'GitHub: Release Tag v2.4.0 Pushed',
    subtitle: 'Source Code & Git Repository',
    tool: 'GitHub',
    location: 'External Git',
    command: 'git tag -a v2.4.0 -m "Release v2.4.0" && git push origin v2.4.0',
    explanation: 'A developer pushes release tag v2.4.0 to GitHub. A webhook triggers the Jenkins CI automation runner.',
  },
  {
    stage: 2,
    title: 'Jenkins CI: Docker Build & Test',
    subtitle: 'Continuous Integration Runner',
    tool: 'Jenkins',
    location: 'External CI Runner',
    command: 'docker build -t docker.io/cafe/cafe-web:v2.4.0 . && npm test',
    explanation: 'Jenkins pulls code, runs test suites, and compiles the immutable Docker container image tagged with v2.4.0.',
  },
  {
    stage: 3,
    title: 'Docker Hub: Container Image Pushed',
    subtitle: 'Container Registry',
    tool: 'Docker Hub',
    location: 'External Registry',
    command: 'docker push docker.io/cafe/cafe-web:v2.4.0',
    explanation: 'Jenkins pushes the tagged container image to Docker Hub so Kubernetes nodes can pull the new release.',
  },
  {
    stage: 4,
    title: 'Helm Chart: values.yaml Updated',
    subtitle: 'Kubernetes Release Manifest',
    tool: 'Helm',
    location: 'Helm Git Repository',
    command: 'sed -i "s/tag: .*/tag: v2.4.0/" charts/cafe-web/values.yaml && git commit -am "chore(helm): bump to v2.4.0" && git push',
    explanation: 'Jenkins updates the Helm chart repository values.yaml image tag to v2.4.0 and commits to Git. Git remains the single source of truth.',
  },
  {
    stage: 5,
    title: 'Argo CD: Monitoring GitHub & GitOps Sync',
    subtitle: 'In-Cluster GitOps Controller',
    tool: 'Argo CD',
    location: 'K8s Control Plane (namespace: argocd)',
    command: 'argocd app sync cafe-web --prune',
    explanation: 'Argo CD sits inside Kubernetes continuously monitoring the GitHub Helm repo. It detects the values.yaml commit and applies the updated manifests to the cluster.',
  },
  {
    stage: 6,
    title: 'Kubernetes: Canary Pod Scheduled on Node 02',
    subtitle: 'Distributed Workload Runtime',
    tool: 'Kubernetes',
    location: 'Worker Node 02 (worker-beta)',
    command: 'kubectl get pod -n sandbox -l app=cafe-web-canary -o wide',
    explanation: 'Argo CD applies the deployment. Kubernetes schedules Canary Pod (v2.4.0) with an injected Envoy sidecar onto Node 02 (worker-beta). Stable Pods remain on Node 01.',
  },
  {
    stage: 7,
    title: 'Istio Control Plane: VirtualService & DestinationRule Configured',
    subtitle: 'Service Mesh Control Plane (istiod)',
    tool: 'Istio (istiod)',
    location: 'K8s Control Plane (CRDs) ➔ Ingress Gateway (Node 01)',
    command: 'kubectl get vs,dr -n sandbox cafe-web -o yaml',
    explanation: 'VirtualService and DestinationRule CRDs reside in the Control Plane (etcd). istiod pushes the routing rules via xDS down to the Ingress Gateway on Node 01 to split traffic (90% stable, 10% canary).',
  },
  {
    stage: 8,
    title: 'Prometheus: Telemetry Scraping on Node 02',
    subtitle: 'Real-Time Observability & Metrics',
    tool: 'Prometheus',
    location: 'Worker Node 02 (worker-beta)',
    command: 'sum(rate(istio_requests_total{response_code=~"5.*"}[1m])) / sum(rate(istio_requests_total[1m])) * 100',
    explanation: 'Prometheus on Node 02 scrapes metrics from the Canary Pod Envoy sidecar proxy, measuring 5xx error rate and p95 latency every 10 seconds.',
  },
  {
    stage: 9,
    title: 'Flagger Controller: Analyzing SLOs & Updating VirtualService CRD',
    subtitle: 'Autonomous Progressive Delivery Operator',
    tool: 'Flagger',
    location: 'Node 02 ➔ Control Plane (VirtualService CRD) ➔ Istio Ingress (Node 01)',
    command: 'kubectl describe canary cafe-web',
    explanation: 'Flagger queries Prometheus. If healthy, Flagger patches the VirtualService CRD in the Control Plane, advancing traffic (+10%) toward 100%. If thresholds fail, it commands an instant rollback to 100% stable.',
  },
]

type Tone = 'teal' | 'amber' | 'sky' | 'violet' | 'green' | 'red'

const TONE: Record<Tone, string> = {
  teal: '#4fd1c5',
  amber: '#e8a33d',
  sky: '#38bdf8',
  violet: '#a78bfa',
  green: '#86d993',
  red: '#ff5d5d',
}
const INK = '#edf2f7'
const MUTED = '#93a0b1'
const FAINT = '#5d6878'

type Line = string | { t: string; c: string }

interface Flow {
  id: string
  d: string
  tone: Tone
  on: boolean
  dur?: number
}

const STEPS: [string, string][] = [
  ['Argo CD watches Git', 'It polls the Helm repo (or takes a webhook). A new image.tag means the cluster has drifted from Git.'],
  ['Argo CD applies manifests', 'It syncs the new Deployment / Canary spec to the API server. It never touches traffic itself.'],
  ['Flagger sees the new revision', 'Watching the Canary CR, it creates the canary pod. Istio injects an Envoy sidecar into it.'],
  ['istiod pushes config to every Envoy', 'VirtualService + DestinationRule are streamed over xDS to the gateway and to every pod sidecar.'],
  ['Gateway splits traffic', 'The ingress Envoy routes by VirtualService weight: primary subset vs canary subset, across nodes via CNI.'],
  ['Prometheus scrapes the sidecars', 'Every istio-proxy exposes :15020 request counts, errors and latency histograms.'],
  ['Flagger queries Prometheus', 'PromQL for success-rate and latency of the canary, compared against the SLO thresholds.'],
  ['Flagger promotes or rolls back', 'Healthy: patch VirtualService +10%. Breached: weight 0% and canary scaled down. Back to step 4.'],
]

function FlowLine({ flow, index }: { flow: Flow; index: number }) {
  const color = TONE[flow.tone]
  const dur = flow.dur ?? 2.4
  const packets = dur >= 3 ? 2 : 1
  return (
    <g opacity={flow.on ? 1 : 0.28}>
      <path
        d={flow.d}
        fill="none"
        stroke={color}
        strokeWidth={flow.on ? 2.1 : 1.3}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={flow.on ? undefined : '4 6'}
        className={flow.on ? 'af-line-on' : undefined}
        markerEnd={`url(#infra-arrow-${flow.tone})`}
      />
      {flow.on && Array.from({ length: packets }).map((_, k) => (
        <circle key={k} r="3.6" fill={color} filter="url(#infra-glow)" className="af-packet">
          <animateMotion
            dur={`${dur}s`}
            begin={`-${((index * 0.37 + k * dur / packets) % dur).toFixed(2)}s`}
            repeatCount="indefinite"
            path={flow.d}
          />
        </circle>
      ))}
    </g>
  )
}

function Pill({ x, y, text, badge, tone, on = true }: { x: number; y: number; text?: string; badge?: number; tone: Tone; on?: boolean }) {
  const color = TONE[tone]
  const w = (text ? text.length * 5.9 : 0) + (badge !== undefined ? 22 : 0) + 14
  return (
    <g opacity={on ? 1 : 0.5} transform={`translate(${x - w / 2}, ${y - 9})`}>
      <rect width={w} height="18" rx="9" fill="#0a1018" stroke={color} strokeOpacity="0.75" />
      {badge !== undefined && (
        <>
          <circle cx="11" cy="9" r="7" fill={color} />
          <text x="11" y="12.3" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0a1018">{badge}</text>
        </>
      )}
      {text && <text x={badge !== undefined ? 22 : 7} y="12.6" fontSize="10" fontWeight="700" fill={color}>{text}</text>}
    </g>
  )
}

function Box({ x, y, w, h, tone, title, lines, hot, tag }: { x: number; y: number; w: number; h: number; tone: Tone; title: string; lines: Line[]; hot?: boolean; tag?: string }) {
  const c = TONE[tone]
  return (
    <g className={hot ? 'af-hot' : undefined} style={{ color: c }}>
      <rect x={x} y={y} width={w} height={h} rx="10" fill="rgba(13,19,28,0.96)" stroke={c} strokeOpacity={hot ? 1 : 0.45} strokeWidth={hot ? 1.8 : 1.2} />
      {tag && <text x={x + w - 10} y={y + 16} textAnchor="end" fontSize="8.5" letterSpacing="1" fill={c}>{tag}</text>}
      <text x={x + 12} y={y + 22} fontSize="12" fontWeight="700" fill={INK}>{title}</text>
      {lines.map((l, i) => (
        <text key={i} x={x + 12} y={y + 40 + i * 14} fontSize="9.5" fill={typeof l === 'string' ? MUTED : l.c} fontWeight={typeof l === 'string' ? 400 : 700}>
          {typeof l === 'string' ? l : l.t}
        </text>
      ))}
    </g>
  )
}

function Chip({ x, y, w, kind, value, tone, hot }: { x: number; y: number; w: number; kind: string; value: string; tone: Tone; hot?: boolean }) {
  const c = TONE[tone]
  return (
    <g className={hot ? 'af-hot' : undefined} style={{ color: c }}>
      <rect x={x} y={y} width={w} height="38" rx="7" fill="rgba(255,255,255,0.03)" stroke={c} strokeOpacity={hot ? 0.95 : 0.4} />
      <text x={x + 9} y={y + 15} fontSize="8.5" letterSpacing="0.6" fill={c}>{kind}</text>
      <text x={x + 9} y={y + 30} fontSize="10" fontWeight="700" fill={INK}>{value}</text>
    </g>
  )
}

function AppPod({ x, y, name, ip, tag, tone, state, ghostNote, hot, failed }: { x: number; y: number; name: string; ip: string; tag: string; tone: Tone; state: 'running' | 'starting' | 'ghost'; ghostNote?: string; hot?: boolean; failed?: boolean }) {
  const w = 210
  const h = 124
  const color = failed ? TONE.red : TONE[tone]
  const ghost = state === 'ghost'
  return (
    <g transform={`translate(${x}, ${y})`} opacity={ghost ? 0.4 : 1} className={hot ? 'af-hot' : undefined} style={{ color }}>
      <rect width={w} height={h} rx="12" fill="rgba(12,18,26,0.94)" stroke={color} strokeOpacity={ghost ? 0.7 : 0.85} strokeWidth="1.4" strokeDasharray={ghost ? '5 5' : undefined} className={state === 'starting' ? 'af-starting' : undefined} />
      <text x={w - 10} y="17" textAnchor="end" fontSize="9.5" fontWeight="700" fill={color}>{ghost ? (ghostNote ?? 'not scheduled') : state === 'starting' ? 'ContainerCreating…' : name}</text>
      {/* Envoy sidecar */}
      <rect x="10" y="30" width="80" height="62" rx="8" fill="rgba(167,139,250,0.14)" stroke={TONE.violet} strokeOpacity="0.85" />
      <text x="50" y="51" textAnchor="middle" fontSize="10" fontWeight="700" fill="#d8ccff">istio-proxy</text>
      <text x="50" y="65" textAnchor="middle" fontSize="9" fill={TONE.violet}>Envoy sidecar</text>
      <text x="50" y="80" textAnchor="middle" fontSize="8.5" fill={MUTED}>:15020 metrics</text>
      {/* localhost link */}
      <text x="101" y="65" textAnchor="middle" fontSize="13" fill={TONE.violet}>⇄</text>
      {/* App container */}
      <rect x="112" y="30" width="88" height="62" rx="8" fill="rgba(255,255,255,0.04)" stroke={color} strokeOpacity="0.7" />
      <text x="156" y="51" textAnchor="middle" fontSize="10" fontWeight="700" fill={INK}>cafe-web</text>
      <text x="156" y="65" textAnchor="middle" fontSize="9" fill={MUTED}>app :8080</text>
      <text x="156" y="80" textAnchor="middle" fontSize="9.5" fontWeight="700" fill={color}>{tag}</text>
      <text x="10" y="112" fontSize="8.5" fill={FAINT}>READY 2/2</text>
      <text x={w - 10} y="112" textAnchor="end" fontSize="8.5" fill={FAINT}>{ip}</text>
    </g>
  )
}

function WorkerNode({ x, y, w, h, label, host, ip, cidr }: { x: number; y: number; w: number; h: number; label: string; host: string; ip: string; cidr: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="16" fill="rgba(10,15,22,0.6)" stroke="#2f3b4c" strokeWidth="1.4" strokeDasharray="7 5" />
      <text x={x + 15} y={y + 22} fontSize="11" fontWeight="800" letterSpacing="1.2" fill={INK}>{label}</text>
      <text x={x + w - 15} y={y + 22} textAnchor="end" fontSize="9.5" fill={MUTED}>{host} · {ip}</text>
      <text x={x + w / 2} y={y + h - 12} textAnchor="middle" fontSize="8.5" fill={FAINT}>kubelet · containerd · kube-proxy · podCIDR {cidr}</text>
    </g>
  )
}

export function InfrastructureArchitecture({
  traffic,
  phase = 'idle',
  activeStage = -1,
  errorRate = 0.2,
  latency = 124,
  onStepNext,
  onStepPrev,
  onAutoPlay,
  isAutoPlaying = false,
  onReset,
  onInjectFailure,
}: InfrastructureArchitectureProps) {
  const s = activeStage
  const isPromoted = traffic === 100 || phase === 'success'
  const isFailed = phase === 'failed' || phase === 'rollback' || phase === 'rolledBack'
  const breaching = phase === 'failed'

  const canaryW = phase === 'rollback' || phase === 'rolledBack' || isPromoted ? 0 : traffic
  const primW = 100 - canaryW
  const perPod = primW / 2
  const canaryState: 'running' | 'starting' | 'ghost' =
    isPromoted || phase === 'rollback' || phase === 'rolledBack' ? 'ghost' : s >= 6 ? 'running' : s === 5 ? 'starting' : 'ghost'
  const canaryNote = isPromoted ? 'scaled to 0 · promoted' : phase === 'rolledBack' || phase === 'rollback' ? 'scaled to 0 · rolled back' : 'canary slot · not scheduled'
  const primaryTag = isPromoted ? 'v2.4.0' : 'v2.3.0'
  const canaryLive = canaryState === 'running'
  const steady = s < 0
  const breached = errorRate > 1 || latency > 220

  const canaryStatus = isPromoted ? 'Succeeded' : isFailed ? 'Failed → rollback' : s >= 6 ? `Progressing ${traffic}%` : s === 5 ? 'Initializing' : 'Idle'
  const argoStatus = s === 4 ? 'OutOfSync → syncing v2.4.0' : s >= 5 ? 'Synced · v2.4.0' : 'Synced · v2.3.0'
  const flaggerStatus = s < 5 ? 'idle · waiting for a new revision' : s === 5 ? 'new revision detected' : s >= 8 ? (isFailed ? 'SLO breached → rolling back' : `analysing · canary ${traffic}%`) : 'canary ready'

  const flows: Flow[] = [
    // CI / GitOps (outside the cluster)
    { id: 'ci-webhook', d: 'M985 75 L920 75', tone: 'green', on: s === 0 || s === 1, dur: 1.2 },
    { id: 'ci-push', d: 'M760 75 L710 75', tone: 'green', on: s === 2, dur: 1.2 },
    { id: 'ci-bump', d: 'M840 40 C840 4 1075 4 1075 40', tone: 'green', on: s === 3, dur: 2 },
    { id: 'argo-watch', d: 'M1075 215 L1075 110', tone: 'green', on: steady || s === 4, dur: 1.8 },
    { id: 'argo-apply', d: 'M935 255 L900 255', tone: 'green', on: s === 4 || s === 5, dur: 1 },
    // Flagger <-> API server
    { id: 'f-watch', d: 'M890 295 L890 318 L1040 318 L1040 410', tone: 'amber', on: s === 5, dur: 2.2 },
    { id: 'f-patch', d: 'M1010 410 L1010 338 L860 338 L860 295', tone: breaching || isFailed ? 'red' : 'amber', on: s === 8, dur: 2.4 },
    // istiod -> envoys (xDS)
    { id: 'api-istiod', d: 'M480 255 L430 255', tone: 'violet', on: s === 6, dur: 1 },
    { id: 'x-gw', d: 'M330 295 L330 424', tone: 'violet', on: s === 6, dur: 1.8 },
    { id: 'x-p1', d: 'M410 295 L410 528 L269 528 L269 575', tone: 'violet', on: s === 6, dur: 3 },
    { id: 'x-p2', d: 'M410 295 L410 528 L499 528 L499 575', tone: 'violet', on: s === 6, dur: 3 },
    { id: 'x-c', d: 'M410 295 L410 528 L829 528 L829 575', tone: 'violet', on: s === 6 && canaryLive, dur: 4 },
    // user traffic
    { id: 'users', d: 'M130 455 L205 455', tone: 'teal', on: true, dur: 1.2 },
    { id: 't-p1', d: 'M245 500 C245 530 241 545 241 575', tone: 'teal', on: primW > 0, dur: 1.4 },
    { id: 't-p2', d: 'M330 500 C330 540 471 535 471 575', tone: 'teal', on: primW > 0, dur: 2 },
    { id: 't-c', d: 'M415 455 L775 455 Q801 455 801 481 L801 575', tone: breaching ? 'red' : 'amber', on: canaryLive && canaryW > 0, dur: 3.2 },
    // telemetry
    { id: 'm-p1', d: 'M255 669 L255 726 L1130 726 L1130 669', tone: 'sky', on: steady || s >= 7, dur: 4.5 },
    { id: 'm-p2', d: 'M485 669 L485 712 L1105 712 L1105 669', tone: 'sky', on: steady || s >= 7, dur: 4 },
    { id: 'm-c', d: 'M815 669 L815 698 L1080 698 L1080 669', tone: 'sky', on: canaryLive && s >= 7, dur: 2.6 },
    // PromQL
    { id: 'q', d: 'M1105 500 L1105 545', tone: breaching ? 'red' : 'amber', on: s >= 8 && phase !== 'rolledBack', dur: 1 },
  ]

  const hotStep = [
    s === 4,
    s === 4 || s === 5,
    s === 5,
    s === 6,
    s >= 6 && canaryW > 0,
    s === 7,
    s === 8,
    s === 8,
  ]

  const currentStageInfo = activeStage >= 0 && activeStage < STAGE_DESCRIPTIONS.length
    ? STAGE_DESCRIPTIONS[activeStage]
    : null

  return (
    <div className="progressive-infra-canvas" style={{ marginTop: '1.5rem' }}>
      <div className="infra-header">
        <div className="infra-header-title">
          <span className="control-label">end-to-end infrastructure architecture</span>
          <h3>Pods, sidecars and the control loop on a 2-node cluster</h3>
          <p>
            Every app pod carries an <strong>Envoy sidecar</strong>. <strong>istiod</strong> pushes routing config to them, <strong>Prometheus</strong> scrapes their metrics, <strong>Argo CD</strong> keeps the cluster in sync with Git, and <strong>Flagger</strong> reads Prometheus to move the Istio traffic weights forward or back.
          </p>
        </div>

        <div className="infra-controls-toolbar">
          <div className="step-button-group">
            <button type="button" className="button step-btn" onClick={onStepPrev} disabled={activeStage <= 0} title="Previous Stage">◀ Prev Stage</button>
            <button type="button" className={`button step-btn ${!isAutoPlaying ? 'primary' : ''}`} onClick={onStepNext} disabled={activeStage >= 8 && isPromoted} title="Step forward one stage">Next Stage ▶</button>
            <button type="button" className={`button step-btn ${isAutoPlaying ? 'primary' : ''}`} onClick={onAutoPlay} title={isAutoPlaying ? 'Pause automatic flow' : 'Play continuous execution'}>{isAutoPlaying ? '⏸ Pause' : '▶ Auto-Play'}</button>
            <button type="button" className="button step-btn danger" onClick={onInjectFailure} disabled={phase !== 'canary'} title="Inject threshold failure">⚠ Inject Failure</button>
            <button type="button" className="button step-btn" onClick={onReset} title="Reset deployment">↺ Reset</button>
          </div>
        </div>
      </div>

      {currentStageInfo && (
        <div className={`active-stage-explainer-card ${isFailed ? 'failed-stage' : ''}`}>
          <div className="explainer-head">
            <div className="explainer-badges">
              <span className={`stage-step-pill ${isFailed ? 'failed' : ''}`}>STAGE 0{currentStageInfo.stage} / 09</span>
              <strong>{currentStageInfo.title}</strong>
              <span className="explainer-loc">[{currentStageInfo.location}]</span>
            </div>
            <code className="explainer-cmd">{currentStageInfo.command}</code>
          </div>
          <p className="explainer-desc">
            {isFailed
              ? 'ALERT: Prometheus metrics breached the SLO thresholds (error-rate > 1% or latency > 220ms). Flagger patches the VirtualService in the API server: canary weight goes to 0%, istiod pushes it to every Envoy, and 100% returns to the primary.'
              : currentStageInfo.explanation}
          </p>
        </div>
      )}

      <div className="infra-svg-wrap">
        <svg className="infra-svg" viewBox="0 0 1270 800" role="img" aria-label="Kubernetes cluster topology: pods with Envoy sidecars on two worker nodes, istiod, Prometheus, Flagger and Argo CD">
          <defs>
            <filter id="infra-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {(Object.keys(TONE) as Tone[]).map((t) => (
              <marker key={t} id={`infra-arrow-${t}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M0 0 L10 5 L0 10 z" fill={TONE[t]} />
              </marker>
            ))}
          </defs>

          {/* ---------- Legend ---------- */}
          <text x="10" y="32" fontSize="9" letterSpacing="1.4" fill={FAINT}>LEGEND</text>
          {([
            [10, 52, 'teal', 'user / primary traffic'],
            [10, 72, 'amber', 'canary traffic · Flagger control'],
            [10, 92, 'sky', 'metrics scrape (:15020)'],
            [270, 52, 'violet', 'xDS config push (istiod → Envoy)'],
            [270, 72, 'green', 'GitOps / CI flow'],
          ] as [number, number, Tone, string][]).map(([lx, ly, t, label]) => (
            <g key={label}>
              <line x1={lx} y1={ly} x2={lx + 26} y2={ly} stroke={TONE[t]} strokeWidth="2.2" markerEnd={`url(#infra-arrow-${t})`} />
              <text x={lx + 36} y={ly + 3.5} fontSize="10" fill={MUTED}>{label}</text>
            </g>
          ))}
          <rect x="270" y="84" width="22" height="14" rx="3" fill="rgba(167,139,250,0.18)" stroke={TONE.violet} />
          <text x="306" y="95" fontSize="10" fill={MUTED}>Envoy sidecar inside the pod</text>

          {/* ---------- External: users + CI ---------- */}
          <g>
            <rect x="10" y="415" width="120" height="80" rx="10" fill="rgba(13,19,28,0.96)" stroke={TONE.teal} strokeOpacity="0.5" />
            <text x="70" y="448" textAnchor="middle" fontSize="20" fill={TONE.teal}>◉</text>
            <text x="70" y="468" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>Users</text>
            <text x="70" y="483" textAnchor="middle" fontSize="8.5" fill={MUTED}>GET /cafe-web</text>
          </g>
          <Box x={550} y={40} w={160} h={70} tone="green" title="Docker Hub" tag="REGISTRY" lines={['cafe-web:v2.4.0', s >= 2 ? 'image pushed' : 'awaiting push']} hot={s === 2} />
          <Box x={760} y={40} w={160} h={70} tone="green" title="Jenkins CI" tag="CI" lines={['docker build + test', s >= 1 ? 'build #42 ✓' : 'idle']} hot={s === 1} />
          <Box x={985} y={40} w={180} h={70} tone="green" title="GitHub" tag="GIT · HELM REPO" lines={['charts/cafe-web', s >= 3 ? 'values.yaml tag: v2.4.0' : 'values.yaml tag: v2.3.0']} hot={s === 0 || s === 3} />

          {/* ---------- Cluster ---------- */}
          <rect x="155" y="150" width="1100" height="640" rx="22" fill="rgba(79,209,197,0.025)" stroke={TONE.teal} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="10 6" />
          <text x="175" y="171" fontSize="11" fontWeight="800" letterSpacing="1.4" fill={TONE.teal}>KUBERNETES CLUSTER</text>
          <text x="335" y="171" fontSize="9.5" fill={MUTED}>k8s.cluster.local · Calico CNI 10.244.0.0/16 · Istio mesh · namespace: sandbox</text>

          {/* control plane band */}
          <rect x="175" y="180" width="1060" height="130" rx="14" fill="rgba(255,255,255,0.018)" stroke="#2a3544" />
          <text x="195" y="198" fontSize="8.5" letterSpacing="1.2" fill={FAINT}>CONTROL PLANE &amp; CLUSTER SERVICES · desired state lives in etcd</text>

          <Box x={195} y={215} w={235} h={80} tone="violet" title="istiod" tag="ISTIO CONTROL PLANE" lines={['watches VirtualService + DR', 'pushes xDS to every Envoy']} hot={s === 6} />

          {/* API server + CRDs */}
          <g className={s === 4 || s === 5 || s === 8 ? 'af-hot' : undefined} style={{ color: TONE.amber }}>
            <rect x="480" y="215" width="420" height="80" rx="10" fill="rgba(13,19,28,0.96)" stroke={TONE.amber} strokeOpacity={s === 4 || s === 5 || s === 8 ? 1 : 0.45} strokeWidth="1.2" />
            <text x="492" y="233" fontSize="12" fontWeight="700" fill={INK}>kube-apiserver · etcd</text>
            <text x="888" y="231" textAnchor="end" fontSize="8.5" letterSpacing="1" fill={TONE.amber}>CRDs &amp; OBJECTS</text>
          </g>
          <Chip x={492} y={245} w={118} kind="Canary / cafe-web" value={canaryStatus.length > 17 ? canaryStatus.slice(0, 17) : canaryStatus} tone={isFailed ? 'red' : 'amber'} hot={s === 5 || s === 8} />
          <Chip x={618} y={245} w={162} kind="VirtualService" value={`primary ${primW} · canary ${canaryW}`} tone="violet" hot={s === 6 || s === 8} />
          <Chip x={788} y={245} w={102} kind="DestinationRule" value="primary|canary" tone="violet" />

          <Box x={935} y={215} w={280} h={80} tone="green" title="Argo CD" tag="GITOPS · ns: argocd" lines={['app: cafe-web  →  charts/cafe-web', { t: argoStatus, c: s === 4 ? TONE.amber : TONE.green }]} hot={s === 4} />

          {/* ---------- Worker nodes ---------- */}
          <WorkerNode x={190} y={350} w={480} h={420} label="WORKER NODE 01" host="worker-alpha" ip="192.168.56.11" cidr="10.244.1.0/24" />
          <WorkerNode x={750} y={350} w={480} h={420} label="WORKER NODE 02" host="worker-beta" ip="192.168.56.12" cidr="10.244.2.0/24" />

          {/* CNI overlay between nodes */}
          <rect x="688" y="392" width="46" height="368" rx="12" fill="rgba(56,189,248,0.04)" stroke={TONE.sky} strokeOpacity="0.3" strokeDasharray="3 5" />
          <text transform="translate(715 576) rotate(-90)" textAnchor="middle" fontSize="9" letterSpacing="2" fill={TONE.sky} fillOpacity="0.8">CALICO CNI OVERLAY · POD-TO-POD ACROSS NODES</text>

          {/* ---------- Node 01 pods ---------- */}
          <g className={s === 6 ? 'af-hot' : undefined} style={{ color: TONE.violet }}>
            <rect x="205" y="410" width="210" height="90" rx="12" fill="rgba(12,18,26,0.94)" stroke={TONE.violet} strokeOpacity="0.85" strokeWidth="1.4" />
            <rect x="215" y="424" width="190" height="48" rx="8" fill="rgba(167,139,250,0.14)" stroke={TONE.violet} strokeOpacity="0.85" />
            <text x="310" y="443" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#d8ccff">Envoy · ingress gateway</text>
            <text x="310" y="460" textAnchor="middle" fontSize="9.5" fill={TONE.violet}>{`route: primary ${primW}% · canary ${canaryW}%`}</text>
            <text x="405" y="491" textAnchor="end" fontSize="8.5" fill={FAINT}>istio-ingressgateway · 10.244.1.11</text>
          </g>
          <AppPod x={205} y={545} name="primary-7c9d4" ip="10.244.1.21" tag={primaryTag} tone="teal" state="running" hot={isPromoted && s >= 8} />
          <AppPod x={435} y={545} name="primary-7c9d5" ip="10.244.1.22" tag={primaryTag} tone="teal" state="running" hot={isPromoted && s >= 8} />

          {/* ---------- Node 02 pods ---------- */}
          <AppPod x={765} y={545} name="canary-5f6b8" ip="10.244.2.31" tag="v2.4.0" tone="amber" state={canaryState} ghostNote={canaryNote} hot={s === 5 || s === 6} failed={breaching} />

          <g className={s === 5 || s === 8 ? 'af-hot' : undefined} style={{ color: TONE.amber }}>
            <rect x="995" y="410" width="220" height="90" rx="12" fill="rgba(12,18,26,0.94)" stroke={isFailed ? TONE.red : TONE.amber} strokeOpacity="0.85" strokeWidth="1.4" />
            <rect x="1005" y="424" width="200" height="48" rx="8" fill="rgba(232,163,61,0.10)" stroke={isFailed ? TONE.red : TONE.amber} strokeOpacity="0.7" />
            <text x="1105" y="443" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>Flagger controller</text>
            <text x="1105" y="460" textAnchor="middle" fontSize="9" fill={isFailed ? TONE.red : TONE.amber}>{flaggerStatus}</text>
            <text x="1205" y="491" textAnchor="end" fontSize="8.5" fill={FAINT}>flagger · 10.244.2.38</text>
          </g>

          <g className={s === 7 || s === 8 ? 'af-hot' : undefined} style={{ color: TONE.sky }}>
            <rect x="995" y="545" width="220" height="124" rx="12" fill="rgba(12,18,26,0.94)" stroke={TONE.sky} strokeOpacity="0.85" strokeWidth="1.4" />
            <text x="1205" y="562" textAnchor="end" fontSize="9.5" fontWeight="700" fill={TONE.sky}>prometheus-0</text>
            <rect x="1005" y="575" width="200" height="62" rx="8" fill="rgba(56,189,248,0.10)" stroke={TONE.sky} strokeOpacity="0.7" />
            <text x="1105" y="594" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK}>Prometheus</text>
            <text x="1105" y="608" textAnchor="middle" fontSize="9" fill={MUTED}>scrapes istio-proxy :15020</text>
            <text x="1105" y="626" textAnchor="middle" fontSize="10" fontWeight="700" fill={breached ? TONE.red : TONE.teal}>{`err ${errorRate.toFixed(1)}% · p95 ${latency}ms`}</text>
            <text x="1205" y="658" textAnchor="end" fontSize="8.5" fill={FAINT}>10.244.2.40</text>
          </g>

          {/* ---------- Flows ---------- */}
          {flows.map((f, i) => <FlowLine key={f.id} flow={f} index={i} />)}

          {/* ---------- Flow labels ---------- */}
          <Pill x={167} y={437} text="HTTPS :443" tone="teal" />
          <Pill x={957} y={14} text="commit image.tag" tone="green" on={s === 3} />
          <Pill x={952} y={58} text="webhook" tone="green" on={s === 0 || s === 1} />
          <Pill x={735} y={58} text="push" tone="green" on={s === 2} />
          <Pill x={1075} y={130} badge={1} text="watches repo" tone="green" on={steady || s === 4} />
          <Pill x={917} y={232} badge={2} tone="green" on={s === 4 || s === 5} />
          <Pill x={965} y={318} badge={3} text="watch Canary CR" tone="amber" on={s === 5} />
          <Pill x={935} y={338} badge={8} text={isFailed ? 'rollback → 0%' : 'patch VS weights'} tone={isFailed ? 'red' : 'amber'} on={s === 8} />
          <Pill x={455} y={232} badge={4} tone="violet" on={s === 6} />
          <Pill x={410} y={340} text="xDS config" tone="violet" on={s === 6} />
          <Pill x={241} y={518} text={`${perPod}%`} tone="teal" on={primW > 0} />
          <Pill x={471} y={518} text={`${perPod}%`} tone="teal" on={primW > 0} />
          {canaryLive && <Pill x={801} y={518} text={`${canaryW}%`} tone={breaching ? "red" : "amber"} on={canaryW > 0} />}
          <Pill x={560} y={455} badge={5} text="canary subset · via CNI" tone={breaching ? 'red' : 'amber'} on={canaryLive && canaryW > 0} />
          <Pill x={560} y={726} badge={6} text="scrape :15020/metrics" tone="sky" on={steady || s >= 7} />
          <Pill x={1046} y={522} badge={7} text="PromQL" tone={breaching ? 'red' : 'amber'} on={s >= 8 && phase !== 'rolledBack'} />
        </svg>
      </div>

      <div className="infra-steps">
        {STEPS.map(([title, body], i) => (
          <div key={title} className={`infra-step ${hotStep[i] ? 'hot' : ''}`}>
            <span className="infra-step-n">{i + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
