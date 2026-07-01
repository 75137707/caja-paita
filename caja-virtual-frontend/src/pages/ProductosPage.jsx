import { useState } from "react";
import { PiggyBank, CreditCard, Percent, Clock, ShieldCheck } from "lucide-react";
import { Card } from "../components/ui";

const PRODUCTOS_AHORRO = [
  {
    nombre: "Peke Ahorro",
    descripcion: "Cuenta de ahorro pensada para empezar a ahorrar sin monto mínimo, ideal para metas de corto plazo.",
    tasa: "2.00% TEA",
    destacado: "Sin mantenimiento",
  },
  {
    nombre: "Ahorro Corriente",
    descripcion: "Tu cuenta de uso diario: deposita, retira y transfiere cuando quieras desde la Caja Virtual.",
    tasa: "1.50% TEA",
    destacado: "Disponibilidad inmediata",
  },
  {
    nombre: "Cuenta Sueldo",
    descripcion: "Recibe tu remuneración y accede a beneficios preferenciales en créditos y seguros.",
    tasa: "1.00% TEA",
    destacado: "Sin costo de mantenimiento",
  },
  {
    nombre: "CTS Normal",
    descripcion: "Resguarda tu Compensación por Tiempo de Servicios con una de las tasas más competitivas del sistema.",
    tasa: "3.00% TEA",
    destacado: "Mayor rentabilidad",
  },
  {
    nombre: "Plazo Fijo",
    descripcion: "Inmoviliza tu dinero por un periodo determinado y obtén la mejor tasa de rentabilidad garantizada.",
    tasa: "4.50% TEA",
    destacado: "La tasa más alta",
  },
];

const PRODUCTOS_CREDITO = [
  {
    nombre: "Crédito Libre Disponibilidad",
    descripcion: "Dinero en efectivo para lo que necesites: estudios, salud, viajes o imprevistos.",
    tasa: "Desde 35% TEA",
    plazo: "Hasta 36 meses",
  },
  {
    nombre: "Crédito Empresarial",
    descripcion: "Capital de trabajo o activo fijo para hacer crecer tu negocio o empresa.",
    tasa: "Desde 28% TEA",
    plazo: "Hasta 36 meses",
  },
  {
    nombre: "Crédito Pesca",
    descripcion: "Financiamiento especializado para armadores y trabajadores del sector pesquero de Paita.",
    tasa: "Desde 30% TEA",
    plazo: "Hasta 24 meses",
  },
  {
    nombre: "Crédito Crece Mujer",
    descripcion: "Impulsa el negocio de la mujer emprendedora con condiciones preferenciales.",
    tasa: "Desde 26% TEA",
    plazo: "Hasta 36 meses",
  },
  {
    nombre: "Crédito Rapidito",
    descripcion: "Aprobación rápida para necesidades urgentes, con el mínimo de requisitos.",
    tasa: "Desde 40% TEA",
    plazo: "Hasta 12 meses",
  },
  {
    nombre: "Crédito Agropecuario",
    descripcion: "Financiamiento para campañas agrícolas y ganaderas, con cronograma adaptado a tu cosecha.",
    tasa: "Desde 27% TEA",
    plazo: "Hasta 24 meses",
  },
];

export default function ProductosPage() {
  const [tab, setTab] = useState("ahorro");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Productos Caja Paita</h1>
        <p className="text-ink-400 text-sm mt-1">
          Conoce nuestras cuentas de ahorro y líneas de crédito disponibles.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("ahorro")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === "ahorro"
              ? "bg-navy-900 text-white"
              : "bg-white text-ink-700 border border-ink-900/10 hover:bg-ink-900/5"
          }`}
        >
          <PiggyBank size={16} /> Ahorros
        </button>
        <button
          onClick={() => setTab("credito")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === "credito"
              ? "bg-navy-900 text-white"
              : "bg-white text-ink-700 border border-ink-900/10 hover:bg-ink-900/5"
          }`}
        >
          <CreditCard size={16} /> Créditos
        </button>
      </div>

      {tab === "ahorro" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTOS_AHORRO.map((p) => (
            <Card key={p.nombre} className="p-5 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center mb-3">
                <PiggyBank size={18} />
              </div>
              <h3 className="font-bold text-ink-900 mb-1.5">{p.nombre}</h3>
              <p className="text-sm text-ink-400 flex-1">{p.descripcion}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-900/5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-600">
                  <Percent size={14} /> {p.tasa}
                </span>
                <span className="text-xs text-ink-400">{p.destacado}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTOS_CREDITO.map((p) => (
            <Card key={p.nombre} className="p-5 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center mb-3">
                <CreditCard size={18} />
              </div>
              <h3 className="font-bold text-ink-900 mb-1.5">{p.nombre}</h3>
              <p className="text-sm text-ink-400 flex-1">{p.descripcion}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-900/5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-600">
                  <Percent size={14} /> {p.tasa}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Clock size={13} /> {p.plazo}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5 flex items-start gap-3 bg-navy-50 border-none">
        <ShieldCheck size={20} className="text-navy-700 shrink-0 mt-0.5" />
        <p className="text-sm text-navy-700">
          Las tasas mostradas son referenciales y pueden variar según evaluación crediticia
          y vigencia de tasas activas. Tus depósitos están protegidos por el Fondo de
          Seguro de Depósitos (FSD), según ley.
        </p>
      </Card>
    </div>
  );
}
