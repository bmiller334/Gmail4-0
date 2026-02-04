export const EMAIL_CATEGORIES = [
  "Important",
  "Personal",
  "Work",
  "Finance",
  "Marketing",
  "Social",
  "Updates",
  "Spam",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];
