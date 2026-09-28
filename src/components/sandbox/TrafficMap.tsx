import React from 'react'

export function TrafficMap({ traffic }: { traffic: number }) {
  const isPromoted = traffic === 100;

  const nodes = [
    { id: 'user', x: 50, y: 200, title: 'Users', subtitle: 'external requests', badge: 'TRAFFIC' },
    { id: 'istio', x: 250, y: 200, title: 'Istio', subtitle: 'ingress gateway', accent: true, badge: 'MESH' },
    { 
      id: 'stable', x: 550, y: 100, 
      title: isPromoted ? 'Canary slot' : 'Stable v1', 
      subtitle: isPromoted ? 'waiting for next deployment' : 'baseline deployment', 
      badge: 'PODS',
      muted: isPromoted
    },
    { 
      id: 'canary', x: 550, y: 300, 
      title: isPromoted ? 'Stable v2' : 'Canary v2', 
      subtitle: isPromoted ? 'promoted deployment' : 'candidate deployment', 
      badge: 'PODS', 
      accent: traffic > 0 && traffic < 100 
    },
    { id: 'flagger', x: 850, y: 200, title: 'Flagger', subtitle: 'analysis + routing', badge: 'CONTROL' },
  ]
  
  const paths = [
    { id: 'inbound', d: 'M120 200 L230 200', label: 'inbound HTTP', tone: 'teal', duration: '2.0s', delay: '0s', active: true },
    { id: 'to-stable', d: 'M270 185 C350 185 450 115 530 115', label: isPromoted ? '' : `${100 - traffic}% to v1`, tone: 'teal', duration: '2.5s', delay: '-1.0s', active: traffic < 100 },
    { id: 'to-canary', d: 'M270 215 C350 215 450 285 530 285', label: isPromoted ? '100% to v2' : `${traffic}% to v2`, tone: isPromoted ? 'teal' : 'amber', duration: '2.5s', delay: '-0.5s', active: traffic > 0 },
    { id: 'prom1', d: 'M570 100 C670 100 750 185 830 185', label: 'telemetry', tone: 'muted', duration: '3.0s', delay: '0s', active: !isPromoted },
    { id: 'prom2', d: 'M570 300 C670 300 750 215 830 215', label: 'telemetry', tone: 'muted', duration: '3.0s', delay: '-1.5s', active: traffic > 0 },
    { id: 'control', d: 'M830 230 C700 350 400 350 270 230', label: 'update weight', tone: 'amber', duration: '4.0s', delay: '-2.0s', active: traffic > 0 && traffic < 100 },
  ]

  return (
    <div className="gallery-live-map" style={{ marginTop: '2rem' }}>
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">live traffic map</span>
          <strong>Istio Traffic Splitting</strong>
          <p>The mesh routes incoming requests dynamically based on the current rollout phase.</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> stable flow</span>
          <span><i className="legend-dot amber" /> canary / control flow</span>
        </div>
      </div>
      
      <div className="gallery-live-map-canvas" style={{ minHeight: '380px' }}>
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 400" role="img" aria-label="Live traffic routing">
          <defs>
            <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {paths.filter(p => p.active).map((flow) => (
              <path key={`def-${flow.id}`} id={`path-${flow.id}`} d={flow.d} />
            ))}
          </defs>

          {paths.filter(p => p.active).map((flow) => (
            <g key={flow.id}>
              <path d={flow.d} className={`gallery-path gallery-path-${flow.tone}`} />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" />
              <circle r="4.5" className={`gallery-packet gallery-packet-${flow.tone}`} filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  begin={flow.delay}
                  repeatCount="indefinite"
                  path={flow.d}
                />
              </circle>
            </g>
          ))}
          {paths.filter(p => p.active).map((flow) => (
             <text key={`label-${flow.id}`} style={{ fill: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}>
               <textPath href={`#path-${flow.id}`} startOffset="50%" textAnchor="middle">
                 {flow.label}
               </textPath>
             </text>
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${(node as any).muted ? 'muted' : ''}`}
            style={{ left: `${node.x / 10}%`, top: `${node.y / 4}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
          >
            <span className="gallery-live-node-badge">{node.badge}</span>
            <div className="gallery-live-node-icon">
               {node.id === 'user' ? '◉' : node.id === 'istio' ? '↹' : node.id === 'flagger' ? 'ƒ' : '□'}
            </div>
            <strong>{node.title}</strong>
            <small>{node.subtitle}</small>
          </div>
        ))}

        <div className="gallery-live-flow-status">
          <span className="live-pulse" />
          {isPromoted ? 'promotion complete' : 'mesh routing is active'}
          <b>·</b>
          {isPromoted ? '100% Stable (v2)' : (traffic > 0 ? `${traffic}% Canary` : '100% Stable')}
        </div>
      </div>
    </div>
  )
}
