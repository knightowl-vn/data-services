// Types and calls match ../../api/openapi.json (generated from the api code).
export type Rule = "not_null" | "unique" | "row_count_min" | "freshness_hours";

export interface CheckCreate {
  name: string;
  dataset: string;
  rule: Rule;
  column?: string | null;
  threshold?: number | null;
}

export interface Check extends CheckCreate {
  id: number;
  created_at: string;
}

export interface Run {
  id: number;
  check_id: number;
  status: "queued" | "running" | "passed" | "failed";
  created_at: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  listChecks: () => request<Check[]>("/api/v1/checks"),
  createCheck: (body: CheckCreate) =>
    request<Check>("/api/v1/checks", { method: "POST", body: JSON.stringify(body) }),
  runCheck: (id: number) => request<Run>(`/api/v1/checks/${id}/runs`, { method: "POST" }),
};
