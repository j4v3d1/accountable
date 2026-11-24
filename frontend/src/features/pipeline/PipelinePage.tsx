import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { DealFormDialog } from "../deals/DealDialogs";
import { useDeals, useStages } from "../deals/queries";
import type { StageKey } from "../deals/types";
import { Board } from "./PipelineBoard";
import "./pipeline.css";

export function PipelinePage() {
  const deals = useDeals();
  const stages = useStages();
  const [adding, setAdding] = useState<StageKey | null>(null);
  const openCount = deals.data?.filter((deal) => stages.data?.find((s) => s.key === deal.stage)?.open).length;

  return (
    <div className="page pipeline-page">
      <PageHeader
        eyebrow={openCount === undefined ? " " : `${openCount} open deals`}
        title="Pipeline"
        actions={
          <>
            <p className="drag-hint">
              Drag cards, or use <kbd>Space</kbd> and the arrow keys
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setAdding("new_lead")}>
              <Plus size={16} aria-hidden="true" />
              New deal
            </button>
          </>
        }
      />
      {deals.isPending || stages.isPending ? (
        <LoadingState label="Loading the pipeline..." />
      ) : deals.isError || stages.isError ? (
        <ErrorState message={(deals.error ?? stages.error)!.message} onRetry={() => deals.refetch()} />
      ) : (
        <Board deals={deals.data} stages={stages.data} onAdd={setAdding} />
      )}
      {adding && <DealFormDialog open onOpenChange={() => setAdding(null)} defaultStage={adding} />}
    </div>
  );
}
