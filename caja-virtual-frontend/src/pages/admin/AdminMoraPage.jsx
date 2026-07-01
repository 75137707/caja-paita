import { useCallback, useEffect, useState } from "react";
import {
  Phone,
  X,
  ShieldAlert,
  Gavel,
  Skull,
  Clock,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getMoraDashboard,
  registrarGestionCobranza,
  getHistorialGestiones,
  transicionarEstadoCobranza,
  CANALES_CONTACTO,
  RESULTADOS_GESTION,
} from "../../api/endpointsAdmin";
import { Card, Spinner, ErrorBanner, EmptyState } from "../../components/ui";
import { formatMoney, formatDate, formatDateTime } from "../../utils/format";
import { useAdminAuth } from "../../context/AdminAuthContext";

const BANDA_COLOR = {
  PREVENTIVA: "#A93333",
  TEMPRANA: "#7A1F1F",
  TARDIA: "#C2790B",
  JUDICIAL: "#7C3AED",
  CASTIGO: "#C23B3B",
};

const BANDA_LABEL = {
  PREVENTIVA: "Preventiva (1-30d)",
  TEMPRANA: "Temprana (31-60d)",
  TARDIA: "Tardía (61-90d)",
  JUDICIAL: "Judicial (91-180d)",
  CASTIGO: "Castigo (>180d)",
};

export default function AdminMoraPage() {
  const { admin } = useAdminAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bandaFiltro, setBandaFiltro] = useState(null);
  const [q, setQ] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  const puedeTransicionar = admin?.rol === "JEFE_RIESGOS";

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    getMoraDashboard({ banda: bandaFiltro, q: q || undefined, limite: 100 })
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || "No se pudo cargar la cartera morosa."))
      .finally(() => setLoading(false));
  }, [bandaFiltro, q]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 0);
    return () => clearTimeout(timeout);
  }, [cargar]);

  if (loading && !data) return <Spinner label="Cargando cartera morosa…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const datosBarras = data.kpis_por_banda.map((k) => ({
    banda: BANDA_LABEL[k.banda_mora] || k.banda_mora,
    codigo: k.banda_mora,
    nro: k.nro_creditos,
    monto: Number(k.monto_pendiente),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Recuperaciones / Mora</h1>
        <p className="text-ink-400 text-sm mt-1">
          Cartera en mora por banda, gestiones de cobranza y transición a Judicial/Castigo.
        </p>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-ink-400">Créditos en mora</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{data.total_creditos_en_mora}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-400">Monto pendiente total</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">
            {formatMoney(data.total_monto_pendiente)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-400">% de mora sobre cartera vigente</p>
          <p className="text-2xl font-bold text-danger-600 mt-1">
            {data.pct_mora_sobre_vigente}%
          </p>
        </Card>
      </div>

      {/* Gráficos por banda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1">Créditos en mora por banda</h2>
          <p className="text-xs text-ink-400 mb-4">Distribución de cuentas según días de atraso</p>
          {datosBarras.length === 0 ? (
            <EmptyState title="Sin cartera en mora" />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosBarras}
                      dataKey="nro"
                      nameKey="banda"
                      innerRadius="60%"
                      outerRadius="100%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {datosBarras.map((d) => (
                        <Cell key={d.codigo} fill={BANDA_COLOR[d.codigo]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} créditos`, n]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-2">
                {datosBarras.map((d) => (
                  <button
                    key={d.codigo}
                    onClick={() => setBandaFiltro(bandaFiltro === d.codigo ? null : d.codigo)}
                    className={`w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-lg transition-colors ${
                      bandaFiltro === d.codigo ? "bg-navy-50" : "hover:bg-ink-900/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-ink-700">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: BANDA_COLOR[d.codigo] }} />
                      {d.banda}
                    </span>
                    <span className="font-semibold text-ink-900">{d.nro}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1">Monto pendiente por banda</h2>
          <p className="text-xs text-ink-400 mb-4">Saldo pendiente de cobro según severidad de mora</p>
          {datosBarras.length === 0 ? (
            <EmptyState title="Sin cartera en mora" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosBarras} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2433" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="codigo" tick={{ fontSize: 10, fill: "#7C8696" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#7C8696" }} axisLine={false} tickLine={false} width={28} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="monto" radius={[6, 6, 0, 0]}>
                    {datosBarras.map((d) => (
                      <Cell key={d.codigo} fill={BANDA_COLOR[d.codigo]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por cliente, código o cuenta…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-3 py-2 rounded-lg border border-ink-900/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 w-full sm:w-72"
        />
        {bandaFiltro && (
          <button
            onClick={() => setBandaFiltro(null)}
            className="text-xs font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1"
          >
            <X size={13} /> Quitar filtro: {BANDA_LABEL[bandaFiltro]}
          </button>
        )}
      </div>

      {/* Tabla de créditos en mora */}
      {data.creditos.length === 0 ? (
        <EmptyState title="No hay créditos en mora con estos filtros" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Crédito</th>
                <th className="px-4 py-3 font-semibold">Banda</th>
                <th className="px-4 py-3 font-semibold">Días mora</th>
                <th className="px-4 py-3 font-semibold">Pendiente</th>
                <th className="px-4 py-3 font-semibold">Última gestión</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {data.creditos.map((c) => (
                <tr key={c.pkcuentacredito}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{c.cliente}</p>
                    <p className="text-xs text-ink-400">{c.codcliente} · {c.agencia || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {c.codcuenta}
                    <p className="text-xs text-ink-400">{c.producto}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: BANDA_COLOR[c.banda_mora] }}
                    >
                      {c.banda_mora}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{c.diasmoraacumulado}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{formatMoney(c.pagopendiente)}</td>
                  <td className="px-4 py-3 text-ink-400 text-xs">
                    {c.ultima_gestion ? formatDateTime(c.ultima_gestion) : "Sin gestión"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSeleccionado(c)}
                      className="text-xs font-semibold text-accent-600 hover:text-accent-500"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {seleccionado && (
        <DetalleMoraModal
          credito={seleccionado}
          puedeTransicionar={puedeTransicionar}
          onClose={() => setSeleccionado(null)}
          onUpdated={() => {
            setSeleccionado(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function DetalleMoraModal({ credito, puedeTransicionar, onClose, onUpdated }) {
  const [historial, setHistorial] = useState(null);
  const [cargandoHist, setCargandoHist] = useState(true);
  const [tab, setTab] = useState("gestion"); // gestion | transicion

  useEffect(() => {
    getHistorialGestiones(credito.pkcuentacredito)
      .then(setHistorial)
      .finally(() => setCargandoHist(false));
  }, [credito.pkcuentacredito]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/50">
      <div className="bg-bg rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-ink-900/5 sticky top-0 bg-bg">
          <div>
            <h2 className="font-bold text-ink-900">{credito.codcuenta}</h2>
            <p className="text-xs text-ink-400">{credito.cliente} · {credito.codcliente}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-ink-400">Banda</p>
              <p className="font-bold text-sm mt-1" style={{ color: BANDA_COLOR[credito.banda_mora] }}>
                {credito.banda_mora}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-ink-400">Días mora</p>
              <p className="font-bold text-sm mt-1 text-ink-900">{credito.diasmoraacumulado}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-ink-400">Pendiente</p>
              <p className="font-bold text-sm mt-1 text-ink-900">{formatMoney(credito.pagopendiente)}</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-ink-900/5">
            <button
              onClick={() => setTab("gestion")}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === "gestion" ? "border-accent-500 text-ink-900" : "border-transparent text-ink-400"
              }`}
            >
              Registrar gestión
            </button>
            <button
              onClick={() => setTab("transicion")}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === "transicion" ? "border-accent-500 text-ink-900" : "border-transparent text-ink-400"
              }`}
            >
              Transición Judicial/Castigo
            </button>
          </div>

          {tab === "gestion" && (
            <FormGestion pkcuentacredito={credito.pkcuentacredito} onSaved={onUpdated} />
          )}

          {tab === "transicion" && (
            <FormTransicion
              credito={credito}
              puedeTransicionar={puedeTransicionar}
              onSaved={onUpdated}
            />
          )}

          <div>
            <h3 className="text-sm font-bold text-ink-900 mb-2">Historial de gestiones</h3>
            {cargandoHist ? (
              <Spinner label="Cargando historial…" />
            ) : !historial || historial.gestiones.length === 0 ? (
              <EmptyState title="Sin gestiones registradas" />
            ) : (
              <div className="space-y-2">
                {historial.gestiones.map((g) => (
                  <div key={g.pkgestion} className="bg-white rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                        <Phone size={13} /> {g.canal_contacto} · {g.resultado}
                      </span>
                      <span className="text-xs text-ink-400">{formatDateTime(g.fechahora)}</span>
                    </div>
                    <p className="text-xs text-ink-400 mt-1">
                      {g.usuario} ({g.rol_usuario}) · Banda en ese momento: {g.banda_mora_momento}
                    </p>
                    {g.fecha_promesa_pago && (
                      <p className="text-xs text-ink-700 mt-1">
                        Promesa de pago: {formatDate(g.fecha_promesa_pago)} · {formatMoney(g.monto_promesa)}
                      </p>
                    )}
                    {g.observaciones && <p className="text-xs text-ink-700 mt-1">{g.observaciones}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormGestion({ pkcuentacredito, onSaved }) {
  const [canal, setCanal] = useState("LLAMADA");
  const [resultado, setResultado] = useState("CONTACTADO");
  const [fechaPromesa, setFechaPromesa] = useState("");
  const [montoPromesa, setMontoPromesa] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await registrarGestionCobranza(pkcuentacredito, {
        canal_contacto: canal,
        resultado,
        fecha_promesa_pago: resultado === "PROMESA_PAGO" ? fechaPromesa || null : null,
        monto_promesa: resultado === "PROMESA_PAGO" && montoPromesa ? Number(montoPromesa) : null,
        observaciones: observaciones || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo registrar la gestión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Canal de contacto</label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-ink-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {CANALES_CONTACTO.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Resultado</label>
          <select
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-ink-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {RESULTADOS_GESTION.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {resultado === "PROMESA_PAGO" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Fecha de promesa</label>
            <input
              type="date"
              value={fechaPromesa}
              onChange={(e) => setFechaPromesa(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-ink-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Monto prometido (S/)</label>
            <input
              type="number"
              step="0.01"
              value={montoPromesa}
              onChange={(e) => setMontoPromesa(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-ink-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1">Observaciones</label>
        <textarea
          rows={2}
          maxLength={255}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-ink-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
        />
      </div>

      {error && <p className="text-xs text-danger-600">{error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
      >
        {enviando ? "Guardando…" : "Registrar gestión"}
      </button>
    </form>
  );
}

function FormTransicion({ credito, puedeTransicionar, onSaved }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [comentario, setComentario] = useState("");

  if (!puedeTransicionar) {
    return (
      <div className="bg-white rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="text-ink-400 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-ink-400">
          Solo el rol <span className="font-semibold text-ink-700">JEFE_RIESGOS</span> puede
          derivar un crédito a cobranza Judicial o registrar el Castigo de cartera.
        </p>
      </div>
    );
  }

  const transicionar = async (nuevoEstado) => {
    setError(null);
    setProcesando(true);
    try {
      await transicionarEstadoCobranza(credito.pkcuentacredito, nuevoEstado, comentario || undefined);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo realizar la transición.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 space-y-3">
      <p className="text-xs text-ink-400 flex items-center gap-1.5">
        <Clock size={13} /> Umbrales normativos: Judicial desde 121 días · Castigo desde 181 días.
        Este crédito tiene <span className="font-semibold text-ink-700">{credito.diasmoraacumulado} días</span>.
      </p>

      <textarea
        rows={2}
        placeholder="Comentario (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        className="w-full px-2.5 py-2 rounded-lg border border-ink-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
      />

      {error && <p className="text-xs text-danger-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => transicionar("JUDICIAL")}
          disabled={procesando}
          className="flex items-center justify-center gap-2 bg-white border border-ink-900/10 hover:bg-ink-900/5 disabled:opacity-60 text-ink-900 font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {procesando ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
          Derivar a Judicial
        </button>
        <button
          onClick={() => transicionar("CASTIGO")}
          disabled={procesando}
          className="flex items-center justify-center gap-2 bg-danger-600 hover:bg-danger-600/90 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {procesando ? <Loader2 size={15} className="animate-spin" /> : <Skull size={15} />}
          Registrar Castigo
        </button>
      </div>
    </div>
  );
}
