import { useEffect, useState, useCallback } from "react";
import { Search, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { getOperacionesAdmin } from "../../api/endpointsAdmin";
import { Card, Spinner, ErrorBanner, EmptyState } from "../../components/ui";
import { formatMoney, formatDateTime } from "../../utils/format";

export default function AdminOperacionesPage() {
  const [q, setQ] = useState("");
  const [operaciones, setOperaciones] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    getOperacionesAdmin({ q: q || undefined, limite: 100 })
      .then((data) => {
        setOperaciones(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err.response?.data?.detail || "No se pudieron cargar las operaciones."))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
  }, [cargar]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Operaciones</h1>
        <p className="text-ink-400 text-sm mt-1">
          {total} operación{total === 1 ? "" : "es"} registrada{total === 1 ? "" : "s"} en el sistema.
        </p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por código de operación o código de cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Cargando operaciones…" />
      ) : !operaciones || operaciones.length === 0 ? (
        <EmptyState title="No se encontraron operaciones" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Concepto</th>
                <th className="px-4 py-3 font-semibold">Canal</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Fecha y hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {operaciones.map((op) => (
                <tr key={op.pkoperacion}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">{op.codkardex}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{op.cliente || "—"}</p>
                    <p className="text-xs text-ink-400">{op.codcliente || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{op.concepto}</td>
                  <td className="px-4 py-3 text-ink-700">{op.canal || "—"}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        op.codtipoegresoingreso === "I" ? "text-success-600" : "text-danger-600"
                      }`}
                    >
                      {op.codtipoegresoingreso === "I" ? (
                        <ArrowDownCircle size={14} />
                      ) : (
                        <ArrowUpCircle size={14} />
                      )}
                      {formatMoney(op.montooperacion)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-400 text-xs">{formatDateTime(op.fechahora)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
