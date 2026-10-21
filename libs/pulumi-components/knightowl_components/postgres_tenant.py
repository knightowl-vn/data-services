"""A database and login role for one app on the shared Postgres."""

import pulumi
import pulumi_kubernetes as k8s
import pulumi_postgresql as postgresql
import pulumi_random as random


class PostgresTenant(pulumi.ComponentResource):
    """Creates ``database`` owned by a new login role, and writes the
    connection string to a k8s Secret named ``<database>-db`` in ``namespace``
    (underscores become dashes, e.g. ``data_quality`` -> ``data-quality-db``).

    ``host`` is where Pulumi connects as admin (the primary). ``app_host`` is
    what the app connects to, usually the pooler; defaults to ``host``.
    """

    def __init__(
        self,
        name: str,
        database: str,
        namespace: pulumi.Input[str],
        host: pulumi.Input[str],
        port: pulumi.Input[int],
        admin_user: pulumi.Input[str],
        admin_password: pulumi.Input[str],
        app_host: pulumi.Input[str] | None = None,
        sslmode: str = "require",
        opts: pulumi.ResourceOptions | None = None,
    ):
        super().__init__("knightowl:platform:PostgresTenant", name, None, opts)

        provider = postgresql.Provider(
            f"{name}-pg",
            host=host,
            port=port,
            username=admin_user,
            password=admin_password,
            sslmode=sslmode,  # CloudNativePG serves TLS by default
            opts=pulumi.ResourceOptions(parent=self),
        )
        pg = pulumi.ResourceOptions(parent=self, provider=provider)

        password = random.RandomPassword(
            f"{name}-password",
            length=32,
            special=False,
            opts=pulumi.ResourceOptions(parent=self),
        )
        role = postgresql.Role(
            f"{name}-role",
            name=database,
            login=True,
            password=password.result,
            opts=pg,
        )
        db = postgresql.Database(f"{name}-db", name=database, owner=role.name, opts=pg)

        url = pulumi.Output.format(
            "postgresql://{0}:{1}@{2}:{3}/{4}?sslmode={5}",
            role.name,
            password.result,
            app_host or host,
            port,
            db.name,
            sslmode,
        )
        self.secret = k8s.core.v1.Secret(
            f"{name}-db-secret",
            metadata={"name": f"{database.replace('_', '-')}-db", "namespace": namespace},
            string_data={"DATABASE_URL": url},
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.database = db.name
        self.secret_name = self.secret.metadata["name"]
        self.register_outputs({"database": self.database, "secret_name": self.secret_name})
