import type { Fetcher } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly detail?: unknown,
  ) {
    super(`${method} ${path} failed: ${status}`);
    this.name = "ApiError";
  }
}

/** JSON request through the portal fetcher. Throws ApiError on non-2xx. */
export async function requestJson<T>(fetcher: Fetcher, path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const res = await fetcher(path, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => undefined);
    throw new ApiError(res.status, method, path, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
