/**
 * portal.json: what a product tells the shell about itself. Served by the product
 * at `/apps/<name>/portal.json`, so the product changes it with its own deploy.
 */
export interface PortalManifest {
  /** Product name, same as in product.yaml. Lowercase, digits and dashes. */
  name: string;
  /** Shown in the navigation and page title. */
  title: string;
  description?: string;
  /**
   * The user needs at least one of these roles to open the product.
   * Omit to allow every signed-in user.
   */
  roles?: string[];
  /** Navigation links. `path` is relative to the product route ("" = its home). */
  nav: { label: string; path: string; roles?: string[] }[];
}

export const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Paths the shell uses itself, so no product may be called this. */
export const RESERVED_NAMES = ["apps", "assets", "oauth2", "healthz", "remotes.json"];

/** Roles a product may use: its own ("<name>:<role>") or portal-wide ("portal:<role>"). */
function roleErrors(name: string, roles: unknown, where: string): string[] {
  if (roles === undefined) return [];
  if (!Array.isArray(roles) || roles.some((r) => typeof r !== "string")) {
    return [`${where} must be a list of strings`];
  }
  return roles
    .filter((r: string) => !r.startsWith(`${name}:`) && !r.startsWith("portal:"))
    .map((r: string) => `${where}: role "${r}" must start with "${name}:" or "portal:"`);
}

export type ManifestResult =
  | { ok: true; manifest: PortalManifest }
  | { ok: false; errors: string[] };

/** Used by the shell before mounting a product, and by product tests in CI. */
export function validateManifest(value: unknown, expectedName?: string): ManifestResult {
  const errors: string[] = [];
  if (typeof value !== "object" || value === null) return { ok: false, errors: ["not an object"] };
  const m = value as Record<string, unknown>;

  if (typeof m.name !== "string" || !NAME_PATTERN.test(m.name)) {
    errors.push("name must be lowercase letters, digits and dashes");
  } else if (RESERVED_NAMES.includes(m.name)) {
    errors.push(`name "${m.name}" is reserved by the portal`);
  } else if (expectedName && m.name !== expectedName) {
    errors.push(`name is "${m.name}" but the registry expects "${expectedName}"`);
  }
  if (typeof m.title !== "string" || m.title.trim() === "") errors.push("title is required");
  if (m.description !== undefined && typeof m.description !== "string") {
    errors.push("description must be a string");
  }

  const name = typeof m.name === "string" ? m.name : "";
  errors.push(...roleErrors(name, m.roles, "roles"));

  if (!Array.isArray(m.nav)) {
    errors.push("nav must be a list");
  } else {
    m.nav.forEach((item: unknown, i) => {
      const n = (item ?? {}) as Record<string, unknown>;
      if (typeof n.label !== "string" || n.label === "") errors.push(`nav[${i}].label is required`);
      if (typeof n.path !== "string" || n.path.startsWith("/") || n.path.includes("..")) {
        errors.push(`nav[${i}].path must be relative, e.g. "" or "checks"`);
      }
      errors.push(...roleErrors(name, n.roles, `nav[${i}].roles`));
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, manifest: m as unknown as PortalManifest };
}

/** Module Federation container name for a product ("data-quality" -> "data_quality"). */
export function federationName(name: string): string {
  return name.replace(/-/g, "_");
}

/** Where the shell reaches a product's web Service. */
export function serviceBase(name: string): string {
  return `/apps/${name}`;
}
