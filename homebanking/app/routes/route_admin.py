from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.controllers import ctrl_admin, ctrl_reglas
from app.core.cfg_auth import get_admin, require_role, AdminToken
from app.core.cfg_database import get_db
from app.schemas.sch_admin import (
    AdminLoginRequest, AdminLoginResponse, DashboardOut,
    SolicitudListOut, SolicitudDetalleOut,
    CambiarEstadoSolicitudRequest, CambiarEstadoSolicitudOut,
    ClienteListOut, ClienteDetalleOut,
    OperacionListOut, ReportesOut,
)
from app.schemas.sch_reglas import EvaluacionSolicitudOut

router_admin_auth = APIRouter(prefix="/admin/auth", tags=["Admin · Autenticación"])
router_admin_dashboard = APIRouter(prefix="/admin/dashboard", tags=["Admin · Dashboard"])
router_admin_solicitudes = APIRouter(prefix="/admin/solicitudes", tags=["Admin · Solicitudes de Crédito"])
router_admin_clientes = APIRouter(prefix="/admin/clientes", tags=["Admin · Clientes"])
router_admin_operaciones = APIRouter(prefix="/admin/operaciones", tags=["Admin · Operaciones"])
router_admin_reportes = APIRouter(prefix="/admin/reportes", tags=["Admin · Reportes"])


# ---------------------------------------------------------------------------
# Autenticación
# ---------------------------------------------------------------------------
@router_admin_auth.post("/login", response_model=AdminLoginResponse)
def login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    """Login de un usuario administrador (back-office)."""
    return ctrl_admin.login_admin(db, payload)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router_admin_dashboard.get("/", response_model=DashboardOut)
def dashboard(
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """KPIs generales, solicitudes por estado, últimas solicitudes y operaciones."""
    return ctrl_admin.obtener_dashboard(db)


# ---------------------------------------------------------------------------
# Solicitudes de crédito
# ---------------------------------------------------------------------------
@router_admin_solicitudes.get("/", response_model=SolicitudListOut)
def listar_solicitudes(
    estado: str | None = Query(None, description="Código de estado: 1,2,3,4"),
    q: str | None = Query(None, description="Buscar por nombre, código de cliente o solicitud"),
    limite: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Lista las solicitudes de crédito de todos los clientes, con filtros."""
    return ctrl_admin.obtener_solicitudes(db, estado=estado, q=q, limite=limite, offset=offset)


@router_admin_solicitudes.get("/{pksolicitud}", response_model=SolicitudDetalleOut)
def detalle_solicitud(
    pksolicitud: int,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Detalle completo de una solicitud, incluyendo datos del cliente solicitante."""
    return ctrl_admin.obtener_solicitud(db, pksolicitud)


@router_admin_solicitudes.post("/{pksolicitud}/evaluar", response_model=EvaluacionSolicitudOut)
def evaluar_solicitud(
    pksolicitud: int,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(require_role("ADMIN", "JEFE_RIESGOS", "COMITE", "ANALISTA")),
):
    """
    Motor de reglas (Criterio 2): calcula el RDS de la solicitud y determina
    su ruta de aprobación (directa / Riesgos / Comité / rechazo por política).
    Se ejecuta automáticamente al registrar la solicitud; este endpoint
    permite re-evaluarla manualmente, por ejemplo si el ingreso del cliente
    se actualizó después del registro inicial.
    """
    return ctrl_reglas.evaluar_solicitud(db, pksolicitud, persistir=True)


@router_admin_solicitudes.patch("/{pksolicitud}/estado", response_model=CambiarEstadoSolicitudOut)
def cambiar_estado(
    pksolicitud: int,
    payload: CambiarEstadoSolicitudRequest,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(require_role("ADMIN", "JEFE_RIESGOS", "COMITE", "ANALISTA")),
):
    """
    Aprueba, rechaza o marca como desembolsada una solicitud de crédito.
    Restringido: un ASESOR puede registrar/derivar solicitudes pero no resolverlas;
    la decisión final la toma ADMIN (montos bajos/medios), JEFE_RIESGOS (opinión de
    riesgos) o COMITE (montos que superan el umbral de comité).
    """
    return ctrl_admin.cambiar_estado_solicitud(db, pksolicitud, admin, payload)


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------
@router_admin_clientes.get("/", response_model=ClienteListOut)
def listar_clientes(
    q: str | None = Query(None, description="Buscar por nombre, código o documento"),
    limite: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Lista los clientes registrados, con búsqueda y paginación."""
    return ctrl_admin.obtener_clientes(db, q=q, limite=limite, offset=offset)


@router_admin_clientes.get("/{pkcliente}", response_model=ClienteDetalleOut)
def detalle_cliente(
    pkcliente: int,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Detalle de un cliente: cuentas de ahorro, créditos y solicitudes asociadas."""
    return ctrl_admin.obtener_cliente(db, pkcliente)


# ---------------------------------------------------------------------------
# Operaciones
# ---------------------------------------------------------------------------
@router_admin_operaciones.get("/", response_model=OperacionListOut)
def listar_operaciones(
    q: str | None = Query(None, description="Buscar por código de kardex o código de cliente"),
    limite: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Lista las operaciones (transferencias, pagos, etc.) de todos los clientes."""
    return ctrl_admin.obtener_operaciones(db, q=q, limite=limite, offset=offset)


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------
@router_admin_reportes.get("/", response_model=ReportesOut)
def reportes(
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Reportes agregados: cartera por producto/agencia, solicitudes por mes, morosidad."""
    return ctrl_admin.obtener_reportes(db)
