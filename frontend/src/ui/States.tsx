import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import "./ui.css";

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <LoaderCircle size={20} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <TriangleAlert size={20} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-quiet" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message, action }: { message: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <span>{message}</span>
      {action}
    </div>
  );
}
