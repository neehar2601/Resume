import { useMemo, useState } from 'react'

type Line = { command?: string; output: string; tone?: 'ok' | 'warn' | 'fail' }

const canned: Record<string, string[]> = {
  'kubectl get nodes': [
    'NAME                         STATUS   ROLES    AGE   VERSION',
    'k8s-node-01-worker-alpha     Ready    worker   45d   v1.29.2',
    'k8s-node-02-worker-beta      Ready    worker   45d   v1.29.2',
  ],
  'kubectl get nodes -o wide': [
    'NAME                         STATUS   ROLES    AGE   VERSION   INTERNAL-IP   OS-IMAGE',
    'k8s-node-01-worker-alpha     Ready    worker   45d   v1.29.2   10.244.1.12   Ubuntu 22.04 LTS',
    'k8s-node-02-worker-beta      Ready    worker   45d   v1.29.2   10.244.2.35   Ubuntu 22.04 LTS',
  ],
  'kubectl get pods': [
    'NAME                              READY   STATUS    RESTARTS   AGE',
    'cafe-web-stable-7f6c8             2/2     Running   0          4d',
    'cafe-web-canary-5dd9a             2/2     Running   0          12m',
    'istio-ingressgateway-4x9k2        1/1     Running   0          45d',
    'prometheus-k8s-0                  2/2     Running   0          45d',
    'flagger-controller-88b9c          1/1     Running   0          45d',
    'argocd-server-57d6f               1/1     Running   0          45d',
  ],
  'kubectl get pods -o wide': [
    'NAME                              READY   STATUS    NODE                       IP',
    'cafe-web-stable-7f6c8             2/2     Running   k8s-node-01-worker-alpha   10.244.1.44',
    'cafe-web-canary-5dd9a             2/2     Running   k8s-node-02-worker-beta    10.244.2.89',
    'istio-ingressgateway-4x9k2        1/1     Running   k8s-node-01-worker-alpha   10.244.1.15',
    'prometheus-k8s-0                  2/2     Running   k8s-node-02-worker-beta    10.244.2.12',
    'flagger-controller-88b9c          1/1     Running   k8s-node-02-worker-beta    10.244.2.18',
    'argocd-server-57d6f               1/1     Running   k8s-node-01-worker-alpha   10.244.1.20',
  ],
  'docker images': [
    'REPOSITORY                     TAG       IMAGE ID       CREATED         SIZE',
    'docker.io/cafe/cafe-web        v2.4.0    a89f3c14d9b2   15 minutes ago  84.2MB',
    'docker.io/cafe/cafe-web        v2.3.0    d31b8e44c2a1   5 days ago      83.9MB',
  ],
  'helm list': [
    'NAME       NAMESPACE   REVISION   STATUS     CHART             APP VERSION',
    'cafe-web   sandbox     24         deployed   cafe-web-0.5.7    v2.4.0',
  ],
  'helm get values cafe-web': [
    'image:',
    '  repository: docker.io/cafe/cafe-web',
    '  tag: v2.4.0',
    'canary:',
    '  enabled: true',
    '  stepWeight: 10',
    '  maxWeight: 100',
    '  metrics:',
    '    - name: request-success-rate',
    '      thresholdRange: { min: 99 }',
    '    - name: request-duration',
    '      thresholdRange: { max: 220 }',
  ],
  'jenkins status': [
    'JOB: cafe-web-pipeline #142',
    'STATUS: SUCCESS',
    'STAGES:',
    '  [1] Git Checkout (tag: v2.4.0) -> SUCCESS (1.2s)',
    '  [2] Docker Build & Test        -> SUCCESS (28.4s)',
    '  [3] Docker Push to Hub         -> SUCCESS (14.1s)',
    '  [4] Update Helm values.yaml    -> SUCCESS (2.1s)',
    '  [5] Git Push (Helm repo)       -> SUCCESS (1.8s)',
  ],
  'git log': [
    'commit a910f27 (HEAD -> main, tag: v2.4.0)',
    'Author: Jenkins CI Automation <ci@internal.dev>',
    'Date:   Thu Oct 1 14:26:00 2026',
    '',
    '    chore(helm): bump cafe-web image tag to v2.4.0',
  ],
  'git log -1': [
    'commit a910f27 (HEAD -> main, tag: v2.4.0)',
    'Author: Jenkins CI Automation <ci@internal.dev>',
    'Date:   Thu Oct 1 14:26:00 2026',
    '',
    '    chore(helm): bump cafe-web image tag to v2.4.0',
  ],
}

export function Terminal({ phase, traffic, version }: { phase: string; traffic: number; version: string }) {
  const defaultLines: Line[] = useMemo(() => [
    { output: '$ sandbox terminal — commands are simulated in-browser' },
    { output: '$ try: kubectl get nodes -o wide | kubectl get pods -o wide | flagger status | argocd app get cafe-web | helm get values cafe-web | jenkins status', tone: 'ok' },
  ], [])
  const [history, setHistory] = useState<Line[]>(defaultLines)
  const [command, setCommand] = useState('')

  const run = () => {
    const normalized = command.trim().toLowerCase()
    if (!normalized) return
    if (normalized === 'clear') {
      setHistory([])
      setCommand('')
      return
    }

    const dynamicOutput = normalized === 'kubectl get virtualservice'
      ? [
          'NAME       HOST              STABLE (Node 01)   CANARY (Node 02)',
          `cafe-web   cafe.sandbox.dev  ${100 - traffic}%              ${traffic}%`,
        ]
      : normalized === 'argocd app get cafe-web'
        ? [
            'Name:      cafe-web',
            'Cluster:   https://k8s.cluster.local:6443',
            'Namespace: sandbox',
            'Repo:      https://github.com/org/cafe-web-helm.git',
            'Path:      charts/cafe-web',
            'Sync:      Synced',
            `Health:    ${phase === 'failed' ? 'Degraded' : phase === 'rolledBack' ? 'Healthy / Stable v1' : 'Healthy'}`,
            `Revision:  release/${version}`,
          ]
      : normalized === 'flagger status'
        ? [
            'workload:  cafe-web',
            'node:      k8s-node-02-worker-beta',
            `phase:     ${phase === 'failed' ? 'Failed' : phase === 'success' ? 'Promoted' : phase === 'rolledBack' ? 'RolledBack' : 'Progressing'}`,
            `weight:    ${traffic}%`,
            `checks:    ${phase === 'failed' ? 'FAIL (threshold exceeded)' : '3/3 (healthy)'}`,
            `analysis:  ${phase === 'failed' ? 'rollback armed -> weight 0%' : 'error-rate < 1%, latency < 220ms'}`,
          ]
        : canned[normalized]
    setHistory((lines) => [
      ...lines,
      { command: normalized, output: `$ ${normalized}` },
      ...(dynamicOutput ? dynamicOutput.map((line) => ({ output: line, tone: phase === 'failed' ? 'warn' as const : 'ok' as const })) : [{ output: `command not found in sandbox: ${normalized}`, tone: 'warn' as const }]),
    ])
    setCommand('')
  }

  return (
    <div className="sandbox-terminal">
      <div className="terminal-header">
        <span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" />
        <span className="terminal-name">sandbox / operator-console</span>
        <span className="terminal-state">SIMULATED</span>
      </div>
      <div className="terminal-body">
        <div className="terminal-context">revision={version} phase={phase} traffic={traffic}%</div>
        {history.map((line, index) => (
          <div key={`${line.output}-${index}`} className={`terminal-line ${line.tone ?? ''}`}>
            {line.output}
          </div>
        ))}
        <form className="terminal-form" onSubmit={(event) => { event.preventDefault(); run() }}>
          <span>$</span>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            aria-label="sandbox terminal command"
            placeholder="kubectl get nodes -o wide"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  )
}
