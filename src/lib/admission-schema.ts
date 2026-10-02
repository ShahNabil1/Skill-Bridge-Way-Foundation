import { z } from "zod";

/** Local 11-digit Bangladeshi mobile number (the +88 prefix is shown separately). */
const phone = z.string().trim().regex(/^01[3-9]\d{8}$/, "Enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)");

export const personalSchema = z.object({
  full_name: z.string().trim().min(3, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone,
  date_of_birth: z.string().min(1, "Select your date of birth").refine((d) => {
    const age = (Date.now() - new Date(d).getTime()) / 3.15576e10;
    return age >= 12 && age <= 80;
  }, "Age must be between 12 and 80"),
  gender: z.enum(["male", "female", "other"], { message: "Select gender" }),
  division: z.string().min(1, "Select your division"),
  district: z.string().min(1, "Select your district"),
  upazila: z.string().min(1, "Select your upazila / thana"),
  address_line: z.string().trim().min(3, "Enter village / area, house & road").max(300),
  post_office: z.string().trim().min(2, "Enter your post office").max(100),
  postal_code: z.string().trim().regex(/^\d{4}$/, "Post code must be 4 digits"),
});

export const educationSchema = z.object({
  education_level: z.string().min(1, "Select your education level"),
  institution: z.string().trim().min(2, "Enter your institution").max(200),
  education_board: z.string().min(1, "Select board / university type"),
  education_group: z.string().trim().max(100),
  education_result: z.string().trim().max(50),
  passing_year: z.string().max(4),
  session: z.string().trim().max(20),
}).superRefine((v, ctx) => {
  const running = /running/i.test(v.education_level);
  if (running && !/^\d{4}[-–]\d{2,4}$/.test(v.session)) ctx.addIssue({ code: "custom", path: ["session"], message: "Enter your session (e.g. 2023-24)" });
  if (!running && !v.passing_year) ctx.addIssue({ code: "custom", path: ["passing_year"], message: "Select passing year" });
  if (!running && !v.education_result) ctx.addIssue({ code: "custom", path: ["education_result"], message: "Enter your result (e.g. GPA 4.50)" });
});

export const courseSchema = z.object({
  course_id: z.string().min(1, "Choose a course"),
  motivation: z.string().trim().min(20, "Tell us a bit more (at least 20 characters)").max(1500),
});

export type AdmissionForm = z.infer<typeof personalSchema> & z.infer<typeof educationSchema> & z.infer<typeof courseSchema>;

export const EDUCATION_LEVELS = ["JSC / JDC", "SSC / Dakhil / Equivalent", "HSC / Alim / Equivalent", "Diploma (running)", "Diploma (completed)", "Bachelor's / Fazil (running)", "Bachelor's / Fazil (completed)", "Master's / Kamil (running)", "Master's / Kamil (completed)", "Other"];
export const EDUCATION_BOARDS = ["Dhaka", "Rajshahi", "Cumilla", "Jashore", "Chattogram", "Barishal", "Sylhet", "Dinajpur", "Mymensingh", "Madrasah", "Technical", "National University", "Public University", "Private University", "Open University", "Other"];
export const EDUCATION_GROUPS = ["Science", "Business Studies", "Humanities", "General", "Vocational", "Computer Science", "Engineering", "Arts", "Commerce", "Other"];
const now = new Date().getFullYear();
export const PASSING_YEARS = Array.from({ length: now - 1979 }, (_, i) => String(now - i));

export const DOC_SLOTS = [
  { id: "photo", label: "Passport-size photo", required: true },
  { id: "nid", label: "NID / Birth certificate", required: true },
  { id: "certificate", label: "Latest academic certificate", required: false },
] as const;
export type DocSlot = (typeof DOC_SLOTS)[number]["id"];
