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
const PALE_BLUE = rgb(184 / 255, 196 / 255, 217 / 255);
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

function cornerBlocks(page: PDFPage, x: number, y: number, sx: 1 | -1, sy: 1 | -1) {
  const blocks = [
    { dx: 0, dy: 0, w: 38, h: 22, color: MID_BLUE },
    { dx: 18, dy: 14, w: 38, h: 22, color: PALE_BLUE },
    { dx: 36, dy: 28, w: 38, h: 22, color: MID_BLUE },
  ];
  for (const block of blocks) {
    page.drawRectangle({
      x: sx === 1 ? x + block.dx : x - block.dx - block.w,
      y: sy === 1 ? y + block.dy : y - block.dy - block.h,
      width: block.w,
      height: block.h,
      color: block.color,
    });
  }
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

  const page = pdf.addPage([842, 595]); // A4 landscape
  const W = page.getWidth();
  const H = page.getHeight();

  // White formal certificate with bold blue print-safe frame.
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLUE });
  page.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, color: WHITE });
  page.drawRectangle({ x: 36, y: 31, width: W - 72, height: H - 62, borderColor: NAVY, borderWidth: 1, borderDashArray: [7, 3] });
  cornerBlocks(page, 36, H - 53, 1, -1);
  cornerBlocks(page, W - 36, H - 53, -1, -1);
  cornerBlocks(page, 36, 31, 1, 1);
  cornerBlocks(page, W - 36, 31, -1, 1);

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

  // Simple ornamental divider.
  page.drawLine({ start: { x: 286, y: 432 }, end: { x: 377, y: 432 }, thickness: 1.2, color: GREY });
  page.drawLine({ start: { x: 465, y: 432 }, end: { x: 556, y: 432 }, thickness: 1.2, color: GREY });
  centered(page, "~  SBF  ~", 424, semi, 12, GREY, 100);

  page.drawText("CERTIFICATE NO:", { x: 626, y: 421, size: 10, font: semi, color: BLACK });
  page.drawText(d.serial, { x: 626, y: 402, size: 10, font: semi, color: NAVY });

  centered(page, "This certificate is proudly presented to", 379, semi, 15, BLACK, 500);
  centered(page, d.studentName.toUpperCase(), 329, head, 30, NAVY, 560);
  page.drawLine({ start: { x: 270, y: 316 }, end: { x: 572, y: 316 }, thickness: 0.8, color: MID_BLUE });

  centered(page, "This is to certify that this learner has successfully completed practical training in", 279, italic, 13, BLACK, 700);
  centered(page, d.courseTitle, 247, head, 19, NAVY, 650);
  centered(page, "at Skill Bridgeway Foundation.", 221, semi, 14, BLACK, 500);
  centered(page, "We appreciate this commitment to learning and wish every success in the future career.", 181, italic, 12, BLACK, 690);

  // Issue details and a scannable verification mark.
  const issued = new Date(d.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const qrUrl = await QRCode.toDataURL(VERIFY_BASE + encodeURIComponent(d.serial), { margin: 1, width: 300, color: { dark: "#0A192F", light: "#FFFFFF" } });
  const qr = await pdf.embedPng(qrUrl);
  const q = 58;
  page.drawImage(qr, { x: W - 112, y: 116, width: q, height: q });
  page.drawText("SCAN TO VERIFY", { x: W - 116, y: 104, size: 6.5, font: semi, color: NAVY });
  page.drawText(`Issued ${issued}`, { x: 56, y: 99, size: 7.5, font: body, color: GREY });

  signature(page, 183, "Chairman", semi);
  signature(page, 421, "Executive Director (Operations)", semi);
  signature(page, 659, "Chief Trainer", semi);

  return pdf.save();
}
