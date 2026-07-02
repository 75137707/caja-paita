"""
Genera datos de prueba para bd_core_financiero.
Ejecutar DESPUES de correr sql/01_schema.sql.

Uso:
    python sql/02_seed_data.py
"""
import random
import bcrypt
import pymysql
from datetime import date, timedelta

random.seed(42)

# ---------------------------------------------------------------------------
# Conexion: se toma de la variable de entorno DATABASE_URL (la misma que usa
# el backend en Render/Vercel). Si no existe, cae a localhost para uso local.
# Formato esperado: mysql+pymysql://usuario:password@host:puerto/nombre_bd
# ---------------------------------------------------------------------------
import os
from urllib.parse import urlparse, unquote

_env_url = os.environ.get("DATABASE_URL")

if _env_url:
    _parsed = urlparse(_env_url.replace("mysql+pymysql://", "mysql://"))
    DB_HOST = _parsed.hostname
    DB_PORT = _parsed.port or 3306
    DB_USER = unquote(_parsed.username or "")
    DB_PASSWORD = unquote(_parsed.password or "")
    DB_NAME = _parsed.path.lstrip("/").split("?")[0]
else:
    DB_HOST = "127.0.0.1"
    DB_PORT = 3306
    DB_USER = "root"
    DB_PASSWORD = "123456"
    DB_NAME = "bd_core_financiero"

print(f"Conectando a: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# ---------------------------------------------------------------------------
# Parámetros de volumen (según especificación)
# ---------------------------------------------------------------------------
N_CLIENTES = 1100
N_CUENTAS_AHORRO = 730
N_CREDITOS = 1100
N_OPERACIONES = 3094

NOMBRES = ["Carlos", "Maria", "Jose", "Ana", "Luis", "Rosa", "Juan", "Carmen", "Pedro", "Luz",
           "Miguel", "Patricia", "Jorge", "Elena", "Manuel", "Sofia", "Ricardo", "Teresa",
           "Fernando", "Gloria", "Roberto", "Isabel", "Victor", "Marta", "Cesar", "Diana",
           "Raul", "Karen", "Hugo", "Veronica"]
APELLIDOS = ["Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Perez", "Sanchez",
             "Ramirez", "Flores", "Gomez", "Diaz", "Reyes", "Morales", "Vargas", "Castillo",
             "Chavez", "Mendoza", "Ruiz", "Romero", "Aguilar", "Silva", "Torres", "Herrera",
             "Medina", "Cruz", "Nunez", "Ramos", "Rojas", "Paredes", "Salazar"]

_CA_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "core", "certs", "ca.pem")
_ssl_args = {"ssl": {"ca": _CA_PATH}} if (DB_HOST != "127.0.0.1" and os.path.exists(_CA_PATH)) else {}

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD,
                        database=DB_NAME, charset="utf8mb4", autocommit=False,
                        **_ssl_args)
cur = conn.cursor()


def run(sql, params=None):
    cur.execute(sql, params or ())


def run_many(sql, rows):
    if rows:
        cur.executemany(sql, rows)


print("== Limpiando datos previos (si existen) ==")
for t in ["usuarios_admin", "foperaciones", "fplanpagomes",
          "fagcuentacredito", "dcuentacredito", "dsolicitud",
          "fcuentaahorro", "dcuentaahorro", "usuarios_homebanking", "fclientefuenteingreso",
          "dcliente", "dtiempo", "dmoneda", "dagencia", "dtipooperacion", "dconceptooperacion",
          "dmediopago", "dcanaltransaccional", "dcondicioncontable", "dentidadfinanciera",
          "dtipoproductoahorro", "dtipoproductocredito", "destadosolicitud"]:
    run(f"SET FOREIGN_KEY_CHECKS=0")
    run(f"TRUNCATE TABLE {t}")
run("SET FOREIGN_KEY_CHECKS=1")
conn.commit()

# ---------------------------------------------------------------------------
# 1. dtiempo — calendario 2023-01-01 a 2027-12-31
# ---------------------------------------------------------------------------
print("== Generando dtiempo (calendario) ==")
MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
         "Septiembre", "Octubre", "Noviembre", "Diciembre"]
DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]

start = date(2023, 1, 1)
end = date(2027, 12, 31)
rows = []
d = start
while d <= end:
    periododia = int(d.strftime("%Y%m%d"))
    periodomes = int(d.strftime("%Y%m"))
    es_habil = 0 if d.weekday() >= 5 else 1
    rows.append((periododia, d, d.year, d.month, d.day, periodomes,
                 MESES[d.month - 1], DIAS[d.weekday()], es_habil))
    d += timedelta(days=1)

run_many("""INSERT INTO dtiempo (periododia, fecha, anio, mes, dia, periodomes,
            nombre_mes, dia_semana, es_habil) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""", rows)
conn.commit()
print(f"  dtiempo: {len(rows)} filas")

# ---------------------------------------------------------------------------
# 2. Catálogos
# ---------------------------------------------------------------------------
print("== Generando catálogos ==")

run_many("INSERT INTO dmoneda (codmoneda, nombre, simbolo) VALUES (%s,%s,%s)", [
    ("PEN", "Sol Peruano", "S/"),
    ("USD", "Dolar Americano", "$"),
])

AGENCIAS = [
    ("AG001", "Agencia Principal Paita", "Jr. Plaza de Armas 176-178", "Piura", "Paita", "Paita"),
    ("AG002", "Agencia Sullana", "Av. Jose de Lama 456", "Piura", "Sullana", "Sullana"),
    ("AG003", "Agencia Piura", "Av. Grau 789", "Piura", "Piura", "Piura"),
    ("AG004", "Agencia Talara", "Av. Tacna 234", "Piura", "Talara", "Talara"),
    ("AG005", "Agencia Sechura", "Jr. Comercio 102", "Piura", "Sechura", "Sechura"),
]
run_many("""INSERT INTO dagencia (codagencia, nombre, direccion, departamento, provincia, distrito)
            VALUES (%s,%s,%s,%s,%s,%s)""", AGENCIAS)

run_many("INSERT INTO dtipooperacion (codtipooperacion, nombre) VALUES (%s,%s)", [
    ("TRF", "Transferencia"),
    ("DEB", "Debito"),
    ("CRE", "Credito"),
    ("PAG", "Pago de Cuota"),
])

run_many("INSERT INTO dconceptooperacion (codconcepto, nombre) VALUES (%s,%s)", [
    ("PCAP", "Pago de Capital de Credito"),
    ("DCAP", "Desembolso de Capital"),
    ("TRAN", "Transferencia entre Cuentas"),
    ("PSER", "Pago de Servicios"),
])

run_many("INSERT INTO dmediopago (codmediopago, nombre) VALUES (%s,%s)", [
    ("APP", "Aplicacion Movil"),
    ("WEB", "Banca por Internet"),
    ("VENTANILLA", "Ventanilla"),
    ("AGENTE", "Agente Corresponsal"),
])

run_many("INSERT INTO dcanaltransaccional (codcanal, nombre) VALUES (%s,%s)", [
    ("APP", "Aplicacion Movil"),
    ("WEB", "Banca por Internet"),
    ("VENTANILLA", "Ventanilla"),
    ("AGENTE", "Agente Corresponsal"),
    ("ATM", "Cajero Automatico"),
])

run_many("INSERT INTO dcondicioncontable (codcondicioncontable, nombre) VALUES (%s,%s)", [
    ("01", "Vigente Normal"),
    ("02", "Vigente con Atraso"),
    ("03", "Vencido"),
    ("04", "Cancelado"),
])

run_many("""INSERT INTO dentidadfinanciera (codentidad, nombre, codigo_interbancario)
            VALUES (%s,%s,%s)""", [
    ("BCP", "Banco de Credito del Peru", "002"),
    ("BBVA", "BBVA Peru", "011"),
    ("BN", "Banco de la Nacion", "018"),
    ("INTERBANK", "Interbank", "003"),
    ("SCOTIABANK", "Scotiabank Peru", "009"),
])

run_many("""INSERT INTO dtipoproductoahorro (codtipoproducto, nombre, tasa_interes_anual)
            VALUES (%s,%s,%s)""", [
    ("AHC", "Ahorro Corriente", 0.0150),
    ("PLZ", "Plazo Fijo", 0.0450),
    ("CTS", "CTS Normal", 0.0300),
    ("SUE", "Cuenta Sueldo", 0.0100),
    ("PEK", "Peke Ahorro", 0.0200),
])

run_many("""INSERT INTO dtipoproductocredito (codtipoproducto, nombre, tasa_interes_anual)
            VALUES (%s,%s,%s)""", [
    ("LIBREDISP", "Credito Libre Disponibilidad", 0.3500),
    ("EMPRESARIAL", "Credito Empresarial", 0.2800),
    ("PESCA", "Credito Pesca", 0.3000),
    ("CRECEMUJER", "Credito Crece Mujer", 0.2600),
    ("RAPIDITO", "Credito Rapidito", 0.4000),
    ("AGROPECUARIO", "Credito Agropecuario", 0.2700),
])

run_many("INSERT INTO destadosolicitud (codestado, nombre) VALUES (%s,%s)", [
    ("1", "En Evaluacion"),
    ("2", "Aprobado"),
    ("3", "Rechazado"),
    ("4", "Desembolsado"),
])

conn.commit()
print("  catalogos OK")

# Recuperar IDs de catálogos para uso posterior
def fetch_map(sql, key_idx=0, val_idx=1):
    cur.execute(sql)
    return {r[key_idx]: r[val_idx] for r in cur.fetchall()}

pk_moneda = fetch_map("SELECT codmoneda, pkmoneda FROM dmoneda")
pk_agencia = fetch_map("SELECT codagencia, pkagencia FROM dagencia")
agencia_ids = list(pk_agencia.values())
pk_tipoop = fetch_map("SELECT codtipooperacion, pktipooperacion FROM dtipooperacion")
pk_concepto = fetch_map("SELECT codconcepto, pkconceptooperacion FROM dconceptooperacion")
pk_mediopago = fetch_map("SELECT codmediopago, pkmediopago FROM dmediopago")
pk_canal = fetch_map("SELECT codcanal, pkcanal FROM dcanaltransaccional")
pk_condcont = fetch_map("SELECT codcondicioncontable, pkcondicioncontable FROM dcondicioncontable")
pk_tipoprodahorro = fetch_map("SELECT codtipoproducto, pktipoproductoahorro FROM dtipoproductoahorro")
tipoprodahorro_ids = list(pk_tipoprodahorro.values())
pk_tipoprodcredito = fetch_map("SELECT codtipoproducto, pktipoproductocredito FROM dtipoproductocredito")
tipoprodcredito_rows = list(pk_tipoprodcredito.items())
pk_estadosolicitud = fetch_map("SELECT codestado, pkestadosolicitud FROM destadosolicitud")

# ---------------------------------------------------------------------------
# 3. Clientes
# ---------------------------------------------------------------------------
print(f"== Generando {N_CLIENTES} clientes ==")
clientes_rows = []
for i in range(1, N_CLIENTES + 1):
    codcliente = f"CLI{i:06d}"
    nombres = random.choice(NOMBRES)
    ap_pat = random.choice(APELLIDOS)
    ap_mat = random.choice(APELLIDOS)
    numdoc = f"{random.randint(10000000, 79999999)}"
    fnac = date(random.randint(1955, 2004), random.randint(1, 12), random.randint(1, 28))
    sexo = random.choice(["M", "F"])
    email = f"{nombres.lower()}.{ap_pat.lower()}{i}@correo.com"
    telefono = f"9{random.randint(10000000, 99999999)}"
    pkag = random.choice(agencia_ids)
    falta = date(2023, 1, 1) + timedelta(days=random.randint(0, 1200))
    clientes_rows.append((codcliente, "DNI", numdoc, nombres, ap_pat, ap_mat, fnac, sexo,
                           email, telefono, pkag, falta))

run_many("""INSERT INTO dcliente (codcliente, tipodocumento, numerodocumento, nombres,
            apellidopaterno, apellidomaterno, fechanacimiento, sexo, email, telefono,
            pkagencia, fechaalta) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", clientes_rows)
conn.commit()

pk_cliente = fetch_map("SELECT codcliente, pkcliente FROM dcliente")
cliente_ids = list(pk_cliente.values())
print(f"  dcliente: {len(cliente_ids)} filas")

# fclientefuenteingreso (UPSERT simulado con INSERT directo ya que es seed inicial)
print("== Generando fclientefuenteingreso ==")
ffi_rows = []
periodo_actual = 202606
for pkc in cliente_ids:
    ingreso = round(random.uniform(900, 6000), 2)
    fuente = random.choice(["Dependiente", "Independiente", "Negocio Propio", "Pesca", "Comercio"])
    ffi_rows.append((pkc, periodo_actual, ingreso, fuente))

run_many("""INSERT INTO fclientefuenteingreso (pkcliente, periodomes, ingresomensual, fuenteingreso)
            VALUES (%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE ingresomensual=VALUES(ingresomensual),
                fuenteingreso=VALUES(fuenteingreso)""", ffi_rows)
conn.commit()
print(f"  fclientefuenteingreso: {len(ffi_rows)} filas")

# ---------------------------------------------------------------------------
# 4. Cuentas de ahorro (730) — repartidas entre clientes (algunos sin cuenta, otros con 2+)
# ---------------------------------------------------------------------------
print(f"== Generando {N_CUENTAS_AHORRO} cuentas de ahorro ==")
# Garantizamos que un grupo de clientes tenga 2+ cuentas propias, para poder probar
# transferencias entre cuentas propias con datos reales.
N_CLIENTES_MULTICUENTA = 80
clientes_multicuenta = random.sample(cliente_ids, min(N_CLIENTES_MULTICUENTA, len(cliente_ids)))

cuenta_cliente_list = []
# Cada cliente "multicuenta" recibe 2 cuentas garantizadas
for pkc in clientes_multicuenta:
    cuenta_cliente_list.append(pkc)
    cuenta_cliente_list.append(pkc)

# Completamos el resto del volumen con clientes aleatorios (algunos repetidos, otros nuevos)
restantes = N_CUENTAS_AHORRO - len(cuenta_cliente_list)
if restantes > 0:
    clientes_resto = [c for c in cliente_ids if c not in clientes_multicuenta]
    cuenta_cliente_list += random.sample(clientes_resto, min(restantes, len(clientes_resto)))
    aun_faltan = N_CUENTAS_AHORRO - len(cuenta_cliente_list)
    if aun_faltan > 0:
        cuenta_cliente_list += random.choices(cliente_ids, k=aun_faltan)

random.shuffle(cuenta_cliente_list)

cuentaahorro_rows = []
clientes_multicuenta_set = set(clientes_multicuenta)
contador_por_cliente = {}
for i, pkc in enumerate(cuenta_cliente_list, start=1):
    codcuenta = f"AHO-{i:06d}"
    pktipo = random.choice(tipoprodahorro_ids)
    pkmon = pk_moneda["PEN"] if random.random() < 0.85 else pk_moneda["USD"]
    pkag = random.choice(agencia_ids)
    fapertura = date(2023, 1, 1) + timedelta(days=random.randint(0, 1200))
    if pkc in clientes_multicuenta_set:
        # Garantizamos cuentas ACTIVAS y en la MISMA moneda para que la transferencia
        # entre cuentas propias sea siempre posible con datos de prueba reales.
        estado = "ACTIVA"
        pkmon = pk_moneda["PEN"]
    else:
        estado = random.choices(["ACTIVA", "BLOQUEADA", "CANCELADA"], weights=[90, 5, 5])[0]
    cuentaahorro_rows.append((codcuenta, pkc, pktipo, pkmon, pkag, fapertura, estado))

run_many("""INSERT INTO dcuentaahorro (codcuenta, pkcliente, pktipoproductoahorro, pkmoneda,
            pkagencia, fechaapertura, estado) VALUES (%s,%s,%s,%s,%s,%s,%s)""", cuentaahorro_rows)
conn.commit()

pk_cuentaahorro = fetch_map("SELECT codcuenta, pkcuentaahorro FROM dcuentaahorro")
cuentaahorro_ids = list(pk_cuentaahorro.values())
print(f"  dcuentaahorro: {len(cuentaahorro_ids)} filas")

# Saldo actual por cuenta (fcuentaahorro) — un snapshot a fecha actual
print("== Generando fcuentaahorro (saldos) ==")
periododia_hoy = 20260621
fca_rows = []
saldo_cuenta = {}
for pkca in cuentaahorro_ids:
    saldo = round(random.uniform(50, 25000), 2)
    saldo_cuenta[pkca] = saldo
    fca_rows.append((pkca, periododia_hoy, saldo, saldo))

run_many("""INSERT INTO fcuentaahorro (pkcuentaahorro, periododia, saldocontable, saldodisponible)
            VALUES (%s,%s,%s,%s)""", fca_rows)
conn.commit()
print(f"  fcuentaahorro: {len(fca_rows)} filas")

# ---------------------------------------------------------------------------
# 5. Créditos (1,100) — uno por cliente para simplificar trazabilidad 1:1 aproximada
# ---------------------------------------------------------------------------
print(f"== Generando {N_CREDITOS} cuentas de credito ==")
clientes_con_credito = random.sample(cliente_ids, min(N_CREDITOS, len(cliente_ids)))
extra_needed_cred = N_CREDITOS - len(clientes_con_credito)
credito_cliente_list = clientes_con_credito[:]
if extra_needed_cred > 0:
    credito_cliente_list += random.choices(cliente_ids, k=extra_needed_cred)

dcuentacredito_rows = []
plan_pagos_rows = []
fagcc_rows = []

for i, pkc in enumerate(credito_cliente_list, start=1):
    codcuenta = f"CRE-{i:06d}"
    codtipo, pktipo = random.choice(tipoprodcredito_rows)
    pkmon = pk_moneda["PEN"]
    pkag = random.choice(agencia_ids)
    monto = round(random.uniform(500, 30000), 2)
    plazo = random.choice([6, 12, 18, 24, 36])
    tasa = round(random.uniform(0.20, 0.45), 4)
    fdesembolso = date(2023, 6, 1) + timedelta(days=random.randint(0, 1000))

    # --- Perfil de pagador (determina el comportamiento de TODAS sus cuotas,
    #     en vez de tirar dados independientes por cuota; esto evita que
    #     créditos viejos terminen con mora absurda de >1000 días).
    #     Calibrado para que la cartera total en mora real (>0 días) ronde ~13%,
    #     coherente con la proporción exigida en el Criterio 5 de la rúbrica. ---
    perfil = random.choices(
        ["BUEN_PAGADOR", "OCASIONAL", "MOROSO_LEVE", "MOROSO_GRAVE", "CASTIGADO"],
        weights=[89, 3, 3, 3, 2],
    )[0]

    # codcuenta provisional; el estado contable definitivo se decide más abajo
    # según el resultado real de la simulación de cuotas (no al azar suelto).
    dcuentacredito_rows.append((codcuenta, pkc, pktipo, pkmon, pkag, monto, plazo, tasa,
                                 fdesembolso, perfil))

run_many("""INSERT INTO dcuentacredito (codcuenta, pkcliente, pktipoproductocredito, pkmoneda,
            pkagencia, montodesembolsado, plazomeses, tasainteresanual, fechadesembolso, estado)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", dcuentacredito_rows)
conn.commit()

cur.execute("SELECT pkcuentacredito, codcuenta, montodesembolsado, plazomeses, tasainteresanual, "
            "fechadesembolso, estado FROM dcuentacredito")
creditos_full = cur.fetchall()
print(f"  dcuentacredito: {len(creditos_full)} filas")

# Helper: obtener periododia válido (el más cercano hacia adelante) para una fecha dada
print("== Generando fplanpagomes (cronograma de cuotas) según perfil de pagador ==")


def periododia_for(d: date) -> int:
    # ajustamos al rango del calendario generado
    if d < start:
        d = start
    if d > end:
        d = end
    return int(d.strftime("%Y%m%d"))


hoy = date(2026, 6, 21)
plan_rows = []
fagcc_rows = []
estado_final_por_pk = {}  # pkcuentacredito -> estado contable definitivo (VIGENTE/CANCELADO/CASTIGADO)

for (pkcc, codcuenta, monto, plazo, tasa, fdesembolso, perfil) in creditos_full:
    monto = float(monto)
    tasa = float(tasa)
    cuota_capital = round(monto / plazo, 2)
    tasa_mensual = tasa / 12
    saldo_restante = monto
    pago_pendiente_total = 0.0
    dias_mora_max = 0

    # El perfil define, de una sola vez por crédito:
    #  - hasta qué cuota (en orden) el cliente paga puntual
    #  - qué pasa con las cuotas restantes (todas siguen el mismo patrón,
    #    en vez de decidirse cuota por cuota de forma independiente)
    n_cuotas_vencidas_estimado = max(0, (hoy - fdesembolso).days // 30)
    n_cuotas_vencidas_estimado = min(n_cuotas_vencidas_estimado, plazo)

    if perfil == "CASTIGADO":
        # Deja de pagar desde una cuota temprana y nunca se recupera
        cuota_corte = random.randint(1, max(1, min(3, n_cuotas_vencidas_estimado or 1)))
    elif perfil == "MOROSO_GRAVE":
        # Pagó bien un tiempo, luego entró en mora dura y no se ha puesto al día
        cuota_corte = random.randint(1, max(1, n_cuotas_vencidas_estimado))
    elif perfil == "MOROSO_LEVE":
        # Atrasos cortos y recurrentes, pero dentro de banda preventiva/temprana
        cuota_corte = None  # se maneja distinto: mora acotada, ver más abajo
    elif perfil == "OCASIONAL":
        # Una cuota suelta atrasada, el resto puntual
        cuota_corte = None
    else:  # BUEN_PAGADOR
        cuota_corte = None

    for nro in range(1, plazo + 1):
        vencimiento = fdesembolso + timedelta(days=30 * nro)
        interes = round(saldo_restante * tasa_mensual, 2)
        capital_cuota = cuota_capital if nro < plazo else round(saldo_restante, 2)
        cuota_total = round(capital_cuota + interes, 2)
        saldo_restante = round(saldo_restante - capital_cuota, 2)
        vencida = vencimiento < hoy

        if not vencida:
            # Cuota futura: aún no aplica pago ni mora
            pagado_cap, pagado_int, fecha_pago, dias_mora, estado_cuota = 0.0, 0.0, None, 0, "PENDIENTE"
            pago_pendiente_total += cuota_total

        elif perfil == "BUEN_PAGADOR":
            pagado_cap, pagado_int = capital_cuota, interes
            fecha_pago = vencimiento + timedelta(days=random.randint(0, 3))
            dias_mora, estado_cuota = 0, "PAGADA"

        elif perfil == "OCASIONAL":
            # Solo la cuota más reciente vencida (si existe) puede estar atrasada
            es_la_ultima_vencida = (nro == n_cuotas_vencidas_estimado)
            if es_la_ultima_vencida and random.random() < 0.5:
                dias_mora = random.randint(1, 25)
                pagado_cap, pagado_int, fecha_pago = 0.0, 0.0, None
                estado_cuota = "VENCIDA"
                pago_pendiente_total += cuota_total
                dias_mora_max = max(dias_mora_max, dias_mora)
            else:
                pagado_cap, pagado_int = capital_cuota, interes
                fecha_pago = vencimiento + timedelta(days=random.randint(0, 5))
                dias_mora, estado_cuota = 0, "PAGADA"

        elif perfil == "MOROSO_LEVE":
            # Atraso recurrente pero acotado (banda preventiva/temprana: 1-60 días)
            if nro >= max(1, n_cuotas_vencidas_estimado - 1):
                dias_mora = random.randint(5, 55)
                pagado_cap = round(capital_cuota * random.uniform(0.3, 0.8), 2)
                pagado_int = 0.0
                fecha_pago = None
                estado_cuota = "PARCIAL"
                pago_pendiente_total += (capital_cuota - pagado_cap) + interes
                dias_mora_max = max(dias_mora_max, dias_mora)
            else:
                pagado_cap, pagado_int = capital_cuota, interes
                fecha_pago = vencimiento + timedelta(days=random.randint(0, 10))
                dias_mora, estado_cuota = 0, "PAGADA"

        else:  # MOROSO_GRAVE / CASTIGADO: deja de pagar desde cuota_corte en adelante
            if nro < cuota_corte:
                pagado_cap, pagado_int = capital_cuota, interes
                fecha_pago = vencimiento + timedelta(days=random.randint(0, 5))
                dias_mora, estado_cuota = 0, "PAGADA"
            else:
                dias_mora = (hoy - vencimiento).days
                pagado_cap, pagado_int, fecha_pago = 0.0, 0.0, None
                estado_cuota = "VENCIDA"
                pago_pendiente_total += cuota_total
                dias_mora_max = max(dias_mora_max, dias_mora)

        periododia_venc = periododia_for(vencimiento)
        plan_rows.append((pkcc, nro, periododia_venc, capital_cuota, interes, cuota_total,
                           pagado_cap, pagado_int, fecha_pago, dias_mora, estado_cuota))

    saldo_capital_actual = max(saldo_restante, 0.0)
    todas_pagadas = (pago_pendiente_total <= 0.01) and (saldo_capital_actual <= 0.01)

    # Estado contable derivado del resultado real de la simulación (no al azar
    # suelto): un crédito totalmente pagado se CANCELA; uno con mora >180 días
    # se considera CASTIGADO; el resto sigue VIGENTE (con o sin mora vigente).
    if todas_pagadas:
        estado_final = "CANCELADO"
        saldo_capital_actual = 0.0
        pago_pendiente_total = 0.0
        dias_mora_max = 0
    elif dias_mora_max > 180:
        estado_final = "CASTIGADO"
    else:
        estado_final = "VIGENTE"

    estado_final_por_pk[pkcc] = estado_final
    fagcc_rows.append((pkcc, periododia_hoy, saldo_capital_actual, round(pago_pendiente_total, 2),
                        dias_mora_max))

run_many("""INSERT INTO fplanpagomes (pkcuentacredito, nrocuota, periododiavencimiento,
            montocapital, montointeres, montocuota, montocapitalpagado, montointerespagado,
            fechapago, diasmora, estadocuota)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", plan_rows)
conn.commit()
print(f"  fplanpagomes: {len(plan_rows)} filas")

run_many("""INSERT INTO fagcuentacredito (pkcuentacredito, periododia, saldocapital,
            pagopendiente, diasmoraacumulado) VALUES (%s,%s,%s,%s,%s)""", fagcc_rows)
conn.commit()
print(f"  fagcuentacredito: {len(fagcc_rows)} filas")

# Corregir el estado contable de dcuentacredito con el resultado REAL de la
# simulación (hasta este punto la columna 'estado' guardaba el perfil de
# pagador usado solo como semilla interna del cálculo).
print("== Actualizando estado contable real (VIGENTE/CANCELADO/CASTIGADO) ==")
estado_update_rows = [(estado_final, pkcc) for pkcc, estado_final in estado_final_por_pk.items()]
run_many("UPDATE dcuentacredito SET estado = %s WHERE pkcuentacredito = %s", estado_update_rows)
conn.commit()

dist = {}
for e in estado_final_por_pk.values():
    dist[e] = dist.get(e, 0) + 1
print(f"  estados actualizados: {dist}")

# ---------------------------------------------------------------------------
# 6. Solicitudes de credito (dsolicitud) — un set adicional en evaluacion
# ---------------------------------------------------------------------------
print("== Generando dsolicitud (solicitudes en evaluacion / historicas) ==")
solicitudes_rows = []
n_solicitudes = 150
for i in range(1, n_solicitudes + 1):
    codsol = f"SOL-{i:06d}"
    pkc = random.choice(cliente_ids)
    codtipo, pktipo = random.choice(tipoprodcredito_rows)
    monto = round(random.uniform(500, 20000), 2)
    plazo = random.choice([6, 12, 18, 24])
    codestado = random.choices(["1", "2", "3", "4"], weights=[40, 20, 15, 25])[0]
    fsolicitud = date(2026, 1, 1) + timedelta(days=random.randint(0, 170))
    canal = random.choice(["WEB", "APP"])
    solicitudes_rows.append((codsol, pkc, pktipo, monto, plazo,
                              pk_estadosolicitud[codestado], fsolicitud, canal))

run_many("""INSERT INTO dsolicitud (codsolicitud, pkcliente, pktipoproductocredito,
            montosolicitado, plazomeses, pkestadosolicitud, fechasolicitud, canal)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", solicitudes_rows)
conn.commit()
print(f"  dsolicitud: {len(solicitudes_rows)} filas")

# ---------------------------------------------------------------------------
# 7. Operaciones (foperaciones) — 3,094 registros
#    Mezcla: pagos de cuota (PCAP/PAG), transferencias (TRAN/TRF) entre cuentas propias,
#    y desembolsos (DCAP/CRE) historicos.
# ---------------------------------------------------------------------------
print(f"== Generando {N_OPERACIONES} operaciones (foperaciones) ==")

# Mapas auxiliares: cuentas de ahorro por cliente, creditos por cliente
cur.execute("SELECT pkcuentaahorro, pkcliente FROM dcuentaahorro")
cuentas_por_cliente = {}
for pkca, pkc in cur.fetchall():
    cuentas_por_cliente.setdefault(pkc, []).append(pkca)

cur.execute("SELECT pkcuentacredito, pkcliente FROM dcuentacredito")
creditos_por_cliente = {}
for pkcc, pkc in cur.fetchall():
    creditos_por_cliente.setdefault(pkc, []).append(pkcc)

operaciones_rows = []
seq = 1

clientes_con_cuenta = list(cuentas_por_cliente.keys())
clientes_con_credito_map = list(creditos_por_cliente.keys())

# distribución: 45% pagos de cuota, 35% transferencias, 20% desembolsos/otros
n_pagos = int(N_OPERACIONES * 0.45)
n_transferencias = int(N_OPERACIONES * 0.35 / 2)  # cada transferencia genera 2 filas (DB+CR)
n_otros = N_OPERACIONES - n_pagos - (n_transferencias * 2)

# --- Pagos de cuota (PCAP) ---
for _ in range(n_pagos):
    pkc = random.choice(clientes_con_credito_map)
    pkcc = random.choice(creditos_por_cliente[pkc])
    fop = date(2023, 6, 1) + timedelta(days=random.randint(0, 1090))
    periododia = periododia_for(fop)
    nro_cuota = random.randint(1, 12)
    monto = round(random.uniform(50, 1500), 2)
    codkardex = f"PAG-{pkcc}-{nro_cuota}-{periododia}-{seq}"
    operaciones_rows.append((
        "DB", codkardex, "E", periododia,
        pk_concepto["PCAP"], pk_tipoop["PAG"], pk_moneda["PEN"],
        random.choice(agencia_ids), None,
        None, None,
        pkcc, pkc,
        random.choice([pk_mediopago["APP"], pk_mediopago["WEB"]]),
        random.choice([pk_canal["APP"], pk_canal["WEB"]]),
        pk_condcont["01"],
        monto, monto,
        f"Pago de cuota credito {pkcc}"
    ))
    seq += 1

# --- Transferencias entre cuentas propias (TRAN/TRF) ---
# Generamos 2 filas por transferencia (DB en origen, CR en destino), igual que el
# endpoint real de /operaciones/transferencia, para que las consultas de movimientos
# sean consistentes (sin duplicados) tanto en datos histo­ricos como en datos nuevos.
for _ in range(n_transferencias):
    pkc = random.choice(clientes_con_cuenta)
    cuentas_cli = cuentas_por_cliente[pkc]
    origen = random.choice(cuentas_cli)
    destino = random.choice(cuentaahorro_ids)
    while destino == origen:
        destino = random.choice(cuentaahorro_ids)
    fop = date(2023, 6, 1) + timedelta(days=random.randint(0, 1090))
    periododia = periododia_for(fop)
    monto = round(random.uniform(20, 3000), 2)

    codkardex_db = f"TRF-DB-{origen}-{destino}-{periododia}-{seq}"
    operaciones_rows.append((
        "DB", codkardex_db, "E", periododia,
        pk_concepto["TRAN"], pk_tipoop["TRF"], pk_moneda["PEN"],
        random.choice(agencia_ids), None,
        origen, None,
        None, pkc,
        random.choice([pk_mediopago["APP"], pk_mediopago["WEB"]]),
        random.choice([pk_canal["APP"], pk_canal["WEB"]]),
        pk_condcont["01"],
        monto, monto,
        f"Transferencia cuenta {origen} a {destino}"
    ))
    seq += 1

    codkardex_cr = f"TRF-CR-{origen}-{destino}-{periododia}-{seq}"
    operaciones_rows.append((
        "CR", codkardex_cr, "I", periododia,
        pk_concepto["TRAN"], pk_tipoop["TRF"], pk_moneda["PEN"],
        random.choice(agencia_ids), None,
        destino, None,
        None, pkc,
        random.choice([pk_mediopago["APP"], pk_mediopago["WEB"]]),
        random.choice([pk_canal["APP"], pk_canal["WEB"]]),
        pk_condcont["01"],
        monto, monto,
        f"Transferencia cuenta {origen} a {destino}"
    ))
    seq += 1

# --- Otros: desembolsos historicos y pagos de servicios ---
for _ in range(n_otros):
    pkc = random.choice(cliente_ids)
    fop = date(2023, 6, 1) + timedelta(days=random.randint(0, 1090))
    periododia = periododia_for(fop)
    monto = round(random.uniform(30, 5000), 2)
    es_desembolso = random.random() < 0.5
    if es_desembolso and creditos_por_cliente.get(pkc):
        pkcc = random.choice(creditos_por_cliente[pkc])
        codkardex = f"DCAP-{pkcc}-{periododia}-{seq}"
        operaciones_rows.append((
            "CR", codkardex, "I", periododia,
            pk_concepto["DCAP"], pk_tipoop["CRE"], pk_moneda["PEN"],
            random.choice(agencia_ids), None,
            None, None,
            pkcc, pkc,
            pk_mediopago["VENTANILLA"], pk_canal["VENTANILLA"],
            pk_condcont["01"],
            monto, monto,
            f"Desembolso credito {pkcc}"
        ))
    else:
        cuentas_cli = cuentas_por_cliente.get(pkc)
        cuenta_ref = random.choice(cuentas_cli) if cuentas_cli else random.choice(cuentaahorro_ids)
        codkardex = f"PSER-{pkc}-{periododia}-{seq}"
        operaciones_rows.append((
            "DB", codkardex, "E", periododia,
            pk_concepto["PSER"], pk_tipoop["DEB"], pk_moneda["PEN"],
            random.choice(agencia_ids), None,
            cuenta_ref, None,
            None, pkc,
            random.choice([pk_mediopago["APP"], pk_mediopago["WEB"]]),
            random.choice([pk_canal["APP"], pk_canal["WEB"]]),
            pk_condcont["01"],
            monto, monto,
            "Pago de servicios"
        ))
    seq += 1

run_many("""INSERT INTO foperaciones (codtipkar, codkardex, codtipoegresoingreso, periododia,
            pkconceptooperacion, pktipooperacion, pkmoneda, pkagenciaorigen, pkagenciadestino,
            pkcuentaahorroorigen, pkcuentaahorrodestino, pkcuentacredito, pkcliente,
            pkmediopago, pkcanal, pkcondicioncontable, montooperacion, montopagoconcepto, glosa)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", operaciones_rows)
conn.commit()
print(f"  foperaciones: {len(operaciones_rows)} filas")

# ---------------------------------------------------------------------------
# 8. usuarios_homebanking — uno por cada cliente
# ---------------------------------------------------------------------------
print(f"== Generando usuarios_homebanking para {len(cliente_ids)} clientes ==")
default_password = "demo1234"
hashed = bcrypt.hashpw(default_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

cur.execute("SELECT pkcliente, codcliente FROM dcliente")
cliente_codigos = cur.fetchall()

uh_rows = []
for pkc, codc in cliente_codigos:
    username = codc.lower()  # cli000001
    uh_rows.append((pkc, username, hashed))

run_many("""INSERT INTO usuarios_homebanking (pkcliente, username, password_hash)
            VALUES (%s,%s,%s)""", uh_rows)
conn.commit()
print(f"  usuarios_homebanking: {len(uh_rows)} filas (password = '{default_password}' para todos)")

# ---------------------------------------------------------------------------
# 9. usuarios_admin — personal interno de Caja Paita (panel de administrador)
# ---------------------------------------------------------------------------
print("== Generando usuarios_admin ==")
admin_password = "admin1234"
admin_hashed = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

admin_rows = [
    # username, password_hash, nombres, apellidos, email, rol, pkagencia
    ("admin", admin_hashed, "Administrador", "Sistema", "admin@cajapaita.pe", "ADMIN", None),
    ("jasesor", admin_hashed, "Jorge", "Salinas Cordova", "jsalinas@cajapaita.pe", "ASESOR",
     random.choice(agencia_ids)),
    ("masesor", admin_hashed, "Maria", "Pintado Vera", "mpintado@cajapaita.pe", "ASESOR",
     random.choice(agencia_ids)),
    ("priesgos", admin_hashed, "Patricia", "Reyes Olaya", "preyes@cajapaita.pe", "JEFE_RIESGOS", None),
    ("ccomite", admin_hashed, "Carlos", "Quevedo Mendoza", "cquevedo@cajapaita.pe", "COMITE", None),
    ("ggerencia", admin_hashed, "Gabriela", "Sosa Tello", "gsosa@cajapaita.pe", "GERENCIA", None),
    # Rol heredado, equivalente operativo a ASESOR (compatibilidad con datos previos)
    ("janalista", admin_hashed, "Jose", "Aguirre Nole", "jaguirre@cajapaita.pe", "ANALISTA",
     random.choice(agencia_ids)),
]
run_many("""INSERT INTO usuarios_admin (username, password_hash, nombres, apellidos, email,
            rol, pkagencia) VALUES (%s,%s,%s,%s,%s,%s,%s)""", admin_rows)
conn.commit()
print(f"  usuarios_admin: {len(admin_rows)} filas (password = '{admin_password}' para todos)")
print("  -> usuarios por rol:")
print("     ASESOR       : jasesor / masesor")
print("     ADMIN        : admin")
print("     JEFE_RIESGOS : priesgos")
print("     COMITE       : ccomite")
print("     GERENCIA     : ggerencia")
print("     ANALISTA     : janalista  (heredado, equivalente a ASESOR)")

cur.close()
conn.close()
print("\n== SEED COMPLETO ==")
