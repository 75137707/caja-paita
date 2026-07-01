from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import ctrl_operaciones
from app.core.cfg_auth import get_cliente, ClienteToken
from app.core.cfg_database import get_db
from app.schemas.sch_operaciones import (
    PagoCuotaRequest, PagoCuotaResponse, TransferenciaRequest, TransferenciaResponse,
)

router = APIRouter(prefix="/operaciones", tags=["Operaciones"])


@router.post("/pago-cuota", response_model=PagoCuotaResponse)
def pagar_cuota(
    payload: PagoCuotaRequest,
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Paga la próxima cuota pendiente de un crédito propio, debitando
    de una cuenta de ahorro propia. Inserta movimiento en foperaciones (concepto PCAP)."""
    return ctrl_operaciones.pagar_cuota(db, cliente.pkcliente, payload)


@router.post("/transferencia", response_model=TransferenciaResponse)
def transferir(
    payload: TransferenciaRequest,
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Transferencia entre cuentas de ahorro propias del cliente (tipo TRF):
    inserta débito y crédito en foperaciones."""
    return ctrl_operaciones.transferir(db, cliente.pkcliente, payload)
