export const OFFICES = [
  { label: "Head Office", address: "SP Banglo Lane, Malotinagar, Bogura Sadar" },
  { label: "Training Center", address: "Infront of Sajahanpur Upzilla Parishad, Sajapur, Bogura" },
  { label: "UK Office", address: "London, United Kingdom" },
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
