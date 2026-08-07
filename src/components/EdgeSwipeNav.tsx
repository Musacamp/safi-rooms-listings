import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Home } from "lucide-react";
import { isAdminClient } from "@/lib/track";

const EDGE = 28;
const TRIGGER = 90;

/**
 * Edge-swipe navigation. On the client portal, swiping in from the left edge
 * opens the admin portal (admins only). In the admin portal, swiping in from
 * the right edge returns to the client portal.
 */
export function EdgeSwipeNav({ direction }: { direction: "toAdmin" | "toPortal" }) {
  const nav = useNavigate();
  const [pull, setPull] = useState(0);
  const [allowed, setAllowed] = useState(direction === "toPortal");
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    if (direction === "toAdmin") isAdminClient().then(setAllowed);
  }, [direction]);

  useEffect(() => {
    if (!allowed) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const fromLeft = t.clientX <= EDGE;
      const fromRight = t.clientX >= window.innerWidth - EDGE;
      if ((direction === "toAdmin" && fromLeft) || (direction === "toPortal" && fromRight)) {
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
      const dx = direction === "toAdmin" ? t.clientX - startX.current : startX.current - t.clientX;
      const dy = Math.abs(t.clientY - startY.current);
      if (dy > Math.abs(dx) * 1.2) {
        startX.current = null;
        setPull(0);
        return;
      }
      const next = Math.max(0, Math.min(dx, 160));
      setPull(reduce ? (next > TRIGGER ? TRIGGER + 1 : 0) : next);
      if (next > TRIGGER * 1.6) {
        fired.current = true;
        setPull(0);
        startX.current = null;
        nav({ to: direction === "toAdmin" ? "/admin" : "/" });
      }
    };

    const onEnd = () => {
      if (startX.current != null && !fired.current && pull > TRIGGER) {
        nav({ to: direction === "toAdmin" ? "/admin" : "/" });
      }
      startX.current = null;
      setPull(0);
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
  }, [allowed, direction, nav, pull]);

  if (!allowed || pull <= 4) return null;

  const ready = pull > TRIGGER;
  const isLeft = direction === "toAdmin";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 z-[70] flex items-center"
      style={isLeft ? { left: 0 } : { right: 0 }}
    >
      <div
        className={
          "flex items-center gap-2 rounded-r-full px-4 py-3 text-white shadow-lg " +
          (ready ? "bg-brand-green" : "bg-brand-blue/85") +
          (isLeft ? " rounded-r-full" : " rounded-l-full")
        }
        style={{
          transform: `translateX(${isLeft ? pull - 60 : -(pull - 60)}px)`,
          opacity: Math.min(1, pull / 60),
        }}
      >
        {isLeft ? <Lock className="size-4" /> : <Home className="size-4" />}
        <span className="whitespace-nowrap text-xs font-semibold">
          {ready ? "Release" : isLeft ? "Admin portal" : "Client portal"}
        </span>
      </div>
    </div>
  );
}
