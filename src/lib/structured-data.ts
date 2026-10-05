import { SITE_URL } from "@/components/site/PageHero";
import { CONTACT_EMAIL, OFFICES, SOCIAL_LINKS } from "@/lib/site-info";

const ORG_ID = `${SITE_URL}/#organization`;

/** Site-wide organization entity — helps Google, Bing and AI answer engines identify the foundation. */
export const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": ["NGO", "EducationalOrganization"],
  "@id": ORG_ID,
  name: "Skill Bridgeway Foundation",
  alternateName: "SBF",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicon.png`,
  email: CONTACT_EMAIL,
  telephone: "+8801717224952",
  description:
    "RJSC-registered non-profit in Bangladesh providing free, practical AI literacy, digital, freelancing and entrepreneurship skills training for rural youth, madrasah students and underserved communities.",
  nonprofitStatus: "Nonprofit",
  areaServed: { "@type": "Country", name: "Bangladesh" },
  knowsAbout: ["Artificial intelligence literacy", "Digital skills", "Freelancing", "Digital marketing", "Entrepreneurship", "Web development"],
  address: {
    "@type": "PostalAddress",
    streetAddress: OFFICES[0].address,
    addressLocality: "Bogura",
    addressCountry: "BD",
  },
  location: OFFICES.map((o) => ({ "@type": "Place", name: o.label, address: o.address })),
  contactPoint: [
    { "@type": "ContactPoint", contactType: "admissions", email: "admission@skillbridgeway.org", availableLanguage: ["en", "bn"] },
    { "@type": "ContactPoint", contactType: "customer support", email: CONTACT_EMAIL, telephone: "+8801717224952", availableLanguage: ["en", "bn"] },
  ],
  founder: { "@type": "Person", name: "Md Saiful Azam", jobTitle: "Chairman" },
  employee: [{ "@type": "Person", name: "Md. Ziaul Haque Manik", jobTitle: "Executive Director (Operations)" }],
  sameAs: SOCIAL_LINKS.map((s) => s.href.split("?")[0]),
};

export const HOME_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Skill Bridgeway Foundation",
  url: `${SITE_URL}/`,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
};

/** BreadcrumbList for nested pages (e.g. Courses › Course name). */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE_URL + it.path })),
  };
}
