import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedRouteAdmin from "./components/ProtectedRouteAdmin";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AperturaPage from "./pages/AperturaPage";
import DashboardPage from "./pages/DashboardPage";
import AhorrosPage from "./pages/AhorrosPage";
import CreditosPage from "./pages/CreditosPage";
import TransferenciasPage from "./pages/TransferenciasPage";
import SolicitarCreditoPage from "./pages/SolicitarCreditoPage";
import MovimientosPage from "./pages/MovimientosPage";
import ProductosPage from "./pages/ProductosPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminSolicitudesPage from "./pages/admin/AdminSolicitudesPage";
import AdminClientesPage from "./pages/admin/AdminClientesPage";
import AdminOperacionesPage from "./pages/admin/AdminOperacionesPage";
import AdminReportesPage from "./pages/admin/AdminReportesPage";
import AdminMoraPage from "./pages/admin/AdminMoraPage";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function ProtectedAdmin({ children }) {
  return (
    <ProtectedRouteAdmin>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRouteAdmin>
  );
}

// "/" muestra la landing pública en modo Homebanking, o redirige a /admin/login
// en modo CORE (controlado por la variable de entorno VITE_APP_MODE).
// El dashboard vive en "/dashboard" (ruta protegida separada).
// Así el flujo es: landing → login → dashboard, igual que un banco real.
const isCoreMode = import.meta.env.VITE_APP_MODE === "core";

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={isCoreMode ? <Navigate to="/admin/login" replace /> : <LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/apertura" element={<AperturaPage />} />

            {/* Rutas privadas cliente */}
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/movimientos" element={<Protected><MovimientosPage /></Protected>} />
            <Route path="/ahorros" element={<Protected><AhorrosPage /></Protected>} />
            <Route path="/creditos" element={<Protected><CreditosPage /></Protected>} />
            <Route path="/transferencias" element={<Protected><TransferenciasPage /></Protected>} />
            <Route path="/solicitar-credito" element={<Protected><SolicitarCreditoPage /></Protected>} />
            <Route path="/productos" element={<Protected><ProductosPage /></Protected>} />

            {/* Panel de administración (back-office) */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<ProtectedAdmin><AdminDashboardPage /></ProtectedAdmin>} />
            <Route path="/admin/solicitudes" element={<ProtectedAdmin><AdminSolicitudesPage /></ProtectedAdmin>} />
            <Route path="/admin/mora" element={<ProtectedAdmin><AdminMoraPage /></ProtectedAdmin>} />
            <Route path="/admin/clientes" element={<ProtectedAdmin><AdminClientesPage /></ProtectedAdmin>} />
            <Route path="/admin/operaciones" element={<ProtectedAdmin><AdminOperacionesPage /></ProtectedAdmin>} />
            <Route path="/admin/reportes" element={<ProtectedAdmin><AdminReportesPage /></ProtectedAdmin>} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  );
}