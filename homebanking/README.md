# Homebanking (Caja Virtual) — API FastAPI

API REST para el homebanking de la caja municipal (estilo Caja Paita), construida en
**FastAPI + MySQL**, en arquitectura por capas (core / repositories / controllers / routes /
schemas), igual que el sistema "core financiero" del que depende.

> ⚠️ Esta base de datos (`bd_core_financiero`) fue creada desde cero para este proyecto,
> con un modelo completo "estilo core financiero" (clientes, agencias, calendario, catálogos,
> cuentas de ahorro, créditos, operaciones) y datos de prueba realistas. No es la base real
> de producción de ninguna caja — es un esquema y dataset simulado para desarrollo y pruebas.

---

## 1. Requisitos

- Python 3.10+
- MySQL 8.x / MariaDB 10.6+ / XAMPP / Laragon (cualquiera funciona, la sintaxis SQL es estándar)
- Git Bash (Windows) o cualquier terminal Unix-like

---

## 2. Instalación (Git Bash)

```bash
# 1. Entrar a la carpeta del proyecto
cd homebanking

# 2. Crear entorno virtual (opcional pero recomendado)
python -m venv venv
source venv/Scripts/activate          # Git Bash en Windows
# source venv/bin/activate            # Linux/Mac

# 3. Instalar dependencias
pip install -r requirements.txt
```

---

## 3. Crear la base de datos

Abre tu cliente MySQL (Workbench, HeidiSQL, línea de comandos, phpMyAdmin de XAMPP, etc.)
con el usuario `root` y la contraseña que configuraste, y ejecuta en este orden:

### 3.1. Crear el esquema

```bash
mysql -u root -p < sql/01_schema.sql
```

Esto crea la base `bd_core_financiero` y **todas** las tablas necesarias:
catálogos (`dmoneda`, `dagencia`, `dtipooperacion`, `dconceptooperacion`, `dmediopago`,
`dcanaltransaccional`, `dcondicioncontable`, `dentidadfinanciera`, `dtipoproductoahorro`,
`dtipoproductocredito`, `destadosolicitud`), calendario (`dtiempo`), clientes (`dcliente`,
`fclientefuenteingreso`), ahorros (`dcuentaahorro`, `fcuentaahorro`), créditos
(`dcuentacredito`, `fagcuentacredito`, `fplanpagomes`, `dsolicitud`), operaciones
(`foperaciones`) y homebanking (`usuarios_homebanking`).

### 3.2. Cargar datos de prueba

Edita `sql/02_seed_data.py` si tu contraseña de MySQL no es `123456` (variables `DB_*`
al inicio del archivo), luego ejecútalo:

```bash
python sql/02_seed_data.py
```

Esto genera:
- 1,100 clientes con usuario de homebanking
- 730 cuentas de ahorro
- 1,100 créditos con su cronograma de cuotas completo (~21,500 cuotas)
- 3,094 operaciones (pagos de cuota, transferencias, desembolsos, pagos de servicios)
- 150 solicitudes de crédito adicionales (históricas / en evaluación)
- Calendario completo `dtiempo` 2023–2027

El proceso toma entre 30 segundos y un par de minutos según tu máquina.

---

## 4. Configurar `.env`

El archivo `.env` ya viene con valores por defecto. Ajusta `DATABASE_URL` si tu MySQL
tiene otro usuario/password/host/puerto:

```env
DATABASE_URL=mysql+pymysql://root:123456@localhost:3306/bd_core_financiero
JWT_SECRET_KEY=cambiar-esta-clave-en-produccion-homebanking-caja-paita
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
MAX_INTENTOS_FALLIDOS=3
CORS_ORIGINS=["http://localhost:5173"]
APP_PORT=8002
```

---

## 5. Levantar el servidor

```bash
uvicorn main:app --reload --port 8002
```

La API queda disponible en `http://localhost:8002`.
Documentación interactiva (Swagger): `http://localhost:8002/docs`

---

## 6. Usuarios de prueba

Todos los clientes tienen homebanking habilitado:

- **username**: código de cliente en minúsculas, ej. `cli000001`, `cli000002`, ... `cli001100`
- **password**: `demo1234` (igual para todos)

> Tras 3 intentos fallidos de password, el usuario queda **bloqueado**
> (`MAX_INTENTOS_FALLIDOS` en `.env`). Para desbloquear manualmente en pruebas:
> ```sql
> UPDATE usuarios_homebanking SET bloqueado=0, intentos_fallidos=0 WHERE username='cli000001';
> ```

Para encontrar un cliente con un escenario específico (cuenta con saldo, crédito vigente
con cuotas pendientes, etc.) puedes consultar directamente la base, por ejemplo:

```sql
-- Cliente con cuenta de ahorro activa Y crédito vigente con cuotas pendientes
SELECT c.codcliente, ca.codcuenta AS cuenta_ahorro, cc.codcuenta AS cuenta_credito
FROM dcliente c
JOIN dcuentaahorro ca ON ca.pkcliente = c.pkcliente AND ca.estado='ACTIVA'
JOIN dcuentacredito cc ON cc.pkcliente = c.pkcliente AND cc.estado='VIGENTE'
WHERE EXISTS (
    SELECT 1 FROM fplanpagomes pp WHERE pp.pkcuentacredito = cc.pkcuentacredito
    AND pp.estadocuota IN ('PENDIENTE','VENCIDA','PARCIAL')
)
LIMIT 5;
```

### 6.1. Usuarios del panel de administración (back-office)

Sembrados en `usuarios_admin` por `sql/02_seed_data.py`:

| username    | password     | rol      |
|-------------|--------------|----------|
| `admin`     | `admin1234`  | ADMIN    |
| `janalista` | `admin1234`  | ANALISTA |
| `manalista` | `admin1234`  | ANALISTA |

Se autentican en `/admin/auth/login` (no en `/auth/login`) y reciben un JWT con
`tipo: "admin"`, validado por la dependencia `get_admin`. A diferencia del login
de clientes, **el login admin sí valida la contraseña con bcrypt** (sin bypass).

> Igual que con clientes, tras `MAX_INTENTOS_FALLIDOS` intentos el usuario queda
> bloqueado. Para desbloquear en pruebas:
> ```sql
> UPDATE usuarios_admin SET bloqueado=0, intentos_fallidos=0 WHERE username='admin';
> ```

---

## 7. Ejemplos de cada endpoint (Git Bash / curl)

### 7.1. Login

```bash
curl -X POST http://localhost:8002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cli000001","password":"demo1234"}'
```

Respuesta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "codcliente": "CLI000001",
  "nombre": "Roberto Lopez Garcia",
  "expires_in_minutes": 60
}
```

Guarda el token en una variable para los siguientes ejemplos:
```bash
TOKEN=$(curl -s -X POST http://localhost:8002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cli000001","password":"demo1234"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 7.2. Listar cuentas de ahorro

```bash
curl http://localhost:8002/cuentas/ahorro/ -H "Authorization: Bearer $TOKEN"
```

```json
[
  {
    "pkcuentaahorro": 192,
    "nro": "AHO-000192",
    "tipo": "Peke Ahorro",
    "saldo": "16838.46",
    "estado": "ACTIVA",
    "moneda": "PEN",
    "fechaapertura": "2025-08-04"
  }
]
```

### 7.3. Movimientos de una cuenta de ahorro

```bash
curl http://localhost:8002/cuentas/ahorro/AHO-000192/movimientos -H "Authorization: Bearer $TOKEN"
```

```json
[
  {
    "pkoperacion": 3095,
    "fecha": "2026-06-21T17:19:02",
    "codkardex": "TRF-DB-192-563-20260621",
    "tipooperacion": "Transferencia",
    "concepto": "Transferencia entre Cuentas",
    "tipo_egreso_ingreso": "E",
    "monto": "300.00",
    "glosa": "Transferencia entre cuentas propias",
    "canal": "Aplicacion Movil"
  }
]
```

### 7.4. Listar créditos

```bash
curl http://localhost:8002/cuentas/credito/ -H "Authorization: Bearer $TOKEN"
```

```json
[
  {
    "pkcuentacredito": 1004,
    "cuenta": "CRE-001004",
    "producto": "Credito Rapidito",
    "fecha_desembolso": "2024-03-15",
    "saldo_capital": "8500.00",
    "pago_pendiente": "9200.30",
    "estado": "VIGENTE",
    "moneda": "PEN"
  }
]
```

### 7.5. Cronograma de cuotas de un crédito

```bash
curl http://localhost:8002/cuentas/credito/CRE-001004/cuotas -H "Authorization: Bearer $TOKEN"
```

```json
[
  {
    "pkplanpago": 14083,
    "nro": 1,
    "vencimiento": "2024-04-15",
    "monto_capital": "708.33",
    "monto_interes": "198.33",
    "monto_cuota": "906.67",
    "capital_pagado": "708.33",
    "interes_pagado": "198.33",
    "dias_mora": 0,
    "estado": "PAGADA"
  }
]
```

### 7.6. Pagar la próxima cuota pendiente

```bash
curl -X POST http://localhost:8002/operaciones/pago-cuota \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pkcuentacredito": 1004, "pkcuentaahorro_origen": 1, "canal": "WEB"}'
```

```json
{
  "mensaje": "Pago de cuota procesado correctamente",
  "nrocuota": 15,
  "monto_pagado": "210.15",
  "codkardex": "PAG-1004-15-20260621",
  "saldo_restante_cuenta": "9821.91"
}
```

> Nota: `pkcuentacredito` y `pkcuentaahorro_origen` son los **PK numéricos**
> (visibles en las respuestas de `/cuentas/credito/` y `/cuentas/ahorro/` como
> `pkcuentacredito` y `pkcuentaahorro`), no el código de cuenta.

### 7.7. Transferencia entre cuentas propias

```bash
curl -X POST http://localhost:8002/operaciones/transferencia \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pkcuentaahorro_origen": 192,
    "pkcuentaahorro_destino": 563,
    "monto": 300,
    "glosa": "Ahorro mensual",
    "canal": "APP"
  }'
```

```json
{
  "mensaje": "Transferencia procesada correctamente",
  "codkardex_debito": "TRF-DB-192-563-20260621",
  "codkardex_credito": "TRF-CR-192-563-20260621",
  "saldo_origen": "16838.46",
  "saldo_destino": "14260.28"
}
```

### 7.8. Solicitar un crédito

```bash
curl -X POST http://localhost:8002/creditos/solicitar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codtipoproducto": "LIBREDISP",
    "montosolicitado": 5000,
    "plazomeses": 12,
    "canal": "WEB",
    "observaciones": "Para capital de trabajo"
  }'
```

```json
{
  "codsolicitud": "SOL-000152",
  "estado": "En Evaluación",
  "mensaje": "Solicitud registrada correctamente. Será evaluada por el área de créditos."
}
```

Productos de crédito disponibles (`codtipoproducto`): `LIBREDISP`, `EMPRESARIAL`, `PESCA`,
`CRECEMUJER`, `RAPIDITO`, `AGROPECUARIO`.

### 7.9. Panel de administración (back-office)

Todas las rutas bajo `/admin/*` requieren el header `Authorization: Bearer $ADMIN_TOKEN`,
obtenido desde `/admin/auth/login` (un JWT distinto al de clientes).

```bash
# Login admin
curl -X POST http://localhost:8002/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin1234"}'
# -> { "access_token": "...", "username": "admin", "nombre": "Administrador Sistema", "rol": "ADMIN", ... }

ADMIN_TOKEN="<pegar access_token aquí>"

# Dashboard: KPIs, solicitudes por estado, recientes y operaciones recientes
curl http://localhost:8002/admin/dashboard/ -H "Authorization: Bearer $ADMIN_TOKEN"

# Listar solicitudes en evaluación
curl "http://localhost:8002/admin/solicitudes/?estado=1&limite=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Detalle de una solicitud (incluye datos completos del cliente)
curl http://localhost:8002/admin/solicitudes/1 -H "Authorization: Bearer $ADMIN_TOKEN"

# Aprobar una solicitud (codestado: 2=Aprobado, 3=Rechazado, 4=Desembolsado)
curl -X PATCH http://localhost:8002/admin/solicitudes/1/estado \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"codestado": "2", "comentario": "Cliente con buen historial"}'

# Listar / buscar clientes
curl "http://localhost:8002/admin/clientes/?q=Garcia&limite=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Detalle de un cliente (cuentas, créditos y solicitudes asociadas)
curl http://localhost:8002/admin/clientes/1 -H "Authorization: Bearer $ADMIN_TOKEN"

# Operaciones de todos los clientes
curl "http://localhost:8002/admin/operaciones/?limite=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Reportes agregados (cartera por producto/agencia, solicitudes por mes, morosidad)
curl http://localhost:8002/admin/reportes/ -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 8. Reglas de negocio implementadas

- **Autenticación de cliente** (no personal del banco): JWT con `tipo: "cliente"`,
  validado por la dependencia `get_cliente`. Cualquier token sin `tipo=="cliente"` es
  rechazado (403).
- **Bloqueo de cuenta**: tras `MAX_INTENTOS_FALLIDOS` (default 3) intentos fallidos de
  password, el usuario queda bloqueado (423) hasta intervención manual.
- **Aislamiento por cliente**: todas las consultas y operaciones verifican que la cuenta
  de ahorro / crédito pertenezca al cliente autenticado (404 si no, nunca se filtra
  información de otro cliente).
- **Catálogos resueltos por código**, nunca PKs hardcodeados (`dtipooperacion`,
  `dconceptooperacion`, `dmediopago`, `dcanaltransaccional`, `dcondicioncontable`,
  `dtipoproductocredito`).
- **`codkardex` único** por movimiento, con verificación de colisión y sufijo automático
  si ya existe.
- **`periododia`** se valida contra `dtiempo` antes de insertar cualquier operación.
- **Transferencias entre cuentas propias**: se valida incluso que ambas cuentas (origen y
  destino) pertenezcan al mismo cliente, estén activas y en la misma moneda. Se insertan
  2 filas en `foperaciones` (débito en origen, crédito en destino) — patrón de doble
  partida — manteniendo el saldo actualizado en `fcuentaahorro` (UPSERT por
  `pkcuentaahorro + periododia`, que es PK compuesta).
- **Pago de cuota**: toma siempre la próxima cuota pendiente/vencida/parcial (por
  `nrocuota` ascendente), descuenta de la cuenta de ahorro propia, actualiza
  `fplanpagomes.montocapitalpagado/montointerespagado` y recalcula el saldo agregado en
  `fagcuentacredito`.
- **Solicitud de crédito**: se registra en `dsolicitud` con estado inicial `"1"`
  (En Evaluación, resuelto desde `destadosolicitud` por código, no hardcodeado). La
  evaluación (aprobar/rechazar/marcar como desembolsado) la realiza el personal interno
  desde el **panel de administración** (`/admin/solicitudes/*`, ver sección 7.9).
- **Transición de estados de solicitud**: solo se puede actuar sobre una solicitud
  `"En Evaluación"` → `Aprobado` o `Rechazado`; y desde `Aprobado` → `Desembolsado`. Una
  vez `Rechazado` o `Desembolsado`, el estado queda fijo (400 si se intenta modificar).
  Cada cambio registra `fechaevaluacion`, `pkusuarioadmin_evalua` y `comentario_admin`
  en la propia fila de `dsolicitud` (trazabilidad de quién y cuándo evaluó).
- **Panel admin con autenticación separada**: el personal interno (`usuarios_admin`) usa
  un login y un JWT (`tipo: "admin"`) distintos de los clientes de homebanking
  (`tipo: "cliente"`), por lo que un token de cliente nunca puede usarse para acceder a
  rutas `/admin/*` y viceversa.

---

## 9. Diferencias respecto al documento de especificación original

El documento de especificación original fue escrito para **PostgreSQL** (con
`nextval()` de secuencias explícitas y sintaxis `ON CONFLICT`). Esta implementación usa
**MySQL/MariaDB**, con los siguientes ajustes equivalentes:

| Postgres (spec original) | MySQL (esta implementación) |
|---|---|
| `nextval('seq')` para PK | `AUTO_INCREMENT` + `cursor.lastrowid` |
| `INSERT ... ON CONFLICT DO UPDATE` (upsert) | `INSERT ... ON DUPLICATE KEY UPDATE` |
| `text()` de SQLAlchemy | Igual, sin cambios (SQL crudo funciona igual en ambos) |

El modelo de datos (nombres de tablas, columnas, catálogos, reglas de integridad) se
mantiene exactamente igual al especificado, ya que esas reglas son agnósticas del motor
de base de datos.

---

## 10. Estructura del proyecto

```
homebanking/
├── .env
├── requirements.txt
├── main.py
├── sql/
│   ├── 01_schema.sql          # DDL completo (catálogos + core + homebanking + admin)
│   └── 02_seed_data.py        # Generador de datos de prueba
└── app/
    ├── core/
    │   ├── cfg_config.py      # Settings (pydantic-settings)
    │   ├── cfg_database.py    # Engine SQLAlchemy + get_db()
    │   ├── cfg_security.py    # JWT + bcrypt directo
    │   └── cfg_auth.py        # Dependencias get_cliente / get_admin
    ├── repositories/          # SQL crudo con text()
    │   ├── repo_auth.py
    │   ├── repo_ahorro.py
    │   ├── repo_credito.py
    │   ├── repo_operaciones.py
    │   └── repo_admin.py       # Dashboard, solicitudes, clientes, operaciones, reportes
    ├── controllers/           # Orquestación y reglas de negocio
    │   ├── ctrl_auth.py
    │   ├── ctrl_ahorro.py
    │   ├── ctrl_credito.py
    │   ├── ctrl_operaciones.py
    │   └── ctrl_admin.py
    ├── routes/                # Routers FastAPI
    │   ├── route_auth.py
    │   ├── route_ahorro.py
    │   ├── route_credito.py
    │   ├── route_operaciones.py
    │   └── route_admin.py      # /admin/auth, /admin/dashboard, /admin/solicitudes,
    │                           # /admin/clientes, /admin/operaciones, /admin/reportes
    └── schemas/                # Modelos Pydantic
        ├── sch_auth.py
        ├── sch_ahorro.py
        ├── sch_credito.py
        ├── sch_operaciones.py
        └── sch_admin.py
```

---

## 11. Notas de verificación

Todos los endpoints fueron probados end-to-end contra datos reales generados por el seed
(no simulados): login válido/inválido/bloqueo, las 4 consultas, las 2 operaciones, la
solicitud de crédito, y los casos de error (cuenta ajena, saldo insuficiente, producto de
crédito inexistente, transferencia a la misma cuenta, token de tipo incorrecto).
