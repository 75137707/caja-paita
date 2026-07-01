from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import ctrl_ahorro
from app.core.cfg_auth import get_cliente, ClienteToken
from app.core.cfg_database import get_db
from app.schemas.sch_ahorro import CuentaAhorroOut, MovimientoOut

router = APIRouter(prefix="/cuentas/ahorro", tags=["Cuentas de Ahorro"])


@router.get("/", response_model=list[CuentaAhorroOut])
def listar_cuentas_ahorro(
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Lista las cuentas de ahorro del cliente autenticado."""
    return ctrl_ahorro.obtener_cuentas_ahorro(db, cliente.pkcliente)


@router.get("/movimientos", response_model=list[MovimientoOut])
def listar_movimientos_consolidados(
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Historial de movimientos de TODAS las cuentas de ahorro del cliente,
    consolidado en una sola lista (vista general de transacciones)."""
    return ctrl_ahorro.obtener_movimientos_consolidados(db, cliente.pkcliente)


@router.get("/{cod}/movimientos", response_model=list[MovimientoOut])
def listar_movimientos(
    cod: str,
    db: Session = Depends(get_db),
    cliente: ClienteToken = Depends(get_cliente),
):
    """Lista los movimientos (foperaciones) de una cuenta de ahorro propia,
    identificada por su código de cuenta (ej. AHO-000123)."""
    return ctrl_ahorro.obtener_movimientos(db, cod, cliente.pkcliente)
