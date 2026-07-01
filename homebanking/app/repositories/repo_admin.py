"""
repo_admin.py — Consultas SQL crudas para el panel administrador (back-office):
autenticación de usuarios admin, dashboard, gestión de solicitudes de crédito,
clientes, cuentas y operaciones.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


# ---------------------------------------------------------------------------
# Autenticación de administradores
# ---------------------------------------------------------------------------
def obtener_usuario_admin_por_username(db: Session, username: str):
    sql = text("""
        SELECT pkusuarioadmin, username, password_hash, nombres, apellidos, rol,
               pkagencia, activo, bloqueado, intentos_fallidos
        FROM usuarios_admin
        WHERE username = :username
    """)
    row = db.execute(sql, {"username": username}).mappings().first()
    return dict(row) if row else None


def incrementar_intentos_fallidos_admin(db: Session, pkusuarioadmin: int, bloquear: bool):
    sql = text("""
        UPDATE usuarios_admin
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado = :bloquear
        WHERE pkusuarioadmin = :pk
    """)
    db.execute(sql, {"pk": pkusuarioadmin, "bloquear": 1 if bloquear else 0})
    db.commit()


def reset_intentos_y_marcar_acceso_admin(db: Session, pkusuarioadmin: int):
    sql = text("""
        UPDATE usuarios_admin
        SET intentos_fallidos = 0,
            ultimo_acceso = NOW()
        WHERE pkusuarioadmin = :pk
    """)
    db.execute(sql, {"pk": pkusuarioadmin})
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
def kpis_generales(db: Session):
    sql = text("""
        SELECT
            (SELECT COUNT(*) FROM dcliente WHERE activo = 1) AS total_clientes,
            (SELECT COUNT(*) FROM dcuentaahorro WHERE estado = 'ACTIVA') AS cuentas_ahorro_activas,
            (SELECT COUNT(*) FROM dcuentacredito WHERE estado = 'VIGENTE') AS creditos_vigentes,
            (SELECT COUNT(*) FROM dsolicitud s
                INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
                WHERE e.codestado = '1') AS solicitudes_en_evaluacion,
            (SELECT COALESCE(SUM(f1.saldodisponible), 0)
                FROM fcuentaahorro f1
                INNER JOIN (
                    SELECT pkcuentaahorro, MAX(periododia) AS maxperiodo
                    FROM fcuentaahorro GROUP BY pkcuentaahorro
                ) f2 ON f2.pkcuentaahorro = f1.pkcuentaahorro AND f2.maxperiodo = f1.periododia
            ) AS saldo_total_ahorros,
            (SELECT COALESCE(SUM(f1.saldocapital), 0)
                FROM fagcuentacredito f1
                INNER JOIN (
                    SELECT pkcuentacredito, MAX(periododia) AS maxperiodo
                    FROM fagcuentacredito GROUP BY pkcuentacredito
                ) f2 ON f2.pkcuentacredito = f1.pkcuentacredito AND f2.maxperiodo = f1.periododia
            ) AS saldo_total_cartera
    """)
    row = db.execute(sql).mappings().first()
    return dict(row) if row else {}


def solicitudes_por_estado(db: Session):
    sql = text("""
        SELECT e.codestado, e.nombre AS estado, COUNT(*) AS total
        FROM dsolicitud s
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        GROUP BY e.codestado, e.nombre
        ORDER BY e.pkestadosolicitud
    """)
    rows = db.execute(sql).mappings().all()
    return [dict(r) for r in rows]


def solicitudes_recientes(db: Session, limite: int = 8):
    sql = text("""
        SELECT s.pksolicitud, s.codsolicitud,
               CONCAT(c.nombres, ' ', c.apellidopaterno) AS cliente,
               tp.nombre AS producto, s.montosolicitado, s.plazomeses, s.fechasolicitud,
               e.nombre AS estado, e.codestado
        FROM dsolicitud s
        INNER JOIN dcliente c ON c.pkcliente = s.pkcliente
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = s.pktipoproductocredito
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        ORDER BY s.fechasolicitud DESC, s.pksolicitud DESC
        LIMIT :limite
    """)
    rows = db.execute(sql, {"limite": limite}).mappings().all()
    return [dict(r) for r in rows]


def operaciones_recientes(db: Session, limite: int = 8):
    sql = text("""
        SELECT fo.pkoperacion, fo.codkardex, fo.fechahora, fo.montooperacion,
               fo.glosa, fo.codtipoegresoingreso,
               co.nombre AS concepto, can.nombre AS canal,
               COALESCE(c1.codcliente, c2.codcliente) AS codcliente,
               CONCAT(COALESCE(c1.nombres, c2.nombres), ' ',
                      COALESCE(c1.apellidopaterno, c2.apellidopaterno)) AS cliente
        FROM foperaciones fo
        INNER JOIN dconceptooperacion co ON co.pkconceptooperacion = fo.pkconceptooperacion
        LEFT JOIN dcanaltransaccional can ON can.pkcanal = fo.pkcanal
        LEFT JOIN dcliente c1 ON c1.pkcliente = fo.pkcliente
        LEFT JOIN dcuentaahorro caho ON caho.pkcuentaahorro = fo.pkcuentaahorroorigen
        LEFT JOIN dcliente c2 ON c2.pkcliente = caho.pkcliente
        ORDER BY fo.fechahora DESC, fo.pkoperacion DESC
        LIMIT :limite
    """)
    rows = db.execute(sql, {"limite": limite}).mappings().all()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Solicitudes de crédito — listado, filtros, detalle, cambio de estado
# ---------------------------------------------------------------------------
def listar_solicitudes(db: Session, estado: str | None = None, q: str | None = None,
                        limite: int = 50, offset: int = 0):
    filtros = []
    params = {"limite": limite, "offset": offset}

    if estado:
        filtros.append("e.codestado = :estado")
        params["estado"] = estado

    if q:
        filtros.append("""(
            s.codsolicitud LIKE :q OR c.nombres LIKE :q
            OR c.apellidopaterno LIKE :q OR c.apellidomaterno LIKE :q
            OR c.codcliente LIKE :q
        )""")
        params["q"] = f"%{q}%"

    where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    sql = text(f"""
        SELECT s.pksolicitud, s.codsolicitud, s.pkcliente,
               CONCAT(c.nombres, ' ', c.apellidopaterno, ' ', c.apellidomaterno) AS cliente,
               c.codcliente, tp.nombre AS producto, tp.codtipoproducto,
               s.montosolicitado, s.plazomeses, s.fechasolicitud, s.canal,
               s.observaciones, e.nombre AS estado, e.codestado,
               s.fechaevaluacion, s.comentario_admin
        FROM dsolicitud s
        INNER JOIN dcliente c ON c.pkcliente = s.pkcliente
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = s.pktipoproductocredito
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        {where_clause}
        ORDER BY s.fechasolicitud DESC, s.pksolicitud DESC
        LIMIT :limite OFFSET :offset
    """)
    rows = db.execute(sql, params).mappings().all()

    count_sql = text(f"""
        SELECT COUNT(*) AS total
        FROM dsolicitud s
        INNER JOIN dcliente c ON c.pkcliente = s.pkcliente
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        {where_clause}
    """)
    total = db.execute(count_sql, params).mappings().first()["total"]

    return [dict(r) for r in rows], total


def obtener_solicitud_detalle(db: Session, pksolicitud: int):
    sql = text("""
        SELECT s.pksolicitud, s.codsolicitud, s.pkcliente, s.montosolicitado,
               s.plazomeses, s.fechasolicitud, s.canal, s.observaciones,
               e.nombre AS estado, e.codestado, s.pkestadosolicitud,
               s.pktipoproductocredito,
               tp.nombre AS producto, tp.codtipoproducto, tp.tasa_interes_anual,
               c.codcliente, c.nombres, c.apellidopaterno, c.apellidomaterno,
               c.tipodocumento, c.numerodocumento, c.email, c.telefono,
               c.direccion, c.fechanacimiento, c.fechaalta,
               ag.nombre AS agencia,
               s.fechaevaluacion, s.comentario_admin, s.pkusuarioadmin_evalua,
               ua.nombres AS admin_nombres, ua.apellidos AS admin_apellidos
        FROM dsolicitud s
        INNER JOIN dcliente c ON c.pkcliente = s.pkcliente
        LEFT JOIN dagencia ag ON ag.pkagencia = c.pkagencia
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = s.pktipoproductocredito
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        LEFT JOIN usuarios_admin ua ON ua.pkusuarioadmin = s.pkusuarioadmin_evalua
        WHERE s.pksolicitud = :pk
    """)
    row = db.execute(sql, {"pk": pksolicitud}).mappings().first()
    if row is None:
        return None
    detalle = dict(row)

    ingreso_sql = text("""
        SELECT ingresomensual, fuenteingreso
        FROM fclientefuenteingreso
        WHERE pkcliente = :pk
        ORDER BY periodomes DESC
        LIMIT 1
    """)
    ingreso = db.execute(ingreso_sql, {"pk": detalle["pkcliente"]}).mappings().first()
    detalle["ingresomensual"] = ingreso["ingresomensual"] if ingreso else None
    detalle["fuenteingreso"] = ingreso["fuenteingreso"] if ingreso else None

    creditos_sql = text("""
        SELECT cc.codcuenta, tp.nombre AS producto, cc.estado, cc.montodesembolsado
        FROM dcuentacredito cc
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = cc.pktipoproductocredito
        WHERE cc.pkcliente = :pk
        ORDER BY cc.fechadesembolso DESC
    """)
    detalle["creditos_previos"] = [dict(r) for r in
                                    db.execute(creditos_sql, {"pk": detalle["pkcliente"]}).mappings().all()]
    return detalle


def obtener_pk_estadosolicitud_por_codigo(db: Session, codestado: str):
    sql = text("SELECT pkestadosolicitud FROM destadosolicitud WHERE codestado = :cod")
    row = db.execute(sql, {"cod": codestado}).mappings().first()
    return row["pkestadosolicitud"] if row else None


def actualizar_estado_solicitud(db: Session, pksolicitud: int, pkestadosolicitud: int,
                                 pkusuarioadmin: int, comentario: str | None):
    sql = text("""
        UPDATE dsolicitud
        SET pkestadosolicitud = :pkestado,
            fechaevaluacion = NOW(),
            pkusuarioadmin_evalua = :pkadmin,
            comentario_admin = :comentario
        WHERE pksolicitud = :pksolicitud
    """)
    db.execute(sql, {
        "pkestado": pkestadosolicitud, "pkadmin": pkusuarioadmin,
        "comentario": comentario, "pksolicitud": pksolicitud,
    })


# ---------------------------------------------------------------------------
# Clientes — listado, detalle, cuentas y créditos asociados
# ---------------------------------------------------------------------------
def listar_clientes(db: Session, q: str | None = None, limite: int = 50, offset: int = 0):
    filtros = []
    params = {"limite": limite, "offset": offset}

    if q:
        filtros.append("""(
            c.codcliente LIKE :q OR c.nombres LIKE :q OR c.apellidopaterno LIKE :q
            OR c.apellidomaterno LIKE :q OR c.numerodocumento LIKE :q OR c.email LIKE :q
        )""")
        params["q"] = f"%{q}%"

    where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    sql = text(f"""
        SELECT c.pkcliente, c.codcliente,
               CONCAT(c.nombres, ' ', c.apellidopaterno, ' ', c.apellidomaterno) AS nombre,
               c.tipodocumento, c.numerodocumento, c.email, c.telefono, c.activo,
               c.fechaalta, ag.nombre AS agencia,
               (SELECT COUNT(*) FROM dcuentaahorro a WHERE a.pkcliente = c.pkcliente) AS nro_cuentas_ahorro,
               (SELECT COUNT(*) FROM dcuentacredito cr WHERE cr.pkcliente = c.pkcliente) AS nro_creditos
        FROM dcliente c
        LEFT JOIN dagencia ag ON ag.pkagencia = c.pkagencia
        {where_clause}
        ORDER BY c.pkcliente DESC
        LIMIT :limite OFFSET :offset
    """)
    rows = db.execute(sql, params).mappings().all()

    count_sql = text(f"SELECT COUNT(*) AS total FROM dcliente c {where_clause}")
    total = db.execute(count_sql, params).mappings().first()["total"]

    return [dict(r) for r in rows], total


def obtener_cliente_detalle(db: Session, pkcliente: int):
    sql = text("""
        SELECT c.pkcliente, c.codcliente, c.nombres, c.apellidopaterno, c.apellidomaterno,
               c.tipodocumento, c.numerodocumento, c.email, c.telefono, c.direccion,
               c.fechanacimiento, c.sexo, c.activo, c.fechaalta, ag.nombre AS agencia
        FROM dcliente c
        LEFT JOIN dagencia ag ON ag.pkagencia = c.pkagencia
        WHERE c.pkcliente = :pk
    """)
    row = db.execute(sql, {"pk": pkcliente}).mappings().first()
    if row is None:
        return None
    detalle = dict(row)

    ahorros_sql = text("""
        SELECT ca.pkcuentaahorro, ca.codcuenta AS nro, tp.nombre AS tipo, ca.estado,
               m.codmoneda AS moneda, COALESCE(f1.saldodisponible, 0) AS saldo
        FROM dcuentaahorro ca
        INNER JOIN dtipoproductoahorro tp ON tp.pktipoproductoahorro = ca.pktipoproductoahorro
        INNER JOIN dmoneda m ON m.pkmoneda = ca.pkmoneda
        LEFT JOIN (
            SELECT f1.pkcuentaahorro, f1.saldodisponible FROM fcuentaahorro f1
            INNER JOIN (SELECT pkcuentaahorro, MAX(periododia) AS maxp FROM fcuentaahorro GROUP BY pkcuentaahorro) f2
              ON f2.pkcuentaahorro = f1.pkcuentaahorro AND f2.maxp = f1.periododia
        ) f1 ON f1.pkcuentaahorro = ca.pkcuentaahorro
        WHERE ca.pkcliente = :pk
        ORDER BY ca.pkcuentaahorro
    """)
    detalle["cuentas_ahorro"] = [dict(r) for r in db.execute(ahorros_sql, {"pk": pkcliente}).mappings().all()]

    creditos_sql = text("""
        SELECT cc.pkcuentacredito, cc.codcuenta AS cuenta, tp.nombre AS producto,
               cc.fechadesembolso, cc.estado, m.codmoneda AS moneda,
               COALESCE(ag.saldocapital, 0) AS saldo_capital,
               COALESCE(ag.pagopendiente, 0) AS pago_pendiente
        FROM dcuentacredito cc
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = cc.pktipoproductocredito
        INNER JOIN dmoneda m ON m.pkmoneda = cc.pkmoneda
        LEFT JOIN (
            SELECT f1.pkcuentacredito, f1.saldocapital, f1.pagopendiente FROM fagcuentacredito f1
            INNER JOIN (SELECT pkcuentacredito, MAX(periododia) AS maxp FROM fagcuentacredito GROUP BY pkcuentacredito) f2
              ON f2.pkcuentacredito = f1.pkcuentacredito AND f2.maxp = f1.periododia
        ) ag ON ag.pkcuentacredito = cc.pkcuentacredito
        WHERE cc.pkcliente = :pk
        ORDER BY cc.pkcuentacredito
    """)
    detalle["creditos"] = [dict(r) for r in db.execute(creditos_sql, {"pk": pkcliente}).mappings().all()]

    solicitudes_sql = text("""
        SELECT s.codsolicitud, tp.nombre AS producto, s.montosolicitado, s.plazomeses,
               e.nombre AS estado, e.codestado, s.fechasolicitud
        FROM dsolicitud s
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = s.pktipoproductocredito
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        WHERE s.pkcliente = :pk
        ORDER BY s.fechasolicitud DESC
    """)
    detalle["solicitudes"] = [dict(r) for r in db.execute(solicitudes_sql, {"pk": pkcliente}).mappings().all()]
    return detalle


# ---------------------------------------------------------------------------
# Operaciones — listado administrativo (todas las cuentas)
# ---------------------------------------------------------------------------
def listar_operaciones(db: Session, q: str | None = None, limite: int = 50, offset: int = 0):
    filtros = []
    params = {"limite": limite, "offset": offset}

    if q:
        filtros.append("(fo.codkardex LIKE :q OR c1.codcliente LIKE :q OR c2.codcliente LIKE :q)")
        params["q"] = f"%{q}%"

    where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    sql = text(f"""
        SELECT fo.pkoperacion, fo.codkardex, fo.fechahora, fo.montooperacion,
               fo.glosa, fo.codtipoegresoingreso,
               co.nombre AS concepto, can.nombre AS canal,
               COALESCE(c1.codcliente, c2.codcliente) AS codcliente,
               CONCAT(COALESCE(c1.nombres, c2.nombres), ' ',
                      COALESCE(c1.apellidopaterno, c2.apellidopaterno)) AS cliente
        FROM foperaciones fo
        INNER JOIN dconceptooperacion co ON co.pkconceptooperacion = fo.pkconceptooperacion
        LEFT JOIN dcanaltransaccional can ON can.pkcanal = fo.pkcanal
        LEFT JOIN dcliente c1 ON c1.pkcliente = fo.pkcliente
        LEFT JOIN dcuentaahorro caho ON caho.pkcuentaahorro = fo.pkcuentaahorroorigen
        LEFT JOIN dcliente c2 ON c2.pkcliente = caho.pkcliente
        {where_clause}
        ORDER BY fo.fechahora DESC, fo.pkoperacion DESC
        LIMIT :limite OFFSET :offset
    """)
    rows = db.execute(sql, params).mappings().all()

    count_sql = text(f"""
        SELECT COUNT(*) AS total
        FROM foperaciones fo
        LEFT JOIN dcliente c1 ON c1.pkcliente = fo.pkcliente
        LEFT JOIN dcuentaahorro caho ON caho.pkcuentaahorro = fo.pkcuentaahorroorigen
        LEFT JOIN dcliente c2 ON c2.pkcliente = caho.pkcliente
        {where_clause}
    """)
    total = db.execute(count_sql, params).mappings().first()["total"]

    return [dict(r) for r in rows], total


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------
def reporte_creditos_por_producto(db: Session):
    sql = text("""
        SELECT tp.nombre AS producto, COUNT(*) AS nro_creditos,
               COALESCE(SUM(ag.saldocapital), 0) AS saldo_cartera
        FROM dcuentacredito cc
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = cc.pktipoproductocredito
        LEFT JOIN (
            SELECT f1.pkcuentacredito, f1.saldocapital
            FROM fagcuentacredito f1
            INNER JOIN (
                SELECT pkcuentacredito, MAX(periododia) AS maxperiodo
                FROM fagcuentacredito GROUP BY pkcuentacredito
            ) f2 ON f2.pkcuentacredito = f1.pkcuentacredito AND f2.maxperiodo = f1.periododia
        ) ag ON ag.pkcuentacredito = cc.pkcuentacredito
        WHERE cc.estado = 'VIGENTE'
        GROUP BY tp.nombre
        ORDER BY saldo_cartera DESC
    """)
    rows = db.execute(sql).mappings().all()
    return [dict(r) for r in rows]


def reporte_solicitudes_por_mes(db: Session, meses: int = 6):
    sql = text("""
        SELECT DATE_FORMAT(s.fechasolicitud, '%Y-%m') AS periodo,
               COUNT(*) AS total,
               SUM(CASE WHEN e.codestado = '2' THEN 1 ELSE 0 END) AS aprobadas,
               SUM(CASE WHEN e.codestado = '3' THEN 1 ELSE 0 END) AS rechazadas
        FROM dsolicitud s
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        GROUP BY periodo
        ORDER BY periodo DESC
        LIMIT :meses
    """)
    rows = db.execute(sql, {"meses": meses}).mappings().all()
    return [dict(r) for r in rows][::-1]


def reporte_cartera_por_agencia(db: Session):
    sql = text("""
        SELECT ag.nombre AS agencia, COUNT(*) AS nro_creditos,
               COALESCE(SUM(cc.montodesembolsado), 0) AS monto_desembolsado,
               COALESCE(SUM(ag2.saldocapital), 0) AS saldo_capital_vigente
        FROM dcuentacredito cc
        INNER JOIN dagencia ag ON ag.pkagencia = cc.pkagencia
        LEFT JOIN (
            SELECT f1.pkcuentacredito, f1.saldocapital FROM fagcuentacredito f1
            INNER JOIN (SELECT pkcuentacredito, MAX(periododia) AS maxp FROM fagcuentacredito GROUP BY pkcuentacredito) f2
              ON f2.pkcuentacredito = f1.pkcuentacredito AND f2.maxp = f1.periododia
        ) ag2 ON ag2.pkcuentacredito = cc.pkcuentacredito
        WHERE cc.estado = 'VIGENTE'
        GROUP BY ag.nombre
        ORDER BY saldo_capital_vigente DESC
    """)
    return [dict(r) for r in db.execute(sql).mappings().all()]


def reporte_morosidad(db: Session):
    sql = text("""
        SELECT
            CASE
                WHEN pp.diasmora = 0 THEN 'Sin mora'
                WHEN pp.diasmora BETWEEN 1 AND 30 THEN '1-30 dias'
                WHEN pp.diasmora BETWEEN 31 AND 60 THEN '31-60 dias'
                WHEN pp.diasmora BETWEEN 61 AND 90 THEN '61-90 dias'
                ELSE 'Mas de 90 dias'
            END AS tramo,
            COUNT(*) AS nro_cuotas,
            COALESCE(SUM(pp.montocuota - pp.montocapitalpagado - pp.montointerespagado), 0) AS monto_pendiente
        FROM fplanpagomes pp
        WHERE pp.estadocuota IN ('PENDIENTE', 'VENCIDA', 'PARCIAL')
        GROUP BY tramo
    """)
    return [dict(r) for r in db.execute(sql).mappings().all()]


# ---------------------------------------------------------------------------
# Desembolso de crédito — integración real Solicitud -> Cuenta de Crédito
#
# Estas funciones NO hacen commit/rollback por sí mismas: la atomicidad de
# toda la operación de desembolso la controla ctrl_admin.desembolsar_credito,
# que envuelve las 4 escrituras (dsolicitud, dcuentacredito, fagcuentacredito,
# fplanpagomes) en una sola transacción de base de datos.
# ---------------------------------------------------------------------------
def obtener_pkmoneda_por_codigo(db: Session, codigo: str = "PEN"):
    sql = text("SELECT pkmoneda FROM dmoneda WHERE codmoneda = :codigo")
    row = db.execute(sql, {"codigo": codigo}).mappings().first()
    return row["pkmoneda"] if row else None


def obtener_pkagencia_cliente(db: Session, pkcliente: int):
    sql = text("SELECT pkagencia FROM dcliente WHERE pkcliente = :pk")
    row = db.execute(sql, {"pk": pkcliente}).mappings().first()
    return row["pkagencia"] if row else None


def periododia_valido_mas_cercano(db: Session, fecha):
    """
    Devuelve el periododia (YYYYMMDD como INT) más cercano hacia atrás que
    exista en dtiempo para la fecha dada, ya que fagcuentacredito y
    fplanpagomes referencian dtiempo por FK y el calendario generado por el
    seed tiene un rango acotado.
    """
    objetivo = int(fecha.strftime("%Y%m%d"))
    sql = text("""
        SELECT periododia FROM dtiempo
        WHERE periododia <= :objetivo
        ORDER BY periododia DESC
        LIMIT 1
    """)
    row = db.execute(sql, {"objetivo": objetivo}).mappings().first()
    if row:
        return row["periododia"]
    # Si no hay ninguno hacia atrás (fecha anterior a todo el calendario),
    # usamos el primer periododia disponible.
    row = db.execute(text("SELECT MIN(periododia) AS p FROM dtiempo")).mappings().first()
    return row["p"]


def siguiente_numero_cuenta_credito(db: Session) -> int:
    sql = text("SELECT COUNT(*) AS total FROM dcuentacredito")
    return db.execute(sql).mappings().first()["total"]


def insertar_cuenta_credito(db: Session, codcuenta: str, pkcliente: int, pktipoproductocredito: int,
                             pkmoneda: int, pkagencia: int, montodesembolsado, plazomeses: int,
                             tasainteresanual, fechadesembolso) -> int:
    sql = text("""
        INSERT INTO dcuentacredito
            (codcuenta, pkcliente, pktipoproductocredito, pkmoneda, pkagencia,
             montodesembolsado, plazomeses, tasainteresanual, fechadesembolso, estado)
        VALUES
            (:codcuenta, :pkcliente, :pktipoproductocredito, :pkmoneda, :pkagencia,
             :montodesembolsado, :plazomeses, :tasainteresanual, :fechadesembolso, 'VIGENTE')
    """)
    db.execute(sql, {
        "codcuenta": codcuenta, "pkcliente": pkcliente,
        "pktipoproductocredito": pktipoproductocredito, "pkmoneda": pkmoneda,
        "pkagencia": pkagencia, "montodesembolsado": montodesembolsado,
        "plazomeses": plazomeses, "tasainteresanual": tasainteresanual,
        "fechadesembolso": fechadesembolso,
    })
    pk = db.execute(text("SELECT LAST_INSERT_ID() AS pk")).mappings().first()["pk"]
    return pk


def insertar_fagcuentacredito_inicial(db: Session, pkcuentacredito: int, periododia: int,
                                       saldocapital, pagopendiente):
    sql = text("""
        INSERT INTO fagcuentacredito (pkcuentacredito, periododia, saldocapital, pagopendiente, diasmoraacumulado)
        VALUES (:pk, :periododia, :saldocapital, :pagopendiente, 0)
    """)
    db.execute(sql, {
        "pk": pkcuentacredito, "periododia": periododia,
        "saldocapital": saldocapital, "pagopendiente": pagopendiente,
    })


def insertar_plan_pagos(db: Session, filas: list[dict]):
    """
    filas: lista de dicts con pkcuentacredito, nrocuota, periododiavencimiento,
    montocapital, montointeres, montocuota (montocapitalpagado/montointerespagado/
    diasmora quedan en su default 0; estadocuota='PENDIENTE' por default).
    """
    sql = text("""
        INSERT INTO fplanpagomes
            (pkcuentacredito, nrocuota, periododiavencimiento, montocapital, montointeres, montocuota)
        VALUES
            (:pkcuentacredito, :nrocuota, :periododiavencimiento, :montocapital, :montointeres, :montocuota)
    """)
    db.execute(sql, filas)
