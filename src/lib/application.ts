import { toast } from "sonner";
import { DOC_SLOTS } from "./admission-schema";

export type AppDoc = { type?: string; key?: string; name?: string };
export type ApplicationRecord = {
  id: string; full_name: string; email: string; phone: string; date_of_birth: string | null; gender: string | null;
  address: string | null; division: string | null; district: string | null; upazila: string | null; address_line: string | null;
  education_level: string | null; institution: string | null;
  education_board: string | null; education_group: string | null; education_result: string | null; passing_year: string | null;
  session: string | null; course_id: string | null; motivation: string | null; document_keys: unknown; status: string;
  created_at: string; course_title?: string | null; access_token?: string;
};

export const refOf = (id: string) => `SBF-APP-${id.slice(0, 8).toUpperCase()}`;
export const docsOf = (a: { document_keys: unknown }) => (Array.isArray(a.document_keys) ? (a.document_keys as AppDoc[]) : []);
export const docLabel = (t?: string) => DOC_SLOTS.find((s) => s.id === t)?.label ?? t ?? "Document";
export const photoKey = (a: { document_keys: unknown }) => docsOf(a).find((d) => d.type === "photo" && /\.(jpe?g|png|webp)$/i.test(d.key ?? ""))?.key ?? null;

export function composeAddress(a: Partial<ApplicationRecord>) {
  const parts = [a.address_line, a.upazila, a.district, a.division].filter(Boolean);
  return parts.length ? parts.join(", ") : a.address ?? "";
}

export const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name", email: "Email", phone: "Phone", date_of_birth: "Date of birth", gender: "Gender",
  division: "Division", district: "District", upazila: "Upazila / Thana", address_line: "Village / Area, House & Road", education_level: "Education level", institution: "Institution",
  education_board: "Board / University", education_group: "Group / Subject", education_result: "Result",
  passing_year: "Passing year", session: "Session", course_id: "Course", motivation: "Motivation", document_keys: "Documents",
};

export async function copyText(text: string, label: string) {
  try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`, { description: text }); }
  catch { toast.error("Could not copy. Please copy it manually."); }
}

/** Downloads a cross-origin file as a real download (falls back to opening it). */
export async function downloadFile(url: string, fileName: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    saveBlob(await res.blob(), fileName);
  } catch { window.open(url, "_blank", "noopener"); }
}

export function saveBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

export const extOf = (key?: string) => key?.split(".").pop() ?? "file";
