import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Printer, Plus } from "lucide-react";
import { getCuentasAhorro, transferir } from "../api/endpoints";
import { Card, Spinner, ErrorBanner, EmptyState } from "../components/ui";
import { formatMoney, formatDateTime } from "../utils/format";
import Logo from "../components/Logo";

export default function TransferenciasPage() {
  const [cuentas, setCuentas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [detalleOperacion, setDetalleOperacion] = useState(null);

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [monto, setMonto] = useState("");
  const [glosa, setGlosa] = useState("");

  const cargarCuentas = () =>
    getCuentasAhorro().then((data) => setCuentas(data.filter((c) => c.estado === "ACTIVA")));

  useEffect(() => {
    let active = true;
    cargarCuentas()
      .catch((err) => active && setError(err.response?.data?.detail || "No se pudieron cargar tus cuentas."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const cuentasDestino = (cuentas || []).filter((c) => String(c.pkcuentaahorro) !== origen);
  const cuentaOrigenInfo = (cuentas || []).find((c) => String(c.pkcuentaahorro) === origen);
  const cuentaDestinoInfo = (cuentas || []).find((c) => String(c.pkcuentaahorro) === destino);
  const excedeSaldo =
    cuentaOrigenInfo && Number(monto) > 0 && Number(monto) > Number(cuentaOrigenInfo.saldo);

  const resetForm = () => {
    setOrigen("");
    setDestino("");
    setMonto("");
    setGlosa("");
    setResultado(null);
    setDetalleOperacion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!origen || !destino) {
      setError("Selecciona la cuenta origen y destino.");
      return;
    }
    if (origen === destino) {
      setError("La cuenta origen y destino no pueden ser la misma.");
      return;
    }
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresa un monto válido mayor a cero.");
      return;
    }
    if (cuentaOrigenInfo && montoNum > Number(cuentaOrigenInfo.saldo)) {
      setError("El monto supera tu saldo disponible en la cuenta origen.");
      return;
    }

    setEnviando(true);
    try {
      const data = await transferir({
        pkcuentaahorro_origen: Number(origen),
        pkcuentaahorro_destino: Number(destino),
        monto: montoNum,
        glosa: glosa || undefined,
        canal: "WEB",
      });
      setDetalleOperacion({
        cuentaOrigen: cuentaOrigenInfo,
        cuentaDestino: cuentaDestinoInfo,
        monto: montoNum,
        glosa,
        fecha: new Date().toISOString(),
      });
      setResultado(data);
      await cargarCuentas();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo procesar la transferencia.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <Spinner label="Cargando tus cuentas…" />;

  if (!cuentas || cuentas.length < 2) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Transferir entre mis cuentas</h1>
        </div>
        <EmptyState
          title="Necesitas al menos 2 cuentas de ahorro activas"
          description="Para transferir entre cuentas propias, debes tener dos o más cuentas de ahorro activas en Caja Paita."
        />
      </div>
    );
  }

  if (resultado && detalleOperacion) {
    return (
      <div className="space-y-5 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Transferencia exitosa</h1>
        </div>

        <Card className="overflow-hidden print:shadow-none" id="comprobante">
          <div className="bg-navy-900 px-6 py-6 flex items-center justify-between">
            <Logo variant="light" size="sm" />
            <div className="text-right">
              <p className="text-white/60 text-xs">Comprobante de operación</p>
              <p className="text-white text-xs font-mono">{resultado.codkardex_debito}</p>
            </div>
          </div>

          <div className="px-6 py-8 text-center border-b border-ink-900/5">
            <div className="w-14 h-14 rounded-full bg-success-50 text-success-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 size={26} />
            </div>
            <p className="text-ink-400 text-sm">Transferiste</p>
            <p className="text-3xl font-bold text-ink-900 mt-1">
              {formatMoney(detalleOperacion.monto, detalleOperacion.cuentaOrigen?.moneda)}
            </p>
            <p className="text-success-600 text-sm font-semibold mt-1">{resultado.mensaje}</p>
          </div>

          <div className="p-6 space-y-3">
            <Row label="Cuenta origen" value={detalleOperacion.cuentaOrigen?.nro} />
            <Row label="Nuevo saldo origen" value={formatMoney(resultado.saldo_origen)} />
            <Row label="Cuenta destino" value={detalleOperacion.cuentaDestino?.nro} />
            <Row label="Nuevo saldo destino" value={formatMoney(resultado.saldo_destino)} />
            <Row label="Fecha y hora" value={formatDateTime(detalleOperacion.fecha)} />
            {detalleOperacion.glosa && <Row label="Glosa" value={detalleOperacion.glosa} />}
            <Row label="Código de operación" value={resultado.codkardex_debito} mono />
          </div>
        </Card>

        <div className="flex gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-ink-900/10 text-ink-700 font-semibold py-2.5 rounded-lg hover:bg-ink-900/5 transition-colors text-sm"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={resetForm}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} /> Nueva transferencia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Transferir entre mis cuentas</h1>
        <p className="text-ink-400 text-sm mt-1">
          Mueve dinero entre tus propias cuentas de ahorro al instante.
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Cuenta origen
            </label>
            <select
              value={origen}
              onChange={(e) => {
                setOrigen(e.target.value);
                if (e.target.value === destino) setDestino("");
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            >
              <option value="">Selecciona una cuenta…</option>
              {cuentas.map((c) => (
                <option key={c.pkcuentaahorro} value={c.pkcuentaahorro}>
                  {c.nro} — {c.tipo} — {formatMoney(c.saldo, c.moneda)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center text-ink-400">
            <ArrowRight size={18} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Cuenta destino
            </label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              disabled={!origen}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 disabled:opacity-50"
            >
              <option value="">Selecciona una cuenta…</option>
              {cuentasDestino.map((c) => (
                <option key={c.pkcuentaahorro} value={c.pkcuentaahorro}>
                  {c.nro} — {c.tipo} — {formatMoney(c.saldo, c.moneda)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-700">Monto</label>
              {cuentaOrigenInfo && (
                <span className="text-xs text-ink-400">
                  Disponible: {formatMoney(cuentaOrigenInfo.saldo, cuentaOrigenInfo.moneda)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-semibold">
                {cuentaOrigenInfo?.moneda === "USD" ? "$" : "S/"}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:border-accent-500 focus:ring-accent-500 ${
                  excedeSaldo ? "border-danger-600/60" : "border-ink-900/10"
                }`}
              />
            </div>
            {excedeSaldo && (
              <p className="text-xs mt-1.5 text-danger-600">
                El monto supera tu saldo disponible en la cuenta origen.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Glosa <span className="text-ink-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={glosa}
              onChange={(e) => setGlosa(e.target.value)}
              placeholder="Ej. Ahorro mensual"
              maxLength={120}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>

          <button
            type="submit"
            disabled={enviando || excedeSaldo}
            className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {enviando ? "Procesando…" : "Transferir"}
          </button>
        </form>
      </Card>
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
