import type { Activity } from "../activities/types";

export type StageKey = "new_lead" | "qualified" | "showing" | "offer" | "under_contract" | "closed_won" | "lost";

export interface Stage {
  key: StageKey;
  label: string;
  probability: number;
  open: boolean;
}

export interface Deal {
  id: number;
  name: string;
  contact_id: number | null;
  contact_name: string | null;
  organization_id: number | null;
  organization_name: string | null;
  stage: StageKey;
  value: number;
  probability: number;
  expected_value: number;
  close_date: string;
  position: number;
  notes: string | null;
  late: boolean;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  updated_by_name: string;
}

export interface DealDetail extends Deal {
  contact: { id: number; name: string } | null;
  organization: { id: number; name: string } | null;
  timeline: Activity[];
}

export interface DealInput {
  name: string;
  contact_id: number | null;
  organization_id: number | null;
  stage: StageKey;
  value: number;
  probability: number;
  close_date: string;
  notes: string | null;
}

export interface DealImpact {
  activities: number;
}
