import { NavBrand } from './NavBrand'
import { useEffect, useState } from 'react'
import { PipelineMap } from './sandbox/PipelineMap'

type DeployState = 'idle' | 'running' | 'success' | 'failed'
type Stage = 'github' | 'gha' | 's3-test' | 'e2e' | 's3-prod' | 'cloudfront' | 'live'

const stages: { id: Stage; label: string; short: string }[] = [
  { id: 'github', label: 'GitHub Push', short: 'GH' },
  { id: 'gha', label: 'Actions Trigger', short: 'CI' },
  { id: 's3-test', label: 'S3 (Test)', short: 'S3-T' },
  { id: 'e2e', label: 'Playwright', short: 'E2E' },
  { id: 's3-prod', label: 'S3 (Prod)', short: 'S3-P' },
  { id: 'cloudfront', label: 'Invalidate', short: 'CF' },
  { id: 'live', label: 'HTTPS Live', short: 'ON' },
]

const flowMessages = [
  'Developer pushes commit to development branch (git push origin dev)',
  'GitHub Actions runner initialised: trigger workflow .github/workflows/deploy-s3.yml',
  'Job [deploy-test]: syncing static build artifacts to S3 test bucket (aws s3 sync . s3://test-bucket)',
  'Job [e2e-tests]: executing automated Playwright end-to-end regression suite against test URL',
  'Job [deploy-prod]: tests passed with 100% success — syncing release to production bucket (s3://prod-bucket)',
  'Job [cdn-cache]: creating CloudFront edge cache invalidation (aws cloudfront create-invalidation /*)',
  'Production site live! Traffic routed through CloudFront CDN to S3 origin at devopslearnercorner.org',
]

const ymlTest = `  deploy:\n    name: Deploy to S3\n    runs-on: ubuntu-latest\n    steps:\n      - run: aws s3 sync . s3://\${{ secrets.AWS_S3_BUCKET }} \\ \n             --delete --exclude \".git/*\"`
const ymlE2E = `  e2e-tests:\n    needs: deploy\n    steps:\n      - run: npm ci\n      - run: npx playwright install\n      - run: npx playwright test`
const ymlProd = `  deploy-production:\n    needs: e2e-tests\n    steps:\n      - run: aws s3 sync . s3://\${{ secrets.AWS_PROD_S3_BUCKET }}\n      - run: aws cloudfront create-invalidation \\ \n             --distribution-id \${{ secrets.CF_ID }}`

export function CicdPipelineSandbox() {
  const [deployState, setDeployState] = useState<DeployState>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [injectFailure, setInjectFailure] = useState(false)

  useEffect(() => {
    if (deployState !== 'running') return

    let current = 0
    setActiveIndex(current)

    const interval = setInterval(() => {
      current++
      if (current === 3 && injectFailure) {
        clearInterval(interval)
        setActiveIndex(current)
        setDeployState('failed')
        return
      }

      if (current >= stages.length) {
        clearInterval(interval)
        setDeployState('success')
      } else {
        setActiveIndex(current)
      }
    }, 3800)

    return () => clearInterval(interval)
  }, [deployState, injectFailure])

  return (
    <div className="sandbox-page fade-in">
      <NavBrand href="/#projects" />
      <main>
        <section className="sandbox-hero section">
          <div className="container">
            <div className="sandbox-hero-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div className="sandbox-hero-title">
                <h1>CI/CD Pipeline with Automated E2E Gating</h1>
                <p>GitHub Actions · Playwright · AWS S3 · CloudFront</p>
              </div>
              <div className="sandbox-hero-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setDeployState('running')}
                  disabled={deployState === 'running'}
                >
                  {deployState === 'running' ? 'Pipeline Running...' : deployState === 'idle' ? 'Push to development branch' : 'Run Pipeline Again'}
                </button>
                <a
                  className="button"
                  href="https://devopslearnercorner.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Live DevOps Hub ↗
                </a>
                <a
                  className="button"
                  href="https://github.com/neehar2601/DevOps-Refresher"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub Repository ↗
                </a>
              </div>
            </div>

            <div className="sandbox-hero-body" style={{ marginTop: '2rem' }}>
              <div className="experiment-card" style={{ marginBottom: '2rem' }}>
                <div className="experiment-step">
                  <b>!</b>
                  <div>
                    <strong>Failure Injection</strong>
                    <p>Toggle this to simulate a broken commit. The Playwright E2E tests will fail, preventing the bad code from reaching the production S3 bucket.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={injectFailure} onChange={(e) => setInjectFailure(e.target.checked)} disabled={deployState === 'running'} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <PipelineMap activeIndex={activeIndex} deployState={deployState} />
              <div className="pipeline-track" style={{ marginBottom: '2rem' }}>
                {stages.map((stage, index) => (
                  <div className="track-item" key={stage.id}>
                    <div className={`track-dot ${index === activeIndex ? 'active' : index < activeIndex ? 'done' : ''} ${deployState === 'failed' && index === 3 ? 'failed' : ''}`}>{String(index + 1).padStart(2, '0')}</div>
                    <span>{stage.label}</span>
                    {index < stages.length - 1 && <div className={`track-line ${index < activeIndex ? 'lit' : ''} ${deployState === 'failed' && index >= 3 ? 'failed' : ''}`} />}
                  </div>
                ))}
              </div>

              <div className="terminal-panel">
                <div className="terminal-header">
                  <span>github-actions-runner</span>
                  <div className="terminal-controls"><i /><i /><i /></div>
                </div>
                <div className="terminal-body" style={{ minHeight: '160px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {deployState === 'idle' && (
                    <span className="terminal-line muted">
                      Ready. Click &quot;Push to development branch&quot; to start the CI/CD pipeline simulation.
                    </span>
                  )}
                  {activeIndex >= 0 && (
                    <>
                      {flowMessages.slice(0, activeIndex + 1).map((msg, idx) => (
                        <div key={idx} className={`terminal-line ${idx === activeIndex ? 'ok' : 'muted'}`} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ color: idx < activeIndex ? 'var(--teal)' : 'var(--amber)', fontWeight: 'bold' }}>
                            {idx < activeIndex ? '✓' : '➜'}
                          </span>
                          <span>$ {msg}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {deployState === 'failed' && activeIndex === 3 && (
                    <div className="terminal-line error" style={{ marginTop: '0.5rem', padding: '8px 12px', background: 'rgba(255, 77, 79, 0.08)', borderRadius: '6px', borderLeft: '3px solid #ff4d4f' }}>
                      <strong>✗ Production release gated:</strong> Playwright E2E suite detected regressions (2 failed, 10 passed).
                      <br/>
                      AWS S3 production sync &amp; CloudFront cache invalidation safely aborted.
                    </div>
                  )}
                  {deployState === 'success' && (
                    <div className="terminal-line ok" style={{ marginTop: '0.5rem', padding: '8px 12px', background: 'rgba(79, 209, 197, 0.08)', borderRadius: '6px', borderLeft: '3px solid var(--teal)' }}>
                      <strong>✓ Deployment successful!</strong> Production site is live and serving users at{' '}
                      <a
                        href="https://devopslearnercorner.org/"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#58a6ff', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        devopslearnercorner.org ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading"><span>01 / pipeline code</span><h2>GitHub Actions Configuration</h2></div>
            <div className="tech-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className={`tech-card ${activeIndex >= 2 && activeIndex < 3 ? 'selected' : ''}`}>
                <span>stage 1</span><strong>Deploy to Test</strong>
                <pre style={{ fontSize: '11px', overflowX: 'auto', background: '#0d1117', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>{ymlTest}</pre>
              </div>
              <div className={`tech-card ${activeIndex === 3 ? 'selected' : ''}`}>
                <span>stage 2</span><strong>Playwright E2E</strong>
                <pre style={{ fontSize: '11px', overflowX: 'auto', background: '#0d1117', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>{ymlE2E}</pre>
              </div>
              <div className={`tech-card ${activeIndex >= 4 ? 'selected' : ''}`}>
                <span>stage 3</span><strong>Deploy to Prod</strong>
                <pre style={{ fontSize: '11px', overflowX: 'auto', background: '#0d1117', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>{ymlProd}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>02 / live environment &amp; source</span>
              <h2>DevOps Hub Deployment &amp; Repository</h2>
            </div>
            <div className="source-grid">
              <a className="source-card source-card-live" href="https://devopslearnercorner.org/" target="_blank" rel="noreferrer">
                <span className="control-label">live production hub</span>
                <strong>devopslearnercorner.org ↗</strong>
                <small>Explore the live site served through AWS CloudFront &amp; S3.</small>
              </a>
              <a className="source-card" href="https://github.com/neehar2601/DevOps-Refresher" target="_blank" rel="noreferrer">
                <span className="control-label">source repository</span>
                <strong>neehar2601 / DevOps-Refresher ↗</strong>
                <small>View the development branch, GitHub Actions workflow, and Playwright tests.</small>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
