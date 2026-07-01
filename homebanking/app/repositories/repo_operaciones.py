"""
repo_operaciones.py — Resolución de catálogos por código + inserción en foperaciones.
NUNCA se hardcodean PKs de catálogo: siempre se resuelven por su código de negocio.
"""
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session


def hoy_periododia() -> int:
    return int(date.today().strftime("%Y%m%d"))


def verificar_periododia_existe(db: Session, periododia: int) -> bool:
    sql = text("SELECT 1 FROM dtiempo WHERE periododia = :p")
    return db.execute(sql, {"p": periododia}).first() is not None


def pk_tipooperacion(db: Session, codigo: str) -> int | None:
    sql = text("SELECT pktipooperacion FROM dtipooperacion WHERE codtipooperacion = :c AND activo = 1")
    row = db.execute(sql, {"c": codigo}).mappings().first()
    return row["pktipooperacion"] if row else None


def pk_conceptooperacion(db: Session, codigo: str) -> int | None:
    sql = text("SELECT pkconceptooperacion FROM dconceptooperacion WHERE codconcepto = :c AND activo = 1")
    row = db.execute(sql, {"c": codigo}).mappings().first()
    return row["pkconceptooperacion"] if row else None


def pk_mediopago(db: Session, codigo: str) -> int | None:
    sql = text("SELECT pkmediopago FROM dmediopago WHERE codmediopago = :c AND activo = 1")
    row = db.execute(sql, {"c": codigo}).mappings().first()
    return row["pkmediopago"] if row else None


def pk_canaltransaccional(db: Session, codigo: str) -> int | None:
    sql = text("SELECT pkcanal FROM dcanaltransaccional WHERE codcanal = :c AND activo = 1")
    row = db.execute(sql, {"c": codigo}).mappings().first()
    return row["pkcanal"] if row else None


def pk_condicioncontable(db: Session, codigo: str) -> int | None:
    sql = text("SELECT pkcondicioncontable FROM dcondicioncontable WHERE codcondicioncontable = :c AND activo = 1")
    row = db.execute(sql, {"c": codigo}).mappings().first()
    return row["pkcondicioncontable"] if row else None


def pk_moneda_de_cuenta_ahorro(db: Session, pkcuentaahorro: int) -> int | None:
    sql = text("SELECT pkmoneda FROM dcuentaahorro WHERE pkcuentaahorro = :p")
    row = db.execute(sql, {"p": pkcuentaahorro}).mappings().first()
    return row["pkmoneda"] if row else None


def pk_agencia_de_cuenta_ahorro(db: Session, pkcuentaahorro: int) -> int | None:
    sql = text("SELECT pkagencia FROM dcuentaahorro WHERE pkcuentaahorro = :p")
    row = db.execute(sql, {"p": pkcuentaahorro}).mappings().first()
    return row["pkagencia"] if row else None


def pk_agencia_de_credito(db: Session, pkcuentacredito: int) -> int | None:
    sql = text("SELECT pkagencia FROM dcuentacredito WHERE pkcuentacredito = :p")
    row = db.execute(sql, {"p": pkcuentacredito}).mappings().first()
    return row["pkagencia"] if row else None


def insertar_operacion(
    db: Session,
    codtipkar: str,
    codkardex: str,
    codtipoegresoingreso: str,
    periododia: int,
    pkconceptooperacion: int,
    pktipooperacion: int,
    pkmoneda: int,
    pkagenciaorigen: int,
    montooperacion,
    montopagoconcepto,
    pkagenciadestino: int | None = None,
    pkcuentaahorroorigen: int | None = None,
    pkcuentaahorrodestino: int | None = None,
    pkcuentacredito: int | None = None,
    pkcliente: int | None = None,
    pkmediopago: int | None = None,
    pkcanal: int | None = None,
    pkcondicioncontable: int | None = None,
    glosa: str | None = None,
) -> int:
    sql = text("""
        INSERT INTO foperaciones (
            codtipkar, codkardex, codtipoegresoingreso, periododia,
            pkconceptooperacion, pktipooperacion, pkmoneda, pkagenciaorigen, pkagenciadestino,
            pkcuentaahorroorigen, pkcuentaahorrodestino, pkcuentacredito, pkcliente,
            pkmediopago, pkcanal, pkcondicioncontable, montooperacion, montopagoconcepto, glosa
        ) VALUES (
            :codtipkar, :codkardex, :codtipoegresoingreso, :periododia,
            :pkconceptooperacion, :pktipooperacion, :pkmoneda, :pkagenciaorigen, :pkagenciadestino,
            :pkcuentaahorroorigen, :pkcuentaahorrodestino, :pkcuentacredito, :pkcliente,
            :pkmediopago, :pkcanal, :pkcondicioncontable, :montooperacion, :montopagoconcepto, :glosa
        )
    """)
    result = db.execute(sql, {
        "codtipkar": codtipkar, "codkardex": codkardex,
        "codtipoegresoingreso": codtipoegresoingreso, "periododia": periododia,
        "pkconceptooperacion": pkconceptooperacion, "pktipooperacion": pktipooperacion,
        "pkmoneda": pkmoneda, "pkagenciaorigen": pkagenciaorigen,
        "pkagenciadestino": pkagenciadestino,
        "pkcuentaahorroorigen": pkcuentaahorroorigen, "pkcuentaahorrodestino": pkcuentaahorrodestino,
        "pkcuentacredito": pkcuentacredito, "pkcliente": pkcliente,
        "pkmediopago": pkmediopago, "pkcanal": pkcanal,
        "pkcondicioncontable": pkcondicioncontable,
        "montooperacion": montooperacion, "montopagoconcepto": montopagoconcepto,
        "glosa": glosa,
    })
    return result.lastrowid


def existe_codkardex(db: Session, codkardex: str) -> bool:
    sql = text("SELECT 1 FROM foperaciones WHERE codkardex = :c")
    return db.execute(sql, {"c": codkardex}).first() is not None
