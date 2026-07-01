"""
ctrl_admin.py — Orquestación de autenticación admin, dashboard, gestión de
solicitudes de crédito, clientes y operaciones para el panel administrador.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cfg_config import settings
from app.core.cfg_auth import AdminToken
from app.core.cfg_security import verify_password, create_access_token
from app.controllers import ctrl_reglas
from app.repositories import repo_admin
from app.schemas.sch_admin import (
    AdminLoginRequest, AdminLoginResponse, DashboardOut,
    CambiarEstadoSolicitudRequest, CambiarEstadoSolicitudOut,
)

ESTADOS_VALIDOS = {"1", "2", "3", "4"}  # En Evaluación / Aprobado / Rechazado / Desembolsado


# ---------------------------------------------------------------------------
# Autenticación
# ---------------------------------------------------------------------------
def login_admin(db: Session, payload: AdminLoginRequest) -> AdminLoginResponse:
    usuario = repo_admin.obtener_usuario_admin_por_username(db, payload.username.lower())

    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                             detail="Usuario o contraseña incorrectos")

    if usuario["bloqueado"]:
        raise HTTPException(status_code=status.HTTP_423_LOCKED,
                             detail="Usuario bloqueado por intentos fallidos. Contacte al área de TI.")

    if not usuario["activo"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    if not verify_password(payload.password, usuario["password_hash"]):
        nuevos_intentos = usuario["intentos_fallidos"] + 1
        bloquear = nuevos_intentos >= settings.MAX_INTENTOS_FALLIDOS
        repo_admin.incrementar_intentos_fallidos_admin(db, usuario["pkusuarioadmin"], bloquear)
        if bloquear:
            raise HTTPException(status_code=status.HTTP_423_LOCKED,
                                 detail="Usuario bloqueado por exceder intentos fallidos.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                             detail="Usuario o contraseña incorrectos")

    repo_admin.reset_intentos_y_marcar_acceso_admin(db, usuario["pkusuarioadmin"])

    nombre_completo = f"{usuario['nombres']} {usuario['apellidos']}"
    token = create_access_token({
        "sub": usuario["username"],
        "tipo": "admin",
        "pkusuarioadmin": usuario["pkusuarioadmin"],
        "nombre": nombre_completo,
        "rol": usuario["rol"],
        "pkagencia": usuario["pkagencia"],
    }, expires_minutes=settings.JWT_EXPIRE_MINUTES_ADMIN)

    return AdminLoginResponse(
        access_token=token,
        username=usuario["username"],
        nombre=nombre_completo,
        rol=usuario["rol"],
        expires_in_minutes=settings.JWT_EXPIRE_MINUTES_ADMIN,
    )


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
def obtener_dashboard(db: Session) -> DashboardOut:
    return DashboardOut(
        kpis=repo_admin.kpis_generales(db),
        solicitudes_por_estado=repo_admin.solicitudes_por_estado(db),
        solicitudes_recientes=repo_admin.solicitudes_recientes(db, limite=8),
        operaciones_recientes=repo_admin.operaciones_recientes(db, limite=8),
    )


# ---------------------------------------------------------------------------
# Solicitudes de crédito
# ---------------------------------------------------------------------------
def obtener_solicitudes(db: Session, estado: str | None, q: str | None, limite: int, offset: int):
    items, total = repo_admin.listar_solicitudes(db, estado=estado, q=q, limite=limite, offset=offset)
    return {"items": items, "total": total, "limite": limite, "offset": offset}


def obtener_solicitud(db: Session, pksolicitud: int):
    detalle = repo_admin.obtener_solicitud_detalle(db, pksolicitud)
    if detalle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return detalle


def cambiar_estado_solicitud(db: Session, pksolicitud: int, admin: AdminToken,
                              payload: CambiarEstadoSolicitudRequest) -> CambiarEstadoSolicitudOut:
    if payload.codestado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Código de estado inválido")

    detalle = repo_admin.obtener_solicitud_detalle(db, pksolicitud)
    if detalle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    if detalle["codestado"] in {"3", "4"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La solicitud ya está '{detalle['estado']}' y no puede modificarse",
        )

    # Blindaje RBAC dinámico (Criterio 2 + Criterio 3): el rol que puede
    # resolver esta solicitud depende del ESTADO en que la dejó el motor de
    # reglas, no solo del rol genérico habilitado en la ruta. Una solicitud
    # en 'Opinión Riesgos Pendiente' (5) solo la resuelve JEFE_RIESGOS; una
    # en 'En Comité' (6) solo COMITE. Esto evita que un ADMIN se salte la
    # instancia de Riesgos/Comité a la que el motor ya derivó el caso.
    ctrl_reglas.validar_resolucion_por_rol(admin, detalle["codestado"])

    # El desembolso (codestado "4") es una operación de integración real que
    # crea la cuenta de crédito y su cronograma; se delega a una función
    # dedicada porque exige una transacción atómica de varias tablas y una
    # regla de negocio adicional (solo se desembolsa lo ya Aprobado).
    if payload.codestado == "4":
        return desembolsar_credito(db, pksolicitud, admin.pkusuarioadmin, detalle, payload.comentario)

    pkestado_nuevo = repo_admin.obtener_pk_estadosolicitud_por_codigo(db, payload.codestado)
    if pkestado_nuevo is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="Estado destino no encontrado en catálogo")

    try:
        repo_admin.actualizar_estado_solicitud(
            db, pksolicitud=pksolicitud, pkestadosolicitud=pkestado_nuevo,
            pkusuarioadmin=admin.pkusuarioadmin, comentario=payload.comentario,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="No se pudo actualizar el estado de la solicitud")

    nombres_estado = {"1": "En Evaluación", "2": "Aprobado", "3": "Rechazado"}
    estado_nombre = nombres_estado[payload.codestado]
    mensajes = {
        "2": "Solicitud aprobada correctamente.",
        "3": "Solicitud rechazada.",
    }
    return CambiarEstadoSolicitudOut(
        pksolicitud=pksolicitud,
        codsolicitud=detalle["codsolicitud"],
        estado=estado_nombre,
        mensaje=mensajes.get(payload.codestado, "Estado actualizado."),
    )


# ---------------------------------------------------------------------------
# Desembolso de crédito — integración real Solicitud -> Core (Criterio 1)
#
# Regla de negocio: solo se puede desembolsar una solicitud que ya esté en
# estado "Aprobado" (codestado "2"). Esto evita que se desembolse un crédito
# que nunca pasó por la opinión de admisión/riesgos/comité correspondiente.
#
# Transacción atómica: las 4 escrituras (dsolicitud, dcuentacredito,
# fagcuentacredito, fplanpagomes) se ejecutan sobre la misma sesión sin
# commits intermedios; si cualquier paso falla, se hace rollback de todo y
# no queda ningún registro a medias.
# ---------------------------------------------------------------------------
def desembolsar_credito(db: Session, pksolicitud: int, pkusuarioadmin: int,
                         detalle: dict, comentario: str | None) -> CambiarEstadoSolicitudOut:
    if detalle["codestado"] != "2":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Solo se puede desembolsar una solicitud que ya esté 'Aprobada'. "
                f"Estado actual: '{detalle['estado']}'."
            ),
        )

    from datetime import date

    monto = float(detalle["montosolicitado"])
    plazo = int(detalle["plazomeses"])
    tasa_anual = float(detalle["tasa_interes_anual"])
    pkcliente = detalle["pkcliente"]

    if monto <= 0 or plazo <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Monto o plazo inválidos en la solicitud original.")

    pkmoneda = repo_admin.obtener_pkmoneda_por_codigo(db, "PEN")
    if pkmoneda is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="No se encontró la moneda PEN en catálogo.")

    pkagencia = repo_admin.obtener_pkagencia_cliente(db, pkcliente)
    if pkagencia is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="El cliente no tiene una agencia asignada; no se puede desembolsar.")

    try:
        fecha_desembolso = date.today()
        periododia_desembolso = repo_admin.periododia_valido_mas_cercano(db, fecha_desembolso)

        siguiente = repo_admin.siguiente_numero_cuenta_credito(db) + 1
        codcuenta = f"CRE-{siguiente:06d}"

        # 1) Crear la cuenta de crédito real, asociada al cliente y al mismo
        #    tipo de producto/tasa con el que se evaluó la solicitud.
        pkcuentacredito = repo_admin.insertar_cuenta_credito(
            db, codcuenta=codcuenta, pkcliente=pkcliente,
            pktipoproductocredito=detalle["pktipoproductocredito"],
            pkmoneda=pkmoneda, pkagencia=pkagencia,
            montodesembolsado=monto, plazomeses=plazo,
            tasainteresanual=tasa_anual, fechadesembolso=fecha_desembolso,
        )

        # 2) Cronograma de amortización francesa (cuota fija), misma fórmula
        #    usada en sql/02_seed_data.py para mantener consistencia matemática
        #    entre los créditos sintéticos y los desembolsados en vivo.
        cuota_capital_base = round(monto / plazo, 2)
        tasa_mensual = tasa_anual / 12
        saldo_restante = monto
        filas_plan = []

        for nro in range(1, plazo + 1):
            vencimiento = date(
                fecha_desembolso.year + (fecha_desembolso.month - 1 + nro) // 12,
                (fecha_desembolso.month - 1 + nro) % 12 + 1,
                min(fecha_desembolso.day, 28),
            )
            interes = round(saldo_restante * tasa_mensual, 2)
            capital_cuota = cuota_capital_base if nro < plazo else round(saldo_restante, 2)
            cuota_total = round(capital_cuota + interes, 2)
            saldo_restante = round(saldo_restante - capital_cuota, 2)

            periododia_venc = repo_admin.periododia_valido_mas_cercano(db, vencimiento)
            filas_plan.append({
                "pkcuentacredito": pkcuentacredito,
                "nrocuota": nro,
                "periododiavencimiento": periododia_venc,
                "montocapital": capital_cuota,
                "montointeres": interes,
                "montocuota": cuota_total,
            })

        repo_admin.insertar_plan_pagos(db, filas_plan)

        # 3) Saldo inicial del crédito al día de hoy: capital pendiente = monto
        #    desembolsado completo, pago_pendiente = suma de todas las cuotas.
        pago_pendiente_total = sum(f["montocuota"] for f in filas_plan)
        repo_admin.insertar_fagcuentacredito_inicial(
            db, pkcuentacredito=pkcuentacredito, periododia=periododia_desembolso,
            saldocapital=monto, pagopendiente=round(pago_pendiente_total, 2),
        )

        # 4) Por último, actualizar la solicitud a 'Desembolsado'.
        pkestado_desembolsado = repo_admin.obtener_pk_estadosolicitud_por_codigo(db, "4")
        repo_admin.actualizar_estado_solicitud(
            db, pksolicitud=pksolicitud, pkestadosolicitud=pkestado_desembolsado,
            pkusuarioadmin=pkusuarioadmin, comentario=comentario,
        )

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar el desembolso. No se realizó ningún cambio (rollback aplicado).",
        )

    return CambiarEstadoSolicitudOut(
        pksolicitud=pksolicitud,
        codsolicitud=detalle["codsolicitud"],
        estado="Desembolsado",
        mensaje=(
            f"Crédito {codcuenta} desembolsado correctamente por {monto:.2f} PEN "
            f"a {plazo} meses. Ya está disponible en la Caja Virtual del cliente."
        ),
    )


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------
def obtener_clientes(db: Session, q: str | None, limite: int, offset: int):
    items, total = repo_admin.listar_clientes(db, q=q, limite=limite, offset=offset)
    return {"items": items, "total": total, "limite": limite, "offset": offset}


def obtener_cliente(db: Session, pkcliente: int):
    detalle = repo_admin.obtener_cliente_detalle(db, pkcliente)
    if detalle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return detalle


# ---------------------------------------------------------------------------
# Operaciones
# ---------------------------------------------------------------------------
def obtener_operaciones(db: Session, q: str | None, limite: int, offset: int):
    items, total = repo_admin.listar_operaciones(db, q=q, limite=limite, offset=offset)
    return {"items": items, "total": total, "limite": limite, "offset": offset}


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------
def obtener_reportes(db: Session):
    return {
        "creditos_por_producto": repo_admin.reporte_creditos_por_producto(db),
        "solicitudes_por_mes": repo_admin.reporte_solicitudes_por_mes(db, meses=6),
        "cartera_por_agencia": repo_admin.reporte_cartera_por_agencia(db),
        "morosidad": repo_admin.reporte_morosidad(db),
    }
