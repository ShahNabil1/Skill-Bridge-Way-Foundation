import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";

export const VERIFY_BASE = "https://skillbridgeway.org/verify?serial=";
const LOGO_URL = "https://cdn.skillbridgeway.org/logo.png";
const FONT_HEAD = "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-800-normal.ttf";
const FONT_SEMI = "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.ttf";
const FONT_BODY = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf";

// Brand colours (PDF output cannot use CSS tokens)
const NAVY = rgb(10 / 255, 25 / 255, 47 / 255);
const NAVY_2 = rgb(17 / 255, 34 / 255, 64 / 255);
const CYAN = rgb(0, 168 / 255, 1);
const ORANGE = rgb(1, 153 / 255, 0);
const WHITE = rgb(1, 1, 1);
const GREY = rgb(0.72, 0.77, 0.84);

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

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = WHITE, maxWidth = 640) {
  let s = size;
  while (font.widthOfTextAtSize(text, s) > maxWidth && s > 10) s -= 1;
  const w = font.widthOfTextAtSize(text, s);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size: s, font, color });
}

export async function generateCertificatePdf(d: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Certificate ${d.serial}`);
  pdf.setAuthor("Skill Bridgeway Foundation");

  const [headB, semiB, bodyB, logoB] = await Promise.all([fetchBytes(FONT_HEAD), fetchBytes(FONT_SEMI), fetchBytes(FONT_BODY), fetchBytes(LOGO_URL)]);
  const head = headB ? await pdf.embedFont(headB) : await pdf.embedFont(StandardFonts.HelveticaBold);
  const semi = semiB ? await pdf.embedFont(semiB) : await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = bodyB ? await pdf.embedFont(bodyB) : await pdf.embedFont(StandardFonts.Helvetica);

  const page = pdf.addPage([842, 595]); // A4 landscape
  const W = page.getWidth();
  const H = page.getHeight();

  // Background + subtle grid
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });
  for (let x = 0; x <= W; x += 28) page.drawLine({ start: { x, y: 0 }, end: { x, y: H }, thickness: 0.4, color: CYAN, opacity: 0.06 });
  for (let y = 0; y <= H; y += 28) page.drawLine({ start: { x: 0, y }, end: { x: W, y }, thickness: 0.4, color: CYAN, opacity: 0.06 });

  // Frame
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: CYAN, borderWidth: 1.5, opacity: 0 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, color: NAVY_2, opacity: 0.55, borderColor: CYAN, borderWidth: 0.4, borderOpacity: 0.4 });
  // Corner accents
  for (const [cx, cy, dx, dy] of [[24, H - 24, 1, -1], [W - 24, H - 24, -1, -1], [24, 24, 1, 1], [W - 24, 24, -1, 1]] as const) {
    page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + 60 * dx, y: cy }, thickness: 4, color: CYAN });
    page.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy + 60 * dy }, thickness: 4, color: CYAN });
  }

  // Logo
  let top = H - 70;
  if (logoB) {
    try {
      const isPng = logoB[0] === 0x89;
      const img = isPng ? await pdf.embedPng(logoB) : await pdf.embedJpg(logoB);
      const size = 64;
      page.drawImage(img, { x: (W - size) / 2, y: top - size + 10, width: size, height: size });
      top -= size + 4;
    } catch { /* logo optional */ }
  }
  centered(page, "SKILL BRIDGEWAY FOUNDATION", top - 8, semi, 12, CYAN);

  centered(page, "CERTIFICATE OF COMPLETION", top - 58, head, 34, WHITE);
  page.drawRectangle({ x: (W - 90) / 2, y: top - 74, width: 90, height: 3, color: ORANGE });

  centered(page, "This is to certify that", top - 108, body, 13, GREY);
  centered(page, d.studentName.toUpperCase(), top - 152, head, 32, WHITE, 620);
  centered(page, `Student ID: ${d.studentCode}`, top - 176, body, 11, GREY);
  centered(page, "has successfully completed the course", top - 210, body, 13, GREY);
  centered(page, d.courseTitle, top - 244, semi, 22, CYAN, 620);

  // Footer: date, signature, QR
  const issued = new Date(d.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const fy = 92;
  page.drawText("DATE OF ISSUE", { x: 80, y: fy + 22, size: 9, font: semi, color: GREY });
  page.drawText(issued, { x: 80, y: fy + 4, size: 13, font: semi, color: WHITE });
  page.drawText("CERTIFICATE SERIAL", { x: 80, y: fy - 22, size: 9, font: semi, color: GREY });
  page.drawText(d.serial, { x: 80, y: fy - 40, size: 13, font: semi, color: CYAN });

  page.drawLine({ start: { x: W / 2 - 100, y: fy + 4 }, end: { x: W / 2 + 100, y: fy + 4 }, thickness: 0.8, color: GREY });
  centered(page, "AUTHORIZED SIGNATURE", fy - 12, semi, 9, GREY);
  centered(page, "Skill Bridgeway Foundation", fy - 28, body, 10, WHITE);

  const qrUrl = await QRCode.toDataURL(VERIFY_BASE + encodeURIComponent(d.serial), { margin: 1, width: 300, color: { dark: "#0A192F", light: "#FFFFFF" } });
  const qr = await pdf.embedPng(qrUrl);
  const q = 96;
  page.drawImage(qr, { x: W - 80 - q, y: fy - 44, width: q, height: q });
  const scan = "Scan to verify";
  page.drawText(scan, { x: W - 80 - q / 2 - body.widthOfTextAtSize(scan, 8) / 2, y: fy - 58, size: 8, font: body, color: GREY });

  return pdf.save();
}
