"""
sch_reglas.py — Esquema de salida del motor de reglas de negocio del crédito
(Criterio 2: elegibilidad, RDS, ruta de aprobación por montos).
"""
from decimal import Decimal

from pydantic import BaseModel

# Umbrales de la ruta de aprobación por monto. Documentados aquí (no
# repartidos en cada función) para que un auditor encuentre la política en
# un solo lugar.
UMBRAL_APROBACION_DIRECTA = Decimal("10000")   # <= este monto: aprobación directa si RDS ok
UMBRAL_COMITE = Decimal("50000")               # > este monto: requiere Comité
RDS_MAXIMO = Decimal("0.40")                   # Ratio de Endeudamiento (RDS) máximo permitido


class EvaluacionSolicitudOut(BaseModel):
    pksolicitud: int
    codsolicitud: str
    cuota_mensual_estimada: Decimal | None = None
    ingreso_mensual: Decimal | None = None
    rds: float | None = None
    rds_excede_politica: bool = False
    nivel_aprobacion: str       # APROBADO / PENDIENTE_RIESGOS / PENDIENTE_COMITE / RECHAZADO_POLITICA / RECHAZADO_NO_ELEGIBLE
    estado_resultante: str      # nombre del estado real guardado en destadosolicitud
    mensaje: str
    motivo_no_elegible: str | None = None  # solo presente si nivel_aprobacion == RECHAZADO_NO_ELEGIBLE
