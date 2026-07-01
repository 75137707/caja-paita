import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  PiggyBank,
  CreditCard,
  FileClock,
  Wallet,
  Landmark,
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getAdminDashboard } from "../../api/endpointsAdmin";
import { Card, Spinner, ErrorBanner, EmptyState, StatusBadge } from "../../components/ui";
import { formatMoney, formatDate, formatDateTime } from "../../utils/format";

const ESTADO_COLOR = {
  "1": "#A93333", // En evaluación
  "2": "#1E8E5A", // Aprobado
  "3": "#C23B3B", // Rechazado
  "4": "#3F5E1A", // Desembolsado
};

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminDashboard()
      .then((d) => active && setData(d))
      .catch(
        (err) => active && setError(err.response?.data?.detail || "No se pudo cargar el dashboard.")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner label="Cargando dashboard…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const { kpis, solicitudes_por_estado, solicitudes_recientes, operaciones_recientes } = data;
  const totalSolicitudes = solicitudes_por_estado.reduce((s, e) => s + Number(e.total), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-ink-400 text-sm mt-1">
          Resumen general de clientes, cartera y solicitudes de Caja Paita.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Users}
          iconBg="bg-navy-50 text-navy-700"
          label="Clientes activos"
          value={kpis.total_clientes.toLocaleString("es-PE")}
        />
        <KpiCard
          icon={PiggyBank}
          iconBg="bg-success-50 text-success-600"
          label="Cuentas de ahorro activas"
          value={kpis.cuentas_ahorro_activas.toLocaleString("es-PE")}
        />
        <KpiCard
          icon={CreditCard}
          iconBg="bg-accent-50 text-accent-600"
          label="Créditos vigentes"
          value={kpis.creditos_vigentes.toLocaleString("es-PE")}
        />
        <KpiCard
          icon={Wallet}
          iconBg="bg-navy-50 text-navy-700"
          label="Saldo total en ahorros"
          value={formatMoney(kpis.saldo_total_ahorros)}
        />
        <KpiCard
          icon={Landmark}
          iconBg="bg-accent-50 text-accent-600"
          label="Cartera vigente (capital)"
          value={formatMoney(kpis.saldo_total_cartera)}
        />
        <KpiCard
          icon={FileClock}
          iconBg="bg-danger-50 text-danger-600"
          label="Solicitudes en evaluación"
          value={kpis.solicitudes_en_evaluacion.toLocaleString("es-PE")}
          to="/admin/solicitudes?estado=1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Solicitudes por estado — Donut interactivo */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="font-bold text-ink-900 mb-4">Solicitudes por estado</h2>
          {solicitudes_por_estado.length === 0 ? (
            <EmptyState title="Sin solicitudes registradas" />
          ) : (
            <>
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={solicitudes_por_estado}
                      dataKey="total"
                      nameKey="estado"
                      innerRadius="62%"
                      outerRadius="100%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {solicitudes_por_estado.map((s) => (
                        <Cell key={s.codestado} fill={ESTADO_COLOR[s.codestado] || "#7C8696"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} solicitudes`, name]}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-ink-400">Total</span>
                  <span className="text-lg font-bold text-ink-900">{totalSolicitudes}</span>
                </div>
              </div>
              <div className="space-y-2.5 mt-3">
                {solicitudes_por_estado.map((s) => (
                  <div key={s.codestado} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ESTADO_COLOR[s.codestado] || "#7C8696" }}
                      />
                      {s.estado}
                    </span>
                    <span className="font-semibold text-ink-900">{s.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Solicitudes recientes */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink-900">Solicitudes recientes</h2>
            <Link
              to="/admin/solicitudes"
              className="text-sm font-semibold text-accent-600 hover:text-accent-500 flex items-center gap-1"
            >
              Ver todas <ArrowRight size={15} />
            </Link>
          </div>
          {solicitudes_recientes.length === 0 ? (
            <EmptyState title="Sin solicitudes registradas" />
          ) : (
            <div className="divide-y divide-ink-900/5">
              {solicitudes_recientes.map((s) => (
                <div key={s.pksolicitud} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 text-sm truncate">{s.cliente}</p>
                    <p className="text-xs text-ink-400 truncate">
                      {s.codsolicitud} · {s.producto} · {formatDate(s.fechasolicitud)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-ink-900">
                      {formatMoney(s.montosolicitado)}
                    </span>
                    <StatusBadge status={s.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Operaciones recientes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ink-900">Operaciones recientes</h2>
          <Link
            to="/admin/operaciones"
            className="text-sm font-semibold text-accent-600 hover:text-accent-500 flex items-center gap-1"
          >
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>
        {operaciones_recientes.length === 0 ? (
          <EmptyState title="Sin operaciones registradas" />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 font-semibold">Canal</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {operaciones_recientes.map((op) => (
                  <tr key={op.pkoperacion}>
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
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {formatDateTime(op.fechahora)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, iconBg, label, value, to }) {
  const content = (
    <Card className="p-5 flex items-center gap-4 h-full hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-xl font-bold text-ink-900 truncate">{value}</p>
      </div>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
