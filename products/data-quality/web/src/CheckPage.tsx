import { Alert, Badge, Card, DataTable, PageHeader, type Tone } from "@knightowl-vn/ui";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { type Check, type Run, useApi } from "./api";

const STATUS_TONE: Record<Run["status"], Tone> = {
  queued: "neutral",
  running: "info",
  passed: "success",
  failed: "danger",
};

export function CheckPage() {
  const id = Number(useParams().id);
  const api = useApi();
  const [check, setCheck] = useState<Check | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getCheck(id), api.listRuns(id)])
      .then(([c, r]) => {
        setCheck(c);
        setRuns(r);
      })
      .catch((e: Error) => setError(e.message));
  }, [api, id]);

  return (
    <>
      <PageHeader
        title={check?.name ?? `Check #${id}`}
        description={check && `${check.rule} on ${check.dataset}${check.column ? `.${check.column}` : ""}`}
        actions={<Link to="..">All checks</Link>}
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <Card title="Runs">
        <DataTable
          rows={runs}
          rowKey={(r) => r.id}
          empty="Not run yet."
          columns={[
            { key: "id", header: "Run" },
            { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
            { key: "created_at", header: "Started", render: (r) => new Date(r.created_at).toLocaleString() },
          ]}
        />
      </Card>
    </>
  );
}
