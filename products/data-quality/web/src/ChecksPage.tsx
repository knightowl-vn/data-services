import { RequireRole, usePortal } from "@knightowl-vn/portal-sdk";
import { Alert, Badge, Button, Card, DataTable, PageHeader, SelectField, TextField } from "@knightowl-vn/ui";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { type Check, RULES, type Rule, useApi } from "./api";
import { ROLES } from "./roles";
import styles from "./ChecksPage.module.css";

export function ChecksPage() {
  const api = useApi();
  const { notify, hasRole } = usePortal();
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canEdit = hasRole(ROLES.editor);

  const load = useCallback(
    () => api.listChecks().then(setChecks).catch((e: Error) => setError(e.message)),
    [api],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const threshold = form.get("threshold");
    try {
      await api.createCheck({
        name: String(form.get("name")),
        dataset: String(form.get("dataset")),
        rule: form.get("rule") as Rule,
        column: (form.get("column") as string) || null,
        threshold: threshold ? Number(threshold) : null,
      });
      formEl.reset();
      setError(null);
      notify("Check added", "success");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onRun(id: number) {
    try {
      const run = await api.runCheck(id);
      notify(`Run #${run.id} ${run.status}`, "info");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Checks" description="Data quality rules on datasets." />
      {error && <Alert tone="danger">{error}</Alert>}

      <RequireRole roles={[ROLES.editor]}>
        <div className={styles.section}>
          <Card title="Add check">
            <form onSubmit={onSubmit} className={styles.form}>
              <TextField name="name" label="Name" required />
              <TextField name="dataset" label="Dataset" placeholder="sales.orders" required />
              <SelectField name="rule" label="Rule" options={RULES} defaultValue="not_null" />
              <TextField name="column" label="Column" placeholder="Optional" />
              <TextField name="threshold" label="Threshold" type="number" placeholder="Optional" />
              <Button type="submit">Add check</Button>
            </form>
          </Card>
        </div>
      </RequireRole>

      <div className={styles.section}>
        <Card title="All checks">
          <DataTable
            rows={checks}
            rowKey={(c) => c.id}
            empty="No checks yet."
            columns={[
              { key: "name", header: "Name", render: (c) => <Link to={`checks/${c.id}`}>{c.name}</Link> },
              { key: "dataset", header: "Dataset" },
              { key: "rule", header: "Rule", render: (c) => <Badge tone="info">{c.rule}</Badge> },
              {
                key: "actions",
                header: "",
                align: "end",
                render: (c) =>
                  canEdit && (
                    <Button size="sm" variant="secondary" onClick={() => onRun(c.id)}>
                      Run
                    </Button>
                  ),
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
