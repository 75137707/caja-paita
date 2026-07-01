from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import ctrl_auth
from app.core.cfg_database import get_db
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

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Login del cliente de homebanking. username = codcliente en minúscula (ej. cli000001)."""
    return ctrl_auth.login_cliente(db, payload)


@router.post("/registro/verificar", response_model=VerificarClienteResponse)
def verificar_elegibilidad(payload: VerificarClienteRequest, db: Session = Depends(get_db)):
    """
    Paso 1 del autoregistro: confirma si el documento corresponde a un
    cliente del banco que aún no tiene usuario de Caja Virtual.
    """
    return ctrl_auth.verificar_elegibilidad(db, payload)


@router.post("/registro", response_model=RegistroResponse)
def registrar_cliente(payload: RegistroRequest, db: Session = Depends(get_db)):
    """
    Paso 2 del autoregistro: crea el usuario y contraseña de Caja Virtual
    para un cliente ya existente en el core (dcliente).
    """
    return ctrl_auth.registrar_cliente(db, payload)


@router.post("/apertura", response_model=AperturaClienteResponse)
def aperturar_cliente(payload: AperturaClienteRequest, db: Session = Depends(get_db)):
    """
    Apertura de cuenta para una persona totalmente NUEVA, sin relación previa
    con el banco: crea su registro de cliente (dcliente), su cuenta de
    Ahorro Corriente inicial y sus credenciales de Caja Virtual, todo en un
    solo paso — equivalente a una apertura de cuenta presencial en agencia.
    """
    return ctrl_auth.aperturar_cliente(db, payload)
