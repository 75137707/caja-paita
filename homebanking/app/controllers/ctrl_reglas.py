"""
ctrl_reglas.py — Motor de decisión de crédito (Criterio 2: reglas de negocio).

Convierte una solicitud recién registrada en una decisión automatizada:
  0. Elegibilidad — "sujeto de crédito": si el cliente ya tiene un crédito
     propio CASTIGADO, o derivado a cobranza JUDICIAL/CASTIGO, se rechaza de
     inmediato (RECHAZADO_NO_ELEGIBLE) sin pasar por ninguna instancia humana
     ni calcular RDS. Ver repo_reglas.obtener_impedimentos_crediticios.
  1. Calcula la cuota mensual estimada (amortización francesa, misma fórmula
     que ctrl_admin.desembolsar_credito, para que la cuota proyectada aquí
     sea consistente con la que se generará si el crédito se desembolsa).
  2. Calcula el RDS (Ratio de Endeudamiento / Cuota-Ingreso):
         RDS = cuota_mensual_estimada / ingreso_mensual
     Si RDS > 0.40 -> rechazo automático por política, sin pasar por
     ninguna instancia de aprobación humana.
  3. Si el RDS es aceptable, determina el nivel de aprobación según el
     monto solicitado:
         monto <= 10,000                  -> APROBADO (aprobación directa)
         10,000 < monto <= 50,000          -> PENDIENTE_RIESGOS (codestado "5")
         monto > 50,000                   -> PENDIENTE_COMITE  (codestado "6")

Este motor NO decide si se desembolsa; solo fija el estado/ruta que la
solicitud debe seguir. El desembolso real (ctrl_admin.desembolsar_credito)
exige que la solicitud llegue a estado "Aprobado" (codestado "2") por
cualquiera de los caminos válidos: aprobación directa de este motor, o
resolución posterior de Riesgos/Comité sobre una solicitud que este motor
dejó en PENDIENTE_RIESGOS/PENDIENTE_COMITE.
"""
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cfg_auth import AdminToken
from app.repositories import repo_reglas
from app.schemas.sch_reglas import (
    EvaluacionSolicitudOut, RDS_MAXIMO, UMBRAL_APROBACION_DIRECTA, UMBRAL_COMITE,
)

# Códigos reales del catálogo destadosolicitud (ver sql/01_schema.sql y
# sql/03_modulo_mora.sql): 1=En Evaluación, 2=Aprobado, 3=Rechazado,
# 4=Desembolsado, 5=Opinión Riesgos Pendiente, 6=En Comité, 7=Observada.
CODESTADO_APROBADO = "2"
CODESTADO_RECHAZADO = "3"
CODESTADO_RIESGOS = "5"
CODESTADO_COMITE = "6"

# Mapa de qué rol tiene autoridad para resolver una solicitud que está en
# cada estado de "pendiente humano". Se usa tanto para mostrarlo en el
# mensaje de salida como para el blindaje RBAC en ctrl_admin.
ROL_AUTORIZADO_POR_ESTADO = {
    CODESTADO_RIESGOS: "JEFE_RIESGOS",
    CODESTADO_COMITE: "COMITE",
}


def _calcular_cuota_mensual(monto: Decimal, plazo: int, tasa_anual: Decimal) -> Decimal:
    """Cuota fija por amortización francesa (idéntica fórmula usada en el desembolso real)."""
    tasa_mensual = float(tasa_anual) / 12
    monto_f = float(monto)
    if tasa_mensual == 0:
        cuota = monto_f / plazo
    else:
        cuota = (monto_f * tasa_mensual) / (1 - (1 + tasa_mensual) ** (-plazo))
    return Decimal(str(cuota)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def evaluar_solicitud(db: Session, pksolicitud: int, persistir: bool = True) -> EvaluacionSolicitudOut:
    """
    Motor de decisión: lee la solicitud + ingreso del cliente, calcula RDS,
    determina el nivel de aprobación y (si persistir=True) actualiza
    dsolicitud con el resultado. persistir=False permite "simular" la
    evaluación sin escribir nada (útil para mostrarle al cliente una
    pre-calificación antes de confirmar el envío, si se quisiera más adelante).
    """
    datos = repo_reglas.obtener_datos_evaluacion(db, pksolicitud)
    if datos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")

    # -----------------------------------------------------------------------
    # 0. Elegibilidad — "sujeto de crédito" (Criterio 2). Se valida ANTES que
    #    el RDS: no tiene sentido medir capacidad de pago de un cliente que ya
    #    incumplió una deuda anterior. Si el cliente tiene algún crédito propio
    #    CASTIGADO, o derivado a cobranza JUDICIAL/CASTIGO (ver R3 del módulo
    #    de Mora, sql/03_modulo_mora.sql), se rechaza automáticamente sin pasar
    #    por ninguna instancia de aprobación humana — igual que el rechazo por
    #    política de RDS, pero por una causa distinta y anterior en el embudo.
    # -----------------------------------------------------------------------
    impedimento = repo_reglas.obtener_impedimentos_crediticios(db, datos["pkcliente"])
    if impedimento is not None:
        motivo = (
            f"Registra un crédito {impedimento['codcuenta']} en estado "
            f"'{impedimento['estado']}' con cobranza '{impedimento['estado_cobranza']}'. "
            "No califica como sujeto de crédito para una nueva solicitud."
        )
        if persistir:
            pkestado_rechazado = repo_reglas.obtener_pk_estadosolicitud_por_codigo(db, CODESTADO_RECHAZADO)
            if pkestado_rechazado is None:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                     detail="Estado 'Rechazado' no existe en catálogo.")
            comentario = f"[Motor de reglas] Rechazo por elegibilidad: {motivo}"
            repo_reglas.guardar_resultado_evaluacion(db, pksolicitud, pkestado_rechazado, comentario)
            db.commit()
        return EvaluacionSolicitudOut(
            pksolicitud=pksolicitud,
            codsolicitud=datos["codsolicitud"],
            nivel_aprobacion="RECHAZADO_NO_ELEGIBLE",
            estado_resultante="Rechazado",
            mensaje=f"Rechazado automáticamente: el cliente no es sujeto de crédito. {motivo}",
            motivo_no_elegible=motivo,
        )

    if datos["ingresomensual"] is None or Decimal(str(datos["ingresomensual"])) <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El cliente no tiene una fuente de ingreso registrada. "
                "No se puede calcular el RDS sin ese dato."
            ),
        )

    monto = Decimal(str(datos["montosolicitado"]))
    plazo = int(datos["plazomeses"])
    tasa_anual = Decimal(str(datos["tasa_interes_anual"]))
    ingreso = Decimal(str(datos["ingresomensual"]))

    cuota_mensual = _calcular_cuota_mensual(monto, plazo, tasa_anual)
    rds = float((cuota_mensual / ingreso).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))
    rds_excede = rds > float(RDS_MAXIMO)

    if rds_excede:
        nivel = "RECHAZADO_POLITICA"
        codestado_destino = CODESTADO_RECHAZADO
        mensaje = (
            f"Rechazado automáticamente por política: RDS de {rds:.2%} supera el máximo "
            f"permitido de {float(RDS_MAXIMO):.0%}."
        )
    elif monto <= UMBRAL_APROBACION_DIRECTA:
        nivel = "APROBADO"
        codestado_destino = CODESTADO_APROBADO
        mensaje = f"Aprobado automáticamente: monto dentro del umbral de aprobación directa (≤ S/ {UMBRAL_APROBACION_DIRECTA:,.0f}) y RDS de {rds:.2%} dentro de política."
    elif monto <= UMBRAL_COMITE:
        nivel = "PENDIENTE_RIESGOS"
        codestado_destino = CODESTADO_RIESGOS
        mensaje = f"Pasa a opinión de Riesgos: monto entre S/ {UMBRAL_APROBACION_DIRECTA:,.0f} y S/ {UMBRAL_COMITE:,.0f}."
    else:
        nivel = "PENDIENTE_COMITE"
        codestado_destino = CODESTADO_COMITE
        mensaje = f"Pasa a Comité de Créditos: monto supera S/ {UMBRAL_COMITE:,.0f}."

    if persistir:
        pkestado_destino = repo_reglas.obtener_pk_estadosolicitud_por_codigo(db, codestado_destino)
        if pkestado_destino is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 detail=f"Estado destino '{codestado_destino}' no existe en catálogo.")
        comentario = (
            f"[Motor de reglas] Cuota est.: S/ {cuota_mensual:.2f} · Ingreso: S/ {ingreso:.2f} · "
            f"RDS: {rds:.2%} · Nivel: {nivel}."
        )
        repo_reglas.guardar_resultado_evaluacion(db, pksolicitud, pkestado_destino, comentario)
        db.commit()

    nombre_estado = {
        CODESTADO_APROBADO: "Aprobado",
        CODESTADO_RECHAZADO: "Rechazado",
        CODESTADO_RIESGOS: "Opinión Riesgos Pendiente",
        CODESTADO_COMITE: "En Comité",
    }[codestado_destino]

    return EvaluacionSolicitudOut(
        pksolicitud=pksolicitud,
        codsolicitud=datos["codsolicitud"],
        cuota_mensual_estimada=cuota_mensual,
        ingreso_mensual=ingreso,
        rds=rds,
        rds_excede_politica=rds_excede,
        nivel_aprobacion=nivel,
        estado_resultante=nombre_estado,
        mensaje=mensaje,
    )


def validar_resolucion_por_rol(admin: AdminToken, codestado_actual: str):
    """
    Blindaje RBAC dinámico (no solo por endpoint, sino por ESTADO de la
    solicitud): una solicitud en 'Opinión Riesgos Pendiente' (5) solo la
    puede resolver JEFE_RIESGOS; una en 'En Comité' (6) solo COMITE.
    ADMIN puede resolver lo que esté en evaluación simple (1), pero no
    puede saltarse Riesgos o Comité una vez que el motor ya derivó la
    solicitud a esa instancia.
    """
    rol_requerido = ROL_AUTORIZADO_POR_ESTADO.get(codestado_actual)
    if rol_requerido is None:
        return  # estado "1" (En Evaluación) u otros sin restricción de rol específica

    if admin.rol != rol_requerido:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Esta solicitud requiere resolución del rol {rol_requerido}. "
                f"Tu rol ({admin.rol}) no tiene autoridad sobre este estado."
            ),
        )
