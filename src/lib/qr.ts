import qrcode from "qrcode-generator";

/** Draw a QR code for `text` onto a canvas context as crisp black modules. */
export function drawQr(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  opts: { dark?: string; light?: string; quietZone?: number } = {},
) {
  const dark = opts.dark ?? "#0b1220";
  const light = opts.light ?? "#ffffff";
  const quiet = opts.quietZone ?? 2;

  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const total = count + quiet * 2;
  const cell = size / total;

  ctx.fillStyle = light;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!qr.isDark(r, c)) continue;
      ctx.fillRect(
        x + (c + quiet) * cell,
        y + (r + quiet) * cell,
        Math.ceil(cell),
        Math.ceil(cell),
      );
    }
  }
}
