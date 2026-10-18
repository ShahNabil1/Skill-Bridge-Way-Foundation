import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { parseVisitorReport, visitorProperty, visitorReportRequest, type VisitorReport } from "./ga-report";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_cloud_platform";
const metadataSchema = z.object({ metadata: z.object({ timeZone: z.string().min(1) }) });

export const getVisitorReport = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<VisitorReport> => {
  setResponseHeader("Cache-Control", "private, no-store");
  const { data: allowed, error } = await context.supabase.rpc("has_permission", { _user_id: context.userId, _perm: "dashboard.view" });
  if (error || !allowed) throw new Error("You don't have permission to view visitor analytics.");
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_CLOUD_PLATFORM_API_KEY"];
  const unavailable = (message: string, providerStatus?: number): VisitorReport => ({ status: "unavailable", message, checkedAt: new Date().toISOString(), ...(providerStatus === undefined ? {} : { providerStatus }) });
  if (!gatewayKey || !connectionKey) return unavailable("Google Analytics reporting access is not configured. Tracking alone cannot provide visitor reports.");
  let providerStatus: number | undefined;
  let providerReason = "";
  async function request(path: string, body?: object): Promise<unknown> {
    const response = await fetch(`${GATEWAY_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": connectionKey ?? "", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      providerStatus = response.status;
      const text = await response.text();
      // Keep only non-sensitive provider diagnostics; credentials never enter logs or UI.
      try {
        const parsed = JSON.parse(text) as { error?: { details?: { reason?: string }[] }; type?: string };
        providerReason = parsed.error?.details?.find((d) => d.reason)?.reason ?? parsed.type ?? "";
      } catch { providerReason = "INVALID_RESPONSE"; }
      console.error("GA4 reporting failed", { status: providerStatus, reason: providerReason });
      throw new Error("Google reporting request failed");
    }
    return response.json();
  }
  try {
    // Property-level Viewer access needs no account or stream discovery.
    const response = await request(`/analyticsdata/v1beta/${visitorProperty}:runReport`, visitorReportRequest());
    const result = parseVisitorReport(response);
    const { metadata } = metadataSchema.parse(response);
    return { status: "ready", ...result, fetchedAt: new Date().toISOString(), timeZone: metadata.timeZone, propertyName: visitorProperty, propertyId: visitorProperty.split("/")[1] ?? "" };
  } catch {
    if (providerReason === "SERVICE_DISABLED") return unavailable("Enable Google Analytics Data API in the connected Google Cloud project, then refresh.", providerStatus);
    if (providerReason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") return unavailable("A workspace admin must enable Google Analytics read-only access in this connection's Additional Google APIs settings.", providerStatus);
    if (providerStatus === 401 || providerStatus === 403) return unavailable("Google reporting access was denied. Check the connection and grant its service account Viewer access to this GA4 property.", providerStatus);
    if (providerStatus === 429) return unavailable("Google's reporting quota is temporarily exhausted. Please try again later.", providerStatus);
    return unavailable("Google Analytics could not return a verified report. No visitor counts are shown. Try refreshing later.", providerStatus);
  }
});