-- ============================================================================
-- bd_core_financiero — Esquema MySQL 8.x
-- Caja Municipal (estilo CMAC Paita) — Core financiero + Homebanking
-- ============================================================================
-- Convenciones:
--   d<entidad>   = tabla dimensión / maestro
--   f<entidad>   = tabla de hechos / transaccional
--   pk<entidad>  = clave primaria (INT AUTO_INCREMENT salvo PK natural/compuesta)
--   cod<entidad> = código de negocio (varchar, único, visible al usuario)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS bd_core_financiero
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE bd_core_financiero;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. CATÁLOGOS / DIMENSIONES BÁSICAS
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS dtiempo;
CREATE TABLE dtiempo (
    periododia      INT PRIMARY KEY,            -- formato yyyymmdd
    fecha           DATE NOT NULL,
    anio            SMALLINT NOT NULL,
    mes             TINYINT NOT NULL,
    dia             TINYINT NOT NULL,
    periodomes      INT NOT NULL,                -- formato yyyymm
    nombre_mes      VARCHAR(20) NOT NULL,
    dia_semana      VARCHAR(15) NOT NULL,
    es_habil        TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_dtiempo_fecha (fecha)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dmoneda;
CREATE TABLE dmoneda (
    pkmoneda        INT AUTO_INCREMENT PRIMARY KEY,
    codmoneda       VARCHAR(3) NOT NULL UNIQUE,   -- PEN / USD
    nombre          VARCHAR(30) NOT NULL,
    simbolo         VARCHAR(5) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dagencia;
CREATE TABLE dagencia (
    pkagencia       INT AUTO_INCREMENT PRIMARY KEY,
    codagencia      VARCHAR(10) NOT NULL UNIQUE,
    nombre          VARCHAR(80) NOT NULL,
    direccion       VARCHAR(150),
    departamento    VARCHAR(50),
    provincia       VARCHAR(50),
    distrito        VARCHAR(50),
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dtipooperacion;
CREATE TABLE dtipooperacion (
    pktipooperacion INT AUTO_INCREMENT PRIMARY KEY,
    codtipooperacion VARCHAR(10) NOT NULL UNIQUE,  -- TRF / DEB / CRE / PAG
    nombre          VARCHAR(60) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dconceptooperacion;
CREATE TABLE dconceptooperacion (
    pkconceptooperacion INT AUTO_INCREMENT PRIMARY KEY,
    codconcepto     VARCHAR(10) NOT NULL UNIQUE,    -- PCAP / DCAP / TRAN / PSER
    nombre          VARCHAR(80) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dmediopago;
CREATE TABLE dmediopago (
    pkmediopago     INT AUTO_INCREMENT PRIMARY KEY,
    codmediopago    VARCHAR(10) NOT NULL UNIQUE,    -- APP / WEB / VENTANILLA / AGENTE
    nombre          VARCHAR(60) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dcanaltransaccional;
CREATE TABLE dcanaltransaccional (
    pkcanal         INT AUTO_INCREMENT PRIMARY KEY,
    codcanal        VARCHAR(10) NOT NULL UNIQUE,    -- APP / WEB / VENTANILLA / AGENTE / ATM
    nombre          VARCHAR(60) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dcondicioncontable;
CREATE TABLE dcondicioncontable (
    pkcondicioncontable INT AUTO_INCREMENT PRIMARY KEY,
    codcondicioncontable VARCHAR(2) NOT NULL UNIQUE,  -- '01' Vigente Normal, etc.
    nombre          VARCHAR(60) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dentidadfinanciera;
CREATE TABLE dentidadfinanciera (
    pkentidadfinanciera INT AUTO_INCREMENT PRIMARY KEY,
    codentidad      VARCHAR(10) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    codigo_interbancario VARCHAR(10),
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dtipoproductoahorro;
CREATE TABLE dtipoproductoahorro (
    pktipoproductoahorro INT AUTO_INCREMENT PRIMARY KEY,
    codtipoproducto VARCHAR(10) NOT NULL UNIQUE,    -- AHC (Ahorro Corriente) / PLZ (Plazo Fijo) / CTS / SUE (Sueldo)
    nombre          VARCHAR(60) NOT NULL,
    tasa_interes_anual DECIMAL(6,4) NOT NULL DEFAULT 0,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dtipoproductocredito;
CREATE TABLE dtipoproductocredito (
    pktipoproductocredito INT AUTO_INCREMENT PRIMARY KEY,
    codtipoproducto VARCHAR(15) NOT NULL UNIQUE,    -- LIBREDISP / EMPRESARIAL / PESCA / CRECEMUJER...
    nombre          VARCHAR(80) NOT NULL,
    tasa_interes_anual DECIMAL(6,4) NOT NULL DEFAULT 0,
    activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS destadosolicitud;
CREATE TABLE destadosolicitud (
    pkestadosolicitud INT AUTO_INCREMENT PRIMARY KEY,
    codestado       VARCHAR(10) NOT NULL UNIQUE,
    nombre          VARCHAR(60) NOT NULL    -- 1=En Evaluación, 2=Aprobado, 3=Rechazado, 4=Desembolsado
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. CLIENTES
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS dcliente;
CREATE TABLE dcliente (
    pkcliente       INT AUTO_INCREMENT PRIMARY KEY,
    codcliente      VARCHAR(15) NOT NULL UNIQUE,     -- CLI000001
    tipodocumento   VARCHAR(10) NOT NULL DEFAULT 'DNI',
    numerodocumento VARCHAR(20) NOT NULL,
    nombres         VARCHAR(80) NOT NULL,
    apellidopaterno VARCHAR(50) NOT NULL,
    apellidomaterno VARCHAR(50) NOT NULL,
    fechanacimiento DATE,
    sexo            CHAR(1),
    email           VARCHAR(100),
    telefono        VARCHAR(20),
    direccion       VARCHAR(150),
    pkagencia       INT,
    fechaalta       DATE NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_dcliente_doc (tipodocumento, numerodocumento),
    CONSTRAINT fk_dcliente_agencia FOREIGN KEY (pkagencia) REFERENCES dagencia(pkagencia)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS fclientefuenteingreso;
CREATE TABLE fclientefuenteingreso (
    pkcliente       INT NOT NULL,
    periodomes      INT NOT NULL,                    -- yyyymm
    ingresomensual  DECIMAL(12,2) NOT NULL DEFAULT 0,
    fuenteingreso   VARCHAR(60),
    fechaactualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pkcliente, periodomes),
    CONSTRAINT fk_ffi_cliente FOREIGN KEY (pkcliente) REFERENCES dcliente(pkcliente)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. AHORROS
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS dcuentaahorro;
CREATE TABLE dcuentaahorro (
    pkcuentaahorro  INT AUTO_INCREMENT PRIMARY KEY,
    codcuenta       VARCHAR(20) NOT NULL UNIQUE,      -- nro de cuenta
    pkcliente       INT NOT NULL,
    pktipoproductoahorro INT NOT NULL,
    pkmoneda        INT NOT NULL,
    pkagencia       INT NOT NULL,
    fechaapertura   DATE NOT NULL,
    estado          VARCHAR(15) NOT NULL DEFAULT 'ACTIVA',  -- ACTIVA / BLOQUEADA / CANCELADA
    CONSTRAINT fk_dca_cliente FOREIGN KEY (pkcliente) REFERENCES dcliente(pkcliente),
    CONSTRAINT fk_dca_tipoprod FOREIGN KEY (pktipoproductoahorro) REFERENCES dtipoproductoahorro(pktipoproductoahorro),
    CONSTRAINT fk_dca_moneda FOREIGN KEY (pkmoneda) REFERENCES dmoneda(pkmoneda),
    CONSTRAINT fk_dca_agencia FOREIGN KEY (pkagencia) REFERENCES dagencia(pkagencia)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS fcuentaahorro;
CREATE TABLE fcuentaahorro (
    pkcuentaahorro  INT NOT NULL,
    periododia      INT NOT NULL,
    saldocontable   DECIMAL(14,2) NOT NULL DEFAULT 0,
    saldodisponible DECIMAL(14,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (pkcuentaahorro, periododia),
    CONSTRAINT fk_fca_cuenta FOREIGN KEY (pkcuentaahorro) REFERENCES dcuentaahorro(pkcuentaahorro),
    CONSTRAINT fk_fca_tiempo FOREIGN KEY (periododia) REFERENCES dtiempo(periododia)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. CRÉDITOS
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS dsolicitud;
CREATE TABLE dsolicitud (
    pksolicitud     INT AUTO_INCREMENT PRIMARY KEY,
    codsolicitud    VARCHAR(20) NOT NULL UNIQUE,
    pkcliente       INT NOT NULL,
    pktipoproductocredito INT NOT NULL,
    montosolicitado DECIMAL(12,2) NOT NULL,
    plazomeses      SMALLINT NOT NULL,
    pkestadosolicitud INT NOT NULL,
    fechasolicitud  DATE NOT NULL,
    canal           VARCHAR(10) NOT NULL DEFAULT 'WEB',
    observaciones   VARCHAR(255),
    fechaevaluacion       DATETIME NULL,
    comentario_admin      VARCHAR(255) NULL,
    pkusuarioadmin_evalua INT NULL,
    CONSTRAINT fk_dsol_cliente FOREIGN KEY (pkcliente) REFERENCES dcliente(pkcliente),
    CONSTRAINT fk_dsol_tipoprod FOREIGN KEY (pktipoproductocredito) REFERENCES dtipoproductocredito(pktipoproductocredito),
    CONSTRAINT fk_dsol_estado FOREIGN KEY (pkestadosolicitud) REFERENCES destadosolicitud(pkestadosolicitud)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS dcuentacredito;
CREATE TABLE dcuentacredito (
    pkcuentacredito INT AUTO_INCREMENT PRIMARY KEY,
    codcuenta       VARCHAR(20) NOT NULL UNIQUE,
    pkcliente       INT NOT NULL,
    pktipoproductocredito INT NOT NULL,
    pkmoneda        INT NOT NULL,
    pkagencia       INT NOT NULL,
    montodesembolsado DECIMAL(12,2) NOT NULL,
    plazomeses      SMALLINT NOT NULL,
    tasainteresanual DECIMAL(6,4) NOT NULL,
    fechadesembolso DATE NOT NULL,
    estado          VARCHAR(15) NOT NULL DEFAULT 'VIGENTE',   -- VIGENTE / CANCELADO / CASTIGADO
    CONSTRAINT fk_dcc_cliente FOREIGN KEY (pkcliente) REFERENCES dcliente(pkcliente),
    CONSTRAINT fk_dcc_tipoprod FOREIGN KEY (pktipoproductocredito) REFERENCES dtipoproductocredito(pktipoproductocredito),
    CONSTRAINT fk_dcc_moneda FOREIGN KEY (pkmoneda) REFERENCES dmoneda(pkmoneda),
    CONSTRAINT fk_dcc_agencia FOREIGN KEY (pkagencia) REFERENCES dagencia(pkagencia)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS fagcuentacredito;
CREATE TABLE fagcuentacredito (
    pkcuentacredito INT NOT NULL,
    periododia      INT NOT NULL,
    saldocapital    DECIMAL(14,2) NOT NULL DEFAULT 0,
    pagopendiente   DECIMAL(14,2) NOT NULL DEFAULT 0,
    diasmoraacumulado INT NOT NULL DEFAULT 0,
    PRIMARY KEY (pkcuentacredito, periododia),
    CONSTRAINT fk_facc_cuenta FOREIGN KEY (pkcuentacredito) REFERENCES dcuentacredito(pkcuentacredito),
    CONSTRAINT fk_facc_tiempo FOREIGN KEY (periododia) REFERENCES dtiempo(periododia)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS fplanpagomes;
CREATE TABLE fplanpagomes (
    pkplanpago      INT AUTO_INCREMENT PRIMARY KEY,
    pkcuentacredito INT NOT NULL,
    nrocuota        SMALLINT NOT NULL,
    periododiavencimiento INT NOT NULL,
    montocapital    DECIMAL(12,2) NOT NULL,
    montointeres    DECIMAL(12,2) NOT NULL,
    montocuota      DECIMAL(12,2) NOT NULL,
    montocapitalpagado DECIMAL(12,2) NOT NULL DEFAULT 0,
    montointerespagado DECIMAL(12,2) NOT NULL DEFAULT 0,
    fechapago       DATE NULL,
    diasmora        INT NOT NULL DEFAULT 0,
    estadocuota     VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE / PAGADA / VENCIDA / PARCIAL
    UNIQUE KEY uq_fpp_cuenta_nro (pkcuentacredito, nrocuota),
    CONSTRAINT fk_fpp_cuenta FOREIGN KEY (pkcuentacredito) REFERENCES dcuentacredito(pkcuentacredito),
    CONSTRAINT fk_fpp_tiempo FOREIGN KEY (periododiavencimiento) REFERENCES dtiempo(periododia)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. OPERACIONES (tabla de hechos transaccional principal)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS foperaciones;
CREATE TABLE foperaciones (
    pkoperacion         BIGINT AUTO_INCREMENT PRIMARY KEY,
    codtipkar           CHAR(2) NOT NULL,             -- 'CR' / 'DB'
    codkardex           VARCHAR(40) NOT NULL UNIQUE,  -- ej PAG-<pkcc>-<nro>-<periododia>
    codtipoegresoingreso CHAR(1) NOT NULL,             -- 'I' ingreso / 'E' egreso
    periododia           INT NOT NULL,
    pkconceptooperacion   INT NOT NULL,
    pktipooperacion       INT NOT NULL,
    pkmoneda              INT NOT NULL,
    pkagenciaorigen        INT NOT NULL,
    pkagenciadestino       INT NULL,
    pkcuentaahorroorigen   INT NULL,
    pkcuentaahorrodestino  INT NULL,
    pkcuentacredito        INT NULL,
    pkcliente              INT NULL,
    pkmediopago            INT NULL,
    pkcanal                INT NULL,
    pkcondicioncontable    INT NULL,
    montooperacion         DECIMAL(14,2) NOT NULL,
    montopagoconcepto      DECIMAL(14,2) NOT NULL,
    glosa                   VARCHAR(150),
    fechahora               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fop_tiempo FOREIGN KEY (periododia) REFERENCES dtiempo(periododia),
    CONSTRAINT fk_fop_concepto FOREIGN KEY (pkconceptooperacion) REFERENCES dconceptooperacion(pkconceptooperacion),
    CONSTRAINT fk_fop_tipoop FOREIGN KEY (pktipooperacion) REFERENCES dtipooperacion(pktipooperacion),
    CONSTRAINT fk_fop_moneda FOREIGN KEY (pkmoneda) REFERENCES dmoneda(pkmoneda),
    CONSTRAINT fk_fop_agorigen FOREIGN KEY (pkagenciaorigen) REFERENCES dagencia(pkagencia),
    CONSTRAINT fk_fop_agdestino FOREIGN KEY (pkagenciadestino) REFERENCES dagencia(pkagencia),
    CONSTRAINT fk_fop_ctaahorigen FOREIGN KEY (pkcuentaahorroorigen) REFERENCES dcuentaahorro(pkcuentaahorro),
    CONSTRAINT fk_fop_ctaahdestino FOREIGN KEY (pkcuentaahorrodestino) REFERENCES dcuentaahorro(pkcuentaahorro),
    CONSTRAINT fk_fop_ctacred FOREIGN KEY (pkcuentacredito) REFERENCES dcuentacredito(pkcuentacredito),
    CONSTRAINT fk_fop_cliente FOREIGN KEY (pkcliente) REFERENCES dcliente(pkcliente),
    CONSTRAINT fk_fop_mediopago FOREIGN KEY (pkmediopago) REFERENCES dmediopago(pkmediopago),
    CONSTRAINT fk_fop_canal FOREIGN KEY (pkcanal) REFERENCES dcanaltransaccional(pkcanal),
    CONSTRAINT fk_fop_condcont FOREIGN KEY (pkcondicioncontable) REFERENCES dcondicioncontable(pkcondicioncontable),
    INDEX idx_fop_cuentaah_origen (pkcuentaahorroorigen),
    INDEX idx_fop_cuentaah_destino (pkcuentaahorrodestino),
    INDEX idx_fop_cuentacred (pkcuentacredito),
    INDEX idx_fop_periododia (periododia)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. HOMEBANKING (Caja Virtual)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS usuarios_homebanking;
CREATE TABLE usuarios_homebanking (
    pkusuario       INT AUTO_INCREMENT PRIMARY KEY,
    pkcliente       INT NOT NULL UNIQUE,
    username        VARCHAR(30) NOT NULL UNIQUE,
    password_hash   VARCHAR(100) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    bloqueado       TINYINT(1) NOT NULL DEFAULT 0,
    intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
    ultimo_acceso   DATETIME NULL,
    fechacreacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uh_cliente FOREIGN KEY (pkcliente) REFERENCES dcliente(pkcliente)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. ADMINISTRACIÓN (panel interno de personal de Caja Paita / back-office)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS usuarios_admin;
CREATE TABLE usuarios_admin (
    pkusuarioadmin  INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(30) NOT NULL UNIQUE,
    password_hash   VARCHAR(100) NOT NULL,
    nombres         VARCHAR(80) NOT NULL,
    apellidos       VARCHAR(80) NOT NULL,
    email           VARCHAR(100),
    rol             VARCHAR(20) NOT NULL DEFAULT 'ASESOR',   -- ASESOR / ADMIN / JEFE_RIESGOS / COMITE / GERENCIA / ANALISTA
    pkagencia       INT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    bloqueado       TINYINT(1) NOT NULL DEFAULT 0,
    intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
    ultimo_acceso   DATETIME NULL,
    fechacreacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ua_agencia FOREIGN KEY (pkagencia) REFERENCES dagencia(pkagencia)
) ENGINE=InnoDB;

-- FK diferida: dsolicitud.pkusuarioadmin_evalua referencia al admin que evaluó
-- la solicitud (queda NULL mientras está "En Evaluación").
ALTER TABLE dsolicitud
    ADD CONSTRAINT fk_dsol_admin_evalua
    FOREIGN KEY (pkusuarioadmin_evalua) REFERENCES usuarios_admin(pkusuarioadmin);

SET FOREIGN_KEY_CHECKS = 1;
