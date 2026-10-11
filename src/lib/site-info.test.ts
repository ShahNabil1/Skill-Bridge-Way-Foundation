import { describe, expect, it } from "vitest";
import { OFFICES } from "./site-info";

describe("Verified office postal addresses", () => {
  it("uses the owner's confirmed Bogura head office postcode", () => {
    expect(OFFICES[0].postalAddress.postalCode).toBe("5800");
    expect(OFFICES[0].postalAddress.addressCountry).toBe("BD");
  });
  it("does not invent a postcode or street for the London office", () => {
    expect(OFFICES[2].postalAddress.addressLocality).toBe("London");
    expect(OFFICES[2].postalAddress.addressCountry).toBe("GB");
    expect(OFFICES[2].postalAddress).not.toHaveProperty("postalCode");
    expect(OFFICES[2].postalAddress).not.toHaveProperty("streetAddress");
  });
});