import { Input } from "@/components/ui/input";
import { EDUCATION_BOARDS, EDUCATION_GROUPS, EDUCATION_LEVELS, PASSING_YEARS } from "@/lib/admission-schema";
import { Field, Select } from "./FormBits";

export type EducationValue = { education_level: string; institution: string; education_board: string; education_group: string; education_result: string; passing_year: string; session: string };

export function EducationFields({ value, onChange, errors = {}, disabled }: { value: EducationValue; onChange: (p: Partial<EducationValue>) => void; errors?: Partial<Record<keyof EducationValue, string | undefined>>; disabled?: boolean | undefined }) {
  const running = /running/i.test(value.education_level);
  return <div className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Highest education level" error={errors.education_level}><Select disabled={disabled} value={value.education_level} options={EDUCATION_LEVELS} onChange={(v) => onChange({ education_level: v })} /></Field>
      <Field label="Board / University type" error={errors.education_board}><Select disabled={disabled} value={value.education_board} options={EDUCATION_BOARDS} onChange={(v) => onChange({ education_board: v })} /></Field>
    </div>
    <Field label="Institution name" error={errors.institution}><Input disabled={disabled} value={value.institution} maxLength={200} onChange={(e) => onChange({ institution: e.target.value })} /></Field>
    <div className="grid gap-5 sm:grid-cols-3">
      <Field label="Group / Subject" error={errors.education_group}><Select disabled={disabled} value={value.education_group} options={EDUCATION_GROUPS} onChange={(v) => onChange({ education_group: v })} /></Field>
      {running ? (
        <Field label="Session" error={errors.session} hint="e.g. 2023-24"><Input disabled={disabled} value={value.session} maxLength={9} placeholder="2023-24" onChange={(e) => onChange({ session: e.target.value.replace(/[^0-9-]/g, "") })} /></Field>
      ) : (
        <Field label="Passing year" error={errors.passing_year}><Select disabled={disabled} value={value.passing_year} options={PASSING_YEARS} onChange={(v) => onChange({ passing_year: v })} /></Field>
      )}
      <Field label={running ? "Latest result (optional)" : "Result"} error={errors.education_result} hint="GPA / CGPA / Division"><Input disabled={disabled} value={value.education_result} maxLength={50} placeholder="GPA 5.00" onChange={(e) => onChange({ education_result: e.target.value })} /></Field>
    </div>
  </div>;
}
