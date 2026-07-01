import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Carrusel genérico con autoplay, flechas y puntos de navegación.
 * `slides` es un arreglo de nodos React (uno por slide).
 * Se pausa el autoplay al pasar el mouse por encima.
 */
export default function Carousel({ slides, interval = 5000, className = "" }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [paused, slides.length, interval]);

  const go = (i) => setIndex((i + slides.length) % slides.length);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="transition-opacity duration-700 ease-in-out"
            style={{
              opacity: i === index ? 1 : 0,
              position: i === index ? "relative" : "absolute",
              inset: 0,
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <div className="flex items-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 28 : 8,
                  background: i === index ? "white" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Anterior"
            className="hidden lg:flex items-center justify-center absolute -left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Siguiente"
            className="hidden lg:flex items-center justify-center absolute -right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}
