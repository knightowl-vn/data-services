import { hasAnyRole, type PortalManifest, type PortalUser } from "@knightowl-vn/portal-sdk";

/** Portal-wide role: sees registry problems on the home page. */
export const ADMIN_ROLE = "portal:admin";

export function canOpen(user: PortalUser, manifest: PortalManifest): boolean {
  return hasAnyRole(user.roles, manifest.roles ?? []);
}

/** Navigation links the user may see for one product. */
export function navFor(user: PortalUser, manifest: PortalManifest): PortalManifest["nav"] {
  if (!canOpen(user, manifest)) return [];
  return manifest.nav.filter((n) => hasAnyRole(user.roles, n.roles ?? []));
}

export function routeBase(manifest: PortalManifest): string {
  return `/${manifest.name}`;
}
