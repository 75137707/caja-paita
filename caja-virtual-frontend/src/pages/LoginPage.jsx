import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, User, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import Carousel from "../components/Carousel";
import { IllusBancaMovil, IllusSeguridad, IllusCrecimiento } from "../components/BrandIllustrations";

const SLIDES = [
  {
    Illus: IllusBancaMovil,
    title: "Tu banca, donde estés.",
    text: "Revisa tus cuentas de ahorro y créditos, transfiere entre tus cuentas y paga tus cuotas, las 24 horas del día, sin hacer cola.",
  },
  {
    Illus: IllusCrecimiento,
    title: "Haz crecer tu dinero.",
    text: "Simula tus ahorros y créditos, sigue tu progreso y toma mejores decisiones financieras desde un solo lugar.",
  },
  {
    Illus: IllusSeguridad,
    title: "Seguridad de verdad.",
    text: "Tus operaciones viajan cifradas y tu sesión se protege con los mismos estándares que exige la SBS a las instituciones financieras.",
  },
];

export default function LoginPage() {
  const { signIn, loading } = useAuth();
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
      const redirectTo = location.state?.from?.pathname || "/dashboard";
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
            background: "linear-gradient(160deg, #3F5E1A 0%, #557A22 55%, #B6433A 145%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #B6433A 0%, transparent 45%), radial-gradient(circle at 80% 70%, #6FA032 0%, transparent 50%)",
          }}
        />
        <Logo variant="light" size="lg" />

        <div className="relative z-10 max-w-md">
          <Carousel
            interval={5500}
            slides={SLIDES.map(({ Illus, title, text }, i) => (
              <div key={i}>
                <div className="mb-6 -ml-2">
                  <Illus size={220} />
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
            Supervisado por la SBS · Depósitos protegidos por el Fondo de
            Seguro de Depósitos
          </span>
        </div>
      </div>

      {/* Panel de login */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-sm bg-white lg:bg-transparent lg:shadow-none shadow-card rounded-2xl lg:rounded-none p-6 lg:p-0">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo variant="dark" size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-ink-900 mb-1">Caja Virtual</h2>
          <p className="text-ink-400 text-sm mb-8">
            Ingresa con tu código de cliente y contraseña.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink-700 mb-1.5">
                Código de cliente
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
                  placeholder="cli000001"
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
              className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-ink-900/10" />
            <span className="text-xs text-ink-400">o</span>
            <div className="flex-1 h-px bg-ink-900/10" />
          </div>

          <Link
            to="/registro"
            className="w-full flex items-center justify-center gap-2 border border-navy-700/20 text-navy-700 hover:bg-navy-50 font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            <UserPlus size={17} /> Ya soy cliente, crear mi acceso
          </Link>
          <Link
            to="/apertura"
            className="w-full flex items-center justify-center gap-2 border border-accent-600/30 text-accent-600 hover:bg-accent-50 font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2.5"
          >
            <UserPlus size={17} /> Soy nuevo, abrir mi cuenta
          </Link>

          <p className="text-xs text-ink-400 mt-8 text-center">
            ¿Problemas para ingresar? Llámanos al{" "}
            <span className="font-semibold text-ink-700">(073) 258780</span> o acércate a
            nuestra oficina en Jr. Plaza de Armas 176-178, Paita.
          </p>
          <p className="text-xs text-ink-400 mt-3 text-center">
            ¿Eres personal de Caja Paita?{" "}
            <a href="/admin/login" className="font-semibold text-navy-700 hover:text-navy-900">
              Ingresa al panel administrador
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
