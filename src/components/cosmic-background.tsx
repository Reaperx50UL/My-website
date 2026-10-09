"use client";
import React, { useEffect, useRef } from "react";

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    
    let width = 0;
    let height = 0;
    let animationFrameId = 0;
    
    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetTiltX = 65 * (Math.PI / 180); // Base tilt
    let targetTiltY = 0;
    let currentTiltX = targetTiltX;
    let currentTiltY = targetTiltY;
    
    // Particles
    const numParticles = typeof window !== 'undefined' && window.innerWidth < 768 ? 1500 : 3500;
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
        // Distribute particles mainly in a disk, denser closer to the center (but outside event horizon)
        const eventHorizon = 80;
        const diskRadius = 450;
        
        // Use a power function to clump particles near the event horizon
        const rDist = Math.pow(Math.random(), 2);
        this.radius = eventHorizon + rDist * (diskRadius - eventHorizon);
        
        // Speed depends on radius (Kepler-like: slower further out)
        this.speed = (0.015 * eventHorizon) / this.radius + 0.002;
        
        // Size variation
        this.size = Math.random() * 1.5 + 0.5;
        if (Math.random() > 0.98) this.size *= 2.5; // Occasional bright stars
        
        // Vertical thickness (thicker further out, or thicker near the center?)
        // Let's make it an accretion disk that flares out slightly, plus some random noise
        const thickness = (this.radius / diskRadius) * 20 + 5;
        this.yOffset = (Math.random() - 0.5) * thickness;
        
        // Colors
        const colors = [
          "rgba(14, 165, 233, OPACITY)", // Cyan
          "rgba(59, 130, 246, OPACITY)", // Blue
          "rgba(139, 92, 246, OPACITY)", // Violet
          "rgba(255, 255, 255, OPACITY)", // White
        ];
        
        const rand = Math.random();
        if (rand < 0.4) this.color = colors[0];
        else if (rand < 0.7) this.color = colors[1];
        else if (rand < 0.9) this.color = colors[2];
        else this.color = colors[3];
      }
      
      update() {
        this.angle -= this.speed; // Rotate clockwise
      }
    }
    
    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }
    
    const resize = () => {
      // Create a full-screen effect that breaks out of any container
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener("resize", resize);
    resize();
    
    const onMouseMove = (e: MouseEvent) => {
      // Normalize mouse to -1 to 1
      mouseX = (e.clientX / width) * 2 - 1;
      mouseY = (e.clientY / height) * 2 - 1;
      
      // Update target tilts based on mouse
      targetTiltY = mouseX * 0.15;
      targetTiltX = (65 * (Math.PI / 180)) + (mouseY * 0.1);
    };
    
    window.addEventListener("mousemove", onMouseMove);
    
    // Pre-calculate fixed values
    const cameraZ = 600;
    
    const render = () => {
      // Smoothly interpolate tilt
      currentTiltX += (targetTiltX - currentTiltX) * 0.05;
      currentTiltY += (targetTiltY - currentTiltY) * 0.05;
      
      // Dark background with slight trail effect for cinematic motion blur
      ctx.fillStyle = "rgba(5, 5, 5, 0.3)";
      ctx.fillRect(0, 0, width, height);
      
      const cx = width / 2;
      const cy = height / 2;
      
      // We will project particles to 2D
      // To properly layer the black hole over the back half of the disk, we need to sort or split rendering
      
      // Instead of sorting all particles (heavy), we can divide them into two arrays each frame, or just calculate projected Z
      // Actually, since this is a continuous render loop, sorting ~3000 objects in JS takes < 1ms, it's very fast!
      
      const projected = [];
      
      const sinX = Math.sin(currentTiltX);
      const cosX = Math.cos(currentTiltX);
      const sinY = Math.sin(currentTiltY);
      const cosY = Math.cos(currentTiltY);
      
      for (let i = 0; i < numParticles; i++) {
        const p = particles[i];
        p.update();
        
        // 3D coordinates (Y is up in 3D space usually, but here Y is vertical offset)
        const x3d = p.radius * Math.cos(p.angle);
        const z3d = p.radius * Math.sin(p.angle);
        const y3d = p.yOffset;
        
        // Rotate around Y axis (mouse X)
        const x1 = x3d * cosY - z3d * sinY;
        const z1 = x3d * sinY + z3d * cosY;
        const y1 = y3d;
        
        // Rotate around X axis (disk tilt + mouse Y)
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;
        
        // Project to 2D
        const scale = cameraZ / (cameraZ + z2);
        const xProj = cx + x2 * scale;
        const yProj = cy + y2 * scale;
        
        // Fade out particles far away or far outside
        let opacity = Math.min(1, Math.max(0.1, scale * 1.5 - 0.5));
        
        // Fade particles near the event horizon to create a smooth transition
        const eventHorizon = 80;
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
      
      // Sort by Z index (painters algorithm)
      projected.sort((a, b) => b.z - a.z);
      
      // Draw background particles (z > 0 roughly, but we can just find the split point)
      // Actually, sorting handles the layering perfectly!
      // But we need to draw the Black Hole void in the middle of the stack.
      // The void is at Z = 0.
      
      let voidDrawn = false;
      
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        
        if (!voidDrawn && p.z < 0) {
          // Draw the Black Hole
          // Calculate scale for the void at Z = 0
          const voidScale = cameraZ / cameraZ;
          const voidRadius = 78 * voidScale; // Slightly smaller than event horizon
          
          // Outer glow/photon ring
          const gradient = ctx.createRadialGradient(cx, cy, voidRadius * 0.8, cx, cy, voidRadius * 1.5);
          gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
          gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.8)");
          gradient.addColorStop(0.8, "rgba(14, 165, 233, 0.2)");
          gradient.addColorStop(1, "rgba(14, 165, 233, 0)");
          
          ctx.beginPath();
          ctx.arc(cx, cy, voidRadius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Absolute dark core
          ctx.beginPath();
          ctx.arc(cx, cy, voidRadius * 0.95, 0, Math.PI * 2);
          ctx.fillStyle = "#020202";
          ctx.fill();
          
          voidDrawn = true;
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      
      if (!voidDrawn) {
         ctx.beginPath();
         ctx.arc(cx, cy, 78, 0, Math.PI * 2);
         ctx.fillStyle = "#020202";
         ctx.fill();
      }
      
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    
    // Initial render
    render();
    
    // If reduced motion is true, rendering once is enough
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] z-[-1] overflow-hidden pointer-events-none">
      {/* Subtle radial gradient overlay to ensure text readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_80%,rgba(0,0,0,1)_100%)] z-10" />
      
      {/* Top fade for navbar */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent z-10" />
      
      {/* Bottom fade for smooth transition to next section */}
      <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background to-transparent z-10" />
      
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full object-cover"
        style={{
          // Use CSS filter to enhance cinematic glow without WebGL post-processing
          filter: "contrast(1.2) brightness(1.1) drop-shadow(0 0 10px rgba(14,165,233,0.3))"
        }}
      />
    </div>
  );
}
