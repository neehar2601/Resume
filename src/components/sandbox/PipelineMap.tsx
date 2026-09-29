import React from 'react'

export function PipelineMap({ activeIndex, deployState }: { activeIndex: number; deployState: string }) {
  const isFailed = deployState === 'failed'

  const nodes = [
    {
      id: 'dev',
      x: 70,
      y: 250,
      title: 'Developer',
      subtitle: 'git push origin',
      badge: 'USER',
      active: activeIndex === 0,
    },
    {
      id: 'github',
      x: 270,
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
      x: 530,
      y: 110,
      title: 'S3 (Test Bucket)',
      subtitle: 'staging environment',
      badge: 'STORAGE',
      active: activeIndex === 2 || activeIndex === 3,
    },
    {
      id: 'e2e',
      x: 830,
      y: 110,
      title: 'Playwright E2E',
      subtitle: 'automated testing',
      badge: 'TEST',
      active: activeIndex === 3,
      failed: isFailed && activeIndex === 3,
    },

    // Bottom Row: Production Storage, CDN, and HTTPS Live
    {
      id: 's3prod',
      x: 500,
      y: 395,
      title: 'S3 (Production)',
      subtitle: 'origin storage',
      badge: 'STORAGE',
      active: activeIndex === 4 || activeIndex === 6 || deployState === 'success',
    },
    {
      id: 'cf',
      x: 720,
      y: 395,
      title: 'CloudFront',
      subtitle: 'CDN edge cache',
      badge: 'DELIVERY',
      active: activeIndex === 5 || activeIndex === 6 || deployState === 'success',
    },
    {
      id: 'live',
      x: 940,
      y: 395,
      title: 'HTTPS Live',
      subtitle: 'devopslearnercorner.org',
      badge: 'LIVE',
      active: activeIndex === 6 || deployState === 'success',
      accent: activeIndex === 6 || deployState === 'success',
    },
  ]

  // Paths with non-colliding coordinates and smooth bezier curves
  const paths = [
    // Stage 0: Developer pushes to GitHub Actions
    {
      id: 'push',
      d: 'M 147 250 L 193 250',
      label: 'git push',
      labelX: 170,
      labelY: 185,
      tone: 'teal',
      duration: '2.6s',
      isWorking: activeIndex === 0,
    },
    // Stage 2: GitHub Actions pushes data to test S3 bucket
    {
      id: 'deploy-test',
      d: 'M 270 202 Q 270 110 453 110',
      label: 'aws s3 sync (test)',
      labelX: 360,
      labelY: 85,
      tone: 'teal',
      duration: '2.8s',
      isWorking: activeIndex === 2,
    },
    // Stage 3: Playwright runs E2E tests against test S3 bucket
    {
      id: 'run-e2e',
      d: 'M 753 110 L 607 110',
      label: isFailed ? 'E2E tests failed ✗' : 'playwright test URL',
      labelX: 680,
      labelY: 82,
      tone: isFailed ? 'danger' : 'amber',
      duration: '2.4s',
      isWorking: activeIndex === 3,
    },
    // Stage 4: GitHub Actions syncs data to production S3 bucket
    {
      id: 'deploy-prod',
      d: 'M 270 298 Q 270 395 423 395',
      label: 'aws s3 sync (prod)',
      labelX: 350,
      labelY: 330,
      tone: 'teal',
      duration: '2.8s',
      isWorking: activeIndex === 4 && !isFailed,
    },
    // Stage 5: GitHub Actions invalidates CloudFront cache
    {
      id: 'invalidate',
      d: 'M 347 270 Q 500 465 720 443',
      label: 'invalidate cache /*',
      labelX: 490,
      labelY: 468,
      tone: 'amber',
      duration: '2.8s',
      isWorking: activeIndex === 5 && !isFailed,
    },
    // Stage 6 / Live: CloudFront fetching / serving origin from S3 Production
    {
      id: 'cf-to-prod',
      d: 'M 720 347 Q 610 270 500 347',
      label: 'origin connection (S3)',
      labelX: 610,
      labelY: 260,
      tone: 'teal',
      duration: '2.4s',
      isWorking: (activeIndex === 6 || deployState === 'success') && !isFailed,
    },
    // Stage 6 / Live: HTTPS Live traffic served via CloudFront
    {
      id: 'serve',
      d: 'M 940 347 Q 830 270 720 347',
      label: 'HTTPS Live Traffic',
      labelX: 830,
      labelY: 260,
      tone: 'teal',
      duration: '2.4s',
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
          <p>Smooth stage progression with unblocked, fully visible indicators.</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> active stage packet</span>
          <span><i className="legend-dot amber" /> validation / cache control</span>
        </div>
      </div>

      <div className="gallery-live-map-canvas" style={{ minHeight: '520px', position: 'relative' }}>
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 500" role="img" aria-label="Pipeline routing map">
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

          {/* Faint static dashed topology paths showing entire architecture */}
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

          {/* Active moving packets with smooth spline easing */}
          {activePaths.map((flow) => (
            <g key={`active-${flow.id}`}>
              {/* Illuminated path line */}
              <path d={flow.d} className={`gallery-path gallery-path-${flow.tone}`} fill="none" strokeWidth="2.5" />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" fill="none" />

              {/* Smooth gliding packet with soft outer glow */}
              <circle r="7" className={`gallery-packet gallery-packet-${flow.tone}`} opacity="0.3" filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  repeatCount={isFailed && flow.id === 'run-e2e' ? '4' : 'indefinite'}
                  path={flow.d}
                  calcMode="spline"
                  keyTimes="0; 1"
                  keySplines="0.42 0 0.58 1"
                />
              </circle>
              <circle r="4.5" className={`gallery-packet gallery-packet-${flow.tone}`} filter="url(#flow-glow)">
                <animateMotion
                  dur={flow.duration}
                  repeatCount={isFailed && flow.id === 'run-e2e' ? '4' : 'indefinite'}
                  path={flow.d}
                  calcMode="spline"
                  keyTimes="0; 1"
                  keySplines="0.42 0 0.58 1"
                />
              </circle>
            </g>
          ))}
        </svg>

        {/* Floating pill badges with z-index: 25 - mathematically guaranteed never to be behind blocks */}
        {activePaths.map((flow) => (
          <div
            key={`badge-${flow.id}`}
            style={{
              position: 'absolute',
              left: `${flow.labelX / 10}%`,
              top: `${flow.labelY / 5}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              padding: '4px 11px',
              borderRadius: '999px',
              background: 'rgba(10, 16, 26, 0.95)',
              border: `1.5px solid ${
                flow.tone === 'danger'
                  ? 'rgba(255, 77, 79, 0.85)'
                  : flow.tone === 'amber'
                  ? 'rgba(232, 163, 61, 0.85)'
                  : 'rgba(79, 209, 197, 0.85)'
              }`,
              boxShadow: `0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px ${
                flow.tone === 'danger'
                  ? 'rgba(255, 77, 79, 0.3)'
                  : flow.tone === 'amber'
                  ? 'rgba(232, 163, 61, 0.3)'
                  : 'rgba(79, 209, 197, 0.3)'
              }`,
              color:
                flow.tone === 'danger'
                  ? '#ff7875'
                  : flow.tone === 'amber'
                  ? '#ffc069'
                  : '#5cdbd3',
              fontSize: '11px',
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

        {/* Architecture Node Blocks */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${!node.active ? 'muted' : ''} ${(node as any).failed ? 'failed-node' : ''}`}
            style={{
              left: `${node.x / 10}%`,
              top: `${node.y / 5}%`,
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              zIndex: 10,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
              {node.id === 'dev' ? '◉' : node.id === 'live' ? '↗' : node.id === 'github' ? '⚙' : node.id === 'e2e' ? '⚡' : node.id === 'cf' ? '↯' : '▱'}
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
