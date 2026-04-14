"use client";

import { useState, useEffect, useRef } from "react";
import { getBanners, urlFor } from "@/lib/sanity";

const FALLBACK_BANNERS = [
  {
    _id: "fallback-1",
    tag: "BIENVENIDO",
    titulo: "Hecatombe Coleccionables",
    subtitulo: "Funkos, figuras y cultura pop en Querétaro",
    cta: "Ver Catálogo",
    href: "/catalogo",
    imagen: null,
  },
];

const DURATION = 4500;
const TICK = 50;

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const timerRef = useRef(null);
  const progRef = useRef(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    getBanners()
      .then((data) => {
        setBanners(data?.length ? data : FALLBACK_BANNERS);
      })
      .catch(() => setBanners(FALLBACK_BANNERS))
      .finally(() => setLoaded(true));
  }, []);

  const startCycle = () => {
    clearInterval(timerRef.current);
    clearInterval(progRef.current);
    elapsedRef.current = 0;
    setProgress(0);

    progRef.current = setInterval(() => {
      elapsedRef.current += TICK;
      setProgress(Math.min((elapsedRef.current / DURATION) * 100, 100));
    }, TICK);

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, DURATION);
  };

  useEffect(() => {
    if (!banners.length) return;
    startCycle();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(progRef.current);
    };
  }, [current, banners]);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    clearInterval(progRef.current);
    setCurrent(i);
  };

  if (!loaded) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ height: "340px", background: "#111" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const banner = banners[current];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "340px" }}>

      {/* Slides con imagen de fondo */}
      {banners.map((b, i) => {
        const url = b.imagen ? urlFor(b.imagen).width(1400).quality(85).url() : null;
        return (
          <div
            key={b._id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
          >
            {url ? (
              <img
                src={url}
                alt={b.titulo}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full" style={{ background: "#111" }} />
            )}
            {/* Overlay para legibilidad del texto */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)",
              }}
            />
          </div>
        );
      })}

      {/* Grid naranja sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Contenido */}
      <div
        className="relative h-full flex flex-col justify-center px-8 md:px-20 max-w-3xl"
        style={{ zIndex: 3 }}
      >
        <div
          key={`tag-${current}`}
          className="mb-4"
          style={{ animation: "hcFadeUp 0.45s cubic-bezier(.22,1,.36,1) both", animationDelay: "0ms" }}
        >
          <span
            className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border"
            style={{
              color: "#f97316",
              borderColor: "rgba(249,115,22,0.4)",
              background: "rgba(249,115,22,0.1)",
            }}
          >
            {banner.tag}
          </span>
        </div>

        <h2
          key={`titulo-${current}`}
          className="font-black uppercase text-white leading-none mb-3"
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            animation: "hcFadeUp 0.45s cubic-bezier(.22,1,.36,1) both",
            animationDelay: "80ms",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          {banner.titulo}
        </h2>

        {banner.subtitulo && (
          <p
            key={`sub-${current}`}
            className="text-gray-200 mb-6 max-w-md leading-relaxed"
            style={{
              animation: "hcFadeUp 0.45s cubic-bezier(.22,1,.36,1) both",
              animationDelay: "160ms",
              fontSize: "0.95rem",
              textShadow: "0 1px 8px rgba(0,0,0,0.6)",
            }}
          >
            {banner.subtitulo}
          </p>
        )}

        {banner.cta && banner.href && (
          <div
            key={`cta-${current}`}
            style={{
              animation: "hcFadeUp 0.45s cubic-bezier(.22,1,.36,1) both",
              animationDelay: "240ms",
            }}
          >
            <a
              href={banner.href}
              className="inline-flex items-center gap-2 font-black uppercase text-sm px-6 py-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "#f97316", color: "#000" }}
            >
              {banner.cta}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Dots con progreso */}
      <div className="absolute bottom-5 left-8 md:left-20 flex items-center gap-3" style={{ zIndex: 4 }}>
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="relative overflow-hidden rounded-full transition-all duration-300"
            style={{
              width: i === current ? "40px" : "8px",
              height: "8px",
              background: i === current ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.3)",
              border: i === current ? "1px solid rgba(249,115,22,0.6)" : "none",
            }}
            aria-label={`Ir al banner ${i + 1}`}
          >
            {i === current && (
              <span
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "#f97316",
                  transition: `width ${TICK}ms linear`,
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Contador */}
      <div
        className="absolute bottom-5 right-8 md:right-20 font-black text-xs tabular-nums"
        style={{ zIndex: 4, color: "rgba(249,115,22,0.5)" }}
      >
        {String(current + 1).padStart(2, "0")} / {String(banners.length).padStart(2, "0")}
      </div>

      <style>{`
        @keyframes hcFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
