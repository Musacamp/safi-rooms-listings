import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";
import { RUNTIME_CONFIG_GLOBAL } from "@/lib/public-config";

/**
 * Browser/SSR Supabase client with a runtime-config fallback.
 *
 * Resolution order:
 *  1. build-time inlined VITE_SUPABASE_* (normal case)
 *  2. runtime config serialized into the HTML shell by the server
 *  3. server-side process.env (SSR)
 *
 * Never throws at import time: use `hasSupabaseConfig()` to fail soft.
 */

type Config = { url: string; key: string };

function fromWindow(): Config | null {
  if (typeof window === "undefined") return null;
  const raw = (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL];
  if (!raw || typeof raw !== "object") return null;
  const cfg = raw as Partial<Config>;
  return cfg.url && cfg.key ? { url: cfg.url, key: cfg.key } : null;
}

function fromProcess(): Config | null {
  try {
    const env = typeof process !== "undefined" ? process.env : undefined;
    const url = env?.["SUPABASE_URL"];
    const key = env?.["SUPABASE_PUBLISHABLE_KEY"];
    return url && key ? { url, key } : null;
  } catch {
    return null;
  }
}

function resolveConfig(): Config | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (url && key) return { url, key };
  return fromWindow() ?? fromProcess();
}

function isNewApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    if (isNewApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

let cached: SupabaseClient<Database> | undefined;

export function hasSupabaseConfig(): boolean {
  return resolveConfig() !== null;
}

export function getSupabase(): SupabaseClient<Database> | null {
  if (cached) return cached;
  const cfg = resolveConfig();
  if (!cfg) return null;
  cached = createClient<Database>(cfg.url, cfg.key, {
    global: { fetch: supabaseFetch(cfg.key) },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cached;
}

/** Same surface as the generated client, but resolved lazily at first use. */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    const client = getSupabase();
    if (!client) {
      throw new Error(
        "Backend connection is unavailable. Please reload the page or try again shortly.",
      );
    }
    return Reflect.get(client, prop, receiver);
  },
});
