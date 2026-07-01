"""
cfg_auth.py — Dependencias FastAPI que extraen el JWT del header Authorization,
lo validan y exigen el tipo de token correcto: "cliente" (homebanking) o
"admin" (personal interno / panel de administración).
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.cfg_security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_admin = OAuth2PasswordBearer(tokenUrl="/admin/auth/login")


class ClienteToken:
    """Representa el payload del token validado para un cliente de homebanking."""

    def __init__(self, codcliente: str, pkcliente: int, nombre: str):
        self.codcliente = codcliente
        self.pkcliente = pkcliente
        self.nombre = nombre


class AdminToken:
    """Representa el payload del token validado para un usuario del panel admin."""

    def __init__(self, pkusuarioadmin: int, username: str, nombre: str, rol: str,
                 pkagencia: int | None = None):
        self.pkusuarioadmin = pkusuarioadmin
        self.username = username
        self.nombre = nombre
        self.rol = rol
        self.pkagencia = pkagencia


def get_cliente(token: str = Depends(oauth2_scheme)) -> ClienteToken:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    if payload.get("tipo") != "cliente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El token no corresponde a un cliente de homebanking",
        )

    codcliente = payload.get("sub")
    pkcliente = payload.get("pkcliente")
    nombre = payload.get("nombre")

    if codcliente is None or pkcliente is None:
        raise credentials_exception

    return ClienteToken(codcliente=codcliente, pkcliente=pkcliente, nombre=nombre)


def get_admin(token: str = Depends(oauth2_scheme_admin)) -> AdminToken:
    """Valida el JWT del panel de administración y exige tipo == 'admin'."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    if payload.get("tipo") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El token no corresponde a un usuario del panel de administración",
        )

    pkusuarioadmin = payload.get("pkusuarioadmin")
    username = payload.get("sub")
    nombre = payload.get("nombre")
    rol = payload.get("rol", "ANALISTA")
    pkagencia = payload.get("pkagencia")

    if pkusuarioadmin is None or username is None:
        raise credentials_exception

    return AdminToken(pkusuarioadmin=pkusuarioadmin, username=username, nombre=nombre, rol=rol,
                       pkagencia=pkagencia)


# ---------------------------------------------------------------------------
# RBAC — Control de acceso por rol (back-office)
# ---------------------------------------------------------------------------
# Roles soportados por el panel de Caja Paita / Core financiero:
#   ASESOR        -> registra/deriva solicitudes, atiende clientes en agencia
#   ADMIN         -> opinión de admisión sobre solicitudes (monto bajo/medio)
#   JEFE_RIESGOS  -> opinión de riesgos, define RDS y resuelve mora Judicial/Castigo
#   COMITE        -> resuelve solicitudes que superan el umbral de comité
#   GERENCIA      -> visión consolidada, reportes, puede ver todo (solo lectura
#                    salvo que también se le otorgue rol operativo)
#   ANALISTA      -> rol heredado de back-compat, equivalente a ASESOR (lectura/registro)
ROLES_ADMIN = {"ASESOR", "ADMIN", "JEFE_RIESGOS", "COMITE", "GERENCIA", "ANALISTA"}


def require_role(*roles_permitidos: str):
    """
    Dependencia FastAPI que exige que el admin autenticado tenga uno de los
    roles indicados. Devuelve 403 si el rol no corresponde, dejando explícito
    en el detalle qué rol sí está habilitado para la acción.

    Uso:
        @router.patch("/...", dependencies=[Depends(require_role("JEFE_RIESGOS", "COMITE"))])
    """

    def _checker(admin: AdminToken = Depends(get_admin)) -> AdminToken:
        if admin.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Tu rol ({admin.rol}) no tiene permiso para esta acción. "
                    f"Roles habilitados: {', '.join(roles_permitidos)}."
                ),
            )
        return admin

    return _checker
