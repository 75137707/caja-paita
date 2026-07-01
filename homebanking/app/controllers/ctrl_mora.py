"""
ctrl_mora.py — Orquestación del módulo de Recuperaciones / Mora.
  R1: dashboard de cartera morosa por bandas.
  R2: registro e historial de gestiones de cobranza.
  R3: transición de estado de cobranza (Judicial / Castigo), validando que
      los días de mora acumulados cumplan el umbral normativo correspondiente
      antes de permitir el cambio.
"""
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cfg_auth import AdminToken
from app.repositories import repo_mora
from app.schemas.sch_mora import (
    MoraDashboardOut, KpiBandaOut, CreditoMoraOut,
    RegistrarGestionRequest, GestionCobranzaOut, HistorialGestionesOut,
    TransicionCobranzaRequest, TransicionCobranzaOut,
    UMBRAL_JUDICIAL_DIAS, UMBRAL_CASTIGO_DIAS,
)


def _validar_jurisdiccion_agencia(admin: AdminToken, pkagencia_credito: int | None):
    """
    Permiso dinámico (más allá del rol): un ASESOR solo puede gestionar
    créditos de clientes de SU PROPIA agencia. Los roles de alcance nacional
    (ADMIN, JEFE_RIESGOS, COMITE, GERENCIA, ANALISTA) se eximen de esta
    restricción porque su función normativa cruza agencias por diseño.
    """
    if admin.rol != "ASESOR":
        return
    if pkagencia_credito is None or admin.pkagencia != pkagencia_credito:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes jurisdicción sobre este crédito: pertenece a una agencia distinta a la tuya.",
        )


# ---------------------------------------------------------------------------
# R1 — Dashboard de cartera morosa
# ---------------------------------------------------------------------------
def obtener_dashboard_mora(db: Session, banda: str | None, q: str | None,
                            limite: int, offset: int) -> MoraDashboardOut:
    kpis_raw = repo_mora.obtener_kpis_por_banda(db)
    kpis = [KpiBandaOut(**k) for k in kpis_raw]

    total_creditos_en_mora = sum(k.nro_creditos for k in kpis)
    total_monto_pendiente = sum(k.monto_pendiente for k in kpis)

    vigente = repo_mora.obtener_total_vigente(db)
    total_vigente_nro = vigente["nro"] or 1  # evitar división por cero
    pct_mora = round(100 * total_creditos_en_mora / total_vigente_nro, 1)

    filas, total = repo_mora.listar_creditos_en_mora(db, banda=banda, q=q, limite=limite, offset=offset)
    creditos = [CreditoMoraOut(**f) for f in filas]

    return MoraDashboardOut(
        kpis_por_banda=kpis,
        total_creditos_en_mora=total_creditos_en_mora,
        total_monto_pendiente=total_monto_pendiente,
        pct_mora_sobre_vigente=pct_mora,
        creditos=creditos,
        total_registros=total,
    )


# ---------------------------------------------------------------------------
# R2 — Registro e historial de gestiones de cobranza
# ---------------------------------------------------------------------------
def registrar_gestion(db: Session, pkcuentacredito: int, admin: AdminToken,
                       payload: RegistrarGestionRequest) -> GestionCobranzaOut:
    credito = repo_mora.obtener_credito_mora_por_pk(db, pkcuentacredito)
    if credito is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el crédito o no se encuentra en mora actualmente.",
        )

    _validar_jurisdiccion_agencia(admin, credito.get("pkagencia"))

    if payload.resultado == "PROMESA_PAGO" and payload.fecha_promesa_pago is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes indicar la fecha de promesa de pago cuando el resultado es PROMESA_PAGO.",
        )

    pkgestion = repo_mora.insertar_gestion(
        db,
        pkcuentacredito=pkcuentacredito,
        pkusuarioadmin=admin.pkusuarioadmin,
        banda_mora_momento=credito["banda_mora"],
        canal_contacto=payload.canal_contacto,
        resultado=payload.resultado,
        fecha_promesa_pago=payload.fecha_promesa_pago,
        monto_promesa=payload.monto_promesa,
        observaciones=payload.observaciones,
    )

    gestiones = repo_mora.listar_gestiones_por_cuenta(db, pkcuentacredito)
    nueva = next(g for g in gestiones if g["pkgestion"] == pkgestion)
    return GestionCobranzaOut(**nueva)


def obtener_historial_gestiones(db: Session, pkcuentacredito: int) -> HistorialGestionesOut:
    credito = repo_mora.obtener_credito_mora_por_pk(db, pkcuentacredito)
    if credito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crédito no encontrado.")

    gestiones_raw = repo_mora.listar_gestiones_por_cuenta(db, pkcuentacredito)
    gestiones = [GestionCobranzaOut(**g) for g in gestiones_raw]

    return HistorialGestionesOut(
        pkcuentacredito=pkcuentacredito,
        codcuenta=credito["codcuenta"],
        cliente=credito["cliente"],
        banda_mora_actual=credito["banda_mora"],
        gestiones=gestiones,
    )


# ---------------------------------------------------------------------------
# R3 — Transición de estado de cobranza (Judicial / Castigo) con validación
# de umbrales normativos. Solo procede si los días de mora acumulados
# cumplen el mínimo exigido; de lo contrario se rechaza con 400.
# ---------------------------------------------------------------------------
def transicionar_estado_cobranza(db: Session, pkcuentacredito: int, admin: AdminToken,
                                  payload: TransicionCobranzaRequest) -> TransicionCobranzaOut:
    credito = repo_mora.obtener_credito_mora_por_pk(db, pkcuentacredito)
    if credito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crédito no encontrado.")

    # Defensivo: JEFE_RIESGOS es un rol de alcance nacional, así que
    # _validar_jurisdiccion_agencia no le aplica restricción (solo restringe
    # a ASESOR). Se deja la llamada para que, si en el futuro se habilita
    # este endpoint a otros roles, la jurisdicción se siga respetando.
    _validar_jurisdiccion_agencia(admin, credito.get("pkagencia"))

    if credito["estado_contable"] == "CANCELADO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El crédito ya está cancelado; no aplica una transición de cobranza.",
        )

    dias = credito["diasmoraacumulado"]
    estado_actual = credito["estado_cobranza"]

    if payload.nuevo_estado == "JUDICIAL":
        if dias < UMBRAL_JUDICIAL_DIAS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No se puede judicializar: el crédito tiene {dias} días de mora y el "
                    f"umbral normativo mínimo es {UMBRAL_JUDICIAL_DIAS} días."
                ),
            )
        if estado_actual in {"JUDICIAL", "CASTIGO"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El crédito ya se encuentra en estado de cobranza '{estado_actual}'.",
            )

    else:  # CASTIGO
        if dias <= UMBRAL_CASTIGO_DIAS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No se puede castigar: el crédito tiene {dias} días de mora y el umbral "
                    f"normativo mínimo es {UMBRAL_CASTIGO_DIAS} días."
                ),
            )
        if estado_actual == "CASTIGO":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El crédito ya se encuentra en estado de Castigo.",
            )

    repo_mora.actualizar_estado_cobranza(
        db, pkcuentacredito=pkcuentacredito, nuevo_estado=payload.nuevo_estado,
        pkusuarioadmin=admin.pkusuarioadmin, fecha_hoy=date.today(),
    )

    return TransicionCobranzaOut(
        mensaje=f"Crédito {credito['codcuenta']} transicionado a {payload.nuevo_estado} correctamente.",
        pkcuentacredito=pkcuentacredito,
        codcuenta=credito["codcuenta"],
        estado_cobranza_anterior=estado_actual,
        estado_cobranza_nuevo=payload.nuevo_estado,
        diasmoraacumulado=dias,
        resuelto_por=admin.nombre,
    )
