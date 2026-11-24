import type { Contact } from "../contacts/types";
import type { Deal } from "../deals/types";

export const INDUSTRIES = [
  "Brokerage",
  "Mortgage lending",
  "Development",
  "Property management",
  "Relocation",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export interface Organization {
  id: number;
  name: string;
  website: string | null;
  industry: Industry | null;
  notes: string | null;
  contact_count: number;
  open_deal_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: Deal[];
}

export interface OrganizationInput {
  name: string;
  website: string | null;
  industry: Industry | null;
  notes: string | null;
}

export interface OrganizationImpact {
  contacts: number;
  deals: number;
}
