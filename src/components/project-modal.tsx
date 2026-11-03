"use client";

import React, { useEffect } from "react";
import { Project } from "@/data/profile";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Target, Wrench, UserCheck, Calendar, Sparkles } from "lucide-react";
import { WritingMachineVisual, DcMotorVisual } from "./project-visuals";

interface ProjectDetailsModalProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!project) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-details-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel w-full max-w-3xl rounded-2xl border border-primary/30 p-5 sm:p-7 relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] my-auto bg-[#0A0D18]/95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Cybernetic Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full pointer-events-none blur-2xl" />

          {/* Modal Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">
                  {"// PROJECT "}{project.projectNumber}
                </span>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <span
                  className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                    project.projectType === "Major Project"
                      ? "bg-primary/10 border-primary/30 text-cyan-300 shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}
                >
                  {project.projectType}
                </span>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} className="text-primary/70" />
                  {project.year}
                </span>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <span className="text-[11px] font-mono text-muted-foreground uppercase">
                  {project.category}
                </span>
              </div>

              <h3
                id="project-details-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
              >
                {project.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close project details"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/5 transition-all cursor-pointer shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Visual Blueprint / Schematic Container */}
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-inner h-48 sm:h-64">
              {project.slug === "automated-writing-machine" ? (
                <WritingMachineVisual className="w-full h-full" />
              ) : (
                <DcMotorVisual className="w-full h-full" />
              )}
            </div>

            {/* Project Overview */}
            <div className="glass-panel p-4 sm:p-5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
                <Sparkles size={14} className="text-cyan-400" />
                Project Overview
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {project.shortDescription}
              </p>
              {project.overview && project.overview !== project.shortDescription && (
                <p className="text-xs text-muted-foreground/90 leading-relaxed mt-2 pt-2 border-t border-white/5">
                  {project.overview}
                </p>
              )}
            </div>

            {/* Objective & Implementation Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Objective */}
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-start">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-300 mb-2">
                  <Target size={14} />
                  Core Objective
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {project.objective}
                </p>
              </div>

              {/* Implementation */}
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-start">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 mb-2">
                  <Wrench size={14} />
                  System Implementation
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {project.implementation}
                </p>
              </div>
            </div>

            {/* Key Contribution & Engineering Role */}
            <div className="glass-panel p-4 sm:p-5 rounded-xl border border-primary/20 bg-primary/[0.03]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
                <UserCheck size={14} />
                Technical Contribution &amp; Role
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {project.contribution}
              </p>
            </div>

            {/* Technologies Applied */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <Cpu size={14} className="text-primary" />
                Technologies &amp; Hardware Interfacing
              </div>
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs font-mono bg-primary/10 text-cyan-300 px-3 py-1.5 rounded-lg border border-primary/25 shadow-[0_0_10px_rgba(14,165,233,0.1)]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">
              Academic Project // Cooch Behar Govt. Engineering College
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
