import { ApiError } from "@knightowl-vn/portal-sdk";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "./api";

function fetcher(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("api", () => {
  it("lists checks", async () => {
    const api = createApi(fetcher(200, [{ id: 1, name: "a" }]));
    await expect(api.listChecks()).resolves.toEqual([{ id: 1, name: "a" }]);
  });

  it("posts a new check to the versioned path", async () => {
    const f = fetcher(201, { id: 1 });
    await createApi(f).createCheck({ name: "a", dataset: "t", rule: "not_null" });
    expect(f).toHaveBeenCalledWith("/api/v1/checks", expect.objectContaining({ method: "POST" }));
  });

  it("throws ApiError on error status", async () => {
    const err = await createApi(fetcher(404, { detail: "Check not found" }))
      .runCheck(99)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404 });
  });
});
