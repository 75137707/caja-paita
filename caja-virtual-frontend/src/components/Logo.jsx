export default function Logo({ variant = "light", size = "md" }) {
  const isLight = variant === "light";
  const sizes = { sm: "h-7", md: "h-9", lg: "h-12" };

  return (
    <div className={`flex items-center gap-2.5 ${sizes[size]}`}>
      <svg viewBox="0 0 40 40" className={sizes[size]} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="9" fill="#B6433A" />
        {/* Casita estilizada — logo real de Caja Paita */}
        <path d="M20 8L8 18.5h4.4V32h7.1v-7.7h1v7.7h7.1V18.5H32L20 8z" fill="white" />
      </svg>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-lg">
          <span className={isLight ? "text-white" : "text-[#B6433A]"}>Caja</span>
          <span className={isLight ? "text-[#9FD66B]" : "text-[#5B8C2A]"}> Paita</span>
        </div>
        <div className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? "text-white/60" : "text-ink-400"}`}>
          Caja Virtual
        </div>
      </div>
    </div>
  );
}
