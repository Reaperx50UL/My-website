"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface ScrollSequenceCanvasProps {
  progress: number; // 0.0 (top of #about) to 1.0 (bottom of #contact)
  className?: string;
}

const TOTAL_FRAMES = 80;

export function ScrollSequenceCanvas({
  progress = 0,
  className = "",
}: ScrollSequenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const [, setLoadedCount] = useState(0);
  const currentProgressRef = useRef(progress);
  const targetProgressRef = useRef(progress);
  const animationFrameRef = useRef<number>(0);

  targetProgressRef.current = Math.max(0, Math.min(1, progress));

  // Single-frame loader for 1080p master WebP frames
  const loadFrame = useCallback((index: number): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (imagesRef.current[index]) {
        resolve(imagesRef.current[index]!);
        return;
      }
      const img = new Image();
      const paddedIndex = String(index).padStart(3, "0");
      img.src = `/images/scroll_frames/frame_${paddedIndex}.webp`;
      img.onload = () => {
        imagesRef.current[index] = img;
        setLoadedCount((c) => c + 1);
        resolve(img);
      };
      img.onerror = reject;
    });
  }, []);

  // Progressive preloading: Instant frame 0, milestones, then clean background batching
  useEffect(() => {
    let isCancelled = false;

    // 1. Immediately load frame 0 for instant sharp render on load
    loadFrame(0).then(() => {
      if (isCancelled) return;

      const loadRemaining = async () => {
        // 2. Load key section milestones first
        // Frame 20 (~Skills), Frame 40 (~History), Frame 60 (~Projects), Frame 79 (~Contact)
        const milestones = [20, 40, 60, 79];
        for (const m of milestones) {
          if (isCancelled) return;
          await loadFrame(m).catch(() => {});
        }

        // 3. Progressively load intermediate frames in small batches
        for (let i = 1; i < TOTAL_FRAMES; i++) {
          if (isCancelled) return;
          if (!imagesRef.current[i]) {
            await loadFrame(i).catch(() => {});
            if (i % 4 === 0) {
              await new Promise((r) => setTimeout(r, 16));
            }
          }
        }
      };

      loadRemaining();
    });

    return () => {
      isCancelled = true;
    };
  }, [loadFrame]);

  // Full-native High-DPI canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Helper: draw image with precise aspect-ratio cover directly into the backing buffer
    const drawCover = (
      img: HTMLImageElement,
      targetW: number,
      targetH: number,
      alpha: number
    ) => {
      // 1920x1080 native aspect ratio 16:9
      const imgRatio = 16 / 9;
      const targetRatio = targetW / targetH;
      let renderW: number;
      let renderH: number;
      let offsetX: number;
      let offsetY: number;

      if (targetRatio > imgRatio) {
        renderW = targetW;
        renderH = targetW / imgRatio;
        offsetX = 0;
        offsetY = (targetH - renderH) / 2;
      } else {
        renderH = targetH;
        renderW = targetH * imgRatio;
        offsetX = (targetW - renderW) / 2;
        offsetY = 0;
      }

      ctx.globalAlpha = alpha;
      ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
    };

    // Helper: find nearest loaded frame to avoid any blank flashes during initial streaming
    const getNearestLoaded = (index: number): HTMLImageElement | null => {
      if (imagesRef.current[index]) return imagesRef.current[index];
      for (let r = 1; r < TOTAL_FRAMES; r++) {
        if (index - r >= 0 && imagesRef.current[index - r]) {
          return imagesRef.current[index - r];
        }
        if (index + r < TOTAL_FRAMES && imagesRef.current[index + r]) {
          return imagesRef.current[index + r];
        }
      }
      return imagesRef.current[0] || null;
    };

    // Exact 1:1 hardware pixel mapping with devicePixelRatio
    const resize = () => {
      if (!canvas) return;
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const bufferWidth = Math.round(displayWidth * dpr);
      const bufferHeight = Math.round(displayHeight * dpr);

      if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
      }
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
    };

    window.addEventListener("resize", resize);
    resize();

    const render = () => {
      if (!canvas || !ctx) return;

      // Smooth lerp progress for fluid bidirectional motion
      if (prefersReducedMotion) {
        currentProgressRef.current = targetProgressRef.current;
      } else {
        const diff = targetProgressRef.current - currentProgressRef.current;
        currentProgressRef.current += diff * 0.20;
      }

      const p = Math.max(0, Math.min(1, currentProgressRef.current));
      const exactIndex = p * (TOTAL_FRAMES - 1);
      const indexA = Math.floor(exactIndex);
      const indexB = Math.min(TOTAL_FRAMES - 1, indexA + 1);
      const blend = exactIndex - indexA;

      const imgA = getNearestLoaded(indexA);
      const imgB = getNearestLoaded(indexB) || imgA;

      const w = canvas.width;
      const h = canvas.height;

      // Maximum bicubic filtering on canvas
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (imgA) {
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, w, h);

        drawCover(imgA, w, h, 1.0);

        // Sub-frame optical cross-fade
        if (blend > 0.01 && imgB && imgB !== imgA) {
          drawCover(imgB, w, h, blend);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
      />
    </div>
  );
}
