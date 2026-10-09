"use client";
import React, { useEffect, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export function WebLabBackground() {
  const { scrollY } = useScroll();
  const [windowHeight, setWindowHeight] = useState(1000);

  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Map scroll position to different opacities for the images
  const heroOpacity = useTransform(scrollY, [0, windowHeight * 0.8], [0.8, 0]);
  const heroScale = useTransform(scrollY, [0, windowHeight], [1, 1.05]);
  
  const workspaceOpacity = useTransform(scrollY, [windowHeight * 0.4, windowHeight * 1.5, windowHeight * 3], [0, 0.4, 0]);
  const workspaceScale = useTransform(scrollY, [windowHeight * 0.4, windowHeight * 3], [1, 1.05]);

  const bottomOpacity = useTransform(scrollY, [windowHeight * 2, windowHeight * 4], [0, 0.6]);
  
  return (
    <div className="fixed inset-0 z-[-2] bg-[#020617] overflow-hidden pointer-events-none">
      <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="absolute inset-0 origin-top">
        <img src="/images/backgrounds/web_lab_hero.jpg" className="w-full h-full object-cover" alt="" />
      </motion.div>
      
      <motion.div style={{ opacity: workspaceOpacity, scale: workspaceScale }} className="absolute inset-0 origin-center mix-blend-screen">
        <img src="/images/backgrounds/orbital_lab.jpg" className="w-full h-full object-cover" alt="" />
      </motion.div>

      <motion.div style={{ opacity: bottomOpacity }} className="absolute inset-0 origin-bottom mix-blend-screen">
        <img src="/images/backgrounds/digital_universe.jpg" className="w-full h-full object-cover" alt="" />
      </motion.div>

      {/* Global Contrast Overlays */}
      <div className="absolute inset-0 bg-background/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(2,6,23,0.8)_80%,rgba(2,6,23,1)_100%)] z-10" />
    </div>
  );
}
