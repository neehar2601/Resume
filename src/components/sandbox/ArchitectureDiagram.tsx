import type { SandboxNode } from '../../types/sandbox'

const nodes: SandboxNode[] = [
  { id: 'github', name: 'GitHub', role: 'source', detail: 'commit / pull request', group: 'delivery' },
  { id: 'jenkins', name: 'Jenkins', role: 'CI', detail: 'build + test + image', group: 'delivery' },
  { id: 'helm', name: 'Helm', role: 'package', detail: 'release manifest', group: 'delivery' },
  { id: 'argocd', name: 'Argo CD', role: 'CD', detail: 'desired state sync', group: 'delivery' },
  { id: 'istio', name: 'Istio', role: 'traffic', detail: 'route 90/10 → 100/0', group: 'platform' },
  { id: 'stable', name: 'Stable v1', role: 'service', detail: 'known-good revision', group: 'platform' },
  { id: 'canary', name: 'Canary v2', role: 'service', detail: 'candidate revision', group: 'platform' },
  { id: 'prom', name: 'Prometheus', role: 'metrics', detail: 'error + latency', group: 'observability' },
  { id: 'flagger', name: 'Flagger', role: 'analysis', detail: 'promote or rollback', group: 'observability' },
  { id: 'k8s', name: 'Kubernetes', role: 'control plane', detail: 'deployments + services', group: 'platform' },
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
      <div className="architecture-row delivery-row">
        {nodes.slice(0, 4).map(renderNode)}
      </div>
      <div className="architecture-rail rail-delivery"><span>desired state / release path</span></div>
      <div className="architecture-row split-row">
        <div className="arch-stack">
          {renderNode(nodes[4])}
          <div className="arch-down">↓</div>
          <div className="arch-service-pair">
            {renderNode(nodes[5])}
            {renderNode(nodes[6])}
          </div>
        </div>
        <div className="arch-control-column">
          {renderNode(nodes[9])}
          <div className="arch-down">↕</div>
          {renderNode(nodes[7])}
          <div className="arch-down">↓</div>
          {renderNode(nodes[8])}
        </div>
      </div>
      <div className="architecture-caption">
        Traffic is shifted by Istio while Prometheus supplies signals to Flagger. The sandbox visualizes the decision loop without connecting to a live cluster.
      </div>
    </div>
  )
}
