import { describe, it, expect } from "vitest";
import { profileInfoSchema, readProfileInfo, profileHasChanges, strictPhoneInput, emptyAddress } from "./profile-schema";
import { BD_LOCATIONS } from "./bd-locations";

const division = Object.keys(BD_LOCATIONS)[0] ?? "";
const district = Object.keys(BD_LOCATIONS[division] ?? {})[0] ?? "";
const upazila = BD_LOCATIONS[division]?.[district]?.[0] ?? "";
const info = { first_name: "Ziaul", last_name: "Manik", phone: "01712345678", address: { ...emptyAddress, division, district, upazila, union_name: "Ward 5", village: "Gokul" } };
describe("Profile requirements", () => {
  it("accepts all 013–019 prefixes with exactly 11 digits", () => {
    for (const prefix of ["013", "014", "015", "016", "017", "018", "019"]) expect(profileInfoSchema.safeParse({ ...info, phone: `${prefix}12345678` }).success).toBe(true);
    for (const phone of ["01212345678", "01112345678", "0171234567", "017123456789", "+8801712345678"]) expect(profileInfoSchema.safeParse({ ...info, phone }).success).toBe(false);
  });
  it("rejects other-script digits instead of converting them", () => {
    expect(strictPhoneInput("০১৭")).toEqual({ value: "", warning: true });
    expect(strictPhoneInput("017ab١২")).toEqual({ value: "017", warning: true });
    expect(strictPhoneInput("01712345678")).toEqual({ value: "01712345678", warning: false });
  });
  it("requires separate first and last names", () => {
    expect(profileInfoSchema.safeParse({ ...info, first_name: "" }).success).toBe(false);
    expect(profileInfoSchema.safeParse({ ...info, last_name: "" }).success).toBe(false);
  });
  it("requires admission-style address with union and village", () => {
    expect(profileInfoSchema.safeParse({ ...info, address: { ...info.address, union_name: "" } }).success).toBe(false);
    expect(profileInfoSchema.safeParse({ ...info, address: { ...info.address, village: "" } }).success).toBe(false);
    expect(profileInfoSchema.safeParse({ ...info, address: { ...info.address, district: "Invalid district" } }).success).toBe(false);
  });
  it("disables unchanged and reverted edits", () => {
    expect(profileHasChanges(info, { ...info })).toBe(false);
    expect(profileHasChanges(info, { ...info, first_name: "Manik" })).toBe(true);
    expect(profileHasChanges(info, { ...info, first_name: "Ziaul " })).toBe(false);
  });
  it("reads saved structured addresses and preserves legacy ones", () => {
    expect(readProfileInfo({ full_name: "Ziaul Manik", phone: "+8801712345678", address: JSON.stringify(info.address) })).toEqual(info);
    expect(readProfileInfo({ address: "Bogura" }).address.address_line).toBe("Bogura");
  });
});