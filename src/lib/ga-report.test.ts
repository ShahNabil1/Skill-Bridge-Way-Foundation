import { describe, expect, it } from "vitest";
import { parseVisitorReport, visitorRanges } from "./ga-report";

const report = (values: string[]) => ({ dimensionHeaders: [{ name: "dateRange" }], metricHeaders: [{ name: "totalUsers" }], rows: values.map((value, index) => ({ dimensionValues: [{ value: visitorRanges[index]?.key }], metricValues: [{ value }] })) });
describe("verified visitor reporting", () => {
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