import type { NotifyTone, PortalUser } from "@knightowl-vn/portal-sdk";
import { Alert, Card, PageHeader } from "@knightowl-vn/ui";
import { useCallback, useState } from "react";
import { Link, Route, Routes } from "react-router";
import { ADMIN_ROLE, canOpen, routeBase } from "./access";
import { Layout } from "./Layout";
import type { Registry } from "./registry";
import { RemoteRoute } from "./RemoteRoute";
import { LOGOUT_URL } from "./session";

interface Toast {
  id: number;
  message: string;
  tone: NotifyTone;
}

let nextToast = 1;

export function App({ user, registry }: { user: PortalUser; registry: Registry }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, tone: NotifyTone = "info") => {
    const id = nextToast++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <Layout user={user} apps={registry.apps} onLogout={() => window.location.assign(LOGOUT_URL)}>
      <Routes>
        <Route index element={<Home user={user} registry={registry} />} />
        {registry.apps.map((app) => (
          <Route
            key={app.manifest.name}
            path={`${routeBase(app.manifest)}/*`}
            element={<RemoteRoute user={user} app={app} notify={notify} />}
          />
        ))}
        <Route path="*" element={<Card title="Page not found">This page does not exist.</Card>} />
      </Routes>
      <div className="shell-toasts" aria-live="polite">
        {toasts.map((t) => (
          <Alert key={t.id} tone={t.tone}>
            {t.message}
          </Alert>
        ))}
      </div>
    </Layout>
  );
}

export function Home({ user, registry }: { user: PortalUser; registry: Registry }) {
  const mine = registry.apps.filter((a) => canOpen(user, a.manifest));
  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} description="Apps you have access to." />
      {user.roles.includes(ADMIN_ROLE) && registry.problems.length > 0 && (
        <div className="shell-problems">
          <Alert tone="warning">
            Some apps could not be loaded:
            <ul>
              {registry.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Alert>
        </div>
      )}
      {mine.length === 0 ? (
        <Card>You have no apps yet. Ask a product team for a role.</Card>
      ) : (
        <div className="shell-apps">
          {mine.map(({ manifest }) => (
            <Link key={manifest.name} to={routeBase(manifest)} className="shell-app-card">
              <Card title={manifest.title}>{manifest.description ?? ""}</Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
