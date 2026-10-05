export type PartnerTier = "platinum" | "gold" | "silver" | "partner";

export const PARTNER_TIERS: { id: PartnerTier; label: string; students: number | null; summary: string; perks: string[] }[] = [
  { id: "platinum", label: "Platinum Partner", students: 50, summary: "Title sponsorship", perks: ["Title sponsorship of a program cohort", "Prominent logo on website, certificates & events", "Full scholarships for 50 students"] },
  { id: "gold", label: "Gold Partner", students: 20, summary: "Website + social media", perks: ["Logo placement on our website", "Social media recognition", "Scholarships for 20 students"] },
  { id: "silver", label: "Silver Partner", students: 5, summary: "Website recognition", perks: ["Name & logo on our website", "Scholarships for 5 students"] },
  { id: "partner", label: "Partner", students: null, summary: "Academic, technology, media or corporate collaboration", perks: [] },
];

export const tierLabel = (t: string) => PARTNER_TIERS.find((x) => x.id === t)?.label ?? "Partner";
export const PARTNER_TYPE_OPTIONS = ["Academic", "Technology", "Media", "Corporate", "Donor"] as const;
