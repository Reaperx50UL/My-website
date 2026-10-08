"use client";
import { portfolioData } from "@/data/portfolio";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Download, Mail } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center pt-20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none z-[-1]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          System Online
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Hi, I&apos;m <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">{portfolioData.personalInfo.name}</span>.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-light">
          {portfolioData.personalInfo.title}
        </p>
        
        <p className="text-lg text-muted-foreground/80 mb-10 max-w-2xl">
          {portfolioData.personalInfo.shortBio}
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="#projects" 
            className="group flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium transition-all hover:glow-primary-hover hover:bg-primary/90"
          >
            Explore My Work
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link 
            href={portfolioData.personalInfo.resumeUrl}
            target="_blank"
            className="group flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-medium transition-all hover:bg-secondary/80 border border-white/5"
          >
            Download Resume
            <Download size={18} />
          </Link>
          
          <Link 
            href="#contact" 
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail size={18} />
            Contact Me
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
