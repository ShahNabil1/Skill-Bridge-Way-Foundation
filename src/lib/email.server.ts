// Server-only: branded HTML emails sent through Resend.
const FROM = "Skill Bridgeway Foundation <info@skillbridgeway.org>";
const LOGO = "https://cdn.skillbridgeway.org/logo.png";
const SITE = "https://skillbridgeway.org";

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0A192F">
<div style="background:#0A192F;padding:40px 16px;font-family:Inter,Arial,sans-serif">
<table role="presentation" align="center" width="100%" style="max-width:560px;background:#112240;border:1px solid #1e3a5f;border-radius:12px;padding:32px">
<tr><td align="center"><img src="${LOGO}" alt="Skill Bridgeway Foundation" width="72" style="border-radius:8px"></td></tr>
<tr><td style="padding-top:24px;color:#ffffff;font-family:Montserrat,Arial,sans-serif;font-size:20px;font-weight:800;text-transform:uppercase;text-align:center;letter-spacing:.5px">${title}</td></tr>
<tr><td style="padding-top:16px;color:#F4F6F8;font-size:15px;line-height:1.65">${body}</td></tr>
${cta ? `<tr><td align="center" style="padding:28px 0 8px"><a href="${cta.href}" style="background:#00A8FF;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;display:inline-block">${cta.label}</a></td></tr>` : ""}
<tr><td style="padding-top:24px;border-top:1px solid #1e3a5f;color:#8892b0;font-size:12px;text-align:center">Skill Bridgeway Foundation · Bogura, Bangladesh<br><a href="${SITE}" style="color:#00A8FF">skillbridgeway.org</a> · info@skillbridgeway.org</td></tr>
</table></div></body></html>`;
}

function highlight(label: string, value: string) {
  return `<div style="margin:20px 0;text-align:center"><div style="color:#8892b0;font-size:12px;text-transform:uppercase;letter-spacing:2px">${label}</div>
<div style="display:inline-block;margin-top:8px;background:#0A192F;border:1px solid #00A8FF;border-radius:10px;padding:12px 22px;color:#00A8FF;font-size:22px;font-weight:800;letter-spacing:2px;font-family:'Courier New',monospace">${esc(value)}</div></div>`;
}

export const templates = {
  received: (name: string, ref: string, course: string | null) => ({
    subject: "Application received — Skill Bridgeway Foundation",
    html: layout("Application Received",
      `<p>Dear ${esc(name)},</p><p>Thank you for applying for free admission${course ? ` to <b style="color:#fff">${esc(course)}</b>` : ""}. Your application is now <b style="color:#fff">pending review</b>; our team will contact you soon.</p>${highlight("Your reference number", ref)}<p>Please keep this number for any enquiries.</p>`),
  }),
  approved: (name: string, studentCode: string, course: string | null) => ({
    subject: `You're in! Your Student ID is ${studentCode}`,
    html: layout("Application Approved",
      `<p>Dear ${esc(name)},</p><p>Congratulations! Your admission${course ? ` to <b style="color:#fff">${esc(course)}</b>` : ""} has been <b style="color:#fff">approved</b>. Welcome to Skill Bridgeway Foundation.</p>${highlight("Your unique Student ID", studentCode)}<p>Use this Student ID in all communication with us. We'll share class details shortly.</p>`,
      { label: "Visit our website", href: SITE }),
  }),
  certificate: (name: string, course: string | null, serial: string) => {
    const link = `${SITE}/verify?serial=${encodeURIComponent(serial)}`;
    return {
      subject: "Your certificate has been issued 🎓",
      html: layout("Certificate Issued",
        `<p>Dear ${esc(name)},</p><p>Congratulations on completing ${course ? `<b style="color:#fff">${esc(course)}</b>` : "your course"}! Your official certificate has been issued.</p>${highlight("Certificate serial", serial)}<p>Anyone can verify it, and you can download your PDF, here:<br><a href="${link}" style="color:#00A8FF;word-break:break-all">${link}</a></p>`,
        { label: "View & verify certificate", href: link }),
    };
  },
};

export async function sendEmail(to: string, msg: { subject: string; html: string }) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.error("RESEND_API_KEY is not configured; email skipped");
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: msg.subject, html: msg.html }),
  });
  if (!res.ok) {
    console.error(`Resend failed [${res.status}]: ${await res.text()}`);
    return { sent: false };
  }
  return { sent: true };
}
