"use client";
import React, { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollY } = useScroll();
  const [windowHeight, setWindowHeight] = useState(1000);

  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Scroll Transformations for Images ---
  // We estimate section heights based on viewport height (vh).
  // Hero: 0-100vh
  const heroOpacity = useTransform(scrollY, [0, windowHeight], [1, 0]);
  const heroScale = useTransform(scrollY, [0, windowHeight], [1, 1.1]);
  
  // About / Timeline: 100vh-250vh
  const digitalOpacity = useTransform(scrollY, [windowHeight * 0.5, windowHeight * 1.2, windowHeight * 2.5], [0, 1, 0]);
  const digitalScale = useTransform(scrollY, [windowHeight * 0.5, windowHeight * 2.5], [1, 1.1]);

  // Skills / Network: 250vh-400vh
  const networkOpacity = useTransform(scrollY, [windowHeight * 2, windowHeight * 2.8, windowHeight * 4], [0, 1, 0]);
  const networkScale = useTransform(scrollY, [windowHeight * 2, windowHeight * 4], [1, 1.1]);

  // Projects / Web Lab: 400vh-600vh
  const orbitalOpacity = useTransform(scrollY, [windowHeight * 3.5, windowHeight * 4.5, windowHeight * 6], [0, 1, 0]);
  const orbitalScale = useTransform(scrollY, [windowHeight * 3.5, windowHeight * 6], [1, 1.1]);

  // Contact / Footer: 600vh+
  const signalOpacity = useTransform(scrollY, [windowHeight * 5.5, windowHeight * 6.5], [0, 1]);
  const signalScale = useTransform(scrollY, [windowHeight * 5.5, windowHeight * 7], [1, 1.1]);

  // --- Canvas Particle Animation ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true }); // Enable alpha for transparency over images
    if (!ctx) return;
    
    let width = 0;
    let height = 0;
    let animationFrameId = 0;
    
    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetTiltX = 60 * (Math.PI / 180); 
    let targetTiltY = 0;
    let currentTiltX = targetTiltX;
    let currentTiltY = targetTiltY;
    
    // Particles
    const numParticles = typeof window !== 'undefined' && window.innerWidth < 768 ? 1200 : 3000;
    const particles: Particle[] = [];
    
    class Particle {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      color: string;
      yOffset: number;
      
      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        const eventHorizon = 90;
        const diskRadius = 600;
        
        const rDist = Math.pow(Math.random(), 2.5);
        this.radius = eventHorizon + rDist * (diskRadius - eventHorizon);
        
        this.speed = (0.015 * eventHorizon) / this.radius + 0.001;
        
        this.size = Math.random() * 1.5 + 0.5;
        if (Math.random() > 0.98) this.size *= 2; 
        
        const thickness = (this.radius / diskRadius) * 30 + 5;
        this.yOffset = (Math.random() - 0.5) * thickness;
        
        const colors = [
          "rgba(14, 165, 233, OPACITY)", // Cyan
          "rgba(139, 92, 246, OPACITY)", // Violet
          "rgba(255, 255, 255, OPACITY)", // White
        ];
        
        const rand = Math.random();
        if (rand < 0.6) this.color = colors[0];
        else if (rand < 0.9) this.color = colors[1];
        else this.color = colors[2];
      }
      
      update() {
        this.angle -= this.speed; 
      }
    }
    
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }
    
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener("resize", resize);
    resize();
    
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / width) * 2 - 1;
      mouseY = (e.clientY / height) * 2 - 1;
      targetTiltY = mouseX * 0.15;
      targetTiltX = (60 * (Math.PI / 180)) + (mouseY * 0.1);
    };
    
    window.addEventListener("mousemove", onMouseMove);
    
    const cameraZ = 600;
    
    const render = () => {
      currentTiltX += (targetTiltX - currentTiltX) * 0.05;
      currentTiltY += (targetTiltY - currentTiltY) * 0.05;
      
      // Clear canvas with transparent dark trail
      ctx.fillStyle = "rgba(2, 6, 23, 0.3)"; // Deep midnight blue base
      ctx.fillRect(0, 0, width, height);
      
      const cx = width / 2;
      const cy = height / 2;
      
      const projected = [];
      const sinX = Math.sin(currentTiltX);
      const cosX = Math.cos(currentTiltX);
      const sinY = Math.sin(currentTiltY);
      const cosY = Math.cos(currentTiltY);
      
      for (let i = 0; i < numParticles; i++) {
        const p = particles[i];
        p.update();
        
        const x3d = p.radius * Math.cos(p.angle);
        const z3d = p.radius * Math.sin(p.angle);
        const y3d = p.yOffset;
        
        const x1 = x3d * cosY - z3d * sinY;
        const z1 = x3d * sinY + z3d * cosY;
        const y1 = y3d;
        
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;
        
        const scale = cameraZ / (cameraZ + z2);
        const xProj = cx + x2 * scale;
        const yProj = cy + y2 * scale;
        
        let opacity = Math.min(1, Math.max(0.1, scale * 1.5 - 0.5));
        
        const eventHorizon = 90;
        if (p.radius < eventHorizon + 20) {
          opacity *= (p.radius - eventHorizon) / 20;
        }
        
        projected.push({
          x: xProj,
          y: yProj,
          z: z2,
          size: p.size * scale,
          color: p.color.replace("OPACITY", opacity.toFixed(2))
        });
      }
      
      projected.sort((a, b) => b.z - a.z);
      
      let voidDrawn = false;
      
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        
        if (!voidDrawn && p.z < 0) {
          const voidScale = cameraZ / cameraZ;
          const voidRadius = 88 * voidScale;
          
          const gradient = ctx.createRadialGradient(cx, cy, voidRadius * 0.8, cx, cy, voidRadius * 1.8);
          gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
          gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.9)");
          gradient.addColorStop(0.8, "rgba(14, 165, 233, 0.15)");
          gradient.addColorStop(1, "rgba(14, 165, 233, 0)");
          
          ctx.beginPath();
          ctx.arc(cx, cy, voidRadius * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(cx, cy, voidRadius * 0.95, 0, Math.PI * 2);
          ctx.fillStyle = "#000000";
          ctx.fill();
          
          voidDrawn = true;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      
      if (!voidDrawn) {
         ctx.beginPath();
         ctx.arc(cx, cy, 88, 0, Math.PI * 2);
         ctx.fillStyle = "#000000";
         ctx.fill();
      }
      
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-2] bg-[#020617] overflow-hidden pointer-events-none">
      
      {/* Background Images with Scroll Parallax & Crossfade */}
      <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="absolute inset-0 origin-center">
        <img src="/images/backgrounds/cinematic_black_hole.jpg" className="w-full h-full object-cover opacity-60" alt="" />
      </motion.div>
      
      <motion.div style={{ opacity: digitalOpacity, scale: digitalScale }} className="absolute inset-0 origin-center">
        <img src="/images/backgrounds/digital_universe.jpg" className="w-full h-full object-cover opacity-50 mix-blend-screen" alt="" />
      </motion.div>
      
      <motion.div style={{ opacity: networkOpacity, scale: networkScale }} className="absolute inset-0 origin-center">
        <img src="/images/backgrounds/tech_network.jpg" className="w-full h-full object-cover opacity-50 mix-blend-screen" alt="" />
      </motion.div>
      
      <motion.div style={{ opacity: orbitalOpacity, scale: orbitalScale }} className="absolute inset-0 origin-center">
        <img src="/images/backgrounds/orbital_lab.jpg" className="w-full h-full object-cover opacity-40 mix-blend-screen" alt="" />
      </motion.div>
      
      <motion.div style={{ opacity: signalOpacity, scale: signalScale }} className="absolute inset-0 origin-center">
        <img src="/images/backgrounds/signal_connection.jpg" className="w-full h-full object-cover opacity-50 mix-blend-screen" alt="" />
      </motion.div>

      {/* Global Contrast Overlay for Readability */}
      <div className="absolute inset-0 bg-background/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(2,6,23,0.8)_80%,rgba(2,6,23,1)_100%)] z-10" />

      {/* Canvas Layer: Only highly visible in the Hero section */}
      <motion.div style={{ opacity: heroOpacity }} className="absolute inset-0 mix-blend-screen z-20">
        <canvas 
          ref={canvasRef} 
          className="block w-full h-full object-cover"
          style={{
            filter: "contrast(1.2) brightness(1.2) drop-shadow(0 0 15px rgba(14,165,233,0.3))"
          }}
        />
      </motion.div>

    </div>
  );
}
