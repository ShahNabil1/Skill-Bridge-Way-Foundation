import { z } from "zod";

export const ENGLISH_WARNING = "English characters only are supported.";
export const DIGIT_WARNING = "Use English digits only.";
export const printableEnglish = /^[\x20-\x7E]*$/;
export const englishText = /^[A-Za-z0-9\s.,'’/#()&+\-]*$/;
export const englishName = /^[A-Za-z][A-Za-z .'-]*$/;
export const emailSchema = z.string().trim().email("Enter a valid email address").max(255).regex(printableEnglish, ENGLISH_WARNING);

export function asciiOnly(value: string) { return value.replace(/[^\x20-\x7E]/g, ""); }
export function englishOnly(value: string) { return value.replace(/[^A-Za-z0-9\s.,'’/#()&+\-]/g, ""); }
export function asciiDigits(value: string) {
  return value.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09E6))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0))
    .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xFF10));
}
export function digitsOnly(value: string) { return asciiDigits(value).replace(/[^0-9]/g, ""); }