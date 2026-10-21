// Types and calls match ../../api/openapi.json (generated from the api code).
// Calls go through the portal's fetch: same origin, session cookie, /apps/data-quality prefix.
import { type Fetcher, requestJson, usePortal } from "@knightowl-vn/portal-sdk";
import { useMemo } from "react";

export type Rule = "not_null" | "unique" | "row_count_min" | "freshness_hours";
export const RULES: Rule[] = ["not_null", "unique", "row_count_min", "freshness_hours"];

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

export function createApi(fetcher: Fetcher) {
  const post = { method: "POST" };
  return {
    listChecks: () => requestJson<Check[]>(fetcher, "/api/v1/checks"),
    getCheck: (id: number) => requestJson<Check>(fetcher, `/api/v1/checks/${id}`),
    createCheck: (body: CheckCreate) =>
      requestJson<Check>(fetcher, "/api/v1/checks", { ...post, body: JSON.stringify(body) }),
    runCheck: (id: number) => requestJson<Run>(fetcher, `/api/v1/checks/${id}/runs`, post),
    listRuns: (id: number) => requestJson<Run[]>(fetcher, `/api/v1/checks/${id}/runs`),
  };
}

export type Api = ReturnType<typeof createApi>;

export function useApi(): Api {
  const { fetch } = usePortal();
  return useMemo(() => createApi(fetch), [fetch]);
}
