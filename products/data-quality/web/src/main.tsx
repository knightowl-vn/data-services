// Standalone entry (index.html). In the portal this file is not used: the shell
// loads ./App through remoteEntry.js.
import { createRoot } from "react-dom/client";
import { ROLES } from "./roles";

if (import.meta.env.DEV) {
  // `npm run dev`: run without the shell, with a fake user (?roles=... to switch).
  const [{ DevPortal }, { default: App }] = await Promise.all([
    import("@knightowl-vn/portal-sdk"),
    import("./App"),
  ]);
  createRoot(document.getElementById("root")!).render(
    <DevPortal name="data-quality" title="Data Quality" roles={[ROLES.editor]}>
      <App />
    </DevPortal>,
  );
} else {
  // Built app opened outside the portal: go to its page in the portal.
  window.location.replace("/data-quality/");
}
