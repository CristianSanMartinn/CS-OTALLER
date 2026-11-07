"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Cog, Wrench } from "lucide-react";
import styles from "./LoginHero.module.css";

const slides = [
  {
    image: "/images/login/taller.jpg",
    title: "Todo tu taller,",
    accent: "en un solo lugar.",
    description:
      "Clientes, vehículos y trabajos. Conectados, de principio a fin.",
  },
  {
    image: "/images/login/diagnostico.jpg",
    title: "Cada detalle cuenta.",
    accent: "Tenlo bajo control.",
    description:
      "Organiza cada trabajo y acompaña a tu equipo en cada reparación.",
  },
  {
    image: "/images/login/servicio.jpg",
    title: "Más confianza,",
    accent: "en cada entrega.",
    description: "Un historial claro para ti. Tranquilidad para tus clientes.",
  },
];

export function LoginHero() {
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const paused = reducedMotion || hovered || focused || hidden;
  return (
    <section
      className={styles.hero}
      aria-label="Conoce C.S.OTALLER"
      aria-roledescription="carrusel"
      data-paused={paused}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={(event) => {
        if (event.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.image}
          className={`${styles.slide} ${index === active ? styles.active : ""}`}
          aria-hidden={index !== active}
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${index + 1} de ${slides.length}`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 55vw"
            priority={index === 0}
            className={styles.photo}
          />
        </div>
      ))}
      <div className={styles.shade} />
      <div className={styles.content}>
        <a
          href="/login"
          className={styles.brand}
          aria-label="C.S.OTALLER, inicio de sesión"
        >
          <span className={styles.mark} aria-hidden="true">
            <Cog />
            <Wrench />
          </span>
          <span>
            <strong>C.S.OTALLER</strong>
            <small>
              SISTEMA DE GESTIÓN
              <br />
              PARA TALLERES
            </small>
          </span>
        </a>
        <div
          className={styles.message}
          aria-live={paused ? "polite" : "off"}
          aria-atomic="true"
        >
          <span className={styles.eyebrow}>TU TALLER, SIEMPRE CONECTADO</span>
          <h1>
            {slides[active].title}
            <br />
            <span>{slides[active].accent}</span>
          </h1>
          <p>{slides[active].description}</p>
        </div>
        <div className={styles.progressNav} aria-label="Seleccionar imagen">
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              aria-label={`Ver imagen ${index + 1}`}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              <span className={styles.progressTrack}>
                <span
                  key={`${active}-${index}`}
                  className={styles.progressFill}
                  onAnimationEnd={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      index === active &&
                      !paused
                    )
                      setActive((current) => (current + 1) % slides.length);
                  }}
                />
              </span>
            </button>
          ))}
        </div>
        <small className={styles.caption}>
          Menos administración. Más tiempo para tu taller.
        </small>
      </div>
    </section>
  );
}
