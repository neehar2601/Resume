# Neehara.dev — Interactive Cloud / DevOps Sandbox

This is the first React + TypeScript foundation for the interactive portfolio concept.

## Included in v0.1

- Dark technical visual system based on the existing HTML portfolio
- Responsive navigation, hero, social links, experience and skills
- Interactive featured project cards
- Reusable pipeline component
- Working progressive-delivery simulation with success and rollback paths
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

The Progressive Delivery card cycles through different outcomes when you run it repeatedly. Every third simulation triggers a failure path so the page can demonstrate automated rollback behavior.

This is a **frontend simulation**. It does not connect to a live Kubernetes cluster, AWS account, Prometheus server or Flagger instance.

## Next implementation phases

1. Add a dedicated `/sandbox/progressive-delivery` experience with architecture and observability views.
2. Add the AWS traffic/autoscaling simulator.
3. Add the CollegeFest deployment simulator.
4. Add the simulated terminal (`kubectl`, `helm`, `argocd`, `flagger`).
5. Turn skills into a project relationship map.
6. Add a GitHub repository browser.
7. Deploy this site through its own CI/CD workflow.
