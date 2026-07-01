from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CreditoOut(BaseModel):
    pkcuentacredito: int
    cuenta: str
    producto: str
    fecha_desembolso: date
    saldo_capital: Decimal
    pago_pendiente: Decimal
    estado: str
    moneda: str


class CuotaOut(BaseModel):
    pkplanpago: int
    nro: int
    vencimiento: date
    monto_capital: Decimal
    monto_interes: Decimal
    monto_cuota: Decimal
    capital_pagado: Decimal
    interes_pagado: Decimal
    dias_mora: int
    estado: str


class SolicitudCreditoRequest(BaseModel):
    codtipoproducto: str  # ej. LIBREDISP, EMPRESARIAL, PESCA...
    montosolicitado: Decimal
    plazomeses: int
    canal: str = "WEB"
    observaciones: str | None = None


class SolicitudCreditoOut(BaseModel):
    codsolicitud: str
    estado: str
    mensaje: str
