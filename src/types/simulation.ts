export type PipelineState = 'idle' | 'running' | 'success' | 'failure'

export type Stage = {
  id: string
  name: string
  detail: string
  short: string
}

export type SimulationSnapshot = {
  stageIndex: number
  traffic: number
  errorRate: number
  latency: number
  requests: number
}
