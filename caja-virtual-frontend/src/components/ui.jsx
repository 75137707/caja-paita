import { AlertCircle, Loader2, Inbox } from "lucide-react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl2 shadow-card border border-ink-900/5 ${className}`}>
      {children}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    ACTIVA: { bg: "bg-success-50", text: "text-success-600", label: "Activa" },
    VIGENTE: { bg: "bg-success-50", text: "text-success-600", label: "Vigente" },
    PAGADA: { bg: "bg-success-50", text: "text-success-600", label: "Pagada" },
    BLOQUEADA: { bg: "bg-danger-50", text: "text-danger-600", label: "Bloqueada" },
    VENCIDA: { bg: "bg-danger-50", text: "text-danger-600", label: "Vencida" },
    CANCELADO: { bg: "bg-ink-900/5", text: "text-ink-400", label: "Cancelado" },
    CANCELADA: { bg: "bg-ink-900/5", text: "text-ink-400", label: "Cancelada" },
    CASTIGADO: { bg: "bg-danger-50", text: "text-danger-600", label: "Castigado" },
    PENDIENTE: { bg: "bg-accent-50", text: "text-accent-600", label: "Pendiente" },
    PARCIAL: { bg: "bg-accent-50", text: "text-accent-600", label: "Pago parcial" },
    // Estados de solicitud de crédito (panel admin)
    "En Evaluación": { bg: "bg-accent-50", text: "text-accent-600", label: "En Evaluación" },
    "En Evaluacion": { bg: "bg-accent-50", text: "text-accent-600", label: "En Evaluación" },
    Aprobado: { bg: "bg-success-50", text: "text-success-600", label: "Aprobado" },
    Rechazado: { bg: "bg-danger-50", text: "text-danger-600", label: "Rechazado" },
    Desembolsado: { bg: "bg-navy-50", text: "text-navy-700", label: "Desembolsado" },
  };
  const cfg = map[status] || { bg: "bg-ink-900/5", text: "text-ink-700", label: status };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

export function Spinner({ label = "Cargando…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-400">
      <Loader2 className="animate-spin" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 bg-danger-50 text-danger-600 px-4 py-3 rounded-lg border border-danger-600/15 text-sm">
      <AlertCircle size={18} className="shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Inbox size={32} className="text-ink-400 mb-3" />
      <p className="font-semibold text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-400 mt-1 max-w-sm">{description}</p>}
    </Card>
  );
}
