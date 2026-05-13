"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastCtx {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const dismiss = (id: number) => setToasts(p => p.filter(t => t.id !== id));

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = Date.now() + counter++;
    setToasts(p => [...p, { id, kind, title, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, []);

  const success = useCallback((t: string, m?: string) => toast("success", t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast("error",   t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast("warning", t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast("info",    t, m), [toast]);

  const icons: Record<ToastKind, React.ReactNode> = {
    success: <CheckCircle size={15} className="text-[var(--success)]" />,
    error:   <XCircle    size={15} className="text-[var(--danger)]" />,
    warning: <AlertTriangle size={15} className="text-[var(--warning)]" />,
    info:    <Info       size={15} className="text-[var(--info)]" />,
  };
  const borders: Record<ToastKind, string> = {
    success: "border-l-[var(--success)]",
    error:   "border-l-[var(--danger)]",
    warning: "border-l-[var(--warning)]",
    info:    "border-l-[var(--info)]",
  };

  return (
    <Ctx.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 bg-white border border-[var(--border)] border-l-4 ${borders[t.kind]} rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-[360px] animate-in slide-in-from-right-5 duration-200`}
          >
            <div className="mt-0.5 flex-shrink-0">{icons[t.kind]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">{t.title}</div>
              {t.message && <div className="text-[12px] text-[var(--ink-3)] mt-0.5">{t.message}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-[var(--ink-5)] hover:text-[var(--ink-3)] flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
