import type { MetricPoint } from '../../types/sandbox'

function Sparkline({ points, max }: { points: MetricPoint[]; max: number }) {
  const width = 320
  const height = 78
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width
    const y = height - (Math.min(point.value, max) / max) * (height - 8) - 4
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="metric trend">
      <line x1="0" y1="74" x2="320" y2="74" className="chart-grid" />
      <line x1="0" y1="39" x2="320" y2="39" className="chart-grid" />
      <path d={path} className="chart-line" />
      {points.slice(-1).map((point, index) => {
        const x = points.length === 1 ? 0 : ((points.length - 1) / (points.length - 1)) * width
        const y = height - (Math.min(point.value, max) / max) * (height - 8) - 4
        return <circle key={index} cx={x} cy={y} r="3.5" className="chart-dot" />
      })}
    </svg>
  )
}

export function MetricsPanel({
  traffic,
  errorRate,
  latency,
  requests,
  errorSeries,
  latencySeries,
}: {
  traffic: number
  errorRate: number
  latency: number
  requests: number
  errorSeries: MetricPoint[]
  latencySeries: MetricPoint[]
}) {
  const stable = 100 - traffic
  const health = errorRate <= 1 && latency <= 220

  return (
    <div className="metrics-grid">
      <div className="metric-wide">
        <div className="metric-heading"><span>traffic split</span><b>Istio</b></div>
        <div className="big-split">
          <div className="big-split-bar">
            <span className="split-stable" style={{ width: `${stable}%` }} />
            <span className="split-canary" style={{ width: `${traffic}%` }} />
          </div>
          <div className="big-split-labels"><span>stable {stable}%</span><span>canary {traffic}%</span></div>
        </div>
        <div className={`health-pill ${health ? 'healthy' : 'degraded'}`}>{health ? '● within analysis threshold' : '▲ analysis threshold exceeded'}</div>
      </div>

      <div className="metric-stat"><span>error rate</span><strong>{errorRate.toFixed(1)}%</strong><small>target ≤ 1.0%</small></div>
      <div className="metric-stat"><span>p95 latency</span><strong>{latency}ms</strong><small>analysis target ≤ 220ms</small></div>
      <div className="metric-stat"><span>requests</span><strong>{requests}</strong><small>requests / minute</small></div>

      <div className="metric-chart">
        <div className="metric-heading"><span>error rate</span><b>Prometheus</b></div>
        <Sparkline points={errorSeries} max={10} />
      </div>
      <div className="metric-chart">
        <div className="metric-heading"><span>p95 latency</span><b>Prometheus</b></div>
        <Sparkline points={latencySeries} max={320} />
      </div>
    </div>
  )
}
