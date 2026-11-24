import type { Activity } from "../activities/types";
import type { Deal } from "../deals/types";

export const STATUSES = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "customer", label: "Customer" },
] as const;

export type ContactStatus = (typeof STATUSES)[number]["key"];

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  organization_name: string | null;
  status: ContactStatus;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactDetail extends Contact {
  organization: { id: number; name: string } | null;
  deals: Deal[];
  timeline: Activity[];
}

export interface ContactInput {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  status: ContactStatus;
}

export interface ContactImpact {
  deals: number;
  activities: number;
}
