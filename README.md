# Neehara.dev — Interactive Cloud / DevOps Sandbox

This is the React + TypeScript foundation for the interactive portfolio concept, now with the first dedicated sandbox lab.

## Included in v0.2

- Dark technical visual system based on the existing HTML portfolio
- Responsive navigation, hero, social links, experience and skills
- Interactive featured project cards
- Reusable pipeline component
- Working progressive-delivery simulation with staged 0→10→25→50→100% canary progression
- Dedicated `/sandbox/progressive-delivery` lab experience
- Architecture decision-loop visualization
- Prometheus-style metric cards and sparklines
- Failure injection and explicit rollback recovery
- Simulated operator terminal for `kubectl`, `flagger`, `argocd` and `helm` commands
- Technology map with selectable building blocks
- Canary traffic and Prometheus/Flagger-style metric visualization
- Project data separated from UI components

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
npm run preview
```

## Simulation behavior

The homepage still contains a compact progressive-delivery preview. The full Stage 2 lab at `/sandbox/progressive-delivery` is state-driven: deploys move through the delivery chain, traffic shifts across canary steps, metrics change with the rollout, and a failure at 50% stops promotion so the user can trigger rollback.

This is a **frontend simulation**. It does not connect to a live Kubernetes cluster, AWS account, Prometheus server or Flagger instance.

## Next implementation phases

1. Add the AWS traffic/autoscaling simulator.
2. Add the CollegeFest deployment simulator.
3. Turn skills into a project relationship map.
4. Add a GitHub repository browser.
5. Deploy this site through its own CI/CD workflow.

## Stage 2 operator flow

1. Open `http://localhost:5173/sandbox/progressive-delivery`.
2. Click `deploy v2.4.0`.
3. Watch GitHub → Jenkins → Docker → Helm → Argo CD → Kubernetes → Istio → Prometheus → Flagger advance.
4. Observe stable/canary traffic and metric changes.
5. Use `inject degradation` during canary traffic, or pre-arm the 50% failure toggle before deployment.
6. Trigger `rollback` and watch traffic return to stable.
7. Use the simulated terminal commands to inspect the modeled state.

The lab is intentionally frontend-only and deterministic. It does not imply access to a live cluster or production infrastructure.
