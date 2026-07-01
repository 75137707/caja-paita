/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // navy/accent ahora apuntan a la paleta REAL de Caja Paita (rojo +
        // verde institucional) en vez de azul/naranja, para que toda la app
        // (login, dashboard, panel admin) sea consistente con cajapaita.pe.
        // Se conservan los nombres "navy"/"accent" para no romper las clases
        // ya usadas en decenas de componentes — solo cambian sus valores hex.
        navy: {
          900: "#3F5E1A",
          800: "#476815",
          700: "#557A22",
          600: "#5B8C2A",
          50: "#EEF5E4",
        },
        accent: {
          500: "#A93333",
          600: "#7A1F1F",
          50: "#FBEAEA",
        },
        ink: {
          900: "#1A2433",
          700: "#3B4555",
          400: "#7C8696",
        },
        success: {
          600: "#1E8E5A",
          50: "#E7F7EF",
        },
        danger: {
          600: "#C23B3B",
          50: "#FDECEC",
        },
        bg: "#F4F6F9",
        // Paleta de marca real de Caja Paita (rojo + verde), usada solo en
        // la landing pública (LandingPage.jsx) para ser fiel al sitio
        // institucional real. El resto de la app (login, dashboard, etc.)
        // sigue usando navy/accent — no se tocó para no romper consistencia.
        brandred: {
          900: "#7A1F1F",
          700: "#9C2A2A",
          600: "#A93333",
          500: "#B6433A",
          50: "#FBEAEA",
        },
        brandgreen: {
          900: "#3F5E1A",
          700: "#557A22",
          600: "#5B8C2A",
          500: "#6FA032",
          50: "#EEF5E4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 37, 69, 0.06), 0 4px 12px rgba(11, 37, 69, 0.06)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
}

