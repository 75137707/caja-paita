-- =============================================================================
-- 04_extender_calendario_y_fix_vista.sql
--
-- Dos correcciones necesarias para que el desembolso real de créditos
-- (ctrl_admin.desembolsar_credito) funcione con cualquier plazo/fecha:
--
-- 1) El calendario dtiempo generado por 02_seed_data.py solo cubre
--    2023-01-01 a 2027-12-31. Un crédito a 36 meses desembolsado hoy
--    (2026) vencería su última cuota en 2029, fuera de ese rango, y la FK
--    de fplanpagomes/fagcuentacredito hacia dtiempo lo rechazaría. Este
--    script extiende el calendario hasta 2032-12-31.
--
-- 2) Documenta el fix de la vista vw_mora_actual que se aplicó manualmente
--    en Workbench tras detectar el error 1356 "View ... references invalid
--    table(s)" — la vista queda invalidada por MySQL cada vez que las
--    tablas base (dcuentacredito, fagcuentacredito) se recrean con
--    DROP TABLE, como hace 02_seed_data.py. Recrearla aquí deja registrado
--    el fix como parte del versionado de scripts (no como un parche suelto).
--
-- Es seguro volver a correr este script las veces que sea necesario
-- (usa DROP/INSERT IGNORE de forma idempotente).
--
-- Uso (MySQL Workbench): File -> Open SQL Script... -> Ctrl+Shift+Enter
-- Uso (CLI):            mysql -u root -p bd_core_financiero < 04_extender_calendario_y_fix_vista.sql
-- =============================================================================

USE bd_core_financiero;

-- -----------------------------------------------------------------------------
-- 1. Extender dtiempo de 2028-01-01 a 2032-12-31
-- -----------------------------------------------------------------------------
DELIMITER //
DROP PROCEDURE IF EXISTS _extender_dtiempo //
CREATE PROCEDURE _extender_dtiempo()
BEGIN
    DECLARE v_fecha DATE;
    DECLARE v_fin DATE;
    DECLARE v_periododia INT;
    DECLARE v_periodomes INT;
    DECLARE v_nombre_mes VARCHAR(20);
    DECLARE v_dia_semana VARCHAR(15);
    DECLARE v_es_habil TINYINT;

    SET v_fecha = '2028-01-01';
    SET v_fin = '2032-12-31';

    WHILE v_fecha <= v_fin DO
        SET v_periododia = CAST(DATE_FORMAT(v_fecha, '%Y%m%d') AS UNSIGNED);
        SET v_periodomes = CAST(DATE_FORMAT(v_fecha, '%Y%m') AS UNSIGNED);

        SET v_nombre_mes = ELT(MONTH(v_fecha),
            'Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre');

        -- WEEKDAY(): 0=Lunes ... 6=Domingo (igual orden que el seed original)
        SET v_dia_semana = ELT(WEEKDAY(v_fecha) + 1,
            'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo');

        SET v_es_habil = IF(WEEKDAY(v_fecha) >= 5, 0, 1);

        INSERT IGNORE INTO dtiempo
            (periododia, fecha, anio, mes, dia, periodomes, nombre_mes, dia_semana, es_habil)
        VALUES
            (v_periododia, v_fecha, YEAR(v_fecha), MONTH(v_fecha), DAY(v_fecha),
             v_periodomes, v_nombre_mes, v_dia_semana, v_es_habil);

        SET v_fecha = DATE_ADD(v_fecha, INTERVAL 1 DAY);
    END WHILE;
END //
DELIMITER ;

CALL _extender_dtiempo();
DROP PROCEDURE IF EXISTS _extender_dtiempo;

-- -----------------------------------------------------------------------------
-- 2. Recrear vw_mora_actual (fix del error 1356 de vista invalidada)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_mora_actual;

CREATE VIEW vw_mora_actual AS
SELECT
    dcc.pkcuentacredito,
    dcc.codcuenta,
    dcc.pkcliente,
    dcc.estado            AS estado_contable,
    dcc.estado_cobranza,
    f.periododia           AS periododia_corte,
    f.saldocapital,
    f.pagopendiente,
    f.diasmoraacumulado,
    CASE
        WHEN f.diasmoraacumulado <= 0 THEN 'SIN_MORA'
        WHEN f.diasmoraacumulado BETWEEN 1 AND 30 THEN 'PREVENTIVA'
        WHEN f.diasmoraacumulado BETWEEN 31 AND 60 THEN 'TEMPRANA'
        WHEN f.diasmoraacumulado BETWEEN 61 AND 90 THEN 'TARDIA'
        WHEN f.diasmoraacumulado BETWEEN 91 AND 180 THEN 'JUDICIAL'
        ELSE 'CASTIGO'
    END AS banda_mora
FROM dcuentacredito dcc
INNER JOIN fagcuentacredito f
    ON f.pkcuentacredito = dcc.pkcuentacredito
    AND f.periododia = (
        SELECT MAX(f2.periododia)
        FROM fagcuentacredito f2
        WHERE f2.pkcuentacredito = dcc.pkcuentacredito
    )
WHERE dcc.estado <> 'CANCELADO';

SELECT
    (SELECT MAX(periododia) FROM dtiempo) AS calendario_extendido_hasta,
    '04_extender_calendario_y_fix_vista.sql aplicado correctamente.' AS resultado;
