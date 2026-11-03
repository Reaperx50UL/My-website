"use client";

import { useState } from "react";
import { projectsData, Project } from "@/data/profile";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Cpu, Calendar, Info, Layers, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WritingMachineVisual, DcMotorVisual } from "./project-visuals";
import { ProjectDetailsModal } from "./project-modal";

const categories = ["All", "Web", "Python", "Cybersecurity", "Electronics", "Other"];

export function ProjectsSection() {
  const [filter, setFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = projectsData.filter((project) =>
    filter === "All" ? true : project.category === filter
  );

  return (
    <section id="projects" className="py-16 sm:py-24 relative scroll-mt-20 sm:scroll-mt-24">
      {/* Header and Category Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Showcase // Work
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Featured Projects
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-cyan-400 rounded-full mb-4 shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
            Practical engineering projects in embedded systems, microprocessors, automation, and hardware interfacing.
          </p>
        </motion.div>

        {/* Category Filters with animated active pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap gap-2 relative z-10"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={cn(
                "relative px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
                filter === cat
                  ? "text-primary-foreground shadow-[0_0_15px_rgba(14,165,233,0.35)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 bg-secondary/30 border border-white/5"
              )}
            >
              {filter === cat && (
                <motion.span
                  layoutId="activeFilterPill"
                  className="absolute inset-0 bg-primary rounded-full z-[-1]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {cat}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Projects Display Area */}
      {filteredProjects.length > 0 ? (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, idx) => (
              <motion.article
                key={project.slug}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "glass-panel rounded-2xl overflow-hidden group flex flex-col lg:grid lg:grid-cols-12 gap-0 border transition-all duration-300 backdrop-blur-md hover:-translate-y-1 relative",
                  project.featured
                    ? "border-primary/30 hover:border-primary/60 hover:shadow-[0_12px_40px_-8px_rgba(14,165,233,0.25)]"
                    : "border-white/5 hover:border-primary/40 hover:shadow-[0_10px_35px_-8px_rgba(14,165,233,0.18)]"
                )}
              >
                {/* Visual Technical Schematic Column */}
                <div className="lg:col-span-7 h-64 sm:h-80 lg:h-auto min-h-[260px] relative border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden bg-[#070B14]">
                  {project.slug === "automated-writing-machine" ? (
                    <WritingMachineVisual className="w-full h-full" />
                  ) : (
                    <DcMotorVisual className="w-full h-full" />
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D18]/90 via-transparent to-transparent lg:hidden pointer-events-none" />
                </div>

                {/* Information Content Column */}
                <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    {/* Project Metadata Badge Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">
                        {"// PROJECT "}{project.projectNumber}
                      </span>
                      <span className="text-muted-foreground/30 text-xs">•</span>
                      <span
                        className={cn(
                          "text-[10px] sm:text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border",
                          project.projectType === "Major Project"
                            ? "bg-primary/10 border-primary/30 text-cyan-300 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        )}
                      >
                        {project.projectType}
                      </span>
                      <span className="text-muted-foreground/30 text-xs">•</span>
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Calendar size={12} className="text-primary/70" />
                        {project.year}
                      </span>
                    </div>

                    {/* Project Title */}
                    <h3 className="font-bold text-xl sm:text-2xl text-foreground group-hover:text-primary transition-colors tracking-tight leading-snug mb-3">
                      {project.title}
                    </h3>

                    {/* Short Description */}
                    <p className="text-sm text-muted-foreground/90 leading-relaxed mb-5">
                      {project.shortDescription}
                    </p>

                    {/* Technology Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="text-xs font-mono bg-primary/10 text-cyan-300 px-2.5 py-1 rounded-md border border-primary/20 shadow-sm"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedProject(project)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary/10 hover:bg-primary/20 text-cyan-300 border border-primary/30 hover:border-primary/50 transition-all shadow-[0_0_15px_rgba(14,165,233,0.15)] hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] cursor-pointer group/btn"
                    >
                      <Info size={15} />
                      <span>View Project Details</span>
                      <ArrowRight
                        size={14}
                        className="group-hover/btn:translate-x-1 transition-transform"
                      />
                    </button>

                    <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline">
                      Hardware Prototype
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State for other categories */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-panel p-8 sm:p-12 rounded-2xl text-center border-dashed border-white/10 max-w-xl mx-auto"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4 shadow-[0_0_20px_rgba(14,165,233,0.15)]">
            <Layers size={26} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No {filter} Projects Found
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Currently showcasing verified engineering projects in Electronics &amp; Embedded Systems. Explore the hardware prototypes or visit the Web Lab for interactive applications!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setFilter("Electronics")}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] cursor-pointer"
            >
              View Electronics Projects
            </button>
            <button
              type="button"
              onClick={() => setFilter("All")}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-white/10 transition-colors cursor-pointer"
            >
              Show All
            </button>
          </div>
        </motion.div>
      )}

      {/* Project Details Modal */}
      <ProjectDetailsModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* Enter Web Lab CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-16 text-center"
      >
        <Link
          href="/web-lab"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-medium bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:border-primary/40 border border-white/10 transition-all group backdrop-blur-sm hover:shadow-[0_0_20px_rgba(14,165,233,0.25)]"
        >
          <span>Enter Web Lab</span>
          <ExternalLink
            size={18}
            className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
          />
        </Link>
      </motion.div>
    </section>
  );
}
