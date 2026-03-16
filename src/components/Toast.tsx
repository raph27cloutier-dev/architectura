'use client';

import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useStore } from '../store';
import { ToastItem } from '../types/plan';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { text: 'text-[#34d399]', bar: 'bg-[#34d399]', border: 'border-[#34d399]/20', bg: 'bg-[#34d399]/5' },
  warning: { text: 'text-[#fbbf24]', bar: 'bg-[#fbbf24]', border: 'border-[#fbbf24]/20', bg: 'bg-[#fbbf24]/5' },
  error:   { text: 'text-[#f87171]', bar: 'bg-[#f87171]', border: 'border-[#f87171]/20', bg: 'bg-[#f87171]/5' },
  info:    { text: 'text-[#60a5fa]', bar: 'bg-[#60a5fa]', border: 'border-[#60a5fa]/20', bg: 'bg-[#60a5fa]/5' },
};

function Toast({ toast }: { toast: ToastItem }) {
  const dismissToast = useStore(state => state.dismissToast);
  const duration = toast.duration ?? 3000;
  const Icon = ICONS[toast.type];
  const colors = COLORS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, dismissToast]);

  return (
    <div
      className={`relative overflow-hidden glass-panel border ${colors.border} ${colors.bg} rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/30 pointer-events-auto min-w-[220px] max-w-xs`}
      style={{ animation: 'slideInRight 0.25s ease-out forwards' }}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${colors.text}`} />
      <span className="text-sm text-[#e6edf3] leading-snug">{toast.message}</span>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${colors.bar}`}
        style={{ animation: `toastProgress ${duration}ms linear forwards` }}
      />
    </div>
  );
}

export function ToastContainer() {
  const toasts = useStore(state => state.toasts);
  const visible = toasts.slice(-3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {visible.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
