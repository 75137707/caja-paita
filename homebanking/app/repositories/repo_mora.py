"""
repo_mora.py — Consultas SQL crudas del módulo de Recuperaciones / Mora.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


# ---------------------------------------------------------------------------
# R1 — Consulta de cartera morosa por bandas (usa vw_mora_actual, creada por
# sql/03_modulo_mora.sql sobre fagcuentacredito al último periododia cargado)
# ---------------------------------------------------------------------------
def obtener_kpis_por_banda(db: Session):
    sql = text("""
        SELECT banda_mora, COUNT(*) AS nro_creditos, SUM(pagopendiente) AS monto_pendiente
        FROM vw_mora_actual
        WHERE banda_mora <> 'SIN_MORA'
        GROUP BY banda_mora
    """)
    return [dict(r) for r in db.execute(sql).mappings().all()]


def obtener_total_vigente(db: Session):
    sql = text("""
        SELECT COUNT(*) AS nro, COALESCE(SUM(saldocapital), 0) AS saldo
        FROM vw_mora_actual
        WHERE estado_contable = 'VIGENTE'
    """)
    row = db.execute(sql).mappings().first()
    return dict(row) if row else {"nro": 0, "saldo": 0}


def listar_creditos_en_mora(db: Session, banda: str | None, q: str | None, limite: int, offset: int):
    filtros = ["v.banda_mora <> 'SIN_MORA'"]
    params = {"limite": limite, "offset": offset}

    if banda:
        filtros.append("v.banda_mora = :banda")
        params["banda"] = banda.upper()

    if q:
        filtros.append("(c.nombres LIKE :q OR c.apellidopaterno LIKE :q OR c.codcliente LIKE :q "
                        "OR dcc.codcuenta LIKE :q)")
        params["q"] = f"%{q}%"

    where_clause = " AND ".join(filtros)

    sql_total = text(f"""
        SELECT COUNT(*) AS total
        FROM vw_mora_actual v
        INNER JOIN dcuentacredito dcc ON dcc.pkcuentacredito = v.pkcuentacredito
        INNER JOIN dcliente c ON c.pkcliente = v.pkcliente
        WHERE {where_clause}
    """)
    total = db.execute(sql_total, params).scalar() or 0

    sql = text(f"""
        SELECT v.pkcuentacredito, dcc.codcuenta, v.pkcliente,
               CONCAT(c.nombres, ' ', c.apellidopaterno, ' ', c.apellidomaterno) AS cliente,
               c.codcliente, tp.nombre AS producto,
               v.banda_mora, v.estado_cobranza, v.diasmoraacumulado,
               v.saldocapital, v.pagopendiente,
               ag.nombre AS agencia,
               (SELECT MAX(g.fechahora) FROM dgestioncobranza g
                WHERE g.pkcuentacredito = v.pkcuentacredito) AS ultima_gestion
        FROM vw_mora_actual v
        INNER JOIN dcuentacredito dcc ON dcc.pkcuentacredito = v.pkcuentacredito
        INNER JOIN dcliente c ON c.pkcliente = v.pkcliente
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = dcc.pktipoproductocredito
        LEFT JOIN dagencia ag ON ag.pkagencia = dcc.pkagencia
        WHERE {where_clause}
        ORDER BY v.diasmoraacumulado DESC
        LIMIT :limite OFFSET :offset
    """)
    filas = [dict(r) for r in db.execute(sql, params).mappings().all()]
    return filas, total


def obtener_credito_mora_por_pk(db: Session, pkcuentacredito: int):
    sql = text("""
        SELECT v.pkcuentacredito, dcc.codcuenta, v.pkcliente, dcc.pkagencia,
               CONCAT(c.nombres, ' ', c.apellidopaterno, ' ', c.apellidomaterno) AS cliente,
               c.codcliente, v.banda_mora, v.estado_cobranza, v.diasmoraacumulado,
               v.saldocapital, v.pagopendiente, dcc.estado AS estado_contable
        FROM vw_mora_actual v
        INNER JOIN dcuentacredito dcc ON dcc.pkcuentacredito = v.pkcuentacredito
        INNER JOIN dcliente c ON c.pkcliente = v.pkcliente
        WHERE v.pkcuentacredito = :pk
    """)
    row = db.execute(sql, {"pk": pkcuentacredito}).mappings().first()
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# R2 — Registro e historial de gestiones de cobranza
# ---------------------------------------------------------------------------
def insertar_gestion(db: Session, pkcuentacredito: int, pkusuarioadmin: int, banda_mora_momento: str,
                      canal_contacto: str, resultado: str, fecha_promesa_pago, monto_promesa,
                      observaciones: str | None):
    sql = text("""
        INSERT INTO dgestioncobranza
            (pkcuentacredito, pkusuarioadmin, canal_contacto, resultado, banda_mora_momento,
             fecha_promesa_pago, monto_promesa, observaciones)
        VALUES
            (:pkcuentacredito, :pkusuarioadmin, :canal_contacto, :resultado, :banda_mora_momento,
             :fecha_promesa_pago, :monto_promesa, :observaciones)
    """)
    db.execute(sql, {
        "pkcuentacredito": pkcuentacredito,
        "pkusuarioadmin": pkusuarioadmin,
        "canal_contacto": canal_contacto,
        "resultado": resultado,
        "banda_mora_momento": banda_mora_momento,
        "fecha_promesa_pago": fecha_promesa_pago,
        "monto_promesa": monto_promesa,
        "observaciones": observaciones,
    })
    db.commit()
    return db.execute(text("SELECT LAST_INSERT_ID() AS pk")).mappings().first()["pk"]


def listar_gestiones_por_cuenta(db: Session, pkcuentacredito: int):
    sql = text("""
        SELECT g.pkgestion, g.pkcuentacredito,
               CONCAT(ua.nombres, ' ', ua.apellidos) AS usuario, ua.rol AS rol_usuario,
               g.fechahora, g.canal_contacto, g.resultado, g.banda_mora_momento,
               g.fecha_promesa_pago, g.monto_promesa, g.observaciones
        FROM dgestioncobranza g
        INNER JOIN usuarios_admin ua ON ua.pkusuarioadmin = g.pkusuarioadmin
        WHERE g.pkcuentacredito = :pk
        ORDER BY g.fechahora DESC
    """)
    return [dict(r) for r in db.execute(sql, {"pk": pkcuentacredito}).mappings().all()]


# ---------------------------------------------------------------------------
# R3 — Transición de estado de cobranza (Judicial / Castigo)
# ---------------------------------------------------------------------------
def actualizar_estado_cobranza(db: Session, pkcuentacredito: int, nuevo_estado: str,
                                 pkusuarioadmin: int, fecha_hoy):
    if nuevo_estado == "JUDICIAL":
        sql = text("""
            UPDATE dcuentacredito
            SET estado_cobranza = :nuevo_estado,
                fecha_judicializacion = :fecha_hoy,
                pkusuarioadmin_resuelve = :pkusuarioadmin
            WHERE pkcuentacredito = :pk
        """)
    else:  # CASTIGO
        sql = text("""
            UPDATE dcuentacredito
            SET estado_cobranza = :nuevo_estado,
                estado = 'CASTIGADO',
                fecha_castigo = :fecha_hoy,
                pkusuarioadmin_resuelve = :pkusuarioadmin
            WHERE pkcuentacredito = :pk
        """)
    db.execute(sql, {
        "nuevo_estado": nuevo_estado,
        "fecha_hoy": fecha_hoy,
        "pkusuarioadmin": pkusuarioadmin,
        "pk": pkcuentacredito,
    })
    db.commit()
