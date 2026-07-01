/* ─────────────────────────────────────────────────────────────────
 * BrandIllustrations.jsx
 * Ilustraciones vectoriales propias, en la paleta de marca de Caja
 * Paita (rojo #B6433A / #A93333 · verde #5B8C2A / #6FA032), usadas
 * en los carruseles de Login, Admin y Landing. Reemplazan fotos de
 * stock por gráficos consistentes con la identidad ya construida
 * (mismo lenguaje visual del logo y de PaytiSVG).
 * ───────────────────────────────────────────────────────────────── */

/* Persona con celular haciendo banca móvil, con "ondas" de señal
   animadas y una tarjeta flotante con check de operación exitosa. */
export function IllusBancaMovil({ size = 320 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <circle cx="160" cy="160" r="150" fill="white" fillOpacity="0.06" />
      <circle cx="160" cy="160" r="118" fill="white" fillOpacity="0.05" />

      {/* silueta persona */}
      <ellipse cx="150" cy="245" rx="70" ry="18" fill="black" opacity="0.12" />
      <path d="M108 236c2-30 20-52 42-52s40 22 42 52c0 6-4 10-10 10h-64c-6 0-10-4-10-10z" fill="#EDEDEA" />
      <circle cx="150" cy="150" r="26" fill="#F0D2B4" />
      <path d="M126 146c2-14 12-24 24-24s22 10 24 24c-6 4-14 6-24 6s-18-2-24-6z" fill="#3A2A1E" />

      {/* celular en mano */}
      <rect x="176" y="168" width="34" height="58" rx="6" fill="white" stroke="#B6433A" strokeWidth="2.5" />
      <rect x="181" y="176" width="24" height="34" rx="2" fill="#EEF5E4" />
      <circle cx="193" cy="216" r="3" fill="#B6433A" />

      {/* ondas de señal animadas */}
      <g opacity="0.9">
        <path d="M218 178c8-8 8-20 0-28" stroke="#6FA032" strokeWidth="3" strokeLinecap="round">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
        </path>
        <path d="M228 186c14-14 14-36 0-50" stroke="#6FA032" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          <animate attributeName="opacity" values="0.1;0.7;0.1" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
        </path>
      </g>

      {/* tarjeta flotante de operación exitosa */}
      <g transform="translate(56,70)">
        <rect width="108" height="56" rx="12" fill="white" />
        <rect width="108" height="56" rx="12" fill="#B6433A" fillOpacity="0.04" />
        <circle cx="26" cy="28" r="14" fill="#EEF5E4" />
        <path d="M20 28l4 4 8-8" stroke="#5B8C2A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="48" y="18" width="46" height="7" rx="3.5" fill="#DADAD6" />
        <rect x="48" y="31" width="32" height="6" rx="3" fill="#B6433A" fillOpacity="0.55" />
        <animateTransform attributeName="transform" type="translate" values="56,70; 56,62; 56,70" dur="3.2s" repeatCount="indefinite" additive="sum" />
      </g>
    </svg>
  );
}

/* Escudo con candado — seguridad / conexión protegida, con pulso animado */
export function IllusSeguridad({ size = 320 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <circle cx="160" cy="160" r="150" fill="white" fillOpacity="0.06" />
      <circle cx="160" cy="160" r="98" fill="white" fillOpacity="0.05">
        <animate attributeName="r" values="94;104;94" dur="3s" repeatCount="indefinite" />
      </circle>

      <path d="M160 66l64 24v56c0 54-27 88-64 108-37-20-64-54-64-108v-56z" fill="white" fillOpacity="0.95" />
      <path d="M160 66l64 24v56c0 54-27 88-64 108-37-20-64-54-64-108v-56z" stroke="#5B8C2A" strokeWidth="2" fill="none" />

      <rect x="132" y="150" width="56" height="42" rx="8" fill="#B6433A" />
      <path d="M142 150v-14a18 18 0 0136 0v14" stroke="#B6433A" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="160" cy="168" r="6" fill="white" />
      <rect x="157" y="172" width="6" height="10" rx="3" fill="white" />

      <circle cx="160" cy="180" r="66" stroke="#6FA032" strokeWidth="2" fill="none" opacity="0.5">
        <animate attributeName="r" values="60;78;60" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0;0.55" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* Crecimiento / crédito — barras animadas creciendo + moneda */
export function IllusCrecimiento({ size = 320 }) {
  const bars = [
    { x: 92, h: 46, delay: "0s" },
    { x: 128, h: 74, delay: "0.15s" },
    { x: 164, h: 58, delay: "0.3s" },
    { x: 200, h: 96, delay: "0.45s" },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <circle cx="160" cy="160" r="150" fill="white" fillOpacity="0.06" />
      <line x1="70" y1="228" x2="250" y2="228" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />

      {bars.map((b, i) => (
        <rect key={i} x={b.x} width="24" rx="5" y={228 - b.h} height={b.h} fill={i % 2 === 0 ? "#B6433A" : "#6FA032"}>
          <animate attributeName="height" values={`0;${b.h};${b.h}`} dur="1.1s" begin={b.delay} fill="freeze" />
          <animate attributeName="y" values={`228;${228 - b.h};${228 - b.h}`} dur="1.1s" begin={b.delay} fill="freeze" />
        </rect>
      ))}

      <polyline points="92,190 128,158 164,178 200,120" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx="200" cy="120" r="5" fill="white" />

      <g transform="translate(210,60)">
        <circle r="26" fill="#F5C842" stroke="#E8B830" strokeWidth="2" />
        <text x="0" y="7" textAnchor="middle" fontSize="22" fontWeight="800" fill="#8a6a10">S/</text>
        <animateTransform attributeName="transform" type="translate" values="210,60; 210,48; 210,60" dur="3s" repeatCount="indefinite" additive="sum" />
      </g>
    </svg>
  );
}

/* Panel / tablero administrativo — para carrusel del panel admin */
export function IllusDashboardAdmin({ size = 320 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <circle cx="160" cy="160" r="150" fill="white" fillOpacity="0.06" />

      <rect x="70" y="86" width="180" height="132" rx="14" fill="white" fillOpacity="0.97" />
      <rect x="70" y="86" width="180" height="26" rx="14" fill="#3F5E1A" />
      <circle cx="86" cy="99" r="4" fill="#B6433A" />
      <circle cx="98" cy="99" r="4" fill="#F5C842" />
      <circle cx="110" cy="99" r="4" fill="#6FA032" />

      <g>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={90 + i * 20} y={190 - (i % 3) * 18 - 20} width="12" rx="3" height={(i % 3) * 18 + 20} fill={i % 2 === 0 ? "#A93333" : "#5B8C2A"}>
            <animate attributeName="height" values={`4;${(i % 3) * 18 + 20};${(i % 3) * 18 + 20}`} dur="1s" begin={`${i * 0.12}s`} fill="freeze" />
            <animate attributeName="y" values={`206;${190 - (i % 3) * 18 - 20};${190 - (i % 3) * 18 - 20}`} dur="1s" begin={`${i * 0.12}s`} fill="freeze" />
          </rect>
        ))}
      </g>

      <g transform="translate(206,150)">
        <circle r="26" fill="none" stroke="#EEE" strokeWidth="10" />
        <circle r="26" fill="none" stroke="#5B8C2A" strokeWidth="10" strokeDasharray="163" strokeDashoffset="163" strokeLinecap="round" transform="rotate(-90)">
          <animate attributeName="stroke-dashoffset" values="163;45" dur="1.4s" fill="freeze" />
        </circle>
      </g>

      <g transform="translate(224,96)">
        <circle r="4" fill="#6FA032">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

/* Equipo / gestión de roles — para carrusel del panel admin */
export function IllusEquipo({ size = 320 }) {
  const person = (cx, color, big) => (
    <g transform={`translate(${cx},${big ? 150 : 170})`}>
      <circle r={big ? 22 : 17} fill={color} fillOpacity="0.18" />
      <circle r={big ? 12 : 9} cy={big ? -6 : -5} fill={color} />
      <path d={big ? "M-16 24c2-16 8-24 16-24s14 8 16 24z" : "M-12 18c1.5-12 6-18 12-18s10.5 6 12 18z"} fill={color} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <circle cx="160" cy="160" r="150" fill="white" fillOpacity="0.06" />
      <rect x="60" y="210" width="200" height="2" fill="white" opacity="0.2" />
      {person(112, "#A93333", false)}
      {person(160, "#6FA032", true)}
      {person(208, "#F5C842", false)}

      <g transform="translate(160,104)">
        <rect x="-30" y="-14" width="60" height="24" rx="12" fill="white" />
        <text x="0" y="3" textAnchor="middle" fontSize="10" fontWeight="800" fill="#3F5E1A">ADMIN</text>
      </g>

      <path d="M112 190 Q136 205 160 190" stroke="white" strokeWidth="1.5" opacity="0.35" fill="none" />
      <path d="M208 190 Q184 205 160 190" stroke="white" strokeWidth="1.5" opacity="0.35" fill="none" />
    </svg>
  );
}
