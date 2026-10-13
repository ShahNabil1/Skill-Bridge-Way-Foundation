export const OFFICES = [
  {
    label: "Head Office", address: "SP Banglo Lane, Malotinagar, Bogura Sadar",
    postalAddress: { "@type": "PostalAddress", streetAddress: "SP Banglo Lane, Malotinagar, Bogura Sadar", addressLocality: "Bogura", addressRegion: "Rajshahi", postalCode: "5800", addressCountry: "BD" },
  },
  {
    label: "Registered Address & Training Center", address: "Sahjapur (Opposite the Upzilla Livestock Office) Mazhira, Shahjahanpur, Bogura, Bangladesh",
    postalAddress: { "@type": "PostalAddress", streetAddress: "Sahjapur (Opposite the Upzilla Livestock Office), Mazhira", addressLocality: "Shahjahanpur, Bogura", addressRegion: "Rajshahi", addressCountry: "BD" },
  },
] as const;

export const CONTACT_EMAIL = "info@skillbridgeway.org";

export const CONTACT_WHATSAPP_NUMBER = "8801717224952";

/** Opens a WhatsApp chat to the foundation's number, with an optional prefilled message. */
export const whatsappChatLink = (text?: string) =>
  text
    ? `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${CONTACT_WHATSAPP_NUMBER}`;

export const SOCIAL_LINKS = [
  { name: "Facebook", href: "https://www.facebook.com/share/19MfQGX43q/" },
  { name: "Instagram", href: "https://www.instagram.com/skillbridgeway2026?stkn=MTk1ZTB5OWlwMHlqOA==" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/skill-bridgeway-foundation/" },
] as const;
