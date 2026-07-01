import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  IdCard,
  Lock,
  Mail,
  Phone,
  MapPin,
  Wallet,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  Calendar,
  PiggyBank,
} from "lucide-react";
import { aperturarCliente } from "../api/endpoints";
import Logo from "../components/Logo";

const STEPS = {
  PERSONALES: 1,
  CONTACTO: 2,
  CREDENCIALES: 3,
  EXITO: 4,
};

const STEP_LABELS = [
  { step: STEPS.PERSONALES, label: "Tus datos personales" },
  { step: STEPS.CONTACTO, label: "Contacto e ingresos" },
  { step: STEPS.CREDENCIALES, label: "Crea tu acceso" },
  { step: STEPS.EXITO, label: "Cuenta aperturada" },
];

export default function AperturaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.PERSONALES);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    tipodocumento: "DNI",
    numerodocumento: "",
    nombres: "",
    apellidopaterno: "",
    apellidomaterno: "",
    fechanacimiento: "",
    sexo: "",
    email: "",
    telefono: "",
    direccion: "",
    ingresomensual: "",
    fuenteingreso: "",
    password: "",
    confirmar_password: "",
  });

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const passwordValida =
    form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);
  const passwordsCoinciden =
    form.password.length > 0 && form.password === form.confirmar_password;

  const validarPaso1 = () => {
    if (!/^\d{8,20}$/.test(form.numerodocumento)) {
      return "Ingresa un número de documento válido (solo números).";
    }
    if (form.nombres.trim().length < 2 || form.apellidopaterno.trim().length < 2 || form.apellidomaterno.trim().length < 2) {
      return "Completa tus nombres y apellidos.";
    }
    if (!form.fechanacimiento) {
      return "Ingresa tu fecha de nacimiento.";
    }
    if (!form.sexo) {
      return "Selecciona tu sexo.";
    }
    return null;
  };

  const validarPaso2 = () => {
    if (!form.email.includes("@")) return "Ingresa un correo electrónico válido.";
    if (!/^\d{6,20}$/.test(form.telefono)) return "Ingresa un teléfono válido (solo números).";
    if (form.direccion.trim().length < 5) return "Ingresa tu dirección completa.";
    if (!form.ingresomensual || Number(form.ingresomensual) < 0) return "Ingresa tu ingreso mensual.";
    if (form.fuenteingreso.trim().length < 2) return "Indica tu fuente de ingresos.";
    return null;
  };

  const handleSiguientePaso1 = (e) => {
    e.preventDefault();
    const err = validarPaso1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(STEPS.CONTACTO);
  };

  const handleSiguientePaso2 = (e) => {
    e.preventDefault();
    const err = validarPaso2();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(STEPS.CREDENCIALES);
  };

  const handleAperturar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!passwordValida) {
      setError("La contraseña debe tener al menos 8 caracteres, con letras y números.");
      return;
    }
    if (!passwordsCoinciden) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      const data = await aperturarCliente({
        ...form,
        ingresomensual: Number(form.ingresomensual),
      });
      setResultado(data);
      setStep(STEPS.EXITO);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo completar la apertura de tu cuenta. Intenta nuevamente.");
    } finally {
      setEnviando(false);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-accent-500 mb-4">
            <PiggyBank size={14} /> Apertura de cuenta nueva
          </span>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Abre tu cuenta en Caja Paita en minutos.
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Conviértete en cliente de Caja Paita sin acercarte a una agencia: te
            abrimos tu cuenta de Ahorro Corriente y tu acceso a Caja Virtual al
            instante.
          </p>
          <ul className="mt-8 space-y-3">
            {STEP_LABELS.map(({ step: s, label }) => (
              <StepHint
                key={s}
                active={step >= s}
                done={step > s}
                label={label}
              />
            ))}
          </ul>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-white/60 text-sm">
          <ShieldCheck size={18} />
          <span>Conexión protegida · CMAC Paita S.A.</span>
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo variant="dark" size="lg" />
          </div>

          {step === STEPS.PERSONALES && (
            <>
              <h2 className="text-2xl font-bold text-ink-900 mb-1">Tus datos personales</h2>
              <p className="text-ink-400 text-sm mb-8">
                Empecemos con tu información de identidad.
              </p>

              <form onSubmit={handleSiguientePaso1} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Tipo de documento
                    </label>
                    <select
                      value={form.tipodocumento}
                      onChange={set("tipodocumento")}
                      className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de Extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      N° de documento
                    </label>
                    <div className="relative">
                      <IdCard size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="72145896"
                        value={form.numerodocumento}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, numerodocumento: e.target.value.replace(/\D/g, "") }))
                        }
                        maxLength={20}
                        required
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Nombres</label>
                  <div className="relative">
                    <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      placeholder="Maria Fernanda"
                      value={form.nombres}
                      onChange={set("nombres")}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Apellido paterno
                    </label>
                    <input
                      type="text"
                      placeholder="Quiroz"
                      value={form.apellidopaterno}
                      onChange={set("apellidopaterno")}
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Apellido materno
                    </label>
                    <input
                      type="text"
                      placeholder="Saavedra"
                      value={form.apellidomaterno}
                      onChange={set("apellidomaterno")}
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Fecha de nacimiento
                    </label>
                    <div className="relative">
                      <Calendar size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        type="date"
                        value={form.fechanacimiento}
                        onChange={set("fechanacimiento")}
                        required
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Sexo</label>
                    <select
                      value={form.sexo}
                      onChange={set("sexo")}
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="">Selecciona…</option>
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-danger-50 text-danger-600 text-sm px-3 py-2.5 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                >
                  Continuar <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}

          {step === STEPS.CONTACTO && (
            <>
              <button
                onClick={() => {
                  setError(null);
                  setStep(STEPS.PERSONALES);
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 mb-6"
              >
                <ArrowLeft size={16} /> Volver
              </button>

              <h2 className="text-2xl font-bold text-ink-900 mb-1">Contacto e ingresos</h2>
              <p className="text-ink-400 text-sm mb-8">
                Esto nos ayuda a contactarte y a evaluar tus futuros créditos.
              </p>

              <form onSubmit={handleSiguientePaso2} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="tucorreo@ejemplo.com"
                      value={form.email}
                      onChange={set("email")}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="969112233"
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, telefono: e.target.value.replace(/\D/g, "") }))
                      }
                      maxLength={20}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Dirección</label>
                  <div className="relative">
                    <MapPin size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      placeholder="Av. Grau 245, Paita"
                      value={form.direccion}
                      onChange={set("direccion")}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Ingreso mensual aproximado
                  </label>
                  <div className="relative">
                    <Wallet size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <span className="absolute left-9 top-1/2 -translate-y-1/2 text-ink-400 text-sm">
                      S/
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="1800"
                      value={form.ingresomensual}
                      onChange={set("ingresomensual")}
                      required
                      className="w-full pl-14 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Fuente de ingresos
                  </label>
                  <div className="relative">
                    <Briefcase size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      placeholder="Dependiente, negocio propio, pesca…"
                      value={form.fuenteingreso}
                      onChange={set("fuenteingreso")}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-danger-50 text-danger-600 text-sm px-3 py-2.5 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                >
                  Continuar <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}

          {step === STEPS.CREDENCIALES && (
            <>
              <button
                onClick={() => {
                  setError(null);
                  setStep(STEPS.CONTACTO);
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 mb-6"
              >
                <ArrowLeft size={16} /> Volver
              </button>

              <h2 className="text-2xl font-bold text-ink-900 mb-1">Crea tu acceso</h2>
              <p className="text-ink-400 text-sm mb-8">
                Última parada: define la contraseña con la que ingresarás a tu Caja
                Virtual.
              </p>

              <form onSubmit={handleAperturar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Crea una contraseña
                  </label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={set("password")}
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <p
                    className={`text-xs mt-1.5 ${
                      form.password.length === 0
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
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Confirma tu contraseña
                  </label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={form.confirmar_password}
                      onChange={set("confirmar_password")}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                    />
                  </div>
                  {form.confirmar_password.length > 0 && !passwordsCoinciden && (
                    <p className="text-xs mt-1.5 text-danger-600">Las contraseñas no coinciden.</p>
                  )}
                </div>

                {error && (
                  <div className="bg-danger-50 text-danger-600 text-sm px-3 py-2.5 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                >
                  {enviando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Aperturando tu cuenta…
                    </>
                  ) : (
                    "Aperturar mi cuenta"
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
                Te atendió la {resultado.agencia}. Ya puedes ingresar a tu Caja Virtual.
              </p>
              <div className="bg-white border border-ink-900/10 rounded-lg p-4 text-left mb-3 space-y-3">
                <div>
                  <p className="text-xs text-ink-400">Tu código de cliente (usuario)</p>
                  <p className="text-lg font-bold text-ink-900 font-mono">{resultado.username}</p>
                </div>
                <div className="pt-3 border-t border-ink-900/5">
                  <p className="text-xs text-ink-400">Tu cuenta de Ahorro Corriente</p>
                  <p className="text-lg font-bold text-ink-900 font-mono">
                    {resultado.nro_cuenta_ahorro}
                  </p>
                </div>
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
              ¿Ya eres cliente de Caja Paita?{" "}
              <Link to="/registro" className="font-semibold text-navy-700 hover:text-navy-900">
                Activa tu acceso aquí
              </Link>
              {" · "}
              <Link to="/login" className="font-semibold text-navy-700 hover:text-navy-900">
                Inicia sesión
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
