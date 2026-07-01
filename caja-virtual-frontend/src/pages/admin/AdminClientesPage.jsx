import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, Mail, Phone, MapPin, Calendar, Building2 } from "lucide-react";
import { getClientes, getClienteDetalle } from "../../api/endpointsAdmin";
import { Card, Spinner, ErrorBanner, EmptyState, StatusBadge } from "../../components/ui";
import { formatMoney, formatDate } from "../../utils/format";

export default function AdminClientesPage() {
  const [q, setQ] = useState("");
  const [clientes, setClientes] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    getClientes({ q: q || undefined, limite: 100 })
      .then((data) => {
        setClientes(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err.response?.data?.detail || "No se pudieron cargar los clientes."))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300); // debounce de búsqueda
    return () => clearTimeout(timeout);
  }, [cargar]);

  const verDetalle = async (pkcliente) => {
    setError(null);
    try {
      const detalle = await getClienteDetalle(pkcliente);
      setSeleccionado(detalle);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo cargar el detalle del cliente.");
    }
  };

  if (seleccionado) {
    return <ClienteDetalleView cliente={seleccionado} onVolver={() => setSeleccionado(null)} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Clientes</h1>
        <p className="text-ink-400 text-sm mt-1">
          {total} cliente{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"} en Caja Paita.
        </p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código de cliente, documento o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Cargando clientes…" />
      ) : !clientes || clientes.length === 0 ? (
        <EmptyState title="No se encontraron clientes" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Documento</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Cuentas</th>
                <th className="px-4 py-3 font-semibold">Créditos</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {clientes.map((c) => (
                <tr
                  key={c.pkcliente}
                  onClick={() => verDetalle(c.pkcliente)}
                  className="cursor-pointer hover:bg-ink-900/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{c.nombre}</p>
                    <p className="text-xs text-ink-400">{c.codcliente}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {c.tipodocumento} {c.numerodocumento}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    <p className="text-xs">{c.email || "—"}</p>
                    <p className="text-xs text-ink-400">{c.telefono || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{c.nro_cuentas_ahorro}</td>
                  <td className="px-4 py-3 text-ink-700">{c.nro_creditos}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.activo ? "ACTIVA" : "BLOQUEADA"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ClienteDetalleView({ cliente: c, onVolver }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
      >
        <ChevronLeft size={16} /> Volver a clientes
      </button>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {c.codcliente}
            </span>
            <p className="text-2xl font-bold text-ink-900 mt-1">
              {c.nombres} {c.apellidopaterno} {c.apellidomaterno}
            </p>
            <p className="text-sm text-ink-400 mt-1">
              {c.tipodocumento} {c.numerodocumento}
            </p>
          </div>
          <StatusBadge status={c.activo ? "ACTIVA" : "BLOQUEADA"} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-ink-900/5 text-sm">
          <InfoIcon icon={Mail} label="Email" value={c.email || "—"} />
          <InfoIcon icon={Phone} label="Teléfono" value={c.telefono || "—"} />
          <InfoIcon icon={MapPin} label="Dirección" value={c.direccion || "—"} />
          <InfoIcon icon={Building2} label="Agencia" value={c.agencia || "—"} />
          <InfoIcon
            icon={Calendar}
            label="Fecha de nacimiento"
            value={c.fechanacimiento ? formatDate(c.fechanacimiento) : "—"}
          />
          <InfoIcon icon={Calendar} label="Cliente desde" value={formatDate(c.fechaalta)} />
        </div>
      </Card>

      {/* Cuentas de ahorro */}
      <section>
        <h2 className="text-lg font-bold text-ink-900 mb-3">Cuentas de ahorro</h2>
        {c.cuentas_ahorro.length === 0 ? (
          <EmptyState title="Sin cuentas de ahorro" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.cuentas_ahorro.map((cta) => (
              <Card key={cta.pkcuentaahorro} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {cta.tipo}
                  </span>
                  <StatusBadge status={cta.estado} />
                </div>
                <p className="text-xl font-bold text-ink-900">{formatMoney(cta.saldo, cta.moneda)}</p>
                <p className="text-sm text-ink-400 mt-1">{cta.nro}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Créditos */}
      <section>
        <h2 className="text-lg font-bold text-ink-900 mb-3">Créditos</h2>
        {c.creditos.length === 0 ? (
          <EmptyState title="Sin créditos activos" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.creditos.map((cr) => (
              <Card key={cr.pkcuentacredito} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {cr.producto}
                  </span>
                  <StatusBadge status={cr.estado} />
                </div>
                <p className="text-xl font-bold text-ink-900">
                  {formatMoney(cr.pago_pendiente, cr.moneda)}
                </p>
                <p className="text-sm text-ink-400 mt-1">Pago pendiente · {cr.cuenta}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Historial de solicitudes */}
      <section>
        <h2 className="text-lg font-bold text-ink-900 mb-3">Historial de solicitudes</h2>
        {c.solicitudes.length === 0 ? (
          <EmptyState title="Sin solicitudes registradas" />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                  <th className="px-4 py-3 font-semibold">Solicitud</th>
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {c.solicitudes.map((s) => (
                  <tr key={s.codsolicitud}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">{s.codsolicitud}</td>
                    <td className="px-4 py-3 text-ink-700">{s.producto}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">
                      {formatMoney(s.montosolicitado)}
                    </td>
                    <td className="px-4 py-3 text-ink-700">{formatDate(s.fechasolicitud)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.estado} />
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

function InfoIcon({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="text-ink-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-medium text-ink-900">{value}</p>
      </div>
    </div>
  );
}
