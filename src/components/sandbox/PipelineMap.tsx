import React from 'react'

export function PipelineMap({ activeIndex, deployState }: { activeIndex: number; deployState: string }) {
  // activeIndex maps to the 7 stages in CicdPipelineSandbox
  // 0: push, 1: gha, 2: s3-test, 3: e2e, 4: s3-prod, 5: cloudfront, 6: live

  const isFailed = deployState === 'failed'

  const nodes = [
    { id: 'github', x: 100, y: 200, title: 'GitHub', subtitle: 'development branch', badge: 'SOURCE', active: activeIndex >= 0 },
    { id: 'actions', x: 400, y: 200, title: 'Actions Runner', subtitle: 'ubuntu-latest', badge: 'CI', active: activeIndex >= 1, accent: true },
    { id: 's3test', x: 750, y: 100, title: 'S3 (Test)', subtitle: 'devops-learner', badge: 'STORAGE', active: activeIndex >= 2 },
    { id: 'e2e', x: 750, y: 200, title: 'Playwright', subtitle: 'E2E suite', badge: 'TEST', active: activeIndex >= 3, failed: isFailed && activeIndex === 3 },
    { id: 's3prod', x: 750, y: 320, title: 'S3 (Prod)', subtitle: 'devopslearnercorner.org', badge: 'STORAGE', active: activeIndex >= 4 },
    { id: 'cf', x: 400, y: 320, title: 'CloudFront', subtitle: 'CDN cache', badge: 'DELIVERY', active: activeIndex >= 5 },
  ]

  const paths = [
    { id: 'push', d: 'M150 200 L350 200', label: 'git push', tone: 'teal', duration: '2.0s', delay: '0s', active: activeIndex >= 0 },
    { id: 'deploy-test', d: 'M450 185 C550 185 650 100 700 100', label: 'aws s3 sync', tone: 'teal', duration: '2.5s', delay: '0s', active: activeIndex >= 2 },
    { id: 'run-e2e', d: 'M450 200 L700 200', label: 'npx playwright', tone: isFailed ? 'danger' : 'amber', duration: '2.0s', delay: '0s', active: activeIndex >= 3 },
    { id: 'e2e-verify', d: 'M750 180 L750 120', label: 'verify', tone: isFailed ? 'danger' : 'amber', duration: '1.5s', delay: '0.5s', active: activeIndex >= 3 },
    { id: 'deploy-prod', d: 'M450 215 C550 215 650 320 700 320', label: 'aws s3 sync', tone: 'teal', duration: '2.5s', delay: '0s', active: activeIndex >= 4 && !isFailed },
    { id: 'invalidate', d: 'M400 230 L400 300', label: 'invalidate /*', tone: 'amber', duration: '2.0s', delay: '0s', active: activeIndex >= 5 && !isFailed },
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
      
      <div className="gallery-live-map-canvas" style={{ minHeight: '440px' }}>
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 450" role="img" aria-label="Pipeline routing map">
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
                  repeatCount={isFailed && flow.id === 'e2e-verify' ? '2' : 'indefinite'}
                  path={flow.d}
                />
              </circle>
            </g>
          ))}
          {paths.filter(p => p.active).map((flow) => (
             <text key={`label-${flow.id}`} style={{ fill: 'var(--muted)', fontSize: '11px', fontWeight: 600 }}>
               <textPath href={`#path-${flow.id}`} startOffset="50%" textAnchor="middle">
                 {flow.label}
               </textPath>
             </text>
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${!node.active ? 'muted' : ''} ${node.failed ? 'failed-node' : ''}`}
            style={{ left: `${node.x / 10}%`, top: `${node.y / 4.5}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
          >
            <span className="gallery-live-node-badge" style={node.failed ? { color: '#ff4d4f', borderBottomColor: '#ff4d4f' } : {}}>{node.badge}</span>
            <div className="gallery-live-node-icon" style={node.failed ? { color: '#ff4d4f' } : {}}>
               {node.id === 'github' ? '◆' : node.id === 'actions' ? '⚙' : node.id === 'e2e' ? '⚡' : node.id === 'cf' ? '↯' : '▱'}
            </div>
            <strong style={node.failed ? { color: '#ff4d4f' } : {}}>{node.title}</strong>
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
