import { useMemo, useState } from 'react'
import { NavBrand } from './NavBrand'

type GalleryStage = 1 | 2 | 3 | 4

type StageInfo = {
  id: GalleryStage
  label: string
  title: string
  architecture: string
  problem: string
  decision: string
  result: string
  tradeoff: string
  technologies: string[]
}

const LIVE_URL = 'https://dj209obmn76yt.cloudfront.net/'
const GITHUB_URL = 'https://github.com/neehar2601/image_gallery'
const MEDIUM_PROFILE = 'https://medium.com/@ngn22666'
const MEDIUM_ARTICLES = [
  {
    label: '01 · Static S3',
    title: 'Hosting a Static Image Gallery on Amazon S3',
    url: 'https://medium.com/@ngn22666/hosting-a-static-image-gallery-on-amazon-s3-0b2c5a0ff159',
  },
  {
    label: '02 · JSON index',
    title: 'Dynamic Image Gallery on S3 with a Pre-Generated JSON Index File',
    url: 'https://medium.com/@ngn22666/dynamic-image-gallery-on-s3-with-a-pre-generated-json-index-file-05c0dae1319e',
  },
  {
    label: '03 · Serverless',
    title: 'Building a Serverless Dynamic Image Gallery with AWS Lambda + API Gateway + S3',
    url: 'https://medium.com/@ngn22666/blog-3-building-a-serverless-dynamic-image-gallery-with-aws-lambda-api-gateway-s3-a1dfc9827c39',
  },
  {
    label: '04 · Private delivery',
    title: 'Securing a Static Image Gallery with Amazon S3, CloudFront, API Gateway, and Lambda',
    url: 'https://medium.com/@ngn22666/securing-a-static-image-gallery-with-amazon-s3-cloudfront-api-gateway-and-lambda-github-a3b5045df454',
  },
]

const stages: StageInfo[] = [
  {
    id: 1,
    label: '01 / STATIC',
    title: 'S3 static website + a small gallery',
    architecture: 'Browser → S3 static website → image files',
    problem: 'The gallery is small. Running a web server or backend adds cost and operational work that the use case does not need.',
    decision: 'Start with S3 static website hosting and keep the application completely static.',
    result: 'HTML/CSS/JS and a few images are served directly from S3. The browser uses a simple data file to know which images to render.',
    tradeoff: 'Very simple and cheap, but image discovery is not automatic.',
    technologies: ['Amazon S3', 'HTML', 'CSS', 'JavaScript'],
  },
  {
    id: 2,
    label: '02 / METADATA',
    title: 'Generate the gallery index automatically',
    architecture: 'Images → script → gallery-index.json → browser',
    problem: 'Hardcoding every image path does not scale as more event folders and images are added.',
    decision: 'Use a script to scan the image layout and generate image identifiers / metadata in a JSON index.',
    result: 'The frontend stays static, while the generated metadata becomes the source for date/folder-based image discovery.',
    tradeoff: 'Still very inexpensive, but the index has to be regenerated whenever the gallery changes.',
    technologies: ['S3', 'Python / script', 'JSON metadata', 'Static frontend'],
  },
  {
    id: 3,
    label: '03 / SERVERLESS',
    title: 'Generate image metadata at request time',
    architecture: 'Browser → API Gateway → Lambda → S3 → JSON response',
    problem: 'Regenerating and uploading a metadata file becomes unnecessary operational work when images change frequently.',
    decision: 'Move image listing into a serverless API. Lambda asks S3 for the objects and returns the current gallery data.',
    result: 'New uploads can appear without rebuilding a JSON file. The gallery becomes dynamically discoverable.',
    tradeoff: 'More moving parts and small per-request service costs compared with the static approach.',
    technologies: ['API Gateway', 'Lambda', 'S3', 'IAM'],
  },
  {
    id: 4,
    label: '04 / SECURE DELIVERY',
    title: 'Private S3 behind CloudFront',
    architecture: 'Page + images: Browser → CloudFront + OAC → private S3   |   Metadata: Browser → API Gateway → Lambda → S3',
    problem: 'Directly exposing S3 objects is not the security model we want for the final gallery, and users should consume images through a managed delivery layer.',
    decision: 'Block direct public S3 access and use CloudFront with Origin Access Control so CloudFront is the authorized reader of the bucket.',
    result: 'The final gallery is delivered through the CloudFront distribution while S3 objects remain private. Dynamic listing continues through API Gateway + Lambda.',
    tradeoff: 'The architecture is more involved, but it adds a clear security boundary and global edge delivery/caching.',
    technologies: ['CloudFront', 'S3 OAC', 'Private S3', 'API Gateway', 'Lambda'],
  },
]

const demoImages = [
  { name: 'img-001.jpg', date: '2025-08-29', id: 'IMG-001' },
  { name: 'img-002.jpg', date: '2025-08-29', id: 'IMG-002' },
  { name: 'img-003.jpg', date: '2025-08-29', id: 'IMG-003' },
  { name: 'img-004.jpg', date: '2025-08-29', id: 'IMG-004' },
]

const evolutionTimeline = stages.map((item) => ({
  id: item.id,
  stage: item.label,
  title: item.title,
  problem: item.problem,
  change: item.decision,
  outcome: item.result,
}))

const futureConsiderations = [
  {
    title: 'Signed image uploads',
    problem: 'Uploads should not require making the S3 bucket writable from the browser or exposing long-lived AWS credentials.',
    design: 'Use a Lambda-controlled upload endpoint to issue a short-lived S3 presigned URL. The browser uploads directly to S3 with that signed URL.',
    flow: 'Browser → API Gateway → Lambda → presigned PUT URL → private S3',
  },
  {
    title: 'Image transformations',
    problem: 'Large originals are inefficient for gallery thumbnails and previews.',
    design: 'Generate resized variants on upload and serve the appropriate object through the delivery layer.',
    flow: 'Upload → processing → original + thumbnails → CloudFront',
  },
  {
    title: 'Access control for private galleries',
    problem: 'Some galleries may need authenticated users instead of public read access through CloudFront.',
    design: 'Add application-level authentication and authorization before exposing private gallery paths.',
    flow: 'User → auth → authorized gallery/API access',
  },
]

export function ImageGallerySandbox() {
  const [stage, setStage] = useState<GalleryStage>(1)
  const [imageAdded, setImageAdded] = useState(false)
  const [selectedDecision, setSelectedDecision] = useState<GalleryStage>(1)
  const current = stages.find((item) => item.id === stage) ?? stages[0]
  const decisionStage = stages.find((item) => item.id === selectedDecision) ?? stages[0]

  const visibleImages = useMemo(() => {
    const base = imageAdded
      ? [...demoImages, { name: 'IMG-042.jpg', date: '2025-08-29', id: 'IMG-042' }]
      : demoImages
    if (stage === 1 && imageAdded) return base.slice(0, -1)
    if (stage === 2 && imageAdded) return base
    return base
  }, [imageAdded, stage])

  const stage1Status = imageAdded ? 'not automatically discoverable' : '4 images in the initial gallery'
  const stage2Status = imageAdded ? 'metadata regenerated → image appears' : 'index contains 4 image records'
  const stage3Status = imageAdded ? 'Lambda listing returns 5 objects' : 'Lambda listing returns 4 objects'
  const stage4Status = imageAdded ? 'CloudFront serves a new private object' : 'CloudFront serves private objects via OAC'

  function addImage() {
    setImageAdded(true)
  }

  function reset() {
    setImageAdded(false)
  }

  return (
    <div className="sandbox-page image-gallery-page">
      <header className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <NavBrand href="/#projects" />
          <div className="sandbox-breadcrumb">SANDBOX / DYNAMIC IMAGE GALLERY · v0.5.7</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifySelf: 'end' }}>
            <a className="sandbox-back" href={GITHUB_URL} target="_blank" rel="noreferrer">source ↗</a>
            <a className="sandbox-back" href="/#projects">← back to projects</a>
          </div>
        </div>
      </header>

      <main>
        <section className="sandbox-hero image-hero">
          <div className="container">
            <div className="sandbox-title-row">
              <div>
                <div className="kicker"><span className="kicker-dot" /> AWS serverless / storage evolution</div>
                <h1>From a few images to a private serverless gallery.</h1>
                <p>
                  This lab follows the actual evolution of the Image Gallery project: start with the smallest useful architecture, remove manual metadata maintenance, add serverless discovery, then put the objects behind CloudFront for secure delivery.
                </p>
              </div>
              <div className="sandbox-status success"><span /> LIVE RESULT AVAILABLE</div>
            </div>

            <div className="image-hero-actions">
              <a className="button primary" href={LIVE_URL} target="_blank" rel="noreferrer">Open live gallery ↗</a>
              <a className="button" href={GITHUB_URL} target="_blank" rel="noreferrer">View GitHub ↗</a>
              <a className="button" href={MEDIUM_PROFILE} target="_blank" rel="noreferrer">Medium ↗</a>
            </div>


          </div>
        </section>

        <section className="section image-lab-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>01 — architecture evolution</span>
              <h2>Move through the real design decisions</h2>
            </div>

            <div className="gallery-stage-tabs" role="tablist" aria-label="Image gallery architecture stages">
              {stages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`gallery-stage-tab ${stage === item.id ? 'active' : ''}`}
                  onClick={() => setStage(item.id)}
                  role="tab"
                  aria-selected={stage === item.id}
                >
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </div>

            <div className="gallery-architecture-shell">
              <div className="gallery-architecture-bar">
                <div>
                  <span className="control-label">Current architecture</span>
                  <strong>{current.architecture}</strong>
                </div>
                <div className="gallery-live-chip"><span /> stage {stage} / 4</div>
              </div>

              <div className="gallery-architecture-canvas">
                <Architecture stage={stage} imageAdded={imageAdded} />
              </div>
            </div>
          </div>
        </section>

        <section className="section image-lab-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>02 — operate the evolution</span>
              <h2>Add an image and watch the architecture react</h2>
            </div>

            <div className="gallery-operator-grid">
              <div className="gallery-browser-card">
                <div className="gallery-browser-head">
                  <div>
                    <span className="control-label">simulated upload</span>
                    <strong>IMG-042.jpg</strong>
                  </div>
                  <div className="gallery-buttons">
                    <button className="button primary" type="button" onClick={addImage} disabled={imageAdded}>+ add image</button>
                    <button className="button" type="button" onClick={reset}>reset</button>
                  </div>
                </div>
                <div className="gallery-browser-body">
                  <div className="gallery-browser-meta">
                    <span>bucket: image-gallery</span>
                    <span>folder: images/2025-08-29/</span>
                    <span>{visibleImages.length} visible records</span>
                  </div>
                  <div className="gallery-object-grid">
                    {visibleImages.map((image) => (
                      <div className={`gallery-object ${image.id === 'IMG-042' ? 'new' : ''}`} key={image.id}>
                        <div className="gallery-object-art"><span>{image.id.replace('IMG-', '')}</span></div>
                        <strong>{image.name}</strong>
                        <small>{image.date}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="gallery-event-log">
                <div className="terminal-header">
                  <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
                  <span className="terminal-name">gallery / architecture-trace</span>
                  <span className="terminal-state">stage {stage}</span>
                </div>
                <div className="terminal-body">
                  <div className="terminal-context">$ gallery status --stage {stage}</div>
                  <Trace stage={stage} imageAdded={imageAdded} />
                </div>
              </div>
            </div>

            <div className="gallery-outcome-grid">
              <OutcomeCard stage={1} title="Static" status={stage1Status} active={stage === 1} />
              <OutcomeCard stage={2} title="Metadata" status={stage2Status} active={stage === 2} />
              <OutcomeCard stage={3} title="Serverless" status={stage3Status} active={stage === 3} />
              <OutcomeCard stage={4} title="Private delivery" status={stage4Status} active={stage === 4} />
            </div>
          </div>
        </section>

        <section className="section image-lab-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>03 — architecture reasoning</span>
              <h2>Why did the architecture change?</h2>
              <p className="section-intro">The requirement changed, so the architecture changed. Follow the timeline to see the problem, the engineering decision, the result, and the trade-off at each stage.</p>
            </div>

            <div className="decision-merge-layout">
              <div className="decision-timeline decision-timeline-merged">
                {evolutionTimeline.map((item) => (
                  <article
                    className={`decision-timeline-item ${selectedDecision === item.id ? 'active' : ''}`}
                    key={item.id}
                  >
                    <button
                      type="button"
                      className="decision-timeline-select"
                      onClick={() => setSelectedDecision(item.id as GalleryStage)}
                      aria-label={`Inspect ${item.title}`}
                    >
                      <span className="decision-timeline-marker">0{item.id}</span>
                      <div className="decision-timeline-content">
                        <span className="control-label">{item.stage}</span>
                        <h3>{item.title}</h3>
                      </div>
                    </button>
                    <div className="decision-timeline-grid">
                      <Fact label="Problem" value={item.problem} />
                      <Fact label="Change" value={item.change} />
                      <Fact label="Result" value={item.outcome} />
                    </div>
                  </article>
                ))}
              </div>

              <article className="decision-detail decision-detail-sticky">
                <div className="decision-detail-top">
                  <span>{decisionStage.label}</span>
                  <div className="tags">{decisionStage.technologies.map((tech) => <span className="tag" key={tech}>{tech}</span>)}</div>
                </div>
                <h3>{decisionStage.title}</h3>
                <div className="decision-facts">
                  <Fact label="Problem" value={decisionStage.problem} />
                  <Fact label="Decision" value={decisionStage.decision} />
                  <Fact label="Result" value={decisionStage.result} />
                  <Fact label="Trade-off" value={decisionStage.tradeoff} />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section image-lab-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>05 — future considerations</span>
              <h2>What I would add next</h2>
            </div>

            <div className="decision-grid future-grid">
              {futureConsiderations.map((item) => (
                <article className="decision-detail future-card" key={item.title}>
                  <div className="decision-detail-top">
                    <span>future</span>
                    <span className="gallery-live-chip"><span /> not implemented</span>
                  </div>
                  <h3>{item.title}</h3>
                  <div className="decision-facts">
                    <Fact label="Problem" value={item.problem} />
                    <Fact label="Design" value={item.design} />
                    <Fact label="Flow" value={item.flow} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section image-lab-section">
          <div className="container">
            <div className="sandbox-section-heading">
              <span>06 — implementation trail</span>
              <h2>Source material behind the sandbox</h2>
            </div>

            <div className="source-grid">
              <a className="source-card source-card-live" href={LIVE_URL} target="_blank" rel="noreferrer">
                <span className="control-label">final deployment</span>
                <strong>dj209obmn76yt.cloudfront.net</strong>
                <small>Open the actual deployed gallery.</small>
              </a>
              <a className="source-card" href={GITHUB_URL} target="_blank" rel="noreferrer">
                <span className="control-label">implementation</span>
                <strong>neehar2601 / image_gallery</strong>
                <small>Static files, dynamic files, CloudFront notes and IaC.</small>
              </a>
              {MEDIUM_ARTICLES.map((article) => (
                <a className="source-card" href={article.url} target="_blank" rel="noreferrer" key={article.url}>
                  <span className="control-label">{article.label}</span>
                  <strong>{article.title}</strong>
                  <small>Read the implementation reasoning and walkthrough.</small>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Architecture({ stage, imageAdded }: { stage: GalleryStage; imageAdded: boolean }) {
  return <LiveArchitectureFlow stage={stage} imageAdded={imageAdded} />
}

type FlowNode = {
  id: string
  x: number
  y: number
  title: string
  subtitle: string
  accent?: boolean
  muted?: boolean
  badge?: string
}

type FlowPath = {
  id: string
  d: string
  label: string
  tone?: 'teal' | 'amber' | 'muted'
  duration?: string
  delay?: string
}

const FLOW_COPY: Record<GalleryStage, { title: string; subtitle: string }> = {
  1: {
    title: 'Browser ↔ S3 static site',
    subtitle: 'The browser requests the static page and gallery data directly from S3.',
  },
  2: {
    title: 'Metadata generation + static delivery',
    subtitle: 'A script updates the index in S3; the browser still reads the static site directly.',
  },
  3: {
    title: 'Static frontend + dynamic metadata API',
    subtitle: 'The browser gets the site from S3 and asks API Gateway/Lambda for the current object list.',
  },
  4: {
    title: 'Two runtime paths: delivery + dynamic metadata',
    subtitle: 'The browser loads index.html/script.js through CloudFront, then the JavaScript calls API Gateway → Lambda for the live object list.',
  },
}

function LiveArchitectureFlow({ stage, imageAdded }: { stage: GalleryStage; imageAdded: boolean }) {
  const copy = FLOW_COPY[stage]
  const totalObjects = imageAdded ? 5 : 4

  const stageData: Record<GalleryStage, { nodes: FlowNode[]; paths: FlowPath[] }> = {
    1: {
      nodes: [
        { id: 'browser', x: 90, y: 205, title: 'Browser', subtitle: 'gallery UI', badge: 'USER' },
        { id: 's3', x: 500, y: 205, title: 'Amazon S3', subtitle: 'static website', accent: true, badge: 'STORAGE' },
        { id: 'index', x: 820, y: 205, title: 'index + images', subtitle: 'static objects', muted: true, badge: 'OBJECTS' },
      ],
      paths: [
        { id: 'request', d: 'M155 205 C245 160 340 160 430 205', label: 'GET /', tone: 'teal', duration: '2.7s' },
        { id: 'response', d: 'M430 225 C340 270 245 270 155 225', label: 'HTML / JSON / assets', tone: 'amber', duration: '3.1s', delay: '-1.2s' },
        { id: 'objects', d: 'M570 205 C650 175 720 175 755 205', label: 'object reads', tone: 'muted', duration: '2.4s', delay: '-0.7s' },
      ],
    },
    2: {
      nodes: [
        { id: 'script', x: 100, y: 205, title: 'Generator script', subtitle: 'scan + build metadata', accent: true, badge: 'BUILD' },
        { id: 's3', x: 500, y: 205, title: 'Amazon S3', subtitle: 'site + images + JSON', accent: true, badge: 'STORAGE' },
        { id: 'browser', x: 840, y: 205, title: 'Browser', subtitle: 'render gallery', badge: 'USER' },
      ],
      paths: [
        { id: 'upload', d: 'M165 205 C255 150 355 150 430 205', label: 'metadata upload', tone: 'amber', duration: '2.8s' },
        { id: 'request', d: 'M755 205 C680 155 590 155 570 205', label: 'GET index.json', tone: 'teal', duration: '2.4s', delay: '-0.8s' },
        { id: 'response', d: 'M570 225 C650 275 700 275 755 225', label: 'current metadata', tone: 'amber', duration: '3s', delay: '-1.5s' },
      ],
    },
    3: {
      nodes: [
        { id: 'browser', x: 85, y: 205, title: 'Browser', subtitle: `gallery UI · ${totalObjects} objects`, badge: 'USER' },
        { id: 's3', x: 500, y: 105, title: 'Amazon S3', subtitle: 'static site + objects', accent: true, badge: 'STATIC' },
        { id: 'api', x: 320, y: 305, title: 'API Gateway', subtitle: 'GET /images', accent: true, badge: 'API' },
        { id: 'lambda', x: 570, y: 305, title: 'Lambda', subtitle: 'ListObjectsV2', accent: true, badge: 'COMPUTE' },
        { id: 'objects', x: 825, y: 305, title: 'S3 object list', subtitle: `${totalObjects} records`, badge: 'DATA' },
      ],
      paths: [
        { id: 'site', d: 'M145 185 C235 120 340 95 430 105', label: 'site assets', tone: 'teal', duration: '2.6s' },
        { id: 'api-request', d: 'M145 225 C205 265 245 295 270 305', label: 'GET /images', tone: 'teal', duration: '2.4s', delay: '-0.8s' },
        { id: 'invoke', d: 'M370 305 C430 270 500 270 515 305', label: 'invoke', tone: 'amber', duration: '2.1s', delay: '-1.1s' },
        { id: 'list', d: 'M625 305 C690 270 750 270 765 305', label: 'ListObjectsV2', tone: 'amber', duration: '2.3s', delay: '-1.6s' },
        { id: 'json', d: 'M765 325 C690 365 600 365 385 325', label: 'JSON response', tone: 'teal', duration: '3.2s', delay: '-0.9s' },
      ],
    },
    4: {
      nodes: [
        { id: 'browser', x: 92, y: 215, title: 'Browser', subtitle: 'loads page, then calls API', badge: 'USER' },
        { id: 'cf', x: 325, y: 95, title: 'CloudFront', subtitle: 'edge + OAC', accent: true, badge: 'DELIVERY' },
        { id: 's3', x: 620, y: 95, title: 'Private S3', subtitle: 'index + images', accent: true, badge: 'ORIGIN' },
        { id: 'api', x: 325, y: 330, title: 'API Gateway', subtitle: 'GET /images', accent: true, badge: 'API' },
        { id: 'lambda', x: 585, y: 330, title: 'Lambda', subtitle: 'ListObjectsV2', accent: true, badge: 'COMPUTE' },
        { id: 'data', x: 835, y: 330, title: 'S3 object list', subtitle: `${totalObjects} records`, badge: 'DATA' },
      ],
      paths: [
        { id: 'page-request', d: 'M150 195 C205 150 245 105 270 95', label: '1 · GET /index.html + script.js', tone: 'teal', duration: '2.6s' },
        { id: 'oac-read', d: 'M400 95 C470 60 555 60 570 95', label: '2 · OAC read', tone: 'amber', duration: '2.1s', delay: '-0.7s' },
        { id: 'page-response', d: 'M570 115 C495 165 395 165 275 105', label: '3 · HTML / JS / assets', tone: 'teal', duration: '3.2s', delay: '-1.5s' },
        { id: 'api-request', d: 'M150 240 C210 285 245 320 270 330', label: '4 · GET /images?date=…', tone: 'teal', duration: '2.5s', delay: '-0.4s' },
        { id: 'invoke', d: 'M400 330 C455 295 535 295 545 330', label: '5 · invoke Lambda', tone: 'amber', duration: '2.0s', delay: '-1.1s' },
        { id: 'list', d: 'M645 330 C700 295 790 295 795 330', label: '6 · ListObjectsV2', tone: 'amber', duration: '2.3s', delay: '-0.5s' },
        { id: 'keys', d: 'M795 350 C730 380 675 380 645 350', label: '7 · object keys', tone: 'teal', duration: '2.2s', delay: '-1.0s' },
        { id: 'json', d: 'M545 350 C440 405 250 390 150 255', label: '8 · JSON metadata → browser', tone: 'teal', duration: '3.8s', delay: '-2.0s' },
        { id: 'image-request', d: 'M150 175 C210 115 235 70 270 75', label: '9 · image URL → CloudFront', tone: 'amber', duration: '3.0s', delay: '-1.6s' },
        { id: 'image-read', d: 'M400 75 C475 40 550 40 570 75', label: 'OAC image read', tone: 'amber', duration: '2.1s', delay: '-0.2s' },
      ],
    },
  }

  const { nodes, paths } = stageData[stage]

  return (
    <div className="gallery-live-map">
      <div className="gallery-live-map-head">
        <div>
          <span className="control-label">live runtime map</span>
          <strong>{copy.title}</strong>
          <p>{copy.subtitle}</p>
        </div>
        <div className="gallery-flow-legend">
          <span><i className="legend-dot teal" /> browser / data response</span>
          <span><i className="legend-dot amber" /> service / storage action</span>
        </div>
      </div>
      {stage === 4 && (
        <div className="gallery-runtime-note">
          <b>TWO RUNTIME PATHS</b>
          <span>Page + images: Browser → CloudFront → private S3</span>
          <span>Metadata: Browser → API Gateway → Lambda → S3</span>
          <em>The static page is loaded first; its JavaScript then makes the API request.</em>
        </div>
      )}

      <div className="gallery-live-map-canvas">
        <div className="gallery-grid-overlay" />
        <svg className="gallery-flow-svg" viewBox="0 0 1000 430" role="img" aria-label={`Live traffic flow for stage ${stage}`}>
          <defs>
            <filter id="gallery-flow-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {paths.map((flow) => (
            <g key={flow.id}>
              <path d={flow.d} className={`gallery-path gallery-path-${flow.tone ?? 'teal'}`} />
              <path d={flow.d} className="gallery-path-highlight" pathLength="1" />
              <circle r="4.5" className={`gallery-packet gallery-packet-${flow.tone ?? 'teal'}`} filter="url(#gallery-flow-glow)">
                <animateMotion
                  dur={flow.duration ?? '2.8s'}
                  begin={flow.delay ?? '0s'}
                  repeatCount="indefinite"
                  path={flow.d}
                />
              </circle>
              <g className="gallery-path-label" transform="translate(0 0)">
                <text>{flow.label}</text>
              </g>
            </g>
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`gallery-live-node ${node.accent ? 'accent' : ''} ${node.muted ? 'muted' : ''}`}
            style={{ left: `${node.x / 10}%`, top: `${node.y / 4.3}%` }}
          >
            <span className="gallery-live-node-badge">{node.badge}</span>
            <div className="gallery-live-node-icon">{node.id === 'browser' ? '◉' : node.id === 'cf' ? '↯' : node.id === 'api' ? 'λ' : node.id === 'lambda' ? 'ƒ' : node.id === 's3' ? '▱' : node.id === 'objects' || node.id === 'data' || node.id === 'index' ? '≡' : '□'}</div>
            <strong>{node.title}</strong>
            <small>{node.subtitle}</small>
          </div>
        ))}

        <div className="gallery-live-flow-status">
          <span className="live-pulse" />
          traffic is moving
          <b>·</b>
          {imageAdded ? 'IMG-042 is in the flow' : '4 live objects'}
        </div>
      </div>
    </div>
  )
}

function Trace({ stage, imageAdded }: { stage: GalleryStage; imageAdded: boolean }) {
  const lines = stage === 1
    ? ['$ fetch gallery-index.json', '→ static file read', imageAdded ? '→ IMG-042 is missing from index' : '→ 4 images rendered']
    : stage === 2
      ? ['$ python generate_index.py', '→ scan images/', imageAdded ? '→ add IMG-042 to metadata' : '→ metadata is current', '→ upload gallery-index.json']
      : stage === 3
        ? ['$ GET /images?date=2025-08-29', '→ API Gateway', '→ Lambda: ListObjectsV2', imageAdded ? '→ 5 objects returned' : '→ 4 objects returned', '→ browser renders current list']
        : ['$ GET /index.html + script.js', '→ CloudFront edge → private S3 via OAC', '→ browser runs script.js', '→ GET /images?date=2025-08-29', '→ API Gateway → Lambda → S3 ListObjectsV2', imageAdded ? '→ JSON metadata includes 5 objects' : '→ JSON metadata includes 4 objects', '→ browser requests image URLs through CloudFront']
  return <>{lines.map((line, index) => <div key={`${stage}-${index}`} className={`terminal-line ${index === lines.length - 1 ? 'ok' : ''}`}>{line}</div>)}</>
}

function Node({ title, subtitle, icon, accent, muted }: { title: string; subtitle: string; icon: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className={`gallery-node ${accent ? 'accent' : ''} ${muted ? 'muted' : ''}`}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{subtitle}</small>
    </div>
  )
}

function Arrow({ label }: { label?: string }) {
  return <div className="gallery-arrow"><span>{label ?? '→'}</span></div>
}

function OutcomeCard({ stage, title, status, active }: { stage: number; title: string; status: string; active: boolean }) {
  return (
    <button type="button" className={`gallery-outcome ${active ? 'active' : ''}`}>
      <span>0{stage}</span>
      <strong>{title}</strong>
      <small>{status}</small>
    </button>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="decision-fact">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}
