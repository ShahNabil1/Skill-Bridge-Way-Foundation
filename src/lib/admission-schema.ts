import { z } from "zod";

const phone = z.string().trim().regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX)");

export const personalSchema = z.object({
  full_name: z.string().trim().min(3, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone,
  date_of_birth: z.string().min(1, "Select your date of birth").refine((d) => {
    const age = (Date.now() - new Date(d).getTime()) / 3.15576e10;
    return age >= 12 && age <= 80;
  }, "Age must be between 12 and 80"),
  gender: z.enum(["male", "female", "other"], { message: "Select gender" }),
  address: z.string().trim().min(5, "Enter your address").max(500),
});

export const educationSchema = z.object({
  education_level: z.string().min(1, "Select your education level"),
  institution: z.string().trim().min(2, "Enter your institution").max(200),
});

export const courseSchema = z.object({
  course_id: z.string().min(1, "Choose a course"),
  motivation: z.string().trim().min(20, "Tell us a bit more (at least 20 characters)").max(1500),
});

export type AdmissionForm = z.infer<typeof personalSchema> & z.infer<typeof educationSchema> & z.infer<typeof courseSchema>;

export const EDUCATION_LEVELS = ["SSC / Dakhil", "HSC / Alim", "Diploma", "Bachelor's (running)", "Bachelor's (completed)", "Master's", "Other"];

export const DOC_SLOTS = [
  { id: "photo", label: "Passport-size photo", required: true },
  { id: "nid", label: "NID / Birth certificate", required: true },
  { id: "certificate", label: "Latest academic certificate", required: false },
] as const;
export type DocSlot = (typeof DOC_SLOTS)[number]["id"];
