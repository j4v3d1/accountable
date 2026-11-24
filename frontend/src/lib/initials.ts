/** Light brand tints for avatar circles, all readable with Midnight text. */
export const AVATAR_TINTS = ["#D0E8F0", "#FDE3D9", "#FFEDC2", "#C8F5E8"] as const;

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
