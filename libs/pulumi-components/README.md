# pulumi-components

Shared Pulumi components. This is how products get resources on platform
services without touching `platform/`.

| Component | Creates |
|---|---|
| `AppNamespace` | Kubernetes namespace, resource quota, service account |
| `PostgresTenant` | Database + login role on the shared Postgres, and a k8s Secret with `DATABASE_URL` in the app namespace |

Add a component here when two or more products need the same setup.
Owned by the platform team; changes need their review (see CODEOWNERS).

Install into a Pulumi project with:

```
-e ../../../libs/pulumi-components
```
