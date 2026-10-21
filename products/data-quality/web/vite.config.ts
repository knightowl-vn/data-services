import { portalRemote } from "@knightowl-vn/portal-sdk/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Portal remote: exposes ./App (src/App.tsx), served at /apps/data-quality/.
  // Dev server on :5174 proxies /apps/data-quality/api to the api on :8000.
  plugins: [react(), portalRemote({ name: "data-quality" })],
  test: {
    environment: "node",
    // The shared libs ship TypeScript sources; let Vitest compile them.
    server: { deps: { inline: [/@knightowl-vn\//] } },
  },
});
