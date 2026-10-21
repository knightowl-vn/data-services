import {
  federationName,
  NAME_PATTERN,
  RESERVED_NAMES,
  type PortalManifest,
  serviceBase,
  validateManifest,
} from "@knightowl-vn/portal-sdk";
import { getInstance } from "@module-federation/runtime";
import type { ComponentType } from "react";

/**
 * Which products are in the portal.
 *
 * /remotes.json (a ConfigMap per env, owned by the platform team) only lists
 * product names. Everything else comes from the product's own portal.json,
 * served by the product, so teams change their navigation and roles with
 * their own deploy.
 */
export interface LoadedApp {
  manifest: PortalManifest;
  serviceBase: string;
}

export interface Registry {
  apps: LoadedApp[];
  /** Products that could not be loaded. The rest of the portal still works. */
  problems: string[];
}

export async function loadRegistry(fetcher: typeof fetch = fetch): Promise<Registry> {
  const problems: string[] = [];
  let names: string[] = [];
  try {
    const res = await fetcher("/remotes.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as { remotes?: { name?: unknown }[] };
    for (const r of body.remotes ?? []) {
      const ok =
        typeof r.name === "string" && NAME_PATTERN.test(r.name) && !RESERVED_NAMES.includes(r.name);
      if (ok) names.push(r.name as string);
      else problems.push(`remotes.json: invalid entry ${JSON.stringify(r)}`);
    }
  } catch (e) {
    problems.push(`remotes.json: ${(e as Error).message}`);
    names = [];
  }

  const results = await Promise.all(
    names.map(async (name): Promise<LoadedApp | string> => {
      const base = serviceBase(name);
      try {
        const res = await fetcher(`${base}/portal.json`, { cache: "no-cache" });
        if (!res.ok) return `${name}: portal.json returned ${res.status}`;
        const result = validateManifest(await res.json(), name);
        if (!result.ok) return `${name}: ${result.errors.join("; ")}`;
        return { manifest: result.manifest, serviceBase: base };
      } catch (e) {
        return `${name}: ${(e as Error).message}`;
      }
    }),
  );

  const apps: LoadedApp[] = [];
  for (const r of results) {
    if (typeof r === "string") problems.push(r);
    else apps.push(r);
  }
  return { apps, problems };
}

/** Tell Module Federation where each product's remoteEntry.js is. */
export function registerRemotes(apps: LoadedApp[]): void {
  const mf = getInstance();
  if (!mf) throw new Error("Module Federation runtime is not initialised");
  mf.registerRemotes(
    apps.map((a) => ({
      name: federationName(a.manifest.name),
      entry: `${a.serviceBase}/remoteEntry.js`,
      type: "module",
    })),
  );
}

const loaded = new Map<string, Promise<{ default: ComponentType }>>();

/** The product's root component (its exposed "./App"). Loaded once, on first visit. */
export function loadRemoteApp(name: string): Promise<{ default: ComponentType }> {
  let p = loaded.get(name);
  if (!p) {
    p = getInstance()!
      .loadRemote<{ default: ComponentType }>(`${federationName(name)}/App`)
      .then((mod) => {
        if (!mod?.default) throw new Error(`${name} does not export a default App component`);
        return mod;
      });
    // Allow a retry after a failed load (e.g. during the product's deploy).
    p.catch(() => loaded.delete(name));
    loaded.set(name, p);
  }
  return p;
}
