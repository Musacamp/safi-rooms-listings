import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

type Props = {
  photos: string[];
  alt: string;
  /** Overlay rendered on top of the inline slider (badges etc). */
  overlay?: React.ReactNode;
  dimmed?: boolean;
};

export function PhotoGallery({ photos, alt, overlay, dimmed }: Props) {
  const [idx, setIdx] = useState(0);
  const [full, setFull] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const count = photos.length;
  const go = (i: number) => setIdx(((i % count) + count) % count);

  // keep the horizontal scroll snap in sync when arrows are used
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, [idx]);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== idx) setIdx(next);
  };

  if (count === 0) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:mx-4 sm:mt-4 sm:aspect-[16/9] sm:rounded-2xl">
        <div className="grid size-full place-items-center text-xs text-muted-foreground">
          No photos available
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:mx-4 sm:mt-4 sm:aspect-[16/9] sm:rounded-2xl">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {photos.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setFull(true)}
              aria-label={`Open photo ${i + 1} full screen`}
              className="relative size-full min-w-full shrink-0 snap-center"
            >
              <img
                src={p}
                alt={`${alt} — photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                suppressHydrationWarning
                className={"size-full object-cover " + (dimmed ? "grayscale-[0.45]" : "")}
              />
            </button>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              aria-label="Previous photo"
              onClick={() => go(idx - 1)}
              className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              aria-label="Next photo"
              onClick={() => go(idx + 1)}
              className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {photos.map((p, i) => (
                <span
                  key={p}
                  className={"size-1.5 rounded-full " + (i === idx ? "bg-white" : "bg-white/50")}
                />
              ))}
            </div>
          </>
        )}

        <div className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-medium text-white">
          <ZoomIn className="size-3" /> {idx + 1}/{count}
        </div>

        {overlay}
      </div>

      {full && (
        <Lightbox photos={photos} alt={alt} start={idx} onIndex={setIdx} onClose={() => setFull(false)} />
      )}
    </>
  );
}

function Lightbox({
  photos,
  alt,
  start,
  onIndex,
  onClose,
}: {
  photos: string[];
  alt: string;
  start: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(start);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    onIndex(idx);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [photos.length, onClose]);

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      pinchStart.current = { dist: dist(), zoom };
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, pan };
      const now = Date.now();
      if (now - lastTap.current < 280) {
        setZoom((z) => (z > 1 ? 1 : 2.5));
        setPan({ x: 0, y: 0 });
      }
      lastTap.current = now;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const d = dist();
      if (d > 0) {
        const next = Math.min(4, Math.max(1, (pinchStart.current.zoom * d) / pinchStart.current.dist));
        setZoom(next);
        if (next === 1) setPan({ x: 0, y: 0 });
      }
      return;
    }
    if (zoom > 1 && panStart.current) {
      setPan({
        x: panStart.current.pan.x + (e.clientX - panStart.current.x),
        y: panStart.current.pan.y + (e.clientY - panStart.current.y),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = panStart.current;
    const single = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    pinchStart.current = null;
    if (single && start && zoom === 1) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        setIdx((i) => (dx < 0 ? (i + 1) % photos.length : (i - 1 + photos.length) % photos.length));
      } else if (dy > 90) {
        onClose();
      }
    }
    panStart.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-xs font-medium opacity-80">
          {idx + 1} / {photos.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close photo viewer"
          className="grid size-9 place-items-center rounded-full bg-white/15"
        >
          <X className="size-5" />
        </button>
      </div>

      <div
        className="flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => {
          setZoom((z) => (z > 1 ? 1 : 2.5));
          setPan({ x: 0, y: 0 });
        }}
      >
        <img
          src={photos[idx]}
          alt={`${alt} — photo ${idx + 1}`}
          draggable={false}
          className="size-full object-contain"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: pointers.current.size ? "none" : "transform 140ms ease-out",
          }}
        />
      </div>

      <p className="px-4 pb-4 text-center text-[11px] text-white/60">
        Pinch or double-tap to zoom · swipe to change photo · swipe down to close
      </p>
    </div>
  );
}
