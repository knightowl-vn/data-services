import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.restoreAllMocks());

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("api", () => {
  it("lists checks", async () => {
    mockFetch(200, [{ id: 1, name: "a" }]);
    await expect(api.listChecks()).resolves.toEqual([{ id: 1, name: "a" }]);
  });

  it("posts a new check", async () => {
    const spy = mockFetch(201, { id: 1 });
    await api.createCheck({ name: "a", dataset: "t", rule: "not_null" });
    expect(spy).toHaveBeenCalledWith("/api/checks", expect.objectContaining({ method: "POST" }));
  });

  it("throws on error status", async () => {
    mockFetch(404, { detail: "Check not found" });
    await expect(api.runCheck(99)).rejects.toThrow("404");
  });
});
