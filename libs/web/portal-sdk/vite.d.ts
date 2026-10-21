import type { PluginOption } from "vite";

export declare const PORTAL_SHARED: readonly string[];

export declare function portalRemote(options: {
  /** Product name, as in product.yaml. */
  name: string;
  /** Local api for dev/preview. Default http://localhost:8000 */
  apiTarget?: string;
  /** Dev/preview port. Default 5174 (the shell uses 5173). */
  port?: number;
}): PluginOption[];

export declare function portalHost(): PluginOption[];
