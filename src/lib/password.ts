import { z } from "zod";

export const strongPassword = z
  .string()
  .min(6, "Use at least 6 characters")
  .max(72, "Too long")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

/** Returns the first problem with a new password, or null if it's acceptable. */
export function checkNewPassword(pw: string, confirm: string, current?: string) {
  const r = strongPassword.safeParse(pw);
  if (!r.success) return r.error.issues[0]?.message ?? "Weak password";
  if (pw !== confirm) return "Passwords do not match";
  if (current !== undefined && pw === current) return "New password must differ from the current one";
  return null;
}
