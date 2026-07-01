"""
cfg_database.py — Engine y manejo de conexión SQLAlchemy (modo crudo con text()).
No usamos ORM declarativo: el core ya tiene las tablas, solo ejecutamos SQL crudo
a través de repositories/, igual que el sistema core original.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.cfg_config import settings

# Si existe un certificado CA en app/core/certs/ca.pem, lo usamos automáticamente
# para conectar por SSL (necesario para proveedores en la nube como Aiven, PlanetScale,
# RDS, etc.). En local (MySQL sin SSL) el archivo no existe y no se aplica nada.
_CA_PATH = os.path.join(os.path.dirname(__file__), "certs", "ca.pem")
_connect_args = {"ssl": {"ca": _CA_PATH}} if os.path.exists(_CA_PATH) else {}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=_connect_args,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    """Dependencia FastAPI: entrega una sesión y garantiza su cierre."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
