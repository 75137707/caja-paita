import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PiggyBank,
  CreditCard,
  ArrowRight,
  Wallet,
  ArrowLeftRight,
  FilePlus2,
  Receipt,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  getCuentasAhorro,
  getCuentasCredito,
  getMovimientosConsolidados,
} from "../api/endpoints";
import { Card, Spinner, ErrorBanner, EmptyState, StatusBadge } from "../components/ui";
import { formatMoney } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const DONUT_COLORS = ["#3F5E1A", "#A93333", "#6FA032", "#1E8E5A", "#7A1F1F", "#7A1F1F"];

export default function DashboardPage() {
  const { cliente } = useAuth();
  const [ahorros, setAhorros] = useState(null);
  const [creditos, setCreditos] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [a, c, m] = await Promise.all([
          getCuentasAhorro(),
          getCuentasCredito(),
          getMovimientosConsolidados().catch(() => []),
        ]);
        if (active) {
          setAhorros(a);
          setCreditos(c);
          setMovimientos(m);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.detail || "No se pudo cargar la información.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Agrupamos el saldo de ahorros por moneda (puede haber cuentas en PEN y/o USD)
  const totalesPorMoneda = (ahorros || []).reduce((acc, c) => {
    acc[c.moneda] = (acc[c.moneda] || 0) + Number(c.saldo);
    return acc;
  }, {});
  const monedasAhorro = Object.keys(totalesPorMoneda);

  const totalPagoPendiente = (creditos || [])
    .filter((c) => c.estado === "VIGENTE")
    .reduce((sum, c) => sum + Number(c.pago_pendiente), 0);

  // Serie de flujo de caja: saldo acumulado de los últimos 30 días a partir de movimientos
  const flujoCaja = useMemo(() => {
    if (!movimientos || movimientos.length === 0) return [];
    const hoy = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 29);

    const porDia = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(hace30);
      d.setDate(hace30.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      porDia[key] = 0;
    }

    movimientos.forEach((m) => {
      const fecha = new Date(m.fecha);
      const key = fecha.toISOString().slice(0, 10);
      if (key in porDia) {
        const signo = m.tipo_egreso_ingreso === "I" ? 1 : -1;
        porDia[key] += signo * Number(m.monto);
      }
    });

    let acumulado = 0;
    return Object.entries(porDia).map(([fecha, neto]) => {
      acumulado += neto;
      const d = new Date(fecha);
      return {
        fecha,
        label: d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
        neto,
        acumulado,
      };
    });
  }, [movimientos]);

  const huboMovimientoReciente = flujoCaja.some((p) => p.neto !== 0);

  // Distribución de saldo por cuenta de ahorro (para el donut)
  const distribucionCuentas = (ahorros || [])
    .filter((c) => Number(c.saldo) > 0)
    .map((c) => ({ name: `${c.tipo} · ${c.nro.slice(-4)}`, value: Number(c.saldo) }));

  if (loading) return <Spinner label="Cargando tu resumen…" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Hola, {cliente?.nombre?.split(" ")[0]}</h1>
        <p className="text-ink-400 text-sm mt-1">
          Este es el resumen de tus productos en Caja Paita.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction to="/transferencias" icon={ArrowLeftRight} label="Transferir" />
        <QuickAction to="/movimientos" icon={Receipt} label="Movimientos" />
        <QuickAction to="/solicitar-credito" icon={FilePlus2} label="Solicitar crédito" />
        <QuickAction to="/productos" icon={Store} label="Productos" />
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-sm text-ink-400">Saldo total en ahorros</p>
            {monedasAhorro.length === 0 ? (
              <p className="text-2xl font-bold text-ink-900">{formatMoney(0, "PEN")}</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {monedasAhorro.map((moneda) => (
                  <p key={moneda} className="text-2xl font-bold text-ink-900">
                    {formatMoney(totalesPorMoneda[moneda], moneda)}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
            <CreditCard size={22} />
          </div>
          <div>
            <p className="text-sm text-ink-400">Pago pendiente en créditos</p>
            <p className="text-2xl font-bold text-ink-900">
              {formatMoney(totalPagoPendiente, "PEN")}
            </p>
          </div>
        </Card>
      </div>

      {/* Gráficos: flujo de caja + distribución de saldo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-ink-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-navy-700" /> Tu flujo en los últimos 30 días
            </h2>
          </div>
          <p className="text-xs text-ink-400 mb-4">Saldo neto acumulado de ingresos y egresos</p>
          {!huboMovimientoReciente ? (
            <EmptyState
              title="Sin movimientos en los últimos 30 días"
              description="Cuando realices depósitos, retiros o transferencias, verás aquí tu evolución."
            />
          ) : (
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flujoCaja} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A93333" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#A93333" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2433" strokeOpacity={0.06} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#7C8696" }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#7C8696" }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(v) => `S/ ${Math.round(v / 100) / 10}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatMoney(value), "Saldo neto acumulado"]}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid rgba(11,37,69,0.08)",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(11,37,69,0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    stroke="#A93333"
                    strokeWidth={2.5}
                    fill="url(#colorAcumulado)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-ink-900 mb-1">Tu saldo por cuenta</h2>
          <p className="text-xs text-ink-400 mb-4">Distribución de tus cuentas de ahorro</p>
          {distribucionCuentas.length === 0 ? (
            <EmptyState title="Sin saldo disponible" />
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribucionCuentas}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="100%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {distribucionCuentas.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {distribucionCuentas.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-ink-700 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="font-semibold text-ink-900 shrink-0">{formatMoney(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Cuentas de ahorro */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <PiggyBank size={20} className="text-navy-700" /> Cuentas de Ahorro
          </h2>
          <Link
            to="/ahorros"
            className="text-sm font-semibold text-accent-600 hover:text-accent-500 flex items-center gap-1"
          >
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>
        {!ahorros || ahorros.length === 0 ? (
          <EmptyState
            title="No tienes cuentas de ahorro"
            description="Cuando abras una cuenta de ahorro con Caja Paita, aparecerá aquí."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ahorros.slice(0, 3).map((c) => (
              <Card key={c.pkcuentaahorro} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {c.tipo}
                  </span>
                  <StatusBadge status={c.estado} />
                </div>
                <p className="text-2xl font-bold text-ink-900">{formatMoney(c.saldo, c.moneda)}</p>
                <p className="text-sm text-ink-400 mt-1">{c.nro}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Créditos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <CreditCard size={20} className="text-navy-700" /> Mis Créditos
          </h2>
          <Link
            to="/creditos"
            className="text-sm font-semibold text-accent-600 hover:text-accent-500 flex items-center gap-1"
          >
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>
        {!creditos || creditos.length === 0 ? (
          <EmptyState
            title="No tienes créditos activos"
            description="Si solicitas un crédito con Caja Paita, lo verás reflejado aquí."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditos.slice(0, 3).map((c) => (
              <Card key={c.pkcuentacredito} className="p-5">
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
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link to={to}>
      <Card className="p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <span className="text-xs font-semibold text-ink-700 leading-tight">{label}</span>
      </Card>
    </Link>
  );
}
