"use client";

import { useState } from "react";
import { webLabData } from "@/data/profile";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRight, 
  Beaker, 
  Terminal, 
  Code, 
  Cpu, 
  Network, 
  ArrowUpRight,
  Calculator,
  Gamepad2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Websites", "Web Apps", "Experiments", "Tools", "Other"];

export function WebLabContent() {
  const [filter, setFilter] = useState("All");

  const filteredProjects = webLabData.filter(project => 
    filter === "All" ? true : project.category === filter
  );

  return (
    <div className="flex flex-col relative">
      {/* 1. Cinematic Hero */}
      <section className="min-h-[90vh] flex flex-col justify-center items-center text-center relative pt-20 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl px-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-8">
            <Beaker size={14} />
            VOIDNOD / WEB LAB
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            A SPACE TO BUILD <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">WHAT&apos;S NEXT.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground/80 font-light max-w-2xl mx-auto">
            An experimental space where I build, test and showcase websites, tools and technical experiments.
          </p>
        </motion.div>
      </section>

      {/* 2. Experimental Workspace */}
      <section className="py-24 border-t border-white/5 relative bg-background/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">THE EXPERIMENTAL WORKSPACE</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-violet-500 rounded-full mb-6"></div>
              <p className="text-muted-foreground text-lg max-w-xl">
                Web applications, digital experiences and technical experiments, organized in one place.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    filter === cat 
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(14,165,233,0.4)]" 
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary border border-white/5"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.slug}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="glass-panel rounded-2xl overflow-hidden group hover:border-cyan-500/50 transition-all border border-white/5 flex flex-col hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(6,182,212,0.25)]"
                  >
                    <div className="h-48 bg-gradient-to-b from-slate-900/60 to-slate-950/80 relative border-b border-white/5 flex items-center justify-center overflow-hidden">
                      {/* Background grid accent */}
                      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                      
                      {project.slug === "scientific-calculator" ? (
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-400/60 transition-all duration-500 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <Calculator className="w-8 h-8" />
                          </div>
                        </div>
                      ) : project.slug === "flappy-bird" ? (
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:border-violet-400/60 transition-all duration-500 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                            <Gamepad2 className="w-8 h-8" />
                          </div>
                        </div>
                      ) : (
                        <Terminal className="w-16 h-16 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary/30" />
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-80 pointer-events-none"></div>

                      {(project.slug === "scientific-calculator" || project.slug === "flappy-bird") && (
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 shadow-md backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>INTERACTIVE</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-8 flex flex-col flex-1 relative bg-gradient-to-b from-transparent to-background/50">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-2xl group-hover:text-cyan-400 transition-colors">{project.title}</h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-6">
                        <span className="text-xs px-2.5 py-1 bg-secondary text-muted-foreground rounded text-center tracking-wide font-mono">{project.category}</span>
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded text-center tracking-wide border border-transparent font-mono",
                          project.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          project.status === "Development" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-secondary/50 text-muted-foreground"
                        )}>
                          {project.status}
                        </span>
                      </div>
                      
                      <p className="text-muted-foreground mb-8 flex-1 leading-relaxed text-sm md:text-base">{project.shortDescription}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-8">
                        {project.technologies.slice(0, 4).map(tech => (
                          <span key={tech} className="text-xs font-mono bg-cyan-500/5 text-cyan-400/90 px-2.5 py-1 rounded border border-cyan-500/15">{tech}</span>
                        ))}
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/5">
                        <Link 
                          href={`/web-lab/${project.slug}`}
                          className="inline-flex items-center gap-2 text-foreground font-medium group/link hover:text-cyan-400 transition-colors"
                        >
                          {project.slug === "scientific-calculator" 
                            ? "Launch Calculator" 
                            : project.slug === "flappy-bird" 
                            ? "Play Flappy Bird" 
                            : "View Experiment"}
                          <ArrowRight size={16} className="group-hover/link:translate-x-1 text-cyan-400 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative rounded-2xl overflow-hidden border border-white/10 group min-h-[400px] flex items-center justify-center"
            >
              {/* Cinematic Empty State Background */}
              <div className="absolute inset-0 z-0">
                <img src="/images/backgrounds/web_lab_empty.jpg" alt="Empty Lab" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
              </div>
              
              <div className="relative z-10 text-center p-8 max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-secondary/50 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl backdrop-blur-md">
                  <Terminal className="w-10 h-10 text-primary opacity-80" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4 tracking-tight">THE NEXT EXPERIMENT STARTS HERE.</h3>
                <p className="text-lg text-muted-foreground mb-8">
                  New websites, tools and experiments will appear here as they are built and published.
                </p>
                <Link href="/#contact" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all">
                  Suggest an Idea
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* 3. Lab Process */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">FROM IDEA TO EXPERIMENT</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-primary to-violet-500 rounded-full mx-auto mb-6"></div>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              The continuous technical process driving the Web Lab.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line on desktop */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[1px] bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 z-0"></div>

            <div className="relative z-10 flex flex-col items-center text-center p-8 glass-panel rounded-2xl border border-white/5">
              <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center border border-primary/20 mb-8 shadow-[0_0_30px_rgba(14,165,233,0.15)]">
                <Code className="w-10 h-10 text-primary" />
              </div>
              <div className="text-sm font-bold text-primary mb-2 tracking-widest">01 &mdash; BUILD</div>
              <h3 className="text-xl font-bold mb-4">Develop</h3>
              <p className="text-muted-foreground">Develop websites and digital experiences using modern frameworks and robust architecture.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center p-8 glass-panel rounded-2xl border border-violet-500/20">
              <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center border border-violet-500/20 mb-8 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <Cpu className="w-10 h-10 text-violet-400" />
              </div>
              <div className="text-sm font-bold text-violet-400 mb-2 tracking-widest">02 &mdash; EXPLORE</div>
              <h3 className="text-xl font-bold mb-4">Experiment</h3>
              <p className="text-muted-foreground">Experiment with interfaces, tools, and emerging technologies to discover what&apos;s possible.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center p-8 glass-panel rounded-2xl border border-emerald-500/20">
              <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center border border-emerald-500/20 mb-8 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <Network className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-emerald-400 mb-2 tracking-widest">03 &mdash; CONNECT</div>
              <h3 className="text-xl font-bold mb-4">Integrate</h3>
              <p className="text-muted-foreground">Bring projects together into a growing digital portfolio and interconnected technical ecosystem.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Closing Action */}
      <section className="py-32 border-t border-white/5 bg-gradient-to-b from-transparent to-[#020202]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">HAVE AN IDEA WORTH EXPLORING?</h2>
          <p className="text-xl text-muted-foreground mb-12">
            I&apos;m always interested in learning, building and experimenting with technology.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/#contact" 
              className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]"
            >
              CONTACT ME
            </Link>
            <Link 
              href="/" 
              className="px-8 py-4 bg-secondary text-secondary-foreground rounded-full font-medium hover:bg-secondary/80 border border-white/5 transition-all"
            >
              BACK TO PORTFOLIO
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
