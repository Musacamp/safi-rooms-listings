import { createIsomorphicFn } from "@tanstack/react-start";

export type PublicSupabaseConfig = { url: string; key: string };

/**
 * Public (safe-to-expose) backend connection values.
 *
 * The browser bundle normally gets these inlined at build time from
 * VITE_SUPABASE_*. When a deployment is built without them, the client would
 * otherwise have no way to reach the backend. So we also serialize them into
 * the HTML shell at request time and let the browser client fall back to that.
 */
export const readServerPublicSupabaseConfig = createIsomorphicFn()
  .server((): PublicSupabaseConfig => ({
    url: process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "",
    key:
      process.env["SUPABASE_PUBLISHABLE_KEY"] ??
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
      "",
  }))
  .client((): PublicSupabaseConfig => ({ url: "", key: "" }));

export const RUNTIME_CONFIG_GLOBAL = "__SAFIROOMS_PUBLIC_CONFIG__";

export function runtimeConfigScript(): string {
  const cfg = readServerPublicSupabaseConfig();
  if (!cfg.url || !cfg.key) return "";
  return `window.${RUNTIME_CONFIG_GLOBAL}=${JSON.stringify(cfg)};`;
}
