import React from 'react'

export function PipelineMap({ activeIndex, deployState }: { activeIndex: number; deployState: string }) {
  const isFailed = deployState === 'failed'

  const nodes = [
    { id: 'dev', x: 100, y: 250, title: 'Developer', subtitle: 'git push', badge: 'USER', active: activeIndex >= 0 },
    { id: 'github', x: 300, y: 250, title: 'GitHub Actions', subtitle: 'CI orchestrator', badge: 'CI/CD', active: activeIndex >= 1, accent: true },
    
    // Playwright sits on the path to S3 Test
    { id: 'e2e', x: 475, y: 100, title: 'Playwright', subtitle: 'E2E testing', badge: 'TEST', active: activeIndex >= 3, failed: isFailed && activeIndex === 3 },
    
    { id: 's3test', x: 650, y: 100, title: 'S3 (Test)', subtitle: 'devops-learner', badge: 'STORAGE', active: activeIndex >= 2 },
    { id: 's3prod', x: 650, y: 250, title: 'S3 (Prod)', subtitle: 'devopslearnercorner.org', badge: 'STORAGE', active: activeIndex >= 4 },
    { id: 'cf', x: 650, y: 400, title: 'CloudFront', subtitle: 'CDN cache', badge: 'DELIVERY', active: activeIndex >= 5 },
    
    { id: 'client', x: 850, y: 400, title: 'Users', subtitle: 'HTTPS traffic', badge: 'TRAFFIC', active: activeIndex >= 6 },
  ]

  const paths = [
    // 0: Push
    { id: 'push', d: 'M150 250 L250 250', label: 'push', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 0 },
    
    // 2: GitHub -> S3 Test (Arcs up to avoid Playwright node)
    { id: 'deploy-test', d: 'M300 230 Q 475 20 650 80', label: 's3 sync (test)', tone: 'teal', duration: '2.5s', delay: '0s', active: activeIndex >= 2 },
    
    // 3: GitHub -> Playwright -> S3 Test
    { id: 'run-e2e', d: 'M330 220 L425 120', label: 'run tests', tone: isFailed ? 'danger' : 'amber', duration: '1.5s', delay: '0s', active: activeIndex >= 3 },
    { id: 'verify-e2e', d: 'M525 100 L600 100', label: 'verify HTTP', tone: isFailed ? 'danger' : 'amber', duration: '1.5s', delay: '0.75s', active: activeIndex >= 3 },
    
    // 4: GitHub -> S3 Prod (Straight across)
    { id: 'deploy-prod', d: 'M350 250 L600 250', label: 's3 sync (prod)', tone: 'teal', duration: '2.5s', delay: '0s', active: activeIndex >= 4 && !isFailed },
    
    // 5: GitHub -> CloudFront (Diagonal down)
    { id: 'invalidate', d: 'M330 280 L600 390', label: 'invalidate /*', tone: 'amber', duration: '2.5s', delay: '0s', active: activeIndex >= 5 && !isFailed },
    
    // 6: Users -> CloudFront
    { id: 'serve', d: 'M800 400 L700 400', label: 'access site', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 6 && !isFailed },
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
                  repeatCount={isFailed && (flow.id === 'run-e2e' || flow.id === 'verify-e2e') ? '2' : 'indefinite'}
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
               {node.id === 'dev' || node.id === 'client' ? '◉' : node.id === 'github' ? '⚙' : node.id === 'e2e' ? '⚡' : node.id === 'cf' ? '↯' : '▱'}
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
