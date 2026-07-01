"""
sch_mora.py — Esquemas del módulo de Recuperaciones / Mora.
  R1: consulta de cartera morosa por bandas, con KPIs.
  R2: registro e historial de gestiones de cobranza.
  R3: transición de estado de cobranza (Judicial / Castigo) con validación
      de umbrales normativos (>=121 días para Judicial, >180 días para Castigo).
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

# Bandas de mora soportadas (orden de severidad creciente)
BANDAS_MORA = ["SIN_MORA", "PREVENTIVA", "TEMPRANA", "TARDIA", "JUDICIAL", "CASTIGO"]

# Umbrales normativos de días de atraso para cada banda
UMBRAL_JUDICIAL_DIAS = 121
UMBRAL_CASTIGO_DIAS = 180


# ---------------------------------------------------------------------------
# R1 — Consulta de cartera morosa por bandas, con KPIs
# ---------------------------------------------------------------------------
class CreditoMoraOut(BaseModel):
    pkcuentacredito: int
    codcuenta: str
    pkcliente: int
    cliente: str
    codcliente: str
    producto: str
    banda_mora: str
    estado_cobranza: str
    diasmoraacumulado: int
    saldocapital: Decimal
    pagopendiente: Decimal
    agencia: str | None = None
    ultima_gestion: datetime | None = None


class KpiBandaOut(BaseModel):
    banda_mora: str
    nro_creditos: int
    monto_pendiente: Decimal


class MoraDashboardOut(BaseModel):
    kpis_por_banda: list[KpiBandaOut]
    total_creditos_en_mora: int
    total_monto_pendiente: Decimal
    pct_mora_sobre_vigente: float
    creditos: list[CreditoMoraOut]
    total_registros: int


# ---------------------------------------------------------------------------
# R2 — Registro e historial de gestiones de cobranza
# ---------------------------------------------------------------------------
CANALES_CONTACTO = {"LLAMADA", "VISITA", "SMS", "EMAIL", "WHATSAPP"}
RESULTADOS_GESTION = {"CONTACTADO", "NO_CONTACTADO", "PROMESA_PAGO", "RECHAZO", "SIN_RESPUESTA"}


class RegistrarGestionRequest(BaseModel):
    canal_contacto: str = Field(..., examples=["LLAMADA"])
    resultado: str = Field(..., examples=["PROMESA_PAGO"])
    fecha_promesa_pago: date | None = None
    monto_promesa: Decimal | None = None
    observaciones: str | None = Field(None, max_length=255)

    @field_validator("canal_contacto")
    @classmethod
    def canal_valido(cls, v: str) -> str:
        v = v.upper()
        if v not in CANALES_CONTACTO:
            raise ValueError(f"Canal inválido. Use uno de: {', '.join(sorted(CANALES_CONTACTO))}")
        return v

    @field_validator("resultado")
    @classmethod
    def resultado_valido(cls, v: str) -> str:
        v = v.upper()
        if v not in RESULTADOS_GESTION:
            raise ValueError(f"Resultado inválido. Use uno de: {', '.join(sorted(RESULTADOS_GESTION))}")
        return v


class GestionCobranzaOut(BaseModel):
    pkgestion: int
    pkcuentacredito: int
    usuario: str
    rol_usuario: str
    fechahora: datetime
    canal_contacto: str
    resultado: str
    banda_mora_momento: str
    fecha_promesa_pago: date | None = None
    monto_promesa: Decimal | None = None
    observaciones: str | None = None


class HistorialGestionesOut(BaseModel):
    pkcuentacredito: int
    codcuenta: str
    cliente: str
    banda_mora_actual: str
    gestiones: list[GestionCobranzaOut]


# ---------------------------------------------------------------------------
# R3 — Transición de estado de cobranza (Judicial / Castigo)
# ---------------------------------------------------------------------------
TRANSICIONES_VALIDAS = {"JUDICIAL", "CASTIGO"}


class TransicionCobranzaRequest(BaseModel):
    nuevo_estado: str = Field(..., examples=["JUDICIAL"])
    comentario: str | None = Field(None, max_length=255)

    @field_validator("nuevo_estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        v = v.upper()
        if v not in TRANSICIONES_VALIDAS:
            raise ValueError(f"Transición inválida. Use uno de: {', '.join(sorted(TRANSICIONES_VALIDAS))}")
        return v


class TransicionCobranzaOut(BaseModel):
    mensaje: str
    pkcuentacredito: int
    codcuenta: str
    estado_cobranza_anterior: str
    estado_cobranza_nuevo: str
    diasmoraacumulado: int
    resuelto_por: str
