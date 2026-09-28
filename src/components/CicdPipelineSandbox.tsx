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
  'Developer pushes to development branch',
  'GitHub Actions workflow triggered (deploy-s3.yml)',
  'aws s3 sync . s3://test-bucket',
  'npx playwright test against test URL',
  'aws s3 sync . s3://prod-bucket',
  'aws cloudfront create-invalidation /*',
  'Production site devopslearnercorner.org updated',
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
    }, 1800)

    return () => clearInterval(interval)
  }, [deployState, injectFailure])

  return (
    <div className="sandbox-page fade-in">
      <NavBrand href="/#projects" />
      <main>
        <section className="sandbox-hero section">
          <div className="container">
            <div className="sandbox-hero-head">
              <div className="sandbox-hero-title">
                <h1>CI/CD Pipeline with Automated E2E Gating</h1>
                <p>GitHub Actions · Playwright · AWS S3 · CloudFront</p>
              </div>
              <div className="sandbox-hero-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setDeployState('running')}
                  disabled={deployState === 'running'}
                >
                  {deployState === 'running' ? 'Pipeline Running...' : deployState === 'idle' ? 'Push to development branch' : 'Run Pipeline Again'}
                </button>
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
                <div className="terminal-body" style={{ minHeight: '120px' }}>
                  {deployState === 'idle' && <span className="terminal-line muted">Waiting for push event on development branch...</span>}
                  {activeIndex >= 0 && (
                    <span className="terminal-line ok">
                      $ {flowMessages[activeIndex]}
                    </span>
                  )}
                  {deployState === 'failed' && activeIndex === 3 && (
                    <span className="terminal-line error" style={{ marginTop: '0.5rem' }}>
                      Error: E2E tests failed! 2 tests failed, 10 passed.
                      <br/>
                      Pipeline blocked. Production deployment aborted.
                    </span>
                  )}
                  {deployState === 'success' && (
                    <span className="terminal-line ok" style={{ marginTop: '0.5rem' }}>
                      Success: Pipeline completed. Production site is live!
                    </span>
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

      </main>
    </div>
  )
}
