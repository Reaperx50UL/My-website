"use client";

import { useRef } from "react";
import { profileData } from "@/data/profile";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Download, Mail } from "lucide-react";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Smooth scroll-driven parallax for hero content without scroll hijacking
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[92vh] flex flex-col justify-center pt-24 pb-16 overflow-visible"
    >
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="max-w-3xl relative z-10"
      >
        {/* 1. Staged Entrance: Status Badge */}
        {profileData.status && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs sm:text-sm font-medium mb-6 shadow-[0_0_20px_rgba(14,165,233,0.15)] backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {profileData.status}
          </motion.div>
        )}

        {/* 2. Staged Entrance: Name Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] break-words"
        >
          Hi, I&apos;m{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-primary to-blue-600 drop-shadow-[0_0_25px_rgba(14,165,233,0.35)]">
            {profileData.name}
          </span>
          .
        </motion.h1>

        {/* 3. Staged Entrance: Title */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-2xl md:text-3xl text-foreground/90 mb-4 font-light tracking-wide break-words"
        >
          {profileData.title}
        </motion.p>

        {/* 4. Staged Entrance: Short Bio */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm sm:text-base md:text-lg text-muted-foreground/90 mb-8 sm:mb-10 max-w-2xl leading-relaxed"
        >
          {profileData.shortBio}
        </motion.p>

        {/* 5. Staged Entrance: CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto"
        >
          <Link
            href="#projects"
            className="group min-h-[44px] inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-lg font-medium transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(14,165,233,0.45)] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            View My Projects
            <ChevronRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>

          <Link
            href={profileData.resumePath}
            target="_blank"
            className="group min-h-[44px] inline-flex items-center justify-center gap-2 bg-secondary/80 text-secondary-foreground px-6 py-3.5 rounded-lg font-medium transition-all hover:bg-secondary hover:border-primary/40 border border-white/10 hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Download Resume
            <Download size={18} />
          </Link>

          <Link
            href="#contact"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Mail size={18} />
            Contact Me
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
