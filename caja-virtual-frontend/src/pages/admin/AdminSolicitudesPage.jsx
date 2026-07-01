import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Banknote,
  User,
  Briefcase,
  FileText,
} from "lucide-react";
import {
  getSolicitudes,
  getSolicitudDetalle,
  cambiarEstadoSolicitud,
  ESTADOS_SOLICITUD,
} from "../../api/endpointsAdmin";
import { Card, Spinner, ErrorBanner, EmptyState, StatusBadge } from "../../components/ui";
import { formatMoney, formatDate, formatDateTime } from "../../utils/format";

export default function AdminSolicitudesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const estadoFiltro = searchParams.get("estado") || "";
  const [q, setQ] = useState("");
  const [solicitudes, setSolicitudes] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seleccionada, setSeleccionada] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    getSolicitudes({ estado: estadoFiltro || undefined, q: q || undefined, limite: 100 })
      .then((data) => {
        setSolicitudes(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err.response?.data?.detail || "No se pudieron cargar las solicitudes."))
      .finally(() => setLoading(false));
  }, [estadoFiltro, q]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 0);
    return () => clearTimeout(timeout);
  }, [cargar]);

  const verDetalle = async (pksolicitud) => {
    setError(null);
    try {
      const detalle = await getSolicitudDetalle(pksolicitud);
      setSeleccionada(detalle);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo cargar el detalle de la solicitud.");
    }
  };

  const handleCambioEstado = async (codestado, comentario) => {
    if (!seleccionada) return;
    try {
      await cambiarEstadoSolicitud(seleccionada.pksolicitud, codestado, comentario);
      const detalle = await getSolicitudDetalle(seleccionada.pksolicitud);
      setSeleccionada(detalle);
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo actualizar el estado de la solicitud.");
    }
  };

  const setEstadoFiltro = (codigo) => {
    if (codigo) setSearchParams({ estado: codigo });
    else setSearchParams({});
  };

  if (seleccionada) {
    return (
      <SolicitudDetalleView
        solicitud={seleccionada}
        onVolver={() => setSeleccionada(null)}
        onCambiarEstado={handleCambioEstado}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Solicitudes de Crédito</h1>
        <p className="text-ink-400 text-sm mt-1">
          {total} solicitud{total === 1 ? "" : "es"} · Revisa, aprueba, rechaza o marca como desembolsadas.
        </p>
      </div>

      {/* Filtros */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, código de solicitud…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <FilterChip label="Todas" active={!estadoFiltro} onClick={() => setEstadoFiltro("")} />
          {ESTADOS_SOLICITUD.map((e) => (
            <FilterChip
              key={e.codigo}
              label={e.nombre}
              active={estadoFiltro === e.codigo}
              onClick={() => setEstadoFiltro(e.codigo)}
            />
          ))}
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="Cargando solicitudes…" />
      ) : !solicitudes || solicitudes.length === 0 ? (
        <EmptyState
          title="No se encontraron solicitudes"
          description="Ajusta la búsqueda o el filtro de estado para ver más resultados."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-900/5">
                <th className="px-4 py-3 font-semibold">Solicitud</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Plazo</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {solicitudes.map((s) => (
                <tr
                  key={s.pksolicitud}
                  onClick={() => verDetalle(s.pksolicitud)}
                  className="cursor-pointer hover:bg-ink-900/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">{s.codsolicitud}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{s.cliente}</p>
                    <p className="text-xs text-ink-400">{s.codcliente}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{s.producto}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">
                    {formatMoney(s.montosolicitado)}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{s.plazomeses} meses</td>
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
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
        active
          ? "bg-navy-900 text-white"
          : "bg-ink-900/5 text-ink-700 hover:bg-ink-900/10"
      }`}
    >
      {label}
    </button>
  );
}

function SolicitudDetalleView({ solicitud, onVolver, onCambiarEstado, error }) {
  const [comentario, setComentario] = useState("");
  const [procesando, setProcesando] = useState(false);
  const s = solicitud;
  const puedeGestionar = s.codestado === "1";

  const ejecutar = async (codestado) => {
    setProcesando(true);
    await onCambiarEstado(codestado, comentario || undefined);
    setProcesando(false);
    setComentario("");
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
      >
        <ChevronLeft size={16} /> Volver a solicitudes
      </button>

      <ErrorBanner message={error} />

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {s.producto}
            </span>
            <p className="text-3xl font-bold text-ink-900 mt-1">{formatMoney(s.montosolicitado)}</p>
            <p className="text-sm text-ink-400 mt-1">
              {s.codsolicitud} · {s.plazomeses} meses · Canal {s.canal}
            </p>
          </div>
          <StatusBadge status={s.estado} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-ink-900/5">
          <div>
            <p className="text-xs text-ink-400">Fecha de solicitud</p>
            <p className="font-semibold text-ink-900 text-sm">{formatDate(s.fechasolicitud)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Tasa de interés anual</p>
            <p className="font-semibold text-ink-900 text-sm">
              {(Number(s.tasa_interes_anual) * 100).toFixed(2)}%
            </p>
          </div>
          {s.fechaevaluacion && (
            <div>
              <p className="text-xs text-ink-400">Evaluada el</p>
              <p className="font-semibold text-ink-900 text-sm">{formatDateTime(s.fechaevaluacion)}</p>
            </div>
          )}
          {(s.admin_nombres || s.admin_apellidos) && (
            <div>
              <p className="text-xs text-ink-400">Evaluada por</p>
              <p className="font-semibold text-ink-900 text-sm">
                {s.admin_nombres} {s.admin_apellidos}
              </p>
            </div>
          )}
        </div>

        {s.observaciones && (
          <div className="mt-4 pt-4 border-t border-ink-900/5">
            <p className="text-xs text-ink-400 mb-1 flex items-center gap-1.5">
              <FileText size={13} /> Observaciones del cliente
            </p>
            <p className="text-sm text-ink-700">{s.observaciones}</p>
          </div>
        )}

        {s.comentario_admin && (
          <div className="mt-4 pt-4 border-t border-ink-900/5">
            <p className="text-xs text-ink-400 mb-1">Comentario del evaluador</p>
            <p className="text-sm text-ink-700">{s.comentario_admin}</p>
          </div>
        )}
      </Card>

      {/* Datos del cliente solicitante */}
      <Card className="p-6">
        <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2">
          <User size={18} className="text-navy-700" /> Cliente solicitante
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Info label="Nombre completo" value={`${s.nombres} ${s.apellidopaterno} ${s.apellidomaterno}`} />
          <Info label="Código de cliente" value={s.codcliente} />
          <Info label="Documento" value={`${s.tipodocumento} ${s.numerodocumento}`} />
          <Info label="Fecha de nacimiento" value={s.fechanacimiento ? formatDate(s.fechanacimiento) : "—"} />
          <Info label="Email" value={s.email || "—"} />
          <Info label="Teléfono" value={s.telefono || "—"} />
          <Info label="Dirección" value={s.direccion || "—"} />
          <Info label="Agencia" value={s.agencia || "—"} />
          <Info label="Cliente desde" value={formatDate(s.fechaalta)} />
        </div>
        {(s.ingresomensual != null || s.fuenteingreso) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-ink-900/5">
            <Info
              label="Ingreso mensual declarado"
              value={s.ingresomensual != null ? formatMoney(s.ingresomensual) : "—"}
            />
            <Info label="Fuente de ingreso" value={s.fuenteingreso || "—"} />
          </div>
        )}
      </Card>

      {/* Créditos previos del cliente */}
      {s.creditos_previos && s.creditos_previos.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-navy-700" /> Créditos previos del cliente
          </h3>
          <div className="divide-y divide-ink-900/5">
            {s.creditos_previos.map((c) => (
              <div key={c.codcuenta} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900 text-sm">{c.producto}</p>
                  <p className="text-xs text-ink-400">{c.codcuenta}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink-900">
                    {formatMoney(c.montodesembolsado)}
                  </span>
                  <StatusBadge status={c.estado} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Acciones de gestión */}
      {puedeGestionar && (
        <Card className="p-6">
          <h3 className="font-bold text-ink-900 mb-1">Gestionar solicitud</h3>
          <p className="text-sm text-ink-400 mb-4">
            Esta solicitud está en evaluación. Aprueba o rechaza, o agrega un comentario opcional.
          </p>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario opcional sobre la decisión…"
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 mb-4 resize-none"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => ejecutar("2")}
              disabled={procesando}
              className="flex-1 flex items-center justify-center gap-2 bg-success-600 hover:bg-success-600/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              <CheckCircle2 size={16} /> Aprobar solicitud
            </button>
            <button
              onClick={() => ejecutar("3")}
              disabled={procesando}
              className="flex-1 flex items-center justify-center gap-2 bg-danger-600 hover:bg-danger-600/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              <XCircle size={16} /> Rechazar solicitud
            </button>
          </div>
        </Card>
      )}

      {s.codestado === "2" && (
        <Card className="p-6">
          <h3 className="font-bold text-ink-900 mb-1">Marcar como desembolsado</h3>
          <p className="text-sm text-ink-400 mb-4">
            Esta solicitud ya fue aprobada. Cuando el crédito se haya desembolsado al cliente,
            marca la solicitud como completada.
          </p>
          <button
            onClick={() => ejecutar("4")}
            disabled={procesando}
            className="flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm"
          >
            <Banknote size={16} /> Marcar como desembolsado
          </button>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-medium text-ink-900">{value}</p>
    </div>
  );
}
