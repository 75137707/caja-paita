-- =============================================================================
-- 03_modulo_mora.sql
-- Módulo de Recuperaciones / Mora (Criterio 4) + ampliación de roles RBAC
-- (Criterio 3) sobre una base bd_core_financiero YA CREADA con 01_schema.sql
-- y poblada con 02_seed_data.py.
--
-- Este script es INCREMENTAL: no usa DROP TABLE sobre las tablas existentes,
-- así que puedes correrlo después del seed sin perder los 1100 clientes,
-- créditos y movimientos ya generados.
--
-- Uso (MySQL Workbench): File -> Open SQL Script... -> Ctrl+Shift+Enter
-- Uso (CLI):            mysql -u root -p bd_core_financiero < 03_modulo_mora.sql
-- =============================================================================

USE bd_core_financiero;

-- -----------------------------------------------------------------------------
-- 1. RBAC — ampliar los roles permitidos en usuarios_admin
--    (si la tabla ya tenía el comentario viejo ADMIN/ANALISTA, esto no falla;
--     el VARCHAR ya admitía cualquier texto, solo documentamos el dominio real)
-- -----------------------------------------------------------------------------
ALTER TABLE usuarios_admin
    MODIFY COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'ASESOR'
    COMMENT 'ASESOR / ADMIN / JEFE_RIESGOS / COMITE / GERENCIA / ANALISTA';

-- Usuarios de prueba para los roles nuevos (no se tocan los que ya existan
-- con el mismo username; password para todos = admin1234)
INSERT INTO usuarios_admin (username, password_hash, nombres, apellidos, email, rol, pkagencia)
SELECT 'priesgos',
       (SELECT password_hash FROM usuarios_admin WHERE username = 'admin' LIMIT 1),
       'Patricia', 'Reyes Olaya', 'preyes@cajapaita.pe', 'JEFE_RIESGOS', NULL
WHERE NOT EXISTS (SELECT 1 FROM usuarios_admin WHERE username = 'priesgos');

INSERT INTO usuarios_admin (username, password_hash, nombres, apellidos, email, rol, pkagencia)
SELECT 'ccomite',
       (SELECT password_hash FROM usuarios_admin WHERE username = 'admin' LIMIT 1),
       'Carlos', 'Quevedo Mendoza', 'cquevedo@cajapaita.pe', 'COMITE', NULL
WHERE NOT EXISTS (SELECT 1 FROM usuarios_admin WHERE username = 'ccomite');

INSERT INTO usuarios_admin (username, password_hash, nombres, apellidos, email, rol, pkagencia)
SELECT 'ggerencia',
       (SELECT password_hash FROM usuarios_admin WHERE username = 'admin' LIMIT 1),
       'Gabriela', 'Sosa Tello', 'gsosa@cajapaita.pe', 'GERENCIA', NULL
WHERE NOT EXISTS (SELECT 1 FROM usuarios_admin WHERE username = 'ggerencia');

INSERT INTO usuarios_admin (username, password_hash, nombres, apellidos, email, rol, pkagencia)
SELECT 'jasesor',
       (SELECT password_hash FROM usuarios_admin WHERE username = 'admin' LIMIT 1),
       'Jorge', 'Salinas Cordova', 'jsalinas@cajapaita.pe', 'ASESOR',
       (SELECT pkagencia FROM dagencia ORDER BY pkagencia LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM usuarios_admin WHERE username = 'jasesor');

-- Nota: si ya tenías 'janalista' / 'manalista' del seed anterior, se conservan
-- con rol ANALISTA (equivalente operativo a ASESOR para back-compat).

-- -----------------------------------------------------------------------------
-- 2. Mora — estado de cobranza por cuenta de crédito (para R3: transición a
--    Judicial / Castigo). dcuentacredito.estado ya maneja VIGENTE/CANCELADO/
--    CASTIGADO a nivel "contable"; agregamos un estado de COBRANZA aparte,
--    porque un crédito puede seguir VIGENTE contablemente pero ya estar en
--    proceso judicial de cobranza.
--
--    Las siguientes sentencias son idempotentes: usan procedimientos temporales
--    que verifican INFORMATION_SCHEMA antes de alterar, para poder re-ejecutar
--    este script sin error si ya se corrió antes.
-- -----------------------------------------------------------------------------
DELIMITER //
DROP PROCEDURE IF EXISTS _add_col_if_missing //
CREATE PROCEDURE _add_col_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_ddl TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
    ) THEN
        SET @ddl = p_ddl;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DROP PROCEDURE IF EXISTS _add_fk_if_missing //
CREATE PROCEDURE _add_fk_if_missing(IN p_table VARCHAR(64), IN p_constraint VARCHAR(64), IN p_ddl TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_constraint
    ) THEN
        SET @ddl = p_ddl;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL _add_col_if_missing('dcuentacredito', 'estado_cobranza',
    "ALTER TABLE dcuentacredito ADD COLUMN estado_cobranza VARCHAR(15) NOT NULL DEFAULT 'NORMAL' COMMENT 'NORMAL / PREVENTIVA / TEMPRANA / TARDIA / JUDICIAL / CASTIGO'");

CALL _add_col_if_missing('dcuentacredito', 'fecha_judicializacion',
    "ALTER TABLE dcuentacredito ADD COLUMN fecha_judicializacion DATE NULL");

CALL _add_col_if_missing('dcuentacredito', 'fecha_castigo',
    "ALTER TABLE dcuentacredito ADD COLUMN fecha_castigo DATE NULL");

CALL _add_col_if_missing('dcuentacredito', 'pkusuarioadmin_resuelve',
    "ALTER TABLE dcuentacredito ADD COLUMN pkusuarioadmin_resuelve INT NULL COMMENT 'Usuario (rol JEFE_RIESGOS) que resolvió la última transición de cobranza'");

CALL _add_fk_if_missing('dcuentacredito', 'fk_dcc_admin_resuelve',
    "ALTER TABLE dcuentacredito ADD CONSTRAINT fk_dcc_admin_resuelve FOREIGN KEY (pkusuarioadmin_resuelve) REFERENCES usuarios_admin(pkusuarioadmin)");

DROP PROCEDURE IF EXISTS _add_col_if_missing;
DROP PROCEDURE IF EXISTS _add_fk_if_missing;

-- -----------------------------------------------------------------------------
-- 3. Mora — banda de mora calculada (vista) según diasmoraacumulado vigente
--    de fagcuentacredito (último periododia cargado por crédito).
--    Bandas (normativa de referencia microfinanzas):
--      Sin mora      : 0 días
--      Preventiva    : 1-30 días
--      Temprana      : 31-60 días
--      Tardía        : 61-90 días
--      Judicial       : 91-180 días  (umbral real de pase a judicial: 121 días,
--                       ver R3 en backend — la vista solo clasifica por días)
--      Castigo        : >180 días
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_mora_actual AS
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

-- -----------------------------------------------------------------------------
-- 4. Mora — Gestiones de cobranza (R2: registro e historial de gestiones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dgestioncobranza (
    pkgestion          INT AUTO_INCREMENT PRIMARY KEY,
    pkcuentacredito     INT NOT NULL,
    pkusuarioadmin      INT NOT NULL,
    fechahora           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    canal_contacto      VARCHAR(20) NOT NULL
        COMMENT 'LLAMADA / VISITA / SMS / EMAIL / WHATSAPP',
    resultado           VARCHAR(20) NOT NULL
        COMMENT 'CONTACTADO / NO_CONTACTADO / PROMESA_PAGO / RECHAZO / SIN_RESPUESTA',
    banda_mora_momento  VARCHAR(15) NOT NULL
        COMMENT 'Banda de mora vigente al momento de la gestión',
    fecha_promesa_pago  DATE NULL,
    monto_promesa       DECIMAL(12,2) NULL,
    observaciones       VARCHAR(255) NULL,
    CONSTRAINT fk_dgc_cuenta FOREIGN KEY (pkcuentacredito) REFERENCES dcuentacredito(pkcuentacredito),
    CONSTRAINT fk_dgc_admin FOREIGN KEY (pkusuarioadmin) REFERENCES usuarios_admin(pkusuarioadmin),
    INDEX idx_dgc_cuenta (pkcuentacredito),
    INDEX idx_dgc_fecha (fechahora)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. Comité de créditos (preparación para Criterio 2 — ruta de aprobación)
--    Se agregan estados de solicitud para opinión de Admisión, Riesgos y Comité.
-- -----------------------------------------------------------------------------
INSERT INTO destadosolicitud (codestado, nombre)
SELECT '5', 'Opinion Riesgos Pendiente'
WHERE NOT EXISTS (SELECT 1 FROM destadosolicitud WHERE codestado = '5');

INSERT INTO destadosolicitud (codestado, nombre)
SELECT '6', 'En Comite'
WHERE NOT EXISTS (SELECT 1 FROM destadosolicitud WHERE codestado = '6');

INSERT INTO destadosolicitud (codestado, nombre)
SELECT '7', 'Observada'
WHERE NOT EXISTS (SELECT 1 FROM destadosolicitud WHERE codestado = '7');

-- -----------------------------------------------------------------------------
-- 6. Inicializar estado_cobranza de créditos ya existentes según su mora actual
--    (para todo crédito no cancelado: VIGENTE o ya CASTIGADO contablemente)
-- -----------------------------------------------------------------------------
UPDATE dcuentacredito dcc
INNER JOIN (
    SELECT pkcuentacredito, banda_mora FROM vw_mora_actual
) v ON v.pkcuentacredito = dcc.pkcuentacredito
SET dcc.estado_cobranza = CASE
    WHEN v.banda_mora = 'SIN_MORA' THEN 'NORMAL'
    ELSE v.banda_mora
END
WHERE dcc.estado <> 'CANCELADO';

SELECT '03_modulo_mora.sql aplicado correctamente.' AS resultado;
