import { describe, expect, it } from "vitest";
import { OFFICES } from "./site-info";

describe("Verified office postal addresses", () => {
  it("uses the owner's confirmed Bogura head office postcode", () => {
    expect(OFFICES[0].postalAddress.postalCode).toBe("5800");
    expect(OFFICES[0].postalAddress.addressCountry).toBe("BD");
  });
  it("lists the registered address & training center without inventing a postcode", () => {
    expect(OFFICES[1].label).toBe("Registered Address & Training Center");
    expect(OFFICES[1].postalAddress.addressLocality).toBe("Shahjahanpur, Bogura");
    expect(OFFICES[1].postalAddress.addressCountry).toBe("BD");
    expect(OFFICES[1].postalAddress).not.toHaveProperty("postalCode");
    expect(OFFICES).toHaveLength(2);
  });
});