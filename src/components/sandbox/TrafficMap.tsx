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
    title: 'GitHub: Release Tag v2.4.0',
    subtitle: 'Source Code & GitOps Repository',
    tool: 'GitHub',
    tier: 'Tier 1: CI/CD Pipeline',
    command: 'git tag -a v2.4.0 -m "Release v2.4.0" && git push origin v2.4.0',
    explanation: 'A developer or release coordinator pushes the new release tag v2.4.0 to GitHub. An automated webhook triggers the Jenkins CI pipeline.',
  },
  {
    stage: 2,
    title: 'Jenkins CI: Docker Build & Test',
    subtitle: 'Continuous Integration Runner',
    tool: 'Jenkins',
    tier: 'Tier 1: CI/CD Pipeline',
    command: 'docker build -t docker.io/cafe/cafe-web:v2.4.0 . && npm test',
    explanation: 'Jenkins pulls the source code, runs automated test suites, and compiles the immutable Docker container image tagged with v2.4.0.',
  },
  {
    stage: 3,
    title: 'Docker Hub: Registry Push',
    subtitle: 'Container Image Registry',
    tool: 'Docker Hub',
    tier: 'Tier 1: CI/CD Pipeline',
    command: 'docker push docker.io/cafe/cafe-web:v2.4.0',
    explanation: 'Jenkins authenticates and pushes the compiled container image to Docker Hub so it is immediately available for the Kubernetes cluster to pull.',
  },
  {
    stage: 4,
    title: 'Helm Chart: values.yaml Update',
    subtitle: 'Packaging & Release Manifests',
    tool: 'Helm',
    tier: 'Tier 1: CI/CD Pipeline',
    command: "sed -i \"s/tag: .*/tag: v2.4.0/\" values.yaml && git commit -am \"chore: bump v2.4.0\"",
    explanation: 'Jenkins updates the Helm chart repository values.yaml with the new image tag (v2.4.0) and commits the change. Git remains the single source of truth.',
  },
  {
    stage: 5,
    title: 'Argo CD: In-Cluster GitOps Sync',
    subtitle: 'GitOps Continuous Delivery',
    tool: 'Argo CD',
    tier: 'Tier 1: GitOps Controller',
    command: 'argocd app sync cafe-web --prune --timeout 60',
    explanation: 'Argo CD running inside the Kubernetes cluster detects the new commit in the Helm repository and reconciles the cluster to match the desired state.',
  },
  {
    stage: 6,
    title: 'Kubernetes: Canary Pod Scheduled on Node 02',
    subtitle: 'Distributed Workload Runtime',
    tool: 'Kubernetes',
    tier: 'Tier 2: Node 02 (worker-beta)',
    command: 'kubectl get pod -l app=cafe-web-canary -o wide',
    explanation: 'Kubernetes schedules the new Canary Pod (v2.4.0) with an injected Istio Envoy sidecar proxy onto Node 02 (worker-beta). Stable Pods remain on Node 01.',
  },
  {
    stage: 7,
    title: 'Istio Service Mesh: Traffic Routing Initiated',
    subtitle: 'Traffic Gateway & Dynamic Splitting',
    tool: 'Istio',
    tier: 'Tier 2: Node 01 (worker-alpha)',
    command: 'kubectl get virtualservice cafe-web -o yaml',
    explanation: 'Flagger instructs the Istio VirtualService on Node 01 to split incoming requests: 90% remains on Stable Pods (Node 01), while 10% is sent across the CNI overlay to Canary (Node 02).',
  },
  {
    stage: 8,
    title: 'Prometheus: Telemetry Scraping',
    subtitle: 'Real-Time Observability & SLOs',
    tool: 'Prometheus',
    tier: 'Tier 2: Node 02 (worker-beta)',
    command: 'sum(rate(istio_requests_total{response_code=~"5.*"}[1m])) / sum(rate(istio_requests_total[1m])) * 100',
    explanation: 'Prometheus on Node 02 continuously scrapes the Canary Pod Envoy sidecar proxy, measuring real-time 5xx error rate and p95 request duration.',
  },
  {
    stage: 9,
    title: 'Flagger Controller: Progressive Decision Loop',
    subtitle: 'Autonomous Release Operator',
    tool: 'Flagger',
    tier: 'Tier 2: Node 02 (worker-beta)',
    command: 'kubectl describe canary cafe-web',
    explanation: 'Flagger evaluates Prometheus metrics against SLOs. If healthy, it increments canary traffic (+10%) toward 100%. If thresholds are breached, it triggers an instant rollback to 100% Stable.',
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
    <div className="progressive-two-tier-canvas" style={{ marginTop: '2rem' }}>
      {/* --- Section Header & Interactive Controls --- */}
      <div className="two-tier-header">
        <div className="two-tier-title-group">
          <span className="control-label">progressive delivery architecture · two-tier view</span>
          <h3 style={{ margin: '4px 0 0', color: 'var(--text)', font: '700 16px var(--mono)' }}>
            Jenkins CI/CD Pipeline & Multi-Node Kubernetes Cluster
          </h3>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', font: '11px/1.6 var(--mono)', maxWidth: '880px' }}>
            Structured in two clean tiers: <strong>Tier 1</strong> shows how Jenkins compiles Docker images and updates Helm charts for Argo CD. <strong>Tier 2</strong> shows how Istio and Flagger distribute traffic across Kubernetes <code>Node 01</code> and <code>Node 02</code>.
          </p>
        </div>

        {/* Step-by-Step & Execution Controls */}
        <div className="two-tier-controls-bar">
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

      {/* --- Step-by-Step Explainer Card --- */}
      {currentStageInfo && (
        <div className="active-stage-card" style={{
          marginTop: '1.2rem',
          padding: '14px 18px',
          borderRadius: '10px',
          background: isFailed ? 'rgba(45, 15, 20, 0.85)' : 'rgba(12, 19, 28, 0.85)',
          border: `1.5px solid ${isFailed ? 'rgba(255, 77, 79, 0.5)' : 'rgba(79, 209, 197, 0.35)'}`,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`stage-step-pill ${isFailed ? 'failed' : ''}`}>
                STAGE 0{currentStageInfo.stage} / 09
              </span>
              <strong style={{ color: isFailed ? '#ff7875' : 'var(--text)', font: '700 13px var(--mono)' }}>
                {currentStageInfo.title}
              </strong>
              <span style={{ color: 'var(--faint)', font: '10px var(--mono)' }}>({currentStageInfo.tier})</span>
            </div>
            <code style={{
              color: isFailed ? '#ff7875' : '#ffc069',
              background: 'rgba(0, 0, 0, 0.45)',
              padding: '4px 10px',
              borderRadius: '6px',
              font: '10px var(--mono)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              {currentStageInfo.command}
            </code>
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', font: '11px/1.65 var(--mono)' }}>
            {isFailed
              ? 'ALERT: Prometheus telemetry breached error/latency thresholds. Flagger halts rollout and triggers instant rollback: canary traffic diverted 0%, stable v1 returns to 100%.'
              : currentStageInfo.explanation}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIER 1: CI/CD PACKAGING & GITOPS PIPELINE (HORIZONTAL LINEAR STRIP)      */}
      {/* ========================================================================= */}
      <div className="tier-section-block tier-1-block" style={{ marginTop: '1.5rem' }}>
        <div className="tier-badge-header cicd-tier-header">
          <div>
            <span className="tier-number-badge">TIER 1</span>
            <strong>CI / CD PACKAGING & GITOPS PIPELINE</strong>
            <small>· Source Code to Immutable Container & Versioned Helm Manifests</small>
          </div>
          <span className="tier-status-text">
            {activeStage <= 4 && activeStage >= 0 ? `Stage 0${activeStage + 1} Active` : activeStage > 4 ? 'Pipeline Complete ✓' : 'Standby'}
          </span>
        </div>

        <div className="tier-1-flow-grid">
          {/* Card 1: GitHub Repo */}
          <div className={`tier-card ${activeStage === 0 ? 'active' : activeStage > 0 ? 'completed' : ''}`}>
            <div className="tier-card-top">
              <span className="tier-card-badge">SOURCE GIT</span>
              <span className="tier-card-step">01</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-card-icon">⚙</div>
              <strong>GitHub Repo</strong>
              <p>tag: <code>v2.4.0</code></p>
              <small>Dispatches webhook</small>
            </div>
            <div className="tier-card-footer">
              <span className="tier-dot" /> webhook trigger
            </div>
          </div>

          <div className={`tier-arrow ${activeStage >= 1 ? 'lit' : ''}`}>➔</div>

          {/* Card 2: Jenkins CI */}
          <div className={`tier-card ${activeStage === 1 ? 'active' : activeStage > 1 ? 'completed' : ''}`}>
            <div className="tier-card-top">
              <span className="tier-card-badge amber">CI RUNNER</span>
              <span className="tier-card-step">02</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-card-icon">⚡</div>
              <strong>Jenkins CI</strong>
              <p><code>docker build</code></p>
              <small>Builds & runs unit tests</small>
            </div>
            <div className="tier-card-footer">
              <span className="tier-dot amber" /> compile artifact
            </div>
          </div>

          <div className={`tier-arrow ${activeStage >= 2 ? 'lit' : ''}`}>➔</div>

          {/* Card 3: Docker Hub */}
          <div className={`tier-card ${activeStage === 2 ? 'active' : activeStage > 2 ? 'completed' : ''}`}>
            <div className="tier-card-top">
              <span className="tier-card-badge amber">REGISTRY</span>
              <span className="tier-card-step">03</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-card-icon">▱</div>
              <strong>Docker Hub</strong>
              <p><code>docker push</code></p>
              <small>cafe-web:v2.4.0 tagged</small>
            </div>
            <div className="tier-card-footer">
              <span className="tier-dot amber" /> push to registry
            </div>
          </div>

          <div className={`tier-arrow ${activeStage >= 3 ? 'lit' : ''}`}>➔</div>

          {/* Card 4: Helm Chart */}
          <div className={`tier-card ${activeStage === 3 ? 'active' : activeStage > 3 ? 'completed' : ''}`}>
            <div className="tier-card-top">
              <span className="tier-card-badge teal">PACKAGING</span>
              <span className="tier-card-step">04</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-card-icon">⎈</div>
              <strong>Helm Chart</strong>
              <p><code>values.yaml</code></p>
              <small>Updates image tag v2.4.0</small>
            </div>
            <div className="tier-card-footer">
              <span className="tier-dot teal" /> git commit & push
            </div>
          </div>

          <div className={`tier-arrow ${activeStage >= 4 ? 'lit' : ''}`}>➔</div>

          {/* Card 5: Argo CD */}
          <div className={`tier-card ${activeStage === 4 ? 'active' : activeStage > 4 ? 'completed' : ''}`}>
            <div className="tier-card-top">
              <span className="tier-card-badge teal">GITOPS CD</span>
              <span className="tier-card-step">05</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-card-icon">🐙</div>
              <strong>Argo CD</strong>
              <p><code>GitOps Sync</code></p>
              <small>Pulls Helm into K8s cluster</small>
            </div>
            <div className="tier-card-footer">
              <span className="tier-dot teal" /> sync desired state
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: MULTI-NODE KUBERNETES CLUSTER (ISTIO + FLAGGER + PROMETHEUS)       */}
      {/* ========================================================================= */}
      <div className="tier-section-block tier-2-block" style={{ marginTop: '1.8rem' }}>
        <div className="tier-badge-header k8s-tier-header">
          <div>
            <span className="tier-number-badge k8s">TIER 2</span>
            <strong>KUBERNETES MULTI-NODE CLUSTER [k8s.cluster.local]</strong>
            <small>· Calico CNI (10.244.0.0/16) · Istio Ingress Gateway & Service Mesh · Flagger Operator</small>
          </div>
          <span className="tier-status-text">
            {phase === 'idle'
              ? 'Cluster Idle (100% Stable)'
              : isFailed
              ? '⚠ Automated Rollback Active'
              : isPromoted
              ? '100% Promoted (v2.4.0)'
              : traffic > 0
              ? `${traffic}% Canary / ${100 - traffic}% Stable`
              : 'Syncing Workload'}
          </span>
        </div>

        {/* Nodes Container Grid */}
        <div className="k8s-nodes-layout">
          {/* ----------------- Node 01: worker-alpha ----------------- */}
          <div className="k8s-node-container node-01">
            <div className="k8s-node-banner">
              <div className="k8s-node-title">
                <span className="k8s-node-dot" />
                <strong>Node 01: worker-alpha</strong>
                <span className="k8s-ip-badge">IP: 10.244.1.12</span>
              </div>
              <span className="k8s-role-tag">EDGE & BASELINE</span>
            </div>

            <div className="k8s-node-components">
              {/* Ingress Gateway Component */}
              <div className="node-component-card ingress-card">
                <div className="comp-head">
                  <span className="comp-badge">INGRESS GATEWAY</span>
                  <small>:443 / :80</small>
                </div>
                <div className="comp-body">
                  <strong>Istio Ingress Gateway</strong>
                  <p>Accepts external HTTPS requests from Users</p>
                </div>
                <div className="comp-flow-indicator">
                  <span className="comp-pulse-dot" /> external entrypoint
                </div>
              </div>

              {/* Istio VirtualService Component */}
              <div className={`node-component-card vs-card ${traffic > 0 || isFailed ? 'active' : ''}`}>
                <div className="comp-head">
                  <span className="comp-badge amber">MESH ROUTING</span>
                  <small>VirtualService</small>
                </div>
                <div className="comp-body">
                  <strong>cafe-web-virtualservice</strong>
                  <div className="weight-split-display">
                    <span className="weight-pill stable">
                      Node 01 (Stable): <b>{isPromoted ? '0%' : `${100 - traffic}%`}</b>
                    </span>
                    <span className="weight-pill canary">
                      Node 02 (Canary): <b>{isPromoted ? '100%' : `${traffic}%`}</b>
                    </span>
                  </div>
                </div>
                <div className="comp-flow-indicator">
                  <span className={`comp-pulse-dot ${traffic > 0 ? 'amber' : ''}`} /> dynamic traffic split
                </div>
              </div>

              {/* Stable Workload Component */}
              <div className={`node-component-card pod-card ${!isPromoted ? 'active' : 'standby'}`}>
                <div className="comp-head">
                  <span className="comp-badge">POD [STABLE]</span>
                  <small>2/2 Ready</small>
                </div>
                <div className="comp-body">
                  <strong>cafe-web-primary (v1)</strong>
                  <p>Baseline image: <code>cafe-web:v2.3.0</code></p>
                  <small>{isPromoted ? 'Standby for next release' : 'Receiving baseline production traffic'}</small>
                </div>
                <div className="comp-flow-indicator">
                  <span className="comp-pulse-dot" /> {isPromoted ? 'standby' : `${100 - traffic}% serving`}
                </div>
              </div>
            </div>
          </div>

          {/* ----------------- Central Inter-Node Bridge ----------------- */}
          <div className="cni-bridge-column">
            <div className="cni-bridge-box">
              <span className="cni-bridge-kicker">CALICO CNI OVERLAY</span>
              <strong>Cross-Node Tunnel</strong>
              <div className="cni-bridge-arrow">
                <span className="beam-arrow">➔</span>
                <span className="beam-label">{traffic}% Canary</span>
              </div>
              <small>10.244.1.12 ➔ 10.244.2.35</small>
            </div>

            {/* Flagger control feedback arrow */}
            <div className={`flagger-return-box ${traffic > 0 || isFailed ? 'active' : ''} ${isFailed ? 'failed' : ''}`}>
              <span className="return-arrow">◀</span>
              <div>
                <strong>Flagger Control Signal</strong>
                <small>{isFailed ? 'Rollback to 0%' : 'Weight adjustment (+10%)'}</small>
              </div>
            </div>
          </div>

          {/* ----------------- Node 02: worker-beta ----------------- */}
          <div className={`k8s-node-container node-02 ${isFailed ? 'node-failed' : ''}`}>
            <div className="k8s-node-banner">
              <div className="k8s-node-title">
                <span className={`k8s-node-dot ${isFailed ? 'failed' : 'amber'}`} />
                <strong style={isFailed ? { color: '#ff7875' } : {}}>Node 02: worker-beta</strong>
                <span className="k8s-ip-badge">IP: 10.244.2.35</span>
              </div>
              <span className={`k8s-role-tag ${isFailed ? 'failed' : 'amber'}`}>
                {isFailed ? 'THRESHOLD BREACH' : 'CANARY & TELEMETRY'}
              </span>
            </div>

            <div className="k8s-node-components">
              {/* Canary Workload Component */}
              <div className={`node-component-card canary-pod-card ${traffic > 0 && !isFailed ? 'active' : ''} ${isFailed ? 'failed' : ''}`}>
                <div className="comp-head">
                  <span className={`comp-badge ${isPromoted ? 'teal' : isFailed ? 'danger' : 'amber'}`}>
                    {isPromoted ? 'POD [PROMOTED]' : isFailed ? 'POD [REMOVED]' : 'POD [CANARY]'}
                  </span>
                  <small>1/1 + Envoy</small>
                </div>
                <div className="comp-body">
                  <strong style={isFailed ? { color: '#ff7875' } : {}}>cafe-web-canary (v2)</strong>
                  <p>Release candidate: <code>cafe-web:v2.4.0</code></p>
                  <small>{isFailed ? 'Removed from traffic routing' : isPromoted ? 'Promoted to stable primary' : 'Testing on real user traffic'}</small>
                </div>
                <div className="comp-flow-indicator">
                  <span className={`comp-pulse-dot ${isFailed ? 'danger' : 'amber'}`} />
                  {isFailed ? '0% (traffic halted)' : `${traffic}% receiving`}
                </div>
              </div>

              {/* Prometheus Component */}
              <div className="node-component-card prom-card">
                <div className="comp-head">
                  <span className="comp-badge sky">OBSERVABILITY</span>
                  <small>:9090</small>
                </div>
                <div className="comp-body">
                  <strong>Prometheus Server</strong>
                  <p>Scrapes Envoy sidecar metrics every 10s</p>
                  <div className="prom-live-telemetry">
                    <span>Errors: <b className={errorRate > 1 ? 'bad' : 'good'}>{errorRate.toFixed(1)}%</b></span>
                    <span>p95 Latency: <b className={latency > 220 ? 'bad' : 'good'}>{latency}ms</b></span>
                  </div>
                </div>
                <div className="comp-flow-indicator">
                  <span className="comp-pulse-dot sky" /> real-time telemetry scrape
                </div>
              </div>

              {/* Flagger Controller Component */}
              <div className={`node-component-card flagger-card ${isFailed ? 'failed' : ''}`}>
                <div className="comp-head">
                  <span className={`comp-badge ${isFailed ? 'danger' : 'amber'}`}>ANALYSIS OPERATOR</span>
                  <small>CRD Controller</small>
                </div>
                <div className="comp-body">
                  <strong style={isFailed ? { color: '#ff7875' } : {}}>Flagger Controller</strong>
                  <p>Evaluates PromQL error rate & latency against SLOs</p>
                  <div className="flagger-decision-pill">
                    {isFailed
                      ? '⚠ Rollback: Divert 0% Canary / 100% Stable'
                      : isPromoted
                      ? '✓ Promotion Complete: v2.4.0 is Primary'
                      : traffic > 0
                      ? '✓ Metrics Healthy: Increment weight (+10%)'
                      : 'Waiting for deployment triggers'}
                  </div>
                </div>
                <div className="comp-flow-indicator">
                  <span className={`comp-pulse-dot ${isFailed ? 'danger' : 'amber'}`} /> autonomous decision loop
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
