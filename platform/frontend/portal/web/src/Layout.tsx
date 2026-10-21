import type { PortalUser } from "@knightowl-vn/portal-sdk";
import { Button } from "@knightowl-vn/ui";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { navFor, routeBase } from "./access";
import type { LoadedApp } from "./registry";

export function Layout({
  user,
  apps,
  onLogout,
  children,
}: {
  user: PortalUser;
  apps: LoadedApp[];
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="shell-header">
        <NavLink to="/" className="shell-brand">
          knightowl
        </NavLink>
        <div className="shell-user">
          <span title={user.email}>{user.name}</span>
          <Button variant="secondary" size="sm" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </header>
      <nav className="shell-nav" aria-label="Apps">
        {apps.map(({ manifest }) => {
          const items = navFor(user, manifest);
          if (items.length === 0) return null;
          const base = routeBase(manifest);
          return (
            <div key={manifest.name} className="shell-nav__group">
              <div className="shell-nav__title">{manifest.title}</div>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path ? `${base}/${item.path}` : base}
                  end={item.path === ""}
                  className="shell-nav__link"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
