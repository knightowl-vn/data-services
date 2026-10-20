# cert-manager

Installs [cert-manager](https://cert-manager.io) with Helm (CRDs included).
Other services use it to get TLS certificates, e.g. the CNPG backup plugin.

```bash
cd infra && pulumi stack select dev && pulumi up
```

| Output | Description |
|---|---|
| `namespace` | Where cert-manager runs |
| `version` | Installed chart version |
