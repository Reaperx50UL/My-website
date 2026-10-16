"use client";

import React, { useEffect, useState, useRef } from "react";
import { useScroll, motion, useMotionValue } from "framer-motion";
import { BlackHoleCanvas } from "@/components/black-hole-canvas";
import { ScrollSequenceCanvas } from "@/components/scroll-sequence-canvas";

export function CosmicBackground() {
  const { scrollY } = useScroll();
  const [scrollNorm, setScrollNorm] = useState(0);
  const [sequenceProgress, setSequenceProgress] = useState(0);

  // Motion values for smooth layer cross-fading
  const heroOpacity = useMotionValue(1);
  const scrollOpacity = useMotionValue(0);

  // Dynamic section positions tracking
  const sectionPositions = useRef({
    about: 800,
    skills: 1600,
    history: 2400,
    projects: 3200,
    contact: 4200,
  });

  useEffect(() => {
    const updatePositions = () => {
      const getTop = (id: string, fallback: number) => {
        const el = document.getElementById(id);
        if (!el) return fallback;
        const rect = el.getBoundingClientRect();
        return window.scrollY + rect.top;
      };

      const wh = window.innerHeight;
      const about = getTop("about", wh);
      const skills = getTop("skills", about + wh);
      const history = getTop("history", skills + wh);
      const projects = getTop("projects", history + wh);
      const contact = getTop("contact", projects + wh);

      sectionPositions.current = { about, skills, history, projects, contact };
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);

    // Smooth hermite interpolation helper
    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    const unsubscribe = scrollY.on("change", (latest) => {
      const { about, skills, history, projects, contact } = sectionPositions.current;

      // 1. Hero Black Hole: 1.0 at top, fades out smoothly as About section arrives
      const norm = latest / Math.max(1, about);
      setScrollNorm(norm);

      const heroFade = 1.0 - smoothstep(about * 0.25, about * 0.85, latest);
      heroOpacity.set(heroFade);

      // 2. Scroll Sequence: Fades in as About approaches, stays full across content sections
      const seqFade = smoothstep(about * 0.35, about * 0.85, latest);
      scrollOpacity.set(seqFade);

      // 3. Piecewise progression mapping directly through content journey
      let p = 0;
      if (latest <= about) {
        // Hero to About transition: holds at start of sequence (circuit traces)
        p = 0.0;
      } else if (latest <= skills) {
        // About -> Skills: 0.0 to 0.25 (circuit traces flow into glowing streams)
        const factor = (latest - about) / Math.max(1, skills - about);
        p = factor * 0.25;
      } else if (latest <= history) {
        // Skills -> History: 0.25 to 0.50 (network nodes and streaming light ribbons)
        const factor = (latest - skills) / Math.max(1, history - skills);
        p = 0.25 + factor * 0.25;
      } else if (latest <= projects) {
        // History -> Projects: 0.50 to 0.75 (quantum atomic structures & planetary orbits)
        const factor = (latest - history) / Math.max(1, projects - history);
        p = 0.50 + factor * 0.25;
      } else {
        // Projects -> Contact: 0.75 to 1.00 (holographic laboratory core & displays)
        const factor = Math.min(1.0, (latest - projects) / Math.max(1, contact - projects));
        p = 0.75 + factor * 0.25;
      }

      setSequenceProgress(p);
    });

    return () => {
      window.removeEventListener("resize", updatePositions);
      unsubscribe();
    };
  }, [scrollY, heroOpacity, scrollOpacity]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[-2] bg-[#020617] overflow-hidden pointer-events-none select-none"
    >
      {/* 1. Hero: Relativistic Black Hole Animation (Faithful 300-frame reference video) */}
      <motion.div
        style={{ opacity: heroOpacity }}
        className="absolute inset-0 z-10"
      >
        <BlackHoleCanvas scrollProgress={scrollNorm} />
      </motion.div>

      {/* 2. Scroll Sequence: Fluid 75-frame canvas player advancing through reference journey */}
      <motion.div
        style={{ opacity: scrollOpacity }}
        className="absolute inset-0 z-10"
      >
        <ScrollSequenceCanvas progress={sequenceProgress} />
      </motion.div>

      {/* 3. Contrast Overlays:
          Soft peripheral vignette and subtle linear gradient that preserve background brilliance 
          while keeping text 100% crisp, readable, and accessible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.0)_20%,rgba(2,6,23,0.40)_65%,rgba(2,6,23,0.90)_100%)] z-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/15 to-[#020617]/75 z-20 pointer-events-none" />
    </div>
  );
}
