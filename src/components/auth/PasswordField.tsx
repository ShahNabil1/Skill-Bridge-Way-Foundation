import { useState } from "react";
import type { ReactNode } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  strength?: boolean;
  trailingAction?: ReactNode;
};

export function PasswordField({ id, label, value, onChange, autoComplete, required, strength = false, trailingAction }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const rules = [
    { label: "6–72 characters", valid: value.length >= 6 && value.length <= 72 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(value) },
    { label: "Lowercase letter", valid: /[a-z]/.test(value) },
    { label: "Number", valid: /\d/.test(value) },
    { label: "Symbol", valid: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = rules.filter((rule) => rule.valid).length;
  const status = score === 5 ? "Strong" : score >= 3 ? "Getting there" : "Needs work";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2"><Label htmlFor={id}>{label}</Label>{trailingAction}</div>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} required={required}
          value={value} onChange={(event) => onChange(event.target.value)} className="pr-12" aria-describedby={strength ? `${id}-strength` : undefined} />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((previous) => !previous)} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} title={`${visible ? "Hide" : "Show"} password`}>
          <Eye aria-hidden="true" className={`absolute transition-all duration-200 motion-reduce:transition-none ${visible ? "scale-75 rotate-45 opacity-0" : "scale-100 rotate-0 opacity-100"}`} />
          <EyeOff aria-hidden="true" className={`absolute transition-all duration-200 motion-reduce:transition-none ${visible ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-45 opacity-0"}`} />
        </Button>
      </div>
      {strength && (
        <div id={`${id}-strength`} className="space-y-2 pt-1" aria-live="polite">
          <div className="flex items-center gap-1" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={5} aria-valuenow={score} aria-valuetext={value ? status : "No password entered"}>
            {rules.map((rule, index) => (
              <span key={rule.label} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none ${score > index ? score === 5 ? "bg-primary" : "bg-highlight" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{value ? status : "Password requirements"}</p>
          <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule.label} className={`flex items-center gap-1.5 transition-colors duration-300 motion-reduce:transition-none ${rule.valid ? "text-primary" : "text-muted-foreground"}`}>
                <Check aria-hidden="true" className={`h-3.5 w-3.5 transition-opacity duration-300 motion-reduce:transition-none ${rule.valid ? "opacity-100" : "opacity-30"}`} />
                {rule.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}