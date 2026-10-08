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

  const filteredProjects = projectsData.filter(project => 
    filter === "All" ? true : project.category === filter
  );

  return (
    <section id="projects" className="py-24 relative scroll-mt-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Featured Projects</h2>
          <div className="w-20 h-1 bg-primary rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-2xl">A selection of my recent work across different domains of technology.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === cat 
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(14,165,233,0.3)]" 
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-white/5"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.slug}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="glass-panel rounded-xl overflow-hidden group flex flex-col hover:border-primary/50 hover:glow-primary transition-all"
              >
                <div className="h-48 bg-secondary/30 relative border-b border-white/5 flex items-center justify-center overflow-hidden">
                  {project.image ? (
                    <Image src={project.image} alt={project.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <MonitorPlay className="w-16 h-16 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-60"></div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{project.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground/80 mb-6 flex-1">{project.shortDescription}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.slice(0, 4).map(tech => (
                      <span key={tech} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">{tech}</span>
                    ))}
                    {project.technologies.length > 4 && (
                      <span className="text-xs bg-secondary/50 text-muted-foreground px-2 py-1 rounded">+{project.technologies.length - 4}</span>
                    )}
                  </div>

                  <div className="flex gap-4 mt-auto pt-4 border-t border-white/5">
                    {project.githubUrl && project.githubUrl !== "YOUR_GITHUB_URL_HERE" && (
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Github size={16} /> Code
                      </a>
                    )}
                    {project.liveUrl && project.liveUrl !== "YOUR_LIVE_URL_HERE" && (
                      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto">
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
        <div className="glass-panel p-12 rounded-xl text-center border-dashed border-white/10">
          <MonitorPlay className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">No Projects Found</h3>
          <p className="text-muted-foreground">Projects for this category will be updated soon.</p>
        </div>
      )}
      
      <div className="mt-16 text-center">
        <Link href="/web-lab" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5 transition-all group">
          Enter Web Lab
          <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
