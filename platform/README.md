# platform/

Shared infrastructure, run once and used by every app. Grouped by
CNCF-style category: `platform/<category>/<tool>/`.

Each tool folder has the same layout:

```
<tool>/
├── service.yaml   # owner, layer, depends_on, outputs (the contract)
├── infra/         # Pulumi project; stack per env (Pulumi.<env>.yaml)
├── deploy/        # k8s manifests, if not installed by Pulumi
└── README.md
```

## Layers (no dependency cycles)

A service may depend only on services in the same or a lower layer.

| Layer | Categories |
|---|---|
| 1 | provisioning, runtime, security-compliance |
| 2 | databases, streaming-messaging |
| 3 | observability, workflow-orchestration, data-catalog, cicd |
| 4 | bi-analytics |

## Contract

Other projects read only a service's **stack outputs** (listed under
`outputs` in `service.yaml`), via `pulumi.StackReference("<org>/<tool>/<env>")`.
Reusable setup for consumers (tenants, topics, namespaces) lives in
`libs/pulumi-components`.
