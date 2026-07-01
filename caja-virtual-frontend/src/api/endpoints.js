import api from "./client";

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------
export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
}

// ---------------------------------------------------------------------------
// Autoregistro (cliente nuevo en Caja Virtual)
// ---------------------------------------------------------------------------
export async function verificarElegibilidadRegistro({ tipodocumento = "DNI", numerodocumento }) {
  const { data } = await api.post("/auth/registro/verificar", {
    tipodocumento,
    numerodocumento,
  });
  return data;
}

export async function registrarCliente({
  tipodocumento = "DNI",
  numerodocumento,
  email,
  password,
  confirmar_password,
}) {
  const { data } = await api.post("/auth/registro", {
    tipodocumento,
    numerodocumento,
    email,
    password,
    confirmar_password,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Apertura de cuenta — persona totalmente nueva, sin relación previa con el
// banco (a diferencia del autoregistro de arriba, que solo activa el acceso
// digital de alguien que ya es cliente).
// ---------------------------------------------------------------------------
export async function aperturarCliente(payload) {
  const { data } = await api.post("/auth/apertura", payload);
  return data;
}

// ---------------------------------------------------------------------------
// Cuentas de ahorro
// ---------------------------------------------------------------------------
export async function getCuentasAhorro() {
  const { data } = await api.get("/cuentas/ahorro/");
  return data;
}

export async function getMovimientosCuenta(codCuenta) {
  const { data } = await api.get(`/cuentas/ahorro/${codCuenta}/movimientos`);
  return data;
}

export async function getMovimientosConsolidados() {
  const { data } = await api.get("/cuentas/ahorro/movimientos");
  return data;
}

// ---------------------------------------------------------------------------
// Cuentas de crédito
// ---------------------------------------------------------------------------
export async function getCuentasCredito() {
  const { data } = await api.get("/cuentas/credito/");
  return data;
}

export async function getCuotasCredito(codCuenta) {
  const { data } = await api.get(`/cuentas/credito/${codCuenta}/cuotas`);
  return data;
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------
export async function pagarCuota({ pkcuentacredito, pkcuentaahorro_origen, canal = "WEB" }) {
  const { data } = await api.post("/operaciones/pago-cuota", {
    pkcuentacredito,
    pkcuentaahorro_origen,
    canal,
  });
  return data;
}

export async function transferir({
  pkcuentaahorro_origen,
  pkcuentaahorro_destino,
  monto,
  glosa,
  canal = "WEB",
}) {
  const { data } = await api.post("/operaciones/transferencia", {
    pkcuentaahorro_origen,
    pkcuentaahorro_destino,
    monto,
    glosa,
    canal,
  });
  return data;
}

export async function solicitarCredito({
  codtipoproducto,
  montosolicitado,
  plazomeses,
  canal = "WEB",
  observaciones,
}) {
  const { data } = await api.post("/creditos/solicitar", {
    codtipoproducto,
    montosolicitado,
    plazomeses,
    canal,
    observaciones,
  });
  return data;
}

// Catálogo de productos de crédito disponible (estático, según backend/seed)
export const PRODUCTOS_CREDITO = [
  { codigo: "LIBREDISP", nombre: "Crédito Libre Disponibilidad" },
  { codigo: "EMPRESARIAL", nombre: "Crédito Empresarial" },
  { codigo: "PESCA", nombre: "Crédito Pesca" },
  { codigo: "CRECEMUJER", nombre: "Crédito Crece Mujer" },
  { codigo: "RAPIDITO", nombre: "Crédito Rapidito" },
  { codigo: "AGROPECUARIO", nombre: "Crédito Agropecuario" },
];
