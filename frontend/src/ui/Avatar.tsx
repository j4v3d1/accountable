import { avatarFor } from "../lib/initials";
import "./ui.css";

interface Props {
  contactName?: string | null;
  organizationName?: string | null;
  size?: number;
}

/** Initials in a tinted circle: the contact's, else the organization's, else nothing (R20). */
export function Avatar({ contactName, organizationName, size = 32 }: Props) {
  const avatar = avatarFor(contactName, organizationName);
  if (!avatar) return null;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: avatar.tint, fontSize: Math.round(size * 0.34) }}
      title={avatar.name}
      aria-hidden="true"
    >
      {avatar.initials}
    </span>
  );
}
