import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft } from "lucide-react";
import { getCuentasAhorro, getMovimientosCuenta } from "../api/endpoints";
import { Card, Spinner, ErrorBanner, EmptyState, StatusBadge } from "../components/ui";
import { formatMoney, formatDateTime } from "../utils/format";

export default function AhorrosPage() {
  const [cuentas, setCuentas] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);

  useEffect(() => {
    let active = true;
    getCuentasAhorro()
      .then((data) => active && setCuentas(data))
      .catch((err) => active && setError(err.response?.data?.detail || "No se pudieron cargar tus cuentas."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const verMovimientos = async (cuenta) => {
    setSeleccionada(cuenta);
    setLoadingMov(true);
    setMovimientos(null);
    try {
      const data = await getMovimientosCuenta(cuenta.nro);
      setMovimientos(data);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudieron cargar los movimientos.");
    } finally {
      setLoadingMov(false);
    }
  };

  if (loading) return <Spinner label="Cargando tus cuentas de ahorro…" />;

  // Vista de detalle de movimientos
  if (seleccionada) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setSeleccionada(null)}
          className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
        >
          <ChevronLeft size={16} /> Volver a mis cuentas
        </button>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {seleccionada.tipo}
            </span>
            <StatusBadge status={seleccionada.estado} />
          </div>
          <p className="text-3xl font-bold text-ink-900">
            {formatMoney(seleccionada.saldo, seleccionada.moneda)}
          </p>
          <p className="text-sm text-ink-400 mt-1">Cuenta {seleccionada.nro}</p>
        </Card>

        <div>
          <h2 className="text-lg font-bold text-ink-900 mb-3">Movimientos recientes</h2>
          {loadingMov ? (
            <Spinner label="Cargando movimientos…" />
          ) : !movimientos || movimientos.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="Esta cuenta todavía no registra movimientos."
            />
          ) : (
            <Card className="divide-y divide-ink-900/5">
              {movimientos.map((m) => {
                const esIngreso = m.tipo_egreso_ingreso === "I";
                return (
                  <div key={m.pkoperacion} className="flex items-center gap-4 p-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        esIngreso ? "bg-success-50 text-success-600" : "bg-danger-50 text-danger-600"
                      }`}
                    >
                      {esIngreso ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-900 text-sm truncate">{m.concepto}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {formatDateTime(m.fecha)} · {m.canal || "—"}
                      </p>
                      {m.glosa && <p className="text-xs text-ink-400 mt-0.5 truncate">{m.glosa}</p>}
                    </div>
                    <p
                      className={`font-bold text-sm shrink-0 ${
                        esIngreso ? "text-success-600" : "text-danger-600"
                      }`}
                    >
                      {esIngreso ? "+" : "-"}
                      {formatMoney(m.monto)}
                    </p>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Vista de lista de cuentas
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Cuentas de Ahorro</h1>
        <p className="text-ink-400 text-sm mt-1">
          Selecciona una cuenta para ver sus movimientos.
        </p>
      </div>

      <ErrorBanner message={error} />

      {!cuentas || cuentas.length === 0 ? (
        <EmptyState
          title="No tienes cuentas de ahorro"
          description="Cuando abras una cuenta de ahorro con Caja Paita, aparecerá aquí."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuentas.map((c) => (
            <button
              key={c.pkcuentaahorro}
              onClick={() => verMovimientos(c)}
              className="text-left"
            >
              <Card className="p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {c.tipo}
                  </span>
                  <StatusBadge status={c.estado} />
                </div>
                <p className="text-2xl font-bold text-ink-900">{formatMoney(c.saldo, c.moneda)}</p>
                <p className="text-sm text-ink-400 mt-1">{c.nro}</p>
                <p className="text-xs text-ink-400 mt-3">
                  Abierta el {new Date(c.fechaapertura).toLocaleDateString("es-PE")}
                </p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
