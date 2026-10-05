import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { cdnUrl } from "./cdn";
import { attendanceText, composeAddress, devicesText, docLabel, docsOf, photoKey, refOf, type ApplicationRecord } from "./application";

const LOGO_URL = "https://cdn.skillbridgeway.org/logo.png";
const FONT_HEAD = "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-800-normal.ttf";
const FONT_SEMI = "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.ttf";
const FONT_BODY = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf";
// Brand colours (PDF output cannot use CSS tokens)
const NAVY = rgb(10 / 255, 25 / 255, 47 / 255);
const CYAN = rgb(0, 168 / 255, 1);
const ORANGE = rgb(1, 153 / 255, 0);
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.12, 0.16, 0.24);
const MUTED = rgb(0.42, 0.47, 0.55);
const LINE = rgb(0.86, 0.89, 0.93);

async function bytes(url: string) {
  try { const r = await fetch(url); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; } catch { return null; }
}
async function embedImage(pdf: PDFDocument, url: string): Promise<PDFImage | null> {
  const b = await bytes(url);
  if (!b) return null;
  try {
    if (b[0] === 0x89) return await pdf.embedPng(b);
    if (b[0] === 0xff) return await pdf.embedJpg(b);
    const bmp = await createImageBitmap(new Blob([b as BlobPart]));
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    c.getContext("2d")?.drawImage(bmp, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
    return blob ? await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer())) : null;
  } catch { return null; }
}
function wrap(text: string, font: PDFFont, size: number, max: number) {
  const out: string[] = [];
  for (const para of text.replace(/[^\x20-\x7E\n]/g, "").split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > max && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
const clean = (v: unknown) => (v == null || v === "" ? "—" : String(v));

export async function generateApplicationPdf(a: ApplicationRecord, viewUrl?: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const ref = refOf(a.id);
  pdf.setTitle(`Application ${ref}`); pdf.setAuthor("Skill Bridgeway Foundation");
  const [hB, sB, bB] = await Promise.all([bytes(FONT_HEAD), bytes(FONT_SEMI), bytes(FONT_BODY)]);
  const head = hB ? await pdf.embedFont(hB) : await pdf.embedFont(StandardFonts.HelveticaBold);
  const semi = sB ? await pdf.embedFont(sB) : await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = bB ? await pdf.embedFont(bB) : await pdf.embedFont(StandardFonts.Helvetica);
  const pk = photoKey(a);
  const [logo, photo] = await Promise.all([embedImage(pdf, LOGO_URL), pk ? embedImage(pdf, cdnUrl(pk)!) : Promise.resolve(null)]);

  const W = 595, H = 842, M = 40;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;
  const footer = (p: PDFPage) => {
    p.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: LINE });
    p.drawText(`${ref} · Generated ${new Date().toLocaleString("en-GB")}`, { x: M, y: 26, size: 8, font: body, color: MUTED });
    p.drawText("skillbridgeway.org", { x: W - M - body.widthOfTextAtSize("skillbridgeway.org", 8), y: 26, size: 8, font: body, color: CYAN });
  };
  const ensure = (h: number) => { if (y - h < 60) { footer(page); page = pdf.addPage([W, H]); y = H - M; } };

  // Header band
  page.drawRectangle({ x: 0, y: H - 120, width: W, height: 120, color: NAVY });
  for (let x = 0; x <= W; x += 24) page.drawLine({ start: { x, y: H - 120 }, end: { x, y: H }, thickness: 0.3, color: CYAN, opacity: 0.12 });
  page.drawRectangle({ x: 0, y: H - 123, width: W, height: 3, color: ORANGE });
  if (logo) page.drawImage(logo, { x: M, y: H - 98, width: 72, height: 72 });
  const tx = logo ? M + 88 : M;
  page.drawText("SKILL BRIDGEWAY FOUNDATION", { x: tx, y: H - 52, size: 11, font: semi, color: CYAN });
  page.drawText("ADMISSION APPLICATION", { x: tx, y: H - 78, size: 20, font: head, color: WHITE });
  page.drawText(`Reference: ${ref}`, { x: tx, y: H - 98, size: 10, font: semi, color: ORANGE });
  // Photo
  const ph = 104, pw = 84;
  if (photo) {
    page.drawRectangle({ x: W - M - pw - 3, y: H - 112 - 3, width: pw + 6, height: ph + 6, color: WHITE });
    page.drawImage(photo, { x: W - M - pw, y: H - 112, width: pw, height: ph });
  }
  y = H - 150;
  // Summary
  const status = a.status.toUpperCase();
  page.drawText(clean(a.full_name).toUpperCase(), { x: M, y, size: 16, font: head, color: INK });
  y -= 18;
  page.drawText(`Status: ${status}   ·   Applied: ${new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { x: M, y, size: 9, font: body, color: MUTED });
  y -= 22;

  const section = (title: string, rows: [string, unknown][]) => {
    if (rows.length === 0) return;
    ensure(40);
    page.drawRectangle({ x: M, y: y - 6, width: 3, height: 16, color: CYAN });
    page.drawText(title.toUpperCase(), { x: M + 10, y: y - 2, size: 10.5, font: head, color: NAVY });
    y -= 22;
    const labelX = M + 10;
    const valueX = M + 160;
    const rightX = W - M;
    for (const [k, v] of rows) {
      const labels = wrap(k, semi, 9, valueX - labelX - 12);
      const values = wrap(clean(v), body, 10, rightX - valueX);
      const rowHeight = Math.max(26, Math.max(labels.length, values.length) * 14 + 12);
      ensure(rowHeight);
      labels.forEach((line, i) => page.drawText(line, { x: labelX, y: y - i * 14, size: 9, font: semi, color: MUTED }));
      values.forEach((line, i) => page.drawText(line, { x: valueX, y: y - i * 14, size: 10, font: body, color: INK }));
      y -= rowHeight;
      page.drawLine({ start: { x: labelX, y: y + 11 }, end: { x: rightX, y: y + 11 }, thickness: 0.4, color: LINE });
    }
    y -= 8;
  };

  section("Personal information", [["Full name", a.full_name], ["Email", a.email], ["Mobile", a.phone ? `+88 ${a.phone}` : ""], ["Date of birth", a.date_of_birth], ["Gender", a.gender ? a.gender[0]!.toUpperCase() + a.gender.slice(1) : ""], ["Occupation", a.occupation]]);
  section("Address", a.division ? [["Division", a.division], ["District", a.district], ["Upazila / Thana", a.upazila], ["Union / Ward", a.union_name], ["Village / Area", a.village], ["House, Road / Para", a.address_line]] : [["Address", composeAddress(a)]]);
  section("Education", [["Level", a.education_level], ["Institution", a.institution], ["Board / University", a.education_board], ["Group / Subject", a.education_group], [/running/i.test(a.education_level ?? "") ? "Session" : "Passing year", a.session || a.passing_year], ["Result", a.education_result]]);
  section("Course", [["Course", a.course_title ?? "Not decided — advise me"], ["Motivation", a.motivation], ["Devices", devicesText(a.digital_access)], ["Attendance", attendanceText(a.attendance_commitment)]]);
  section("Submitted documents", docsOf(a).map((d) => [docLabel(d.type), d.name ?? d.key ?? ""]));
  if (viewUrl) {
    ensure(30);
    page.drawText("View the full application and documents online:", { x: M, y, size: 9, font: body, color: MUTED });
    page.drawText(viewUrl, { x: M, y: y - 14, size: 9, font: semi, color: CYAN });
  }
  footer(page);
  return pdf.save();
}

export async function downloadApplicationPdf(a: ApplicationRecord, viewUrl?: string) {
  const { saveBlob } = await import("./application");
  const b = await generateApplicationPdf(a, viewUrl);
  saveBlob(new Blob([b as BlobPart], { type: "application/pdf" }), `${refOf(a.id)}.pdf`);
}
