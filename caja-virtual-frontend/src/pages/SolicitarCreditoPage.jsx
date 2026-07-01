import { useMemo, useState } from "react";
import { CheckCircle2, Calculator } from "lucide-react";
import { solicitarCredito, PRODUCTOS_CREDITO } from "../api/endpoints";
import { Card, ErrorBanner } from "../components/ui";
import { formatMoney } from "../utils/format";

const PLAZOS = [6, 12, 18, 24, 36];

// Tasas referenciales (TEA) por producto, usadas únicamente para el simulador.
// La tasa real aplicada a cada crédito la define la evaluación crediticia.
const TASA_REFERENCIAL = {
  LIBREDISP: 0.35,
  EMPRESARIAL: 0.28,
  PESCA: 0.3,
  CRECEMUJER: 0.26,
  RAPIDITO: 0.4,
  AGROPECUARIO: 0.27,
};

function simularCuota(monto, plazoMeses, teaAnual) {
  if (!monto || !plazoMeses || !teaAnual) return null;
  const tasaMensual = Math.pow(1 + teaAnual, 1 / 12) - 1;
  const cuota = (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
  const totalPagar = cuota * plazoMeses;
  return { cuota, totalPagar, intereses: totalPagar - monto };
}

export default function SolicitarCreditoPage() {
  const [producto, setProducto] = useState("");
  const [monto, setMonto] = useState("");
  const [plazo, setPlazo] = useState(12);
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const simulacion = useMemo(() => {
    const tea = TASA_REFERENCIAL[producto];
    const montoNum = Number(monto);
    if (!tea || !montoNum || montoNum <= 0) return null;
    return simularCuota(montoNum, Number(plazo), tea);
  }, [producto, monto, plazo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResultado(null);

    if (!producto) {
      setError("Selecciona el tipo de crédito que deseas solicitar.");
      return;
    }
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresa un monto válido mayor a cero.");
      return;
    }

    setEnviando(true);
    try {
      const data = await solicitarCredito({
        codtipoproducto: producto,
        montosolicitado: montoNum,
        plazomeses: Number(plazo),
        canal: "WEB",
        observaciones: observaciones || undefined,
      });
      setResultado(data);
      setProducto("");
      setMonto("");
      setObservaciones("");
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo registrar tu solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Solicitar un crédito</h1>
        <p className="text-ink-400 text-sm mt-1">
          Completa el formulario y nuestro equipo evaluará tu solicitud.
        </p>
      </div>

      {resultado && (
        <Card className="p-6 flex items-start gap-3 bg-success-50 border-success-600/20">
          <CheckCircle2 className="text-success-600 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-success-600">{resultado.mensaje}</p>
            <p className="text-sm text-ink-700 mt-1">
              N° de solicitud: <span className="font-semibold">{resultado.codsolicitud}</span> ·
              Estado: {resultado.estado}
            </p>
          </div>
        </Card>
      )}

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Tipo de crédito
              </label>
              <select
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="">Selecciona un producto…</option>
                {PRODUCTOS_CREDITO.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Monto solicitado
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-semibold">
                  S/
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Plazo (meses)
              </label>
              <div className="flex gap-2 flex-wrap">
                {PLAZOS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPlazo(p)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      Number(plazo) === p
                        ? "bg-navy-900 text-white"
                        : "bg-white text-ink-700 border border-ink-900/10 hover:bg-ink-900/5"
                    }`}
                  >
                    {p} meses
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Observaciones <span className="text-ink-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                maxLength={255}
                rows={3}
                placeholder="Cuéntanos para qué necesitas el crédito"
                className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {enviando ? "Enviando solicitud…" : "Enviar solicitud"}
            </button>
          </form>
        </Card>

        {/* Simulador de cuota en tiempo real */}
        <Card className="p-6 bg-navy-900 text-white border-none lg:sticky lg:top-6">
          <h2 className="font-bold flex items-center gap-2 mb-1">
            <Calculator size={18} className="text-accent-500" /> Simulador de cuota
          </h2>
          <p className="text-xs text-white/50 mb-5">
            Estimado referencial según el producto, monto y plazo seleccionados.
          </p>

          {!simulacion ? (
            <div className="py-10 text-center">
              <p className="text-white/50 text-sm">
                Selecciona un producto e ingresa un monto para ver tu cuota estimada.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-white/50 text-xs">Cuota mensual estimada</p>
                <p className="text-4xl font-extrabold text-accent-500 mt-1">
                  {formatMoney(simulacion.cuota)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-white/50 text-xs">Total a pagar</p>
                  <p className="font-bold mt-0.5">{formatMoney(simulacion.totalPagar)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Intereses estimados</p>
                  <p className="font-bold mt-0.5">{formatMoney(simulacion.intereses)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">TEA referencial</p>
                  <p className="font-bold mt-0.5">
                    {(TASA_REFERENCIAL[producto] * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Plazo</p>
                  <p className="font-bold mt-0.5">{plazo} meses</p>
                </div>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed pt-2 border-t border-white/10">
                Este simulador es referencial y no constituye una oferta vinculante. La tasa y
                cuota final dependerán de la evaluación crediticia que realice Caja Paita.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
