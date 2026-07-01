from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import ctrl_credito
from app.core.cfg_auth import get_cliente, ClienteToken
from app.core.cfg_database import get_db
from app.schemas.sch_credito import CreditoOut, CuotaOut, SolicitudCreditoRequest, SolicitudCreditoOut

router_credito = APIRouter(prefix="/cuentas/credito", tags=["Cuentas de Crédito"])
router_solicitud = APIRouter(prefix="/creditos", tags=["Solicitud de Crédito"])


@router_credito.get("/", response_model=list[CreditoOut])
def listar_creditos(
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Lista los créditos del cliente autenticado."""
    return ctrl_credito.obtener_creditos(db, cliente.pkcliente)


@router_credito.get("/{cod}/cuotas", response_model=list[CuotaOut])
def listar_cuotas(
    cod: str,
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Lista el cronograma de cuotas de un crédito propio, identificado por su
    código de cuenta (ej. CRE-000123)."""
    return ctrl_credito.obtener_cuotas(db, cod, cliente.pkcliente)


@router_solicitud.post("/solicitar", response_model=SolicitudCreditoOut)
def solicitar_credito(
    payload: SolicitudCreditoRequest,
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Registra una solicitud de crédito (dsolicitud) en estado 'En Evaluación',
    para ser evaluada posteriormente por el core."""
    return ctrl_credito.registrar_solicitud_credito(db, cliente.pkcliente, payload)
