import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendCertificateEmail } from "@/lib/email.functions";
import { createMediaUploadUrl } from "@/lib/r2.functions";

/** Completes the course, issues/regenerates the certificate PDF, uploads it to R2 and emails the student on first issue. */
export function useIssueCertificate() {
  const sign = useServerFn(createMediaUploadUrl);
  const notifyCert = useServerFn(sendCertificateEmail);
  return async (e: { id: string; studentId: string; studentName: string; studentCode: string; courseTitle: string; hadPdf: boolean }) => {
    const { data, error } = await supabase.rpc("issue_certificate", { _enrollment_id: e.id });
    if (error) throw error;
    const cert = data?.[0];
    if (!cert) throw new Error("Certificate was not created");
    const { data: full } = await supabase.from("certificates").select("issued_at").eq("id", cert.certificate_id).single();
    const { generateCertificatePdf } = await import("@/lib/certificate-pdf");
    const bytes = await generateCertificatePdf({ serial: cert.serial, studentName: e.studentName, studentCode: e.studentCode, courseTitle: e.courseTitle, issuedAt: full?.issued_at ?? new Date().toISOString() });
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const { uploadUrl, key } = await sign({ data: { folder: "certificates", fileName: `${cert.serial}.pdf`, contentType: "application/pdf", size: blob.size } });
    const res = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "application/pdf" } }).catch(() => null);
    if (!res?.ok) throw new Error("PDF upload to storage failed");
    const { error: upErr } = await supabase.from("certificates").update({ pdf_key: key }).eq("id", cert.certificate_id);
    if (upErr) throw upErr;
    await supabase.from("enrollments").update({ progress: 100, learning_status: "completed" }).eq("id", e.id);
    await supabase.rpc("log_student_activity", { _student_id: e.studentId, _action: e.hadPdf ? "certificate_regenerated" : "certificate_issued", _detail: { serial: cert.serial, course: e.courseTitle } as never });
    if (!e.hadPdf) {
      notifyCert({ data: { certificateId: cert.certificate_id } }).then((x) => { if (!x.sent) toast.warning("Certificate email could not be sent"); }).catch(() => toast.warning("Certificate email could not be sent"));
    }
    return cert.serial;
  };
}

/** Re-renders every existing certificate PDF with the current design (same serials) and re-uploads it. */
export function useRefreshAllCertificates() {
  const sign = useServerFn(createMediaUploadUrl);
  return async (onProgress?: (done: number, total: number) => void) => {
    const { data, error } = await supabase
      .from("certificates")
      .select("id, serial, issued_at, students(full_name, student_code), courses(title)")
      .not("pdf_key", "is", null);
    if (error) throw error;
    const rows = data ?? [];
    const { generateCertificatePdf } = await import("@/lib/certificate-pdf");
    let done = 0;
    let failed = 0;
    for (const c of rows) {
      try {
        const s = c.students as { full_name: string; student_code: string } | null;
        const co = c.courses as { title: string } | null;
        if (!s || !co) throw new Error("missing data");
        const bytes = await generateCertificatePdf({ serial: c.serial, studentName: s.full_name, studentCode: s.student_code, courseTitle: co.title, issuedAt: c.issued_at });
        const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const { uploadUrl, key } = await sign({ data: { folder: "certificates", fileName: `${c.serial}.pdf`, contentType: "application/pdf", size: blob.size } });
        const res = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "application/pdf" } }).catch(() => null);
        if (!res?.ok) throw new Error("upload failed");
        const { error: upErr } = await supabase.from("certificates").update({ pdf_key: key }).eq("id", c.id);
        if (upErr) throw upErr;
      } catch { failed++; }
      onProgress?.(++done, rows.length);
    }
    return { total: rows.length, failed };
  };
}
