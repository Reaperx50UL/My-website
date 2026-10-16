"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface BlackHoleCanvasProps {
  scrollProgress?: number; // 0 to 1 as user scrolls away from hero
  className?: string;
}

export function BlackHoleCanvas({
  scrollProgress = 0,
  className = "",
}: BlackHoleCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const onMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      window.removeEventListener("resize", checkViewport);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  // Robust autoplay initialization & playback guarantee
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion) return;

    // Enforce required DOM attributes for desktop & mobile browsers
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          // Autoplay policy deferred until user interaction
          console.debug("Video autoplay deferred:", err);
        });
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const video = videoRef.current;
    if (!video) return;

    // Immediate attempt on mount
    startPlayback();

    // Event listeners to ensure playback starts as soon as media buffer is ready
    const handleCanPlay = () => startPlayback();
    const handlePlaying = () => setIsPlaying(true);
    const handlePause = () => {
      if (scrollProgress < 1.0 && !prefersReducedMotion) {
        startPlayback();
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);

    // Fallback: If browser strictly gatekeeps until first user touch/scroll/click
    const onUserInteraction = () => {
      startPlayback();
      window.removeEventListener("scroll", onUserInteraction);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };

    window.addEventListener("scroll", onUserInteraction, { passive: true });
    window.addEventListener("pointerdown", onUserInteraction, { passive: true });
    window.addEventListener("touchstart", onUserInteraction, { passive: true });
    window.addEventListener("keydown", onUserInteraction, { passive: true });

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      window.removeEventListener("scroll", onUserInteraction);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, [startPlayback, prefersReducedMotion, scrollProgress]);

  // Pause video when scrolled completely out of hero to conserve GPU & battery
  useEffect(() => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion) return;

    if (scrollProgress >= 1.0) {
      if (!video.paused) {
        video.pause();
      }
    } else {
      if (video.paused) {
        startPlayback();
      }
    }
  }, [scrollProgress, prefersReducedMotion, startPlayback]);

  // Subtle cinematic parallax matching the live site
  const scale = 1.0 + Math.min(scrollProgress, 1.0) * 0.05;
  const translateY = -Math.min(scrollProgress, 1.0) * 30;

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* 1. Full 1920x1080 Hardware-Accelerated Looping Video */}
      {!prefersReducedMotion ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/images/backgrounds/black_hole_poster.jpg"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            objectPosition: isMobile ? "center 48%" : "54% 48%",
            transform: `scale(${scale}) translateY(${translateY}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <source src="/videos/black_hole.mp4" type="video/mp4" />
          <source src="/videos/black_hole.webm" type="video/webm" />
        </video>
      ) : (
        /* 2. Full 1920x1080 Static Fallback for reduced-motion */
        <img
          src="/images/backgrounds/black_hole_poster.jpg"
          alt="VOIDNOD Cosmic Black Hole"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            objectPosition: isMobile ? "center 48%" : "54% 48%",
          }}
        />
      )}

      {/* 3. Subtle Atmospheric Vignette & Contrast Overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#020617]/10 to-[#020617]/60 pointer-events-none" />
    </div>
  );
}
