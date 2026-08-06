import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const EDGE = 28; // px from the screen edge that starts a gesture
const DISTANCE = 70; // px of horizontal travel needed

/**
 * Edge gestures: swipe in from the left edge to open the Admin Portal
 * (signed-in admins only), swipe in from the right edge to return to the
 * Client Portal.
 */
export function EdgeSwipeNav() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let edge: "left" | "right" | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length !== 1) return;
      startX = t.clientX;
      startY = t.clientY;
      edge =
        startX <= EDGE ? "left" : startX >= window.innerWidth - EDGE ? "right" : null;
    };

    const onEnd = async (e: TouchEvent) => {
      if (!edge) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const currentEdge = edge;
      edge = null;
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < DISTANCE) return;

      const inAdmin = pathname.startsWith("/admin");
      if (currentEdge === "left" && dx > 0 && !inAdmin) {
        const { data } = await supabase.auth.getSession();
        if (data.session) nav({ to: "/admin" });
        return;
      }
      if (currentEdge === "right" && dx < 0 && inAdmin) {
        nav({ to: "/" });
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [nav, pathname]);

  return null;
}
