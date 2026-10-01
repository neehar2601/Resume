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
    subtitle: 'Source Code & GitOps Repository',
    tool: 'GitHub',
    location: 'External Git',
    command: 'git tag -a v2.4.0 -m "Release v2.4.0" && git push origin v2.4.0',
    explanation: 'A developer pushes release tag v2.4.0 to GitHub. A webhook triggers the external Jenkins CI runner.',
  },
  {
    stage: 2,
    title: 'Jenkins CI: Docker Build & Test',
    subtitle: 'Continuous Integration Runner',
    tool: 'Jenkins',
    location: 'CI Pipeline',
    command: 'docker build -t docker.io/cafe/cafe-web:v2.4.0 . && npm test',
    explanation: 'Jenkins pulls code, runs test suites, and compiles the immutable Docker container image tagged with v2.4.0.',
  },
  {
    stage: 3,
    title: 'Docker Hub: Container Image Pushed',
    subtitle: 'Artifact Registry',
    tool: 'Docker Hub',
    location: 'Registry',
    command: 'docker push docker.io/cafe/cafe-web:v2.4.0',
    explanation: 'Jenkins pushes the tagged container image to Docker Hub so Kubernetes nodes can pull the new release.',
  },
  {
    stage: 4,
    title: 'Helm Chart: values.yaml Updated',
    subtitle: 'Kubernetes Package Manifest',
    tool: 'Helm',
    location: 'Helm Git Repo',
    command: 'sed -i "s/tag: .*/tag: v2.4.0/" charts/cafe-web/values.yaml && git commit -am "chore(helm): bump to v2.4.0" && git push',
    explanation: 'Jenkins updates the Helm chart values.yaml image tag to v2.4.0 and commits back to Git. Git remains the single source of truth.',
  },
  {
    stage: 5,
    title: 'Argo CD (on Kubernetes): Monitoring GitHub & Syncing Helm',
    subtitle: 'In-Cluster GitOps Controller',
    tool: 'Argo CD',
    location: 'Kubernetes (namespace: argocd)',
    command: 'argocd app sync cafe-web --prune',
    explanation: 'Argo CD sits inside Kubernetes continuously monitoring the GitHub Helm repo. It detects the values.yaml commit and applies the updated manifests to the cluster.',
  },
  {
    stage: 6,
    title: 'Kubernetes: Canary Pod Scheduled on Node 02',
    subtitle: 'Distributed Workload Runtime',
    tool: 'Kubernetes',
    location: 'Node 02 (worker-beta)',
    command: 'kubectl get pod -n sandbox -l app=cafe-web-canary -o wide',
    explanation: 'Argo CD sync creates the Canary Deployment. Kubernetes schedules Canary Pod (v2.4.0) with an injected Envoy sidecar onto Node 02 (worker-beta).',
  },
  {
    stage: 7,
    title: 'Istio Traffic Splitting: VirtualService & DestinationRule',
    subtitle: 'Service Mesh Ingress & Dynamic Routing',
    tool: 'Istio',
    location: 'Node 01 (worker-alpha)',
    command: 'kubectl get vs,dr -n sandbox cafe-web -o yaml',
    explanation: 'Istio splits traffic: Ingress Gateway forwards requests to VirtualService (weights: 90% primary, 10% canary) and DestinationRule (subsets: primary -> Node 01, canary -> Node 02 via CNI overlay).',
  },
  {
    stage: 8,
    title: 'Prometheus: Telemetry Scraping on Node 02',
    subtitle: 'Real-Time Observability & Metrics',
    tool: 'Prometheus',
    location: 'Node 02 (worker-beta)',
    command: 'sum(rate(istio_requests_total{response_code=~"5.*"}[1m])) / sum(rate(istio_requests_total[1m])) * 100',
    explanation: 'Prometheus on Node 02 scrapes metrics from the Canary Pod Envoy sidecar proxy, measuring 5xx error rate and p95 latency every 10 seconds.',
  },
  {
    stage: 9,
    title: 'Flagger Controller: Analyzing SLOs & Guiding Istio',
    subtitle: 'Autonomous Progressive Delivery Operator',
    tool: 'Flagger',
    location: 'Node 02 (worker-beta) -> Node 01 (worker-alpha)',
    command: 'kubectl describe canary cafe-web',
    explanation: 'Flagger on Node 02 queries Prometheus. Finding metrics healthy, Flagger sends routing updates to Istio VirtualService on Node 01, advancing traffic (+10%) toward 100%. If thresholds fail, it commands instant rollback.',
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
          <h3>GitOps & Progressive Delivery in Action</h3>
          <p>
            Experience the real architecture: <strong>Jenkins</strong> builds the container and updates Helm, <strong>Argo CD</strong> runs inside Kubernetes monitoring GitHub, <strong>Istio</strong> splits traffic via <code>VirtualService</code> &amp; <code>DestinationRule</code> across worker nodes, and <strong>Flagger</strong> feeds routing information back to Istio.
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
              ? 'ALERT: Prometheus metrics breached SLO thresholds (error-rate > 1% or latency > 220ms). Flagger on Node 02 sends an immediate rollback command to Istio VirtualService on Node 01: canary traffic is set to 0%, restoring 100% to stable primary.'
              : currentStageInfo.explanation}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. External CI/CD & Artifact Packaging Pipeline (Above the Cluster)        */}
      {/* ========================================================================= */}
      <div className="external-pipeline-strip">
        <div className="strip-title-bar">
          <span><i className="strip-dot amber" /> EXTERNAL CI/CD &amp; PACKAGING PIPELINE</span>
          <small>Automated Jenkins Build ➔ Docker Hub ➔ Helm Chart Repository</small>
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
            <small>Webhook triggered</small>
          </div>

          <div className={`pipe-arrow ${activeStage >= 1 ? 'lit' : ''}`}>➔</div>

          {/* Step 2: Jenkins */}
          <div className={`pipe-node ${activeStage === 1 ? 'active' : activeStage > 1 ? 'done' : ''}`}>
            <span className="pipe-node-badge amber">CI AUTOMATION</span>
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

      {/* ========================================================================= */}
      {/* 4. THE KUBERNETES CLUSTER (FRONT & CENTER INFRASTRUCTURE)                 */}
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
              ? 'Cluster Idle · Serving 100% Stable v1'
              : isFailed
              ? '⚠ Flagger Automated Rollback In Effect'
              : isPromoted
              ? 'Promotion Complete · 100% Stable (v2.4.0)'
              : traffic > 0
              ? `Canary Rollout: ${traffic}% (Node 02) / ${100 - traffic}% (Node 01)`
              : 'Reconciling Desired State'}
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* In-Cluster GitOps Subsystem: Argo CD sitting on Kubernetes              */}
        {/* ----------------------------------------------------------------------- */}
        <div className={`argocd-in-cluster-box ${activeStage === 4 || phase === 'sync' ? 'syncing' : ''}`}>
          <div className="argocd-cluster-header">
            <div className="argocd-brand">
              <span className="argocd-icon">🐙</span>
              <div>
                <strong>Argo CD GitOps Controller</strong>
                <small>Running on Kubernetes · <code>namespace: argocd</code></small>
              </div>
            </div>

            {/* Monitoring Link to GitHub Helm */}
            <div className="argocd-monitoring-channel">
              <div className="channel-flow">
                <span className="channel-arrow">▲</span>
                <span>Continuously Monitoring <code>GitHub: charts/cafe-web (values.yaml)</code></span>
                <span className="channel-arrow">▼</span>
              </div>
              <span className="argocd-sync-badge">
                {activeStage === 4 ? 'SYNCING DESIRED STATE...' : activeStage > 4 ? 'SYNCED ✓' : 'WATCHING FOR COMMITS'}
              </span>
            </div>
          </div>
          <div className="argocd-summary-bar">
            <span><b>Application:</b> cafe-web</span>
            <span><b>Target Cluster:</b> in-cluster</span>
            <span><b>Target Revision:</b> tag: v2.4.0</span>
            <span><b>Health:</b> {isFailed ? <b style={{ color: '#ff7875' }}>Degraded (Rollback)</b> : <b style={{ color: '#4fd1c5' }}>Healthy</b>}</span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* Multi-Node Worker Topology with Istio Traffic Splitting & Flagger       */}
        {/* ----------------------------------------------------------------------- */}
        <div className="cluster-nodes-topology">

          {/* ==================== NODE 01: worker-alpha ==================== */}
          <div className="worker-node-box node-01-edge">
            <div className="node-box-topbar">
              <div className="node-id-group">
                <span className="node-indicator-dot teal" />
                <strong>Node 01: worker-alpha</strong>
                <span className="node-ip">10.244.1.12</span>
              </div>
              <span className="node-role-pill">EDGE INGRESS &amp; BASELINE</span>
            </div>

            <div className="node-internals">
              {/* Component 1: Istio Ingress Gateway */}
              <div className="infra-card ingress-gw-card">
                <div className="infra-card-head">
                  <span className="infra-tag">INGRESS GATEWAY</span>
                  <small>istio-ingressgateway (:443)</small>
                </div>
                <div className="infra-card-content">
                  <div className="client-traffic-entry">
                    <span className="client-pulse">◉</span>
                    <strong>External User Requests</strong>
                    <code>GET /cafe-web</code>
                  </div>
                  <small>Entrypoint for all inbound HTTP/HTTPS traffic</small>
                </div>
                <div className="infra-card-foot">
                  <span>➔ passes traffic to VirtualService</span>
                </div>
              </div>

              {/* Component 2: Istio VirtualService & DestinationRule (Traffic Director) */}
              <div className={`infra-card istio-mesh-card ${traffic > 0 || isFailed ? 'active-mesh' : ''}`}>
                <div className="infra-card-head">
                  <span className="infra-tag amber">ISTIO TRAFFIC SPLITTING</span>
                  <small>VirtualService &amp; DestinationRule</small>
                </div>
                <div className="infra-card-content">
                  <strong>cafe-web-virtualservice</strong>
                  <div className="traffic-weights-meter">
                    <div className="meter-label">
                      <span>primary (stable v1): <b>{isPromoted ? '0%' : `${100 - traffic}%`}</b></span>
                      <span>canary (v2.4.0): <b>{isPromoted ? '100%' : `${traffic}%`}</b></span>
                    </div>
                    <div className="meter-bar-track">
                      <div className="meter-bar-stable" style={{ width: isPromoted ? '0%' : `${100 - traffic}%` }} />
                      <div className="meter-bar-canary" style={{ width: isPromoted ? '100%' : `${traffic}%` }} />
                    </div>
                  </div>

                  {/* DestinationRule Subsets */}
                  <div className="dest-rule-subsets">
                    <div className="subset-item">
                      <code>subset: primary</code> ➔ <span>labels: version=v1 (Node 01 local)</span>
                    </div>
                    <div className="subset-item">
                      <code>subset: canary</code> ➔ <span>labels: version=v2.4.0 (Node 02 via CNI)</span>
                    </div>
                  </div>
                </div>
                <div className="infra-card-foot">
                  <span className="foot-pulse amber" />
                  <span>Flagger controls weight patches in real-time</span>
                </div>
              </div>

              {/* Component 3: Stable Primary Pods */}
              <div className={`infra-card pod-card ${!isPromoted ? 'serving' : 'standby'}`}>
                <div className="infra-card-head">
                  <span className="infra-tag">STABLE WORKLOAD</span>
                  <small>2/2 Ready · Envoy Proxy</small>
                </div>
                <div className="infra-card-content">
                  <strong>cafe-web-primary (v1)</strong>
                  <p>Baseline image: <code>cafe-web:v2.3.0</code></p>
                  <small>{isPromoted ? 'Standby for next version' : 'Receives baseline production requests locally on Node 01'}</small>
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

            {/* Flagger to Istio Return Control Channel */}
            <div className={`flagger-to-istio-card ${traffic > 0 || isFailed ? 'signal-active' : ''} ${isFailed ? 'failed-signal' : ''}`}>
              <div className="flagger-signal-head">
                <span className="signal-arrow">◀</span>
                <strong>Flagger ➔ Istio Feedback</strong>
              </div>
              <p>
                {isFailed
                  ? '⚠ Rollback: Flagger commands VirtualService to set canary=0%, stable=100%'
                  : traffic > 0
                  ? 'Flagger sends weight update patch (+10%) to VirtualService'
                  : 'Flagger monitoring deployment CRD'}
              </p>
              <small>Dynamic reconciliation loop</small>
            </div>
          </div>

          {/* ==================== NODE 02: worker-beta ==================== */}
          <div className={`worker-node-box node-02-compute ${isFailed ? 'node-failed' : ''}`}>
            <div className="node-box-topbar">
              <div className="node-id-group">
                <span className={`node-indicator-dot ${isFailed ? 'red' : 'amber'}`} />
                <strong style={isFailed ? { color: '#ff7875' } : {}}>Node 02: worker-beta</strong>
                <span className="node-ip">10.244.2.35</span>
              </div>
              <span className={`node-role-pill ${isFailed ? 'red' : 'amber'}`}>
                {isFailed ? 'THRESHOLD BREACH' : 'CANARY & OBSERVABILITY'}
              </span>
            </div>

            <div className="node-internals">
              {/* Component 1: Canary Pod Workload */}
              <div className={`infra-card canary-pod-card ${traffic > 0 && !isFailed ? 'active-canary' : ''} ${isFailed ? 'failed-pod' : ''}`}>
                <div className="infra-card-head">
                  <span className={`infra-tag ${isPromoted ? 'teal' : isFailed ? 'red' : 'amber'}`}>
                    {isPromoted ? 'POD [PROMOTED]' : isFailed ? 'POD [REMOVED]' : 'CANARY WORKLOAD'}
                  </span>
                  <small>1/1 Ready · Envoy Sidecar</small>
                </div>
                <div className="infra-card-content">
                  <strong style={isFailed ? { color: '#ff7875' } : {}}>cafe-web-canary (v2)</strong>
                  <p>Release candidate: <code>cafe-web:v2.4.0</code></p>
                  <small>{isFailed ? 'Canary removed from serving path' : isPromoted ? 'Promoted to new primary revision' : 'Receiving live experimental traffic via CNI'}</small>
                </div>
                <div className="infra-card-foot">
                  <span className={`foot-pulse ${isFailed ? 'red' : 'amber'}`} />
                  <span>Traffic: <b>{isPromoted ? '100%' : `${traffic}%`}</b></span>
                </div>
              </div>

              {/* Component 2: Prometheus Server */}
              <div className="infra-card prometheus-card">
                <div className="infra-card-head">
                  <span className="infra-tag sky">PROMETHEUS SERVER</span>
                  <small>:9090 · In-Cluster TSDB</small>
                </div>
                <div className="infra-card-content">
                  <strong>Prometheus Scraping</strong>
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

              {/* Component 3: Flagger Controller */}
              <div className={`infra-card flagger-operator-card ${isFailed ? 'failed-operator' : ''}`}>
                <div className="infra-card-head">
                  <span className={`infra-tag ${isFailed ? 'red' : 'amber'}`}>FLAGGER CONTROLLER</span>
                  <small>Custom Resource Operator</small>
                </div>
                <div className="infra-card-content">
                  <strong style={isFailed ? { color: '#ff7875' } : {}}>Flagger Decision Loop</strong>
                  <p>Analyzes PromQL metrics against configured canary analysis thresholds</p>
                  <div className={`flagger-status-pill ${isFailed ? 'bad' : 'good'}`}>
                    {isFailed
                      ? '⚠ Breached: Sending Rollback Command to Istio'
                      : isPromoted
                      ? '✓ Promotion Complete: Promoted to Primary'
                      : traffic > 0
                      ? '✓ Metrics Healthy: Incrementing traffic weight'
                      : 'Waiting for canary traffic to start'}
                  </div>
                </div>
                <div className="infra-card-foot">
                  <span className={`foot-pulse ${isFailed ? 'red' : 'amber'}`} />
                  <span>Commands Istio VirtualService on Node 01 ➔</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
