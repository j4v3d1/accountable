/** Brand tints for avatar circles, readable with the ink color in both modes. */
export const AVATAR_TINTS = [
  "var(--avatar-cerulean)",
  "var(--avatar-coral)",
  "var(--avatar-marigold)",
  "var(--avatar-sea-green)",
] as const;

export function initials(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function tintFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/** The avatar for a deal or contact: the contact's initials, else the organization's, else none (R20). */
export function avatarFor(
  contactName: string | null | undefined,
  organizationName: string | null | undefined,
): { initials: string; tint: string; name: string } | null {
  const name = contactName || organizationName;
  if (!name) return null;
  return { initials: initials(name), tint: tintFor(name), name };
}

/**
 * A person's initials (R55): the first letters of the first and last words of their
 * name ("Maya Torres" is MT, "Cher" is C), or, for someone known only by their email,
 * the first two letters before the @ (jordan@example.com is JO).
 */
export function personInitials(name: string, email: string | null): string {
  if (email && name === email) return email.split("@")[0].slice(0, 2).toUpperCase();
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (words[0][0] + last).toUpperCase();
}
