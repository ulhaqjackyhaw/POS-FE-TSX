import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
      const id = `${Date.now()}_${Math.random()}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />,
            error: <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />,
            warning: <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />,
            info: <Info className="w-6 h-6 text-sky-600 shrink-0" />,
          }[t.type];

          const bgClasses = {
            success: 'bg-white border-2 border-emerald-300 shadow-emerald-950/10',
            error: 'bg-white border-2 border-rose-300 shadow-rose-950/10',
            warning: 'bg-white border-2 border-amber-300 shadow-amber-950/10',
            info: 'bg-white border-2 border-sky-300 shadow-sky-950/10',
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3.5 p-5 rounded-2xl border shadow-2xl ${bgClasses} text-slate-900 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
            >
              {icons}
              <div className="flex-1 min-w-0">
                {t.title && <h4 className="text-base font-extrabold text-slate-900">{t.title}</h4>}
                <p className="text-sm font-semibold text-slate-700 mt-0.5 leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
