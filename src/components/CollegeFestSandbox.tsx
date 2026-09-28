import { useEffect, useMemo, useState } from 'react'

type DeployState = 'idle' | 'running' | 'success' | 'failed'
type Stage = 'github' | 'jenkins' | 'docker-build' | 'tag' | 'docker-push' | 'ec2' | 'compose' | 'tls' | 'health' | 'live'

const stages: { id: Stage; label: string; short: string }[] = [
  { id: 'github', label: 'Private GitHub', short: 'GH' },
  { id: 'jenkins', label: 'Jenkins', short: 'CI' },
  { id: 'docker-build', label: 'Docker Build', short: 'IMG' },
  { id: 'tag', label: 'Build Tag', short: 'TAG' },
  { id: 'docker-push', label: 'Docker Hub', short: 'REG' },
  { id: 'ec2', label: 'Free-tier EC2', short: 'EC2' },
  { id: 'compose', label: 'Docker Compose', short: 'DC' },
  { id: 'tls', label: 'TLS volume', short: 'TLS' },
  { id: 'health', label: 'Health check', short: 'HC' },
  { id: 'live', label: 'HTTPS live', short: 'ON' },
]

const flowMessages = [
  'Private repository → Jenkins checkout',
  'Jenkins starts the Docker build',
  'Docker image built from python:3.9-slim',
  'Jenkins tags the image with BUILD_NUMBER',
  'Jenkins pushes the immutable build tag to Docker Hub',
  'EC2 pulls the selected build tag',
  'Docker Compose recreates flask_app',
  'Read-only TLS certificate volume mounted',
  'HTTPS health check validates the container',
  'Application is serving the deployment',
]

const dockerfile = `FROM python:3.9-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt \\\n    && pip install --no-cache-dir firebase-admin\nCOPY . .\nEXPOSE 5000\nCMD ["python3", "app.py"]`

const composeTemplate = `version: '3'\nservices:\n  flask_app:\n    image: neehar/felicity:<BUILD_NUMBER>\n    ports:\n      - "443:443"\n    volumes:\n      - /etc/letsencrypt/live/msisfelicity.in:/etc/letsencrypt/live/msisfelicity.in:ro\n      - /etc/letsencrypt/archive/msisfelicity.in:/etc/letsencrypt/archive/msisfelicity.in:ro\n      - /etc/letsencrypt/keys:/etc/letsencrypt/keys:ro\n    environment:\n      - FLASK_RUN_CERT=/etc/letsencrypt/live/msisfelicity.in/fullchain.pem\n      - FLASK_RUN_KEY=/etc/letsencrypt/live/msisfelicity.in/privkey.pem`

const jenkinsfile = `pipeline {
  agent any

  environment {
    IMAGE = 'neehar/felicity'
    IMAGE_TAG = "\${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Image') {
      steps {
        sh 'docker build -t $IMAGE:$IMAGE_TAG .'
      }
    }

    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo \"$DOCKER_PASS\" | docker login -u \"$DOCKER_USER\" --password-stdin'
          sh 'docker push $IMAGE:$IMAGE_TAG'
        }
      }
    }

    stage('Update Compose on EC2') {
      steps {
        sshagent(credentials: ['collegefest-ec2-ssh']) {
          sh \"ssh -o StrictHostKeyChecking=no ubuntu@EC2_HOST 'sed -i \\\"s|image: neehar/felicity:.*|image: neehar/felicity:\${IMAGE_TAG}|\\\" /opt/collegefest/docker-compose.yml && cd /opt/collegefest && docker compose pull && docker compose up -d'\"
        }
      }
    }

    stage('Verify HTTPS') {
      steps {
        sh 'curl -Ik https://msisfelicity.in'
      }
    }
  }
}

// Representative reconstruction for the portfolio. The original private Jenkinsfile is not exposed.`

export function CollegeFestSandbox() {
  const [deployState, setDeployState] = useState<DeployState>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [failureArmed, setFailureArmed] = useState(false)
  const [runId, setRunId] = useState(0)
  const [selectedTab, setSelectedTab] = useState<'workflow' | 'runtime' | 'config' | 'jenkins'>('workflow')
  const [buildNumber, setBuildNumber] = useState(104)

  const imageTag = `neehar/felicity:${buildNumber}`
  const compose = composeTemplate.replace('<BUILD_NUMBER>', String(buildNumber))

  useEffect(() => {
    if (deployState !== 'running') return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = current + 1
        if (next >= stages.length) {
          window.clearInterval(timer)
          setDeployState(failureArmed ? 'failed' : 'success')
          return stages.length - 1
        }
        return next
      })
    }, 750)
    return () => window.clearInterval(timer)
  }, [deployState, failureArmed, runId])

  const statusText = deployState === 'running'
    ? `deploying / ${Math.max(activeIndex + 1, 1)} of ${stages.length}`
    : deployState === 'success'
      ? 'deployment healthy'
      : deployState === 'failed'
        ? 'health check failed'
        : 'sandbox ready'

  const currentMessage = deployState === 'failed'
    ? 'Health check failed → deployment held before promotion to the live state.'
    : deployState === 'success'
      ? 'Deployment completed → Docker Compose is serving the HTTPS application from EC2.'
      : activeIndex >= 0
        ? activeIndex === 3
          ? `Jenkins tags the image as ${imageTag}`
          : activeIndex === 4
            ? `${imageTag} pushed to Docker Hub`
            : activeIndex === 5
              ? `${imageTag} selected for the EC2 deployment`
              : flowMessages[Math.min(activeIndex, flowMessages.length - 1)]
        : 'Press deploy to walk through the build → tag → push → compose update → deploy → verify workflow.'

  const commandLines = useMemo(() => {
    const tag = imageTag
    const composeUpdate = `Jenkins updates docker-compose.yml → image: ${tag}`
    if (deployState === 'idle') return [
      '$ git checkout <private-repo>',
      '$ export IMAGE_TAG=neehar/felicity:${BUILD_NUMBER}',
      '$ docker build -t neehar/felicity:build-${BUILD_NUMBER} .',
      '$ docker tag neehar/felicity:build-${BUILD_NUMBER} $IMAGE_TAG',
      '$ docker push $IMAGE_TAG',
      'Jenkins updates docker-compose.yml → image: $IMAGE_TAG',
      '$ docker compose pull && docker compose up -d',
      '$ curl -Ik https://msisfelicity.in',
    ]
    const lines = [
      '$ git checkout <private-repo>',
      '✓ Jenkins workspace prepared',
      `$ docker build -t neehar/felicity:build-${buildNumber} .`,
      activeIndex >= 2 ? `✓ image built locally: neehar/felicity:build-${buildNumber}` : '… building image',
      `$ docker tag neehar/felicity:build-${buildNumber} ${tag}`,
      activeIndex >= 3 ? `✓ immutable tag assigned: ${tag}` : '… assigning Jenkins BUILD_NUMBER tag',
      `$ docker push ${tag}`,
      activeIndex >= 4 ? `✓ pushed to Docker Hub: ${tag}` : '… waiting for image push',
      activeIndex >= 5 ? composeUpdate : '… updating docker-compose.yml with BUILD_NUMBER',
      activeIndex >= 6 ? `✓ EC2 pulls ${tag} and recreates flask_app` : '… waiting for EC2 deployment',
      activeIndex >= 7 ? '✓ TLS volume mounted read-only' : '… mounting certificates',
      activeIndex >= 8 ? (deployState === 'failed' ? '✗ HTTPS health check failed' : '✓ HTTPS health check passed') : '… health check pending',
    ]
    return lines
  }, [activeIndex, buildNumber, deployState, imageTag])

  const deploy = () => {
    setRunId((value) => value + 1)
    setActiveIndex(-1)
    setBuildNumber((value) => value + 1)
    setDeployState('running')
  }

  const reset = () => {
    setDeployState('idle')
    setActiveIndex(-1)
    setFailureArmed(false)
  }

  return (
    <div className="sandbox-shell">
      <nav className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <a className="brand" href="/#projects">Neehara Nellikalaya</a>
          <div className="sandbox-breadcrumb">SANDBOX / COLLEGEFEST DEPLOYMENT · v0.5.7</div>
          <a className="sandbox-back" href="/#projects">← back to projects</a>
        </div>
      </nav>

      <main>
        <section className="sandbox-hero">
          <div className="container">
            <div className="sandbox-title-row">
              <div>
                <div className="kicker"><span className="kicker-dot" /> deployment lab / college website</div>
                <h1>Build. Tag. Push. Deploy. Verify.</h1>
                <p>
                  This lab recreates the hosting workflow I used for the college website: source from a private GitHub repository, Jenkins-driven Docker build, Docker Hub image publishing, deployment on a free-tier EC2 instance, read-only TLS certificate volumes, Docker Compose, and an HTTPS health check.
                </p>
              </div>
              <div className={`sandbox-status ${deployState === 'success' ? 'success' : deployState === 'failed' ? 'failed' : ''}`}>
                <span /> {statusText}
              </div>
            </div>

            <div className="sandbox-controls">
              <div className="release-card">
                <span className="control-label">deployment artifact</span>
                <strong>{imageTag}</strong>
                <small>Docker Hub · immutable build tag</small>
              </div>
              <label className="failure-toggle" title="Simulate a failing deployment verification.">
                <input
                  type="checkbox"
                  checked={failureArmed}
                  disabled={deployState === 'running'}
                  onChange={(event) => setFailureArmed(event.target.checked)}
                />
                <span /> induce health-check failure
              </label>
              <button className="button primary sandbox-action" onClick={deploy} disabled={deployState === 'running'}>
                {deployState === 'running' ? 'Deploying…' : '▶ Run deployment'}
              </button>
              <button className="button sandbox-action" onClick={reset}>Reset</button>
            </div>
            <div className="artifact-note">Each deployment gets a new Jenkins <code>BUILD_NUMBER</code>. Jenkins builds and pushes <code>{imageTag}</code>, then updates the <code>image:</code> line in <code>docker-compose.yml</code> on EC2. Docker Compose pulls that exact tag and starts the container. The certificates remain on EC2 and are mounted read-only.</div>

            <LiveCollegeDeploymentFlow activeIndex={activeIndex} deployState={deployState} imageTag={imageTag} />

            <div className={`rollback-panel college-runtime-result ${deployState === 'failed' ? '' : deployState === 'success' ? 'rollback' : ''}`}>
              <div>
                <span className="rollback-kicker">runtime result</span>
                <strong>{deployState === 'failed' ? 'DEPLOYMENT HALTED' : deployState === 'success' ? 'LIVE / HEALTHY' : 'READY'}</strong>
                <p>{currentMessage}</p>
              </div>
              <div className="rollback-flow">
                <span>build</span><b>→</b><span>push</span><b>→</b><span>deploy</span><b>→</b><span>verify</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>02 — why this architecture?</span>
              <h2>The deployment design follows the job requirement: package the app, publish one versioned image, update the EC2 runtime, and verify HTTPS.</h2>
            </div>
            <div className="college-decision-grid">
              <article className="college-decision-card"><span>WHY DOCKER?</span><strong>Keep the Flask runtime reproducible.</strong><p>The application and Python dependencies are packaged into one image instead of depending on a hand-configured host runtime.</p></article>
              <article className="college-decision-card"><span>WHY DOCKER HUB?</span><strong>Move the same build artifact to EC2.</strong><p>Jenkins pushes the versioned image so the EC2 host can pull the exact artifact selected by the deployment.</p></article>
              <article className="college-decision-card"><span>WHY EC2?</span><strong>Simple, low-cost application hosting.</strong><p>For this workload, a small EC2 instance provides a straightforward runtime without adding container orchestration overhead.</p></article>
              <article className="college-decision-card"><span>WHY BUILD_NUMBER?</span><strong>Make every deployment identifiable.</strong><p><code>neehar/felicity:107</code> tells us exactly which Jenkins build was deployed instead of relying on a moving <code>latest</code> tag.</p></article>
              <article className="college-decision-card"><span>WHY COMPOSE?</span><strong>Keep EC2 runtime configuration explicit.</strong><p>The image tag, port mapping, certificate mounts, and environment variables stay together in <code>docker-compose.yml</code>.</p></article>
              <article className="college-decision-card"><span>WHY HOST-MOUNTED TLS?</span><strong>Keep certificates outside the image.</strong><p>The EC2 host owns the Let’s Encrypt files; Docker Compose mounts them into the container as read-only volumes.</p></article>
            </div>

            <div className="college-trace-card">
              <div className="college-trace-head"><span>DEPLOYMENT TRACE</span><strong>Watch one build number travel through the system.</strong></div>
              <div className="college-trace-steps">
                {['Jenkins #'+buildNumber, imageTag, 'Docker Hub', 'docker-compose.yml', 'EC2 container', 'HTTPS /health'].map((step, index) => (
                  <div key={step} className={`college-trace-step ${activeIndex >= index ? 'active' : ''}`}><b>{String(index+1).padStart(2,'0')}</b><span>{step}</span>{index < 5 && <i>→</i>}</div>
                ))}
              </div>
              <div className="college-diff"><span>COMPOSE UPDATE</span><code>- image: neehar/felicity:latest</code><code className="add">+ image: neehar/felicity:{buildNumber}</code></div>
            </div>

            <div className="tech-tabs">
              <button className={`button ${selectedTab === 'workflow' ? 'primary' : ''}`} onClick={() => setSelectedTab('workflow')}>CI/CD</button>
              <button className={`button ${selectedTab === 'jenkins' ? 'primary' : ''}`} onClick={() => setSelectedTab('jenkins')}>Jenkinsfile</button>
              <button className={`button ${selectedTab === 'runtime' ? 'primary' : ''}`} onClick={() => setSelectedTab('runtime')}>Docker Compose</button>
              <button className={`button ${selectedTab === 'config' ? 'primary' : ''}`} onClick={() => setSelectedTab('config')}>Dockerfile</button>
            </div>

            <div className="sandbox-two-col">
              <div className="sandbox-terminal">
                <div className="terminal-header">
                  <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
                  <span className="terminal-name">jenkins / deployment</span>
                  <span className="terminal-state">{deployState.toUpperCase()}</span>
                </div>
                <div className="terminal-body">
                  <div className="terminal-context">JOB: collegefest-deploy · ARTIFACT: {imageTag}</div>
                  {commandLines.map((line, index) => (
                    <div key={`${line}-${index}`} className={`terminal-line ${line.startsWith('✗') ? 'fail' : line.startsWith('✓') ? 'ok' : line.startsWith('…') ? 'warn' : ''}`}>{line}</div>
                  ))}
                  <div className="terminal-form"><span>$</span><input aria-label="Simulated terminal input" placeholder="try: docker ps" /></div>
                </div>
              </div>

              <div className="experiment-card code-card">
                <div className="code-card-head">
                  <span>{selectedTab === 'config' ? 'Dockerfile' : selectedTab === 'runtime' ? 'docker-compose.yml' : selectedTab === 'jenkins' ? 'Jenkinsfile' : 'deployment workflow'}</span>
                </div>
                <pre className="code-block"><code>{selectedTab === 'config' ? dockerfile : selectedTab === 'runtime' ? compose : selectedTab === 'jenkins' ? jenkinsfile : `$ export IMAGE_TAG=neehar/felicity:\${BUILD_NUMBER}\n$ docker build -t $IMAGE_TAG .\n$ docker push $IMAGE_TAG\n$ sed -i "s|image: neehar/felicity:.*|image: $IMAGE_TAG|" docker-compose.yml\n$ docker compose pull\n$ docker compose up -d\n$ curl -Ik https://msisfelicity.in`}</code></pre>
              </div>
            </div>

            <div className="college-tls-card">
              <div><span className="control-label">certificate flow</span><strong>EC2 keeps the TLS files; the container only receives a read-only mount.</strong></div>
              <div className="college-tls-flow"><span>EC2 /etc/letsencrypt</span><b>→</b><span>Docker volume :ro</span><b>→</b><span>Flask container /443</span></div>
              <code>fullchain.pem · privkey.pem</code>
            </div>
          </div>
        </section>

        <section className="sandbox-section sandbox-footer-section">
          <div className="container">
            <div className="sandbox-disclaimer"><span className="kicker-dot" /> Browser simulation only — no real Jenkins job, Docker Hub push, EC2 host or certificate is accessed from this page.</div>
          </div>
        </section>
      </main>
    </div>
  )
}

type CollegeFlowNode = {
  id: string
  x: number
  y: number
  title: string
  subtitle: string
  badge: string
  icon: string
  accent?: boolean
  muted?: boolean
  active?: boolean
}

type CollegeFlowPath = {
  id: string
  d: string
  label: string
  tone: 'teal' | 'amber' | 'muted'
  duration?: string
  delay?: string
}

function LiveCollegeDeploymentFlow({ activeIndex, deployState, imageTag }: { activeIndex: number; deployState: DeployState; imageTag: string }) {
  const nodes: CollegeFlowNode[] = [
    { id: 'github', x: 90, y: 90, title: 'Private GitHub', subtitle: 'source + Docker config', badge: 'SOURCE', icon: '◫', active: activeIndex === 0 || activeIndex === 1 },
    { id: 'jenkins', x: 300, y: 90, title: 'Jenkins', subtitle: 'build + tag automation', badge: 'CI', icon: 'J', accent: true, active: activeIndex === 1 },
    { id: 'docker', x: 500, y: 90, title: 'Docker Build', subtitle: 'python:3.9-slim', badge: 'IMAGE', icon: '◈', accent: true, active: activeIndex === 2 },
    { id: 'tag', x: 690, y: 90, title: 'Build Tag', subtitle: imageTag, badge: 'VERSION', icon: '#', accent: true, active: activeIndex === 3 },
    { id: 'hub', x: 865, y: 195, title: 'Docker Hub', subtitle: 'immutable image', badge: 'REGISTRY', icon: '◆', accent: true, active: activeIndex === 4 },
    { id: 'ec2', x: 625, y: 325, title: 'Free-tier EC2', subtitle: 'deployment host', badge: 'RUNTIME', icon: 'EC2', accent: true, active: activeIndex >= 5 && activeIndex <= 7 },
    { id: 'live', x: 115, y: 335, title: 'HTTPS Live', subtitle: 'msisfelicity.in', badge: 'SERVICE', icon: '↗', accent: true, active: activeIndex === 8 || deployState === 'success' },
  ]

  const paths: CollegeFlowPath[] = [
    { id: 'source', d: 'M150 90 C205 60 255 60 260 90', label: '1 · checkout', tone: 'teal', duration: '2.4s' },
    { id: 'build', d: 'M360 90 C410 60 450 60 460 90', label: '2 · docker build', tone: 'teal', duration: '2.2s', delay: '-0.7s' },
    { id: 'tag', d: 'M570 90 C615 60 650 60 650 90', label: '3 · BUILD_NUMBER tag', tone: 'amber', duration: '2.0s', delay: '-1.0s' },
    { id: 'push', d: 'M755 105 C825 120 865 145 860 170', label: '4 · docker push', tone: 'amber', duration: '2.5s', delay: '-1.2s' },
    { id: 'pull', d: 'M825 235 C790 260 770 295 735 310', label: '5 · docker compose pull', tone: 'teal', duration: '2.8s', delay: '-0.6s' },
    { id: 'serve', d: 'M485 390 C405 405 300 405 180 365', label: '8 · HTTPS :443', tone: 'teal', duration: '2.4s', delay: '-0.8s' },
    { id: 'health', d: 'M160 320 C135 300 110 295 95 300', label: deployState === 'failed' ? '9 · health check FAIL' : '9 · HTTPS health check', tone: deployState === 'failed' ? 'amber' : 'teal', duration: '2.8s', delay: '-1.4s' },
    { id: 'config', d: 'M300 120 C380 170 495 220 560 280', label: 'Jenkins → compose.yml', tone: 'muted', duration: '3.6s', delay: '-2.0s' },
  ]


  return (
    <div className="gallery-live-map college-live-map">
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">live deployment map</span>
          <strong>Source → build → registry → EC2 → HTTPS</strong>
          <p>Follow the same build number from Jenkins to Docker Hub and into the EC2 runtime. The packets keep moving so the deployment path reads as a system, not a row of static boxes.</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> artifact / runtime path</span>
          <span><i className="legend-dot amber" /> version / security action</span>
          <span><i className="legend-dot muted" /> config handoff</span>
        </div>
      </div>

      <div className="gallery-runtime-note">
        <b>ONE BUILD, ONE ARTIFACT</b>
        <span>Jenkins BUILD_NUMBER → {imageTag}</span>
        <span>Compose is updated with the same tag</span>
        <em>Certificates stay on EC2 and are mounted read-only into the container.</em>
      </div>

      <div className="gallery-live-map-canvas">
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 430" role="img" aria-label="CollegeFest deployment live traffic flow">
          <defs>
            <filter id="college-flow-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {paths.map((flow) => (
            <g key={flow.id}>
              <path d={flow.d} className={`gallery-path gallery-path-${flow.tone}`} />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" />
              <circle r="4.5" className={`gallery-packet gallery-packet-${flow.tone}`} filter="url(#college-flow-glow)">
                <animateMotion dur={flow.duration ?? '2.8s'} begin={flow.delay ?? '0s'} repeatCount="indefinite" path={flow.d} />
              </circle>
              <text x="0" y="0" className="college-flow-label"><tspan>{flow.label}</tspan></text>
            </g>
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.id === 'ec2' ? 'college-ec2-node' : ''} ${node.accent ? 'accent' : ''} ${node.muted ? 'muted' : ''} ${node.active ? 'node-active' : ''}`}
            style={{ left: `${node.x / 10}%`, top: `${node.y / 4.3}%` }}
          >
            {node.id === 'ec2' ? (
              <>
                <div className="college-ec2-head">
                  <div>
                    <span className="gallery-live-node-badge">EC2 · RUNTIME</span>
                    <strong>Free-tier EC2</strong>
                    <small>deployment host · HTTPS endpoint</small>
                  </div>
                  <span className="college-ec2-state"><i /> {deployState === 'success' ? 'LIVE' : deployState === 'failed' ? 'VERIFY FAIL' : activeIndex >= 5 ? 'DEPLOYING' : 'READY'}</span>
                </div>
                <div className="college-ec2-inner">
                  <div className={`college-runtime-card ${activeIndex === 6 ? 'active' : ''}`}>
                    <div className="college-runtime-card-head"><span>docker-compose.yml</span><b>CONFIG</b></div>
                    <code>image: {imageTag}</code>
                    <code>443:443</code>
                    <small>Jenkins writes the updated build tag here.</small>
                  </div>
                  <div className={`college-runtime-card ${activeIndex === 7 ? 'active amber' : ''}`}>
                    <div className="college-runtime-card-head"><span>certificates</span><b>TLS</b></div>
                    <code>/etc/letsencrypt/live/…</code>
                    <code>fullchain.pem + privkey.pem</code>
                    <small>mounted read-only into the container.</small>
                  </div>
                </div>
                <div className="college-ec2-footer">
                  <span>Jenkins → <b>compose.yml</b> → Docker Compose → container</span>
                  <span>volume → <b>certificates stay on EC2</b></span>
                </div>
              </>
            ) : (
              <>
                <span className="gallery-live-node-badge">{node.badge}</span>
                <div className="gallery-live-node-icon">{node.icon}</div>
                <strong>{node.title}</strong>
                <small>{node.subtitle}</small>
              </>
            )}
          </div>
        ))}

        <div className="college-config-callout">
          <span className="college-config-dot" />
          <b>Jenkins config handoff</b>
          <span>updates <code>docker-compose.yml</code> with <code>{imageTag}</code></span>
        </div>

        <div className="gallery-live-flow-status">
          <span className="live-pulse" />
          traffic is moving
          <b>·</b>
          {deployState === 'success' ? 'deployment healthy' : deployState === 'failed' ? 'health check failed' : deployState === 'running' ? 'deployment in progress' : 'live path ready'}
        </div>
      </div>
    </div>
  )
}

