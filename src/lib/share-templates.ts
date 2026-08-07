import logoAsset from "@/assets/safirooms-logo.png.asset.json";
import markAsset from "@/assets/safirooms-mark.png.asset.json";
import {
  AMENITY_LABEL,
  CONTACT_PHONE_DISPLAY,
  ROOM_TYPE_LABEL,
  SITE_URL,
  SITE_URL_SHORT,
} from "@/lib/constants";
import { drawQr } from "@/lib/qr";
import {
  drawCover,
  fitText,
  formatPosterDate,
  loadImage,
  newCanvas,
  roundRect,
  shortMoney,
  strikeThrough,
  toBlob,
  wrapText,
} from "@/lib/canvas-util";

export type ShareTemplateKey = "minimal" | "premium" | "social" | "whatsapp" | "luxury";

export const SHARE_TEMPLATES: {
  key: ShareTemplateKey;
  label: string;
  hint: string;
}[] = [
  { key: "minimal", label: "Minimal", hint: "Clean white, lots of space" },
  { key: "premium", label: "Premium", hint: "Navy with gold accents" },
  { key: "social", label: "Social", hint: "Story size, bold blocks" },
  { key: "whatsapp", label: "WhatsApp", hint: "Compact, thumbnail-readable" },
  { key: "luxury", label: "Luxury", hint: "Full photo, elegant serif" },
];

type Theme = {
  w: number;
  h: number;
  bg: string;
  card: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  green: string;
  serif: boolean;
  /** card = photo on top with a content card; overlay = full-bleed photo. */
  variant: "card" | "overlay";
  pad: number;
};

const SANS = "Inter, system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const THEMES: Record<ShareTemplateKey, Theme> = {
  minimal: {
    w: 1080,
    h: 1350,
    bg: "#ffffff",
    card: "#f6f8fa",
    ink: "#0b1220",
    muted: "#6b7480",
    accent: "#0f2a52",
    accentInk: "#ffffff",
    green: "#16803c",
    serif: false,
    variant: "card",
    pad: 72,
  },
  premium: {
    w: 1080,
    h: 1350,
    bg: "#0a1730",
    card: "#0f2246",
    ink: "#ffffff",
    muted: "#a9b6cc",
    accent: "#d4af37",
    accentInk: "#0a1730",
    green: "#38b26a",
    serif: false,
    variant: "card",
    pad: 72,
  },
  social: {
    w: 1080,
    h: 1920,
    bg: "#0b1220",
    card: "#16803c",
    ink: "#ffffff",
    muted: "rgba(255,255,255,0.85)",
    accent: "#ffd400",
    accentInk: "#0b1220",
    green: "#16803c",
    serif: false,
    variant: "overlay",
    pad: 76,
  },
  whatsapp: {
    w: 900,
    h: 900,
    bg: "#ffffff",
    card: "#eef4ff",
    ink: "#0b1220",
    muted: "#5a6472",
    accent: "#0f2a52",
    accentInk: "#ffffff",
    green: "#16803c",
    serif: false,
    variant: "card",
    pad: 52,
  },
  luxury: {
    w: 1080,
    h: 1350,
    bg: "#100d09",
    card: "rgba(0,0,0,0.55)",
    ink: "#ffffff",
    muted: "rgba(255,255,255,0.82)",
    accent: "#c8a24a",
    accentInk: "#100d09",
    green: "#8fbf9b",
    serif: true,
    variant: "overlay",
    pad: 78,
  },
};

export type ShareListing = {
  title: string;
  location: string;
  description: string | null;
  rent_ugx: number;
  deposit_ugx: number;
  room_type: string;
  amenities: string[] | null;
  photos: string[] | null;
  vacancies: number;
  is_available: boolean;
  is_verified?: boolean;
  distance_from_town?: string | null;
};

function font(t: Theme, weight: number, size: number) {
  return `${weight} ${size}px ${t.serif ? SERIF : SANS}`;
}

function badge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
  size = 30,
) {
  ctx.font = `700 ${size}px ${SANS}`;
  const pad = size * 0.7;
  const w = ctx.measureText(text).width + pad * 2;
  const h = size * 1.9;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 3);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, x + pad, y + h / 2 + size * 0.36);
  return w;
}

async function drawFooter(
  ctx: CanvasRenderingContext2D,
  t: Theme,
  link: string,
  caption: string,
  onDark: boolean,
) {
  const logo = await loadImage(logoAsset.url);
  const qrSize = Math.round(t.w * 0.155);
  const y = t.h - t.pad - qrSize - 40;

  if (logo) {
    const lh = Math.round(t.w * 0.07);
    const lw = (logo.width / logo.height) * lh;
    ctx.save();
    if (onDark) ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, t.pad, y, lw, lh);
    ctx.restore();
  }

  ctx.fillStyle = t.ink;
  ctx.font = font(t, 700, Math.round(t.w * 0.028));
  ctx.fillText(`Call / WhatsApp ${CONTACT_PHONE_DISPLAY}`, t.pad, y + Math.round(t.w * 0.125));
  ctx.fillStyle = t.muted;
  ctx.font = font(t, 500, Math.round(t.w * 0.024));
  ctx.fillText(SITE_URL_SHORT, t.pad, y + Math.round(t.w * 0.163));
  ctx.font = font(t, 400, Math.round(t.w * 0.02));
  ctx.fillText(caption, t.pad, y + Math.round(t.w * 0.198));

  const qrX = t.w - t.pad - qrSize;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 12, y - 12, qrSize + 24, qrSize + 24, 18);
  ctx.fill();
  drawQr(ctx, link, qrX, y, qrSize);
  ctx.fillStyle = t.muted;
  ctx.font = font(t, 500, Math.round(t.w * 0.019));
  ctx.textAlign = "center";
  ctx.fillText("Scan to view", qrX + qrSize / 2, y + qrSize + 40);
  ctx.textAlign = "left";
}

/* ------------------------------------------------------------------ */
/* Single listing                                                      */
/* ------------------------------------------------------------------ */

export async function renderListingShare(
  key: ShareTemplateKey,
  l: ShareListing,
  link?: string,
): Promise<Blob | null> {
  const t = THEMES[key];
  const { canvas, ctx } = newCanvas(t.w, t.h);
  if (!ctx) return null;
  const url = link ?? SITE_URL;
  const photo = l.photos?.[0] ? await loadImage(l.photos[0]) : null;

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, t.w, t.h);

  const photoH = t.variant === "overlay" ? t.h : Math.round(t.h * (key === "whatsapp" ? 0.42 : 0.5));
  if (photo) drawCover(ctx, photo, 0, 0, t.w, photoH);
  else {
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, t.w, photoH);
  }

  if (t.variant === "overlay") {
    const g = ctx.createLinearGradient(0, t.h * 0.25, 0, t.h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, t.w, t.h);
  }

  // top badges
  const topG = ctx.createLinearGradient(0, 0, 0, 240);
  topG.addColorStop(0, "rgba(0,0,0,0.5)");
  topG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topG;
  ctx.fillRect(0, 0, t.w, 240);

  let bx = t.pad;
  if (!l.is_available) {
    bx += badge(ctx, "TAKEN", bx, t.pad, "#c1121f", "#ffffff", Math.round(t.w * 0.03)) + 14;
  } else {
    bx += badge(ctx, "AVAILABLE", bx, t.pad, t.green, "#ffffff", Math.round(t.w * 0.028)) + 14;
    if (l.vacancies > 0)
      badge(ctx, `${l.vacancies} left`, bx, t.pad, "#0f2a52", "#ffffff", Math.round(t.w * 0.028));
  }

  // content
  let y: number;
  const left = t.pad;
  const maxW = t.w - t.pad * 2;

  if (t.variant === "card") {
    const cardTop = photoH - 40;
    ctx.fillStyle = t.bg;
    roundRect(ctx, 0, cardTop, t.w, t.h - cardTop, 48);
    ctx.fill();
    y = cardTop + Math.round(t.w * 0.09);
  } else {
    y = t.h - Math.round(t.h * (key === "social" ? 0.5 : 0.44));
    if (key === "social") {
      ctx.fillStyle = t.accent;
      roundRect(ctx, left, y - 74, Math.round(t.w * 0.36), 62, 18);
      ctx.fill();
      ctx.fillStyle = t.accentInk;
      ctx.font = `800 ${Math.round(t.w * 0.028)}px ${SANS}`;
      ctx.fillText("SAFI VERIFIED", left + 22, y - 30);
    }
  }

  if (t.variant === "card" && (l.is_verified ?? true)) {
    ctx.fillStyle = t.green;
    ctx.font = font(t, 800, Math.round(t.w * 0.026));
    ctx.fillText("SAFI VERIFIED", left, y);
    y += Math.round(t.w * 0.055);
  }

  // title
  ctx.fillStyle = t.ink;
  const titleSize = Math.round(t.w * (key === "whatsapp" ? 0.048 : 0.052));
  ctx.font = font(t, t.serif ? 700 : 800, titleSize);
  for (const line of wrapText(ctx, l.title, maxW, 2)) {
    y += titleSize;
    ctx.fillText(line, left, y);
    y += 12;
  }

  // location
  ctx.fillStyle = t.muted;
  ctx.font = font(t, 500, Math.round(t.w * 0.031));
  y += Math.round(t.w * 0.045);
  ctx.fillText(
    fitText(ctx, `${l.location}${l.distance_from_town ? ` · ${l.distance_from_town} from town` : ""}`, maxW),
    left,
    y,
  );

  // rent
  const priceSize = Math.round(t.w * (key === "social" ? 0.085 : 0.066));
  y += priceSize + Math.round(t.w * 0.03);
  const price = shortMoney(l.rent_ugx);
  ctx.font = font(t, 800, priceSize);
  ctx.fillStyle = l.is_available ? (t.variant === "overlay" ? t.accent : t.accent) : t.muted;
  ctx.fillText(price, left, y);
  const pw = ctx.measureText(price).width;
  if (!l.is_available) strikeThrough(ctx, price, left, y, "#e5484d", Math.max(5, priceSize * 0.07));
  ctx.fillStyle = t.muted;
  ctx.font = font(t, 500, Math.round(t.w * 0.028));
  ctx.fillText("/ month", left + pw + 16, y);

  // meta
  y += Math.round(t.w * 0.05);
  ctx.fillStyle = t.muted;
  ctx.font = font(t, 500, Math.round(t.w * 0.026));
  ctx.fillText(
    fitText(
      ctx,
      [
        ROOM_TYPE_LABEL[l.room_type] ?? l.room_type,
        l.deposit_ugx > 0 ? `Deposit ${shortMoney(l.deposit_ugx)}` : null,
        l.is_available ? "Available now" : "Currently taken",
      ]
        .filter(Boolean)
        .join("  ·  "),
      maxW,
    ),
    left,
    y,
  );

  // amenities chips
  const amenities = (l.amenities ?? []).slice(0, key === "whatsapp" ? 4 : 8);
  if (amenities.length) {
    y += Math.round(t.w * 0.035);
    ctx.font = font(t, 600, Math.round(t.w * 0.024));
    const chipH = Math.round(t.w * 0.046);
    let cx = left;
    for (const a of amenities) {
      const label = AMENITY_LABEL[a] ?? a;
      const w = ctx.measureText(label).width + 36;
      if (cx + w > left + maxW) {
        cx = left;
        y += chipH + 12;
      }
      ctx.fillStyle = t.variant === "overlay" ? "rgba(255,255,255,0.16)" : t.card;
      roundRect(ctx, cx, y, w, chipH, chipH / 2);
      ctx.fill();
      ctx.fillStyle = t.variant === "overlay" ? t.ink : t.accent;
      ctx.fillText(label, cx + 18, y + chipH * 0.68);
      cx += w + 12;
    }
    y += chipH;
  }

  await drawFooter(
    ctx,
    t,
    url,
    "Brokerage fees apply when securing a room through SafiRooms.",
    t.variant === "overlay" || key === "premium",
  );

  return toBlob(canvas);
}

/* ------------------------------------------------------------------ */
/* Multi-room poster (generator)                                       */
/* ------------------------------------------------------------------ */

export type PosterRoom = {
  room_number: string | null;
  location: string;
  rent_ugx: number;
  deposit_ugx: number;
  amenities: string[] | null;
  distance_from_town: string | null;
  is_available: boolean;
  is_verified: boolean;
};

export async function renderPosterShare(
  key: ShareTemplateKey,
  opts: { title: string; rooms: PosterRoom[]; date?: Date; link?: string },
): Promise<Blob | null> {
  const t = THEMES[key];
  const W = t.w;
  const PAD = t.pad;
  const link = opts.link ?? SITE_URL;
  const rooms = opts.rooms;
  const dark = key === "premium" || key === "social" || key === "luxury";

  const cardH = key === "whatsapp" ? 150 : 196;
  const headerH = Math.round(W * 0.24);
  const footerH = Math.round(W * 0.33);
  const bodyH = Math.max(cardH, rooms.length * (cardH + 16) + 16);
  const H = headerH + bodyH + footerH;

  const { canvas, ctx } = newCanvas(W, H);
  if (!ctx) return null;

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // header
  if (key === "minimal" || key === "whatsapp") {
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, W, headerH);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, headerH);
    g.addColorStop(0, key === "luxury" ? "#1b1408" : "#0a1730");
    g.addColorStop(1, key === "social" ? "#16803c" : t.accent);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, headerH);
  }
  ctx.fillStyle = key === "luxury" ? t.accent : "#ffffff";
  ctx.font = font(t, 800, Math.round(W * 0.048));
  ctx.fillText(fitText(ctx, opts.title, W - PAD * 2), PAD, Math.round(headerH * 0.46));
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = font(t, 600, Math.round(W * 0.03));
  ctx.fillText(`${formatPosterDate(opts.date ?? new Date())}`, PAD, Math.round(headerH * 0.7));
  ctx.font = font(t, 600, Math.round(W * 0.026));
  ctx.fillText(`${rooms.length} available`, PAD, Math.round(headerH * 0.88));

  const [logo, mark] = await Promise.all([loadImage(logoAsset.url), loadImage(markAsset.url)]);
  if (logo) {
    const lh = Math.round(W * 0.085);
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, W - PAD - lw, Math.round(headerH * 0.22), lw, lh);
  }
  if (mark) {
    ctx.save();
    ctx.globalAlpha = dark ? 0.08 : 0.06;
    const size = Math.min(W * 0.8, bodyH * 0.9);
    ctx.drawImage(mark, (W - size) / 2, headerH + (bodyH - size) / 2, size, size);
    ctx.restore();
  }

  // cards
  let y = headerH + 16;
  for (const r of rooms) {
    ctx.fillStyle = dark ? "rgba(255,255,255,0.07)" : "#ffffff";
    roundRect(ctx, PAD, y, W - PAD * 2, cardH, 26);
    ctx.fill();
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.14)" : "rgba(15,42,82,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const x = PAD + 28;
    const price = shortMoney(r.rent_ugx);
    ctx.fillStyle = key === "luxury" || key === "premium" ? t.accent : dark ? "#ffffff" : t.accent;
    ctx.font = font(t, 800, Math.round(W * 0.042));
    ctx.fillText(price, x, y + 62);
    const pw = ctx.measureText(price).width;
    if (!r.is_available) strikeThrough(ctx, price, x, y + 62, "#e5484d", 5);
    ctx.fillStyle = t.muted;
    ctx.font = font(t, 500, Math.round(W * 0.024));
    ctx.fillText("/month", x + pw + 12, y + 62);

    if (r.is_verified) {
      ctx.font = `700 ${Math.round(W * 0.02)}px ${SANS}`;
      const label = r.is_available ? "SAFI VERIFIED" : "TAKEN";
      const bw = ctx.measureText(label).width + 30;
      ctx.fillStyle = r.is_available ? t.green : "#c1121f";
      roundRect(ctx, W - PAD - 28 - bw, y + 28, bw, 42, 13);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, W - PAD - 28 - bw + 15, y + 57);
    }

    ctx.fillStyle = t.ink;
    ctx.font = font(t, 700, Math.round(W * 0.03));
    ctx.fillText(
      fitText(
        ctx,
        r.room_number ? `${r.location} · Room ${r.room_number}` : r.location,
        W - PAD * 2 - 60,
      ),
      x,
      y + 110,
    );

    ctx.fillStyle = t.muted;
    ctx.font = font(t, 500, Math.round(W * 0.023));
    ctx.fillText(
      fitText(
        ctx,
        [
          r.deposit_ugx > 0 ? `Deposit ${shortMoney(r.deposit_ugx)}` : null,
          r.distance_from_town ? `${r.distance_from_town} from town` : null,
          r.is_available ? "Available" : "Taken",
        ]
          .filter(Boolean)
          .join("  ·  "),
        W - PAD * 2 - 60,
      ),
      x,
      y + 146,
    );

    if (cardH > 160) {
      const am = (r.amenities ?? []).slice(0, 4).map((a) => `${AMENITY_LABEL[a] ?? a} ✅`).join("  ");
      if (am) {
        ctx.fillStyle = t.green;
        ctx.font = font(t, 600, Math.round(W * 0.022));
        ctx.fillText(fitText(ctx, am, W - PAD * 2 - 60), x, y + 178);
      }
    }

    y += cardH + 16;
  }

  // footer
  const fy = H - footerH;
  ctx.fillStyle = key === "luxury" ? "#1b1408" : key === "social" ? "#16803c" : t.accent;
  ctx.fillRect(0, fy, W, footerH);
  if (logo) {
    const lh = Math.round(W * 0.07);
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, PAD, fy + 32, lw, lh);
  }
  const qrSize = Math.round(W * 0.175);
  const qrX = W - PAD - qrSize;
  const qrY = fy + 36;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 20);
  ctx.fill();
  drawQr(ctx, link, qrX, qrY, qrSize);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = font(t, 600, Math.round(W * 0.019));
  ctx.textAlign = "center";
  ctx.fillText("Scan to open these rooms", qrX + qrSize / 2, qrY + qrSize + 42);
  ctx.textAlign = "left";

  ctx.fillStyle = "#ffffff";
  ctx.font = font(t, 800, Math.round(W * 0.034));
  ctx.fillText("SafiRooms", PAD, fy + Math.round(W * 0.145));
  ctx.font = font(t, 500, Math.round(W * 0.026));
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText('"Let there be space for everyone."', PAD, fy + Math.round(W * 0.183));
  ctx.font = font(t, 600, Math.round(W * 0.024));
  ctx.fillText(`Call / WhatsApp ${CONTACT_PHONE_DISPLAY}`, PAD, fy + Math.round(W * 0.221));
  ctx.font = font(t, 500, Math.round(W * 0.022));
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(SITE_URL_SHORT, PAD, fy + Math.round(W * 0.256));
  ctx.font = font(t, 400, Math.round(W * 0.019));
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(
    "Brokerage fees apply when securing a room through SafiRooms.",
    PAD,
    fy + Math.round(W * 0.29),
  );

  return toBlob(canvas);
}
