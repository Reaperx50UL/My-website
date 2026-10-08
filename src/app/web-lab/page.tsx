"use client";
import { useState } from "react";
import { webLabData } from "@/data/profile";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Beaker, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Websites", "Web Apps", "Experiments", "Tools", "Other"];

export default function WebLabPage() {
  const [filter, setFilter] = useState("All");

  const filteredProjects = webLabData.filter(project => 
    filter === "All" ? true : project.category === filter
  );

  return (
    <div className="py-24 max-w-6xl mx-auto min-h-[80vh]">
      <div className="text-center mb-16">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6 text-primary glow-primary"
        >
          <Beaker size={48} />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
        >
          WEB LAB
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          An experimental space where I build, test and showcase websites, tools and technical experiments.
        </motion.p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all",
              filter === cat 
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(14,165,233,0.3)]" 
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-white/5"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredProjects.length > 0 ? (
        <motion.div layout className="grid md:grid-cols-2 gap-8">
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.slug}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="glass-panel rounded-xl overflow-hidden group hover:border-primary/50 transition-all border border-white/5 flex flex-col"
              >
                <div className="p-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="p-8 flex flex-col flex-1 relative">
                  <div className="absolute top-8 right-8 text-muted-foreground/20 group-hover:text-primary/10 transition-colors">
                    <Terminal size={64} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <h3 className="font-bold text-2xl group-hover:text-primary transition-colors">{project.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded-md uppercase tracking-wider">{project.category}</span>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md uppercase tracking-wider",
                      project.status === "Completed" ? "bg-green-500/10 text-green-500" :
                      project.status === "Development" ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-secondary/50 text-muted-foreground"
                    )}>
                      {project.status}
                    </span>
                  </div>
                  
                  <p className="text-muted-foreground mb-8 flex-1 relative z-10">{project.shortDescription}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                    {project.technologies.slice(0, 3).map(tech => (
                      <span key={tech} className="text-xs text-foreground/70">{tech}</span>
                    )).reduce((prev, curr) => [prev, <span key={`dot-${curr.key}`} className="text-muted-foreground/30">•</span>, curr] as any)}
                  </div>

                  <div className="mt-auto relative z-10">
                    <Link 
                      href={`/web-lab/${project.slug}`}
                      className="inline-flex items-center gap-2 text-primary font-medium group/link hover:text-primary/80 transition-colors"
                    >
                      View Project Details
                      <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="glass-panel p-16 rounded-xl text-center border-dashed border-white/10 max-w-2xl mx-auto">
          <Terminal className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-2xl font-medium text-foreground mb-2">Web Lab is empty</h3>
          <p className="text-muted-foreground">Experiments and tools will be added here soon.</p>
        </div>
      )}
    </div>
  );
}
