import React from 'react'

export function TrafficMap({ traffic }: { traffic: number }) {
  const isPromoted = traffic === 100

  const nodes = [
    { id: 'user', x: 50, y: 200, title: 'Users', subtitle: 'external requests', badge: 'TRAFFIC' },
    { id: 'istio', x: 250, y: 200, title: 'Istio', subtitle: 'ingress gateway', accent: true, badge: 'MESH' },
    {
      id: 'stable',
      x: 500,
      y: 100,
      title: isPromoted ? 'Canary slot' : 'Stable v1',
      subtitle: isPromoted ? 'waiting for next deployment' : 'baseline deployment',
      badge: 'PODS',
      muted: isPromoted,
    },
    {
      id: 'canary',
      x: 500,
      y: 300,
      title: isPromoted ? 'Stable v2' : 'Canary v2',
      subtitle: isPromoted ? 'promoted deployment' : 'candidate deployment',
      badge: 'PODS',
      accent: traffic > 0 && traffic < 100,
    },
    { id: 'prom', x: 800, y: 100, title: 'Prometheus', subtitle: 'metric scraping', badge: 'OBSERVE' },
    { id: 'flagger', x: 800, y: 300, title: 'Flagger', subtitle: 'analysis + routing', badge: 'CONTROL' },
  ]

  const paths = [
    { id: 'inbound', d: 'M120 200 L230 200', label: 'inbound HTTP', labelX: 175, labelY: 180, tone: 'teal', duration: '2.0s', delay: '0s', active: true },
    { id: 'to-stable', d: 'M270 185 C320 185 400 115 450 115', label: isPromoted ? '' : `${100 - traffic}% to v1`, labelX: 370, labelY: 135, tone: 'teal', duration: '2.5s', delay: '-1.0s', active: traffic < 100 },
    { id: 'to-canary', d: 'M270 215 C320 215 400 285 450 285', label: isPromoted ? '100% to v2' : `${traffic}% to v2`, labelX: 370, labelY: 265, tone: isPromoted ? 'teal' : 'amber', duration: '2.5s', delay: '-0.5s', active: traffic > 0 },
    { id: 'scrape1', d: 'M550 100 L750 100', label: 'scrape telemetry', labelX: 650, labelY: 80, tone: 'sky', duration: '2.5s', delay: '0s', active: !isPromoted },
    { id: 'scrape2', d: 'M550 285 C620 285 680 115 750 115', label: 'scrape telemetry', labelX: 650, labelY: 210, tone: 'sky', duration: '2.5s', delay: '-1.2s', active: traffic > 0 },
    { id: 'query', d: 'M800 140 L800 260', label: 'evaluate PromQL', labelX: 865, labelY: 200, tone: 'amber', duration: '2.0s', delay: '-0.5s', active: traffic > 0 && traffic < 100 },
    { id: 'control', d: 'M780 320 C650 420 400 420 250 230', label: 'update VirtualService', labelX: 520, labelY: 415, tone: 'amber', duration: '3.5s', delay: '-1.0s', active: traffic > 0 && traffic < 100 },
  ]

  const activePaths = paths.filter((p) => p.active)

  return (
    <div className="gallery-live-map" style={{ marginTop: '2rem' }}>
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">live traffic map</span>
          <strong>Istio Traffic Splitting Demo</strong>
          <p>The mesh routes incoming requests dynamically based on the current rollout phase.</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> stable flow</span>
          <span><i className="legend-dot amber" /> canary / control flow</span>
          <span><i className="legend-dot sky" /> telemetry scrape</span>
        </div>
      </div>

      <div className="gallery-live-map-canvas" style={{ minHeight: '440px', position: 'relative' }}>
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 450" role="img" aria-label="Live traffic routing">
          <defs>
            <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {paths.map((flow) => (
              <path key={`def-${flow.id}`} id={`path-${flow.id}`} d={flow.d} />
            ))}
          </defs>

          {/* Faint static dashed topology paths */}
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

          {/* Active moving packets */}
          {activePaths.map((flow) => (
            <g key={flow.id}>
              <path d={flow.d} className={`gallery-path gallery-path-${flow.tone}`} />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" />
              <circle r="4.5" className={`gallery-packet gallery-packet-${flow.tone}`} filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  begin={flow.delay}
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

        {/* Floating readable labels */}
        {activePaths.filter((p) => p.label).map((flow) => (
          <div
            key={`label-${flow.id}`}
            style={{
              position: 'absolute',
              left: `${flow.labelX / 10}%`,
              top: `${flow.labelY / 4.5}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(8, 14, 22, 0.92)',
              border: `1px solid ${flow.tone === 'amber' ? 'rgba(232, 163, 61, 0.6)' : flow.tone === 'sky' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(79, 209, 197, 0.6)'}`,
              color: flow.tone === 'amber' ? '#ffc069' : flow.tone === 'sky' ? '#7dd3fc' : '#5cdbd3',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {flow.label}
          </div>
        ))}

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${(node as any).muted ? 'muted' : ''}`}
            style={{ left: `${node.x / 10}%`, top: `${node.y / 4.5}%`, transform: 'translate(-50%, -50%)', position: 'absolute', zIndex: 10 }}
          >
            <span className="gallery-live-node-badge">{node.badge}</span>
            <div className="gallery-live-node-icon">
              {node.id === 'user' ? '◉' : node.id === 'istio' ? '↹' : node.id === 'prom' ? '◴' : node.id === 'flagger' ? 'ƒ' : '□'}
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
