import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search, Receipt } from "lucide-react";
import { getMovimientosConsolidados } from "../api/endpoints";
import { Card, Spinner, ErrorBanner, EmptyState } from "../components/ui";
import { formatMoney, formatDateTime } from "../utils/format";

const FILTROS = [
  { key: "TODOS", label: "Todos" },
  { key: "I", label: "Ingresos" },
  { key: "E", label: "Egresos" },
];

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    let active = true;
    getMovimientosConsolidados()
      .then((data) => active && setMovimientos(data))
      .catch(
        (err) => active && setError(err.response?.data?.detail || "No se pudo cargar tu historial.")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    if (!movimientos) return [];
    return movimientos.filter((m) => {
      const pasaFiltro = filtro === "TODOS" || m.tipo_egreso_ingreso === filtro;
      const texto = busqueda.trim().toLowerCase();
      const pasaBusqueda =
        !texto ||
        m.concepto?.toLowerCase().includes(texto) ||
        m.glosa?.toLowerCase().includes(texto) ||
        m.codkardex?.toLowerCase().includes(texto) ||
        m.cuenta?.toLowerCase().includes(texto);
      return pasaFiltro && pasaBusqueda;
    });
  }, [movimientos, filtro, busqueda]);

  const totalIngresos = (movimientos || [])
    .filter((m) => m.tipo_egreso_ingreso === "I")
    .reduce((sum, m) => sum + Number(m.monto), 0);
  const totalEgresos = (movimientos || [])
    .filter((m) => m.tipo_egreso_ingreso === "E")
    .reduce((sum, m) => sum + Number(m.monto), 0);

  if (loading) return <Spinner label="Cargando tu historial de transacciones…" />;

  if (seleccionado) {
    const esIngreso = seleccionado.tipo_egreso_ingreso === "I";
    return (
      <div className="space-y-5 max-w-lg">
        <button
          onClick={() => setSeleccionado(null)}
          className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
        >
          ← Volver al historial
        </button>

        <Card className="overflow-hidden">
          <div className="bg-navy-900 px-6 py-8 text-center">
            <div
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 ${
                esIngreso ? "bg-success-50 text-success-600" : "bg-white/10 text-white"
              }`}
            >
              {esIngreso ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
            </div>
            <p className="text-white/70 text-sm">{esIngreso ? "Ingreso" : "Egreso"}</p>
            <p
              className={`text-3xl font-bold mt-1 ${
                esIngreso ? "text-success-500" : "text-white"
              }`}
            >
              {esIngreso ? "+" : "-"}
              {formatMoney(seleccionado.monto)}
            </p>
          </div>
          <div className="p-6 space-y-3">
            <Row label="Concepto" value={seleccionado.concepto} />
            <Row label="Tipo de operación" value={seleccionado.tipooperacion} />
            <Row label="Cuenta" value={seleccionado.cuenta || "—"} />
            <Row label="Fecha" value={formatDateTime(seleccionado.fecha)} />
            <Row label="Canal" value={seleccionado.canal || "—"} />
            <Row label="Código de operación" value={seleccionado.codkardex} mono />
            {seleccionado.glosa && <Row label="Glosa" value={seleccionado.glosa} />}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Movimientos</h1>
        <p className="text-ink-400 text-sm mt-1">
          Historial consolidado de transacciones de todas tus cuentas de ahorro.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm text-ink-400">Total ingresos</p>
          <p className="text-xl font-bold text-success-600 mt-1">{formatMoney(totalIngresos)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-400">Total egresos</p>
          <p className="text-xl font-bold text-danger-600 mt-1">{formatMoney(totalEgresos)}</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por concepto, cuenta o código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
        <div className="flex gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                filtro === f.key
                  ? "bg-navy-900 text-white"
                  : "bg-white text-ink-700 border border-ink-900/10 hover:bg-ink-900/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          title="No se encontraron movimientos"
          description="Ajusta los filtros o el término de búsqueda."
        />
      ) : (
        <Card className="divide-y divide-ink-900/5">
          {filtrados.map((m) => {
            const esIngreso = m.tipo_egreso_ingreso === "I";
            return (
              <button
                key={m.pkoperacion}
                onClick={() => setSeleccionado(m)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-ink-900/[0.02] transition-colors"
              >
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
                    {formatDateTime(m.fecha)} · {m.cuenta} · {m.canal || "—"}
                  </p>
                </div>
                <p
                  className={`font-bold text-sm shrink-0 ${
                    esIngreso ? "text-success-600" : "text-danger-600"
                  }`}
                >
                  {esIngreso ? "+" : "-"}
                  {formatMoney(m.monto)}
                </p>
                <Receipt size={15} className="text-ink-400 shrink-0" />
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink-400 shrink-0">{label}</span>
      <span className={`text-ink-900 font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
