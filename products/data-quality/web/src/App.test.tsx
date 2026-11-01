import { hasAnyRole, type PortalContextValue, PortalProvider, validateManifest } from "@knightowl-vn/portal-sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import manifest from "../public/portal.json";
import App from "./App";
import { ROLES } from "./roles";

function render(roles: string[], path = "/") {
  const ctx: PortalContextValue = {
    user: { id: "u", name: "U", roles },
    app: { name: "data-quality", title: "Data Quality", routeBase: "/", serviceBase: "/apps/data-quality" },
    hasRole: (...wanted) => hasAnyRole(roles, wanted),
    fetch: vi.fn(),
    notify: vi.fn(),
    logout: vi.fn(),
  };
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <PortalProvider value={ctx}>
        <App />
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("portal.json", () => {
  it("is a valid portal manifest and uses this product's roles", () => {
    expect(validateManifest(manifest, "data-quality")).toMatchObject({ ok: true });
    expect(manifest.roles).toEqual(expect.arrayContaining(Object.values(ROLES)));
  });
});

describe("App", () => {
  it("shows the add form to editors only", () => {
    expect(render([ROLES.editor])).toContain("Add check");
    expect(render([ROLES.viewer])).not.toContain("Add check");
  });

  it("routes to a check's runs", () => {
    expect(render([ROLES.viewer], "/checks/7")).toContain("Check #7");
  });
});
