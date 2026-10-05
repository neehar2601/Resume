import { useState } from 'react'

interface ServerlessTraceModalProps {
  isOpen: boolean
  onClose: () => void
  onReRun?: () => void
  runNumber: number
}

type TraceTab = 'stepper' | 'lambda1' | 'boundary' | 'lambda2' | 'email' | 'cloudwatch'

export function ServerlessTraceModal({ isOpen, onClose, onReRun, runNumber }: ServerlessTraceModalProps) {
  const [activeTab, setActiveTab] = useState<TraceTab>('stepper')
  const [copyStatus, setCopyStatus] = useState(false)

  if (!isOpen) return null

  const requestId = `aws-req-8b29c01d-20261006-${String(runNumber).padStart(3, '0')}`

  const sanitizedJson = JSON.stringify({
    report_date: "2026-10-06",
    store_id: "cafe-sea-01",
    total_orders: 184,
    gross_sales: "$2,410.50",
    avg_ticket: "$13.10",
    top_product: "Iced Caramel Macchiato",
    units_sold: 48,
    db_status: "CONNECTION_CLOSED_CLEAN"
  }, null, 2)

  const handleCopy = () => {
    navigator.clipboard?.writeText(sanitizedJson)
    setCopyStatus(true)
    setTimeout(() => setCopyStatus(false), 2000)
  }

  return (
    <div className="trace-modal-backdrop" onClick={onClose}>
      <div className="trace-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="trace-modal-header">
          <div className="trace-modal-title-group">
            <div className="trace-status-pill">
              <span className="trace-status-dot" />
              <span>TEST EVENT EXECUTED · 200 OK</span>
            </div>
            <h3>DevOps Pipeline Test: cafe-daily-sales-report</h3>
            <p>
              Simulating an ad-hoc test execution of the automated two-stage serverless reporting architecture.
            </p>
          </div>
          <div className="trace-modal-actions">
            {onReRun && (
              <button type="button" className="button step-btn primary" onClick={onReRun} title="Re-run test event">
                ↺ Re-execute Test ({runNumber})
              </button>
            )}
            <button type="button" className="trace-close-btn" onClick={onClose} aria-label="Close trace inspector">
              ✕
            </button>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="trace-telemetry-bar">
          <div><span>Request ID</span><strong>{requestId}</strong></div>
          <div><span>Total Latency</span><strong>186 ms</strong></div>
          <div><span>Lambda 1 (VPC)</span><strong>128 ms</strong></div>
          <div><span>Trust Handover</span><strong>4 ms</strong></div>
          <div><span>Lambda 2 (SNS)</span><strong>54 ms</strong></div>
          <div><span>Target SNS ARN</span><strong>arn:aws:sns:us-east-1:123456789012:cafe-daily-reports-topic</strong></div>
        </div>

        {/* Tab Navigation */}
        <div className="trace-tabs">
          <button
            type="button"
            className={activeTab === 'stepper' ? 'active' : ''}
            onClick={() => setActiveTab('stepper')}
          >
            📋 Complete Execution Trace
          </button>
          <button
            type="button"
            className={activeTab === 'lambda1' ? 'active' : ''}
            onClick={() => setActiveTab('lambda1')}
          >
            🔒 Step 1: Lambda 1 (VPC &amp; SQL)
          </button>
          <button
            type="button"
            className={activeTab === 'boundary' ? 'active' : ''}
            onClick={() => setActiveTab('boundary')}
          >
            ⚡ Step 2: Least-Privilege Handover
          </button>
          <button
            type="button"
            className={activeTab === 'lambda2' ? 'active' : ''}
            onClick={() => setActiveTab('lambda2')}
          >
            ✉️ Step 3: Lambda 2 (SNS Dispatch)
          </button>
          <button
            type="button"
            className={activeTab === 'email' ? 'active' : ''}
            onClick={() => setActiveTab('email')}
          >
            📬 Delivered Report (Email Preview)
          </button>
          <button
            type="button"
            className={activeTab === 'cloudwatch' ? 'active' : ''}
            onClick={() => setActiveTab('cloudwatch')}
          >
            📈 CloudWatch Logs
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="trace-modal-body">
          {/* TAB 1: Complete Execution Stepper */}
          {activeTab === 'stepper' && (
            <div className="trace-timeline-view">
              <div className="trace-step-card">
                <div className="trace-step-badge">STAGE 01</div>
                <div className="trace-step-main">
                  <div className="trace-step-head">
                    <strong>Event Trigger (Amazon EventBridge Simulation)</strong>
                    <span className="trace-time-tag">T+0.0 ms</span>
                  </div>
                  <p>
                    In production, an Amazon EventBridge cron rule (<code>cron(0 2 * * ? *)</code>) fires nightly at 02:00 AM UTC.
                    In this DevOps sandbox test, an ad-hoc test payload invokes <code>cafe-report-generator</code> directly.
                  </p>
                  <pre className="trace-code-block">
<code>{`{
  "version": "0",
  "id": "${requestId}",
  "detail-type": "Scheduled Event (DevOps Test Override)",
  "source": "aws.events",
  "account": "123456789012",
  "time": "2026-10-06T02:00:00Z",
  "region": "us-east-1",
  "resources": ["arn:aws:events:us-east-1:123456789012:rule/cafe-daily-report-cron"]
}`}</code>
                  </pre>
                </div>
              </div>

              <div className="trace-step-card">
                <div className="trace-step-badge vpc">STAGE 02</div>
                <div className="trace-step-main">
                  <div className="trace-step-head">
                    <strong>Lambda 1: Sales DB Reader (Inside VPC)</strong>
                    <span className="trace-time-tag">Duration: 128 ms</span>
                  </div>
                  <p>
                    Executed inside <strong>Private App Subnet</strong> via Elastic Network Interface (ENI).
                    Pulls credentials from <strong>AWS Secrets Manager</strong> and connects to <strong>Amazon RDS MySQL</strong> (:3306) across the private database subnet.
                  </p>
                  <div className="trace-mini-callout">
                    <span>SQL Query Executed against Private RDS:</span>
                    <code>SELECT COUNT(id) AS total_orders, SUM(total) AS gross_sales, AVG(total) AS avg_ticket FROM orders WHERE date = CURRENT_DATE() - INTERVAL 1 DAY;</code>
                  </div>
                  <div className="trace-badge-row">
                    <span className="guard-badge pass">✓ Secrets Manager Auth: OK</span>
                    <span className="guard-badge pass">✓ Private DB Connection (:3306): OK</span>
                    <span className="guard-badge warn">🛡️ Boundary: Zero Internet Access</span>
                    <span className="guard-badge warn">🛡️ Boundary: No sns:Publish Rights</span>
                  </div>
                </div>
              </div>

              <div className="trace-step-card barrier">
                <div className="trace-step-badge boundary">BARRIER</div>
                <div className="trace-step-main">
                  <div className="trace-step-head">
                    <strong>Least-Privilege Security Boundary (lambda:InvokeFunction)</strong>
                    <span className="trace-time-tag">Handover: 4 ms</span>
                  </div>
                  <p>
                    Lambda 1 terminates the database connection, strips all connection strings, passwords, and raw tables,
                    and synchronously calls Lambda 2 passing <strong>only this sanitized JSON summary payload</strong>:
                  </p>
                  <pre className="trace-code-block">
<code>{sanitizedJson}</code>
                  </pre>
                  <p className="trace-security-note">
                    <strong>Why this matters in architecture interviews:</strong> Even if Lambda 2’s code or external dependencies are compromised, the attacker has <em>zero network path and zero IAM credentials</em> to reach the raw customer database.
                  </p>
                </div>
              </div>

              <div className="trace-step-card">
                <div className="trace-step-badge public">STAGE 03</div>
                <div className="trace-step-main">
                  <div className="trace-step-head">
                    <strong>Lambda 2: Dispatcher (Outside VPC) &amp; Amazon SNS Publish</strong>
                    <span className="trace-time-tag">Duration: 54 ms</span>
                  </div>
                  <p>
                    Executed in the non-VPC serverless environment. Zero ENI overhead.
                    IAM Role permits <strong>only <code>sns:Publish</code></strong> to the café topic ARN.
                  </p>
                  <div className="trace-mini-callout">
                    <span>SNS Publish Request:</span>
                    <code>await sns.publish(&#123; TopicArn: 'cafe-daily-reports-topic', Subject: '☕ Daily Sales Report', Message: formattedReport &#125;)</code>
                  </div>
                  <div className="trace-badge-row">
                    <span className="guard-badge pass">✓ SNS Status: 200 OK</span>
                    <span className="guard-badge pass">✓ MessageId: 7f3b49e2-cafe-daily</span>
                    <span className="guard-badge pass">✓ Fan-out: Email &amp; SMS Dispatched</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Lambda 1 Deep Dive */}
          {activeTab === 'lambda1' && (
            <div className="trace-detail-panel">
              <h4>Lambda 1: cafe-report-stage1-reader</h4>
              <p>
                This function has network access to the database layer, but has intentionally constrained IAM and routing permissions so it cannot leak data externally.
              </p>
              <div className="trace-config-grid">
                <div><span>Subnets</span><strong>Private App Subnets (AZ-a &amp; AZ-b)</strong></div>
                <div><span>VPC ENI</span><strong>eni-09f1b4a2c78e (10.0.1.42)</strong></div>
                <div><span>Security Group</span><strong>EC2-SG (inbound none, outbound 3306 to RDS-SG)</strong></div>
                <div><span>IAM Policy</span><strong>secretsmanager:GetSecretValue, lambda:InvokeFunction</strong></div>
              </div>
              <div className="trace-snippet-card">
                <div className="snippet-title">Handler Logic (TypeScript)</div>
                <pre className="trace-code-block">
<code>{`// 1. Fetch DB Credentials safely from AWS Secrets Manager
const { username, password, host } = await secrets.getSecretValue({ SecretId: 'cafe/rds/app' })

// 2. Query Private RDS MySQL across isolated VPC subnet
const connection = await mysql.createConnection({ host, user: username, password, database: 'cafe' })
const [rows] = await connection.execute('SELECT COUNT(*) as orders, SUM(amount) as sales FROM daily_orders')
await connection.end()

// 3. Form sanitized payload - NO DB CREDENTIALS FORWARDED
const payload = {
  report_date: new Date().toISOString().split('T')[0],
  total_orders: rows[0].orders,
  gross_sales: \`$\${rows[0].sales.toFixed(2)}\`,
  top_product: 'Iced Caramel Macchiato'
}

// 4. Invoke Lambda 2 synchronously with sanitized summary
await lambda.invoke({
  FunctionName: 'cafe-report-stage2-notifier',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify(payload)
})`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Least-Privilege Barrier */}
          {activeTab === 'boundary' && (
            <div className="trace-detail-panel">
              <h4>The Architectural Boundary: Separation of Concerns</h4>
              <p>
                A naive design puts both database reading and email dispatching into a single monolithic Lambda.
                Here is why the <strong>Two-Stage Architecture</strong> is superior:
              </p>
              <div className="trace-comparison-table">
                <div className="comp-col bad">
                  <div className="comp-head">❌ Monolithic Single Lambda</div>
                  <ul>
                    <li>Requires VPC access <em>AND</em> Internet/NAT access to reach email APIs.</li>
                    <li>Function IAM role holds database master credentials + SNS/SES permissions.</li>
                    <li>If an npm/pip dependency has an exploit, the attacker has direct database access.</li>
                    <li>Requires NAT Gateway ($32+/mo) if publishing to public endpoints from VPC without VPC endpoints.</li>
                  </ul>
                </div>
                <div className="comp-col good">
                  <div className="comp-head">✅ Two-Stage Least-Privilege Design</div>
                  <ul>
                    <li><strong>Lambda 1 (Inside VPC)</strong>: Reads RDS, prepares sanitized JSON, closes connection. Zero internet access.</li>
                    <li><strong>Lambda 2 (Outside VPC)</strong>: Formats and publishes email. ZERO database credentials or RDS network route.</li>
                    <li>Complete blast-radius isolation: A compromised notifier function cannot query customer data.</li>
                    <li>Zero NAT Gateway cost for reporting delivery.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Lambda 2 Deep Dive */}
          {activeTab === 'lambda2' && (
            <div className="trace-detail-panel">
              <h4>Lambda 2: cafe-report-stage2-notifier</h4>
              <p>
                Runs outside the VPC without ENI cold-starts. It receives already-sanitized JSON and is solely responsible for rendering the executive template and publishing to Amazon SNS.
              </p>
              <div className="trace-config-grid">
                <div><span>Execution Context</span><strong>Standard Serverless (Non-VPC)</strong></div>
                <div><span>Database Access</span><strong>NONE (Denied by IAM &amp; Network)</strong></div>
                <div><span>IAM Policy</span><strong>sns:Publish on arn:aws:sns:*:cafe-daily-reports-topic</strong></div>
                <div><span>Payload Input</span><strong>Sanitized JSON Summary Only</strong></div>
              </div>
              <div className="trace-snippet-card">
                <div className="snippet-title">Notifier Logic (TypeScript)</div>
                <pre className="trace-code-block">
<code>{`export const handler = async (event: SanitizedReportPayload) => {
  // Formats human-friendly executive summary email body
  const messageBody = \`
CAFÉ WEB DAILY SALES SUMMARY
Date: \${event.report_date}
Total Orders: \${event.total_orders}
Gross Revenue: \${event.gross_sales}
Average Ticket: \${event.avg_ticket}
Top Seller: \${event.top_product} (\${event.units_sold} cups sold)
\`

  // Publishes to SNS Topic (fans out to manager email and SMS)
  return await sns.publish({
    TopicArn: process.env.REPORT_SNS_TOPIC_ARN,
    Subject: \`☕ Café Sales Report - \${event.report_date}\`,
    Message: messageBody
  })
}`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: Delivered Email Preview */}
          {activeTab === 'email' && (
            <div className="trace-detail-panel">
              <h4>Delivered Stakeholder Notification</h4>
              <p>
                Amazon SNS delivered this formatted report to subscribed café store managers and the business owner.
              </p>
              <div className="email-preview-card">
                <div className="email-header-fields">
                  <div><span>From:</span> <strong>Amazon SNS &lt;no-reply@sns.amazonaws.com&gt;</strong></div>
                  <div><span>To:</span> <strong>owner@cafeweb.internal, store-manager@cafeweb.internal</strong></div>
                  <div><span>Subject:</span> <strong>☕ Café Daily Executive Sales Report — 2026-10-06</strong></div>
                  <div><span>Timestamp:</span> <strong>Tuesday, October 6, 2026 at 02:00:02 AM UTC</strong></div>
                </div>
                <div className="email-body-content">
                  <div className="email-brand">☕ Café Web Operations</div>
                  <h3>Daily Store Performance &amp; Revenue Summary</h3>
                  <div className="email-stats-row">
                    <div className="email-stat-box">
                      <span>Total Orders</span>
                      <strong>184</strong>
                    </div>
                    <div className="email-stat-box">
                      <span>Gross Sales</span>
                      <strong>$2,410.50</strong>
                    </div>
                    <div className="email-stat-box">
                      <span>Average Ticket</span>
                      <strong>$13.10</strong>
                    </div>
                  </div>
                  <div className="email-callout-box">
                    <strong>⭐ Best Seller:</strong> Iced Caramel Macchiato (48 cups sold today)
                  </div>
                  <div className="email-footer-note">
                    Generated by AWS Lambda (Two-Stage Pipeline) · RDS MySQL Data Source · Delivered via Amazon SNS
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CloudWatch Logs */}
          {activeTab === 'cloudwatch' && (
            <div className="trace-detail-panel">
              <h4>Amazon CloudWatch Logs Stream</h4>
              <p>
                Live operational log streams for both Lambda functions showing sub-second execution duration.
              </p>
              <pre className="trace-code-block log-stream">
<code>{`2026-10-06T02:00:00.012Z START RequestId: ${requestId} Version: $LATEST
2026-10-06T02:00:00.045Z [INFO]  [Lambda 1] EventBridge scheduled rule triggered pipeline.
2026-10-06T02:00:00.082Z [INFO]  [Lambda 1] Fetching database secret 'cafe/rds/app' from AWS Secrets Manager.
2026-10-06T02:00:00.114Z [INFO]  [Lambda 1] Secret retrieved. Establishing private connection to RDS MySQL on 10.0.3.15:3306.
2026-10-06T02:00:00.188Z [INFO]  [Lambda 1] Executed query: 184 sales rows aggregated into sanitized payload.
2026-10-06T02:00:00.192Z [INFO]  [Lambda 1] Closed MySQL pool.
2026-10-06T02:00:00.198Z [INFO]  [Lambda 1] Invoking Lambda 2 (cafe-report-notifier) with sanitized JSON.
2026-10-06T02:00:00.201Z [INFO]  [Lambda 2] Received sanitized payload for store 'cafe-sea-01'.
2026-10-06T02:00:00.238Z [INFO]  [Lambda 2] Rendered executive template. Publishing to SNS topic arn:aws:sns:us-east-1:123456789012:cafe-daily-reports-topic.
2026-10-06T02:00:00.252Z [INFO]  [Lambda 2] SNS Message published successfully. MessageId: 7f3b49e2-9b21-4f11.
2026-10-06T02:00:00.254Z END RequestId: ${requestId}
2026-10-06T02:00:00.255Z REPORT RequestId: ${requestId} Duration: 186.24 ms Billed: 200 ms Memory: 256 MB Max Used: 74 MB`}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="trace-modal-footer">
          <div className="trace-footer-info">
            <span className="kicker-dot" />
            <span>Least-Privilege Verification: Lambda 2 holds zero DB credentials.</span>
          </div>
          <div className="trace-footer-buttons">
            <button type="button" className="button" onClick={handleCopy}>
              {copyStatus ? '✓ Copied Payload' : 'Copy Sanitized JSON'}
            </button>
            <button type="button" className="button primary" onClick={onClose}>
              Close Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
