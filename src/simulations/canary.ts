import type { SimulationSnapshot } from '../types/simulation'

export const successSnapshots: SimulationSnapshot[] = [
  { stageIndex: 0, traffic: 0, errorRate: 0, latency: 124, requests: 8 },
  { stageIndex: 1, traffic: 0, errorRate: 0, latency: 132, requests: 22 },
  { stageIndex: 2, traffic: 0, errorRate: 0, latency: 130, requests: 38 },
  { stageIndex: 3, traffic: 0, errorRate: 0, latency: 118, requests: 44 },
  { stageIndex: 4, traffic: 10, errorRate: 0.3, latency: 138, requests: 62 },
  { stageIndex: 5, traffic: 25, errorRate: 0.7, latency: 142, requests: 75 },
  { stageIndex: 6, traffic: 50, errorRate: 0.5, latency: 133, requests: 92 },
  { stageIndex: 7, traffic: 100, errorRate: 0.2, latency: 127, requests: 104 },
]

export const failureSnapshots: SimulationSnapshot[] = [
  ...successSnapshots.slice(0, 6),
  { stageIndex: 6, traffic: 25, errorRate: 8.2, latency: 298, requests: 96 },
  { stageIndex: 5, traffic: 0, errorRate: 0.4, latency: 126, requests: 100 },
]
