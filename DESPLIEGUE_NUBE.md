# Guía de despliegue: Vercel (frontend + backend) + Aiven (MySQL)

Tu proyecto quedará así:
- **Frontend** (React/Vite) → proyecto Vercel #1
- **Backend** (FastAPI) → proyecto Vercel #2 (función serverless)
- **Base de datos** → Aiven MySQL (gratis, sin tarjeta)

Ya dejé listos estos archivos en tu proyecto:
- `homebanking/vercel.json` — config de la función serverless
- `homebanking/.python-version` — fija Python 3.12
- `homebanking/.gitignore`
- `homebanking/.env.example` — variables que debes copiar a Vercel
- `homebanking/app/core/cfg_database.py` — ahora detecta SSL automáticamente
- `homebanking/app/core/certs/README.txt` — dónde poner el certificado de Aiven
- `caja-virtual-frontend/vercel.json` — rewrites para que React Router funcione
- `caja-virtual-frontend/.gitignore`
- `caja-virtual-frontend/.env.example`

---

## PASO 1 — Crear la base de datos en Aiven

1. Crea cuenta gratis en https://aiven.io (sin tarjeta de crédito).
2. "Create service" → **MySQL** → plan **Free**.
3. Espera a que el servicio quede "Running".
4. En la pestaña **Overview** copia:
   - Host, Port, User, Password, Database name (`defaultdb` por defecto — puedes crear `bd_core_financiero` con `CREATE DATABASE`).
   - Descarga el **CA certificate** y guárdalo como:
     `homebanking/app/core/certs/ca.pem`

5. Conéctate y crea la base + tablas con los scripts que ya tienes en `homebanking/sql/`:
   ```bash
   mysql -h TU_HOST-aivencloud.com -P TU_PUERTO -u avnadmin -p --ssl-mode=REQUIRED < homebanking/sql/01_schema.sql
   mysql -h TU_HOST-aivencloud.com -P TU_PUERTO -u avnadmin -p --ssl-mode=REQUIRED bd_core_financiero < homebanking/sql/03_modulo_mora.sql
   mysql -h TU_HOST-aivencloud.com -P TU_PUERTO -u avnadmin -p --ssl-mode=REQUIRED bd_core_financiero < homebanking/sql/04_extender_calendario_y_fix_vista.sql
   ```
   Para el seed de datos (`02_seed_data.py`), ajusta temporalmente `DATABASE_URL` en tu `.env` local para apuntar a Aiven y corre el script Python normalmente (`python sql/02_seed_data.py`), con el `ca.pem` ya puesto en su carpeta.

---

## PASO 2 — Subir el proyecto a GitHub

Vercel despliega desde un repositorio Git.

```bash
cd "Caja paita"
git init
git add .
git commit -m "Proyecto listo para desplegar"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/caja-paita.git
git push -u origin main
```

(Crea antes el repo vacío en GitHub si no lo tienes.)

---

## PASO 3 — Desplegar el backend en Vercel

1. En https://vercel.com → **Add New… → Project** → importa tu repo.
2. **Root Directory**: selecciona `homebanking`.
3. Framework Preset: Vercel debería detectar Python/FastAPI automáticamente (por `requirements.txt` + `main.py` con variable `app`). Si no, déjalo en "Other".
4. En **Environment Variables**, agrega (usa los valores reales, no los de ejemplo):
   ```
   DATABASE_URL=mysql+pymysql://avnadmin:TU_PASSWORD@TU_HOST:PUERTO/bd_core_financiero
   JWT_SECRET_KEY=<una clave larga y aleatoria>
   JWT_ALGORITHM=HS256
   JWT_EXPIRE_MINUTES=60
   JWT_EXPIRE_MINUTES_ADMIN=20
   MAX_INTENTOS_FALLIDOS=3
   CORS_ORIGINS=["https://placeholder.vercel.app"]
   APP_NAME=Homebanking Caja Virtual - API
   ```
   (El valor de `CORS_ORIGINS` lo corriges en el Paso 5 con la URL real del frontend.)
5. Deploy. Al terminar tendrás una URL como `https://tu-backend.vercel.app`.
6. Verifica que funciona abriendo `https://tu-backend.vercel.app/docs` (Swagger UI de FastAPI).

---

## PASO 4 — Desplegar el frontend en Vercel

1. **Add New… → Project** → mismo repo.
2. **Root Directory**: selecciona `caja-virtual-frontend`.
3. Framework Preset: Vercel detecta **Vite** automáticamente.
4. En **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://tu-backend.vercel.app
   ```
   (la URL real que te dio el Paso 3)
5. Deploy. Tendrás una URL como `https://tu-frontend.vercel.app`.

---

## PASO 5 — Cerrar el círculo del CORS

Vuelve al proyecto del **backend** en Vercel → Settings → Environment Variables →
edita `CORS_ORIGINS` con la URL real del frontend:
```
CORS_ORIGINS=["https://tu-frontend.vercel.app"]
```
Guarda y **redeploy** el backend (Vercel no aplica cambios de env vars a un deployment ya hecho).

---

## Verificación final

1. Abre `https://tu-frontend.vercel.app` → deberías ver la landing.
2. Intenta iniciar sesión con un usuario del seed.
3. Si algo falla, revisa en Vercel → tu proyecto backend → pestaña **Logs** los errores en vivo.

## Notas importantes

- Las funciones serverless de Vercel son *stateless*: cada request puede abrir su propia conexión a la BD. `pool_pre_ping=True` ya está configurado para manejar conexiones que Aiven cierre por inactividad.
- El plan free de Vercel tiene límite de duración por función (hasta 300s con Fluid Compute) — de sobra para este proyecto.
- Nunca subas tu `.env` real a GitHub (ya está en `.gitignore`); las variables reales solo viven en el dashboard de Vercel.
