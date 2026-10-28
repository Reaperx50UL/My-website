"use client";

import { useState } from "react";
import { projectsData } from "@/data/profile";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Github, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

const categories = ["All", "Web", "Python", "Cybersecurity", "Electronics", "Other"];

export function ProjectsSection() {
  const [filter, setFilter] = useState("All");

  const filteredProjects = projectsData.filter((project) =>
    filter === "All" ? true : project.category === filter
  );

  return (
    <section id="projects" className="py-16 sm:py-24 relative scroll-mt-20 sm:scroll-mt-24">
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
            A selection of my recent work across different domains of technology.
          </p>
        </motion.div>

        {/* Category Filters with animated active pill without interfering with clicks */}
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
                "relative px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary",
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

      {filteredProjects.length > 0 ? (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, idx) => (
              <motion.div
                key={project.slug}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="glass-panel rounded-2xl overflow-hidden group flex flex-col hover:border-primary/50 hover:shadow-[0_12px_35px_-8px_rgba(14,165,233,0.25)] transition-all duration-300 border border-white/5 backdrop-blur-md hover:-translate-y-1.5"
              >
                <div className="h-48 bg-secondary/30 relative border-b border-white/5 flex items-center justify-center overflow-hidden">
                  {project.image ? (
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <MonitorPlay className="w-16 h-16 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary/40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-transparent to-transparent opacity-80" />
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground/80 mb-6 flex-1 leading-relaxed">
                    {project.shortDescription}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 4 && (
                      <span className="text-xs bg-secondary/50 text-muted-foreground px-2 py-1 rounded-md border border-white/5">
                        +{project.technologies.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 mt-auto pt-4 border-t border-white/5">
                    {project.githubUrl && project.githubUrl !== "YOUR_GITHUB_URL_HERE" && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded py-1 px-1.5"
                      >
                        <Github size={16} /> Code
                      </a>
                    )}
                    {project.liveUrl && project.liveUrl !== "YOUR_LIVE_URL_HERE" && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors ml-auto focus:outline-none focus:ring-1 focus:ring-primary rounded py-1 px-1.5"
                      >
                        <ExternalLink size={16} /> Demo
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-12 rounded-2xl text-center border-dashed border-white/10 max-w-xl mx-auto"
        >
          <MonitorPlay className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">No Projects Found</h3>
          <p className="text-muted-foreground text-sm">
            Projects for this category will be updated soon.
          </p>
        </motion.div>
      )}

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
          Enter Web Lab
          <ExternalLink
            size={18}
            className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
          />
        </Link>
      </motion.div>
    </section>
  );
}
