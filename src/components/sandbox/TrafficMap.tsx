import React from 'react'
import type { SandboxPhase } from '../../types/sandbox'

interface TrafficMapProps {
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

export function TrafficMap({
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
}: TrafficMapProps) {
  const isPromoted = traffic === 100 || phase === 'success'
  const isFailed = phase === 'failed' || phase === 'rollback' || phase === 'rolledBack'

  const currentStageInfo = activeStage >= 0 && activeStage < STAGE_DESCRIPTIONS.length
    ? STAGE_DESCRIPTIONS[activeStage]
    : null

  return (
    <div className="progressive-infra-canvas" style={{ marginTop: '2rem' }}>
      {/* ========================================================================= */}
      {/* 1. Header & Live Interactive Step-by-Step Controls                        */}
      {/* ========================================================================= */}
      <div className="infra-header">
        <div className="infra-header-title">
          <span className="control-label">live kubernetes infrastructure console</span>
          <h3>GitOps &amp; Progressive Delivery Architecture</h3>
          <p>
            The accurate infrastructure model: <strong>External CI/CD</strong> builds the container and updates Helm, <strong>Argo CD &amp; Istiod</strong> manage GitOps &amp; Mesh CRDs at the <strong>Control Plane</strong> level, and the <strong>Worker Nodes</strong> run the actual Pods (Ingress Gateway, Stable Pods, Canary Pod, Prometheus, and Flagger).
          </p>
        </div>

        {/* Step-by-Step Controls */}
        <div className="infra-controls-toolbar">
          <div className="step-button-group">
            <button
              type="button"
              className="button step-btn"
              onClick={onStepPrev}
              disabled={activeStage <= 0}
              title="Previous Stage"
            >
              ◀ Prev Stage
            </button>
            <button
              type="button"
              className={`button step-btn ${!isAutoPlaying ? 'primary' : ''}`}
              onClick={onStepNext}
              disabled={activeStage >= 8 && isPromoted}
              title="Step forward one stage"
            >
              Next Stage ▶
            </button>
            <button
              type="button"
              className={`button step-btn ${isAutoPlaying ? 'primary' : ''}`}
              onClick={onAutoPlay}
              title={isAutoPlaying ? 'Pause automatic flow' : 'Play continuous execution'}
            >
              {isAutoPlaying ? '⏸ Pause' : '▶ Auto-Play'}
            </button>
            <button
              type="button"
              className="button step-btn danger"
              onClick={onInjectFailure}
              disabled={phase !== 'canary'}
              title="Inject threshold failure"
            >
              ⚠ Inject Failure
            </button>
            <button
              type="button"
              className="button step-btn"
              onClick={onReset}
              title="Reset deployment"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Active Stage Explainer Card (Shows What is Happening Right Now)        */}
      {/* ========================================================================= */}
      {currentStageInfo && (
        <div className={`active-stage-explainer-card ${isFailed ? 'failed-stage' : ''}`}>
          <div className="explainer-head">
            <div className="explainer-badges">
              <span className={`stage-step-pill ${isFailed ? 'failed' : ''}`}>
                STAGE 0{currentStageInfo.stage} / 09
              </span>
              <strong>{currentStageInfo.title}</strong>
              <span className="explainer-loc">[{currentStageInfo.location}]</span>
            </div>
            <code className="explainer-cmd">{currentStageInfo.command}</code>
          </div>
          <p className="explainer-desc">
            {isFailed
              ? 'ALERT: Prometheus metrics breached SLO thresholds (error-rate > 1% or latency > 220ms). Flagger on Node 02 sends an immediate rollback command to the VirtualService CRD in the Control Plane: canary traffic is set to 0%, restoring 100% to stable primary.'
              : currentStageInfo.explanation}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXTERNAL REALM (Internet Clients & CI/CD Pipeline)                      */}
      {/* ========================================================================= */}
      <div className="external-realm-container">
        {/* Left: External Internet Clients */}
        <div className="external-client-box">
          <div className="client-box-head">
            <span className="realm-tag">PUBLIC INTERNET</span>
            <small>External Traffic Source</small>
          </div>
          <div className="client-box-body">
            <div className="user-icon-pulse">◉</div>
            <div>
              <strong>External Users &amp; Browsers</strong>
              <p><code>HTTPS GET /cafe-web</code></p>
              <small>Connecting via Cloud NLB / DNS</small>
            </div>
          </div>
          <div className="client-ingress-arrow">
            <span>Inbound HTTPS Traffic (Port :443)</span>
            <span className="arrow-down">▼</span>
          </div>
        </div>

        {/* Right: External CI/CD Pipeline (Jenkins -> Docker Hub -> Helm) */}
        <div className="external-pipeline-strip-compact">
          <div className="strip-title-bar">
            <span><i className="strip-dot amber" /> EXTERNAL CI / CD &amp; PACKAGING PIPELINE</span>
            <small>Jenkins Automation ➔ Docker Hub ➔ Helm Chart Repository</small>
          </div>

          <div className="pipeline-steps-row">
            {/* Step 1: GitHub */}
            <div className={`pipe-node ${activeStage === 0 ? 'active' : activeStage > 0 ? 'done' : ''}`}>
              <span className="pipe-node-badge">SOURCE GIT</span>
              <div className="pipe-node-name">
                <span className="pipe-icon">⚙</span>
                <strong>GitHub Repo</strong>
              </div>
              <code>tag: v2.4.0</code>
              <small>Dispatches webhook</small>
            </div>

            <div className={`pipe-arrow ${activeStage >= 1 ? 'lit' : ''}`}>➔</div>

            {/* Step 2: Jenkins */}
            <div className={`pipe-node ${activeStage === 1 ? 'active' : activeStage > 1 ? 'done' : ''}`}>
              <span className="pipe-node-badge amber">CI RUNNER</span>
              <div className="pipe-node-name">
                <span className="pipe-icon">⚡</span>
                <strong>Jenkins CI</strong>
              </div>
              <code>docker build</code>
              <small>Compiles &amp; tests app</small>
            </div>

            <div className={`pipe-arrow ${activeStage >= 2 ? 'lit' : ''}`}>➔</div>

            {/* Step 3: Docker Hub */}
            <div className={`pipe-node ${activeStage === 2 ? 'active' : activeStage > 2 ? 'done' : ''}`}>
              <span className="pipe-node-badge amber">REGISTRY</span>
              <div className="pipe-node-name">
                <span className="pipe-icon">▱</span>
                <strong>Docker Hub</strong>
              </div>
              <code>cafe-web:v2.4.0</code>
              <small>Image pushed</small>
            </div>

            <div className={`pipe-arrow ${activeStage >= 3 ? 'lit' : ''}`}>➔</div>

            {/* Step 4: Helm Chart Repo */}
            <div className={`pipe-node ${activeStage === 3 ? 'active' : activeStage > 3 ? 'done' : ''}`}>
              <span className="pipe-node-badge teal">HELM REPO</span>
              <div className="pipe-node-name">
                <span className="pipe-icon">⎈</span>
                <strong>Helm Chart</strong>
              </div>
              <code>values.yaml: v2.4.0</code>
              <small>Git commit &amp; push</small>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. THE KUBERNETES CLUSTER [k8s.cluster.local]                             */}
      {/* ========================================================================= */}
      <div className="k8s-cluster-main-container">
        {/* Cluster Header */}
        <div className="cluster-main-banner">
          <div className="cluster-main-title">
            <span className="cluster-beacon-dot" />
            <strong>KUBERNETES CLUSTER [k8s.cluster.local]</strong>
            <span className="cluster-cni-tag">Calico CNI (10.244.0.0/16)</span>
            <span className="cluster-mesh-tag">Istio Service Mesh Active</span>
          </div>
          <div className="cluster-main-status">
            <span className="status-live-pulse" />
            {phase === 'idle'
              ? 'Cluster Idle · 100% Stable (v1)'
              : isFailed
              ? '⚠ Automated Rollback Active (Canary 0% / Stable 100%)'
              : isPromoted
              ? 'Promotion Complete · 100% Stable (v2.4.0)'
              : traffic > 0
              ? `Canary Rollout: ${traffic}% (Node 02) / ${100 - traffic}% (Node 01)`
              : 'Syncing Workload'}
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CONTROL PLANE LAYER: Argo CD & Istio Control Plane (VirtualService CRD) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="cluster-control-plane-layer">
          <div className="control-plane-banner">
            <span className="cp-badge">CLUSTER CONTROL PLANE &amp; SERVICE MESH PLANE</span>
            <small>etcd API Objects &amp; Controllers (Cluster-Wide, Not on Worker Nodes)</small>
          </div>

          <div className="control-plane-grid">
            {/* 1. Argo CD Controller */}
            <div className={`cp-card argocd-cp-card ${activeStage === 4 || phase === 'sync' ? 'active-cp' : ''}`}>
              <div className="cp-card-head">
                <span className="cp-icon">🐙</span>
                <div>
                  <strong>Argo CD Controller</strong>
                  <small>namespace: <code>argocd</code></small>
                </div>
              </div>
              <div className="cp-card-body">
                <div className="monitoring-line">
                  <span className="line-dot" />
                  <span>Monitoring <code>GitHub: charts/cafe-web</code></span>
                </div>
                <div className="sync-status-row">
                  <span>State: <b>{activeStage === 4 ? 'SYNCING...' : activeStage > 4 ? 'SYNCED ✓' : 'WATCHING'}</b></span>
                  <span>Target: <code>v2.4.0</code></span>
                </div>
              </div>
              <div className="cp-card-foot">
                <span>➔ Reconciles Helm deployment into cluster</span>
              </div>
            </div>

            {/* 2. Istio Control Plane (istiod) & CRDs */}
            <div className={`cp-card istio-cp-card ${traffic > 0 || isFailed ? 'active-cp' : ''}`}>
              <div className="cp-card-head">
                <span className="cp-icon">⎈</span>
                <div>
                  <strong>Istio Control Plane (istiod)</strong>
                  <small>Service Mesh CRDs (Stored in etcd)</small>
                </div>
              </div>
              <div className="cp-card-body">
                {/* VirtualService CRD */}
                <div className="crd-spec-box">
                  <div className="crd-spec-title">
                    <strong>VirtualService: <code>cafe-web-vs</code></strong>
                    <span className="weights-pill">
                      stable: <b>{isPromoted ? '0%' : `${100 - traffic}%`}</b> | canary: <b>{isPromoted ? '100%' : `${traffic}%`}</b>
                    </span>
                  </div>
                  <div className="vs-meter-bar">
                    <div className="vs-meter-stable" style={{ width: isPromoted ? '0%' : `${100 - traffic}%` }} />
                    <div className="vs-meter-canary" style={{ width: isPromoted ? '100%' : `${traffic}%` }} />
                  </div>
                </div>

                {/* DestinationRule CRD */}
                <div className="crd-spec-box dr-box">
                  <div className="crd-spec-title">
                    <strong>DestinationRule: <code>cafe-web-dr</code></strong>
                    <small>Subsets</small>
                  </div>
                  <div className="dr-subsets-grid">
                    <code>subset: primary (version=v1)</code>
                    <code>subset: canary (version=v2.4.0)</code>
                  </div>
                </div>
              </div>
              <div className="cp-card-foot">
                <span>istiod pushes xDS routing rules ➔ Envoy Ingress Gateway &amp; Sidecars</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* WORKER NODES LAYER (DATA PLANE: Actual Pods & Workloads)                 */}
        {/* ----------------------------------------------------------------------- */}
        <div className="cluster-nodes-topology">

          {/* ==================== WORKER NODE 01 ==================== */}
          <div className="worker-node-box node-01-edge">
            <div className="node-box-topbar">
              <div className="node-id-group">
                <span className="node-indicator-dot teal" />
                <strong>Worker Node 01: worker-alpha</strong>
                <span className="node-ip">10.244.1.12</span>
              </div>
              <span className="node-role-pill">DATA PLANE · INGRESS &amp; BASELINE</span>
            </div>

            <div className="node-internals">
              {/* Pod 1: Istio Ingress Gateway Pod */}
              <div className="infra-card ingress-gw-card">
                <div className="infra-card-head">
                  <span className="infra-tag teal">INGRESS GATEWAY POD</span>
                  <small>istio-ingressgateway (:443)</small>
                </div>
                <div className="infra-card-content">
                  <strong>Istio Ingress Gateway Pod</strong>
                  <p>Receives incoming traffic from External Users via port 443</p>
                  <small>Executes routing rules pushed from <code>istiod</code></small>
                </div>
                <div className="infra-card-foot">
                  <span>Enforces VirtualService weights: splits traffic to subsets</span>
                </div>
              </div>

              {/* Pod 2: Stable Primary Pods */}
              <div className={`infra-card pod-card ${!isPromoted ? 'serving' : 'standby'}`}>
                <div className="infra-card-head">
                  <span className="infra-tag">STABLE WORKLOAD POD</span>
                  <small>2/2 Ready · Envoy Sidecar</small>
                </div>
                <div className="infra-card-content">
                  <strong>cafe-web-primary (v1)</strong>
                  <p>Baseline image: <code>cafe-web:v2.3.0</code></p>
                  <small>{isPromoted ? 'Standby for next version' : 'Receives subset: primary traffic locally on Node 01'}</small>
                </div>
                <div className="infra-card-foot">
                  <span className="foot-pulse teal" />
                  <span>Serving: <b>{isPromoted ? '0%' : `${100 - traffic}%`}</b> of total traffic</span>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== CENTRAL CNI BRIDGE & FLAGGER SIGNAL ==================== */}
          <div className="inter-node-cni-channel">
            {/* Cross-Node CNI Overlay Beam */}
            <div className={`cni-tunnel-card ${traffic > 0 ? 'beam-active' : ''}`}>
              <span className="cni-kicker">CALICO CNI OVERLAY</span>
              <strong>Cross-Node Tunnel</strong>
              <div className="cni-arrow-flow">
                <span className="arrow-beam">➔</span>
                <span className="traffic-beam-pill">{traffic}% Canary Traffic</span>
              </div>
              <small>Node 01 (10.244.1.12) ➔ Node 02 (10.244.2.35)</small>
            </div>

            {/* Flagger to Control Plane Feedback */}
            <div className={`flagger-to-istio-card ${traffic > 0 || isFailed ? 'signal-active' : ''} ${isFailed ? 'failed-signal' : ''}`}>
              <div className="flagger-signal-head">
                <span className="signal-arrow">▲</span>
                <strong>Flagger ➔ Control Plane Feedback</strong>
              </div>
              <p>
                {isFailed
                  ? '⚠ Rollback: Flagger patches VirtualService CRD in Control Plane to set canary=0%, stable=100%'
                  : traffic > 0
                  ? 'Flagger patches VirtualService CRD (+10% weight)'
                  : 'Flagger monitoring Canary deployment CRD'}
              </p>
              <small>Updates CRD in API Server ➔ istiod pushes to Envoy</small>
            </div>
          </div>

          {/* ==================== WORKER NODE 02 ==================== */}
          <div className={`worker-node-box node-02-compute ${isFailed ? 'node-failed' : ''}`}>
            <div className="node-box-topbar">
              <div className="node-id-group">
                <span className={`node-indicator-dot ${isFailed ? 'red' : 'amber'}`} />
                <strong style={isFailed ? { color: '#ff7875' } : {}}>Worker Node 02: worker-beta</strong>
                <span className="node-ip">10.244.2.35</span>
              </div>
              <span className={`node-role-pill ${isFailed ? 'red' : 'amber'}`}>
                {isFailed ? 'THRESHOLD BREACH' : 'DATA PLANE · CANARY & OBSERVABILITY'}
              </span>
            </div>

            <div className="node-internals">
              {/* Pod 1: Canary Pod Workload */}
              <div className={`infra-card canary-pod-card ${traffic > 0 && !isFailed ? 'active-canary' : ''} ${isFailed ? 'failed-pod' : ''}`}>
                <div className="infra-card-head">
                  <span className={`infra-tag ${isPromoted ? 'teal' : isFailed ? 'red' : 'amber'}`}>
                    {isPromoted ? 'POD [PROMOTED]' : isFailed ? 'POD [REMOVED]' : 'CANARY WORKLOAD POD'}
                  </span>
                  <small>1/1 Ready · Envoy Sidecar</small>
                </div>
                <div className="infra-card-content">
                  <strong style={isFailed ? { color: '#ff7875' } : {}}>cafe-web-canary (v2)</strong>
                  <p>Release candidate: <code>cafe-web:v2.4.0</code></p>
                  <small>{isFailed ? 'Removed from traffic routing' : isPromoted ? 'Promoted to new primary revision' : 'Receives subset: canary traffic across CNI overlay'}</small>
                </div>
                <div className="infra-card-foot">
                  <span className={`foot-pulse ${isFailed ? 'red' : 'amber'}`} />
                  <span>Traffic: <b>{isPromoted ? '100%' : `${traffic}%`}</b></span>
                </div>
              </div>

              {/* Pod 2: Prometheus Server */}
              <div className="infra-card prometheus-card">
                <div className="infra-card-head">
                  <span className="infra-tag sky">PROMETHEUS POD</span>
                  <small>:9090 · In-Cluster TSDB</small>
                </div>
                <div className="infra-card-content">
                  <strong>Prometheus Server Pod</strong>
                  <p>Scrapes HTTP error rates &amp; p95 latency from Canary Envoy sidecar</p>
                  <div className="live-telemetry-metrics">
                    <div className="telemetry-item">
                      <span>Error Rate:</span>
                      <b className={errorRate > 1 ? 'metric-bad' : 'metric-good'}>{errorRate.toFixed(1)}%</b>
                    </div>
                    <div className="telemetry-item">
                      <span>p95 Latency:</span>
                      <b className={latency > 220 ? 'metric-bad' : 'metric-good'}>{latency}ms</b>
                    </div>
                  </div>
                </div>
                <div className="infra-card-foot">
                  <span className="foot-pulse sky" />
                  <span>Shares metrics with Flagger every 10s</span>
                </div>
              </div>

              {/* Pod 3: Flagger Controller Pod */}
              <div className={`infra-card flagger-operator-card ${isFailed ? 'failed-operator' : ''}`}>
                <div className="infra-card-head">
                  <span className={`infra-tag ${isFailed ? 'red' : 'amber'}`}>FLAGGER CONTROLLER POD</span>
                  <small>Operator Pod</small>
                </div>
                <div className="infra-card-content">
                  <strong style={isFailed ? { color: '#ff7875' } : {}}>Flagger Controller Pod</strong>
                  <p>Queries Prometheus and evaluates PromQL against SLO thresholds</p>
                  <div className={`flagger-status-pill ${isFailed ? 'bad' : 'good'}`}>
                    {isFailed
                      ? '⚠ Breached: Sending Rollback to VirtualService CRD'
                      : isPromoted
                      ? '✓ Promotion Complete: Promoted to Primary'
                      : traffic > 0
                      ? '✓ Metrics Healthy: Incrementing traffic weight'
                      : 'Waiting for canary traffic to start'}
                  </div>
                </div>
                <div className="infra-card-foot">
                  <span className={`foot-pulse ${isFailed ? 'red' : 'amber'}`} />
                  <span>Patches VirtualService CRD in Control Plane ▲</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
