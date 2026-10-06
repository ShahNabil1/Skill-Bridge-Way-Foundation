import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";

export const VERIFY_BASE = "https://skillbridgeway.org/verify?serial=";
const LOGO_URL = "https://cdn.skillbridgeway.org/logo.png";
const FONT_HEAD = "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-800-normal.ttf";
const FONT_SEMI = "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.ttf";
const FONT_BODY = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf";
const FONT_ITALIC = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-italic.ttf";

// Brand colours (PDF output cannot use CSS tokens)
const NAVY = rgb(16 / 255, 52 / 255, 112 / 255);
const BLUE = rgb(10 / 255, 84 / 255, 222 / 255);
const MID_BLUE = rgb(61 / 255, 92 / 255, 151 / 255);
const CYAN = rgb(0 / 255, 168 / 255, 255 / 255);
const ORANGE = rgb(255 / 255, 153 / 255, 0 / 255);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.035, 0.035, 0.04);
const GREY = rgb(0.37, 0.39, 0.43);

export type CertificateData = {
  serial: string;
  studentName: string;
  studentCode: string;
  courseTitle: string;
  issuedAt: string;
};

async function fetchBytes(url: string) {
  try {
    const r = await fetch(url);
    return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = BLACK, maxWidth = 640) {
  let s = size;
  while (font.widthOfTextAtSize(text, s) > maxWidth && s > 10) s -= 1;
  const w = font.widthOfTextAtSize(text, s);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size: s, font, color });
}

function cornerOrnament(page: PDFPage, x: number, y: number, sx: 1 | -1, sy: 1 | -1) {
  const point = (dx: number, dy: number) => ({ x: x + sx * dx, y: y + sy * dy });
  const line = (x1: number, y1: number, x2: number, y2: number, thickness: number, color = NAVY) => {
    page.drawLine({ start: point(x1, y1), end: point(x2, y2), thickness, color });
  };

  // Refined stepped line-work: crisp in print and visually balanced at every corner.
  line(0, 42, 0, 0, 3.2);
  line(0, 0, 42, 0, 3.2);
  line(7, 48, 7, 7, 1.2, CYAN);
  line(7, 7, 48, 7, 1.2, CYAN);
  line(15, 34, 15, 15, 1.4, MID_BLUE);
  line(15, 15, 34, 15, 1.4, MID_BLUE);
  line(4, 4, 11, 11, 2.2, ORANGE);
}

function signature(page: PDFPage, centerX: number, label: string, font: PDFFont) {
  page.drawLine({ start: { x: centerX - 78, y: 76 }, end: { x: centerX + 78, y: 76 }, thickness: 0.65, color: GREY });
  const size = label.length > 25 ? 9 : 10;
  const width = font.widthOfTextAtSize(label, size);
  page.drawText(label, { x: centerX - width / 2, y: 57, size, font, color: BLACK });
}

export async function generateCertificatePdf(d: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Certificate ${d.serial}`);
  pdf.setAuthor("Skill Bridgeway Foundation");

  const [headB, semiB, bodyB, italicB, logoB] = await Promise.all([fetchBytes(FONT_HEAD), fetchBytes(FONT_SEMI), fetchBytes(FONT_BODY), fetchBytes(FONT_ITALIC), fetchBytes(LOGO_URL)]);
  const head = headB ? await pdf.embedFont(headB) : await pdf.embedFont(StandardFonts.HelveticaBold);
  const semi = semiB ? await pdf.embedFont(semiB) : await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = bodyB ? await pdf.embedFont(bodyB) : await pdf.embedFont(StandardFonts.Helvetica);
  const italic = italicB ? await pdf.embedFont(italicB) : await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const safeBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const safeItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);

  const page = pdf.addPage([842, 595]); // A4 landscape
  const W = page.getWidth();
  const H = page.getHeight();

  // White formal certificate with bold blue print-safe frame.
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLUE });
  page.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, color: WHITE });
  page.drawRectangle({ x: 36, y: 31, width: W - 72, height: H - 62, borderColor: NAVY, borderWidth: 1, borderDashArray: [7, 3] });
  cornerOrnament(page, 36, H - 31, 1, -1);
  cornerOrnament(page, W - 36, H - 31, -1, -1);
  cornerOrnament(page, 36, 31, 1, 1);
  cornerOrnament(page, W - 36, 31, -1, 1);

  // Logo — large and left aligned as in the supplied reference.
  if (logoB) {
    try {
      const isPng = logoB[0] === 0x89;
      const img = isPng ? await pdf.embedPng(logoB) : await pdf.embedJpg(logoB);
      const size = 142;
      page.drawImage(img, { x: 69, y: 350, width: size, height: size });
    } catch { /* logo optional */ }
  }

  centered(page, "CERTIFICATE", 493, head, 43, NAVY, 500);
  centered(page, "OF COMPLETION", 463, italic, 22, BLACK, 360);

  // Symmetrical diamond divider, matching the formal reference without a text monogram.
  page.drawLine({ start: { x: 286, y: 432 }, end: { x: 396, y: 432 }, thickness: 1.1, color: GREY });
  page.drawLine({ start: { x: 446, y: 432 }, end: { x: 556, y: 432 }, thickness: 1.1, color: GREY });
  page.drawLine({ start: { x: 401, y: 432 }, end: { x: 421, y: 441 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 421, y: 441 }, end: { x: 441, y: 432 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 441, y: 432 }, end: { x: 421, y: 423 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 421, y: 423 }, end: { x: 401, y: 432 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 413, y: 432 }, end: { x: 421, y: 436 }, thickness: 1.1, color: ORANGE });
  page.drawLine({ start: { x: 421, y: 436 }, end: { x: 429, y: 432 }, thickness: 1.1, color: ORANGE });
  page.drawLine({ start: { x: 429, y: 432 }, end: { x: 421, y: 428 }, thickness: 1.1, color: ORANGE });
  page.drawLine({ start: { x: 421, y: 428 }, end: { x: 413, y: 432 }, thickness: 1.1, color: ORANGE });

  const certificateLabel = "CERTIFICATE NO:";
  const certificateSize = 9.5;
  const serialSize = 9.5;
  const gap = 6;
  const labelWidth = semi.widthOfTextAtSize(certificateLabel, certificateSize);
  const serialWidth = safeBold.widthOfTextAtSize(d.serial, serialSize);
  const certificateLineWidth = labelWidth + gap + serialWidth;
  const certificateX = W - 54 - certificateLineWidth;
  page.drawText(certificateLabel, { x: certificateX, y: 409, size: certificateSize, font: semi, color: BLACK });
  page.drawText(d.serial, { x: certificateX + labelWidth + gap, y: 409, size: serialSize, font: safeBold, color: NAVY });

  centered(page, "This certificate is proudly presented to", 379, safeBold, 15, BLACK, 500);
  centered(page, d.studentName.toUpperCase(), 329, head, 30, NAVY, 560);
  page.drawLine({ start: { x: 270, y: 316 }, end: { x: 572, y: 316 }, thickness: 0.8, color: MID_BLUE });

  centered(page, "This is to certify that this learner has successfully completed practical training in", 279, safeItalic, 13, BLACK, 700);
  centered(page, d.courseTitle, 247, safeBold, 19, NAVY, 650);
  centered(page, "at Skill Bridgeway Foundation.", 221, semi, 14, BLACK, 500);
  centered(page, "We appreciate this commitment to learning and wish every success in the future career.", 181, italic, 12, BLACK, 690);

  // Scannable verification mark — placed at the marked top-right spot,
  // aligned with the certificate-number column below it.
  const qrUrl = await QRCode.toDataURL(VERIFY_BASE + encodeURIComponent(d.serial), { margin: 1, width: 300, color: { dark: "#0A192F", light: "#FFFFFF" } });
  const qr = await pdf.embedPng(qrUrl);
  const q = 78;
  const qrX = W - 54 - q;
  const qrY = 442;
  page.drawImage(qr, { x: qrX, y: qrY, width: q, height: q });
  const scanLabel = "SCAN TO VERIFY";
  const scanLabelWidth = semi.widthOfTextAtSize(scanLabel, 7);
  page.drawText(scanLabel, { x: qrX + (q - scanLabelWidth) / 2, y: qrY - 12, size: 7, font: semi, color: NAVY });
  signature(page, 183, "Chairman", semi);
  signature(page, 421, "Executive Director (Operations)", semi);
  signature(page, 659, "Chief Trainer", semi);

  return pdf.save();
}
