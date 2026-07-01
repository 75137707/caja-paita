from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class CuentaAhorroOut(BaseModel):
    pkcuentaahorro: int
    nro: str
    tipo: str
    saldo: Decimal
    estado: str
    moneda: str
    fechaapertura: date


class MovimientoOut(BaseModel):
    pkoperacion: int
    fecha: datetime
    codkardex: str
    tipooperacion: str
    concepto: str
    tipo_egreso_ingreso: str  # 'I' / 'E'
    monto: Decimal
    glosa: str | None
    canal: str | None
    cuenta: str | None = None
