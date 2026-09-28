const nodes = [
  ['GitHub', 'commit'],
  ['Jenkins', 'build'],
  ['Helm', 'package'],
  ['Argo CD', 'sync'],
  ['Kubernetes', 'deploy'],
  ['Istio', 'route'],
  ['Prometheus', 'observe'],
  ['Flagger', 'decide'],
]

export function SystemMap() {
  return (
    <div className="system-card" aria-label="Interactive system path preview">
      <div className="system-card-head">
        <span className="system-label">live system map / preview</span>
        <span className="system-status">● sandbox online</span>
      </div>
      <div className="system-flow">
        {nodes.map(([name, action], index) => (
          <div className="system-node-wrap" key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="system-node">
              <strong>{name}</strong>
              <small>{action}</small>
            </div>
            {index < nodes.length - 1 && <span className="flow-arrow">→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
