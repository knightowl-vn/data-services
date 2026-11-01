import type { PortalManifest, PortalUser } from "@knightowl-vn/portal-sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { canOpen, navFor } from "./access";
import { Home } from "./App";
import { Layout } from "./Layout";
import { loadRegistry, type Registry } from "./registry";
import { makeContext } from "./RemoteRoute";
import { loadSession, loginUrl, toUser } from "./session";

vi.mock("@module-federation/runtime", () => ({ getInstance: () => undefined }));

const dq: PortalManifest = {
  name: "data-quality",
  title: "Data Quality",
  roles: ["data-quality:viewer", "data-quality:editor"],
  nav: [
    { label: "Checks", path: "" },
    { label: "Settings", path: "settings", roles: ["data-quality:editor"] },
  ],
};

const user = (roles: string[]): PortalUser => ({ id: "u", name: "Ann", roles });

function respond(routes: Record<string, unknown>) {
  return vi.fn(async (url: string) =>
    url in routes
      ? new Response(JSON.stringify(routes[url]), { status: 200 })
      : new Response("not found", { status: 404 }),
  ) as unknown as typeof fetch;
}

describe("session", () => {
  it("maps oauth2-proxy userinfo to a portal user; groups are roles", () => {
    expect(
      toUser({ user: "abc", email: "a@x.io", preferredUsername: "ann", groups: ["data-quality:viewer"] }),
    ).toEqual({ id: "abc", name: "ann", email: "a@x.io", roles: ["data-quality:viewer"] });
  });

  it("returns null without a session, so the shell redirects to login", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 401 })) as unknown as typeof fetch;
    await expect(loadSession(fetcher)).resolves.toBeNull();
    expect(loginUrl("/data-quality?x=1")).toBe("/oauth2/start?rd=%2Fdata-quality%3Fx%3D1");
  });
});

describe("access", () => {
  it("needs one of the product roles to open it", () => {
    expect(canOpen(user(["data-quality:viewer"]), dq)).toBe(true);
    expect(canOpen(user(["billing:viewer"]), dq)).toBe(false);
    expect(canOpen(user([]), { ...dq, roles: undefined })).toBe(true);
  });

  it("filters navigation by role", () => {
    expect(navFor(user(["data-quality:viewer"]), dq).map((n) => n.label)).toEqual(["Checks"]);
    expect(navFor(user(["data-quality:editor"]), dq).map((n) => n.label)).toEqual(["Checks", "Settings"]);
    expect(navFor(user([]), dq)).toEqual([]);
  });
});

describe("registry", () => {
  it("loads valid products and reports broken ones without failing", async () => {
    const fetcher = respond({
      "/remotes.json": { remotes: [{ name: "data-quality" }, { name: "billing" }, { name: "apps" }] },
      "/apps/data-quality/portal.json": dq,
      "/apps/billing/portal.json": { name: "billing", title: "", nav: [] },
    });
    const reg = await loadRegistry(fetcher);
    expect(reg.apps).toEqual([{ manifest: dq, serviceBase: "/apps/data-quality" }]);
    expect(reg.problems).toEqual([
      'remotes.json: invalid entry {"name":"apps"}',
      "billing: title is required",
    ]);
  });

  it("still starts when remotes.json is missing", async () => {
    const reg = await loadRegistry(respond({}));
    expect(reg).toEqual({ apps: [], problems: ["remotes.json: status 404"] });
  });
});

describe("remote context", () => {
  it("sends api calls to the product's service with the session cookie", async () => {
    const fetcher = vi.fn(async () => new Response("[]")) as unknown as typeof fetch;
    const app = { manifest: dq, serviceBase: "/apps/data-quality" };
    const ctx = makeContext(user(["data-quality:viewer"]), app, vi.fn(), fetcher);
    await ctx.fetch("/api/v1/checks");
    expect(fetcher).toHaveBeenCalledWith("/apps/data-quality/api/v1/checks", { credentials: "same-origin" });
    expect(ctx.app.routeBase).toBe("/data-quality");
    expect(ctx.hasRole("data-quality:editor")).toBe(false);
  });
});

describe("layout", () => {
  const registry: Registry = { apps: [{ manifest: dq, serviceBase: "/apps/data-quality" }], problems: ["x: broken"] };

  it("shows only the apps and links the user may open", () => {
    const html = (roles: string[]) =>
      renderToStaticMarkup(
        <MemoryRouter>
          <Layout user={user(roles)} apps={registry.apps} onLogout={() => {}}>
            <Home user={user(roles)} registry={registry} />
          </Layout>
        </MemoryRouter>,
      );
    const viewer = html(["data-quality:viewer"]);
    expect(viewer).toContain('href="/data-quality"');
    expect(viewer).not.toContain("Settings");
    expect(viewer).not.toContain("x: broken"); // problems only for portal admins

    const outsider = html([]);
    expect(outsider).not.toContain("Data Quality");
    expect(outsider).toContain("You have no apps yet");

    expect(html(["data-quality:editor", "portal:admin"])).toContain("x: broken");
  });
});
