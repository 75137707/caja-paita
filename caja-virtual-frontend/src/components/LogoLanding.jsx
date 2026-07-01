import { Home } from "lucide-react";

/**
 * Logo fiel al real de Caja Paita: casita roja + texto "Caja" (rojo) + "Paita"
 * (verde) + tagline. Se usa solo en LandingPage.jsx para no alterar el logo
 * (Logo.jsx) que ya usan el resto de pantallas del sistema (login, dashboard,
 * panel admin, etc.) con la paleta navy/accent existente.
 */
export default function LogoLanding({ variant = "dark", size = "md" }) {
  const sizes = {
    sm: { icon: 28, text: "text-base", tag: "text-[9px]" },
    md: { icon: 34, text: "text-lg", tag: "text-[10px]" },
    lg: { icon: 42, text: "text-2xl", tag: "text-xs" },
  };
  const s = sizes[size] || sizes.md;
  const isLight = variant === "light";

  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-lg flex items-center justify-center shrink-0"
        style={{ width: s.icon, height: s.icon, background: "#B6433A" }}
      >
        <Home size={s.icon * 0.55} color="#ffffff" strokeWidth={2.3} />
      </div>
      <div className="leading-tight">
        <p className={`font-extrabold ${s.text} leading-none`}>
          <span style={{ color: isLight ? "#ffffff" : "#B6433A" }}>Caja</span>
          <span style={{ color: isLight ? "#9FD66B" : "#5B8C2A" }}>Paita</span>
        </p>
        <p className={`${s.tag} font-medium ${isLight ? "text-white/60" : "text-ink-400"}`}>
          ¡Pasión por tu progreso!
        </p>
      </div>
    </div>
  );
}
