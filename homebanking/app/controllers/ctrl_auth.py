"""
ctrl_auth.py — Orquestación de login y autoregistro: valida credenciales,
maneja bloqueo por intentos fallidos, emite el JWT del cliente y permite
que un cliente ya existente en el core (dcliente) cree sus credenciales
de Caja Virtual por primera vez.
"""
import re

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cfg_config import settings
from app.core.cfg_security import verify_password, hash_password, create_access_token
from app.repositories import repo_auth
from app.schemas.sch_auth import (
    LoginRequest,
    LoginResponse,
    RegistroRequest,
    RegistroResponse,
    VerificarClienteRequest,
    VerificarClienteResponse,
    AperturaClienteRequest,
    AperturaClienteResponse,
)


def login_cliente(db: Session, payload: LoginRequest) -> LoginResponse:
    usuario = repo_auth.obtener_usuario_homebanking_por_username(db, payload.username.lower())

    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario o contraseña incorrectos")

    if usuario["bloqueado"]:
        raise HTTPException(status_code=status.HTTP_423_LOCKED,
                            detail="Usuario bloqueado por intentos fallidos. Contacte a su agencia.")

    if not usuario["activo"] or not usuario["cliente_activo"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Usuario inactivo")

    if not verify_password(payload.password, usuario["password_hash"]):
        nuevos_intentos = usuario["intentos_fallidos"] + 1
        bloquear = nuevos_intentos >= settings.MAX_INTENTOS_FALLIDOS
        repo_auth.incrementar_intentos_fallidos(db, usuario["pkusuario"], bloquear)
        if bloquear:
            raise HTTPException(status_code=status.HTTP_423_LOCKED,
                                detail="Usuario bloqueado por exceder intentos fallidos.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario o contraseña incorrectos")

    # Login correcto: resetear intentos y marcar acceso
    repo_auth.reset_intentos_y_marcar_acceso(db, usuario["pkusuario"])

    nombre_completo = f"{usuario['nombres']} {usuario['apellidopaterno']} {usuario['apellidomaterno']}"
    token = create_access_token({
        "sub": usuario["codcliente"],
        "tipo": "cliente",
        "pkcliente": usuario["pkcliente"],
        "nombre": nombre_completo,
    })

    return LoginResponse(
        access_token=token,
        codcliente=usuario["codcliente"],
        nombre=nombre_completo,
        expires_in_minutes=settings.JWT_EXPIRE_MINUTES,
    )


# ---------------------------------------------------------------------------
# Autoregistro a Caja Virtual
# ---------------------------------------------------------------------------
def _enmascarar_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    usuario, dominio = email.split("@", 1)
    if len(usuario) <= 2:
        oculto = usuario[0] + "*"
    else:
        oculto = usuario[0] + "*" * (len(usuario) - 2) + usuario[-1]
    return f"{oculto}@{dominio}"


def verificar_elegibilidad(db: Session, payload: VerificarClienteRequest) -> VerificarClienteResponse:
    """
    Primer paso del autoregistro: confirma (sin exponer datos sensibles)
    si el documento corresponde a un cliente activo del banco que todavía
    no tiene credenciales de Caja Virtual.
    """
    cliente = repo_auth.obtener_cliente_por_documento(
        db, payload.tipodocumento.upper(), payload.numerodocumento
    )

    if cliente is None:
        return VerificarClienteResponse(
            elegible=False,
            motivo="No encontramos un cliente de Caja Paita con ese documento. "
                   "Si ya eres cliente, verifica el número o acércate a una agencia.",
        )

    if not cliente["activo"]:
        return VerificarClienteResponse(
            elegible=False,
            motivo="Tu cuenta de cliente se encuentra inactiva. Acércate a una agencia de Caja Paita.",
        )

    usuario_existente = repo_auth.obtener_usuario_homebanking_por_pkcliente(db, cliente["pkcliente"])
    if usuario_existente is not None:
        return VerificarClienteResponse(
            elegible=False,
            motivo=f"Ya tienes un usuario de Caja Virtual ({usuario_existente['username']}). "
                   "Inicia sesión o usa la opción de recuperar contraseña.",
        )

    nombres_completos = f"{cliente['nombres']} {cliente['apellidopaterno']}"
    return VerificarClienteResponse(
        elegible=True,
        nombres=nombres_completos,
        codcliente=cliente["codcliente"],
        email_parcial=_enmascarar_email(cliente.get("email")),
    )


_PASSWORD_REGEX = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def registrar_cliente(db: Session, payload: RegistroRequest) -> RegistroResponse:
    if not _PASSWORD_REGEX.match(payload.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 8 caracteres, con letras y números.",
        )

    cliente = repo_auth.obtener_cliente_por_documento(
        db, payload.tipodocumento.upper(), payload.numerodocumento
    )
    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No encontramos un cliente de Caja Paita con ese documento.",
        )

    if not cliente["activo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta de cliente se encuentra inactiva. Acércate a una agencia de Caja Paita.",
        )

    if repo_auth.obtener_usuario_homebanking_por_pkcliente(db, cliente["pkcliente"]) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este cliente ya cuenta con un usuario de Caja Virtual. Inicia sesión.",
        )

    username = cliente["codcliente"].lower()
    password_hash = hash_password(payload.password)
    repo_auth.crear_usuario_homebanking(db, cliente["pkcliente"], username, password_hash)

    return RegistroResponse(
        mensaje="¡Listo! Tu usuario de Caja Virtual fue creado correctamente.",
        codcliente=cliente["codcliente"],
        username=username,
    )


# ---------------------------------------------------------------------------
# Apertura de cuenta — cliente totalmente NUEVO
# ---------------------------------------------------------------------------
def aperturar_cliente(db: Session, payload: AperturaClienteRequest) -> AperturaClienteResponse:
    """
    Crea un cliente desde cero (sin relación previa con el banco): alta en
    dcliente, registro de ingresos, cuenta de Ahorro Corriente inicial y
    credenciales de Caja Virtual. Equivale a una apertura de cuenta
    presencial, hecha de punta a punta por Caja Virtual.

    Todo se ejecuta en una sola transacción: si cualquier paso falla, se
    revierte por completo y no queda un cliente "a medias" sin cuenta o
    sin acceso.
    """
    if not _PASSWORD_REGEX.match(payload.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 8 caracteres, con letras y números.",
        )

    tipodocumento = payload.tipodocumento.upper()
    existente = repo_auth.obtener_cliente_por_tipo_y_numero_documento(
        db, tipodocumento, payload.numerodocumento
    )
    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un cliente registrado con ese documento. "
                   "Si ya eres cliente, inicia sesión o activa tu acceso desde "
                   "'Soy cliente nuevo, crear mi acceso'.",
        )

    try:
        from datetime import date
        fecha_nac = date.fromisoformat(payload.fechanacimiento)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Fecha de nacimiento inválida. Usa el formato AAAA-MM-DD.",
        )

    agencia = repo_auth.obtener_agencia_principal(db)
    if agencia is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="No hay agencias activas configuradas.")

    producto_ahorro = repo_auth.obtener_tipoproductoahorro_por_codigo(db, "AHC")
    if producto_ahorro is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="El producto de Ahorro Corriente no está configurado.")

    pkmoneda = repo_auth.obtener_pkmoneda_por_codigo(db, "PEN")
    if pkmoneda is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                             detail="La moneda PEN no está configurada.")

    try:
        codcliente = repo_auth.siguiente_codcliente(db)
        pkcliente = repo_auth.crear_cliente_nuevo(
            db,
            codcliente=codcliente,
            tipodocumento=tipodocumento,
            numerodocumento=payload.numerodocumento,
            nombres=payload.nombres.strip(),
            apellidopaterno=payload.apellidopaterno.strip(),
            apellidomaterno=payload.apellidomaterno.strip(),
            fechanacimiento=fecha_nac,
            sexo=payload.sexo,
            email=payload.email.strip(),
            telefono=payload.telefono,
            direccion=payload.direccion.strip(),
            pkagencia=agencia["pkagencia"],
        )

        repo_auth.crear_fuente_ingreso(db, pkcliente, payload.ingresomensual, payload.fuenteingreso.strip())

        codcuenta = repo_auth.siguiente_codcuenta_ahorro(db)
        repo_auth.crear_cuenta_ahorro_apertura(
            db,
            codcuenta=codcuenta,
            pkcliente=pkcliente,
            pktipoproductoahorro=producto_ahorro["pktipoproductoahorro"],
            pkmoneda=pkmoneda,
            pkagencia=agencia["pkagencia"],
        )

        username = codcliente.lower()
        password_hash = hash_password(payload.password)
        repo_auth.crear_usuario_homebanking(db, pkcliente, username, password_hash)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar la apertura de tu cuenta. Intenta nuevamente.",
        )

    return AperturaClienteResponse(
        mensaje="¡Bienvenido(a) a Caja Paita! Tu cuenta fue aperturada correctamente.",
        codcliente=codcliente,
        username=username,
        nro_cuenta_ahorro=codcuenta,
        agencia=agencia["nombre"],
    )