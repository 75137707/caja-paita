from decimal import Decimal

from pydantic import BaseModel, Field


class PagoCuotaRequest(BaseModel):
    pkcuentacredito: int = Field(..., description="PK de la cuenta de crédito a pagar")
    pkcuentaahorro_origen: int = Field(..., description="Cuenta de ahorro propia desde donde se paga")
    canal: str = "WEB"


class PagoCuotaResponse(BaseModel):
    mensaje: str
    nrocuota: int
    monto_pagado: Decimal
    codkardex: str
    saldo_restante_cuenta: Decimal


class TransferenciaRequest(BaseModel):
    pkcuentaahorro_origen: int
    pkcuentaahorro_destino: int
    monto: Decimal = Field(..., gt=0)
    glosa: str | None = None
    canal: str = "WEB"


class TransferenciaResponse(BaseModel):
    mensaje: str
    codkardex_debito: str
    codkardex_credito: str
    saldo_origen: Decimal
    saldo_destino: Decimal
