import type { Stage } from '../types/simulation'

export type Project = {
  id: string
  index: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  stages: Stage[]
}

export const projects: Project[] = [
  {
    id: 'progressive',
    index: '01',
    title: 'Progressive Delivery on Kubernetes',
    subtitle: 'Canary releases with service-mesh traffic control, automated analysis and rollback.',
    description:
      'A reusable deployment flow inspired by the Kubernetes + Istio + Flagger + Argo CD work in the portfolio: commit, build, package, sync, split traffic, observe, decide, then promote or recover.',
    tags: ['Kubernetes', 'Istio', 'Flagger', 'Argo CD', 'Jenkins', 'Helm', 'Prometheus'],
    stages: [
      { id: 'github', name: 'GitHub', detail: 'commit', short: 'GH' },
      { id: 'jenkins', name: 'Jenkins', detail: 'build', short: 'CI' },
      { id: 'helm', name: 'Helm', detail: 'package', short: 'H' },
      { id: 'argocd', name: 'Argo CD', detail: 'sync', short: 'CD' },
      { id: 'istio', name: 'Istio', detail: 'traffic split', short: 'I' },
      { id: 'prom', name: 'Prometheus', detail: 'metrics', short: 'P' },
      { id: 'flagger', name: 'Flagger', detail: 'analysis', short: 'F' },
      { id: 'k8s', name: 'Kubernetes', detail: 'result', short: 'K8s' },
    ],
  },
  {
    id: 'cafe',
    index: '02',
    title: 'Café Dynamic Website on AWS',
    subtitle: 'Layered AWS architecture with autoscaling, managed data and serverless reporting.',
    description:
      'The second sandbox will model the architecture rather than pretend to open a live AWS account: traffic reaches the load balancer, instances scale, data stays in RDS, and Lambda + CloudWatch provide reporting and visibility.',
    tags: ['AWS', 'EC2', 'RDS', 'VPC', 'ALB', 'ASG', 'Lambda', 'CloudWatch'],
    stages: [
      { id: 'client', name: 'Users', detail: 'requests', short: 'U' },
      { id: 'alb', name: 'ALB', detail: 'balance', short: 'LB' },
      { id: 'ec2', name: 'EC2 / ASG', detail: 'compute', short: 'EC2' },
      { id: 'rds', name: 'RDS', detail: 'data', short: 'DB' },
      { id: 'lambda', name: 'Lambda', detail: 'daily report', short: 'λ' },
      { id: 'cloudwatch', name: 'CloudWatch', detail: 'observe', short: 'CW' },
    ],
  },
  {
    id: 'collegefest',
    index: '03',
    title: 'CollegeFest Deployment Flow',
    subtitle: 'Containerized application delivery from source control to a live host.',
    description:
      'A compact deployment story built around Jenkins, Docker and Docker Compose. The interactive version will make health checks and recovery visible rather than leaving the architecture as a static diagram.',
    tags: ['Jenkins', 'Docker', 'Docker Compose', 'AWS EC2', 'S3', 'Firebase'],
    stages: [
      { id: 'github', name: 'GitHub', detail: 'source', short: 'GH' },
      { id: 'jenkins', name: 'Jenkins', detail: 'build', short: 'CI' },
      { id: 'docker', name: 'Docker', detail: 'image', short: 'D' },
      { id: 'registry', name: 'Registry', detail: 'push', short: 'REG' },
      { id: 'compose', name: 'Compose', detail: 'deploy', short: 'DC' },
      { id: 'health', name: 'Health check', detail: 'verify', short: 'HC' },
      { id: 'live', name: 'Live', detail: 'serve', short: 'ON' },
    ],
  },
]
