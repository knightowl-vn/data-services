/** The signed-in user. The shell gets it from the auth proxy; remotes never log in themselves. */
export interface PortalUser {
  id: string;
  name: string;
  email?: string;
  /** Role names from the identity provider, e.g. "data-quality:editor". */
  roles: readonly string[];
}

/** Where a product is mounted. */
export interface PortalApp {
  /** Product name, e.g. "data-quality". */
  name: string;
  title: string;
  /** Browser route of the product's pages, e.g. "/data-quality". */
  routeBase: string;
  /** Where the product's web Service is reached, e.g. "/apps/data-quality". Its api is under `/api`. */
  serviceBase: string;
}

export type NotifyTone = "info" | "success" | "warning" | "danger";

/** What the shell gives every remote. Read it with `usePortal()`. */
export interface PortalContextValue {
  user: PortalUser;
  app: PortalApp;
  /** True if the user has at least one of the roles. */
  hasRole(...roles: string[]): boolean;
  /**
   * fetch() for the product's own api. `path` is the api path, e.g. "/api/v1/checks";
   * it is sent to `${serviceBase}${path}` with the session cookie. On 401 the shell
   * sends the user to log in again.
   */
  fetch(path: string, init?: RequestInit): Promise<Response>;
  /** Show a toast in the shell. */
  notify(message: string, tone?: NotifyTone): void;
  logout(): void;
}

export type Fetcher = PortalContextValue["fetch"];
