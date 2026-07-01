import { useEffect, useState } from "react";
import { TrendingUp, PieChart as PieChartIcon, Building2, AlertTriangle } from "lucide-react";
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import { getReportes } from "../../api/endpointsAdmin";
import { Card, Spinner, ErrorBanner, EmptyState } from "../../components/ui";
import { formatMoney } from "../../utils/format";

const PALETTE = ["#3F5E1A", "#A93333", "#1E8E5A", "#6FA032", "#7A1F1F", "#C23B3B"];

export default function AdminReportesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getReportes()
      .then((d) => active && setData(d))
      .catch((err) => active && setError(err.response?.data?.detail || "No se pudieron cargar los reportes."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner label="Cargando reportes…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const { creditos_por_producto, solicitudes_por_mes, cartera_por_agencia, morosidad } = data;

  const totalCartera = creditos_por_producto.reduce((s, p) => s + Number(p.saldo_cartera), 0);
  const totalMorosidad = morosidad.reduce((s, m) => s + Number(m.monto_pendiente), 0);

  const datosCartera = creditos_por_producto.map((p) => ({
    name: p.producto,
    value: Number(p.saldo_cartera),
    nro: p.nro_creditos,
  }));

  const datosSolicitudes = solicitudes_por_mes.map((m) => ({
    periodo: m.periodo,
    Aprobadas: Number(m.aprobadas),
    Rechazadas: Number(m.rechazadas),
    "En evaluación": Number(m.total) - Number(m.aprobadas) - Number(m.rechazadas),
    total: Number(m.total),
  }));

  const datosAgencia = cartera_por_agencia
    .map((a) => ({
      agencia: a.agencia,
      saldo: Number(a.saldo_capital_vigente),
      nro: a.nro_creditos,
    }))
    .sort((a, b) => b.saldo - a.saldo);

  const ordenTramo = ["Sin mora", "1-30 dias", "31-60 dias", "61-90 dias", "Mas de 90 dias"];
  const datosMorosidad = [...morosidad]
    .sort((a, b) => ordenTramo.indexOf(a.tramo) - ordenTramo.indexOf(b.tramo))
    .map((m) => ({
      tramo: m.tramo.replace("dias", "días"),
      monto: Number(m.monto_pendiente),
      cuotas: Number(m.nro_cuotas),
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Reportes</h1>
        <p className="text-ink-400 text-sm mt-1">
          Indicadores agregados de cartera, solicitudes y morosidad.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartera por producto — Donut interactivo */}
        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1 flex items-center gap-2">
            <PieChartIcon size={18} className="text-navy-700" /> Cartera vigente por producto
          </h2>
          <p className="text-xs text-ink-400 mb-2">Saldo de capital vigente por tipo de crédito</p>
          {datosCartera.length === 0 ? (
            <EmptyState title="Sin créditos vigentes" />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-44 h-44 shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosCartera}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="100%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {datosCartera.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, item) => [
                        `${formatMoney(value)} · ${item.payload.nro} créditos`,
                        name,
                      ]}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-ink-400">Total</span>
                  <span className="text-sm font-bold text-ink-900">{formatMoney(totalCartera)}</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2.5">
                {datosCartera.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-700 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-ink-400 shrink-0">({p.nro})</span>
                    </span>
                    <span className="font-semibold text-ink-900 shrink-0">{formatMoney(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Solicitudes por mes — Barras apiladas */}
        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-navy-700" /> Solicitudes por mes
          </h2>
          <p className="text-xs text-ink-400 mb-4">Total recibidas, aprobadas y rechazadas</p>
          {datosSolicitudes.length === 0 ? (
            <EmptyState title="Sin solicitudes registradas" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosSolicitudes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2433" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#7C8696" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#7C8696" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="Aprobadas" stackId="a" fill="#1E8E5A" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Rechazadas" stackId="a" fill="#C23B3B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="En evaluación" stackId="a" fill="#7C8696" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Cartera por agencia — Barras horizontales */}
        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1 flex items-center gap-2">
            <Building2 size={18} className="text-navy-700" /> Cartera por agencia
          </h2>
          <p className="text-xs text-ink-400 mb-4">Saldo de capital vigente desembolsado por agencia</p>
          {datosAgencia.length === 0 ? (
            <EmptyState title="Sin datos por agencia" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosAgencia}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  barCategoryGap={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2433" strokeOpacity={0.06} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#7C8696" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="agencia"
                    tick={{ fontSize: 11, fill: "#3B4555" }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [`${formatMoney(value)} · ${item.payload.nro} créditos`, "Cartera"]}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="saldo" radius={[0, 6, 6, 0]}>
                    {datosAgencia.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Morosidad — Línea de tendencia por tramo */}
        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1 flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger-600" /> Morosidad por tramo de mora
          </h2>
          <p className="text-xs text-ink-400 mb-4">Monto pendiente según días de atraso</p>
          {datosMorosidad.length === 0 ? (
            <EmptyState title="Sin cuotas pendientes" />
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosMorosidad} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A2433" strokeOpacity={0.06} vertical={false} />
                    <XAxis dataKey="tramo" tick={{ fontSize: 10, fill: "#7C8696" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#7C8696" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      formatter={(value, _name, item) => [`${formatMoney(value)} · ${item.payload.cuotas} cuotas`, "Pendiente"]}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="monto"
                      stroke="#C23B3B"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#C23B3B" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="pt-3 mt-1 border-t border-ink-900/5 flex items-center justify-between text-sm">
                <span className="font-bold text-ink-900">Total pendiente</span>
                <span className="font-bold text-ink-900">{formatMoney(totalMorosidad)}</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
