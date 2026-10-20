import { type FormEvent, useEffect, useState } from "react";
import { api, type Check, type Rule } from "./api";

const RULES: Rule[] = ["not_null", "unique", "row_count_min", "freshness_hours"];

export function App() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => api.listChecks().then(setChecks).catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const threshold = form.get("threshold");
    try {
      await api.createCheck({
        name: String(form.get("name")),
        dataset: String(form.get("dataset")),
        rule: form.get("rule") as Rule,
        column: (form.get("column") as string) || null,
        threshold: threshold ? Number(threshold) : null,
      });
      e.currentTarget.reset();
      setError(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onRun(id: number) {
    try {
      const run = await api.runCheck(id);
      setMessage(`Run #${run.id} ${run.status}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 800, margin: "2rem auto", padding: 16 }}>
      <h1>Data Quality</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <input name="name" placeholder="Check name" required />
        <input name="dataset" placeholder="Dataset, e.g. sales.orders" required />
        <select name="rule" defaultValue="not_null">
          {RULES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input name="column" placeholder="Column (optional)" />
        <input name="threshold" type="number" placeholder="Threshold (optional)" />
        <button type="submit">Add check</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {message && <p>{message}</p>}

      <table width="100%">
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Dataset</th>
            <th align="left">Rule</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.dataset}</td>
              <td>{c.rule}</td>
              <td>
                <button onClick={() => onRun(c.id)}>Run</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
