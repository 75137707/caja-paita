import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, User, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import Logo from "../../components/Logo";
import Carousel from "../../components/Carousel";
import { IllusDashboardAdmin, IllusEquipo, IllusSeguridad } from "../../components/BrandIllustrations";

const SLIDES = [
  {
    Illus: IllusDashboardAdmin,
    title: "Todo tu back-office en un solo lugar.",
    text: "Solicitudes, desembolsos, mora y reportes en tiempo real, con la misma trazabilidad que exige un core bancario.",
  },
  {
    Illus: IllusEquipo,
    title: "Roles y accesos bajo control.",
    text: "Cada colaborador ve solo lo que su rol permite. Los permisos se revocan al instante desde el panel.",
  },
  {
    Illus: IllusSeguridad,
    title: "Auditoría en cada acción crítica.",
    text: "Desembolsos, castigos de cartera y cambios de comité quedan registrados con usuario, hora y motivo.",
  },
];

/* Reloj en vivo — le da movimiento real al panel, no solo decorativo */
function RelojEnVivo() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fecha = now.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long" });
  const hora = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="flex items-center gap-2 text-white/70 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
      </span>
      <span className="capitalize">{fecha}</span>
      <span className="text-white/40">·</span>
      <span className="tabular-nums">{hora}</span>
    </div>
  );
}

export default function AdminLoginPage() {
  const { signIn, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const result = await signIn(username.trim(), password);
    if (result.ok) {
      const redirectTo = location.state?.from?.pathname || "/admin";
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel institucional izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, #26380F 0%, #3F5E1A 55%, #7A1F1F 150%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #B6433A 0%, transparent 45%), radial-gradient(circle at 80% 70%, #6FA032 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <Logo variant="light" size="lg" />
          <RelojEnVivo />
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-accent-50 mb-5">
            <ShieldCheck size={14} /> Acceso restringido
          </span>
          <Carousel
            interval={5500}
            slides={SLIDES.map(({ Illus, title, text }, i) => (
              <div key={i}>
                <div className="mb-6 -ml-2">
                  <Illus size={210} />
                </div>
                <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
                  {title}
                </h1>
                <p className="text-white/70 text-base leading-relaxed">{text}</p>
              </div>
            ))}
          />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-white/60 text-sm">
          <ShieldCheck size={18} />
          <span>Conexión protegida · CMAC Paita S.A.</span>
        </div>
        <div className="relative z-10 flex items-center gap-4 pt-4 mt-2 border-t border-white/10">
          <span className="text-[11px] text-white/40 leading-tight">
            Supervisado por la SBS · Acceso exclusivo de personal autorizado
          </span>
        </div>
      </div>

      {/* Panel de login */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-sm bg-white lg:bg-transparent lg:shadow-none shadow-card rounded-2xl lg:rounded-none p-6 lg:p-0">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo variant="dark" size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-ink-900 mb-1">Acceso administrador</h2>
          <p className="text-ink-400 text-sm mb-8">
            Ingresa con tu usuario y contraseña de personal interno.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink-700 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-danger-50 text-danger-600 text-sm px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? "Ingresando…" : "Ingresar al panel"}
            </button>
          </form>

          <p className="text-xs text-ink-400 mt-8 text-center">
            ¿Eres cliente de Caja Paita? Ingresa por la{" "}
            <a href="/login" className="font-semibold text-accent-600 hover:text-accent-500">
              Caja Virtual
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
