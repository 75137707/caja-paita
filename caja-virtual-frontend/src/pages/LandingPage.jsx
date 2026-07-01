import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone, MapPin, Share2, ChevronDown,
  HandCoins, CreditCard, PiggyBank, Building2, Umbrella,
  Landmark, UserCheck, ShieldAlert, MessageSquareWarning,
  Megaphone, BookOpenCheck, ClipboardList, Wallet, ArrowUp, ArrowRight,
} from "lucide-react";
import Carousel from "../components/Carousel";
import { IllusBancaMovil, IllusCrecimiento, IllusSeguridad } from "../components/BrandIllustrations";

/* ─── Logo fiel al real: casita roja + CajaPaita en dos colores ─── */
function LogoCajaP({ light = false, size = "md" }) {
  const s = { sm: [22, 13, 10, 7], md: [28, 16, 12, 8], lg: [36, 20, 15, 9] }[size] || [28, 16, 12, 8];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <svg width={s[0]} height={s[0]} viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="7" fill="#B6433A" />
        <path d="M18 7L6 17h4v12h8V22h0v7h8V17h4L18 7z" fill="white" />
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontSize: s[1], fontWeight: 800, lineHeight: 1.1 }}>
          <span style={{ color: light ? "#fff" : "#B6433A" }}>Caja</span>
          <span style={{ color: light ? "#9FD66B" : "#5B8C2A" }}>Paita</span>
        </div>
        <div style={{ fontSize: s[3], color: light ? "rgba(255,255,255,0.6)" : "#8a8a85", marginTop: 1 }}>
          ¡Pasión por tu progreso!
        </div>
      </div>
    </div>
  );
}

/* ─── SVG mascota Payti (abeja estilizada) ─── */
function PaytiSVG({ size = 110 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" fill="none">
      {/* cuerpo */}
      <ellipse cx="55" cy="65" rx="22" ry="26" fill="#F5C842" />
      <ellipse cx="55" cy="65" rx="22" ry="26" fill="url(#beeStripes)" />
      {/* rayas */}
      <defs>
        <pattern id="beeStripes" patternUnits="userSpaceOnUse" width="44" height="12" x="33" y="39">
          <rect width="44" height="6" fill="#1A1A1A" opacity="0.5" />
          <rect y="6" width="44" height="6" fill="transparent" />
        </pattern>
        <radialGradient id="wingGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#B8E0FF" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      {/* alas */}
      <ellipse cx="30" cy="48" rx="16" ry="10" fill="url(#wingGrad)" stroke="#B8D8F8" strokeWidth="1" transform="rotate(-20 30 48)" />
      <ellipse cx="80" cy="48" rx="16" ry="10" fill="url(#wingGrad)" stroke="#B8D8F8" strokeWidth="1" transform="rotate(20 80 48)" />
      {/* cabeza */}
      <circle cx="55" cy="38" r="15" fill="#F5C842" />
      <circle cx="55" cy="38" r="15" fill="#F5C842" stroke="#E8B830" strokeWidth="1" />
      {/* ojos */}
      <circle cx="49" cy="36" r="5" fill="white" />
      <circle cx="61" cy="36" r="5" fill="white" />
      <circle cx="50" cy="36" r="3" fill="#1A1A1A" />
      <circle cx="62" cy="36" r="3" fill="#1A1A1A" />
      <circle cx="51" cy="35" r="1" fill="white" />
      <circle cx="63" cy="35" r="1" fill="white" />
      {/* antenas */}
      <line x1="49" y1="24" x2="43" y2="14" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="43" cy="13" r="3" fill="#F5C842" stroke="#1A1A1A" strokeWidth="1.5" />
      <line x1="61" y1="24" x2="67" y2="14" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="67" cy="13" r="3" fill="#F5C842" stroke="#1A1A1A" strokeWidth="1.5" />
      {/* sonrisa */}
      <path d="M49 42 Q55 48 61 42" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* patas */}
      <line x1="40" y1="72" x2="30" y2="82" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="72" x2="80" y2="82" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
      {/* aguijón */}
      <path d="M55 90 L51 100 L55 97 L59 100 Z" fill="#F5C842" stroke="#E8B830" strokeWidth="1" />
    </svg>
  );
}

/* ─── Tarjeta de acceso rápido circular rojo ─── */
function AccesoCircular({ icon: Icon, label, to }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 group">
      <div style={{
        width: 72, height: 72, borderRadius: "50%", background: "#A93333",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 10px rgba(169,51,51,0.35)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.07)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(169,51,51,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 3px 10px rgba(169,51,51,0.35)"; }}
      >
        <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color="white" strokeWidth={1.8} />
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#A93333", textAlign: "center", maxWidth: 90, lineHeight: 1.3 }}>
        {label}
      </span>
    </Link>
  );
}

/* ─── Acceso Payti especial (fondo blanco) ─── */
function AccesoPayti({ to }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 group">
      <div style={{
        width: 72, height: 72, borderRadius: "50%", background: "white",
        border: "2.5px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
      }}>
        <PaytiSVG size={52} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#A93333", textAlign: "center", maxWidth: 90, lineHeight: 1.3 }}>
        Capacítate con nosotros
      </span>
    </Link>
  );
}

const MENU = [
  { label: "Nosotros", drop: true },
  { label: "Productos y Servicios", drop: true },
  { label: "Agencias", drop: true },
  { label: "Transparencia", drop: false },
  { label: "Simuladores", drop: true },
  { label: "¡SOLICITA TU CRÉDITO!", highlight: true },
  { label: "Venta de Inmuebles", drop: false },
  { label: "Sostenibilidad", drop: true },
];

const ACCESOS = [
  { icon: HandCoins, label: "Solicita un Crédito Aquí", to: "/apertura" },
  { icon: CreditCard, label: "Productos de Créditos", to: "/login" },
  { icon: PiggyBank, label: "Productos de Ahorro", to: "/login" },
  { icon: Building2, label: "Servicios", to: "/login" },
  { icon: Umbrella, label: "Seguros", to: "/login" },
];

const TRANSPARENCIA = [
  { icon: Landmark, label: "Fondo de Seguro de Depósito", sub: "S/122,000" },
  { icon: UserCheck, label: "Protección de Datos Personales" },
  { icon: ShieldAlert, label: "Recomendaciones de Seguridad" },
  { icon: MessageSquareWarning, label: "Sugerencias" },
  { icon: Megaphone, label: "Canal de Denuncias" },
  { icon: BookOpenCheck, label: "Libro de Reclamaciones" },
  { icon: ClipboardList, label: "Requerimientos" },
  { icon: Wallet, label: "Solicita tu Crédito" },
];

export default function LandingPage() {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F2", fontFamily: "Inter,system-ui,sans-serif" }}>

      {/* 1. Barra superior */}
      <div style={{ background: "#ECECEC", borderBottom: "1px solid #D8D8D5", padding: "5px 24px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#444" }}>
        <span>Tipo de Cambio: <b style={{ color: "#B6433A" }}>Compra S/. 3.33 - Venta S/. 3.48</b></span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Phone size={11} />Línea de atención al cliente: <b style={{ color: "#1A6BBF" }}>(073) 258780</b>
        </span>
      </div>

      {/* 2. Header */}
      <header style={{ background: "#F0F0EE", borderBottom: "1px solid #D8D8D5", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <Link to="/"><LogoCajaP size="lg" /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/login" style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #5B8C2A", color: "#5B8C2A", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", background: "white" }}>
            <Phone size={14} /> Operaciones en Línea
          </Link>
          <div style={{ width: 32, height: 32, background: "white", border: "1px solid #D8D8D5", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Share2 size={15} color="#555" />
          </div>
          <div style={{ width: 34, height: 34, background: "#1877F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 18, lineHeight: 1 }}>f</span>
          </div>
        </div>
      </header>

      {/* 3. Menú verde */}
      <nav style={{ background: "#5B8C2A", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap" }}>
          {MENU.map(item => (
            <div key={item.label} style={{ position: "relative" }}
              onMouseEnter={() => item.drop && setOpenMenu(item.label)}
              onMouseLeave={() => item.drop && setOpenMenu(null)}>
              <Link to="/login" style={{
                display: "flex", alignItems: "center", gap: 3, padding: "10px 12px",
                color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
                background: item.highlight ? "#A93333" : "transparent",
              }}>
                {item.label}
                {item.drop && <ChevronDown size={12} />}
              </Link>
              {item.drop && openMenu === item.label && (
                <div style={{ position: "absolute", top: "100%", left: 0, background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", borderRadius: "0 0 8px 8px", minWidth: 180, zIndex: 100 }}>
                  <Link to="/login" style={{ display: "block", padding: "10px 16px", color: "#3D3D3A", fontSize: 13, textDecoration: "none" }}>
                    Ver todo sobre {item.label}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* 4. Banner aviso */}
      <div style={{ background: "#DDDBD5", textAlign: "center", padding: "7px 24px", fontSize: 12, color: "#333" }}>
        <b style={{ color: "#A93333" }}>IMPORTANTE:</b> Para cualquier trámite relacionado con cuentas de ahorros, plazo fijo o CTS, comuníquese al correo{" "}
        <span style={{ color: "#A93333", fontWeight: 600 }}>ahorrospaita@cajapaita.pe</span>
      </div>

      {/* 5. Hero promocional — carrusel interactivo */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(120deg, #3F5E1A 0%, #5B8C2A 55%, #7A1F1F 150%)",
        }}
      >
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.08,
            backgroundImage: "radial-gradient(circle at 15% 20%, #B6433A 0%, transparent 45%), radial-gradient(circle at 85% 80%, #F5C842 0%, transparent 40%)",
          }}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", position: "relative" }}>
          <Carousel
            interval={6000}
            slides={[
              {
                Illus: IllusBancaMovil,
                eyebrow: "Caja Virtual",
                title: <>Tu banca, <br />donde estés.</>,
                text: "Revisa tus cuentas, transfiere y paga tus cuotas las 24 horas del día, sin hacer cola.",
                cta: "Operaciones en Línea",
                to: "/login",
              },
              {
                Illus: IllusCrecimiento,
                eyebrow: "Créditos Caja Paita",
                title: <>Impulsa tu <br />negocio.</>,
                text: "Créditos pensados para emprendedores de Paita, con evaluación ágil y asesoría personalizada.",
                cta: "Solicita tu Crédito",
                to: "/apertura",
              },
              {
                Illus: () => <PaytiSVG size={200} />,
                eyebrow: "Educación financiera gratis",
                title: <>Aprende con <br />Payti.</>,
                text: "Cursos cortos y gratuitos para manejar mejor tu dinero, tu negocio y tu futuro.",
                cta: "Aprende con Payti",
                to: "/login",
              },
            ].map(({ Illus, eyebrow, title, text, cta, to }, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", alignItems: "center", gap: 32, padding: "48px 0" }}>
                <div>
                  <span style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "white", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", borderRadius: 20, marginBottom: 16 }}>
                    {eyebrow}
                  </span>
                  <h1 style={{ color: "white", fontWeight: 900, fontSize: 38, lineHeight: 1.15, margin: "0 0 14px", textShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
                    {title}
                  </h1>
                  <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 1.6, maxWidth: 420, margin: "0 0 24px" }}>
                    {text}
                  </p>
                  <Link to={to} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "white", color: "#A93333", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none", boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
                    {cta} <ArrowRight size={16} />
                  </Link>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Illus size={260} />
                </div>
              </div>
            ))}
          />
        </div>
      </section>

      {/* 5b. Franja de confianza */}
      <section style={{ background: "white", borderBottom: "1px solid #ECECE9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 32px", display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {[
            { label: "Años sirviendo a Paita", value: "30+" },
            { label: "Fondo de Seguro de Depósitos", value: "S/122,000" },
            { label: "Supervisado por", value: "SBS" },
            { label: "Atención", value: "24/7 en línea" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#A93333" }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#777" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Accesos rápidos circulares */}
      <section style={{ background: "white", padding: "32px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          {ACCESOS.map(a => <AccesoCircular key={a.label} {...a} />)}
          <AccesoPayti to="/login" />
        </div>
      </section>

      {/* 7. Noticias */}
      <section style={{ background: "#ECECEA", padding: "40px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", marginBottom: 24, textAlign: "center" }}>Noticias</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Noticia 1: tipo portada grande */}
            <div style={{ background: "white", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <div style={{ position: "relative", background: "linear-gradient(135deg, #5B8C2A, #6AA530)", padding: 20, minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(169,51,51,0.92)", padding: "6px 0", textAlign: "center" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>ALCANZANDO METAS</span>
                </div>
                <div style={{ marginTop: 28 }}>
                  <LogoCajaP light size="md" />
                </div>
                <div style={{ marginTop: 12 }}>
                  <PaytiSVG size={80} />
                </div>
                <div style={{ position: "absolute", top: 8, right: 12, background: "#A93333", borderRadius: 4, padding: "4px 8px", textAlign: "center" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>04</div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 10 }}>FEB</div>
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>Alcanzando Metas</h3>
                <Link to="/login" style={{ color: "#A93333", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Leer Más ›</Link>
              </div>
            </div>

            {/* Noticia 2: horizontal imagen + texto */}
            <div style={{ background: "white", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", display: "grid", gridTemplateColumns: "auto 1fr" }}>
              <div style={{ position: "relative", width: 170, background: "#2C2C2A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ padding: 12, textAlign: "center" }}>
                  <LogoCajaP light size="sm" />
                  <div style={{ marginTop: 10, background: "#A93333", borderRadius: 4, padding: "4px 8px" }}>
                    <p style={{ color: "white", fontSize: 8, fontWeight: 700, margin: 0 }}>UNA CAJA EN CRECIMIENTO</p>
                  </div>
                  <div style={{ marginTop: 6, background: "#5B8C2A", borderRadius: 4, padding: "4px 8px" }}>
                    <p style={{ color: "white", fontSize: 7, fontWeight: 600, margin: 0 }}>CAJA PAITA MEJORA SU CALIFICACIÓN DE RIESGOS.</p>
                  </div>
                </div>
                <div style={{ position: "absolute", top: 8, right: 8, background: "#A93333", borderRadius: 4, padding: "3px 7px", textAlign: "center" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>12</div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 9 }}>ABR</div>
                </div>
              </div>
              <div style={{ padding: "20px 20px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: "0 0 10px", lineHeight: 1.3 }}>
                  Caja Paita Mejora dos niveles de su calificación de riesgos en los últimos dos años
                </h3>
                <p style={{ fontSize: 13, color: "#555", margin: "0 0 12px", lineHeight: 1.6 }}>
                  Han sido diversos factores los que han contribuido a que la institución mejore en los últimos dos años...
                </p>
                <Link to="/login" style={{ color: "#A93333", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Leer Más ›</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Banda verde de transparencia */}
      <section style={{ background: "linear-gradient(135deg, #4E7E20, #6AA530)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 12 }}>
          {TRANSPARENCIA.map(t => (
            <Link key={t.label} to="/login" style={{ textDecoration: "none", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <t.icon size={20} color="white" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "white", lineHeight: 1.3 }}>{t.label}</span>
              {t.sub && <span style={{ fontSize: 10, fontWeight: 700, color: "#FAC775" }}>{t.sub}</span>}
            </Link>
          ))}
        </div>
      </section>

      {/* 9. Logos reguladores */}
      <section style={{ background: "white", borderTop: "1px solid #E0E0DE", borderBottom: "1px solid #E0E0DE" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", display: "flex", justifyContent: "center", alignItems: "center", gap: 60, flexWrap: "wrap" }}>
          {[
            { sigla: "SBS", full: "Superintendencia de Banca, Seguros y AFP", color: "#1A4A8C" },
            { sigla: "SUNAT", full: "Superintendencia Nacional de Aduanas", color: "#8C1A1A" },
            { sigla: "BCRP", full: "Banco Central de Reserva del Perú", color: "#6B5000" },
          ].map(r => (
            <div key={r.sigla} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: r.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: 800, fontSize: 10 }}>{r.sigla}</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: r.color, margin: 0 }}>{r.sigla}</p>
                <p style={{ fontSize: 10, color: "#777", margin: 0, maxWidth: 160 }}>{r.full}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Footer */}
      <footer style={{ background: "#1A1A18", padding: "24px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <LogoCajaP light size="md" />
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.8 }}>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={13} /> Jr. Plaza de Armas 176 – 178, Paita</p>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Phone size={13} /> (073) 258780</p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 20, paddingTop: 14 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>© Caja Paita {new Date().getFullYear()} - Todos los Derechos Reservados.</span>
            <Link to="/login" style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textDecoration: "none" }}>Correo Web CMAC Paita</Link>
          </div>
        </div>
      </footer>

      {/* Botón volver arriba */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ position: "fixed", bottom: 20, right: 20, width: 38, height: 38, borderRadius: 6, background: "#A93333", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }}
        aria-label="Volver arriba"
      >
        <ArrowUp size={18} color="white" />
      </button>
    </div>
  );
}
