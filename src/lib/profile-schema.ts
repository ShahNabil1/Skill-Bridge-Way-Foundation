import { z } from "zod";
import { englishName, englishText } from "./form-input";
import { BD_LOCATIONS } from "./bd-locations";

export const emptyAddress = { division: "", district: "", upazila: "", union_name: "", village: "", address_line: "" };
const text = (max: number) => z.string().trim().max(max).regex(englishText, "Use English characters only");
export const profileAddressSchema = z.object({
  division: text(100).min(1, "Select your division"),
  district: text(100).min(1, "Select your district"),
  upazila: text(100).min(1, "Select your upazila / thana"),
  union_name: text(100).min(2, "Enter your union / ward"),
  village: text(120).min(2, "Enter your village / area"),
  address_line: text(300),
}).superRefine((v, ctx) => {
  if (!BD_LOCATIONS[v.division]) ctx.addIssue({ code: "custom", path: ["division"], message: "Select a valid division" });
  else if (!BD_LOCATIONS[v.division]?.[v.district]) ctx.addIssue({ code: "custom", path: ["district"], message: "Select a district in your division" });
  else if (!BD_LOCATIONS[v.division]?.[v.district]?.includes(v.upazila)) ctx.addIssue({ code: "custom", path: ["upazila"], message: "Select an upazila in your district" });
});
export const profileInfoSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(60).regex(englishName, "Use English letters for your name"),
  last_name: z.string().trim().min(1, "Enter your last name").max(59).regex(englishName, "Use English letters for your name"),
  phone: z.string().trim().regex(/^01[3-9][0-9]{8}$/, "Use an 11-digit Bangladesh number starting 013–019"),
  address: profileAddressSchema,
});
export type ProfileInfo = z.infer<typeof profileInfoSchema>;
export function strictPhoneInput(raw: string) {
  return { value: raw.replace(/[^0-9]/g, "").slice(0, 11), warning: /[^0-9]/.test(raw) };
}
export function readProfileInfo(profile: { full_name?: string | null; phone?: string | null; address?: string | null }): ProfileInfo {
  const [first_name = "", ...last] = (profile.full_name ?? "").trim().split(/\s+/);
  let address = { ...emptyAddress, address_line: profile.address ?? "" };
  try {
    const parsed: unknown = JSON.parse(profile.address ?? "");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      address = Object.fromEntries(Object.keys(emptyAddress).map((key) => [key, typeof obj[key] === "string" ? obj[key] : ""])) as typeof emptyAddress;
    }
  } catch { /* Legacy plain-text addresses stay visible and editable. */ }
  const phone = (profile.phone ?? "").replace(/^\+?88(?=01)/, "");
  return { first_name, last_name: last.join(" "), phone, address };
}
function canonical(info: ProfileInfo) {
  return JSON.stringify([info.first_name.trim(), info.last_name.trim(), info.phone.trim(), ...Object.keys(emptyAddress).map((key) => info.address[key as keyof typeof emptyAddress].trim())]);
}
export function profileHasChanges(a: ProfileInfo, b: ProfileInfo) { return canonical(a) !== canonical(b); }
export function formatProfileAddress(address: ProfileInfo["address"]) {
  return [address.address_line, address.village, address.union_name, address.upazila, address.district, address.division].filter(Boolean).join(", ");
}