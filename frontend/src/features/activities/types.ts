export type ActivityType = "note" | "call" | "email" | "stage_change";

export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  contact_name: string | null;
  deal_id: number | null;
  deal_name: string | null;
  description: string;
  occurred_at: string;
  follow_up_date: string | null;
  done: boolean;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  updated_by_name: string;
}

export interface ActivityInput {
  type: Exclude<ActivityType, "stage_change">;
  description: string;
  occurred_at: string;
  follow_up_date: string | null;
  done: boolean;
  contact_id?: number | null;
  deal_id?: number | null;
}
