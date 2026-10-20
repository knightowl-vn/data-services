# Postgres (shared)

Shared PostgreSQL cluster run by the database team.

## Using it from a product

Products never change this folder. They read this stack's outputs and create
their own tenant with `PostgresTenant` from `libs/pulumi-components`:

```python
pg = pulumi.StackReference(f"{org}/postgres/{env}")
PostgresTenant("my-product", host=pg.get_output("host"), ...)
```

## Outputs (contract)

| Output | Description |
|---|---|
| `host` | In-cluster service DNS name |
| `port` | 5432 |
| `admin_user` | Admin role used to create tenants |
| `admin_password` | Secret |
