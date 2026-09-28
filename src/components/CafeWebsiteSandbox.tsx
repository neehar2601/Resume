import { useEffect, useMemo, useState } from 'react'

type ArchitectureLevel = 1 | 2 | 3 | 4 | 5 | 6

type Decision = {
  id: ArchitectureLevel
  title: string
  short: string
  problem: string
  choice: string
  solved: string
  tradeoff: string
}

const decisions: Decision[] = [
  {
    id: 1,
    title: 'Static website on S3',
    short: 'STATIC',
    problem: 'The owner only wants to advertise the café and needs a very low-cost website.',
    choice: 'Host the static HTML/CSS/JS directly from Amazon S3 instead of paying for always-on compute.',
    solved: 'Low-cost hosting with almost no operational burden.',
    tradeoff: 'No server-side application logic for online ordering yet.',
  },
  {
    id: 2,
    title: 'Dynamic app on EC2',
    short: 'DYNAMIC',
    problem: 'The café becomes popular and now needs online ordering and application logic.',
    choice: 'Introduce a small EC2 web server while keeping the relational database isolated in a private subnet.',
    solved: 'A simple path from static content to a working dynamic web application.',
    tradeoff: 'The web tier is still a single host and capacity is manually managed.',
  },
  {
    id: 3,
    title: 'Migrate the database to RDS',
    short: 'MANAGED DATA',
    problem: 'The database starts consuming operator time for backups, patching, recovery and failure handling.',
    choice: 'Move the relational data layer to Amazon RDS and keep the database private inside the VPC.',
    solved: 'Removes much of the routine database administration and improves the recovery story.',
    tradeoff: 'The application now depends on managed-service networking, sizing and database cost.',
  },
  {
    id: 4,
    title: 'ALB + Auto Scaling',
    short: 'HIGH AVAILABILITY',
    problem: 'One EC2 web server becomes a bottleneck and creates a single point of failure.',
    choice: 'Put an Application Load Balancer in public subnets and run multiple web instances behind it with Auto Scaling.',
    solved: 'Traffic is distributed across healthy instances and capacity can expand with demand.',
    tradeoff: 'More moving parts, health checks and scaling policies to operate.',
  },
  {
    id: 5,
    title: 'Secure two-stage reporting',
    short: 'SERVERLESS REPORTING',
    problem: 'Someone manually extracting database data every day wastes time and gives reporting code unnecessary database access.',
    choice: 'Schedule Lambda 1 to read and process data with least-privilege DB access, then invoke Lambda 2 with only the processed payload; Lambda 2 formats the report and publishes it to an SNS topic subscribed by stakeholders.',
    solved: 'Separates database access from email delivery and keeps the second function outside the database trust boundary.',
    tradeoff: 'A direct two-function flow is simple, but a growing or failure-sensitive workflow may later benefit from a queue between the functions.',
  },
  {
    id: 6,
    title: 'Infrastructure as Code with CloudFormation',
    short: 'REPLICABLE INFRA',
    problem: 'The architecture is growing, and rebuilding the same network, compute, database and supporting resources manually in another Region is slow and error-prone.',
    choice: 'Define the infrastructure as a CloudFormation template and deploy the stack with Region-specific parameters so the same architecture can be reproduced consistently.',
    solved: 'Makes the infrastructure repeatable and easier to reproduce across Regions without rebuilding every resource by hand.',
    tradeoff: 'Templates need careful parameterization and resource compatibility for each Region, and CloudFormation replicates infrastructure definitions—not application data.',
  },
]

const configSnippets: Record<string, string> = {
  s3: `resource "aws_s3_bucket" "cafe_site" {\n  bucket = "cafe-static-site"\n}\n\n# Static site assets only\n# No always-on compute required`,
  ec2: `resource "aws_instance" "cafe_web" {\n  ami           = var.ami_id\n  instance_type = "t3.micro"\n  subnet_id     = aws_subnet.public_app.id\n\n  tags = {\n    Name = "cafe-web"\n  }\n}`,
  rds: `resource "aws_db_instance" "cafe" {\n  engine         = "mysql"\n  instance_class = "db.t3.micro"\n  subnet_group_name = aws_db_subnet_group.cafe.name\n  publicly_accessible = false\n}`,
  security: `VPC
├─ Public Subnets
│  └─ ALB
│     └─ ALB-SG: 80/443 from Internet
│
├─ Private App Subnets
│  └─ EC2 Auto Scaling Group
│     └─ EC2-SG: app port from ALB-SG only
│
└─ Private DB Subnets
   └─ RDS
      └─ RDS-SG: DB port from EC2-SG only

Blocked paths
Internet ──X──> EC2
Internet ──X──> RDS

Reporting IAM
Lambda 1 → RDS / Secrets → Lambda 2
Lambda 2 → SNS

# Baseline reporting path does not require SQS`,
  ha: `resource "aws_lb" "cafe" {\n  load_balancer_type = "application"\n  subnets            = var.public_subnets\n}\n\nresource "aws_autoscaling_group" "cafe" {\n  min_size = 2\n  max_size = 6\n  desired_capacity = 2\n}`,
  reporting: `EventBridge schedule\n        │\n        ▼\n   Lambda 1\n   ├─ read DB\n   ├─ Secrets Manager\n   ├─ transform data\n   └─ invoke Lambda 2\n        │\n        ▼\n   Lambda 2\n   ├─ NO DB permission\n   └─ SNS Publish\n        │\n        ▼\n   Stakeholders\n\n# Optional hardening later:
# Lambda 1 → SQS → Lambda 2\n# for buffering / retries / DLQ`,
  iac: `AWSTemplateFormatVersion: '2010-09-09'\nParameters:\n  EnvironmentName:\n    Type: String\n    Default: cafe\n\nResources:\n  VPC:\n    Type: AWS::EC2::VPC\n    Properties:\n      CidrBlock: 10.0.0.0/16\n\n  WebAutoScalingGroup:\n    Type: AWS::AutoScaling::AutoScalingGroup\n\n  CafeDatabase:\n    Type: AWS::RDS::DBInstance\n\n# Deploy this same template as a stack\n# in another Region with Region-specific parameters`,
}

export function CafeWebsiteSandbox() {
  const [level, setLevel] = useState<ArchitectureLevel>(4)
  const [traffic, setTraffic] = useState(38)
  const [transitioning, setTransitioning] = useState(false)
  const [activeConfig, setActiveConfig] = useState('ha')
  const [reportRuns, setReportRuns] = useState(0)
  const [lastReport, setLastReport] = useState('not run')
  const [question, setQuestion] = useState('why')
  const [securityFocus, setSecurityFocus] = useState<'overview' | 'alb' | 'ec2' | 'rds' | 'lambda'>('overview')

  const current = decisions[level - 1]
  const hasAlb = level >= 4
  const hasRds = level >= 3
  const hasReporting = level >= 5
    const instanceCount = level < 4 ? 1 : traffic < 58 ? 2 : traffic < 82 ? 3 : 5

  const metrics = useMemo(() => {
    const requests = Math.round(160 + traffic * 30)
    const cpu = level < 4
      ? Math.min(96, 26 + traffic * 0.95)
      : Math.min(91, 17 + traffic * 0.78 / instanceCount)
    const latency = level < 4
      ? Math.round(105 + traffic * 2.15)
      : Math.max(58, Math.round(86 + traffic * 0.92 / instanceCount))
    const dbConnections = hasRds ? Math.round(12 + traffic * 0.54) : 0
    const queueDepth = hasReporting ? Math.max(0, Math.round((traffic - 45) * 0.22)) : 0
    const healthy = latency < 180 && cpu < 82
    return { requests, cpu, latency, dbConnections, queueDepth, healthy }
  }, [traffic, level, instanceCount, hasRds, hasReporting])

  useEffect(() => {
    if (!transitioning) return
    const timer = window.setTimeout(() => setTransitioning(false), 500)
    return () => window.clearTimeout(timer)
  }, [transitioning])

  const evolveTo = (next: ArchitectureLevel) => {
    if (next === level) return
    setTransitioning(true)
    window.setTimeout(() => setLevel(next), 160)
  }

  const runTrafficBurst = () => setTraffic((value) => Math.min(100, value + 18))
  const resetTraffic = () => setTraffic(38)

  const runLambdaReport = () => {
    if (!hasReporting) return
    setReportRuns((count) => count + 1)
    setLastReport('just now')
  }

  return (
    <div className="cafe-shell">
      <header className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <a className="brand" href="/">neehara<span className="brand-dot">.</span>nellikalaya</a>
          <div className="sandbox-breadcrumb">LAB / AWS ARCHITECTURE / CAFE WEBSITE / v2.9</div>
          <a className="sandbox-back" href="/">← portfolio</a>
        </div>
      </header>

      <main>
        <section className="sandbox-hero section">
          <div className="container">
            <div className="sandbox-title-row">
              <div>
                <div className="kicker"><span className="kicker-dot" /> architecture + design thinking lab</div>
                <h1>Why this café architecture evolved the way it did.</h1>
                <p>
                  This is not a list of AWS services. It is a decision trail: each layer appears because the previous architecture created a concrete problem in cost, capability, operations, availability or security.
                </p>
              </div>
              <div className="cafe-status"><span /> {current.short}</div>
            </div>

            <div className="cafe-evolution-bar">
              {decisions.map((item) => (
                <button key={item.id} className={`evolution-step ${item.id === level ? 'active' : ''} ${item.id < level ? 'done' : ''}`} type="button" onClick={() => evolveTo(item.id)}>
                  <span>{String(item.id).padStart(2, '0')}</span>
                  <div><strong>{item.title}</strong><small>{item.problem}</small></div>
                </button>
              ))}
            </div>

            <div className="cafe-decision-card">
              <div className="decision-kicker">decision {String(current.id).padStart(2, '0')} / {current.short}</div>
              <h2>{current.title}</h2>
              <div className="decision-grid">
                <DecisionColumn title="PROBLEM" text={current.problem} />
                <DecisionColumn title="WHY THIS CHOICE" text={current.choice} />
                <DecisionColumn title="PROBLEM SOLVED" text={current.solved} />
                <DecisionColumn title="TRADE-OFF" text={current.tradeoff} />
              </div>
            </div>

            <div className="cafe-architecture-card">
              <div className="cafe-arch-heading">
                <div>
                  <span className="control-label">reference architecture at current stage</span>
                  <strong>{level < 6 ? 'single-region production shape' : 'repeatable infrastructure / regional deployment'}</strong>
                </div>
                <div className="arch-badge">{transitioning ? 'UPDATING DESIGN' : 'SIMULATION READY'}</div>
              </div>

              {level < 6 ? <CurrentArchitecture level={level} instanceCount={instanceCount} hasAlb={hasAlb} hasRds={hasRds} hasReporting={hasReporting} /> : <InfrastructureAsCodeArchitecture />}

              <div className="architecture-note">
                <span>Design principle</span>
                <p>CloudWatch stays beside the architecture as an operational plane rather than becoming a step in the request path. Infrastructure-as-code is treated as an overlay across every stage.</p>
              </div>
            </div>

            <div className="cafe-control-grid">
              <div className="cafe-control-card">
                <div className="loop-card-heading"><span>traffic simulator</span><b>{traffic} load</b></div>
                <input className="traffic-slider" type="range" min="0" max="100" value={traffic} onChange={(event) => setTraffic(Number(event.target.value))} />
                <div className="slider-labels"><span>low</span><span>high</span></div>
                <div className="cafe-button-row">
                  <button className="button primary" type="button" onClick={runTrafficBurst}>⚡ traffic burst</button>
                  <button className="button" type="button" onClick={resetTraffic}>reset traffic</button>
                </div>
              </div>

              <div className="cafe-control-card">
                <div className="loop-card-heading"><span>capacity response</span><b>{level >= 4 ? `${instanceCount} web nodes` : '1 web node'}</b></div>
                <p className="cafe-control-copy">{level >= 4 ? 'ALB + Auto Scaling distribute requests across healthy web instances as demand changes.' : 'A single web host models the early low-cost architecture before horizontal scaling is justified.'}</p>
                <div className={`scale-state ${level >= 4 ? 'enabled' : ''}`}><i /> {level >= 4 ? 'HORIZONTAL SCALE ACTIVE' : 'SINGLE HOST'}</div>
              </div>
            </div>

            <div className="cafe-metrics-grid">
              <CafeMetric label="requests / min" value={`${metrics.requests}`} hint="modeled traffic" />
              <CafeMetric label="web CPU" value={`${metrics.cpu.toFixed(0)}%`} hint={metrics.cpu > 82 ? 'scale pressure' : 'within capacity'} tone={metrics.cpu > 82 ? 'warn' : ''} />
              <CafeMetric label="response time" value={`${metrics.latency}ms`} hint={metrics.healthy ? 'healthy path' : 'degraded'} tone={metrics.healthy ? '' : 'warn'} />
              <CafeMetric label="RDS connections" value={hasRds ? `${metrics.dbConnections}` : '—'} hint={hasRds ? 'private managed DB' : 'not deployed'} />
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading"><span>01 / architecture reasoning</span><h2>Ask the questions an architect should ask.</h2></div>
            <div className="reasoning-panel">
              <div className="reasoning-tabs">
                <button className={question === 'why' ? 'active' : ''} type="button" onClick={() => setQuestion('why')}>Why did we add this?</button>
                <button className={question === 'security' ? 'active' : ''} type="button" onClick={() => setQuestion('security')}>What is protected?</button>
                <button className={question === 'tradeoff' ? 'active' : ''} type="button" onClick={() => setQuestion('tradeoff')}>What did we trade?</button>
                <button className={question === 'next' ? 'active' : ''} type="button" onClick={() => setQuestion('next')}>What would change next?</button>
              </div>
              <div className="reasoning-content">
                {question === 'why' && <Reasoning title="Architecture should follow pressure, not the other way around." text="The project deliberately does not begin with a 15-service AWS diagram. Start small, then introduce the next service when a real requirement justifies the added cost and operational complexity." />}
                {question === 'security' && <Reasoning title="The final request path is intentionally separated into trust zones." text="ALB is the public entry point. The web tier is isolated from direct internet access once the load-balanced architecture is introduced. RDS remains private. The reporting path uses a separate permission boundary so the email-sending function does not need database credentials." />}
                {question === 'tradeoff' && <Reasoning title="Every improvement adds some complexity." text="RDS removes database administration but introduces managed-service cost. ALB + Auto Scaling improves availability but adds health checks and scaling policy. The direct Lambda 1 → Lambda 2 flow is intentionally simple; SQS becomes a trade-off only when buffering, independent retries or DLQ handling are worth the added component." />}
                {question === 'next' && <Reasoning title="The next move is repeatable infrastructure when regional expansion becomes a requirement." text="CloudFormation lets us define the infrastructure once and deploy the same architecture as a stack in another Region with Region-specific parameters. It does not replicate application data; the database/data layer still needs its own regional strategy." />}
              </div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container">
            <div className="sandbox-section-heading"><span>02 / security + traffic design</span><h2>Control the entry point, isolate the data, split reporting permissions.</h2></div>

            <div className="security-design-layout">
              <div className="security-architecture-panel">
                <div className="security-arch-title-row">
                  <div>
                    <span className="control-label">network trust zones</span>
                    <strong>VPC boundary + public ALB + private application + private database</strong>
                  </div>
                  <div className="arch-badge">INTERACTIVE</div>
                </div>
                <div className="vpc-diagram">
                  <div className="internet-zone">
                    <span className="zone-label">INTERNET</span>
                    <div className="security-chip external">users</div>
                  </div>
                  <div className="security-arrow">↓</div>
                  <div className="vpc-box">
                    <div className="vpc-label">VPC · 10.0.0.0/16</div>
                    <div className="subnet-columns">
                      <div className="subnet-box public">
                        <span className="zone-label">PUBLIC SUBNETS</span>
                        <button type="button" className={`security-node-button ${securityFocus === 'alb' || securityFocus === 'overview' ? 'selected' : ''}`} onClick={() => setSecurityFocus('alb')}>
                          <span>ALB</span><small>public entry point</small><b>ALB-SG</b>
                        </button>
                      </div>
                      <div className="subnet-box private">
                        <span className="zone-label">PRIVATE APP SUBNETS</span>
                        <button type="button" className={`security-node-button ${securityFocus === 'ec2' ? 'selected' : ''}`} onClick={() => setSecurityFocus('ec2')}>
                          <span>EC2 WEB × {instanceCount}</span><small>application tier</small><b>EC2-SG</b>
                        </button>
                      </div>
                      <div className="subnet-box database">
                        <span className="zone-label">PRIVATE DB SUBNETS</span>
                        <button type="button" className={`security-node-button ${securityFocus === 'rds' ? 'selected' : ''}`} onClick={() => setSecurityFocus('rds')}>
                          <span>RDS</span><small>managed relational data</small><b>RDS-SG</b>
                        </button>
                      </div>
                    </div>
                    <div className="security-allow-grid">
                      <SecurityPath label="Internet → ALB" rule="80 / 443" allowed />
                      <SecurityPath label="ALB → EC2" rule="application port" allowed />
                      <SecurityPath label="EC2 → RDS" rule="database port" allowed />
                      <SecurityPath label="Internet → EC2" rule="direct access" />
                      <SecurityPath label="Internet → RDS" rule="direct access" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="security-inspector">
                <div className="inspector-tabs">
                  {([
                    ['overview', 'Flow'],
                    ['alb', 'ALB'],
                    ['ec2', 'EC2-SG'],
                    ['rds', 'RDS-SG'],
                    ['lambda', '2× Lambda'],
                  ] as const).map(([id, label]) => (
                    <button key={id} type="button" className={securityFocus === id ? 'active' : ''} onClick={() => setSecurityFocus(id)}>{label}</button>
                  ))}
                </div>
                {securityFocus === 'overview' && <SecurityInspector title="Why these boundaries?" lines={[
                  'The ALB is the single public entry point for web traffic.',
                  'EC2 instances sit in private application subnets and accept traffic from the ALB security group.',
                  'RDS is isolated in private database subnets and accepts database traffic only from the application tier.',
                  'The reporting Lambdas use separate IAM permission boundaries from this network path.',
                ]} />}
                {securityFocus === 'alb' && <SecurityInspector title="ALB design" lines={[
                  'Public-facing Application Load Balancer across public subnets.',
                  'Its security group is the controlled client entry point for web traffic.',
                  'Target group health checks remove unhealthy instances from rotation.',
                  'Auto Scaling adds or removes EC2 capacity behind the ALB as demand changes.',
                ]} />}
                {securityFocus === 'ec2' && <SecurityInspector title="EC2 security group" lines={[
                  'No direct public ingress is required for the web instances.',
                  'Inbound application traffic is allowed from ALB-SG rather than from the open Internet.',
                  'The same EC2-SG pattern applies to every instance launched by Auto Scaling.',
                  'This keeps the application tier behind a single controlled entry point.',
                ]} />}
                {securityFocus === 'rds' && <SecurityInspector title="RDS security group" lines={[
                  'RDS remains private and is not directly reachable from the Internet.',
                  'Database ingress is restricted to the EC2 application security group.',
                  'The application tier becomes the explicit trust boundary for database access.',
                  'The database layer is separated from the public web entry point.',
                ]} />}
                {securityFocus === 'lambda' && <SecurityInspector title="Two-Lambda permission boundary" lines={[
                  'Lambda 1: read/process data, retrieve required secrets, and invoke Lambda 2.',
                  'Lambda 2: receive the processed payload and publish the report to SNS.',
                  'Lambda 2 has no database permission, so report delivery does not create a second DB credential path.',
                  'SQS is intentionally absent from the baseline path; it is a future resilience option.',
                ]} />}
              </div>
            </div>

            <div className="security-reporting-block">
              <div className="sandbox-section-heading compact-heading"><span>reporting trust boundary</span><h3>Network controls and IAM controls solve different problems.</h3></div>
              <div className="reporting-flow">
                <ReportingNode title="EventBridge" subtitle="daily schedule" icon="EV" />
                <ReportingArrow />
                <ReportingNode title="Lambda 1" subtitle="RDS read + process" icon="L1" emphasis />
                <ReportingArrow />
                <ReportingNode title="Lambda 2" subtitle="no DB access" icon="L2" />
                <ReportingArrow />
                <ReportingNode title="SNS" subtitle="stakeholder email" icon="SN" />
              </div>
              <div className="trust-grid">
                <TrustCard title="NETWORK" access="VPC + subnets + SGs" note="ALB, EC2 and RDS are separated into traffic zones with explicit security-group paths." />
                <TrustCard title="LAMBDA 1 ROLE" access="DB read + secrets + invoke" note="The data-processing function is the only reporting function allowed to cross into the data boundary." />
                <TrustCard title="LAMBDA 2 ROLE" access="SNS publish only" note="The delivery function cannot query the database; it only publishes the already-processed report." />
              </div>
              <div className="architecture-note security-note"><span>Design principle</span><p>Use network segmentation for the request path and IAM least privilege for the reporting path. Two Lambdas are not valuable by themselves; the value is that each function gets a narrower responsibility and narrower permission set.</p></div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container sandbox-two-col">
            <div>
              <div className="sandbox-section-heading"><span>03 / workload simulation</span><h2>Watch the architecture react.</h2></div>
              <div className="cafe-ops-grid single-column">
                <div className="ops-card">
                  <div className="ops-heading"><span>capacity</span><b>{hasAlb ? 'ALB + ASG modeled' : 'single host modeled'}</b></div>
                  <div className="watch-lines">
                    <div><span>EC2 web nodes</span><strong>{instanceCount}</strong></div>
                    <div><span>EC2 CPU</span><strong>{metrics.cpu.toFixed(0)}%</strong></div>
                    <div><span>request latency</span><strong>{metrics.latency}ms</strong></div>
                    <div><span>RDS connections</span><strong>{hasRds ? metrics.dbConnections : '—'}</strong></div>
                  </div>
                </div>
                <div className="ops-card">
                  <div className="ops-heading"><span>daily reporting</span><b>{hasReporting ? 'active design' : 'available in stage 05'}</b></div>
                  <p>Manually exporting reports is replaced by scheduled extraction, processing and email delivery.</p>
                  <div className="ops-stat"><span>last report</span><strong>{lastReport}</strong></div>
                  <div className="ops-stat"><span>simulated invocations</span><strong>{reportRuns}</strong></div>
                  <div className="ops-stat"><span>delivery mode</span><strong>{hasReporting ? 'Lambda 1 → Lambda 2' : '—'}</strong></div>
                  <div className="ops-stat"><span>optional SQS hardening</span><strong>{hasReporting ? 'not required' : '—'}</strong></div>
                  <button className="button primary" type="button" onClick={runLambdaReport} disabled={!hasReporting}>{hasReporting ? '▶ run report flow' : 'advance to reporting stage'}</button>
                </div>
              </div>
            </div>
            <div>
              <div className="sandbox-section-heading"><span>04 / observability</span><h2>CloudWatch stays alongside the architecture.</h2></div>
              <div className="experiment-card">
                <div className="experiment-step"><b>ALB</b><div><strong>Request + target health</strong><p>{hasAlb ? `${metrics.requests} req/min modeled across healthy web targets.` : 'Not introduced until the load-balanced stage.'}</p></div></div>
                <div className="experiment-step"><b>EC2</b><div><strong>CPU + capacity pressure</strong><p>{metrics.cpu.toFixed(0)}% modeled CPU with {instanceCount} web node{instanceCount === 1 ? '' : 's'}.</p></div></div>
                <div className="experiment-step"><b>RDS</b><div><strong>Connection pressure</strong><p>{hasRds ? `${metrics.dbConnections} modeled connections in the private database tier.` : 'Database is not yet managed by RDS at this stage.'}</p></div></div>
                <div className="experiment-step"><b>λ</b><div><strong>Serverless workflow</strong><p>{hasReporting ? `${reportRuns} simulated report run${reportRuns === 1 ? '' : 's'}; direct function invocation in the baseline path.` : 'Reporting becomes serverless in stage 05.'}</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section">
          <div className="container sandbox-two-col">
            <div>
              <div className="sandbox-section-heading"><span>05 / configuration</span><h2>Inspect the design as code.</h2></div>
              <div className="config-tabs">
                {Object.entries({ s3: 'S3', ec2: 'EC2', rds: 'RDS', ha: 'ALB + ASG', security: 'VPC + Security Groups', reporting: '2× Lambda', iac: 'CloudFormation / IaC' }).map(([id, label]) => (
                  <button key={id} className={activeConfig === id ? 'active' : ''} type="button" onClick={() => setActiveConfig(id)}>{label}</button>
                ))}
              </div>
              <pre className="config-code"><code>{configSnippets[activeConfig]}</code></pre>
            </div>
            <div>
              <div className="sandbox-section-heading"><span>06 / architecture interview</span><h2>Questions this project should answer.</h2></div>
              <div className="question-list">
                <Question text="Why S3 instead of EC2 at the beginning?" />
                <Question text="Why is the database private?" />
                <Question text="Why RDS instead of self-managed MySQL?" />
                <Question text="Why ALB + Auto Scaling instead of a bigger EC2 instance?" />
                <Question text="Why split the reporting workflow into two Lambdas?" />
                <Question text="Do we actually need SQS between the functions?" />
                <Question text="How does CloudFormation help us reproduce this architecture in another Region?" />
                <Question text="What would you deliberately NOT add yet, and why?" />
              </div>
            </div>
          </div>
        </section>

        <section className="section sandbox-section sandbox-footer-section">
          <div className="container sandbox-disclaimer">
            <span className="kicker-dot" />
            <span>This is a browser simulation. It does not create or connect to live AWS resources, billing accounts or customer traffic. The CloudFormation step is presented as a future repeatable-infrastructure evolution. CloudFormation reproduces infrastructure definitions; it does not replicate application data across Regions.</span>
          </div>
        </section>
      </main>
    </div>
  )
}

function CurrentArchitecture({ level, instanceCount, hasAlb, hasRds, hasReporting }: { level: ArchitectureLevel; instanceCount: number; hasAlb: boolean; hasRds: boolean; hasReporting: boolean }) {
  return (
    <>
      <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
        <div className="cafe-flow current-arch-flow" style={{ width: 'max-content' }}>
        <CafeNode title="Users" subtitle="internet traffic" icon="U" active />
        <CafeArrow />
        {level === 1 ? (
          <CafeNode title="S3 Bucket" subtitle="static website hosting" icon="S3" active />
        ) : (
          <>
            {hasAlb && (
              <>
                <CafeNode title="ALB" subtitle="public subnets" icon="LB" active />
                <CafeArrow />
              </>
            )}
            {level === 2 ? (
              <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', border: '1px solid rgba(79, 209, 197, 0.3)', borderRadius: '12px', background: 'rgba(12, 22, 29, 0.8)', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-8px', left: '12px', background: '#0a0f15', padding: '0 6px', fontSize: '8px', color: 'var(--teal)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Single EC2 Host</span>
                <CafeNode title="Web Server" subtitle="dynamic app" icon="EC2" active />
                <CafeNode title="Local DB" subtitle="on same host" icon="DB" active />
              </div>
            ) : (
              <CafeNode title={`EC2 Web × ${instanceCount}`} subtitle={hasAlb ? 'private app subnets' : 'early app host'} icon="EC2" active />
            )}
            {hasRds && (
              <>
                <CafeArrow />
                <CafeNode title="RDS" subtitle="private subnet" icon="DB" active />
              </>
            )}
          </>
        )}
      </div>
      {hasReporting && (
        <>
          <div className="flow-branch-label" style={{ marginTop: '24px' }}>scheduled reporting branch</div>
          <div className="reporting-mini-flow" style={{ overflow: 'visible', width: 'max-content', paddingTop: '16px' }}>
            <div style={{ visibility: 'hidden', display: 'flex', alignItems: 'center' }}>
               <CafeNode title="Users" subtitle="internet traffic" icon="U" />
               <CafeArrow />
               <CafeNode title="ALB" subtitle="public subnets" icon="LB" />
               <CafeArrow />
            </div>
            
            <CafeNode title="EventBridge" subtitle="daily trigger" icon="EV" active />
            <CafeArrow />
            
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-60px', left: '50%', height: '60px', borderLeft: '2px dashed var(--amber)', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', top: '-42px', left: '16px', color: 'var(--amber)', fontSize: '9px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--panel)' }}>↑ Queries DB</div>
              <CafeNode title="Lambda 1" subtitle="DB read + process" icon="L1" active />
            </div>
            
            <CafeArrow />
            <CafeNode title="Lambda 2" subtitle="email only" icon="L2" active />
            <CafeArrow />
            <CafeNode title="SNS" subtitle="email subscribers" icon="SN" active />
          </div>
        </>
      )}
      </div>
      <div className="ops-plane">
        <span>OBSERVE</span><strong>CloudWatch</strong><small>ALB • EC2 • RDS • Lambda</small>
      </div>
      <div className="iac-plane">
        <span>DEFINE</span><strong>CloudFormation</strong><small>Infrastructure as code overlays the architecture</small>
      </div>
    </>
  )
}

function InfrastructureAsCodeArchitecture() {
  return (
    <>
      <div className="global-edge-diagram">
        <div className="edge-node"><span>INFRASTRUCTURE DEFINITION</span><strong>CloudFormation</strong><small>template + parameters</small></div>
        <div className="edge-arrow">↓</div>
        <div className="origin-group-card">
          <span>REPEATABLE REGIONAL STACKS</span>
          <div className="origin-pair">
            <div className="region-card"><span>REGION A</span><strong>STACK A</strong><small>VPC • ALB • ASG • RDS</small><b>deployed</b></div>
            <div className="region-card"><span>REGION B</span><strong>STACK B</strong><small>same template, new parameters</small><b>reproducible</b></div>
          </div>
        </div>
      </div>
      <div className="global-routing">same CloudFormation template → repeatable regional infrastructure</div>
      <div className="architecture-note"><span>Important distinction</span><p>CloudFormation lets us reproduce the infrastructure architecture as a stack in another Region. It does not copy existing database rows or application state; data replication and regional traffic strategy remain separate architecture concerns.</p></div>
    </>
  )
}

function SecurityPath({ label, rule, allowed = false }: { label: string; rule: string; allowed?: boolean }) {
  return <div className={`security-path ${allowed ? 'allowed' : 'blocked'}`}><span>{allowed ? '✓' : '×'}</span><div><strong>{label}</strong><small>{rule}</small></div></div>
}

function SecurityInspector({ title, lines }: { title: string; lines: string[] }) {
  return <div className="security-inspector-content"><span className="control-label">inspection</span><h3>{title}</h3><div className="inspector-lines">{lines.map((line, index) => <div key={index}><i>{String(index + 1).padStart(2, '0')}</i><p>{line}</p></div>)}</div></div>
}

function DecisionColumn({ title, text }: { title: string; text: string }) {
  return <div className="decision-column"><span>{title}</span><p>{text}</p></div>
}

function Reasoning({ title, text }: { title: string; text: string }) {
  return <div><h3>{title}</h3><p>{text}</p></div>
}

function ReportingNode({ title, subtitle, icon, emphasis = false }: { title: string; subtitle: string; icon: string; emphasis?: boolean }) {
  return <div className={`reporting-node ${emphasis ? 'emphasis' : ''}`}><div>{icon}</div><strong>{title}</strong><span>{subtitle}</span></div>
}

function ReportingArrow() {
  return <div className="reporting-arrow">→</div>
}

function TrustCard({ title, access, note }: { title: string; access: string; note: string }) {
  return <div className="trust-card"><span>{title}</span><strong>{access}</strong><p>{note}</p></div>
}

function Question({ text }: { text: string }) {
  return <div className="question-item"><span>?</span><p>{text}</p></div>
}

function CafeNode({ title, subtitle, icon, active = false }: { title: string; subtitle: string; icon: string; active?: boolean }) {
  return <div className={`cafe-node ${active ? 'active' : ''}`}><div className="cafe-node-icon">{icon}</div><strong>{title}</strong><span>{subtitle}</span></div>
}

function CafeArrow() {
  return <div className="cafe-arrow" aria-hidden="true">→</div>
}

function CafeMetric({ label, value, hint, tone = '' }: { label: string; value: string; hint: string; tone?: string }) {
  return <div className="metric-card cafe-metric"><div className="metric-head"><span>{label}</span></div><div className={`metric-value ${tone === 'warn' ? 'metric-bad' : ''}`}>{value}</div><div className="metric-sub">{hint}</div></div>
}
