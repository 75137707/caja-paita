"""
repo_ahorro.py — Consultas SQL crudas para cuentas de ahorro y sus movimientos.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def listar_cuentas_ahorro_cliente(db: Session, pkcliente: int):
    sql = text("""
        SELECT
            ca.pkcuentaahorro,
            ca.codcuenta AS nro,
            tp.nombre AS tipo,
            COALESCE(saldo.saldodisponible, 0) AS saldo,
            ca.estado,
            m.codmoneda AS moneda,
            ca.fechaapertura
        FROM dcuentaahorro ca
        INNER JOIN dtipoproductoahorro tp ON tp.pktipoproductoahorro = ca.pktipoproductoahorro
        INNER JOIN dmoneda m ON m.pkmoneda = ca.pkmoneda
        LEFT JOIN (
            SELECT f1.pkcuentaahorro, f1.saldodisponible
            FROM fcuentaahorro f1
            INNER JOIN (
                SELECT pkcuentaahorro, MAX(periododia) AS maxperiodo
                FROM fcuentaahorro
                GROUP BY pkcuentaahorro
            ) f2 ON f2.pkcuentaahorro = f1.pkcuentaahorro AND f2.maxperiodo = f1.periododia
        ) saldo ON saldo.pkcuentaahorro = ca.pkcuentaahorro
        WHERE ca.pkcliente = :pkcliente
        ORDER BY ca.pkcuentaahorro
    """)
    rows = db.execute(sql, {"pkcliente": pkcliente}).mappings().all()
    return [dict(r) for r in rows]


def obtener_cuenta_ahorro_por_codigo(db: Session, codcuenta: str, pkcliente: int):
    """Resuelve una cuenta de ahorro por su código de negocio (ej. AHO-000123),
    verificando que pertenezca al cliente autenticado."""
    sql = text("""
        SELECT ca.pkcuentaahorro, ca.codcuenta, ca.pkcliente, ca.estado, ca.pkmoneda,
               COALESCE(saldo.saldodisponible, 0) AS saldodisponible
        FROM dcuentaahorro ca
        LEFT JOIN (
            SELECT f1.pkcuentaahorro, f1.saldodisponible
            FROM fcuentaahorro f1
            INNER JOIN (
                SELECT pkcuentaahorro, MAX(periododia) AS maxperiodo
                FROM fcuentaahorro
                GROUP BY pkcuentaahorro
            ) f2 ON f2.pkcuentaahorro = f1.pkcuentaahorro AND f2.maxperiodo = f1.periododia
        ) saldo ON saldo.pkcuentaahorro = ca.pkcuentaahorro
        WHERE ca.codcuenta = :codcuenta AND ca.pkcliente = :pkcliente
    """)
    row = db.execute(sql, {"codcuenta": codcuenta, "pkcliente": pkcliente}).mappings().first()
    return dict(row) if row else None


def obtener_cuenta_ahorro_de_cliente(db: Session, pkcuentaahorro: int, pkcliente: int):
    """Verifica pertenencia + retorna datos básicos de la cuenta."""
    sql = text("""
        SELECT ca.pkcuentaahorro, ca.codcuenta, ca.pkcliente, ca.estado, ca.pkmoneda,
               COALESCE(saldo.saldodisponible, 0) AS saldodisponible
        FROM dcuentaahorro ca
        LEFT JOIN (
            SELECT f1.pkcuentaahorro, f1.saldodisponible
            FROM fcuentaahorro f1
            INNER JOIN (
                SELECT pkcuentaahorro, MAX(periododia) AS maxperiodo
                FROM fcuentaahorro
                GROUP BY pkcuentaahorro
            ) f2 ON f2.pkcuentaahorro = f1.pkcuentaahorro AND f2.maxperiodo = f1.periododia
        ) saldo ON saldo.pkcuentaahorro = ca.pkcuentaahorro
        WHERE ca.pkcuentaahorro = :pkcuentaahorro AND ca.pkcliente = :pkcliente
    """)
    row = db.execute(sql, {"pkcuentaahorro": pkcuentaahorro, "pkcliente": pkcliente}).mappings().first()
    return dict(row) if row else None


def listar_movimientos_todas_cuentas(db: Session, pkcliente: int, limit: int = 100):
    """Devuelve los movimientos de TODAS las cuentas de ahorro del cliente,
    consolidados en un solo historial (para la vista de 'Movimientos' general)."""
    sql = text("""
        SELECT
            f.pkoperacion,
            f.fechahora AS fecha,
            f.codkardex,
            top.nombre AS tipooperacion,
            co.nombre AS concepto,
            f.codtipoegresoingreso AS tipo_egreso_ingreso,
            f.montooperacion AS monto,
            f.glosa,
            can.nombre AS canal,
            ca.codcuenta AS cuenta
        FROM foperaciones f
        INNER JOIN dtipooperacion top ON top.pktipooperacion = f.pktipooperacion
        INNER JOIN dconceptooperacion co ON co.pkconceptooperacion = f.pkconceptooperacion
        LEFT JOIN dcanaltransaccional can ON can.pkcanal = f.pkcanal
        INNER JOIN dcuentaahorro ca ON ca.pkcuentaahorro = f.pkcuentaahorroorigen
        WHERE ca.pkcliente = :pkcliente
        ORDER BY f.fechahora DESC, f.pkoperacion DESC
        LIMIT :limit
    """)
    rows = db.execute(sql, {"pkcliente": pkcliente, "limit": limit}).mappings().all()
    return [dict(r) for r in rows]


def listar_movimientos_cuenta(db: Session, pkcuentaahorro: int, limit: int = 50):
    """Devuelve los movimientos de la cuenta. Cada fila de foperaciones representa
    el movimiento desde la perspectiva de UNA sola cuenta (pkcuentaahorroorigen),
    con su signo (codtipoegresoingreso) ya correcto para esa cuenta. Por eso se usa
    el valor crudo de la fila, sin recalcular."""
    sql = text("""
        SELECT
            f.pkoperacion,
            f.fechahora AS fecha,
            f.codkardex,
            top.nombre AS tipooperacion,
            co.nombre AS concepto,
            f.codtipoegresoingreso AS tipo_egreso_ingreso,
            f.montooperacion AS monto,
            f.glosa,
            can.nombre AS canal
        FROM foperaciones f
        INNER JOIN dtipooperacion top ON top.pktipooperacion = f.pktipooperacion
        INNER JOIN dconceptooperacion co ON co.pkconceptooperacion = f.pkconceptooperacion
        LEFT JOIN dcanaltransaccional can ON can.pkcanal = f.pkcanal
        WHERE f.pkcuentaahorroorigen = :pkcuentaahorro
           OR f.pkcuentaahorrodestino = :pkcuentaahorro
        ORDER BY f.fechahora DESC, f.pkoperacion DESC
        LIMIT :limit
    """)
    rows = db.execute(sql, {"pkcuentaahorro": pkcuentaahorro, "limit": limit}).mappings().all()
    return [dict(r) for r in rows]


def actualizar_saldo_cuenta(db: Session, pkcuentaahorro: int, periododia: int, nuevo_saldo):
    """UPSERT del snapshot de saldo del día (fcuentaahorro tiene PK compuesta)."""
    sql = text("""
        INSERT INTO fcuentaahorro (pkcuentaahorro, periododia, saldocontable, saldodisponible)
        VALUES (:pkcuentaahorro, :periododia, :saldo, :saldo)
        ON DUPLICATE KEY UPDATE
            saldocontable = :saldo,
            saldodisponible = :saldo
    """)
    db.execute(sql, {"pkcuentaahorro": pkcuentaahorro, "periododia": periododia, "saldo": nuevo_saldo})
