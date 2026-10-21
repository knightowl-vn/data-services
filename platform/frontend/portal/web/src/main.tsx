import "@knightowl-vn/ui"; // tokens + component styles, shared with every remote
import { Alert } from "@knightowl-vn/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { loadRegistry, registerRemotes } from "./registry";
import { loadSession, redirectToLogin } from "./session";
import "./shell.css";

const root = createRoot(document.getElementById("root")!);

async function boot() {
  const user = await loadSession();
  if (!user) {
    redirectToLogin();
    return;
  }
  const registry = await loadRegistry();
  if (registry.problems.length) console.warn("[portal] registry problems", registry.problems);
  registerRemotes(registry.apps);

  root.render(
    <StrictMode>
      <BrowserRouter>
        <App user={user} registry={registry} />
      </BrowserRouter>
    </StrictMode>,
  );
}

boot().catch((e: Error) => {
  console.error(e);
  root.render(<Alert tone="danger">The portal could not start: {e.message}</Alert>);
});
