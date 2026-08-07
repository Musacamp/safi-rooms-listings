import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Pt = { x: number; y: number };

/**
 * Full-screen photo viewer: swipe between photos, pinch-to-zoom,
 * double-tap zoom, drag to pan while zoomed, swipe down to close.
 */
export function PhotoLightbox({
  photos,
  index,
  alt,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  index: number;
  alt: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<Pt>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Pt>());
  const start = useRef<{ dist: number; scale: number; mid: Pt; offset: Pt } | null>(null);
  const single = useRef<{ p: Pt; t: number; offset: Pt } | null>(null);
  const lastTap = useRef(0);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDrag({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [index, reset]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, photos.length, onClose, onIndexChange]);

  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      start.current = {
        dist: dist(pts[0], pts[1]),
        scale,
        mid: mid(pts[0], pts[1]),
        offset,
      };
      single.current = null;
    } else if (pts.length === 1) {
      single.current = { p: pts[0], t: Date.now(), offset };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2 && start.current) {
      const s = start.current;
      const next = Math.min(5, Math.max(1, (dist(pts[0], pts[1]) / s.dist) * s.scale));
      setScale(next);
      const m = mid(pts[0], pts[1]);
      setOffset({
        x: s.offset.x + (m.x - s.mid.x),
        y: s.offset.y + (m.y - s.mid.y),
      });
      return;
    }

    if (pts.length === 1 && single.current) {
      const dx = pts[0].x - single.current.p.x;
      const dy = pts[0].y - single.current.p.y;
      if (scale > 1) {
        setOffset({ x: single.current.offset.x + dx, y: single.current.offset.y + dy });
      } else {
        setDrag({ x: dx, y: dy });
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const wasPinch = start.current !== null && pointers.current.size < 2;
    if (wasPinch) start.current = null;

    const s = single.current;
    if (s && pointers.current.size === 0 && scale === 1) {
      const dx = drag.x;
      const dy = drag.y;
      const moved = Math.hypot(dx, dy);
      const quick = Date.now() - s.t < 400;

      if (moved < 12) {
        // tap / double-tap
        const now = Date.now();
        if (now - lastTap.current < 280) {
          setScale(2.4);
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }
      } else if (Math.abs(dy) > 110 && Math.abs(dy) > Math.abs(dx)) {
        onClose();
        return;
      } else if (Math.abs(dx) > 60 && quick && photos.length > 1) {
        onIndexChange(
          dx < 0 ? (index + 1) % photos.length : (index - 1 + photos.length) % photos.length,
        );
        return;
      }
      setDrag({ x: 0, y: 0 });
    }
    if (pointers.current.size === 0) single.current = null;
    if (scale <= 1.02) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  const closeFade = Math.min(1, Math.abs(drag.y) / 320);

  return (
    <div
      className="fixed inset-0 z-[60] select-none bg-black"
      style={{ opacity: 1 - closeFade * 0.5, touchAction: "none" }}
    >
      <div
        className="grid size-full place-items-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={photos[index]}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${offset.x + (scale === 1 ? drag.x : 0)}px, ${
              offset.y + (scale === 1 ? drag.y : 0)
            }px) scale(${scale})`,
            transition: start.current || single.current ? "none" : "transform 180ms ease-out",
          }}
        />
      </div>

      <button
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
      >
        <X className="size-5" />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {index + 1} / {photos.length}
      </div>

      {photos.length > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur sm:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            aria-label="Next photo"
            onClick={() => onIndexChange((index + 1) % photos.length)}
            className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur sm:grid"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-[11px] text-white/60">
        Pinch or double-tap to zoom · swipe down to close
      </p>
    </div>
  );
}
