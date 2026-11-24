import { ArrowRightLeft, FileText, Mail, Phone } from "lucide-react";
import type { ActivityType } from "./types";
import "./activities.css";

const ICONS = { note: FileText, call: Phone, email: Mail, stage_change: ArrowRightLeft };

export function ActivityIcon({ type }: { type: ActivityType }) {
  const Icon = ICONS[type];
  return (
    <span className={`activity-icon type-${type}`} aria-hidden="true">
      <Icon size={15} />
    </span>
  );
}
