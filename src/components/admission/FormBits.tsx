import { cloneElement, isValidElement, useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BD_LOCATIONS, DIVISIONS } from "@/lib/bd-locations";
import { digitsOnly } from "@/lib/form-input";

export const selectCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-popover";

export function Field({ label, error, hint, children }: { label: string; error?: string | undefined; hint?: ReactNode; children: ReactNode }) {
  const id = useId();
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{control}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

export function Select({ value, onChange, options, placeholder = "Select", disabled, id }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; disabled?: boolean | undefined; id?: string | undefined }) {
  return <select id={id} className={selectCls} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {value && !options.includes(value) && <option value={value}>{value}</option>}
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>;
}

function BdFlag() {
  return <svg viewBox="0 0 20 12" className="h-3.5 w-6 rounded-[2px]" aria-hidden="true"><rect width="20" height="12" fill="#006A4E" /><circle cx="9" cy="6" r="3.6" fill="#F42A41" /></svg>;
}

export function PhoneInput({ value, onChange, disabled, id }: { value: string; onChange: (v: string) => void; disabled?: boolean | undefined; id?: string | undefined }) {
  return <div className="flex h-10 overflow-hidden rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
    <span className="flex shrink-0 items-center gap-2 border-r border-input bg-muted px-3 text-sm"><BdFlag />+88</span>
    <input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" disabled={disabled} maxLength={11} placeholder="01XXXXXXXXX"
      value={value} onChange={(e) => onChange(digitsOnly(e.target.value).slice(0, 11))}
      className="min-w-0 flex-1 bg-transparent px-3 text-sm tracking-wider outline-none disabled:opacity-60" />
  </div>;
}

export type AddressValue = { division: string; district: string; upazila: string; address_line: string };
type Errs = Partial<Record<keyof AddressValue, string>>;

/** Division → District → Upazila picker plus detailed address, shared by the public form and admin editing. */
export function AddressPicker({ value, onChange, errors = {}, disabled }: { value: AddressValue; onChange: (patch: Partial<AddressValue>) => void; errors?: Errs; disabled?: boolean | undefined }) {
  const districts = value.division ? Object.keys(BD_LOCATIONS[value.division] ?? {}) : [];
  const upazilas = value.division && value.district ? BD_LOCATIONS[value.division]?.[value.district] ?? [] : [];
  return <div className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-3">
      <Field label="Division" error={errors.division}><Select value={value.division} disabled={disabled} options={DIVISIONS} placeholder="Select division" onChange={(v) => onChange({ division: v, district: "", upazila: "" })} /></Field>
      <Field label="District (Zilla)" error={errors.district}><Select value={value.district} disabled={disabled || !value.division} options={districts} placeholder={value.division ? "Select district" : "Select division first"} onChange={(v) => onChange({ district: v, upazila: "" })} /></Field>
      <Field label="Upazila / Thana" error={errors.upazila}><Select value={value.upazila} disabled={disabled || !value.district} options={upazilas} placeholder={value.district ? "Select upazila" : "Select district first"} onChange={(v) => onChange({ upazila: v })} /></Field>
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Union / Ward" error={errors.union_name} hint="e.g. Gokul Union or Ward 5"><Input disabled={disabled} value={value.union_name} maxLength={100} onChange={(e) => onChange({ union_name: e.target.value })} /></Field>
      <Field label="Village / Area" error={errors.village} hint="e.g. Malotinagar"><Input disabled={disabled} value={value.village} maxLength={120} onChange={(e) => onChange({ village: e.target.value })} /></Field>
    </div>
    <Field label="House, Road / Para (optional)" error={errors.address_line} hint="e.g. House 12, Road 3"><Input disabled={disabled} value={value.address_line} maxLength={300} onChange={(e) => onChange({ address_line: e.target.value })} /></Field>
  </div>;
}
