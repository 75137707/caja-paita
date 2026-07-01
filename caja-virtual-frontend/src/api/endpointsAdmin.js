import apiAdmin from "./clientAdmin";

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------
export async function adminLogin(username, password) {
  const { data } = await apiAdmin.post("/admin/auth/login", { username, password });
  return data;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getAdminDashboard() {
  const { data } = await apiAdmin.get("/admin/dashboard/");
  return data;
}

// ---------------------------------------------------------------------------
// Solicitudes de crédito
// ---------------------------------------------------------------------------
export async function getSolicitudes({ estado, q, limite = 50, offset = 0 } = {}) {
  const { data } = await apiAdmin.get("/admin/solicitudes/", {
    params: { estado, q, limite, offset },
  });
  return data;
}

export async function getSolicitudDetalle(pksolicitud) {
  const { data } = await apiAdmin.get(`/admin/solicitudes/${pksolicitud}`);
  return data;
}

export async function cambiarEstadoSolicitud(pksolicitud, codestado, comentario) {
  const { data } = await apiAdmin.patch(`/admin/solicitudes/${pksolicitud}/estado`, {
    codestado,
    comentario,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export async function getClientes({ q, limite = 50, offset = 0 } = {}) {
  const { data } = await apiAdmin.get("/admin/clientes/", { params: { q, limite, offset } });
  return data;
}

export async function getClienteDetalle(pkcliente) {
  const { data } = await apiAdmin.get(`/admin/clientes/${pkcliente}`);
  return data;
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------
export async function getOperacionesAdmin({ q, limite = 50, offset = 0 } = {}) {
  const { data } = await apiAdmin.get("/admin/operaciones/", { params: { q, limite, offset } });
  return data;
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------
export async function getReportes() {
  const { data } = await apiAdmin.get("/admin/reportes/");
  return data;
}

// ---------------------------------------------------------------------------
// Recuperaciones / Mora (R1 consulta, R2 gestiones, R3 transiciones)
// ---------------------------------------------------------------------------
export async function getMoraDashboard({ banda, q, limite = 50, offset = 0 } = {}) {
  const { data } = await apiAdmin.get("/admin/mora/", { params: { banda, q, limite, offset } });
  return data;
}

export async function registrarGestionCobranza(pkcuentacredito, payload) {
  const { data } = await apiAdmin.post(`/admin/mora/${pkcuentacredito}/gestiones`, payload);
  return data;
}

export async function getHistorialGestiones(pkcuentacredito) {
  const { data } = await apiAdmin.get(`/admin/mora/${pkcuentacredito}/gestiones`);
  return data;
}

export async function transicionarEstadoCobranza(pkcuentacredito, nuevo_estado, comentario) {
  const { data } = await apiAdmin.patch(`/admin/mora/${pkcuentacredito}/estado-cobranza`, {
    nuevo_estado,
    comentario,
  });
  return data;
}

export const BANDAS_MORA = ["PREVENTIVA", "TEMPRANA", "TARDIA", "JUDICIAL", "CASTIGO"];
export const CANALES_CONTACTO = ["LLAMADA", "VISITA", "SMS", "EMAIL", "WHATSAPP"];
export const RESULTADOS_GESTION = [
  "CONTACTADO",
  "NO_CONTACTADO",
  "PROMESA_PAGO",
  "RECHAZO",
  "SIN_RESPUESTA",
];

// Catálogo de estados de solicitud (debe reflejar destadosolicitud)
export const ESTADOS_SOLICITUD = [
  { codigo: "1", nombre: "En Evaluación" },
  { codigo: "2", nombre: "Aprobado" },
  { codigo: "3", nombre: "Rechazado" },
  { codigo: "4", nombre: "Desembolsado" },
];
