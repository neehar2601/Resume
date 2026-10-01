import React, { useMemo } from 'react'
import type { SandboxPhase } from '../../types/sandbox'

interface TrafficMapProps {
  traffic: number
  phase?: SandboxPhase
  activeStage?: number
}

export function TrafficMap({ traffic, phase = 'idle', activeStage = -1 }: TrafficMapProps) {
  const isPromoted = traffic === 100 || phase === 'success'
  const isFailed = phase === 'failed' || phase === 'rollback' || phase === 'rolledBack'

  // Coordinates are mapped in a 1200 x 680 SVG canvas:
  // Left Section (CI/CD & Packaging): X 40 to 360, Y 160 to 620
  // Cluster Section (k8s.cluster.local): X 410 to 1170, Y 40 to 640
  // - Node 01 (worker-alpha): X 440 to 760, Y 160 to 620
  // - Node 02 (worker-beta):  X 820 to 1140, Y 160 to 620

  const nodes = [
    // External Traffic
    {
      id: 'users',
      x: 80,
      y: 90,
      title: 'Users / Clients',
      subtitle: 'HTTPS GET /cafe-web',
      badge: 'TRAFFIC',
      icon: '◉',
      accent: traffic > 0 || phase === 'idle' || isPromoted,
      group: 'external',
    },

    // CI/CD & Packaging Pipeline (Jenkins + Docker + Helm)
    {
      id: 'github',
      x: 120,
      y: 270,
      title: 'GitHub Repo',
      subtitle: 'tag: v2.4.0 / Helm Git',
      badge: 'SOURCE GIT',
      icon: '⚙',
      accent: activeStage === 0 || activeStage === 4,
      group: 'cicd',
    },
    {
      id: 'jenkins',
      x: 280,
      y: 270,
      title: 'Jenkins CI',
      subtitle: 'docker build -t v2.4.0',
      badge: 'CI RUNNER',
      icon: '⚡',
      accent: activeStage === 1,
      group: 'cicd',
    },
    {
      id: 'docker',
      x: 280,
      y: 420,
      title: 'Docker Hub',
      subtitle: 'cafe-web:v2.4.0 image',
      badge: 'REGISTRY',
      icon: '▱',
      accent: activeStage === 2,
      group: 'cicd',
    },
    {
      id: 'helm',
      x: 120,
      y: 420,
      title: 'Helm Chart',
      subtitle: 'values.yaml tag: v2.4.0',
      badge: 'PACKAGING',
      icon: '⎈',
      accent: activeStage === 3,
      group: 'cicd',
    },

    // Kubernetes In-Cluster GitOps Controller
    {
      id: 'argocd',
      x: 550,
      y: 130,
      title: 'Argo CD',
      subtitle: 'GitOps controller [in-cluster]',
      badge: 'GITOPS CD',
      icon: '🐙',
      accent: activeStage === 4 || phase === 'sync',
      group: 'k8s',
    },

    // Node 01: worker-alpha (IP: 10.244.1.12)
    {
      id: 'istio',
      x: 600,
      y: 285,
      title: 'Istio Ingress',
      subtitle: 'istio-ingressgateway (:443)',
      badge: 'INGRESS',
      icon: '↹',
      accent: traffic > 0 || isPromoted || phase === 'idle',
      group: 'node1',
    },
    {
      id: 'vs',
      x: 600,
      y: 410,
      title: 'VirtualService',
      subtitle: 'dynamic traffic weights',
      badge: 'MESH ROUTING',
      icon: '⇄',
      accent: traffic > 0 || isFailed,
      group: 'node1',
    },
    {
      id: 'stable',
      x: 600,
      y: 540,
      title: isPromoted ? 'Stable v1 (standby)' : 'Stable Pods (v1)',
      subtitle: isPromoted ? 'ready for next release' : 'baseline v2.3.0 (2/2 ready)',
      badge: 'POD [STABLE]',
      icon: '□',
      accent: !isPromoted && (traffic < 100 || isFailed),
      muted: isPromoted,
      group: 'node1',
    },

    // Node 02: worker-beta (IP: 10.244.2.35)
    {
      id: 'canary',
      x: 980,
      y: 285,
      title: isPromoted ? 'Stable Pod (v2.4.0)' : 'Canary Pod (v2.4.0)',
      subtitle: isPromoted ? 'promoted to production' : 'candidate + Envoy sidecar',
      badge: isPromoted ? 'POD [PROMOTED]' : 'POD [CANARY]',
      icon: '◈',
      accent: traffic > 0 && !isFailed,
      failed: isFailed && traffic === 0,
      group: 'node2',
    },
    {
      id: 'prom',
      x: 980,
      y: 410,
      title: 'Prometheus',
      subtitle: 'scrapes Envoy error/latency',
      badge: 'OBSERVABILITY',
      icon: '◴',
      accent: phase === 'canary' || phase === 'failed',
      group: 'node2',
    },
    {
      id: 'flagger',
      x: 980,
      y: 540,
      title: 'Flagger Controller',
      subtitle: 'progressive analysis operator',
      badge: 'CONTROL',
      icon: 'ƒ',
      accent: phase === 'canary' || phase === 'promoting' || isFailed,
      group: 'node2',
    },
  ]

  // Spline-eased visual paths connecting components
  const paths = useMemo(() => [
    // 1. External users to Istio Ingress
    {
      id: 'user-to-istio',
      d: 'M 140 90 C 320 90, 480 200, 545 260',
      label: 'HTTPS GET /cafe-web',
      labelX: 330,
      labelY: 140,
      tone: 'teal',
      duration: '2.4s',
      isWorking: phase === 'canary' || phase === 'promoting' || phase === 'success' || phase === 'idle' || isFailed,
    },

    // 2. GitHub commit triggers Jenkins
    {
      id: 'git-to-jenkins',
      d: 'M 175 270 L 225 270',
      label: 'webhook: tag v2.4.0',
      labelX: 200,
      labelY: 245,
      tone: 'amber',
      duration: '2.0s',
      isWorking: activeStage === 0 || activeStage === 1,
    },

    // 3. Jenkins builds & pushes Docker image
    {
      id: 'jenkins-to-docker',
      d: 'M 280 310 L 280 380',
      label: 'docker build & push',
      labelX: 345,
      labelY: 345,
      tone: 'amber',
      duration: '2.0s',
      isWorking: activeStage === 1 || activeStage === 2,
    },

    // 4. Jenkins updates Helm chart values.yaml
    {
      id: 'docker-to-helm',
      d: 'M 225 420 L 175 420',
      label: 'update values.yaml tag',
      labelX: 200,
      labelY: 445,
      tone: 'amber',
      duration: '2.0s',
      isWorking: activeStage === 2 || activeStage === 3,
    },

    // 5. Helm update committed back to GitHub repo
    {
      id: 'helm-to-git',
      d: 'M 120 380 L 120 310',
      label: 'git push (Helm repo)',
      labelX: 65,
      labelY: 345,
      tone: 'amber',
      duration: '2.0s',
      isWorking: activeStage === 3 || activeStage === 4,
    },

    // 6. Argo CD pulls updated Helm chart from GitHub
    {
      id: 'git-to-argocd',
      d: 'M 140 230 C 180 135, 340 135, 485 135',
      label: 'Argo CD GitOps Pull & Sync',
      labelX: 310,
      labelY: 110,
      tone: 'teal',
      duration: '2.8s',
      isWorking: activeStage === 4 || phase === 'sync',
    },

    // 7. Argo CD deploys Canary Pod v2.4.0 to Node 02
    {
      id: 'argocd-to-canary',
      d: 'M 615 135 C 750 135, 870 190, 925 260',
      label: 'Schedule Canary Pod v2.4.0 [Node 02]',
      labelX: 770,
      labelY: 170,
      tone: 'teal',
      duration: '2.8s',
      isWorking: activeStage === 4 || activeStage === 5 || phase === 'sync',
    },

    // 8. Istio Ingress -> VirtualService (on Node 01)
    {
      id: 'istio-to-vs',
      d: 'M 600 325 L 600 370',
      label: 'Ingress → VirtualService',
      labelX: 680,
      labelY: 345,
      tone: 'teal',
      duration: '2.0s',
      isWorking: traffic > 0 || isPromoted || phase === 'idle' || isFailed,
    },

    // 9. VirtualService -> Stable Pods (Node 01 local routing)
    {
      id: 'vs-to-stable',
      d: 'M 600 450 L 600 500',
      label: isPromoted ? '0% traffic (superseded)' : `${100 - traffic}% traffic (Node 01 local)`,
      labelX: 690,
      labelY: 475,
      tone: 'teal',
      duration: '2.5s',
      isWorking: traffic < 100 || isFailed,
    },

    // 10. VirtualService -> Canary Pod (CROSS-NODE CNI OVERLAY: Node 01 -> Node 02)
    {
      id: 'vs-to-canary',
      d: 'M 660 410 C 760 410, 840 300, 920 285',
      label: isPromoted ? '100% traffic (promoted baseline)' : `${traffic}% traffic [CNI Overlay: Node 01 → Node 02]`,
      labelX: 790,
      labelY: 345,
      tone: isPromoted ? 'teal' : 'amber',
      duration: '2.5s',
      isWorking: traffic > 0,
    },

    // 11. Prometheus scrapes Canary Pod metrics (Node 02 local)
    {
      id: 'canary-to-prom',
      d: 'M 980 325 L 980 370',
      label: 'Prometheus scrape: p95 & 5xx error rate',
      labelX: 1075,
      labelY: 345,
      tone: 'sky',
      duration: '2.2s',
      isWorking: phase === 'canary' || phase === 'failed',
    },

    // 12. Prometheus feeds telemetry to Flagger (Node 02 local)
    {
      id: 'prom-to-flagger',
      d: 'M 980 450 L 980 500',
      label: 'Flagger PromQL metric evaluation',
      labelX: 1070,
      labelY: 475,
      tone: 'sky',
      duration: '2.2s',
      isWorking: phase === 'canary' || phase === 'failed',
    },

    // 13. Flagger commands Istio VirtualService (CROSS-NODE CONTROL LOOP: Node 02 -> Node 01)
    {
      id: 'flagger-to-vs',
      d: 'M 920 550 C 800 600, 720 500, 660 435',
      label: isFailed
        ? '⚠ Flagger Rollback: divert 0% Canary / 100% Stable'
        : 'Flagger guides Istio: advance traffic weight (+10%)',
      labelX: 790,
      labelY: 550,
      tone: isFailed ? 'danger' : 'amber',
      duration: '3.0s',
      isWorking: (phase === 'canary' && traffic > 0) || isFailed || phase === 'promoting',
    },
  ], [traffic, phase, activeStage, isPromoted, isFailed])

  const activePaths = paths.filter((p) => p.isWorking)

  return (
    <div className="gallery-live-map progressive-cluster-map" style={{ marginTop: '2rem' }}>
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">end-to-end progressive delivery architecture</span>
          <strong>Jenkins CI/CD → Docker & Helm → GitOps Argo CD → Multi-Node K8s Cluster (Istio + Flagger + Prometheus)</strong>
          <p>
            Watch the complete pipeline: Jenkins compiles & packages <code>v2.4.0</code>, updates Helm <code>values.yaml</code>, Argo CD syncs into Kubernetes, and Flagger commands Istio traffic diversion across worker nodes while Prometheus evaluates real-time telemetry.
          </p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> stable / gitops flow</span>
          <span><i className="legend-dot amber" /> jenkins / canary diversion</span>
          <span><i className="legend-dot sky" /> prometheus telemetry</span>
          <span><i className="legend-dot danger" /> flagger rollback signal</span>
        </div>
      </div>

      <div className="gallery-live-map-canvas" style={{ minHeight: '700px', position: 'relative' }}>
        <div className="gallery-grid-overlay" />

        {/* --- Visual Boundary Box: CI / CD Pipeline (Left) --- */}
        <div
          className="cluster-boundary-box cicd-boundary"
          style={{
            position: 'absolute',
            left: '2.5%',
            top: '23%',
            width: '28%',
            height: '73%',
            border: '1px solid rgba(232, 163, 61, 0.3)',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, rgba(232, 163, 61, 0.04), rgba(12, 18, 25, 0.85))',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <div className="boundary-badge-bar cicd-badge-bar">
            <span className="boundary-title">
              <i className="boundary-dot amber" /> CI / CD PIPELINE
            </span>
            <span className="boundary-meta">Jenkins · Docker Hub · Helm</span>
          </div>
          <div className="cicd-pipeline-callout">
            <code>1. docker build -t app:v2.4.0</code>
            <code>2. docker push to registry</code>
            <code>3. update values.yaml tag</code>
          </div>
        </div>

        {/* --- Visual Boundary Box: Kubernetes Multi-Node Cluster (Right) --- */}
        <div
          className="cluster-boundary-box k8s-cluster-boundary"
          style={{
            position: 'absolute',
            left: '33%',
            top: '4.5%',
            width: '65.5%',
            height: '91.5%',
            border: '1.5px solid rgba(79, 209, 197, 0.35)',
            borderRadius: '16px',
            background: 'linear-gradient(180deg, rgba(10, 20, 28, 0.95), rgba(6, 12, 18, 0.98))',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(79, 209, 197, 0.03)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <div className="boundary-badge-bar k8s-badge-bar">
            <span className="boundary-title">
              <i className="boundary-dot teal" /> KUBERNETES CLUSTER [k8s.cluster.local]
            </span>
            <span className="boundary-meta">Calico CNI (10.244.0.0/16) · 2 Nodes Ready · Istio Service Mesh</span>
          </div>
        </div>

        {/* --- Sub-Container: Node 01 (worker-alpha) --- */}
        <div
          className="cluster-node-box node-01-box"
          style={{
            position: 'absolute',
            left: '35%',
            top: '23%',
            width: '30%',
            height: '69%',
            border: '1px solid rgba(79, 209, 197, 0.25)',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, rgba(14, 25, 34, 0.75), rgba(8, 14, 20, 0.85))',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <div className="node-box-header">
            <div className="node-box-title">
              <strong>Node 01: worker-alpha</strong>
              <small>IP: 10.244.1.12 · Ingress & Baseline</small>
            </div>
            <span className="node-status-pill">Ready</span>
          </div>
        </div>

        {/* --- Sub-Container: Node 02 (worker-beta) --- */}
        <div
          className="cluster-node-box node-02-box"
          style={{
            position: 'absolute',
            left: '67%',
            top: '23%',
            width: '30%',
            height: '69%',
            border: `1px solid ${isFailed ? 'rgba(255, 77, 79, 0.4)' : 'rgba(232, 163, 61, 0.28)'}`,
            borderRadius: '12px',
            background: isFailed
              ? 'linear-gradient(180deg, rgba(40, 15, 20, 0.75), rgba(15, 8, 10, 0.85))'
              : 'linear-gradient(180deg, rgba(20, 24, 30, 0.75), rgba(8, 14, 20, 0.85))',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <div className="node-box-header">
            <div className="node-box-title">
              <strong style={isFailed ? { color: '#ff7875' } : {}}>Node 02: worker-beta</strong>
              <small>IP: 10.244.2.35 · Canary & Observability</small>
            </div>
            <span className={`node-status-pill ${isFailed ? 'failed' : ''}`}>{isFailed ? 'Threshold Alert' : 'Ready'}</span>
          </div>
        </div>

        {/* --- SVG Flow Paths --- */}
        <svg className="gallery-flow-svg" viewBox="0 0 1200 680" role="img" aria-label="End-to-End Progressive Delivery Flow">
          <defs>
            <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {paths.map((flow) => (
              <path key={`def-${flow.id}`} id={`path-${flow.id}`} d={flow.d} />
            ))}
          </defs>

          {/* Faint static topology background lines */}
          {paths.map((flow) => (
            <path
              key={`bg-${flow.id}`}
              d={flow.d}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              fill="none"
            />
          ))}

          {/* Active animated paths with smooth packet motion */}
          {activePaths.map((flow) => (
            <g key={`active-${flow.id}`}>
              <path
                d={flow.d}
                className={`gallery-path gallery-path-${flow.tone}`}
                fill="none"
                strokeWidth={flow.tone === 'danger' ? '3' : '2.5'}
              />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" fill="none" />

              {/* Glowing outer halo packet */}
              <circle r="7.5" className={`gallery-packet gallery-packet-${flow.tone}`} opacity="0.35" filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  repeatCount="indefinite"
                  path={flow.d}
                  calcMode="spline"
                  keyTimes="0; 1"
                  keySplines="0.42 0 0.58 1"
                />
              </circle>
              {/* Inner crisp packet */}
              <circle r="4.5" className={`gallery-packet gallery-packet-${flow.tone}`} filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  repeatCount="indefinite"
                  path={flow.d}
                  calcMode="spline"
                  keyTimes="0; 1"
                  keySplines="0.42 0 0.58 1"
                />
              </circle>
            </g>
          ))}
        </svg>

        {/* --- Floating Badges for Active Connections (Guaranteed Readable & Non-Overlapping) --- */}
        {activePaths.map((flow) => (
          <div
            key={`badge-${flow.id}`}
            style={{
              position: 'absolute',
              left: `${(flow.labelX / 1200) * 100}%`,
              top: `${(flow.labelY / 680) * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'rgba(8, 14, 22, 0.95)',
              border: `1.5px solid ${
                flow.tone === 'danger'
                  ? 'rgba(255, 77, 79, 0.85)'
                  : flow.tone === 'amber'
                  ? 'rgba(232, 163, 61, 0.85)'
                  : flow.tone === 'sky'
                  ? 'rgba(56, 189, 248, 0.85)'
                  : 'rgba(79, 209, 197, 0.85)'
              }`,
              boxShadow: `0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px ${
                flow.tone === 'danger'
                  ? 'rgba(255, 77, 79, 0.3)'
                  : flow.tone === 'amber'
                  ? 'rgba(232, 163, 61, 0.3)'
                  : flow.tone === 'sky'
                  ? 'rgba(56, 189, 248, 0.3)'
                  : 'rgba(79, 209, 197, 0.3)'
              }`,
              color:
                flow.tone === 'danger'
                  ? '#ff7875'
                  : flow.tone === 'amber'
                  ? '#ffc069'
                  : flow.tone === 'sky'
                  ? '#7dd3fc'
                  : '#5cdbd3',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
              pointerEvents: 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {flow.label}
          </div>
        ))}

        {/* --- Architecture Component Node Blocks --- */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node progressive-node ${node.accent ? 'accent' : ''} ${node.muted ? 'muted' : ''} ${node.failed ? 'failed-node' : ''}`}
            style={{
              left: `${(node.x / 1200) * 100}%`,
              top: `${(node.y / 680) * 100}%`,
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              zIndex: 10,
              minWidth: node.id === 'users' ? '120px' : '135px',
            }}
          >
            <span
              className="gallery-live-node-badge"
              style={node.failed ? { color: '#ff4d4f', borderBottomColor: '#ff4d4f' } : {}}
            >
              {node.badge}
            </span>
            <div
              className="gallery-live-node-icon"
              style={node.failed ? { color: '#ff4d4f', borderColor: '#ff4d4f' } : {}}
            >
              {node.icon}
            </div>
            <strong style={node.failed ? { color: '#ff4d4f' } : {}}>{node.title}</strong>
            <small>{node.subtitle}</small>
          </div>
        ))}

        {/* --- Live Flow Footer Status Bar --- */}
        <div className="gallery-live-flow-status">
          <span
            className="live-pulse"
            style={isFailed ? { background: '#ff4d4f', boxShadow: '0 0 10px rgba(255, 77, 79, 0.5)' } : {}}
          />
          {phase === 'idle'
            ? 'cluster idle — ready to deploy v2.4.0'
            : phase === 'build'
            ? `Jenkins CI executing stage: ${activeStage === 0 ? 'GitHub Tag Trigger' : activeStage === 1 ? 'Docker Build (v2.4.0)' : activeStage === 2 ? 'Docker Registry Push' : 'Updating Helm values.yaml'}`
            : phase === 'sync'
            ? 'Argo CD pulling Helm updates from GitHub → scheduling Canary Pod on Node 02'
            : phase === 'canary'
            ? `canary progressive rollout: Istio routing ${traffic}% to Node 02, ${100 - traffic}% to Node 01`
            : phase === 'promoting'
            ? 'telemetry validated — Flagger promoting Canary v2.4.0 to primary baseline'
            : phase === 'success'
            ? 'promotion complete: v2.4.0 is now the stable production revision'
            : isFailed
            ? `automated rollback active: Flagger detected threshold breach → diverting 0% Canary / 100% Stable v1`
            : 'mesh routing active'}
          <b>·</b>
          {isPromoted
            ? '100% Stable (v2.4.0)'
            : isFailed
            ? 'Rollback → 100% Stable (v1)'
            : traffic > 0
            ? `${traffic}% Canary (Node 02) / ${100 - traffic}% Stable (Node 01)`
            : '100% Stable (Node 01)'}
        </div>
      </div>
    </div>
  )
}
