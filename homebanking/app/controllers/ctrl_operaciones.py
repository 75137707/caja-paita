"""
ctrl_operaciones.py — Orquestación de operaciones financieras:
pago de cuota de crédito y transferencia entre cuentas propias del cliente.

Reglas técnicas respetadas (ver doc original):
  1. foperaciones: codtipkar, codkardex único, codtipoegresoingreso, periododia (FK dtiempo),
     pkconceptooperacion, pktipooperacion, pkmoneda, pkagenciaorigen, montooperacion,
     montopagoconcepto son NOT NULL. PK por autoincremento (reemplaza nextval en MySQL).
  2. periododia debe existir en dtiempo.
  3. Catálogos resueltos siempre por código, nunca hardcodeados.
"""
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import repo_ahorro, repo_credito, repo_operaciones
from app.schemas.sch_operaciones import (
    PagoCuotaRequest, PagoCuotaResponse, TransferenciaRequest, TransferenciaResponse,
)


def _validar_periododia_hoy(db: Session) -> int:
    periododia = repo_operaciones.hoy_periododia()
    if not repo_operaciones.verificar_periododia_existe(db, periododia):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"La fecha actual ({periododia}) no existe en el calendario dtiempo. "
                   f"Contacte a soporte para extender el calendario."
        )
    return periododia


def pagar_cuota(db: Session, pkcliente: int, payload: PagoCuotaRequest) -> PagoCuotaResponse:
    # 1. Verificar pertenencia del crédito y la cuenta de ahorro origen
    credito = repo_credito.obtener_credito_de_cliente(db, payload.pkcuentacredito, pkcliente)
    if credito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="El crédito no existe o no pertenece al cliente")

    cuenta_origen = repo_ahorro.obtener_cuenta_ahorro_de_cliente(
        db, payload.pkcuentaahorro_origen, pkcliente)
    if cuenta_origen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="La cuenta de ahorro origen no existe o no pertenece al cliente")

    if cuenta_origen["estado"] != "ACTIVA":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="La cuenta de ahorro origen no está activa")

    # 2. Buscar próxima cuota pendiente
    cuota = repo_credito.obtener_proxima_cuota_pendiente(db, payload.pkcuentacredito)
    if cuota is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="No hay cuotas pendientes para este crédito")

    monto_capital_pendiente = Decimal(str(cuota["montocapital"])) - Decimal(str(cuota["montocapitalpagado"]))
    monto_interes_pendiente = Decimal(str(cuota["montointeres"])) - Decimal(str(cuota["montointerespagado"]))
    monto_total_cuota = monto_capital_pendiente + monto_interes_pendiente

    saldo_disponible = Decimal(str(cuenta_origen["saldodisponible"]))
    if saldo_disponible < monto_total_cuota:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail=f"Saldo insuficiente. Disponible: {saldo_disponible}, "
                                    f"requerido: {monto_total_cuota}")

    # 3. Resolver catálogos por código (regla obligatoria: nunca hardcodear PKs)
    periododia = _validar_periododia_hoy(db)
    pkconcepto = repo_operaciones.pk_conceptooperacion(db, "PCAP")
    pktipoop = repo_operaciones.pk_tipooperacion(db, "PAG")
    pkmediopago = repo_operaciones.pk_mediopago(db, payload.canal.upper())
    pkcanal = repo_operaciones.pk_canaltransaccional(db, payload.canal.upper())
    pkcondcontable = repo_operaciones.pk_condicioncontable(db, "01")
    pkagencia = repo_operaciones.pk_agencia_de_cuenta_ahorro(db, payload.pkcuentaahorro_origen)

    if any(v is None for v in [pkconcepto, pktipoop, pkmediopago, pkcanal, pkcondcontable, pkagencia]):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="Catálogo incompleto: verifique dconceptooperacion, "
                                    "dtipooperacion, dmediopago, dcanaltransaccional o dcondicioncontable")

    codkardex = f"PAG-{payload.pkcuentacredito}-{cuota['nrocuota']}-{periododia}"
    if repo_operaciones.existe_codkardex(db, codkardex):
        codkardex = f"{codkardex}-{cuota['pkplanpago']}"

    try:
        # 4. Insertar operación (egreso de la cuenta de ahorro)
        repo_operaciones.insertar_operacion(
            db,
            codtipkar="DB",
            codkardex=codkardex,
            codtipoegresoingreso="E",
            periododia=periododia,
            pkconceptooperacion=pkconcepto,
            pktipooperacion=pktipoop,
            pkmoneda=cuenta_origen["pkmoneda"],
            pkagenciaorigen=pkagencia,
            montooperacion=monto_total_cuota,
            montopagoconcepto=monto_total_cuota,
            pkcuentaahorroorigen=payload.pkcuentaahorro_origen,
            pkcuentacredito=payload.pkcuentacredito,
            pkcliente=pkcliente,
            pkmediopago=pkmediopago,
            pkcanal=pkcanal,
            pkcondicioncontable=pkcondcontable,
            glosa=f"Pago de cuota {cuota['nrocuota']} - credito {credito['codcuenta']}",
        )

        # 5. Marcar cuota como pagada
        repo_credito.marcar_cuota_pagada(db, cuota["pkplanpago"], monto_capital_pendiente,
                                          monto_interes_pendiente)

        # 6. Actualizar saldo de la cuenta de ahorro
        nuevo_saldo_cuenta = saldo_disponible - monto_total_cuota
        repo_ahorro.actualizar_saldo_cuenta(db, payload.pkcuentaahorro_origen, periododia,
                                             nuevo_saldo_cuenta)

        # 7. Recalcular saldo de capital y pago pendiente del crédito
        cuotas_restantes = repo_credito.listar_cuotas_credito(db, payload.pkcuentacredito)
        nuevo_saldo_capital = sum(
            Decimal(str(c["monto_capital"])) - Decimal(str(c["capital_pagado"]))
            for c in cuotas_restantes
        )
        nuevo_pago_pendiente = sum(
            (Decimal(str(c["monto_capital"])) - Decimal(str(c["capital_pagado"]))) +
            (Decimal(str(c["monto_interes"])) - Decimal(str(c["interes_pagado"])))
            for c in cuotas_restantes if c["estado"] != "PAGADA"
        )
        repo_credito.actualizar_saldo_credito(db, payload.pkcuentacredito, periododia,
                                               nuevo_saldo_capital, nuevo_pago_pendiente)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail=f"Error al procesar el pago: {exc}")

    return PagoCuotaResponse(
        mensaje="Pago de cuota procesado correctamente",
        nrocuota=cuota["nrocuota"],
        monto_pagado=monto_total_cuota,
        codkardex=codkardex,
        saldo_restante_cuenta=nuevo_saldo_cuenta,
    )


def transferir(db: Session, pkcliente: int, payload: TransferenciaRequest) -> TransferenciaResponse:
    if payload.pkcuentaahorro_origen == payload.pkcuentaahorro_destino:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="La cuenta origen y destino no pueden ser la misma")

    cuenta_origen = repo_ahorro.obtener_cuenta_ahorro_de_cliente(
        db, payload.pkcuentaahorro_origen, pkcliente)
    if cuenta_origen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="La cuenta origen no existe o no pertenece al cliente")

    # La cuenta destino debe ser también una cuenta PROPIA del cliente (transferencia entre
    # cuentas propias, según especificación)
    cuenta_destino = repo_ahorro.obtener_cuenta_ahorro_de_cliente(
        db, payload.pkcuentaahorro_destino, pkcliente)
    if cuenta_destino is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="La cuenta destino no existe o no pertenece al cliente")

    if cuenta_origen["estado"] != "ACTIVA" or cuenta_destino["estado"] != "ACTIVA":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Ambas cuentas deben estar activas")

    if cuenta_origen["pkmoneda"] != cuenta_destino["pkmoneda"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="No se permite transferir entre cuentas de distinta moneda")

    saldo_origen = Decimal(str(cuenta_origen["saldodisponible"]))
    if saldo_origen < payload.monto:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail=f"Saldo insuficiente. Disponible: {saldo_origen}")

    periododia = _validar_periododia_hoy(db)
    pkconcepto = repo_operaciones.pk_conceptooperacion(db, "TRAN")
    pktipoop = repo_operaciones.pk_tipooperacion(db, "TRF")
    pkmediopago = repo_operaciones.pk_mediopago(db, payload.canal.upper())
    pkcanal = repo_operaciones.pk_canaltransaccional(db, payload.canal.upper())
    pkcondcontable = repo_operaciones.pk_condicioncontable(db, "01")
    pkagencia_origen = repo_operaciones.pk_agencia_de_cuenta_ahorro(db, payload.pkcuentaahorro_origen)
    pkagencia_destino = repo_operaciones.pk_agencia_de_cuenta_ahorro(db, payload.pkcuentaahorro_destino)

    if any(v is None for v in [pkconcepto, pktipoop, pkmediopago, pkcanal, pkcondcontable,
                                pkagencia_origen]):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="Catálogo incompleto para procesar la transferencia")

    glosa = payload.glosa or "Transferencia entre cuentas propias"
    codkardex_debito = f"TRF-DB-{payload.pkcuentaahorro_origen}-{payload.pkcuentaahorro_destino}-{periododia}"
    codkardex_credito = f"TRF-CR-{payload.pkcuentaahorro_origen}-{payload.pkcuentaahorro_destino}-{periododia}"

    sufijo = 1
    base_db, base_cr = codkardex_debito, codkardex_credito
    while repo_operaciones.existe_codkardex(db, codkardex_debito) or \
            repo_operaciones.existe_codkardex(db, codkardex_credito):
        codkardex_debito = f"{base_db}-{sufijo}"
        codkardex_credito = f"{base_cr}-{sufijo}"
        sufijo += 1

    try:
        # Fila de DÉBITO: vista desde la cuenta origen (egreso). Solo referenciamos
        # la cuenta destino en el campo "destino" para trazabilidad de la contraparte,
        # pero el movimiento de listado se filtra/interpreta por pkcuentaahorroorigen aquí.
        repo_operaciones.insertar_operacion(
            db,
            codtipkar="DB",
            codkardex=codkardex_debito,
            codtipoegresoingreso="E",
            periododia=periododia,
            pkconceptooperacion=pkconcepto,
            pktipooperacion=pktipoop,
            pkmoneda=cuenta_origen["pkmoneda"],
            pkagenciaorigen=pkagencia_origen,
            pkagenciadestino=pkagencia_destino,
            montooperacion=payload.monto,
            montopagoconcepto=payload.monto,
            pkcuentaahorroorigen=payload.pkcuentaahorro_origen,
            pkcuentaahorrodestino=None,
            pkcliente=pkcliente,
            pkmediopago=pkmediopago,
            pkcanal=pkcanal,
            pkcondicioncontable=pkcondcontable,
            glosa=glosa,
        )
        # Fila de CRÉDITO: vista desde la cuenta destino (ingreso).
        repo_operaciones.insertar_operacion(
            db,
            codtipkar="CR",
            codkardex=codkardex_credito,
            codtipoegresoingreso="I",
            periododia=periododia,
            pkconceptooperacion=pkconcepto,
            pktipooperacion=pktipoop,
            pkmoneda=cuenta_destino["pkmoneda"],
            pkagenciaorigen=pkagencia_destino,
            pkagenciadestino=pkagencia_origen,
            montooperacion=payload.monto,
            montopagoconcepto=payload.monto,
            pkcuentaahorroorigen=payload.pkcuentaahorro_destino,
            pkcuentaahorrodestino=None,
            pkcliente=pkcliente,
            pkmediopago=pkmediopago,
            pkcanal=pkcanal,
            pkcondicioncontable=pkcondcontable,
            glosa=glosa,
        )

        nuevo_saldo_origen = saldo_origen - payload.monto
        nuevo_saldo_destino = Decimal(str(cuenta_destino["saldodisponible"])) + payload.monto

        repo_ahorro.actualizar_saldo_cuenta(db, payload.pkcuentaahorro_origen, periododia,
                                             nuevo_saldo_origen)
        repo_ahorro.actualizar_saldo_cuenta(db, payload.pkcuentaahorro_destino, periododia,
                                             nuevo_saldo_destino)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail=f"Error al procesar la transferencia: {exc}")

    return TransferenciaResponse(
        mensaje="Transferencia procesada correctamente",
        codkardex_debito=codkardex_debito,
        codkardex_credito=codkardex_credito,
        saldo_origen=nuevo_saldo_origen,
        saldo_destino=nuevo_saldo_destino,
    )
