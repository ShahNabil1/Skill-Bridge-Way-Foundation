import { describe, expect, it } from "vitest";
import { parseVisitorReport, visitorProperty, visitorRanges, visitorReportRequest } from "./ga-report";

const report = (values: string[]) => ({ dimensionHeaders: [{ name: "dateRange" }], metricHeaders: [{ name: "totalUsers" }], rows: values.map((value, index) => ({ dimensionValues: [{ value: visitorRanges[index]?.key }], metricValues: [{ value }] })) });
describe("verified visitor reporting", () => {
  it("queries the authorized property and requests genuine zero rows", () => {
    expect(visitorProperty).toBe("properties/555969434");
    expect(visitorReportRequest()).toEqual({
      dateRanges: [
        { name: "today", startDate: "today", endDate: "today" },
        { name: "week", startDate: "7daysAgo", endDate: "yesterday" },
        { name: "month", startDate: "30daysAgo", endDate: "yesterday" },
        { name: "total", startDate: "2015-08-14", endDate: "today" },
      ], metrics: [{ name: "totalUsers" }], keepEmptyRows: true,
    });
  });
  it("orders Google's verified property response including today's zero", () => {
    expect(parseVisitorReport({ dimensionHeaders: [{ name: "dateRange" }], metricHeaders: [{ name: "totalUsers" }], rows: [
      { dimensionValues: [{ value: "month" }], metricValues: [{ value: "85" }] },
      { dimensionValues: [{ value: "total" }], metricValues: [{ value: "85" }] },
      { dimensionValues: [{ value: "week" }], metricValues: [{ value: "36" }] },
      { dimensionValues: [{ value: "today" }], metricValues: [{ value: "0" }] },
    ] }).counts).toEqual([0, 36, 85, 85]);
  });
  it("preserves Google's per-period counts without summing periods", () => {
    expect(parseVisitorReport(report(["979", "15438", "42917", "946293"])).counts).toEqual([979, 15438, 42917, 946293]);
  });
  it("does not turn an incomplete provider response into zero", () => {
    expect(() => parseVisitorReport(report(["979"]))).toThrow("Incomplete");
  });
  it("rejects invalid provider counts rather than inventing a number", () => {
    expect(() => parseVisitorReport(report(["invalid", "1", "2", "3"]))).toThrow();
  });
  it("accepts zeros only from a valid empty report", () => {
    expect(parseVisitorReport({ metricHeaders: [{ name: "totalUsers" }] }).counts).toEqual([0, 0, 0, 0]);
    expect(() => parseVisitorReport({})).toThrow();
  });
  it("exposes Google's thresholding warning", () => {
    expect(parseVisitorReport({ ...report(["1", "2", "3", "4"]), metadata: { subjectToThresholding: true } }).limited).toBe(true);
  });
});