"""
route_mora.py — Endpoints del módulo de Recuperaciones / Mora.
  R1: GET  /admin/mora/                       -> dashboard por bandas (lectura: todos los roles admin)
  R2: POST /admin/mora/{pk}/gestiones         -> registrar gestión de cobranza (ASESOR/JEFE_RIESGOS/ANALISTA)
      GET  /admin/mora/{pk}/gestiones         -> historial de gestiones (lectura: todos los roles admin)
  R3: PATCH /admin/mora/{pk}/estado-cobranza  -> transición a Judicial/Castigo (solo JEFE_RIESGOS)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.controllers import ctrl_mora
from app.core.cfg_auth import get_admin, require_role, AdminToken
from app.core.cfg_database import get_db
from app.schemas.sch_mora import (
    MoraDashboardOut,
    RegistrarGestionRequest, GestionCobranzaOut, HistorialGestionesOut,
    TransicionCobranzaRequest, TransicionCobranzaOut,
)

router_mora = APIRouter(prefix="/admin/mora", tags=["Admin · Recuperaciones / Mora"])


# ---------------------------------------------------------------------------
# R1 — Dashboard de cartera morosa por bandas
# ---------------------------------------------------------------------------
@router_mora.get("/", response_model=MoraDashboardOut)
def dashboard_mora(
    banda: str | None = Query(None, description="Filtrar por banda: PREVENTIVA/TEMPRANA/TARDIA/JUDICIAL/CASTIGO"),
    q: str | None = Query(None, description="Buscar por cliente, código de cliente o cuenta"),
    limite: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """KPIs de cartera morosa por banda y listado de créditos en mora. Lectura abierta a todo el personal."""
    return ctrl_mora.obtener_dashboard_mora(db, banda=banda, q=q, limite=limite, offset=offset)


# ---------------------------------------------------------------------------
# R2 — Gestiones de cobranza
# ---------------------------------------------------------------------------
@router_mora.post("/{pkcuentacredito}/gestiones", response_model=GestionCobranzaOut)
def registrar_gestion(
    pkcuentacredito: int,
    payload: RegistrarGestionRequest,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(require_role("ASESOR", "JEFE_RIESGOS", "ANALISTA", "ADMIN")),
):
    """Registra una gestión de cobranza (llamada, visita, etc.) sobre un crédito en mora."""
    return ctrl_mora.registrar_gestion(db, pkcuentacredito, admin, payload)


@router_mora.get("/{pkcuentacredito}/gestiones", response_model=HistorialGestionesOut)
def historial_gestiones(
    pkcuentacredito: int,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(get_admin),
):
    """Historial completo de gestiones de cobranza realizadas sobre un crédito."""
    return ctrl_mora.obtener_historial_gestiones(db, pkcuentacredito)


# ---------------------------------------------------------------------------
# R3 — Transición de estado de cobranza (Judicial / Castigo)
# ---------------------------------------------------------------------------
@router_mora.patch("/{pkcuentacredito}/estado-cobranza", response_model=TransicionCobranzaOut)
def transicionar_estado_cobranza(
    pkcuentacredito: int,
    payload: TransicionCobranzaRequest,
    db: Session = Depends(get_db),
    admin: AdminToken = Depends(require_role("JEFE_RIESGOS")),
):
    """
    Transiciona un crédito a Judicial (>=121 días de mora) o Castigo (>180 días),
    validando el umbral normativo. Restringido al rol JEFE_RIESGOS, que es quien
    tiene la autoridad de derivar a cobranza judicial o castigar cartera.
    """
    return ctrl_mora.transicionar_estado_cobranza(
        db, pkcuentacredito, admin, payload
    )
