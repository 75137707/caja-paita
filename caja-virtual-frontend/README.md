# Caja Virtual — Frontend (React + Vite)

Frontend de la "Caja Virtual" (homebanking) de Caja Paita, construido en React + Vite +
Tailwind CSS, conectado al backend FastAPI del proyecto `homebanking`.

> La identidad visual (colores azul marino + naranja, nombre "Caja Virtual") está
> **inspirada** en la imagen institucional pública de Caja Paita (www.cajapaita.pe). No es
> una réplica exacta de su portal real de homebanking (que es un sistema de terceros al que
> no se tuvo acceso), sino una interfaz propia construida desde cero con esa identidad.

---

## 1. Requisitos previos

Este frontend depende del backend FastAPI (`homebanking`). Asegúrate de tenerlo
corriendo en `http://localhost:8002` antes de usar la app (ver su propio README para
levantar MySQL + el backend).

- Node.js 18+
- El backend `homebanking` corriendo en el puerto 8002

---

## 2. Instalación (Git Bash)

```bash
cd caja-virtual-frontend
npm install
```

---

## 3. Configurar `.env`

Ya viene configurado para apuntar al backend local:

```env
VITE_API_BASE_URL=http://localhost:8002
```

Cambia esta URL si tu backend corre en otro host/puerto.

---

## 4. Levantar el frontend

```bash
npm run dev
```

La app queda disponible en `http://localhost:5173` (el backend ya tiene CORS configurado
para este origen).

---

## 5. Iniciar sesión

Usa cualquiera de los clientes de prueba generados por el backend:

- **Código de cliente**: `cli000001` (o `cli000002` ... `cli001100`)
- **Contraseña**: `demo1234`

### 5.1. Panel de administración

El panel interno para personal de Caja Paita tiene su propio login, en `/admin/login`
(enlace visible también desde la pantalla de login de clientes):

- **Usuario**: `admin` (rol ADMIN) o `janalista` / `manalista` (rol ANALISTA)
- **Contraseña**: `admin1234`

La sesión de administrador usa un token (`cv_admin_token`) completamente independiente
del token de cliente (`cv_token`), por lo que puedes tener ambas sesiones abiertas en
pestañas distintas del mismo navegador sin conflicto.

---

## 6. Páginas / funcionalidades

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión del cliente |
| `/` | Dashboard: resumen, accesos rápidos y productos |
| `/movimientos` | Historial consolidado de transacciones de todas las cuentas, con filtros, búsqueda y detalle/recibo por movimiento |
| `/ahorros` | Lista de cuentas de ahorro + detalle de movimientos por cuenta |
| `/creditos` | Lista de créditos + cronograma de cuotas + pago de próxima cuota + comprobante imprimible |
| `/transferencias` | Transferencia entre cuentas de ahorro propias + comprobante imprimible |
| `/solicitar-credito` | Formulario de solicitud de nuevo crédito |
| `/productos` | Catálogo informativo de productos de ahorro y crédito de Caja Paita |

Todas las rutas (excepto `/login`) están protegidas: si no hay sesión activa, redirigen
automáticamente a `/login`.

### 6.1. Panel de administración (back-office)

| Ruta | Descripción |
|---|---|
| `/admin/login` | Inicio de sesión del personal interno |
| `/admin` | Dashboard: KPIs generales, solicitudes por estado, recientes y operaciones recientes |
| `/admin/solicitudes` | Listado de solicitudes de crédito (filtro por estado, búsqueda) + detalle con datos completos del cliente solicitante + acciones para aprobar / rechazar / marcar como desembolsado |
| `/admin/clientes` | Listado y búsqueda de clientes + detalle con sus cuentas de ahorro, créditos e historial de solicitudes |
| `/admin/operaciones` | Listado de todas las operaciones (transferencias, pagos) de todos los clientes |
| `/admin/reportes` | Cartera por producto, solicitudes por mes, cartera por agencia y morosidad por tramo de mora |

Todas las rutas `/admin/*` (excepto `/admin/login`) están protegidas por
`ProtectedRouteAdmin` y redirigen a `/admin/login` si no hay sesión de administrador activa.

---

## 7. Estructura del proyecto

```
caja-virtual-frontend/
├── .env
├── tailwind.config.js          # Paleta institucional (navy + accent naranja)
├── src/
│   ├── api/
│   │   ├── client.js              # Cliente axios cliente, con interceptor JWT (cv_token)
│   │   ├── endpoints.js           # Funciones que llaman a cada endpoint del backend (cliente)
│   │   ├── clientAdmin.js         # Cliente axios admin, con interceptor JWT (cv_admin_token)
│   │   └── endpointsAdmin.js      # Funciones que llaman a cada endpoint /admin/*
│   ├── context/
│   │   ├── AuthContext.jsx        # Sesión cliente: login, logout, persistencia en localStorage
│   │   └── AdminAuthContext.jsx   # Sesión admin: independiente de la sesión de cliente
│   ├── components/
│   │   ├── Logo.jsx
│   │   ├── AppLayout.jsx          # Sidebar + header (cliente)
│   │   ├── AdminLayout.jsx        # Sidebar + header (panel admin)
│   │   ├── ProtectedRoute.jsx
│   │   ├── ProtectedRouteAdmin.jsx
│   │   └── ui.jsx                 # Card, StatusBadge, Spinner, ErrorBanner, EmptyState
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── AhorrosPage.jsx
│   │   ├── CreditosPage.jsx
│   │   ├── TransferenciasPage.jsx
│   │   ├── SolicitarCreditoPage.jsx
│   │   └── admin/
│   │       ├── AdminLoginPage.jsx
│   │       ├── AdminDashboardPage.jsx
│   │       ├── AdminSolicitudesPage.jsx   # Listado + detalle + aprobar/rechazar/desembolsar
│   │       ├── AdminClientesPage.jsx      # Listado + detalle (cuentas, créditos, solicitudes)
│   │       ├── AdminOperacionesPage.jsx
│   │       └── AdminReportesPage.jsx
│   ├── utils/
│   │   └── format.js              # formatMoney, formatDate, formatDateTime
│   └── App.jsx                    # Router principal (rutas cliente + rutas /admin/*)
```

---

## 8. Notas de diseño

- **Paleta**: azul marino institucional (`navy-900: #0B2545`) + naranja de acento
  (`accent-500: #F5821F`), inspirados en la identidad visual pública de Caja Paita.
- **Logo**: ícono de ola estilizada, evocando la identidad marina/portuaria de Paita.
- **Datos de contacto reales**: teléfono (073) 258780 y dirección Jr. Plaza de Armas
  176-178, Paita, visibles en el sidebar y en la pantalla de login.
- **Productos reales**: el catálogo de `/productos` y los nombres de productos de
  crédito (Libre Disponibilidad, Empresarial, Pesca, Crece Mujer, Rapidito,
  Agropecuario) corresponden a la oferta real de Caja Paita.
- **Comprobantes/recibos**: tanto la transferencia como el pago de cuota generan un
  voucher imprimible con código de operación, estilo recibo bancario.
- **Tipografía**: Inter (buena legibilidad para cifras y datos financieros).
- **Responsive**: sidebar fijo en desktop, menú hamburguesa en mobile (igual en el
  panel admin que en la caja virtual de clientes).
- El signo de cada movimiento (ingreso/egreso) se toma directamente del backend
  (`tipo_egreso_ingreso`), que ya refleja la perspectiva correcta de la cuenta consultada.
- **Panel admin**: usa la misma paleta y componentes (`Card`, `StatusBadge`, `Spinner`,
  `ErrorBanner`, `EmptyState`) que la caja virtual de clientes, pero con un sidebar de
  fondo `navy-900` sólido y una insignia "Panel Administrador" para diferenciarlo
  visualmente del lado de cliente. Los gráficos de reportes se construyen con barras
  CSS simples (sin librería de charts adicional) para no añadir dependencias.

> **Nota sobre el backend**: la vista de Movimientos consolidados usa un endpoint nuevo
> `GET /cuentas/ahorro/movimientos` (sin código de cuenta), que devuelve el historial de
> TODAS las cuentas del cliente autenticado. El panel admin requiere además los routers
> nuevos bajo `/admin/*` (ver README de `homebanking`). Si usas una copia anterior del
> backend sin estos endpoints, actualízalo con la versión más reciente del proyecto
> `homebanking`.

---

## 9. Build de producción

```bash
npm run build
```

Genera los archivos estáticos en `dist/`, listos para desplegar en cualquier hosting
estático (Netlify, Vercel, S3, nginx, etc.). Recuerda ajustar `VITE_API_BASE_URL` al
dominio real del backend en producción.
