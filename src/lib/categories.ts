export const EMAIL_CATEGORIES = [
  "[Action Required]",
  "Finance",
  "Manual Sort",
  "Marketing",
  "Newsletter",
  "Promotions",
  "Security Alerts",
  "Social",
  "Updates",
  "Work"
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];
