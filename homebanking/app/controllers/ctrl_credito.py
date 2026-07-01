"""
ctrl_credito.py — Orquestación de consultas de créditos, cuotas y solicitudes.
"""
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.controllers import ctrl_reglas
from app.repositories import repo_credito
from app.schemas.sch_credito import SolicitudCreditoRequest, SolicitudCreditoOut


def obtener_creditos(db: Session, pkcliente: int):
    return repo_credito.listar_creditos_cliente(db, pkcliente)


def obtener_cuotas(db: Session, codcuenta: str, pkcliente: int):
    credito = repo_credito.obtener_credito_por_codigo(db, codcuenta, pkcliente)
    if credito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="Crédito no encontrado o no pertenece al cliente")
    return repo_credito.listar_cuotas_credito(db, credito["pkcuentacredito"])


def registrar_solicitud_credito(db: Session, pkcliente: int,
                                 payload: SolicitudCreditoRequest) -> SolicitudCreditoOut:
    pktipoproducto = repo_credito.obtener_pk_tipoproductocredito(db, payload.codtipoproducto)
    if pktipoproducto is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail=f"Producto de crédito '{payload.codtipoproducto}' no existe")

    pkestado_inicial = repo_credito.obtener_pk_estadosolicitud(db, "1")  # En Evaluación
    if pkestado_inicial is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="No se encontró el estado inicial 'En Evaluación' en catálogo")

    if payload.montosolicitado <= 0 or payload.plazomeses <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Monto y plazo deben ser mayores a cero")

    siguiente = repo_credito.siguiente_numero_solicitud(db) + 1
    codsolicitud = f"SOL-{siguiente:06d}"

    try:
        pksolicitud = repo_credito.insertar_solicitud_credito(
            db, pkcliente=pkcliente, pktipoproductocredito=pktipoproducto,
            montosolicitado=payload.montosolicitado, plazomeses=payload.plazomeses,
            pkestadosolicitud=pkestado_inicial, canal=payload.canal,
            observaciones=payload.observaciones, codsolicitud=codsolicitud,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="No se pudo registrar la solicitud de crédito")

    # El motor de reglas (Criterio 2) evalúa la solicitud apenas se registra:
    # calcula el RDS y determina si se aprueba directo, pasa a Riesgos/Comité,
    # o se rechaza automáticamente por política. Si el cliente no tiene
    # ingreso registrado (caso límite, p.ej. recién autoregistrado), la
    # solicitud queda "En Evaluación" para revisión manual en vez de fallar.
    try:
        evaluacion = ctrl_reglas.evaluar_solicitud(db, pksolicitud, persistir=True)
        estado_final = evaluacion.estado_resultante
        mensaje_final = evaluacion.mensaje
    except HTTPException as exc:
        if exc.status_code == status.HTTP_400_BAD_REQUEST:
            estado_final = "En Evaluación"
            mensaje_final = (
                "Solicitud registrada. No se pudo calcular tu evaluación automática "
                "(falta información de ingresos); un asesor la revisará manualmente."
            )
        else:
            raise

    return SolicitudCreditoOut(
        codsolicitud=codsolicitud,
        estado=estado_final,
        mensaje=mensaje_final,
    )
