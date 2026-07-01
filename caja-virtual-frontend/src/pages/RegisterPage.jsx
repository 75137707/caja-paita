import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  IdCard,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { verificarElegibilidadRegistro, registrarCliente } from "../api/endpoints";
import Logo from "../components/Logo";

const STEPS = {
  DOCUMENTO: 1,
  CREDENCIALES: 2,
  EXITO: 3,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.DOCUMENTO);

  // Paso 1
  const [numerodocumento, setNumerodocumento] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [errorDoc, setErrorDoc] = useState(null);
  const [elegibilidad, setElegibilidad] = useState(null);

  // Paso 2
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorReg, setErrorReg] = useState(null);
  const [resultado, setResultado] = useState(null);

  const passwordValida = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsCoinciden = password.length > 0 && password === confirmar;

  const handleVerificar = async (e) => {
    e.preventDefault();
    setErrorDoc(null);
    if (!/^\d{8,20}$/.test(numerodocumento)) {
      setErrorDoc("Ingresa un número de documento válido (solo números).");
      return;
    }
    setVerificando(true);
    try {
      const data = await verificarElegibilidadRegistro({ numerodocumento });
      if (!data.elegible) {
        setErrorDoc(data.motivo || "No fue posible verificar tu documento.");
        setElegibilidad(null);
        return;
      }
      setElegibilidad(data);
      setStep(STEPS.CREDENCIALES);
    } catch (err) {
      setErrorDoc(err.response?.data?.detail || "No se pudo verificar tu documento. Intenta nuevamente.");
    } finally {
      setVerificando(false);
    }
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErrorReg(null);
    if (!email.includes("@")) {
      setErrorReg("Ingresa un correo electrónico válido.");
      return;
    }
    if (!passwordValida) {
      setErrorReg("La contraseña debe tener al menos 8 caracteres, con letras y números.");
      return;
    }
    if (!passwordsCoinciden) {
      setErrorReg("Las contraseñas no coinciden.");
      return;
    }
    setRegistrando(true);
    try {
      const data = await registrarCliente({
        numerodocumento,
        email,
        password,
        confirmar_password: confirmar,
      });
      setResultado(data);
      setStep(STEPS.EXITO);
    } catch (err) {
      setErrorReg(err.response?.data?.detail || "No se pudo completar tu registro. Intenta nuevamente.");
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel institucional izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #B6433A 0%, transparent 45%), radial-gradient(circle at 80% 70%, #6FA032 0%, transparent 50%)",
          }}
        />
        <Logo variant="light" size="lg" />
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Crea tu acceso a la Caja Virtual.
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Si ya eres cliente de Caja Paita, en menos de un minuto puedes activar tu
            usuario y empezar a operar tus cuentas desde donde estés.
          </p>
          <ul className="mt-8 space-y-3">
            <StepHint
              active={step >= STEPS.DOCUMENTO}
              done={step > STEPS.DOCUMENTO}
              label="Verifica tu documento de identidad"
            />
            <StepHint
              active={step >= STEPS.CREDENCIALES}
              done={step > STEPS.CREDENCIALES}
              label="Crea tu correo y contraseña"
            />
            <StepHint
              active={step >= STEPS.EXITO}
              done={step >= STEPS.EXITO}
              label="Ingresa a tu Caja Virtual"
            />
          </ul>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-white/60 text-sm">
          <ShieldCheck size={18} />
          <span>Conexión protegida · CMAC Paita S.A.</span>
        </div>
      </div>

      {/* Panel de registro */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo variant="dark" size="lg" />
          </div>

          {step === STEPS.DOCUMENTO && (
            <>
              <h2 className="text-2xl font-bold text-ink-900 mb-1">Crea tu cuenta</h2>
              <p className="text-ink-400 text-sm mb-8">
                Empecemos verificando que ya eres cliente de Caja Paita.
              </p>

              <form onSubmit={handleVerificar} className="space-y-4">
                <div>
                  <label htmlFor="numerodocumento" className="block text-sm font-medium text-ink-700 mb-1.5">
                    Número de DNI
                  </label>
                  <div className="relative">
                    <IdCard
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                    />
                    <input
                      id="numerodocumento"
                      type="text"
                      inputMode="numeric"
                      placeholder="45896321"
                      value={numerodocumento}
                      onChange={(e) => setNumerodocumento(e.target.value.replace(/\D/g, ""))}
                      maxLength={20}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                {errorDoc && (
                  <div className="bg-danger-50 text-danger-600 text-sm px-3 py-2.5 rounded-lg">
                    {errorDoc}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verificando}
                  className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                >
                  {verificando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verificando…
                    </>
                  ) : (
                    <>
                      Continuar <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {step === STEPS.CREDENCIALES && elegibilidad && (
            <>
              <button
                onClick={() => setStep(STEPS.DOCUMENTO)}
                className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 mb-6"
              >
                <ArrowLeft size={16} /> Volver
              </button>

              <h2 className="text-2xl font-bold text-ink-900 mb-1">
                Hola, {elegibilidad.nombres?.split(" ")[0]}
              </h2>
              <p className="text-ink-400 text-sm mb-8">
                Confirmamos tu identidad como{" "}
                <span className="font-semibold text-ink-700">{elegibilidad.codcliente}</span>. Ahora
                crea tu correo y contraseña de acceso.
              </p>

              <form onSubmit={handleRegistrar} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={elegibilidad.email_parcial || "tucorreo@ejemplo.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">
                    Crea una contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                  <p
                    className={`text-xs mt-1.5 ${
                      password.length === 0
                        ? "text-ink-400"
                        : passwordValida
                        ? "text-success-600"
                        : "text-danger-600"
                    }`}
                  >
                    Mínimo 8 caracteres, con letras y números.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmar" className="block text-sm font-medium text-ink-700 mb-1.5">
                    Confirma tu contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                    />
                    <input
                      id="confirmar"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                  {confirmar.length > 0 && !passwordsCoinciden && (
                    <p className="text-xs mt-1.5 text-danger-600">Las contraseñas no coinciden.</p>
                  )}
                </div>

                {errorReg && (
                  <div className="bg-danger-50 text-danger-600 text-sm px-3 py-2.5 rounded-lg">
                    {errorReg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registrando}
                  className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                >
                  {registrando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creando tu cuenta…
                    </>
                  ) : (
                    "Crear mi cuenta"
                  )}
                </button>
              </form>
            </>
          )}

          {step === STEPS.EXITO && resultado && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success-50 text-success-600 mx-auto flex items-center justify-center mb-5">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="text-2xl font-bold text-ink-900 mb-1">{resultado.mensaje}</h2>
              <p className="text-ink-400 text-sm mb-6">
                Ya puedes ingresar a tu Caja Virtual con tu código de cliente.
              </p>
              <div className="bg-white border border-ink-900/10 rounded-lg p-4 text-left mb-6">
                <p className="text-xs text-ink-400">Tu código de cliente (usuario)</p>
                <p className="text-lg font-bold text-ink-900 font-mono">{resultado.username}</p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {step !== STEPS.EXITO && (
            <p className="text-xs text-ink-400 mt-8 text-center">
              ¿Ya tienes una cuenta?{" "}
              <Link to="/login" className="font-semibold text-navy-700 hover:text-navy-900">
                Inicia sesión
              </Link>
              {" · "}
              <Link to="/apertura" className="font-semibold text-navy-700 hover:text-navy-900">
                Aún no soy cliente
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHint({ active, done, label }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          done
            ? "bg-accent-500 text-navy-900"
            : active
            ? "bg-white/20 text-white"
            : "bg-white/10 text-white/40"
        }`}
      >
        {done ? <CheckCircle2 size={14} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      </span>
      <span className={active ? "text-white/90" : "text-white/40"}>{label}</span>
    </li>
  );
}
