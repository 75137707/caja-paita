"""
repo_auth.py — Consultas SQL crudas relacionadas a autenticación de clientes.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def obtener_usuario_homebanking_por_username(db: Session, username: str):
    sql = text("""
        SELECT uh.pkusuario, uh.pkcliente, uh.username, uh.password_hash, uh.activo,
               uh.bloqueado, uh.intentos_fallidos, uh.ultimo_acceso,
               c.codcliente, c.nombres, c.apellidopaterno, c.apellidomaterno, c.activo AS cliente_activo
        FROM usuarios_homebanking uh
        INNER JOIN dcliente c ON c.pkcliente = uh.pkcliente
        WHERE uh.username = :username
    """)
    row = db.execute(sql, {"username": username}).mappings().first()
    return dict(row) if row else None


def incrementar_intentos_fallidos(db: Session, pkusuario: int, bloquear: bool):
    sql = text("""
        UPDATE usuarios_homebanking
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado = :bloquear
        WHERE pkusuario = :pkusuario
    """)
    db.execute(sql, {"pkusuario": pkusuario, "bloquear": 1 if bloquear else 0})
    db.commit()


def reset_intentos_y_marcar_acceso(db: Session, pkusuario: int):
    sql = text("""
        UPDATE usuarios_homebanking
        SET intentos_fallidos = 0,
            ultimo_acceso = NOW()
        WHERE pkusuario = :pkusuario
    """)
    db.execute(sql, {"pkusuario": pkusuario})
    db.commit()


# ---------------------------------------------------------------------------
# Registro / autoregistro de cliente a Caja Virtual
# ---------------------------------------------------------------------------
def obtener_cliente_por_documento(db: Session, tipodocumento: str, numerodocumento: str):
    """Busca al cliente en el core (dcliente) por tipo+número de documento."""
    sql = text("""
        SELECT pkcliente, codcliente, tipodocumento, numerodocumento,
               nombres, apellidopaterno, apellidomaterno, email, activo
        FROM dcliente
        WHERE tipodocumento = :tipodocumento AND numerodocumento = :numerodocumento
    """)
    row = db.execute(sql, {
        "tipodocumento": tipodocumento,
        "numerodocumento": numerodocumento,
    }).mappings().first()
    return dict(row) if row else None


def obtener_usuario_homebanking_por_pkcliente(db: Session, pkcliente: int):
    sql = text("""
        SELECT pkusuario, username FROM usuarios_homebanking WHERE pkcliente = :pkcliente
    """)
    row = db.execute(sql, {"pkcliente": pkcliente}).mappings().first()
    return dict(row) if row else None


def crear_usuario_homebanking(db: Session, pkcliente: int, username: str, password_hash: str):
    sql = text("""
        INSERT INTO usuarios_homebanking
            (pkcliente, username, password_hash, activo, bloqueado, intentos_fallidos, fechacreacion)
        VALUES
            (:pkcliente, :username, :password_hash, 1, 0, 0, NOW())
    """)
    db.execute(sql, {
        "pkcliente": pkcliente,
        "username": username,
        "password_hash": password_hash,
    })
    db.commit()


# ---------------------------------------------------------------------------
# Apertura de cuenta — cliente totalmente NUEVO (sin relación previa con el
# banco). A diferencia del autoregistro (que solo activa el acceso digital
# de alguien que ya es cliente), este flujo crea el cliente desde cero en
# el core financiero, igual que la apertura presencial en agencia.
# ---------------------------------------------------------------------------
def obtener_cliente_por_tipo_y_numero_documento(db: Session, tipodocumento: str, numerodocumento: str):
    """Alias semántico de obtener_cliente_por_documento, usado en apertura
    para chequear duplicados antes de crear un dcliente nuevo."""
    return obtener_cliente_por_documento(db, tipodocumento, numerodocumento)


def siguiente_codcliente(db: Session) -> str:
    """Genera el siguiente código correlativo CLI###### siguiendo el mismo
    formato que usa sql/02_seed_data.py (CLI{i:06d})."""
    sql = text("""
        SELECT COALESCE(MAX(CAST(SUBSTRING(codcliente, 4) AS UNSIGNED)), 0) + 1 AS siguiente
        FROM dcliente
        WHERE codcliente REGEXP '^CLI[0-9]+$'
    """)
    siguiente = int(db.execute(sql).scalar() or 1)
    return f"CLI{siguiente:06d}"


def obtener_agencia_principal(db: Session):
    """Agencia por defecto para clientes que se aperturan por Caja Virtual
    (sin elegir agencia física, como en una apertura presencial)."""
    sql = text("SELECT pkagencia, nombre FROM dagencia WHERE activo = 1 ORDER BY pkagencia LIMIT 1")
    row = db.execute(sql).mappings().first()
    return dict(row) if row else None


def obtener_tipoproductoahorro_por_codigo(db: Session, codtipoproducto: str):
    sql = text("""
        SELECT pktipoproductoahorro, nombre, tasa_interes_anual
        FROM dtipoproductoahorro
        WHERE codtipoproducto = :cod AND activo = 1
    """)
    row = db.execute(sql, {"cod": codtipoproducto}).mappings().first()
    return dict(row) if row else None


def obtener_pkmoneda_por_codigo(db: Session, codmoneda: str = "PEN"):
    sql = text("SELECT pkmoneda FROM dmoneda WHERE codmoneda = :cod")
    row = db.execute(sql, {"cod": codmoneda}).mappings().first()
    return row["pkmoneda"] if row else None


def crear_cliente_nuevo(db: Session, *, codcliente: str, tipodocumento: str, numerodocumento: str,
                         nombres: str, apellidopaterno: str, apellidomaterno: str,
                         fechanacimiento, sexo: str | None, email: str, telefono: str,
                         direccion: str, pkagencia: int) -> int:
    """Inserta el registro dcliente desde cero. Devuelve el pkcliente generado."""
    sql = text("""
        INSERT INTO dcliente
            (codcliente, tipodocumento, numerodocumento, nombres, apellidopaterno,
             apellidomaterno, fechanacimiento, sexo, email, telefono, direccion,
             pkagencia, fechaalta, activo)
        VALUES
            (:codcliente, :tipodocumento, :numerodocumento, :nombres, :apellidopaterno,
             :apellidomaterno, :fechanacimiento, :sexo, :email, :telefono, :direccion,
             :pkagencia, CURDATE(), 1)
    """)
    result = db.execute(sql, {
        "codcliente": codcliente,
        "tipodocumento": tipodocumento,
        "numerodocumento": numerodocumento,
        "nombres": nombres,
        "apellidopaterno": apellidopaterno,
        "apellidomaterno": apellidomaterno,
        "fechanacimiento": fechanacimiento,
        "sexo": sexo,
        "email": email,
        "telefono": telefono,
        "direccion": direccion,
        "pkagencia": pkagencia,
    })
    return result.lastrowid


def crear_fuente_ingreso(db: Session, pkcliente: int, ingresomensual, fuenteingreso: str):
    """Registra el ingreso declarado del periodo actual (yyyymm), necesario
    para que el motor de RDS (ctrl_reglas) pueda evaluar futuras solicitudes
    de crédito de este cliente nuevo."""
    sql = text("""
        INSERT INTO fclientefuenteingreso (pkcliente, periodomes, ingresomensual, fuenteingreso, fechaactualizacion)
        VALUES (:pkcliente, CAST(DATE_FORMAT(CURDATE(), '%Y%m') AS UNSIGNED), :ingresomensual, :fuenteingreso, NOW())
    """)
    db.execute(sql, {
        "pkcliente": pkcliente,
        "ingresomensual": ingresomensual,
        "fuenteingreso": fuenteingreso,
    })


def siguiente_codcuenta_ahorro(db: Session) -> str:
    """Genera el siguiente código correlativo AHO-###### igual que el seed."""
    sql = text("""
        SELECT COALESCE(MAX(CAST(SUBSTRING(codcuenta, 5) AS UNSIGNED)), 0) + 1 AS siguiente
        FROM dcuentaahorro
        WHERE codcuenta REGEXP '^AHO-[0-9]+$'
    """)
    siguiente = int(db.execute(sql).scalar() or 1)
    return f"AHO-{siguiente:06d}"


def crear_cuenta_ahorro_apertura(db: Session, *, codcuenta: str, pkcliente: int,
                                  pktipoproductoahorro: int, pkmoneda: int, pkagencia: int) -> int:
    """Abre la cuenta de ahorro inicial del cliente nuevo, con saldo 0,
    igual que sucede al aperturar una cuenta de forma presencial."""
    sql = text("""
        INSERT INTO dcuentaahorro
            (codcuenta, pkcliente, pktipoproductoahorro, pkmoneda, pkagencia, fechaapertura, estado)
        VALUES
            (:codcuenta, :pkcliente, :pktipoproductoahorro, :pkmoneda, :pkagencia, CURDATE(), 'ACTIVA')
    """)
    result = db.execute(sql, {
        "codcuenta": codcuenta,
        "pkcliente": pkcliente,
        "pktipoproductoahorro": pktipoproductoahorro,
        "pkmoneda": pkmoneda,
        "pkagencia": pkagencia,
    })
    pkcuentaahorro = result.lastrowid

    periododia_hoy = text("SELECT CAST(DATE_FORMAT(CURDATE(), '%Y%m%d') AS UNSIGNED) AS hoy")
    periododia = db.execute(periododia_hoy).scalar()

    db.execute(text("""
        INSERT INTO fcuentaahorro (pkcuentaahorro, periododia, saldocontable, saldodisponible)
        VALUES (:pkcuentaahorro, :periododia, 0, 0)
    """), {"pkcuentaahorro": pkcuentaahorro, "periododia": periododia})

    return pkcuentaahorro
