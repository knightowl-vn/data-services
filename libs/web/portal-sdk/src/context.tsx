import { createContext, type ReactNode, useContext } from "react";
import type { PortalContextValue } from "./types";

const PortalContext = createContext<PortalContextValue | null>(null);

/** Used by the shell (and DevPortal) to give a remote its context. */
export function PortalProvider({
  value,
  children,
}: {
  value: PortalContextValue;
  children: ReactNode;
}) {
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error(
      "usePortal() needs a PortalProvider. In the portal the shell adds it; " +
        "for standalone dev wrap your app in <DevPortal> from @knightowl-vn/portal-sdk.",
    );
  }
  return ctx;
}

/** True if the user has at least one of the roles. */
export function useHasRole(...roles: string[]): boolean {
  return usePortal().hasRole(...roles);
}

/**
 * Renders children only for users with at least one of `roles`.
 * This hides UI; the api must still check the role on every request.
 */
export function RequireRole({
  roles,
  fallback = null,
  children,
}: {
  roles: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return <>{useHasRole(...roles) ? children : fallback}</>;
}

/** Shared role check, used by the shell and DevPortal so they agree. */
export function hasAnyRole(userRoles: readonly string[], wanted: readonly string[]): boolean {
  return wanted.length === 0 || wanted.some((r) => userRoles.includes(r));
}
