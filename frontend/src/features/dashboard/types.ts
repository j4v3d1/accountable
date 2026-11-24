import type { Activity } from "../activities/types";
import type { StageKey } from "../deals/types";

export interface DashboardSummary {
  open_deals: number;
  open_value: number;
  overdue_follow_ups: number;
  late_deals: number;
}

export interface MonthFigures {
  month: string;
  label: string;
  won_value: number;
  won_count: number;
  lost_count: number;
}

export interface StageFigure {
  key: StageKey;
  label: string;
  value: number;
  count: number;
}

export interface Dashboard {
  today: string;
  summary: DashboardSummary;
  revenue: {
    this_month: number;
    last_month: number;
    last_month_label: string;
    change_percent: number | null;
    six_month_total: number;
    best_month: { month: string; label: string; value: number } | null;
    months: MonthFigures[];
  };
  open_pipeline: { count: number; value: number; expected: number; expected_share: number; stages: StageFigure[] };
  deals_won: { this_month: number; last_month: number; won_6m: number; lost_6m: number; win_rate: number | null };
  funnel: (StageFigure & { share_from_previous: number | null })[];
  follow_ups: { overdue: Activity[]; this_week: Activity[]; later: Activity[] };
  recent_activity: Activity[];
}
