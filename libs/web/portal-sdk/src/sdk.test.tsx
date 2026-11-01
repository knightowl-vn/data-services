import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  federationName,
  hasAnyRole,
  type PortalContextValue,
  PortalProvider,
  RequireRole,
  requestJson,
  validateManifest,
} from "./index";

afterEach(() => vi.restoreAllMocks());

function ctx(roles: string[]): PortalContextValue {
  return {
    user: { id: "u", name: "U", roles },
    app: { name: "x", title: "X", routeBase: "/x", serviceBase: "/apps/x" },
    hasRole: (...wanted) => hasAnyRole(roles, wanted),
    fetch: vi.fn(),
    notify: vi.fn(),
    logout: vi.fn(),
  };
}

describe("roles", () => {
  it("matches any of the wanted roles; no roles wanted means allowed", () => {
    expect(hasAnyRole(["a:viewer"], ["a:editor", "a:viewer"])).toBe(true);
    expect(hasAnyRole(["a:viewer"], ["a:editor"])).toBe(false);
    expect(hasAnyRole([], [])).toBe(true);
  });

  it("RequireRole hides children without the role", () => {
    const ui = (roles: string[]) =>
      renderToStaticMarkup(
        <PortalProvider value={ctx(roles)}>
          <RequireRole roles={["x:editor"]} fallback="no">
            yes
          </RequireRole>
        </PortalProvider>,
      );
    expect(ui(["x:editor"])).toBe("yes");
    expect(ui(["x:viewer"])).toBe("no");
  });
});

describe("requestJson", () => {
  it("sends JSON through the fetcher and parses the reply", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":1}', { status: 201 }));
    await expect(requestJson(fetcher, "/api/v1/x", { method: "POST", body: "{}" })).resolves.toEqual({ id: 1 });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/x",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Content-Type": "application/json" }) }),
    );
  });

  it("throws ApiError with status and detail", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"detail":"nope"}', { status: 403 }));
    const err = await requestJson(fetcher, "/api/v1/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, detail: { detail: "nope" } });
  });
});

describe("validateManifest", () => {
  const good = {
    name: "data-quality",
    title: "Data Quality",
    roles: ["data-quality:viewer", "portal:admin"],
    nav: [{ label: "Checks", path: "" }],
  };

  it("accepts a valid manifest", () => {
    expect(validateManifest(good, "data-quality")).toEqual({ ok: true, manifest: good });
  });

  it("rejects another product's roles, absolute paths and a wrong name", () => {
    const res = validateManifest(
      { ...good, roles: ["billing:admin"], nav: [{ label: "x", path: "/etc" }] },
      "other",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toEqual([
        'name is "data-quality" but the registry expects "other"',
        'roles: role "billing:admin" must start with "data-quality:" or "portal:"',
        'nav[0].path must be relative, e.g. "" or "checks"',
      ]);
    }
  });

  it("maps names to federation container names", () => {
    expect(federationName("data-quality")).toBe("data_quality");
  });
});
