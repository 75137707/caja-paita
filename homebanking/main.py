"""
main.py — Punto de entrada de la API de Homebanking (Caja Virtual).

Ejecutar:
    uvicorn main:app --reload --port 8002
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.cfg_config import settings
from app.routes import route_auth, route_ahorro, route_credito, route_operaciones, route_admin, route_mora

app = FastAPI(
    title=settings.APP_NAME,
    description="API de Homebanking (Caja Virtual) para clientes de la caja municipal. "
                 "Consultas de cuentas de ahorro/crédito y operaciones (pago de cuota, "
                 "transferencias, solicitud de crédito), más el panel administrativo "
                 "(back-office) para gestión de solicitudes, clientes y reportes.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Manejo global de errores (Criterio 3 — RBAC/seguridad)
#
# Garantiza que TODA respuesta de error de la API, sin excepción, tenga la
# misma forma JSON {"detail": "...", "path": "..."}. Esto evita que un
# 401/403 de auth se vea distinto a un 404 de negocio, y sobre todo evita
# que un error de programación no anticipado (p.ej. una excepción de SQL
# suelta) termine devolviendo un traceback o un 500 con forma distinta al
# resto de la API.
# ---------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Captura toda HTTPException ya lanzada intencionalmente por el código
    (401 de credenciales inválidas, 403 de require_role, 404 de recurso no
    encontrado, 400 de regla de negocio, etc.) y la normaliza a un único
    formato. No cambia el status_code ni el mensaje original: solo asegura
    que el "shape" de la respuesta sea siempre el mismo.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "path": str(request.url.path)},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Red de seguridad para CUALQUIER excepción no anticipada (error de SQL,
    bug de programación, etc.). Nunca expone el traceback ni el mensaje
    interno de la excepción al cliente -- solo un 500 genérico con el mismo
    formato JSON que el resto de la API. El detalle real del error sigue
    quedando en los logs del servidor (consola de uvicorn) para diagnóstico.
    """
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Ocurrió un error interno. Contacte al administrador del sistema.",
            "path": str(request.url.path),
        },
    )

app.include_router(route_auth.router)
app.include_router(route_ahorro.router)
app.include_router(route_credito.router_credito)
app.include_router(route_credito.router_solicitud)
app.include_router(route_operaciones.router)

# Panel de administración (back-office)
app.include_router(route_admin.router_admin_auth)
app.include_router(route_admin.router_admin_dashboard)
app.include_router(route_admin.router_admin_solicitudes)
app.include_router(route_admin.router_admin_clientes)
app.include_router(route_admin.router_admin_operaciones)
app.include_router(route_admin.router_admin_reportes)

# Recuperaciones / Mora (R1 consulta, R2 gestiones, R3 transiciones)
app.include_router(route_mora.router_mora)


@app.get("/", tags=["Salud"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.APP_PORT, reload=True)
