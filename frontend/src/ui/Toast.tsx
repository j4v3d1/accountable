import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import "./ui.css";

type Tone = "success" | "error";
type Notify = (message: string, tone?: Tone) => void;

const ToastContext = createContext<Notify>(() => {});

/** Short confirmations ("Deal saved") and error messages, in the corner of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: Tone }[]>([]);

  const notify = useCallback<Notify>((message, tone = "success") => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), message, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            className={`toast toast-${toast.tone}`}
            type={toast.tone === "error" ? "foreground" : "background"}
            duration={toast.tone === "error" ? 7000 : 3500}
            onOpenChange={(open) => {
              if (!open) setToasts((current) => current.filter((t) => t.id !== toast.id));
            }}
          >
            <RadixToast.Title className="toast-title">{toast.message}</RadixToast.Title>
            <RadixToast.Close className="icon-button" aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  return useContext(ToastContext);
}
