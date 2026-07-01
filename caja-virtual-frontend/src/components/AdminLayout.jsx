import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck2,
  Users,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  X,
  Phone,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";
import { useAdminAuth } from "../context/AdminAuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/solicitudes", label: "Solicitudes de Crédito", icon: FileCheck2 },
  { to: "/admin/mora", label: "Recuperaciones / Mora", icon: AlertTriangle },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/operaciones", label: "Operaciones", icon: Receipt },
  { to: "/admin/reportes", label: "Reportes", icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  const { admin, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate("/admin/login");
  };

  const iniciales = (admin?.nombre || "AD")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-navy-900 text-white shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Logo variant="light" size="md" />
        </div>
        <div className="px-4 pt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/70">
            <ShieldCheck size={12} /> Panel Administrador
          </span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-500 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={18} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10">
          <p className="flex items-center gap-2 text-xs text-white/50">
            <Phone size={13} /> (073) 258780
          </p>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            Jr. Plaza de Armas 176-178, Paita
          </p>
        </div>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={18} strokeWidth={2.2} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Sidebar mobile (overlay) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-navy-900/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-navy-900 text-white flex flex-col z-50">
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
              <Logo variant="light" size="sm" />
              <button onClick={() => setMobileOpen(false)} className="text-white/80">
                <X size={22} />
              </button>
            </div>
            <div className="px-4 pt-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/70">
                <ShieldCheck size={12} /> Panel Administrador
              </span>
            </div>
            <nav className="flex-1 px-3 py-6 space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent-500 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={2.2} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut size={18} strokeWidth={2.2} />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-ink-900/5 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-navy-900"
            aria-label="Abrir menú"
          >
            <Menu size={26} />
          </button>
          <div className="lg:hidden">
            <Logo variant="dark" size="sm" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-ink-400">Bienvenido(a)</p>
            <p className="font-semibold text-ink-900">{admin?.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-ink-400">Rol</p>
              <p className="text-sm font-semibold text-ink-900">{admin?.rol}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-sm">
              {iniciales}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
