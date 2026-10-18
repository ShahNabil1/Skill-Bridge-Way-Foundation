import { z } from "zod";

export const visitorRanges = [
  { key: "today", label: "Today", startDate: "today", endDate: "today", note: "Today · property time zone" },
  { key: "week", label: "Last Week", startDate: "7daysAgo", endDate: "yesterday", note: "Previous 7 complete days" },
  { key: "month", label: "Last Month", startDate: "30daysAgo", endDate: "yesterday", note: "Previous 30 complete days" },
  { key: "total", label: "Total", startDate: "2015-08-14", endDate: "today", note: "Available GA4 history" },
] as const;

const reportSchema = z.object({
  dimensionHeaders: z.array(z.object({ name: z.string() })).optional(),
  metricHeaders: z.array(z.object({ name: z.string() })),
  rows: z.array(z.object({
    dimensionValues: z.array(z.object({ value: z.string() })).optional(),
    metricValues: z.array(z.object({ value: z.string().regex(/^\d+$/) })),
  })).optional(),
  metadata: z.object({ subjectToThresholding: z.boolean().optional(), samplingMetadatas: z.array(z.unknown()).optional() }).optional(),
});

/** Each range is deduplicated by Google; never add daily unique-user totals. */
export function parseVisitorReport(input: unknown): { counts: number[]; limited: boolean } {
  const report = reportSchema.parse(input);
  if (report.metricHeaders.length !== 1 || report.metricHeaders[0]?.name !== "totalUsers") throw new Error("Unexpected GA4 metric");
  const rows = report.rows ?? [];
  if (rows.length === 0) return { counts: [0, 0, 0, 0], limited: false };
  const rangeIndex = report.dimensionHeaders?.findIndex((h) => h.name === "dateRange") ?? -1;
  if (rangeIndex < 0) throw new Error("Missing GA4 date ranges");
  const counts: (number | null)[] = [null, null, null, null];
  for (const row of rows) {
    const key = row.dimensionValues?.[rangeIndex]?.value;
    const index = visitorRanges.findIndex((range) => range.key === key);
    const value = Number(row.metricValues[0]?.value);
    if (index < 0 || counts[index] !== null || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid GA4 count");
    counts[index] = value;
  }
  if (counts.some((count) => count === null)) throw new Error("Incomplete GA4 report");
  return { counts: counts.map((count) => Number(count)), limited: !!report.metadata?.subjectToThresholding || !!report.metadata?.samplingMetadatas?.length };
}

export type VisitorReport =
  | { status: "ready"; counts: number[]; limited: boolean; fetchedAt: string; timeZone: string; propertyName: string; propertyId: string }
  | { status: "unavailable"; message: string; checkedAt: string; providerStatus?: number };