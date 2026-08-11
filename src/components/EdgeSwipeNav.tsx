import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Home } from "lucide-react";

const EDGE = 32;
const TRIGGER = 90;

/**
 * Edge-swipe navigation between the two portals.
 *
 * Client portal: swipe LEFT (drag in from the right edge) heads to the admin
 * portal. Access is still enforced by the `_authenticated` route gate, which
 * sends non-admins to the sign-in screen — no admin data or UI is exposed.
 * Admin portal: swipe RIGHT (drag in from the left edge) returns to the client
 * portal.
 */
export function EdgeSwipeNav({ direction }: { direction: "toAdmin" | "toPortal" }) {
  const nav = useNavigate();
  const [pull, setPull] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const fired = useRef(false);
  const pullRef = useRef(0);

  // toAdmin = swipe leftwards from the right edge; toPortal = rightwards from left edge.
  const fromRightEdge = direction === "toAdmin";
  const target = direction === "toAdmin" ? "/admin" : "/";

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const go = () => nav({ to: target });

    const setPullBoth = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const onEdge = fromRightEdge
        ? t.clientX >= window.innerWidth - EDGE
        : t.clientX <= EDGE;
      if (onEdge) {
        startX.current = t.clientX;
        startY.current = t.clientY;
        fired.current = false;
      } else {
        startX.current = null;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (startX.current == null || fired.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = fromRightEdge ? startX.current - t.clientX : t.clientX - startX.current;
      const dy = Math.abs(t.clientY - startY.current);
      if (dy > Math.abs(dx) * 1.2) {
        startX.current = null;
        setPullBoth(0);
        return;
      }
      const next = Math.max(0, Math.min(dx, 160));
      setPullBoth(reduce ? (next > TRIGGER ? TRIGGER + 1 : 0) : next);
      if (next > TRIGGER * 1.6) {
        fired.current = true;
        setPullBoth(0);
        startX.current = null;
        go();
      }
    };

    const onEnd = () => {
      if (startX.current != null && !fired.current && pullRef.current > TRIGGER) go();
      startX.current = null;
      setPullBoth(0);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [direction, fromRightEdge, nav, target]);

  if (pull <= 4) return null;

  const ready = pull > TRIGGER;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 z-[70] flex items-center"
      style={fromRightEdge ? { right: 0 } : { left: 0 }}
    >
      <div
        className={
          "flex items-center gap-2 px-4 py-3 text-white shadow-lg " +
          (ready ? "bg-brand-green" : "bg-brand-blue/85") +
          (fromRightEdge ? " rounded-l-full" : " rounded-r-full")
        }
        style={{
          transform: `translateX(${fromRightEdge ? -(pull - 60) : pull - 60}px)`,
          opacity: Math.min(1, pull / 60),
        }}
      >
        {fromRightEdge ? <Lock className="size-4" /> : <Home className="size-4" />}
        <span className="whitespace-nowrap text-xs font-semibold">
          {ready ? "Release" : fromRightEdge ? "Admin portal" : "Client portal"}
        </span>
      </div>
    </div>
  );
}
