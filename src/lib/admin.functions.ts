import { createServerFn } from "@tanstack/react-start";

/** Public: the Turnstile site key is not secret; it's stored in project secrets for easy rotation. */
export const getTurnstileSiteKey = createServerFn({ method: "GET" }).handler(async () => {
  return process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] ?? process.env["TURNSTILE_SITE_KEY"] ?? null;
});

