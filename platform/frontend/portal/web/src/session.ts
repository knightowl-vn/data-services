import type { PortalUser } from "@knightowl-vn/portal-sdk";

/**
 * Login is enforced by oauth2-proxy in front of the shell: no request reaches the
 * shell, a remote or an api without a valid session. The shell only reads who the
 * user is, and sends them back to log in when the session expires.
 */

/** Response of oauth2-proxy's /oauth2/userinfo. */
interface UserInfo {
  user: string;
  email?: string;
  preferredUsername?: string;
  groups?: string[];
}

export function toUser(info: UserInfo): PortalUser {
  return {
    id: info.user,
    name: info.preferredUsername || info.email || info.user,
    email: info.email,
    // Identity provider roles reach oauth2-proxy as the "groups" claim.
    roles: info.groups ?? [],
  };
}

export function loginUrl(returnTo: string): string {
  return `/oauth2/start?rd=${encodeURIComponent(returnTo)}`;
}

export const LOGOUT_URL = "/oauth2/sign_out?rd=%2F";

export function currentPath(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

export function redirectToLogin(): void {
  window.location.assign(loginUrl(currentPath()));
}

/** The signed-in user, or null when there is no session (caller redirects to login). */
export async function loadSession(fetcher: typeof fetch = fetch): Promise<PortalUser | null> {
  const res = await fetcher("/oauth2/userinfo", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Could not load the session: ${res.status}`);
  return toUser((await res.json()) as UserInfo);
}
