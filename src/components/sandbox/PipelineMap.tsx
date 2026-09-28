import React from 'react'

export function PipelineMap({ activeIndex, deployState }: { activeIndex: number; deployState: string }) {
  const isFailed = deployState === 'failed'

  const nodes = [
    { id: 'github', x: 150, y: 150, title: 'GitHub', subtitle: 'development branch', badge: 'SOURCE', active: activeIndex >= 0 },
    { id: 'actions', x: 400, y: 150, title: 'Actions Runner', subtitle: 'ubuntu-latest', badge: 'CI', active: activeIndex >= 1, accent: true },
    { id: 's3test', x: 650, y: 150, title: 'S3 (Test)', subtitle: 'devops-learner', badge: 'STORAGE', active: activeIndex >= 2 },
    { id: 'e2e', x: 900, y: 150, title: 'Playwright', subtitle: 'E2E suite', badge: 'TEST', active: activeIndex >= 3, failed: isFailed && activeIndex === 3 },
    { id: 's3prod', x: 900, y: 350, title: 'S3 (Prod)', subtitle: 'devopslearnercorner.org', badge: 'STORAGE', active: activeIndex >= 4 },
    { id: 'cf', x: 650, y: 350, title: 'CloudFront', subtitle: 'CDN cache', badge: 'DELIVERY', active: activeIndex >= 5 },
    { id: 'live', x: 400, y: 350, title: 'Users', subtitle: 'HTTPS traffic', badge: 'TRAFFIC', active: activeIndex >= 6 },
  ]

  const paths = [
    // 0: Push
    { id: 'push', d: 'M200 150 L350 150', label: 'push', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 0 },
    // 1: Actions -> S3 Test
    { id: 'deploy-test', d: 'M450 150 L600 150', label: 'aws s3 sync', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 2 },
    // 2: S3 Test -> Playwright
    { id: 'run-e2e', d: 'M700 150 L850 150', label: 'npx playwright test', tone: isFailed ? 'danger' : 'amber', duration: '2.0s', delay: '0s', active: activeIndex >= 3 },
    // 3: Playwright -> S3 Prod (Downwards)
    { id: 'deploy-prod', d: 'M900 200 L900 300', label: 'aws s3 sync (prod)', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 4 && !isFailed },
    // 4: S3 Prod -> CloudFront (Leftwards)
    { id: 'invalidate', d: 'M850 350 L700 350', label: 'invalidate /*', tone: 'amber', duration: '2.0s', delay: '0s', active: activeIndex >= 5 && !isFailed },
    // 5: CloudFront -> Users (Leftwards)
    { id: 'serve', d: 'M600 350 L450 350', label: 'HTTPS live', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 6 && !isFailed },
  ]

  return (
    <div className="gallery-live-map" style={{ marginTop: '2rem' }}>
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">pipeline architecture map</span>
          <strong>CI/CD Workflow Execution</strong>
          <p>Visually tracking the artifact from source code to production delivery.</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> deployment flow</span>
          <span><i className="legend-dot amber" /> test / control flow</span>
        </div>
      </div>
      
      <div className="gallery-live-map-canvas" style={{ minHeight: '480px' }}>
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 500" role="img" aria-label="Pipeline routing map">
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
                  repeatCount={isFailed && flow.id === 'run-e2e' ? '2' : 'indefinite'}
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
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${!node.active ? 'muted' : ''} ${(node as any).failed ? 'failed-node' : ''}`}
            style={{ left: `${node.x / 10}%`, top: `${node.y / 5}%`, transform: 'translate(-50%, -50%)', position: 'absolute', zIndex: 10 }}
          >
            <span className="gallery-live-node-badge" style={(node as any).failed ? { color: '#ff4d4f', borderBottomColor: '#ff4d4f' } : {}}>{node.badge}</span>
            <div className="gallery-live-node-icon" style={(node as any).failed ? { color: '#ff4d4f' } : {}}>
               {node.id === 'github' ? '◆' : node.id === 'actions' ? '⚙' : node.id === 'e2e' ? '⚡' : node.id === 'cf' ? '↯' : node.id === 'live' ? '◉' : '▱'}
            </div>
            <strong style={(node as any).failed ? { color: '#ff4d4f' } : {}}>{node.title}</strong>
            <small>{node.subtitle}</small>
          </div>
        ))}

        <div className="gallery-live-flow-status">
          <span className="live-pulse" style={isFailed ? { background: '#ff4d4f', boxShadow: '0 0 10px rgba(255, 77, 79, 0.5)' } : {}} />
          {deployState === 'idle' ? 'pipeline idle' : deployState === 'failed' ? 'pipeline blocked by E2E failure' : deployState === 'success' ? 'deployment complete' : 'pipeline is running'}
          {activeIndex >= 0 && <b>·</b>}
          {activeIndex >= 0 && (isFailed ? 'Production sync aborted' : `Executing Stage ${activeIndex + 1}/7`)}
        </div>
      </div>
    </div>
  )
}
