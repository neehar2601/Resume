import type { SandboxNode } from '../../types/sandbox'

const nodes: SandboxNode[] = [
  { id: 'github', name: 'GitHub', role: 'source', detail: 'tag v2.4.0 / Helm Git', group: 'delivery' },
  { id: 'jenkins', name: 'Jenkins', role: 'CI runner', detail: 'docker build + test', group: 'delivery' },
  { id: 'docker', name: 'Docker Hub', role: 'registry', detail: 'push cafe-web:v2.4.0', group: 'delivery' },
  { id: 'helm', name: 'Helm', role: 'package', detail: 'values.yaml tag bumped', group: 'delivery' },
  { id: 'argocd', name: 'Argo CD', role: 'GitOps CD', detail: 'pulls & syncs into K8s', group: 'delivery' },
  { id: 'istio', name: 'Istio', role: 'traffic (Node 01)', detail: 'route 90/10 → 100/0', group: 'platform' },
  { id: 'stable', name: 'Stable v1', role: 'pod (Node 01)', detail: 'baseline v2.3.0', group: 'platform' },
  { id: 'canary', name: 'Canary v2', role: 'pod (Node 02)', detail: 'candidate v2.4.0', group: 'platform' },
  { id: 'prom', name: 'Prometheus', role: 'metrics (Node 02)', detail: 'scrapes Envoy telemetry', group: 'observability' },
  { id: 'flagger', name: 'Flagger', role: 'operator (Node 02)', detail: 'evaluates & drives Istio', group: 'observability' },
  { id: 'k8s', name: 'Multi-Node K8s', role: 'cluster runtime', detail: 'worker-alpha & worker-beta', group: 'platform' },
]

export function ArchitectureDiagram({ activeNode, onSelect }: { activeNode: string | null; onSelect: (id: string) => void }) {
  const renderNode = (node: SandboxNode) => (
    <button
      key={node.id}
      className={`arch-box arch-${node.group} ${activeNode === node.id ? 'arch-selected' : ''}`}
      type="button"
      onClick={() => { onSelect(node.id); document.getElementById(`tech-${node.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
    >
      <span className="arch-box-kicker">{node.role}</span>
      <strong>{node.name}</strong>
      <small>{node.detail}</small>
    </button>
  )

  return (
    <div className="architecture-diagram">
      <div className="architecture-row delivery-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {nodes.slice(0, 5).map(renderNode)}
      </div>
      <div className="architecture-rail rail-delivery"><span>CI/CD build → packaging → GitOps sync to multi-node cluster</span></div>
      <div className="architecture-row split-row">
        <div className="arch-stack">
          {renderNode(nodes[5])}
          <div className="arch-down">↓</div>
          <div className="arch-service-pair">
            {renderNode(nodes[6])}
            {renderNode(nodes[7])}
          </div>
        </div>
        <div className="arch-control-column">
          {renderNode(nodes[10])}
          <div className="arch-down">↕</div>
          {renderNode(nodes[8])}
          <div className="arch-down">↓</div>
          {renderNode(nodes[9])}
        </div>
      </div>
      <div className="architecture-caption">
        Jenkins builds and pushes the Docker container and updates Helm charts. Argo CD syncs into the multi-node Kubernetes cluster. Istio shifts traffic between worker-alpha and worker-beta while Prometheus supplies telemetry to Flagger for evaluation.
      </div>
    </div>
  )
}
