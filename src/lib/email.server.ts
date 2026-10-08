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

const appLink = (t: string) => `${SITE}/application/${encodeURIComponent(t)}`;
const viewApp = (t: string) => ({ label: "View Your Application", href: appLink(t) });
const linkLine = (t: string) => `<p style="font-size:13px;color:#8892b0">Your private application link (don't share it):<br><a href="${appLink(t)}" style="color:#00A8FF;word-break:break-all">${appLink(t)}</a></p>`;

const bar = (p: number) => `<div style="margin:18px 0"><div style="color:#8892b0;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Course progress · ${p}%</div><div style="background:#0A192F;border:1px solid #1e3a5f;border-radius:99px;height:14px;overflow:hidden"><div style="width:${Math.max(0, Math.min(100, p))}%;height:14px;background:#00A8FF;border-radius:99px"></div></div></div>`;
const stat = (k: string, v: string) => `<td align="center" style="padding:10px;background:#0A192F;border:1px solid #1e3a5f;border-radius:8px"><div style="color:#8892b0;font-size:11px;text-transform:uppercase">${k}</div><div style="color:#fff;font-size:18px;font-weight:800;margin-top:4px">${esc(v)}</div></td>`;

export const templates = {
  received: (name: string, ref: string, course: string | null, token: string) => ({
    subject: "Application received — Skill Bridgeway Foundation",
    html: layout("Application Received",
      `<p>Dear ${esc(name)},</p><p>Thank you for applying for free admission${course ? ` to <b style="color:#fff">${esc(course)}</b>` : ""}. Your application is now <b style="color:#fff">pending review</b>; our team will contact you soon.</p>${highlight("Your reference number", ref)}<p>Please keep this number for any enquiries. You can view your full application, documents and PDF anytime:</p>${linkLine(token)}`, viewApp(token)),
  }),
  approved: (name: string, studentCode: string, course: string | null, token: string) => ({
    subject: `You're in! Your Student ID is ${studentCode}`,
    html: layout("Application Approved",
      `<p>Dear ${esc(name)},</p><p>Congratulations! Your admission${course ? ` to <b style="color:#fff">${esc(course)}</b>` : ""} has been <b style="color:#fff">approved</b>. Welcome to Skill Bridgeway Foundation.</p>${highlight("Your unique Student ID", studentCode)}<p>Use this Student ID in all communication with us. We'll share class details shortly.</p>${linkLine(token)}`, viewApp(token)),
  }),
  rejected: (name: string, ref: string, course: string | null, note: string | null, token: string) => ({
    subject: "Update on your application — Skill Bridgeway Foundation",
    html: layout("Application Update",
      `<p>Dear ${esc(name)},</p><p>Thank you for your interest${course ? ` in <b style="color:#fff">${esc(course)}</b>` : ""}. After careful review, we are unable to accept your application at this time.</p>${highlight("Reference number", ref)}${note ? `<p><b style="color:#fff">Note from our team:</b> ${esc(note)}</p>` : ""}<p>You are welcome to apply again for this or another course in the future.</p>${linkLine(token)}`, viewApp(token)),
  }),
  progress: (name: string, course: string | null, progress: number, status: string, att: { attended: number; held: number; rate: number | null }) => ({
    subject: `Your learning progress: ${progress}%${course ? ` — ${course}` : ""}`,
    html: layout("Learning Progress Update",
      `<p>Dear ${esc(name)},</p><p>Here is your latest progress${course ? ` in <b style="color:#fff">${esc(course)}</b>` : ""}.</p>${bar(progress)}<table role="presentation" width="100%" style="margin:16px 0;font-size:14px"><tr>${stat("Status", status.charAt(0).toUpperCase() + status.slice(1))}${stat("Classes attended", `${att.attended}/${att.held}`)}${stat("Attendance", att.rate == null ? "—" : `${att.rate}%`)}</tr></table><p>${status === "completed" ? "Congratulations on completing the course!" : progress >= 75 ? "Great work — you're almost there. Keep it up!" : "Keep attending classes and practising — every session moves you forward."}</p>`,
      { label: "Visit Skill Bridgeway", href: SITE }),
  }),
  absence: (name: string, course: string | null, date: string, s: { missed: number; streak: number; attended: number; held: number; rate: number | null; progress: number }) => ({
    subject: s.streak > 1 ? `We've missed you for ${s.streak} classes in a row` : `You missed class on ${date}`,
    html: layout("We Missed You in Class",
      `<p>Dear ${esc(name)},</p><p>You were marked <b style="color:#FF9900">absent</b>${course ? ` from <b style="color:#fff">${esc(course)}</b>` : ""} on <b style="color:#fff">${esc(date)}</b>.</p><table role="presentation" width="100%" style="margin:16px 0;font-size:14px"><tr>${stat("Missed in a row", String(s.streak))}${stat("Total missed", String(s.missed))}${stat("Attendance", s.rate == null ? "—" : `${s.rate}%`)}</tr></table>${bar(s.progress)}<p>${s.streak >= 3 ? `You are now <b style="color:#fff">${s.streak} classes behind</b>. Please contact us so we can help you catch up — we don't want you to fall behind.` : "Please review what was covered and join the next class. If something is stopping you, reply to this email and we'll help."}</p>`,
      { label: "Contact us", href: `${SITE}/contact` }),
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

export async function sendEmail(to: string, msg: { subject: string; html: string }, from: string = FROM) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.error("RESEND_API_KEY is not configured; email skipped");
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: msg.subject, html: msg.html }),
  });
  if (!res.ok) {
    console.error(`Resend failed [${res.status}]: ${await res.text()}`);
    return { sent: false };
  }
  return { sent: true };
}

/** Admin-issued temporary password. */
export function adminPasswordResetEmail(name: string, password: string) {
  return {
    subject: "Your password was reset — Skill Bridgeway Foundation",
    html: layout("Password Reset",
      `<p>Dear ${esc(name || "team member")},</p><p>An administrator has reset your Skill Bridgeway Foundation admin account password. All your previous sessions have been signed out.</p>${highlight("Your new temporary password", password)}<p>Please sign in and change this password right away from <b style="color:#fff">My Profile → Change Password</b>. If you did not expect this, contact info@skillbridgeway.org.</p>`,
      { label: "Sign In", href: `${SITE}/auth` }),
  };
}
