import logoAsset from "@/assets/safirooms-logo.png.asset.json";
import markAsset from "@/assets/safirooms-mark.png.asset.json";
import { AMENITY_LABEL, CONTACT_PHONE_DISPLAY, SITE_URL, SITE_URL_SHORT } from "@/lib/constants";
import { drawQr } from "@/lib/qr";

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

const W = 1080;
const PAD = 56;
const NAVY = "#0f2a52";
const GREEN = "#16803c";
const INK = "#0b1220";
const MUTED = "#5a6472";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function formatPosterDate(d = new Date()): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function shortMoney(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} UGX`;
}

function amenityLine(a: string[] | null): string {
  const list = (a ?? []).slice(0, 4).map((x) => `${AMENITY_LABEL[x] ?? x} ✅`);
  return list.join("  ");
}

const CARD_H = 190;

export async function buildPosterImage(opts: {
  title: string;
  rooms: PosterRoom[];
  date?: Date;
  /** Deep link opening the client portal with these exact filters applied. */
  link?: string;
}): Promise<Blob | null> {
  const { title, rooms } = opts;
  const link = opts.link ?? SITE_URL;
  const dateLabel = formatPosterDate(opts.date ?? new Date());

  const headerH = 250;
  const footerH = 330;
  const bodyH = Math.max(CARD_H, rooms.length * (CARD_H + 16));
  const H = headerH + bodyH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // background
  ctx.fillStyle = "#f4f7fb";
  ctx.fillRect(0, 0, W, H);

  // header band
  const grad = ctx.createLinearGradient(0, 0, W, headerH);
  grad.addColorStop(0, NAVY);
  grad.addColorStop(1, "#17457f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);

  const [logo, mark] = await Promise.all([loadImage(logoAsset.url), loadImage(markAsset.url)]);

  // watermark (behind cards)
  if (mark) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    const size = Math.min(W * 0.8, bodyH * 0.9);
    ctx.drawImage(mark, (W - size) / 2, headerH + (bodyH - size) / 2, size, size);
    ctx.restore();
  }

  // header text
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 52px Inter, system-ui, sans-serif";
  const maxTitleW = W - PAD * 2;
  let heading = title;
  while (ctx.measureText(heading).width > maxTitleW && heading.length > 8) {
    heading = heading.slice(0, -2);
  }
  ctx.fillText(heading, PAD, 118);
  ctx.font = "600 34px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`📅 ${dateLabel}`, PAD, 176);
  ctx.font = "600 28px Inter, system-ui, sans-serif";
  ctx.fillText(`${rooms.length} available`, PAD, 218);
  if (logo) {
    const lh = 92;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, W - PAD - lw, 60, lw, lh);
  }

  // cards
  let y = headerH + 16;
  for (const r of rooms) {
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    roundRect(ctx, PAD, y, W - PAD * 2, CARD_H, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,42,82,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const x = PAD + 32;

    // price
    ctx.fillStyle = NAVY;
    ctx.font = "800 46px Inter, system-ui, sans-serif";
    ctx.fillText(shortMoney(r.rent_ugx), x, y + 62);
    const pw = ctx.measureText(shortMoney(r.rent_ugx)).width;
    ctx.fillStyle = MUTED;
    ctx.font = "500 26px Inter, system-ui, sans-serif";
    ctx.fillText("/month", x + pw + 12, y + 62);

    // verified badge
    if (r.is_verified) {
      ctx.font = "700 22px Inter, system-ui, sans-serif";
      const label = "SAFI VERIFIED";
      const bw = ctx.measureText(label).width + 32;
      ctx.fillStyle = GREEN;
      roundRect(ctx, W - PAD - 32 - bw, y + 30, bw, 44, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, W - PAD - 32 - bw + 16, y + 60);
    }

    // location + room number
    ctx.fillStyle = INK;
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    const loc = r.room_number ? `📍 ${r.location} · Room ${r.room_number}` : `📍 ${r.location}`;
    ctx.fillText(loc, x, y + 108);

    // meta line
    ctx.fillStyle = MUTED;
    ctx.font = "500 25px Inter, system-ui, sans-serif";
    const meta = [
      r.deposit_ugx > 0 ? `Deposit ${shortMoney(r.deposit_ugx)}` : null,
      r.distance_from_town ? `${r.distance_from_town} from town` : null,
      r.is_available ? "Available" : "Occupied",
    ]
      .filter(Boolean)
      .join("  ·  ");
    ctx.fillText(meta, x, y + 146);

    const am = amenityLine(r.amenities);
    if (am) {
      ctx.fillStyle = GREEN;
      ctx.font = "600 24px Inter, system-ui, sans-serif";
      ctx.fillText(am, x, y + 176);
    }

    y += CARD_H + 16;
  }

  // footer
  const fy = H - footerH;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, fy, W, footerH);
  if (logo) {
    const lh = 76;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, PAD, fy + 36, lw, lh);
  }

  // QR to the filtered portal view
  const qrSize = 190;
  const qrX = W - PAD - qrSize;
  const qrY = fy + 40;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 22);
  ctx.fill();
  drawQr(ctx, link, qrX, qrY, qrSize);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Scan to open these rooms", qrX + qrSize / 2, qrY + qrSize + 46);
  ctx.textAlign = "left";

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 38px Inter, system-ui, sans-serif";
  ctx.fillText("🏡 SafiRooms", PAD, fy + 158);
  ctx.font = "500 28px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText('"Let there be space for everyone."', PAD, fy + 198);
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText(`Call / WhatsApp ${CONTACT_PHONE_DISPLAY}`, PAD, fy + 238);
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(SITE_URL_SHORT, PAD, fy + 274);
  ctx.font = "400 21px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("Brokerage fees apply when securing a room through SafiRooms.", PAD, fy + 306);

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
