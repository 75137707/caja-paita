import { useEffect, useState } from "react";
import { ChevronLeft, CheckCircle2, Printer } from "lucide-react";
import {
  getCuentasCredito,
  getCuotasCredito,
  getCuentasAhorro,
  pagarCuota,
} from "../api/endpoints";
import { Card, Spinner, ErrorBanner, EmptyState, StatusBadge } from "../components/ui";
import { formatMoney, formatDate, formatDateTime } from "../utils/format";
import Logo from "../components/Logo";

export default function CreditosPage() {
  const [creditos, setCreditos] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cuotas, setCuotas] = useState(null);
  const [cuentasAhorro, setCuentasAhorro] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [cuentaPagoSeleccionada, setCuentaPagoSeleccionada] = useState("");
  const [resultadoPago, setResultadoPago] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getCuentasCredito(), getCuentasAhorro()])
      .then(([cred, ahorros]) => {
        if (!active) return;
        setCreditos(cred);
        setCuentasAhorro(ahorros.filter((a) => a.estado === "ACTIVA"));
      })
      .catch(
        (err) => active && setError(err.response?.data?.detail || "No se pudieron cargar tus créditos.")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const verCuotas = async (credito) => {
    setSeleccionado(credito);
    setLoadingCuotas(true);
    setCuotas(null);
    setResultadoPago(null);
    try {
      const data = await getCuotasCredito(credito.cuenta);
      setCuotas(data);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo cargar el cronograma de cuotas.");
    } finally {
      setLoadingCuotas(false);
    }
  };

  const proximaCuotaPendiente = (cuotas || []).find((c) =>
    ["PENDIENTE", "VENCIDA", "PARCIAL"].includes(c.estado)
  );

  const handlePagar = async () => {
    if (!cuentaPagoSeleccionada || !seleccionado) return;
    setPagando(true);
    setError(null);
    try {
      const data = await pagarCuota({
        pkcuentacredito: seleccionado.pkcuentacredito,
        pkcuentaahorro_origen: Number(cuentaPagoSeleccionada),
        canal: "WEB",
      });
      setResultadoPago(data);
      const data2 = await getCuotasCredito(seleccionado.cuenta);
      setCuotas(data2);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo procesar el pago.");
    } finally {
      setPagando(false);
    }
  };

  if (loading) return <Spinner label="Cargando tus créditos…" />;

  // Vista detalle: cronograma + pago
  if (seleccionado) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setSeleccionado(null)}
          className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
        >
          <ChevronLeft size={16} /> Volver a mis créditos
        </button>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {seleccionado.producto}
            </span>
            <StatusBadge status={seleccionado.estado} />
          </div>
          <p className="text-3xl font-bold text-ink-900">
            {formatMoney(seleccionado.pago_pendiente, seleccionado.moneda)}
          </p>
          <p className="text-sm text-ink-400 mt-1">
            Pago pendiente · Cuenta {seleccionado.cuenta}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-ink-900/5">
            <div>
              <p className="text-xs text-ink-400">Saldo de capital</p>
              <p className="font-semibold text-ink-900">
                {formatMoney(seleccionado.saldo_capital, seleccionado.moneda)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-400">Desembolsado el</p>
              <p className="font-semibold text-ink-900">
                {formatDate(seleccionado.fecha_desembolso)}
              </p>
            </div>
          </div>
        </Card>

        <ErrorBanner message={error} />

        {/* Pago de cuota */}
        {resultadoPago ? (
          <Card className="overflow-hidden" id="comprobante-pago">
            <div className="bg-navy-900 px-6 py-6 flex items-center justify-between">
              <Logo variant="light" size="sm" />
              <div className="text-right">
                <p className="text-white/60 text-xs">Comprobante de pago</p>
                <p className="text-white text-xs font-mono">{resultadoPago.codkardex}</p>
              </div>
            </div>
            <div className="px-6 py-8 text-center border-b border-ink-900/5">
              <div className="w-14 h-14 rounded-full bg-success-50 text-success-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 size={26} />
              </div>
              <p className="text-ink-400 text-sm">Pagaste la cuota #{resultadoPago.nrocuota}</p>
              <p className="text-3xl font-bold text-ink-900 mt-1">
                {formatMoney(resultadoPago.monto_pagado)}
              </p>
              <p className="text-success-600 text-sm font-semibold mt-1">
                {resultadoPago.mensaje}
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-ink-400 shrink-0">Crédito</span>
                <span className="text-ink-900 font-medium text-right">{seleccionado.cuenta}</span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-ink-400 shrink-0">Fecha y hora</span>
                <span className="text-ink-900 font-medium text-right">
                  {formatDateTime(new Date().toISOString())}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-ink-400 shrink-0">Saldo restante en cuenta</span>
                <span className="text-ink-900 font-medium text-right">
                  {formatMoney(resultadoPago.saldo_restante_cuenta)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-ink-400 shrink-0">Código de operación</span>
                <span className="text-ink-900 font-medium text-right font-mono text-xs">
                  {resultadoPago.codkardex}
                </span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-white border border-ink-900/10 text-ink-700 font-semibold py-2.5 rounded-lg hover:bg-ink-900/5 transition-colors text-sm"
              >
                <Printer size={16} /> Imprimir comprobante
              </button>
            </div>
          </Card>
        ) : proximaCuotaPendiente ? (
          <Card className="p-6">
            <h3 className="font-bold text-ink-900 mb-1">Pagar próxima cuota</h3>
            <p className="text-sm text-ink-400 mb-4">
              Cuota #{proximaCuotaPendiente.nro} · Monto:{" "}
              <span className="font-semibold text-ink-900">
                {formatMoney(proximaCuotaPendiente.monto_cuota)}
              </span>{" "}
              · Vence {formatDate(proximaCuotaPendiente.vencimiento)}
            </p>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Pagar desde la cuenta de ahorro
            </label>
            <select
              value={cuentaPagoSeleccionada}
              onChange={(e) => setCuentaPagoSeleccionada(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 mb-4"
            >
              <option value="">Selecciona una cuenta…</option>
              {(cuentasAhorro || []).map((c) => (
                <option key={c.pkcuentaahorro} value={c.pkcuentaahorro}>
                  {c.nro} — {formatMoney(c.saldo, c.moneda)}
                </option>
              ))}
            </select>
            <button
              onClick={handlePagar}
              disabled={!cuentaPagoSeleccionada || pagando}
              className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {pagando ? "Procesando pago…" : "Pagar cuota"}
            </button>
          </Card>
        ) : null}

        {/* Cronograma */}
        <div>
          <h2 className="text-lg font-bold text-ink-900 mb-3">Cronograma de cuotas</h2>
          {loadingCuotas ? (
            <Spinner label="Cargando cronograma…" />
          ) : !cuotas || cuotas.length === 0 ? (
            <EmptyState title="Sin cuotas registradas" />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                    <th className="px-4 py-3 font-semibold">N°</th>
                    <th className="px-4 py-3 font-semibold">Vencimiento</th>
                    <th className="px-4 py-3 font-semibold">Cuota</th>
                    <th className="px-4 py-3 font-semibold">Días mora</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5">
                  {cuotas.map((c) => (
                    <tr key={c.pkplanpago}>
                      <td className="px-4 py-3 font-semibold text-ink-900">{c.nro}</td>
                      <td className="px-4 py-3 text-ink-700">{formatDate(c.vencimiento)}</td>
                      <td className="px-4 py-3 font-semibold text-ink-900">
                        {formatMoney(c.monto_cuota)}
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        {c.dias_mora > 0 ? c.dias_mora : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Vista lista de créditos
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Mis Créditos</h1>
        <p className="text-ink-400 text-sm mt-1">
          Selecciona un crédito para ver el cronograma y pagar tu próxima cuota.
        </p>
      </div>

      <ErrorBanner message={error} />

      {!creditos || creditos.length === 0 ? (
        <EmptyState
          title="No tienes créditos activos"
          description="Si solicitas un crédito con Caja Paita, lo verás reflejado aquí."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditos.map((c) => (
            <button key={c.pkcuentacredito} onClick={() => verCuotas(c)} className="text-left">
              <Card className="p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {c.producto}
                  </span>
                  <StatusBadge status={c.estado} />
                </div>
                <p className="text-2xl font-bold text-ink-900">
                  {formatMoney(c.pago_pendiente, c.moneda)}
                </p>
                <p className="text-sm text-ink-400 mt-1">Pago pendiente · {c.cuenta}</p>
                <p className="text-xs text-ink-400 mt-3">
                  Desembolsado el {formatDate(c.fecha_desembolso)}
                </p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
