export type SandboxPhase =
  | 'idle'
  | 'build'
  | 'sync'
  | 'canary'
  | 'promoting'
  | 'failed'
  | 'rollback'
  | 'success' | 'rolledBack'

export type SandboxNode = {
  id: string
  name: string
  role: string
  detail: string
  group: 'delivery' | 'platform' | 'observability'
}

export type MetricPoint = {
  label: string
  value: number
}
