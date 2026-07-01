import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  CreditCard,
  ArrowLeftRight,
  FilePlus2,
  LogOut,
  Menu,
  X,
  Receipt,
  Store,
  Phone,
} from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/movimientos", label: "Movimientos", icon: Receipt },
  { to: "/ahorros", label: "Cuentas de Ahorro", icon: PiggyBank },
  { to: "/creditos", label: "Mis Créditos", icon: CreditCard },
  { to: "/transferencias", label: "Transferir", icon: ArrowLeftRight },
  { to: "/solicitar-credito", label: "Solicitar Crédito", icon: FilePlus2 },
  { to: "/productos", label: "Productos", icon: Store },
];

export default function AppLayout({ children }) {
  const { cliente, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate("/login");
  };

  const iniciales = (cliente?.nombre || "CL")
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
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
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
            <nav className="flex-1 px-3 py-6 space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
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
            <p className="font-semibold text-ink-900">{cliente?.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-ink-400">Código de cliente</p>
              <p className="text-sm font-semibold text-ink-900">{cliente?.codcliente}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-sm">
              {iniciales}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
