import { useSyncExternalStore } from "react";
import { dailyCoverIndex, photoDay, PHOTO_DAY_MS } from "@/lib/cover-photo";

function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { onChange(); schedule(); }, PHOTO_DAY_MS - (Date.now() % PHOTO_DAY_MS) + 20);
  };
  const wake = () => { onChange(); schedule(); };
  schedule();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("focus", wake);
  };
}

export function useDailyCover(photos: readonly string[] | null | undefined) {
  // Stable SSR/hydration snapshot; the actual UTC day is read immediately after hydration.
  const day = useSyncExternalStore(subscribe, () => photoDay(), () => 0);
  return { day, index: dailyCoverIndex(photos, day) };
}