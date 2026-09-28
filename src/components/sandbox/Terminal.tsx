import { useMemo, useState } from 'react'

type Line = { command?: string; output: string; tone?: 'ok' | 'warn' | 'fail' }

const canned: Record<string, string[]> = {
  'kubectl get pods': [
    'NAME                              READY   STATUS',
    'cafe-web-stable-7f6c8            2/2     Running',
    'cafe-web-canary-5dd9a            2/2     Running',
  ],
  'kubectl get virtualservice': [
    'NAME       HOST              STABLE   CANARY',
    'cafe-web   cafe.sandbox.dev  90       10',
  ],
  'flagger status': [
    'workload: cafe-web',
    'phase:      Progressing',
    'weight:     10%',
    'checks:     3/3',
    'analysis:   healthy',
  ],
  'argocd app get cafe-web': [
    'Name:      cafe-web',
    'Sync:      Synced',
    'Health:    Healthy',
    'Revision:  release/v2.4.0',
  ],
  'helm list': [
    'NAME       NAMESPACE   REVISION   STATUS',
    'cafe-web   sandbox     24         deployed',
  ],
}

export function Terminal({ phase, traffic, version }: { phase: string; traffic: number; version: string }) {
  const defaultLines: Line[] = useMemo(() => [
    { output: '$ sandbox terminal — commands are simulated in-browser' },
    { output: '$ try: kubectl get pods | flagger status | argocd app get cafe-web | helm list', tone: 'ok' },
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
          'NAME       HOST              STABLE   CANARY',
          `cafe-web   cafe.sandbox.dev  ${100 - traffic}       ${traffic}`,
        ]
      : normalized === 'argocd app get cafe-web'
        ? [
            'Name:      cafe-web',
            'Sync:      Synced',
            `Health:    ${phase === 'failed' ? 'Degraded' : 'Healthy'}`,
            `Revision:  release/${version}`,
          ]
      : normalized === 'flagger status'
        ? [
            'workload:  cafe-web',
            `phase:     ${phase === 'failed' ? 'Failed' : phase === 'success' ? 'Promoted' : 'Progressing'}`,
            `weight:    ${traffic}%`,
            `checks:    ${phase === 'failed' ? 'FAIL' : '3/3'}`,
            `analysis:  ${phase === 'failed' ? 'threshold exceeded' : 'healthy'}`,
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
            placeholder="kubectl get pods"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  )
}
