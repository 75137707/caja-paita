"""
cfg_config.py — Configuración centralizada vía pydantic-settings.
Lee variables desde .env (o entorno del sistema).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Base de datos
    DATABASE_URL: str = "mysql+pymysql://root:123456@localhost:3306/bd_core_financiero"

    # JWT
    JWT_SECRET_KEY: str = "cambiar-esta-clave-en-produccion-homebanking-caja-paita"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60          # Cliente homebanking (sesión más larga, uso normal)
    JWT_EXPIRE_MINUTES_ADMIN: int = 20    # Panel admin: sesión corta porque maneja acciones
                                           # críticas (desembolso, castigo de cartera, comité).
                                           # Si un rol se revoca en BD, el token viejo deja de
                                           # ser válido en máximo 20 min, no 60.

    # Seguridad de cuenta
    MAX_INTENTOS_FALLIDOS: int = 3

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # App
    APP_NAME: str = "Homebanking Caja Virtual - API"
    APP_PORT: int = 8002


settings = Settings()
