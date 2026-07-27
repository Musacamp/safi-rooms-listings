import logoAsset from "@/assets/safirooms-logo.png.asset.json";
import { formatUGX } from "@/lib/format";
import { AMENITY_LABEL, ROOM_TYPE_LABEL, CONTACT_PHONE_DISPLAY } from "@/lib/constants";

export type ShareListing = {
  title: string;
  location: string;
  description: string | null;
  rent_ugx: number;
  deposit_ugx: number;
  room_type: keyof typeof ROOM_TYPE_LABEL;
  amenities: string[] | null;
  photos: string[] | null;
  vacancies: number;
  is_available: boolean;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    if (words.join(" ").length > lines.join(" ").length) {
      while (ctx.measureText(last + "…").width > maxWidth && last.length > 3) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + "…";
    }
  }
  return lines;
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

const W = 1080;
const H = 1500;

export async function buildListingShareImage(l: ShareListing): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#f6f8fa";
  ctx.fillRect(0, 0, W, H);

  // Photo
  const photoH = 700;
  const photo = l.photos?.[0] ? await loadImage(l.photos[0]) : null;
  if (photo) {
    const scale = Math.max(W / photo.width, photoH / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, photoH);
    ctx.clip();
    ctx.drawImage(photo, (W - dw) / 2, (photoH - dh) / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = "#0f2a52";
    ctx.fillRect(0, 0, W, photoH);
  }

  // gradient overlay for badges
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 220);

  // badges
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  const badge = (text: string, x: number, y: number, bg: string) => {
    const pad = 22;
    const w = ctx.measureText(text).width + pad * 2;
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, w, 56, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x + pad, y + 38);
    return w;
  };
  let bx = 40;
  bx += badge(l.is_available ? "Available" : "Occupied", bx, 40, l.is_available ? "#16803c" : "#b45309") + 14;
  if (l.is_available && l.vacancies > 0) badge(`${l.vacancies} left`, bx, 40, "#0f2a52");

  // Card
  let y = photoH + 56;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 40, photoH + 24, W - 80, H - photoH - 24 - 40, 36);
  ctx.fill();

  const left = 88;
  const maxW = W - left * 2;

  ctx.fillStyle = "#16803c";
  ctx.font = "700 26px Inter, system-ui, sans-serif";
  ctx.fillText("SAFI VERIFIED", left, y + 20);
  y += 62;

  ctx.fillStyle = "#0b1220";
  ctx.font = "800 52px Inter, system-ui, sans-serif";
  for (const line of wrapText(ctx, l.title, maxW, 2)) {
    ctx.fillText(line, left, y + 40);
    y += 62;
  }

  ctx.fillStyle = "#5a6472";
  ctx.font = "400 34px Inter, system-ui, sans-serif";
  ctx.fillText(`📍 ${l.location}`, left, y + 30);
  y += 70;

  ctx.fillStyle = "#0f2a52";
  ctx.font = "800 60px Inter, system-ui, sans-serif";
  const price = formatUGX(l.rent_ugx);
  ctx.fillText(price, left, y + 46);
  ctx.fillStyle = "#5a6472";
  ctx.font = "400 32px Inter, system-ui, sans-serif";
  ctx.fillText(" / month", left + ctx.measureText(price).width + 100, y + 46);
  y += 82;

  ctx.fillStyle = "#5a6472";
  ctx.font = "400 30px Inter, system-ui, sans-serif";
  ctx.fillText(
    `${ROOM_TYPE_LABEL[l.room_type] ?? l.room_type} · Deposit ${formatUGX(l.deposit_ugx)}`,
    left,
    y + 24,
  );
  y += 66;

  if (l.description) {
    ctx.fillStyle = "#334155";
    ctx.font = "400 30px Inter, system-ui, sans-serif";
    for (const line of wrapText(ctx, l.description, maxW, 4)) {
      ctx.fillText(line, left, y + 24);
      y += 44;
    }
    y += 18;
  }

  const amenities = (l.amenities ?? []).slice(0, 8);
  if (amenities.length) {
    ctx.font = "600 28px Inter, system-ui, sans-serif";
    let cx = left;
    let cy = y;
    for (const a of amenities) {
      const label = AMENITY_LABEL[a] ?? a;
      const w = ctx.measureText(label).width + 40;
      if (cx + w > left + maxW) {
        cx = left;
        cy += 62;
      }
      ctx.fillStyle = "#eef4ff";
      roundRect(ctx, cx, cy, w, 52, 26);
      ctx.fill();
      ctx.fillStyle = "#0f2a52";
      ctx.fillText(label, cx + 20, cy + 35);
      cx += w + 14;
    }
    y = cy + 76;
  }

  // Footer with logo
  const logo = await loadImage(logoAsset.url);
  const footerY = H - 150;
  ctx.fillStyle = "#5a6472";
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillText(`Call / WhatsApp ${CONTACT_PHONE_DISPLAY}`, left, footerY + 96);
  if (logo) {
    const lh = 96;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, W - left - lw, footerY, lw, lh);
  }

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}
