import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../api/client";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { LogActivityDialog } from "../activities/LogActivityDialog";
import { DealFormDialog } from "../deals/DealDialogs";
import { PipelineStrip } from "../pipeline/PipelineStrip";
import { FigureCards } from "./FigureCards";
import { FollowUps } from "./FollowUps";
import { Funnel } from "./Funnel";
import { RecentActivity } from "./RecentActivity";
import { RevenuePanel } from "./RevenuePanel";
import { SummaryLine } from "./SummaryLine";
import type { Dashboard } from "./types";
import { WonLostChart } from "./WonLostChart";
import "./dashboard.css";

/** Every figure comes from the backend; any change elsewhere refreshes this query (R38). */
export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard") });
}

export function DashboardPage() {
  const dashboard = useDashboard();
  const [logging, setLogging] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);

  if (dashboard.isPending) return <div className="page"><LoadingState label="Loading the dashboard..." /></div>;
  if (dashboard.isError) {
    return (
      <div className="page">
        <ErrorState message={dashboard.error.message} onRetry={() => dashboard.refetch()} />
      </div>
    );
  }
  const data = dashboard.data;
  const today = parseISO(data.today);

  return (
    <div className="dashboard">
      <div className="page dashboard-main">
        <PageHeader
          eyebrow={format(today, "EEEE, MMMM d")}
          title="Dashboard"
          lede={<SummaryLine summary={data.summary} />}
          actions={
            <>
              <button type="button" className="btn btn-quiet" onClick={() => setLogging(true)}>
                <FileText size={16} aria-hidden="true" />
                Log activity
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setAddingDeal(true)}>
                <Plus size={16} aria-hidden="true" />
                New deal
              </button>
            </>
          }
        />
        <div className="dash-row1">
          <RevenuePanel revenue={data.revenue} monthName={format(today, "MMMM")} />
          <FigureCards data={data} />
        </div>
        <div className="dash-row2">
          <Funnel funnel={data.funnel} />
          <WonLostChart months={data.revenue.months} won={data.deals_won} />
        </div>
        <section className="panel dash-box" aria-label="Pipeline by stage">
          <Link to="/pipeline" className="strip-link" aria-label="Open the pipeline">
            <span className="panel-head">
              <span className="section-title">Open pipeline</span>
              <span className="strip-link-text">
                Open the pipeline <ArrowRight size={14} aria-hidden="true" />
              </span>
            </span>
            <PipelineStrip segments={data.open_pipeline.stages} variant="legend" />
          </Link>
        </section>
      </div>
      <aside className="dashboard-side">
        <FollowUps followUps={data.follow_ups} />
        <RecentActivity activities={data.recent_activity} />
      </aside>
      {logging && <LogActivityDialog open onOpenChange={setLogging} />}
      {addingDeal && <DealFormDialog open onOpenChange={setAddingDeal} />}
    </div>
  );
}
