from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Autenticación
# ---------------------------------------------------------------------------
class AdminLoginRequest(BaseModel):
    username: str = Field(..., examples=["admin"])
    password: str = Field(..., examples=["admin1234"])


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    nombre: str
    rol: str
    expires_in_minutes: int


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class KpisOut(BaseModel):
    total_clientes: int
    cuentas_ahorro_activas: int
    creditos_vigentes: int
    solicitudes_en_evaluacion: int
    saldo_total_ahorros: Decimal
    saldo_total_cartera: Decimal


class SolicitudPorEstadoOut(BaseModel):
    codestado: str
    estado: str
    total: int


class SolicitudResumenOut(BaseModel):
    pksolicitud: int
    codsolicitud: str
    cliente: str
    producto: str
    montosolicitado: Decimal
    plazomeses: int
    fechasolicitud: date
    estado: str
    codestado: str


class OperacionResumenOut(BaseModel):
    pkoperacion: int
    codkardex: str
    fechahora: datetime
    montooperacion: Decimal
    glosa: str | None = None
    codtipoegresoingreso: str
    concepto: str
    canal: str | None = None
    codcliente: str | None = None
    cliente: str | None = None


class DashboardOut(BaseModel):
    kpis: KpisOut
    solicitudes_por_estado: list[SolicitudPorEstadoOut]
    solicitudes_recientes: list[SolicitudResumenOut]
    operaciones_recientes: list[OperacionResumenOut]


# ---------------------------------------------------------------------------
# Solicitudes de crédito
# ---------------------------------------------------------------------------
class SolicitudListItemOut(BaseModel):
    pksolicitud: int
    codsolicitud: str
    pkcliente: int
    cliente: str
    codcliente: str
    producto: str
    codtipoproducto: str
    montosolicitado: Decimal
    plazomeses: int
    fechasolicitud: date
    canal: str
    observaciones: str | None = None
    estado: str
    codestado: str
    fechaevaluacion: datetime | None = None
    comentario_admin: str | None = None


class SolicitudListOut(BaseModel):
    items: list[SolicitudListItemOut]
    total: int
    limite: int
    offset: int


class CreditoPrevioOut(BaseModel):
    codcuenta: str
    producto: str
    estado: str
    montodesembolsado: Decimal


class SolicitudDetalleOut(BaseModel):
    pksolicitud: int
    codsolicitud: str
    pkcliente: int
    montosolicitado: Decimal
    plazomeses: int
    fechasolicitud: date
    canal: str
    observaciones: str | None = None
    estado: str
    codestado: str
    producto: str
    codtipoproducto: str
    tasa_interes_anual: Decimal
    codcliente: str
    nombres: str
    apellidopaterno: str
    apellidomaterno: str
    tipodocumento: str
    numerodocumento: str
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    fechanacimiento: date | None = None
    fechaalta: date
    agencia: str | None = None
    ingresomensual: Decimal | None = None
    fuenteingreso: str | None = None
    creditos_previos: list[CreditoPrevioOut] = []
    fechaevaluacion: datetime | None = None
    comentario_admin: str | None = None
    admin_nombres: str | None = None
    admin_apellidos: str | None = None


class CambiarEstadoSolicitudRequest(BaseModel):
    codestado: str = Field(..., examples=["2"], description="2=Aprobado, 3=Rechazado, 4=Desembolsado")
    comentario: str | None = None


class CambiarEstadoSolicitudOut(BaseModel):
    pksolicitud: int
    codsolicitud: str
    estado: str
    mensaje: str


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------
class ClienteListItemOut(BaseModel):
    pkcliente: int
    codcliente: str
    nombre: str
    tipodocumento: str
    numerodocumento: str
    email: str | None = None
    telefono: str | None = None
    activo: bool
    fechaalta: date
    agencia: str | None = None
    nro_cuentas_ahorro: int
    nro_creditos: int


class ClienteListOut(BaseModel):
    items: list[ClienteListItemOut]
    total: int
    limite: int
    offset: int


class CuentaAhorroResumenOut(BaseModel):
    pkcuentaahorro: int
    nro: str
    tipo: str
    estado: str
    moneda: str
    saldo: Decimal


class CreditoResumenOut(BaseModel):
    pkcuentacredito: int
    cuenta: str
    producto: str
    fechadesembolso: date
    estado: str
    moneda: str
    saldo_capital: Decimal
    pago_pendiente: Decimal


class SolicitudClienteResumenOut(BaseModel):
    codsolicitud: str
    producto: str
    montosolicitado: Decimal
    plazomeses: int
    estado: str
    codestado: str
    fechasolicitud: date


class ClienteDetalleOut(BaseModel):
    pkcliente: int
    codcliente: str
    nombres: str
    apellidopaterno: str
    apellidomaterno: str
    tipodocumento: str
    numerodocumento: str
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    fechanacimiento: date | None = None
    sexo: str | None = None
    activo: bool
    fechaalta: date
    agencia: str | None = None
    cuentas_ahorro: list[CuentaAhorroResumenOut] = []
    creditos: list[CreditoResumenOut] = []
    solicitudes: list[SolicitudClienteResumenOut] = []


# ---------------------------------------------------------------------------
# Operaciones
# ---------------------------------------------------------------------------
class OperacionListOut(BaseModel):
    items: list[OperacionResumenOut]
    total: int
    limite: int
    offset: int


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------
class ReporteCreditoProductoOut(BaseModel):
    producto: str
    nro_creditos: int
    saldo_cartera: Decimal


class ReporteSolicitudMesOut(BaseModel):
    periodo: str
    total: int
    aprobadas: int
    rechazadas: int


class ReporteCarteraAgenciaOut(BaseModel):
    agencia: str
    nro_creditos: int
    monto_desembolsado: Decimal
    saldo_capital_vigente: Decimal


class ReporteMorosidadOut(BaseModel):
    tramo: str
    nro_cuotas: int
    monto_pendiente: Decimal


class ReportesOut(BaseModel):
    creditos_por_producto: list[ReporteCreditoProductoOut]
    solicitudes_por_mes: list[ReporteSolicitudMesOut]
    cartera_por_agencia: list[ReporteCarteraAgenciaOut]
    morosidad: list[ReporteMorosidadOut]
