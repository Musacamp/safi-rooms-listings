import { useEffect, useState } from "react";

/**
 * True only after hydration. Use to gate anything derived from the current
 * clock or browser storage so SSR markup stays stable.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
