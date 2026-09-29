import React from 'react'

export function PipelineMap({ activeIndex, deployState }: { activeIndex: number; deployState: string }) {
  const isFailed = deployState === 'failed'

  const nodes = [
    {
      id: 'dev',
      x: 80,
      y: 250,
      title: 'Developer',
      subtitle: 'git push origin',
      badge: 'USER',
      active: activeIndex === 0,
    },
    {
      id: 'github',
      x: 280,
      y: 250,
      title: 'GitHub Actions',
      subtitle: 'CI orchestrator',
      badge: 'CI/CD',
      active: activeIndex >= 1,
      accent: true,
    },

    // Top Row: Test Environment & Validation
    {
      id: 's3test',
      x: 550,
      y: 120,
      title: 'S3 (Test Bucket)',
      subtitle: 'staging environment',
      badge: 'STORAGE',
      active: activeIndex === 2 || activeIndex === 3,
    },
    {
      id: 'e2e',
      x: 820,
      y: 120,
      title: 'Playwright E2E',
      subtitle: 'automated testing',
      badge: 'TEST',
      active: activeIndex === 3,
      failed: isFailed && activeIndex === 3,
    },

    // Bottom Row: Production Storage, CDN, and Users
    {
      id: 's3prod',
      x: 520,
      y: 380,
      title: 'S3 (Production)',
      subtitle: 'origin storage',
      badge: 'STORAGE',
      active: activeIndex === 4 || activeIndex === 6 || deployState === 'success',
    },
    {
      id: 'cf',
      x: 730,
      y: 380,
      title: 'CloudFront',
      subtitle: 'CDN edge cache',
      badge: 'DELIVERY',
      active: activeIndex === 5 || activeIndex === 6 || deployState === 'success',
    },
    {
      id: 'client',
      x: 930,
      y: 380,
      title: 'End Users',
      subtitle: 'devopslearnercorner.org',
      badge: 'TRAFFIC',
      active: activeIndex === 6 || deployState === 'success',
    },
  ]

  // Only the currently executing stage has isWorking: true
  const paths = [
    // Stage 0: Developer pushes to GitHub Actions
    {
      id: 'push',
      d: 'M 140 250 L 220 250',
      label: 'git push',
      tone: 'teal',
      duration: '1.6s',
      isWorking: activeIndex === 0,
    },
    // Stage 2: GitHub Actions pushes data to test S3 bucket
    {
      id: 'deploy-test',
      d: 'M 280 205 Q 280 120 485 120',
      label: 'aws s3 sync (test)',
      tone: 'teal',
      duration: '2.0s',
      isWorking: activeIndex === 2,
    },
    // Stage 3: Playwright runs E2E tests against test S3 bucket
    {
      id: 'run-e2e',
      d: 'M 755 120 L 615 120',
      label: isFailed ? 'tests failed' : 'playwright test URL',
      tone: isFailed ? 'danger' : 'amber',
      duration: '1.5s',
      isWorking: activeIndex === 3,
    },
    // Stage 4: GitHub Actions syncs data to production S3 bucket
    {
      id: 'deploy-prod',
      d: 'M 280 295 Q 280 380 455 380',
      label: 'aws s3 sync (prod)',
      tone: 'teal',
      duration: '2.0s',
      isWorking: activeIndex === 4 && !isFailed,
    },
    // Stage 5: GitHub Actions invalidates CloudFront cache
    {
      id: 'invalidate',
      d: 'M 345 270 Q 520 270 670 340',
      label: 'invalidate cache /*',
      tone: 'amber',
      duration: '2.0s',
      isWorking: activeIndex === 5 && !isFailed,
    },
    // Stage 6 / Live: CloudFront fetching / serving origin from S3 Production
    {
      id: 'cf-to-prod',
      d: 'M 665 380 L 585 380',
      label: 'origin connection',
      tone: 'teal',
      duration: '1.8s',
      isWorking: (activeIndex === 6 || deployState === 'success') && !isFailed,
    },
    // Stage 6 / Live: End Users requesting content from CloudFront
    {
      id: 'serve',
      d: 'M 870 380 L 795 380',
      label: 'HTTPS requests',
      tone: 'teal',
      duration: '1.8s',
      isWorking: (activeIndex === 6 || deployState === 'success') && !isFailed,
    },
  ]

  const activePaths = paths.filter((p) => p.isWorking)

  return (
    <div className="gallery-live-map" style={{ marginTop: '2rem' }}>
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">pipeline architecture map</span>
          <strong>CI/CD Workflow Execution</strong>
          <p>Moving lines animate only on the currently active stage.</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> active stage packet</span>
          <span><i className="legend-dot amber" /> validation / cache control</span>
        </div>
      </div>

      <div className="gallery-live-map-canvas" style={{ minHeight: '500px' }}>
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

            {paths.map((flow) => (
              <path key={`def-${flow.id}`} id={`path-${flow.id}`} d={flow.d} />
            ))}
          </defs>

          {/* Faint static dashed topology paths showing entire architecture */}
          {paths.map((flow) => (
            <path
              key={`bg-${flow.id}`}
              d={flow.d}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
          ))}

          {/* Active moving packets ONLY on working stages */}
          {activePaths.map((flow) => (
            <g key={`active-${flow.id}`}>
              <path d={flow.d} className={`gallery-path gallery-path-${flow.tone}`} fill="none" />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" fill="none" />
              <circle r="5" className={`gallery-packet gallery-packet-${flow.tone}`} filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  repeatCount={isFailed && flow.id === 'run-e2e' ? '3' : 'indefinite'}
                  path={flow.d}
                />
              </circle>
              <text style={{
                fill: flow.tone === 'danger' ? '#ff7875' : flow.tone === 'amber' ? '#ffc069' : '#5cdbd3',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.04em'
              }}>
                <textPath href={`#path-${flow.id}`} startOffset="50%" textAnchor="middle">
                  {flow.label}
                </textPath>
              </text>
            </g>
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${!node.active ? 'muted' : ''} ${(node as any).failed ? 'failed-node' : ''}`}
            style={{
              left: `${node.x / 10}%`,
              top: `${node.y / 5}%`,
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              zIndex: 10
            }}
          >
            <span
              className="gallery-live-node-badge"
              style={(node as any).failed ? { color: '#ff4d4f', borderBottomColor: '#ff4d4f' } : {}}
            >
              {node.badge}
            </span>
            <div
              className="gallery-live-node-icon"
              style={(node as any).failed ? { color: '#ff4d4f', borderColor: '#ff4d4f' } : {}}
            >
              {node.id === 'dev' || node.id === 'client' ? '◉' : node.id === 'github' ? '⚙' : node.id === 'e2e' ? '⚡' : node.id === 'cf' ? '↯' : '▱'}
            </div>
            <strong style={(node as any).failed ? { color: '#ff4d4f' } : {}}>{node.title}</strong>
            <small>{node.subtitle}</small>
          </div>
        ))}

        <div className="gallery-live-flow-status">
          <span
            className="live-pulse"
            style={isFailed ? { background: '#ff4d4f', boxShadow: '0 0 10px rgba(255, 77, 79, 0.5)' } : {}}
          />
          {deployState === 'idle' ? 'pipeline idle — ready to push' : deployState === 'failed' ? 'pipeline blocked: Playwright E2E failed' : deployState === 'success' ? 'live: users connecting via CloudFront to S3 Prod' : 'pipeline is executing active stage'}
          {activeIndex >= 0 && <b>·</b>}
          {activeIndex >= 0 && (isFailed ? 'Production release gated' : `Stage ${activeIndex + 1}/7`)}
        </div>
      </div>
    </div>
  )
}
