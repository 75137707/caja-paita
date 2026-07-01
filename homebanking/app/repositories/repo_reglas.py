"""
repo_reglas.py — Consultas SQL crudas para el motor de reglas de negocio del
crédito (Criterio 2): obtiene los datos que el motor necesita para calcular
RDS y nivel de aprobación, y persiste el resultado de la evaluación.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def obtener_datos_evaluacion(db: Session, pksolicitud: int):
    """
    Trae todo lo que el motor de reglas necesita en una sola consulta:
    monto/plazo solicitados, tasa del producto, e ingreso mensual más
    reciente registrado para el cliente (fclientefuenteingreso).
    """
    sql = text("""
        SELECT s.pksolicitud, s.codsolicitud, s.pkcliente, s.montosolicitado,
               s.plazomeses, s.pkestadosolicitud, e.codestado,
               tp.tasa_interes_anual,
               (
                   SELECT f.ingresomensual FROM fclientefuenteingreso f
                   WHERE f.pkcliente = s.pkcliente
                   ORDER BY f.periodomes DESC LIMIT 1
               ) AS ingresomensual
        FROM dsolicitud s
        INNER JOIN dtipoproductocredito tp ON tp.pktipoproductocredito = s.pktipoproductocredito
        INNER JOIN destadosolicitud e ON e.pkestadosolicitud = s.pkestadosolicitud
        WHERE s.pksolicitud = :pk
    """)
    row = db.execute(sql, {"pk": pksolicitud}).mappings().first()
    return dict(row) if row else None


def obtener_impedimentos_crediticios(db: Session, pkcliente: int):
    """
    Sujeto de crédito (Criterio 2 — elegibilidad): busca si el cliente tiene
    algún crédito propio que lo descalifique para una NUEVA solicitud:
      - estado contable 'CASTIGADO' (deuda dada de baja, nunca recuperada), o
      - estado_cobranza en 'JUDICIAL' o 'CASTIGO' (cartera derivada a cobranza
        judicial o ya castigada por mora, ver R3 del módulo de Mora).
    Devuelve la fila del primer crédito que dispara el impedimento (o None si
    el cliente es elegible). Se usa antes de calcular el RDS: no tiene sentido
    evaluar capacidad de pago de quien ya incumplió una deuda anterior.
    """
    sql = text("""
        SELECT codcuenta, estado, estado_cobranza
        FROM dcuentacredito
        WHERE pkcliente = :pkcliente
          AND (estado = 'CASTIGADO' OR estado_cobranza IN ('JUDICIAL', 'CASTIGO'))
        LIMIT 1
    """)
    row = db.execute(sql, {"pkcliente": pkcliente}).mappings().first()
    return dict(row) if row else None


def obtener_pk_estadosolicitud_por_codigo(db: Session, codigo: str):
    sql = text("SELECT pkestadosolicitud FROM destadosolicitud WHERE codestado = :c")
    row = db.execute(sql, {"c": codigo}).mappings().first()
    return row["pkestadosolicitud"] if row else None


def guardar_resultado_evaluacion(db: Session, pksolicitud: int, pkestadosolicitud: int,
                                  comentario: str):
    """
    Actualiza el estado de la solicitud con el resultado del motor de reglas
    y deja constancia del cálculo (RDS, cuota estimada, nivel) en el campo
    de comentario, para trazabilidad ante un auditor.
    """
    sql = text("""
        UPDATE dsolicitud
        SET pkestadosolicitud = :pkestado,
            comentario_admin = :comentario,
            fechaevaluacion = NOW()
        WHERE pksolicitud = :pk
    """)
    db.execute(sql, {"pkestado": pkestadosolicitud, "comentario": comentario, "pk": pksolicitud})
