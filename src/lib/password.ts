import { z } from "zod";
import { printableEnglish, ENGLISH_WARNING } from "@/lib/form-input";

export const strongPassword = z
  .string()
  .min(6, "Use at least 6 characters")
  .max(72, "Too long")
  .regex(printableEnglish, ENGLISH_WARNING)
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number")
  .regex(/[^A-Za-z0-9\s]/, "Add a symbol");

/** Returns the first problem with a new password, or null if it's acceptable. */
export function checkNewPassword(pw: string, confirm: string, current?: string) {
  const r = strongPassword.safeParse(pw);
  if (!r.success) return r.error.issues[0]?.message ?? "Weak password";
  if (pw !== confirm) return "Passwords do not match";
  if (current !== undefined && pw === current) return "New password must differ from the current one";
  return null;
}
