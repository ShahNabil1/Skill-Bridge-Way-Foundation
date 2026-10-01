import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ENGLISH_WARNING, DIGIT_WARNING, asciiOnly, asciiDigits, digitsOnly, englishOnly } from "@/lib/form-input";

type Props = {
  id: string; value: string; onChange: (value: string) => void;
  mode?: "ascii" | "english" | "digits" | "phone";
  type?: "text" | "email" | "tel"; required?: boolean; maxLength?: number;
  autoComplete?: string; multiline?: boolean; rows?: number; placeholder?: string;
};

export function ValidatedField({ id, value, onChange, mode = "english", type = "text", required, maxLength, autoComplete, multiline, rows, placeholder }: Props) {
  const [warning, setWarning] = useState(false);
  const [caps, setCaps] = useState(false);
  const clean = (raw: string) => mode === "digits" || mode === "phone" ? digitsOnly(raw) : mode === "ascii" ? asciiOnly(raw) : englishOnly(raw);
  const handleChange = (raw: string) => {
    const normalized = clean(raw);
    setWarning(normalized !== raw);
    onChange(normalized);
  };
  const common = { id, value, required, maxLength, placeholder, "aria-describedby": warning ? `${id}-warning` : undefined,
    onKeyDown: (event: React.KeyboardEvent) => setCaps(event.getModifierState("CapsLock")),
    onKeyUp: (event: React.KeyboardEvent) => setCaps(event.getModifierState("CapsLock")),
    onBlur: () => setCaps(false),
  };
  return <div className="space-y-1.5">
    {multiline ? <Textarea {...common} rows={rows} onChange={(e) => handleChange(e.target.value)} /> :
      <Input {...common} type={type} autoComplete={autoComplete} inputMode={mode === "digits" || mode === "phone" ? "numeric" : undefined} onChange={(e) => handleChange(e.target.value)} />}
    {warning && <p id={`${id}-warning`} role="status" className="flex items-center gap-1.5 text-xs text-highlight"><AlertCircle className="h-3.5 w-3.5" />{mode === "digits" || mode === "phone" ? DIGIT_WARNING : ENGLISH_WARNING}</p>}
    {caps && <p role="status" className="text-xs text-highlight">Caps Lock is on</p>}
  </div>;
}