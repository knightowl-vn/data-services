import { type NotifyTone, type PortalContextValue, PortalProvider, hasAnyRole } from "@knightowl-vn/portal-sdk";
import type { PortalUser } from "@knightowl-vn/portal-sdk";
import { Alert, Button, Card, Spinner } from "@knightowl-vn/ui";
import { Component, type ReactNode, Suspense, lazy, useEffect, useMemo } from "react";
import { canOpen, routeBase } from "./access";
import { type LoadedApp, loadRemoteApp } from "./registry";
import { LOGOUT_URL, redirectToLogin } from "./session";

/** Keeps one product's crash inside its own area of the page. */
class RemoteBoundary extends Component<
  { title: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[portal] ${this.props.title} failed`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card title={`${this.props.title} is unavailable`}>
        <Alert tone="danger">{this.state.error.message}</Alert>
        <p>Other apps in the portal still work. Try again in a moment.</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </Card>
    );
  }
}

export function makeContext(
  user: PortalUser,
  app: LoadedApp,
  notify: (message: string, tone?: NotifyTone) => void,
  fetcher: typeof fetch = fetch,
): PortalContextValue {
  const { manifest, serviceBase } = app;
  return {
    user,
    app: { name: manifest.name, title: manifest.title, routeBase: routeBase(manifest), serviceBase },
    hasRole: (...roles) => hasAnyRole(user.roles, roles),
    fetch: async (path, init) => {
      if (!path.startsWith("/")) throw new Error(`portal fetch: path must start with "/": ${path}`);
      const res = await fetcher(`${serviceBase}${path}`, { credentials: "same-origin", ...init });
      // Session expired: oauth2-proxy answers api routes with 401.
      if (res.status === 401) redirectToLogin();
      return res;
    },
    notify,
    logout: () => window.location.assign(LOGOUT_URL),
  };
}

export function Forbidden({ title }: { title: string }) {
  return (
    <Card title="No access">
      <p>
        You are signed in, but you do not have a role that opens <strong>{title}</strong>. Ask its
        team for access.
      </p>
    </Card>
  );
}

export function RemoteRoute({
  user,
  app,
  notify,
}: {
  user: PortalUser;
  app: LoadedApp;
  notify: (message: string, tone?: NotifyTone) => void;
}) {
  const { manifest } = app;
  const allowed = canOpen(user, manifest);
  const value = useMemo(() => makeContext(user, app, notify), [user, app, notify]);
  const RemoteApp = useMemo(() => lazy(() => loadRemoteApp(manifest.name)), [manifest.name]);

  useEffect(() => {
    document.title = `${manifest.title} · knightowl`;
  }, [manifest.title]);

  if (!allowed) return <Forbidden title={manifest.title} />;

  return (
    <RemoteBoundary key={manifest.name} title={manifest.title}>
      <PortalProvider value={value}>
        <Suspense fallback={<Spinner label={`Loading ${manifest.title}`} />}>
          <RemoteApp />
        </Suspense>
      </PortalProvider>
    </RemoteBoundary>
  );
}
