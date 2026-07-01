"""
ctrl_ahorro.py — Orquestación de consultas de cuentas de ahorro y movimientos.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import repo_ahorro


def obtener_cuentas_ahorro(db: Session, pkcliente: int):
    return repo_ahorro.listar_cuentas_ahorro_cliente(db, pkcliente)


def obtener_movimientos(db: Session, codcuenta: str, pkcliente: int):
    cuenta = repo_ahorro.obtener_cuenta_ahorro_por_codigo(db, codcuenta, pkcliente)
    if cuenta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="Cuenta de ahorro no encontrada o no pertenece al cliente")
    return repo_ahorro.listar_movimientos_cuenta(db, cuenta["pkcuentaahorro"])


def obtener_movimientos_consolidados(db: Session, pkcliente: int):
    """Historial de movimientos de TODAS las cuentas de ahorro del cliente."""
    return repo_ahorro.listar_movimientos_todas_cuentas(db, pkcliente)
