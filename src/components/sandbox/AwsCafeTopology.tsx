import React, { useState } from 'react'

export type ArchitectureLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface AwsCafeTopologyProps {
  level: ArchitectureLevel
  instanceCount: number
  traffic: number
  hasAlb: boolean
  hasRds: boolean
  hasReporting: boolean
  onSelectLevel?: (level: ArchitectureLevel) => void
  onTrafficBurst?: () => void
  onResetTraffic?: () => void
  onRunReport?: () => void
  reportRuns?: number
}

type Tone = 'teal' | 'amber' | 'sky' | 'violet' | 'green' | 'red'

const TONE: Record<Tone, string> = {
  teal: '#4fd1c5',
  amber: '#e8a33d',
  sky: '#38bdf8',
  violet: '#a78bfa',
  green: '#86d993',
  red: '#ff5d5d',
}

const INK = '#edf2f7'
const MUTED = '#93a0b1'
const FAINT = '#5d6878'

type Line = string | { t: string; c: string }

interface Flow {
  id: string
  d: string
  tone: Tone
  on: boolean
  dur?: number
}

export const LEVEL_METADATA: Record<ArchitectureLevel, {
  tag: string
  title: string
  problem: string
  solution: string
  security: string
}> = {
  1: {
    tag: 'LEVEL 01 / STATIC HOSTING',
    title: 'Static Website on Amazon S3',
    problem: 'Owner needs a low-cost, zero-maintenance online presence for the café menu and business hours.',
    solution: 'Host static HTML/CSS/JS assets on Amazon S3 with Static Website Hosting enabled. No always-on compute or servers to manage.',
    security: 'Public read-only bucket policy for static assets. Zero server-side attack surface.',
  },
  2: {
    tag: 'LEVEL 02 / DYNAMIC APPLICATION',
    title: 'Dynamic Web Server on Amazon EC2 (Single Host)',
    problem: 'Customers demand online ordering and table booking, requiring backend application logic and a relational database.',
    solution: 'Deploy a single t3.micro EC2 instance in a public subnet hosting both the web backend and a local MySQL database.',
    security: 'Basic EC2 Security Group. Single point of failure; database is co-located with web application.',
  },
  3: {
    tag: 'LEVEL 03 / MANAGED DATA TIER',
    title: 'Database Migration to Amazon RDS in Private Subnet',
    problem: 'Co-located database consumes compute/memory, lacks automated backups, and creates severe data loss risk.',
    solution: 'Move MySQL to managed Amazon RDS placed in an isolated Private DB Subnet. EC2 connects across subnets via private IP.',
    security: 'RDS-SG allows port 3306 ONLY from EC2-SG. Database has NO public IP and zero direct internet access.',
  },
  4: {
    tag: 'LEVEL 04 / HIGH AVAILABILITY',
    title: 'Multi-AZ Application Load Balancer + Auto Scaling Group',
    problem: 'Single EC2 host is a throughput bottleneck and single point of failure. Traffic spikes degrade response times.',
    solution: 'ALB in Public Subnets across AZ-a & AZ-b routes traffic to an Auto Scaling Group in Private App Subnets. RDS has Multi-AZ Standby.',
    security: 'ALB-SG allows 80/443 from internet. EC2-SG allows port 8080 ONLY from ALB-SG. RDS-SG allows 3306 ONLY from EC2-SG.',
  },
  5: {
    tag: 'LEVEL 05 / SERVERLESS REPORTING',
    title: 'Two-Stage Least-Privilege Serverless Reporting Pipeline',
    problem: 'Store managers need daily sales summaries, but manual DB extraction is risky and granting DB credentials to reporting tools violates least privilege.',
    solution: 'EventBridge triggers Lambda 1 (VPC-attached, DB read access) to generate a summary. Lambda 1 calls Lambda 2 (outside VPC, email only) which publishes to Amazon SNS.',
    security: 'Least-Privilege Boundary: Lambda 2 has ZERO database credentials and NO VPC access. Compromising reporting cannot expose raw database.',
  },
  6: {
    tag: 'LEVEL 06 / INFRASTRUCTURE AS CODE',
    title: 'Reproducible Multi-Region Infrastructure with CloudFormation',
    problem: 'Rebuilding the VPC, subnets, ALB, ASG, RDS, and Lambda pipelines manually in another Region is slow, manual, and error-prone.',
    solution: 'Declarative CloudFormation template deployed as Stack A (us-east-1) and Stack B (us-west-2) using region-specific parameter files.',
    security: 'Automated, repeatable stack definition. Drift detection ensures security groups and routing remain strictly compliant.',
  },
}

const ARCH_STEPS: [string, string][] = [
  ['Internet Gateway & DNS', 'Route 53 directs traffic to the Public Subnet entry point: S3 website endpoint (L1) or ALB (L4+).'],
  ['VPC & Subnet Isolation', 'VPC 10.0.0.0/16 divided into Public (ALB), Private App (EC2), and Private DB (RDS) subnets across AZ-a and AZ-b.'],
  ['Application Load Balancer', 'ALB terminates HTTPS on port 443 and health-checks target groups, distributing requests evenly across healthy EC2 instances.'],
  ['EC2 Auto Scaling Group', 'Stateless web workers in private subnets scale horizontally from 2 to 6 instances based on CloudWatch CPU metrics.'],
  ['RDS Multi-AZ MySQL', 'Private DB subnet hosts Primary RDS in AZ-a with synchronous physical block replication to Standby in AZ-b.'],
  ['EventBridge Cron Trigger', 'Scheduled daily rule (cron 0 2 * * ? *) triggers the reporting workflow automatically without human intervention.'],
  ['Lambda 1: DB Reader (VPC)', 'VPC-attached Lambda securely reads sales rows using Secrets Manager and compiles sanitized JSON totals.'],
  ['Lambda 2: SNS Dispatcher', 'Runs outside VPC with NO database permissions; receives sanitized payload and publishes executive alert to SNS topic.'],
]

function FlowLine({ flow, index }: { flow: Flow; index: number }) {
  const color = TONE[flow.tone]
  const dur = flow.dur ?? 2.4
  const isTelemetry = flow.tone === 'sky'
  const packets = isTelemetry ? 1 : dur >= 3.2 ? 2 : 1
  const lineOpacity = flow.on ? (isTelemetry ? 0.45 : 1) : 0.15
  return (
    <g opacity={lineOpacity}>
      <path
        d={flow.d}
        fill="none"
        stroke={color}
        strokeWidth={flow.on ? (isTelemetry ? 1.4 : 2.1) : 1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={isTelemetry ? '3 5' : flow.on ? undefined : '4 6'}
        className={flow.on && !isTelemetry ? 'af-line-on' : undefined}
        markerEnd={`url(#aws-arrow-${flow.tone})`}
      />
      {flow.on && Array.from({ length: packets }).map((_, k) => (
        <circle key={k} r={isTelemetry ? 2.6 : 3.6} fill={color} filter="url(#aws-glow)" className="af-packet">
          <animateMotion
            dur={`${dur}s`}
            begin={`-${((index * 0.41 + (k * dur) / packets) % dur).toFixed(2)}s`}
            repeatCount="indefinite"
            path={flow.d}
          />
        </circle>
      ))}
    </g>
  )
}

function Pill({
  x,
  y,
  text,
  badge,
  tone,
  on = true,
}: {
  x: number
  y: number
  text?: string
  badge?: number
  tone: Tone
  on?: boolean
}) {
  const color = TONE[tone]
  const w = (text ? text.length * 5.9 : 0) + (badge !== undefined ? 22 : 0) + 14
  return (
    <g opacity={on ? 1 : 0.45} transform={`translate(${x - w / 2}, ${y - 9})`}>
      <rect width={w} height="18" rx="9" fill="#0a1018" stroke={color} strokeOpacity="0.75" />
      {badge !== undefined && (
        <>
          <circle cx="11" cy="9" r="7" fill={color} />
          <text x="11" y="12.3" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0a1018">
            {badge}
          </text>
        </>
      )}
      {text && (
        <text x={badge !== undefined ? 22 : 7} y="12.6" fontSize="10" fontWeight="700" fill={color}>
          {text}
        </text>
      )}
    </g>
  )
}

export function AwsCafeTopology({
  level,
  instanceCount,
  traffic,
  hasAlb,
  hasRds,
  hasReporting,
  onSelectLevel,
  onTrafficBurst,
  onResetTraffic,
  onRunReport,
  reportRuns = 0,
}: AwsCafeTopologyProps) {
  const meta = LEVEL_METADATA[level]

  // Calculated metrics
  const requests = Math.round(160 + traffic * 30)
  const cpu = level < 4 ? Math.min(96, 26 + traffic * 0.95) : Math.min(91, 17 + (traffic * 0.78) / instanceCount)
  const latency = level < 4 ? Math.round(105 + traffic * 2.15) : Math.max(58, Math.round(86 + (traffic * 0.92) / instanceCount))
  const dbConnections = hasRds ? Math.round(12 + traffic * 0.54) : 0

  // Flows definition based on level
  const flows: Flow[] = [
    // Level 1: Users to S3 directly
    { id: 'f-s3', d: 'M130 385 C145 385 155 220 200 220', tone: 'teal', on: level === 1, dur: 1.8 },
    // Levels 2+: Users to IGW -> ALB or EC2
    { id: 'f-users-igw', d: 'M130 385 L200 385', tone: 'teal', on: level >= 2, dur: 1.2 },
    // Level 2/3: IGW to single EC2
    { id: 'f-igw-single-ec2', d: 'M230 385 L320 385', tone: 'teal', on: level === 2 || level === 3, dur: 1.5 },
    // Level 4+: IGW to ALB
    { id: 'f-igw-alb', d: 'M230 385 L430 385', tone: 'teal', on: level >= 4, dur: 1.4 },
    // Level 4+: ALB to EC2 AZ-a
    { id: 'f-alb-ec2a', d: 'M480 430 C480 475 365 470 365 520', tone: 'teal', on: level >= 4, dur: 1.8 },
    // Level 4+: ALB to EC2 AZ-b
    { id: 'f-alb-ec2b', d: 'M560 430 C560 475 735 470 735 520', tone: 'teal', on: level >= 4, dur: 1.8 },
    // Level 3: Single EC2 to RDS Primary
    { id: 'f-ec2-rds-single', d: 'M365 430 C365 540 365 580 365 650', tone: 'amber', on: level === 3, dur: 1.8 },
    // Level 4+: EC2 AZ-a to RDS Primary
    { id: 'f-ec2a-rds', d: 'M365 600 L365 650', tone: 'amber', on: level >= 4, dur: 1.4 },
    // Level 4+: EC2 AZ-b to RDS Primary across AZ
    { id: 'f-ec2b-rds', d: 'M735 600 C735 635 465 630 465 665', tone: 'amber', on: level >= 4, dur: 2.2 },
    // Level 4+: RDS Multi-AZ Replication (Primary AZ-a -> Standby AZ-b)
    { id: 'f-rds-multiaz', d: 'M465 690 L650 690', tone: 'amber', on: level >= 4, dur: 2.8 },
    // Level 5+: EventBridge to Lambda 1
    { id: 'f-eb-l1', d: 'M1130 375 L1130 405', tone: 'violet', on: level >= 5, dur: 1.5 },
    // Level 5+: Lambda 1 reading RDS
    { id: 'f-l1-rds', d: 'M1045 445 C900 445 520 620 465 680', tone: 'violet', on: level >= 5, dur: 2.4 },
    // Level 5+: Lambda 1 payload to Lambda 2 (Least Privilege boundary)
    { id: 'f-l1-l2', d: 'M1130 485 L1130 545', tone: 'violet', on: level >= 5, dur: 1.2 },
    // Level 5+: Lambda 2 to SNS Topic
    { id: 'f-l2-sns', d: 'M1130 615 L1130 635', tone: 'violet', on: level >= 5, dur: 1.2 },
    // Level 5+: SNS to Subscribers
    { id: 'f-sns-subs', d: 'M1130 695 L1130 715', tone: 'violet', on: level >= 5, dur: 1.2 },
    // CloudWatch scraping telemetry
    { id: 'f-cw-ec2', d: 'M365 520 C365 320 950 200 1030 200', tone: 'sky', on: level >= 2, dur: 3.5 },
    { id: 'f-cw-rds', d: 'M465 650 C580 650 960 400 1030 220', tone: 'sky', on: level >= 3, dur: 3.8 },
  ]

  return (
    <div className="progressive-infra-canvas" style={{ marginTop: '1.5rem' }}>
      {/* ========================================================================= */}
      {/* 1. Header & Quick Interactive Level Switcher                              */}
      {/* ========================================================================= */}
      <div className="infra-header">
        <div className="infra-header-title">
          <span className="control-label">aws cloud infrastructure &amp; topology</span>
          <h3>Café Dynamic Architecture Evolution</h3>
          <p>
            From simple S3 static hosting to an <strong>enterprise Multi-AZ VPC</strong> with an Application Load Balancer, Auto Scaling EC2 instances, isolated Private RDS Multi-AZ database, and a <strong>least-privilege two-stage serverless reporting pipeline</strong>.
          </p>
        </div>

        {/* Toolbar */}
        <div className="infra-controls-toolbar">
          <div className="step-button-group">
            {([1, 2, 3, 4, 5, 6] as ArchitectureLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`button step-btn ${level === lvl ? 'primary' : ''}`}
                onClick={() => onSelectLevel?.(lvl)}
                title={`Switch to Level ${lvl}: ${LEVEL_METADATA[lvl].title}`}
              >
                {lvl === 1 && '01 · S3'}
                {lvl === 2 && '02 · EC2'}
                {lvl === 3 && '03 · RDS'}
                {lvl === 4 && '04 · ALB+ASG'}
                {lvl === 5 && '05 · Serverless'}
                {lvl === 6 && '06 · CloudFormation'}
              </button>
            ))}
            <button
              type="button"
              className="button step-btn"
              onClick={onTrafficBurst}
              title="Simulate sudden traffic spike (+18 load)"
            >
              ⚡ Burst Traffic
            </button>
            {hasReporting && (
              <button
                type="button"
                className="button step-btn primary"
                onClick={onRunReport}
                title="Execute daily sales reporting pipeline"
              >
                ▶ Run Report ({reportRuns})
              </button>
            )}
            <button
              type="button"
              className="button step-btn"
              onClick={onResetTraffic}
              title="Reset traffic to baseline"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Active Level Explainer Banner                                          */}
      {/* ========================================================================= */}
      <div className="active-stage-explainer-card">
        <div className="explainer-head">
          <div className="explainer-badges">
            <span className="stage-step-pill">{meta.tag}</span>
            <strong>{meta.title}</strong>
            <span className="explainer-loc">[Region: us-east-1 · VPC 10.0.0.0/16]</span>
          </div>
          <code className="explainer-cmd">
            {level === 1 && 'aws s3 website s3://cafe-static-site/ --index-document index.html'}
            {level === 2 && 'aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t3.micro'}
            {level === 3 && 'aws rds create-db-instance --db-subnet-group-name cafe-db-subnets --no-publicly-accessible'}
            {level === 4 && 'aws elbv2 create-load-balancer && aws autoscaling create-auto-scaling-group --min 2 --max 6'}
            {level === 5 && 'aws lambda invoke --function-name cafe-report-stage1-reader -> invoke stage2-publisher'}
            {level === 6 && 'aws cloudformation deploy --template-file template.yaml --stack-name cafe-prod-us-east-1'}
          </code>
        </div>
        <p className="explainer-desc">
          <strong>The Problem:</strong> {meta.problem} <strong>Design Decision:</strong> {meta.solution} <strong>Security Boundary:</strong> {meta.security}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. High-Fidelity SVG Topology Canvas                                      */}
      {/* ========================================================================= */}
      <div className="infra-svg-wrap">
        <svg
          className="infra-svg"
          viewBox="0 0 1280 840"
          role="img"
          aria-label="AWS Café Dynamic Website Topology Diagram"
        >
          <defs>
            <filter id="aws-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {(Object.keys(TONE) as Tone[]).map((t) => (
              <marker
                key={t}
                id={`aws-arrow-${t}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path d="M0 0 L10 5 L0 10 z" fill={TONE[t]} />
              </marker>
            ))}
          </defs>

          {/* ---------- Legend (Top Left) ---------- */}
          <text x="20" y="30" fontSize="9" letterSpacing="1.4" fill={FAINT}>
            AWS TOPOLOGY LEGEND
          </text>
          {([
            [20, 50, 'teal', 'User Web Traffic (HTTPS :443)'],
            [20, 70, 'amber', 'Internal DB Queries (:3306) & Multi-AZ Sync'],
            [20, 90, 'violet', 'Serverless Reporting (EventBridge ➔ Lambda ➔ SNS)'],
            [370, 50, 'sky', 'CloudWatch Telemetry & Metrics'],
            [370, 70, 'green', 'CloudFormation IaC Stack Automation'],
          ] as [number, number, Tone, string][]).map(([lx, ly, t, label]) => (
            <g key={label}>
              <line
                x1={lx}
                y1={ly}
                x2={lx + 24}
                y2={ly}
                stroke={TONE[t]}
                strokeWidth="2.2"
                markerEnd={`url(#aws-arrow-${t})`}
              />
              <text x={lx + 34} y={ly + 3.5} fontSize="9.5" fill={MUTED}>
                {label}
              </text>
            </g>
          ))}
          <rect x="370" y="82" width="20" height="14" rx="3" fill="rgba(255,255,255,0.03)" stroke={TONE.amber} />
          <text x="398" y="93" fontSize="9.5" fill={MUTED}>
            Private Subnet Isolation Barrier
          </text>

          {/* ---------- CloudFormation IaC Overlay Banner (Level 6) ---------- */}
          {level === 6 && (
            <g>
              <rect
                x="540"
                y="20"
                width="710"
                height="86"
                rx="10"
                fill="rgba(134,217,147,0.06)"
                stroke={TONE.green}
                strokeWidth="1.5"
              />
              <text x="555" y="42" fontSize="11" fontWeight="800" fill={TONE.green}>
                CLOUDFORMATION INFRASTRUCTURE AS CODE · REPEATABLE MULTI-REGION STACKS
              </text>
              <text x="555" y="60" fontSize="9.5" fill={INK}>
                Template: <tspan fill={TONE.green}>template.yaml</tspan> · Declarative configuration for VPC, ALB, ASG, RDS &amp; Serverless Reporting.
              </text>
              <rect x="555" y="70" width="180" height="24" rx="5" fill="#0d141e" stroke={TONE.green} />
              <text x="565" y="86" fontSize="9" fontWeight="700" fill={TONE.green}>
                STACK A: us-east-1 (Primary)
              </text>
              <rect x="745" y="70" width="180" height="24" rx="5" fill="#0d141e" stroke={TONE.green} strokeDasharray="3 3" />
              <text x="755" y="86" fontSize="9" fontWeight="700" fill={MUTED}>
                STACK B: us-west-2 (DR Replicated)
              </text>
              <text x="940" y="86" fontSize="9" fill={FAINT}>
                Parameters: DBInstanceClass, WebMin/Max
              </text>
            </g>
          )}

          {/* ---------- External: Users & Route 53 ---------- */}
          <g>
            <rect
              x="20"
              y="335"
              width="110"
              height="100"
              rx="12"
              fill="rgba(13,19,28,0.96)"
              stroke={TONE.teal}
              strokeOpacity="0.6"
            />
            <text x="75" y="365" textAnchor="middle" fontSize="22" fill={TONE.teal}>
              ◉
            </text>
            <text x="75" y="386" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>
              Users
            </text>
            <text x="75" y="401" textAnchor="middle" fontSize="8.5" fill={MUTED}>
              Web Browsers
            </text>
            <text x="75" y="420" textAnchor="middle" fontSize="8" fontWeight="700" fill={TONE.teal}>
              {requests} req/min
            </text>
          </g>

          {/* Route 53 DNS Pill */}
          <Pill x={75} y={320} text="Route 53 DNS" tone="sky" />

          {/* ---------- AWS Cloud Boundary ---------- */}
          <rect
            x="160"
            y="130"
            width="1090"
            height="690"
            rx="20"
            fill="rgba(232,163,61,0.015)"
            stroke="#263445"
            strokeWidth="1.5"
            strokeDasharray="8 6"
          />
          <text x="180" y="152" fontSize="11" fontWeight="800" letterSpacing="1.2" fill={TONE.amber}>
            AWS CLOUD PLATFORM
          </text>
          <text x="350" y="152" fontSize="9.5" fill={MUTED}>
            Region: us-east-1 (N. Virginia) · IAM Roles &amp; Policies · Security Groups
          </text>

          {/* ---------- LEVEL 01: S3 Static Website Box (Top Left inside AWS) ---------- */}
          <g opacity={level === 1 ? 1 : 0.28}>
            <rect
              x="200"
              y="175"
              width="280"
              height="78"
              rx="10"
              fill="rgba(13,19,28,0.96)"
              stroke={TONE.teal}
              strokeWidth={level === 1 ? 1.8 : 1.2}
              strokeDasharray={level === 1 ? undefined : '5 5'}
            />
            <text x="215" y="196" fontSize="11" fontWeight="700" fill={INK}>
              Amazon S3 Bucket
            </text>
            <text x="465" y="196" textAnchor="end" fontSize="8.5" letterSpacing="1" fill={TONE.teal}>
              STATIC SITE
            </text>
            <text x="215" y="215" fontSize="9.5" fill={MUTED}>
              bucket: <tspan fill={INK}>cafe-static-site</tspan>
            </text>
            <text x="215" y="232" fontSize="9" fill={level === 1 ? TONE.teal : FAINT}>
              {level === 1 ? '● Active Serving: HTML, CSS, JS, Images' : '○ Level 01 Baseline (No compute)'}
            </text>
          </g>

          {/* ---------- CloudWatch Observability Plane (Top Right inside AWS) ---------- */}
          <g>
            <rect
              x="1030"
              y="160"
              width="200"
              height="95"
              rx="12"
              fill="rgba(13,19,28,0.96)"
              stroke={TONE.sky}
              strokeOpacity="0.75"
              strokeWidth="1.3"
            />
            <text x="1045" y="180" fontSize="11" fontWeight="700" fill={INK}>
              Amazon CloudWatch
            </text>
            <text x="1215" y="180" textAnchor="end" fontSize="8.5" letterSpacing="1" fill={TONE.sky}>
              OBSERVE
            </text>
            <text x="1045" y="200" fontSize="9" fill={MUTED}>
              ALB Latency: <tspan fill={latency > 150 ? TONE.red : TONE.teal}>{latency}ms</tspan>
            </text>
            <text x="1045" y="216" fontSize="9" fill={MUTED}>
              EC2 Avg CPU: <tspan fill={cpu > 80 ? TONE.red : TONE.teal}>{cpu.toFixed(0)}%</tspan>
            </text>
            <text x="1045" y="232" fontSize="9" fill={MUTED}>
              RDS Conns: <tspan fill={INK}>{hasRds ? dbConnections : 'N/A'}</tspan> · Runs: <tspan fill={TONE.violet}>{reportRuns}</tspan>
            </text>
          </g>

          {/* ---------- VPC Boundary (Levels 2 - 6) ---------- */}
          <g opacity={level >= 2 ? 1 : 0.22}>
            <rect
              x="180"
              y="275"
              width="820"
              height="530"
              rx="16"
              fill="rgba(79,209,197,0.015)"
              stroke={TONE.teal}
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            <text x="200" y="297" fontSize="11" fontWeight="800" letterSpacing="1" fill={TONE.teal}>
              VPC: vpc-cafe-prod
            </text>
            <text x="360" y="297" fontSize="9.5" fill={MUTED}>
              IPv4 CIDR: 10.0.0.0/16 · DNS Hostnames: Enabled
            </text>

            {/* Internet Gateway Attached to VPC */}
            <rect
              x="170"
              y="360"
              width="60"
              height="50"
              rx="6"
              fill="#0d141e"
              stroke={TONE.teal}
              strokeWidth="1.3"
            />
            <text x="200" y="382" textAnchor="middle" fontSize="9.5" fontWeight="700" fill={TONE.teal}>
              IGW
            </text>
            <text x="200" y="398" textAnchor="middle" fontSize="8" fill={MUTED}>
              igw-cafe
            </text>

            {/* ---------- Availability Zone A (Left Half) ---------- */}
            <rect
              x="200"
              y="315"
              width="385"
              height="470"
              rx="12"
              fill="rgba(255,255,255,0.01)"
              stroke="#273343"
              strokeDasharray="6 5"
            />
            <text x="215" y="333" fontSize="9.5" fontWeight="700" letterSpacing="1" fill={INK}>
              AVAILABILITY ZONE A (us-east-1a)
            </text>

            {/* ---------- Availability Zone B (Right Half) ---------- */}
            <rect
              x="605"
              y="315"
              width="380"
              height="470"
              rx="12"
              fill="rgba(255,255,255,0.01)"
              stroke="#273343"
              strokeDasharray="6 5"
              opacity={level >= 4 ? 1 : 0.3}
            />
            <text x="620" y="333" fontSize="9.5" fontWeight="700" letterSpacing="1" fill={level >= 4 ? INK : FAINT}>
              AVAILABILITY ZONE B (us-east-1b) {level < 4 ? '(Standby for L4+)' : ''}
            </text>

            {/* ========================================================================= */}
            {/* PUBLIC SUBNETS TIER (ALB / Ingress)                                       */}
            {/* ========================================================================= */}
            <rect
              x="215"
              y="345"
              width="355"
              height="100"
              rx="9"
              fill="rgba(56,189,248,0.03)"
              stroke={TONE.sky}
              strokeOpacity="0.35"
            />
            <text x="225" y="362" fontSize="8.5" fontWeight="700" fill={TONE.sky}>
              PUBLIC SUBNET (AZ-a) · 10.0.1.0/24 · route 0.0.0.0/0 → igw
            </text>

            <rect
              x="620"
              y="345"
              width="350"
              height="100"
              rx="9"
              fill="rgba(56,189,248,0.03)"
              stroke={TONE.sky}
              strokeOpacity={level >= 4 ? 0.35 : 0.15}
            />
            <text x="630" y="362" fontSize="8.5" fontWeight="700" fill={level >= 4 ? TONE.sky : FAINT}>
              PUBLIC SUBNET (AZ-b) · 10.0.2.0/24 · route 0.0.0.0/0 → igw
            </text>

            {/* LEVEL 2 & 3: Single EC2 Web Server in Public Subnet */}
            {(level === 2 || level === 3) && (
              <g>
                <rect
                  x="320"
                  y="368"
                  width="180"
                  height="66"
                  rx="8"
                  fill="rgba(12,18,26,0.95)"
                  stroke={TONE.teal}
                  strokeWidth="1.4"
                />
                <text x="330" y="388" fontSize="10.5" fontWeight="700" fill={INK}>
                  EC2: cafe-web-server
                </text>
                <text x="330" y="403" fontSize="9" fill={MUTED}>
                  t3.micro · Public IP 54.210.x.x
                </text>
                <text x="330" y="420" fontSize="8.5" fill={level === 2 ? TONE.amber : TONE.teal}>
                  {level === 2 ? 'App + Local MySQL (same host)' : 'Dynamic App (Remote RDS)'}
                </text>
              </g>
            )}

            {/* LEVEL 4+: Application Load Balancer across Public Subnets */}
            {level >= 4 && (
              <g>
                <rect
                  x="430"
                  y="368"
                  width="280"
                  height="68"
                  rx="10"
                  fill="rgba(12,18,26,0.95)"
                  stroke={TONE.teal}
                  strokeWidth="1.6"
                />
                <text x="570" y="388" textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
                  Application Load Balancer (ALB)
                </text>
                <text x="570" y="403" textAnchor="middle" fontSize="9" fill={MUTED}>
                  cafe-alb · internet-facing · Dual-AZ Target Group
                </text>
                <text x="570" y="422" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={TONE.teal}>
                  ALB-SG: Port 80/443 from 0.0.0.0/0 → distributes 50/50
                </text>
              </g>
            )}

            {/* ========================================================================= */}
            {/* PRIVATE APPLICATION SUBNETS TIER (EC2 Auto Scaling Group)                */}
            {/* ========================================================================= */}
            <rect
              x="215"
              y="460"
              width="355"
              height="150"
              rx="9"
              fill="rgba(79,209,197,0.03)"
              stroke={TONE.teal}
              strokeOpacity="0.35"
            />
            <text x="225" y="478" fontSize="8.5" fontWeight="700" fill={TONE.teal}>
              PRIVATE APP SUBNET (AZ-a) · 10.0.11.0/24 · route → nat-gw
            </text>

            <rect
              x="620"
              y="460"
              width="350"
              height="150"
              rx="9"
              fill="rgba(79,209,197,0.03)"
              stroke={TONE.teal}
              strokeOpacity={level >= 4 ? 0.35 : 0.15}
            />
            <text x="630" y="478" fontSize="8.5" fontWeight="700" fill={level >= 4 ? TONE.teal : FAINT}>
              PRIVATE APP SUBNET (AZ-b) · 10.0.12.0/24 · route → nat-gw
            </text>

            {/* EC2 Instance in AZ-a */}
            <g opacity={level >= 4 ? 1 : 0.3}>
              <rect
                x="250"
                y="500"
                width="230"
                height="95"
                rx="9"
                fill="rgba(12,18,26,0.95)"
                stroke={TONE.teal}
                strokeWidth={level >= 4 ? 1.4 : 1}
              />
              <text x="265" y="522" fontSize="10.5" fontWeight="700" fill={INK}>
                cafe-web-1a (ASG instance)
              </text>
              <text x="265" y="538" fontSize="9" fill={MUTED}>
                t3.micro · Private IP 10.0.11.24
              </text>
              <text x="265" y="555" fontSize="8.5" fill={FAINT}>
                HTTP :8080 · Health: 200 OK
              </text>
              <text x="265" y="578" fontSize="8.5" fontWeight="700" fill={TONE.teal}>
                EC2-SG: allows :8080 from ALB-SG only
              </text>
            </g>

            {/* EC2 Instance in AZ-b */}
            <g opacity={level >= 4 ? 1 : 0.3}>
              <rect
                x="650"
                y="500"
                width="230"
                height="95"
                rx="9"
                fill="rgba(12,18,26,0.95)"
                stroke={TONE.teal}
                strokeWidth={level >= 4 ? 1.4 : 1}
              />
              <text x="665" y="522" fontSize="10.5" fontWeight="700" fill={level >= 4 ? INK : FAINT}>
                cafe-web-1b (ASG instance)
              </text>
              <text x="665" y="538" fontSize="9" fill={MUTED}>
                t3.micro · Private IP 10.0.12.38
              </text>
              <text x="665" y="555" fontSize="8.5" fill={FAINT}>
                HTTP :8080 · Health: 200 OK
              </text>
              <text x="665" y="578" fontSize="8.5" fontWeight="700" fill={level >= 4 ? TONE.teal : FAINT}>
                EC2-SG: allows :8080 from ALB-SG only
              </text>
            </g>

            {/* ========================================================================= */}
            {/* PRIVATE DATABASE SUBNETS TIER (RDS Multi-AZ)                              */}
            {/* ========================================================================= */}
            <rect
              x="215"
              y="625"
              width="355"
              height="145"
              rx="9"
              fill="rgba(232,163,61,0.03)"
              stroke={TONE.amber}
              strokeOpacity="0.4"
            />
            <text x="225" y="643" fontSize="8.5" fontWeight="700" fill={TONE.amber}>
              PRIVATE DB SUBNET (AZ-a) · 10.0.21.0/24 · ISOLATED (NO INTERNET ROUTE)
            </text>

            <rect
              x="620"
              y="625"
              width="350"
              height="145"
              rx="9"
              fill="rgba(232,163,61,0.03)"
              stroke={TONE.amber}
              strokeOpacity={level >= 4 ? 0.4 : 0.15}
            />
            <text x="630" y="643" fontSize="8.5" fontWeight="700" fill={level >= 4 ? TONE.amber : FAINT}>
              PRIVATE DB SUBNET (AZ-b) · 10.0.22.0/24 · ISOLATED (NO INTERNET ROUTE)
            </text>

            {/* RDS Primary Instance (AZ-a) */}
            <g opacity={hasRds ? 1 : 0.28}>
              <rect
                x="250"
                y="655"
                width="230"
                height="100"
                rx="9"
                fill="rgba(12,18,26,0.95)"
                stroke={TONE.amber}
                strokeWidth={hasRds ? 1.5 : 1}
              />
              <text x="265" y="677" fontSize="10.5" fontWeight="700" fill={INK}>
                Amazon RDS: Primary
              </text>
              <text x="265" y="693" fontSize="9" fill={MUTED}>
                MySQL 8.0 · db.t3.micro · 10.0.21.50
              </text>
              <text x="265" y="710" fontSize="8.5" fill={TONE.amber}>
                Port 3306 · Automated Daily Backups
              </text>
              <text x="265" y="735" fontSize="8" fontWeight="700" fill={TONE.amber}>
                RDS-SG: allows :3306 from EC2-SG &amp; L1 ONLY
              </text>
            </g>

            {/* RDS Standby Replica (AZ-b) */}
            <g opacity={level >= 4 ? 1 : 0.25}>
              <rect
                x="650"
                y="655"
                width="230"
                height="100"
                rx="9"
                fill="rgba(12,18,26,0.95)"
                stroke={TONE.amber}
                strokeWidth={level >= 4 ? 1.4 : 1}
                strokeDasharray={level >= 4 ? undefined : '5 5'}
              />
              <text x="665" y="677" fontSize="10.5" fontWeight="700" fill={level >= 4 ? INK : FAINT}>
                Amazon RDS: Standby
              </text>
              <text x="665" y="693" fontSize="9" fill={MUTED}>
                Multi-AZ Synchronous Replica · 10.0.22.90
              </text>
              <text x="665" y="710" fontSize="8.5" fill={level >= 4 ? TONE.amber : FAINT}>
                Synchronous Block Replication
              </text>
              <text x="665" y="735" fontSize="8" fontWeight="700" fill={level >= 4 ? TONE.amber : FAINT}>
                Automatic Failover Target in &lt; 60s
              </text>
            </g>
          </g>

          {/* ========================================================================= */}
          {/* 4. SERVERLESS TWO-STAGE REPORTING BRANCH (Right Edge Box)                 */}
          {/* ========================================================================= */}
          <g opacity={level >= 5 ? 1 : 0.25}>
            <rect
              x="1030"
              y="275"
              width="200"
              height="530"
              rx="16"
              fill="rgba(167,139,250,0.02)"
              stroke={TONE.violet}
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            <text x="1045" y="297" fontSize="10.5" fontWeight="800" letterSpacing="1" fill={TONE.violet}>
              SERVERLESS REPORTING
            </text>
            <text x="1045" y="312" fontSize="8.5" fill={MUTED}>
              Two-Stage Least-Privilege Design
            </text>

            {/* EventBridge Rule */}
            <rect
              x="1045"
              y="325"
              width="170"
              height="50"
              rx="8"
              fill="rgba(12,18,26,0.95)"
              stroke={TONE.violet}
              strokeWidth="1.2"
            />
            <text x="1055" y="345" fontSize="10" fontWeight="700" fill={INK}>
              Amazon EventBridge
            </text>
            <text x="1055" y="362" fontSize="8" fill={MUTED}>
              cron(0 2 * * ? *) · daily trigger
            </text>

            {/* Lambda 1: DB Reader (inside VPC) */}
            <rect
              x="1045"
              y="405"
              width="170"
              height="80"
              rx="8"
              fill="rgba(12,18,26,0.95)"
              stroke={TONE.violet}
              strokeWidth="1.4"
            />
            <text x="1055" y="425" fontSize="10" fontWeight="700" fill={INK}>
              Lambda 1: DB Reader
            </text>
            <text x="1055" y="440" fontSize="8.5" fill={TONE.violet}>
              VPC Subnet · Reads RDS
            </text>
            <text x="1055" y="456" fontSize="8" fill={MUTED}>
              Uses Secrets Manager auth
            </text>
            <text x="1055" y="474" fontSize="8" fontWeight="700" fill={TONE.teal}>
              Outputs: Sanitized JSON only
            </text>

            {/* LEAST PRIVILEGE BARRIER BADGE */}
            <g transform="translate(1040, 500)">
              <rect width="180" height="32" rx="6" fill="#140f22" stroke={TONE.violet} strokeDasharray="3 3" />
              <text x="90" y="14" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={TONE.violet}>
                ⚡ LEAST PRIVILEGE BARRIER
              </text>
              <text x="90" y="25" textAnchor="middle" fontSize="7" fill={MUTED}>
                Lambda 2 has NO DB access or credentials
              </text>
            </g>

            {/* Lambda 2: Email Formatter & SNS Publisher (OUTSIDE VPC) */}
            <rect
              x="1045"
              y="545"
              width="170"
              height="70"
              rx="8"
              fill="rgba(12,18,26,0.95)"
              stroke={TONE.violet}
              strokeWidth="1.4"
            />
            <text x="1055" y="565" fontSize="10" fontWeight="700" fill={INK}>
              Lambda 2: SNS Dispatcher
            </text>
            <text x="1055" y="580" fontSize="8.5" fill={TONE.violet}>
              Outside VPC · NO DB Rights
            </text>
            <text x="1055" y="596" fontSize="8" fill={MUTED}>
              Role: sns:Publish permission only
            </text>

            {/* Amazon SNS Topic */}
            <rect
              x="1045"
              y="635"
              width="170"
              height="60"
              rx="8"
              fill="rgba(12,18,26,0.95)"
              stroke={TONE.violet}
              strokeWidth="1.2"
            />
            <text x="1055" y="655" fontSize="10" fontWeight="700" fill={INK}>
              Amazon SNS Topic
            </text>
            <text x="1055" y="670" fontSize="8.5" fill={MUTED}>
              cafe-daily-reports-topic
            </text>
            <text x="1055" y="685" fontSize="8" fill={TONE.violet}>
              Fanout: Email &amp; SMS
            </text>

            {/* Subscribers */}
            <rect
              x="1045"
              y="715"
              width="170"
              height="45"
              rx="8"
              fill="rgba(12,18,26,0.95)"
              stroke="#2e3848"
            />
            <text x="1055" y="733" fontSize="9.5" fontWeight="700" fill={INK}>
              Stakeholders &amp; Owner
            </text>
            <text x="1055" y="748" fontSize="8" fill={MUTED}>
              Daily revenue digest in inbox
            </text>
          </g>

          {/* ========================================================================= */}
          {/* FLOW LINES & MOVING PACKETS                                               */}
          {/* ========================================================================= */}
          {flows.map((f, i) => (
            <FlowLine key={f.id} flow={f} index={i} />
          ))}

          {/* ========================================================================= */}
          {/* INLINE LABELS & PROTOCOL PILLS                                            */}
          {/* ========================================================================= */}
          {level === 1 && <Pill x={180} y={230} text="HTTP GET /" tone="teal" />}
          {level >= 2 && <Pill x={165} y={375} text="HTTPS :443" tone="teal" />}
          {level >= 4 && <Pill x={570} y={355} text="ALB-SG :443" tone="teal" />}
          {level >= 4 && <Pill x={365} y={490} text="target :8080" tone="teal" />}
          {level >= 4 && <Pill x={735} y={490} text="target :8080" tone="teal" />}
          {hasRds && <Pill x={365} y={620} text="TCP :3306" tone="amber" />}
          {level >= 4 && <Pill x={550} y={690} text="Multi-AZ Sync" tone="amber" />}
          {level >= 5 && <Pill x={1150} y={400} text="trigger" tone="violet" />}
          {level >= 5 && <Pill x={1150} y={520} text="payload only" tone="violet" />}
          {level >= 5 && <Pill x={1150} y={628} text="publish" tone="violet" />}
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 4. Architectural Evolution Steps Breakdown                                */}
      {/* ========================================================================= */}
      <div className="infra-steps" style={{ marginTop: '1.25rem' }}>
        {ARCH_STEPS.map(([title, desc], i) => (
          <div
            key={title}
            className={`infra-step ${
              (i === 0 && level >= 1) ||
              (i === 1 && level >= 2) ||
              (i === 2 && level >= 4) ||
              (i === 3 && level >= 4) ||
              (i === 4 && level >= 4) ||
              (i === 5 && level >= 5) ||
              (i === 6 && level >= 5) ||
              (i === 7 && level >= 5)
                ? 'hot'
                : ''
            }`}
          >
            <span className="infra-step-n">{i + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
