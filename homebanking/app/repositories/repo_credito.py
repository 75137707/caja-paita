"""
repo_credito.py — Consultas SQL crudas para créditos, cuotas y solicitudes.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def listar_creditos_cliente(db: Session, pkcliente: int):
    sql = text("""
        SELECT
            cc.pkcuentacredito,
            cc.codcuenta AS cuenta,
            tp.nombre AS producto,
            cc.fechadesembolso AS fecha_desembolso,
            COALESCE(ag.saldocapital, 0) AS saldo_capital,
            COALESCE(ag.pagopendiente, 0) AS pago_pendiente,
            cc.estado,
            m.codmoneda AS moneda
        FROM dcuentacredito cc
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = cc.pktipoproductocredito
        INNER JOIN dmoneda m ON m.pkmoneda = cc.pkmoneda
        LEFT JOIN (
            SELECT f1.pkcuentacredito, f1.saldocapital, f1.pagopendiente
            FROM fagcuentacredito f1
            INNER JOIN (
                SELECT pkcuentacredito, MAX(periododia) AS maxperiodo
                FROM fagcuentacredito
                GROUP BY pkcuentacredito
            ) f2 ON f2.pkcuentacredito = f1.pkcuentacredito AND f2.maxperiodo = f1.periododia
        ) ag ON ag.pkcuentacredito = cc.pkcuentacredito
        WHERE cc.pkcliente = :pkcliente
        ORDER BY cc.pkcuentacredito
    """)
    rows = db.execute(sql, {"pkcliente": pkcliente}).mappings().all()
    return [dict(r) for r in rows]


def obtener_credito_por_codigo(db: Session, codcuenta: str, pkcliente: int):
    """Resuelve un crédito por su código de negocio (ej. CRE-000123),
    verificando que pertenezca al cliente autenticado."""
    sql = text("""
        SELECT cc.pkcuentacredito, cc.codcuenta, cc.pkcliente, cc.estado, cc.pkmoneda,
               cc.pkagencia
        FROM dcuentacredito cc
        WHERE cc.codcuenta = :codcuenta AND cc.pkcliente = :pkcliente
    """)
    row = db.execute(sql, {"codcuenta": codcuenta, "pkcliente": pkcliente}).mappings().first()
    return dict(row) if row else None


def obtener_credito_de_cliente(db: Session, pkcuentacredito: int, pkcliente: int):
    sql = text("""
        SELECT cc.pkcuentacredito, cc.codcuenta, cc.pkcliente, cc.estado, cc.pkmoneda,
               cc.pkagencia
        FROM dcuentacredito cc
        WHERE cc.pkcuentacredito = :pkcuentacredito AND cc.pkcliente = :pkcliente
    """)
    row = db.execute(sql, {"pkcuentacredito": pkcuentacredito, "pkcliente": pkcliente}).mappings().first()
    return dict(row) if row else None


def listar_cuotas_credito(db: Session, pkcuentacredito: int):
    sql = text("""
        SELECT
            pp.pkplanpago,
            pp.nrocuota AS nro,
            t.fecha AS vencimiento,
            pp.montocapital AS monto_capital,
            pp.montointeres AS monto_interes,
            pp.montocuota AS monto_cuota,
            pp.montocapitalpagado AS capital_pagado,
            pp.montointerespagado AS interes_pagado,
            pp.diasmora AS dias_mora,
            pp.estadocuota AS estado
        FROM fplanpagomes pp
        INNER JOIN dtiempo t ON t.periododia = pp.periododiavencimiento
        WHERE pp.pkcuentacredito = :pkcuentacredito
        ORDER BY pp.nrocuota
    """)
    rows = db.execute(sql, {"pkcuentacredito": pkcuentacredito}).mappings().all()
    return [dict(r) for r in rows]


def obtener_proxima_cuota_pendiente(db: Session, pkcuentacredito: int):
    sql = text("""
        SELECT pkplanpago, nrocuota, periododiavencimiento, montocapital, montointeres,
               montocuota, montocapitalpagado, montointerespagado, estadocuota
        FROM fplanpagomes
        WHERE pkcuentacredito = :pkcuentacredito
          AND estadocuota IN ('PENDIENTE', 'VENCIDA', 'PARCIAL')
        ORDER BY nrocuota
        LIMIT 1
    """)
    row = db.execute(sql, {"pkcuentacredito": pkcuentacredito}).mappings().first()
    return dict(row) if row else None


def marcar_cuota_pagada(db: Session, pkplanpago: int, monto_capital_pagado, monto_interes_pagado):
    sql = text("""
        UPDATE fplanpagomes
        SET montocapitalpagado = montocapitalpagado + :capital,
            montointerespagado = montointerespagado + :interes,
            fechapago = CURDATE(),
            diasmora = 0,
            estadocuota = 'PAGADA'
        WHERE pkplanpago = :pkplanpago
    """)
    db.execute(sql, {"pkplanpago": pkplanpago, "capital": monto_capital_pagado,
                      "interes": monto_interes_pagado})


def actualizar_saldo_credito(db: Session, pkcuentacredito: int, periododia: int,
                              nuevo_saldo_capital, nuevo_pago_pendiente):
    sql = text("""
        INSERT INTO fagcuentacredito (pkcuentacredito, periododia, saldocapital, pagopendiente, diasmoraacumulado)
        VALUES (:pkcuentacredito, :periododia, :saldo, :pendiente, 0)
        ON DUPLICATE KEY UPDATE
            saldocapital = :saldo,
            pagopendiente = :pendiente
    """)
    db.execute(sql, {"pkcuentacredito": pkcuentacredito, "periododia": periododia,
                      "saldo": nuevo_saldo_capital, "pendiente": nuevo_pago_pendiente})


def obtener_pk_tipoproductocredito(db: Session, codtipoproducto: str):
    sql = text("""
        SELECT pktipoproductocredito FROM dtipoproductocredito
        WHERE codtipoproducto = :cod AND activo = 1
    """)
    row = db.execute(sql, {"cod": codtipoproducto}).mappings().first()
    return row["pktipoproductocredito"] if row else None


def obtener_pk_estadosolicitud(db: Session, codestado: str):
    sql = text("SELECT pkestadosolicitud FROM destadosolicitud WHERE codestado = :cod")
    row = db.execute(sql, {"cod": codestado}).mappings().first()
    return row["pkestadosolicitud"] if row else None


def insertar_solicitud_credito(db: Session, pkcliente: int, pktipoproductocredito: int,
                                montosolicitado, plazomeses: int, pkestadosolicitud: int,
                                canal: str, observaciones: str | None, codsolicitud: str) -> int:
    sql = text("""
        INSERT INTO dsolicitud (codsolicitud, pkcliente, pktipoproductocredito,
            montosolicitado, plazomeses, pkestadosolicitud, fechasolicitud, canal, observaciones)
        VALUES (:codsolicitud, :pkcliente, :pktipo, :monto, :plazo, :pkestado, CURDATE(),
            :canal, :obs)
    """)
    db.execute(sql, {
        "codsolicitud": codsolicitud, "pkcliente": pkcliente, "pktipo": pktipoproductocredito,
        "monto": montosolicitado, "plazo": plazomeses, "pkestado": pkestadosolicitud,
        "canal": canal, "obs": observaciones,
    })
    return db.execute(text("SELECT LAST_INSERT_ID() AS pk")).mappings().first()["pk"]


def siguiente_numero_solicitud(db: Session) -> int:
    sql = text("SELECT COUNT(*) AS n FROM dsolicitud")
    row = db.execute(sql).mappings().first()
    return (row["n"] or 0) + 1
