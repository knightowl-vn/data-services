import { describe, expect, it } from "vitest";
import { PORTAL_SHARED, portalRemote } from "../vite.js";

describe("portalRemote", () => {
  it("mounts the remote under /apps/<name>/ and proxies its api in dev", () => {
    const [layout] = portalRemote({ name: "data-quality" }) as unknown as [{ config: () => any }];
    const cfg = layout.config();
    expect(cfg.base).toBe("/apps/data-quality/");
    const proxy = cfg.server.proxy["/apps/data-quality/api"];
    expect(proxy.rewrite("/apps/data-quality/api/v1/checks")).toBe("/api/v1/checks");
  });

  it("rejects names the shell cannot route", () => {
    expect(() => portalRemote({ name: "Data_Quality" })).toThrow(/invalid product name/);
  });

  it("shares React, the router, ui and the sdk", () => {
    expect(PORTAL_SHARED).toEqual(
      expect.arrayContaining(["react", "react-dom", "react-router", "@knightowl-vn/ui", "@knightowl-vn/portal-sdk"]),
    );
  });
});
