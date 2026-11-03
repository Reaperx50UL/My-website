"use client";

import { educationData, experienceData } from "@/data/profile";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  Building2,
  Award,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function HistorySection() {
  const btechItem =
    educationData.find((item) => item.level === "btech") || educationData[0];
  const schoolItems = educationData.filter((item) => item.level !== "btech");

  return (
    <section id="history" className="py-16 sm:py-24 relative scroll-mt-20 sm:scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Trajectory // Timeline
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Education &amp; Experience
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-cyan-400 rounded-full shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Education Timeline */}
        <div id="education" className="scroll-mt-20 sm:scroll-mt-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shadow-[0_0_15px_rgba(14,165,233,0.2)]">
              <GraduationCap size={22} />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Education</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Academic Background // Qualifications
              </p>
            </div>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-2.5 before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-primary/20 before:to-transparent">
            {/* Animated Cybernetic Light Pulse along the timeline rail */}
            <motion.div
              className="absolute left-2 sm:left-2.5 -translate-x-1/2 w-[2px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent z-0 opacity-70"
              initial={{ top: "0%", height: "25%" }}
              animate={{ top: ["0%", "75%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            />

            {/* 1. B.Tech — Main / Primary Education Card */}
            {btechItem && (
              <motion.div
                initial={{ opacity: 0, y: 25, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                {/* Timeline Node Marker */}
                <div className="absolute -left-6 sm:-left-8 top-5 -translate-x-1/2 flex items-center justify-center w-5 h-5 rounded-full border border-primary/60 bg-[#050505] shadow-[0_0_12px_rgba(14,165,233,0.5)] z-10 transition-transform group-hover:scale-125">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>

                {/* Main Card */}
                <div className="glass-panel p-5 sm:p-7 rounded-2xl border border-primary/25 relative overflow-hidden backdrop-blur-md group-hover:border-primary/50 group-hover:shadow-[0_8px_35px_-8px_rgba(14,165,233,0.25)] transition-all duration-300">
                  {/* Subtle cybernetic corner glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none blur-xl group-hover:bg-primary/10 transition-all" />

                  {/* Top Bar: Graduation Date & Highest Qualification Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Graduated // {btechItem.date}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/80 bg-white/[0.03] px-2.5 py-0.5 rounded-md border border-white/5">
                      Highest Qualification
                    </span>
                  </div>

                  {/* Degree & Branch */}
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {btechItem.degree}
                    </h4>
                    {btechItem.field && (
                      <div className="text-sm sm:text-base font-semibold text-cyan-300/90 mt-1 flex items-center gap-2">
                        <Sparkles size={16} className="text-primary shrink-0" />
                        <span>{btechItem.field}</span>
                      </div>
                    )}
                  </div>

                  {/* Institution */}
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-3">
                    <Building2 size={16} className="text-muted-foreground/70 shrink-0" />
                    <span className="font-medium">{btechItem.institution}</span>
                  </div>

                  {/* Highlighted CGPA Box & Status */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-primary/30 rounded-xl px-4 py-2.5 shadow-[0_0_20px_rgba(14,165,233,0.15)] group-hover:border-primary/50 transition-all">
                      <div className="p-2 rounded-lg bg-primary/20 text-cyan-300 border border-primary/30">
                        <Award size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                          Academic Standing
                        </div>
                        <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300 tracking-tight flex items-baseline gap-1.5">
                          <span className="text-primary text-xs uppercase tracking-wider">
                            {btechItem.scoreLabel}:
                          </span>
                          <span className="text-foreground font-extrabold">
                            {btechItem.score.split('/')[0]}
                          </span>
                          {btechItem.score.includes('/') && (
                            <span className="text-xs text-muted-foreground font-normal">
                              /{btechItem.score.split('/')[1]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>Degree Conferred</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Timeline Sub-Divider for Schooling Foundation */}
            {schoolItems.length > 0 && (
              <div className="relative pt-2 pb-1">
                {/* Secondary Timeline Node Marker */}
                <div className="absolute -left-6 sm:-left-8 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full border border-primary/40 bg-[#050505] shadow-[0_0_8px_rgba(14,165,233,0.3)] z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80 font-semibold">
                    Schooling Foundation
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-primary/20 to-transparent" />
                </div>
              </div>
            )}

            {/* 2 & 3. Higher Secondary and Secondary Cards (Side-by-Side on Tablet/Desktop, Stacked on Mobile) */}
            {schoolItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {schoolItems.map((item, idx) => (
                  <motion.div
                    key={item.degree}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.1 + idx * 0.1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="glass-panel p-4 sm:p-5 rounded-xl border border-white/5 group hover:border-primary/30 hover:shadow-[0_4px_25px_-5px_rgba(14,165,233,0.15)] transition-all duration-300 flex flex-col justify-between h-full"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-primary text-[11px] font-mono font-semibold uppercase tracking-wider">
                          Completed // {item.date}
                        </span>
                        {item.subLabel && (
                          <span className="text-[10px] font-mono text-muted-foreground/70 uppercase">
                            {item.subLabel}
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                        {item.degree}
                      </h5>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-start gap-1.5">
                        <Building2 size={14} className="text-muted-foreground/70 shrink-0 mt-0.5" />
                        <span className="leading-snug">{item.institution}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                        {item.scoreLabel}
                      </span>
                      <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/25 text-cyan-300 font-mono font-bold text-sm tracking-tight shadow-[0_0_12px_rgba(14,165,233,0.1)]">
                        {item.score}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Experience Timeline */}
        <div id="experience" className="scroll-mt-20 sm:scroll-mt-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Briefcase size={22} />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Experience</h3>
          </div>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent">
            {/* Animated Light Trail */}
            <motion.div
              className="absolute top-0 bottom-0 ml-5 -translate-x-px md:mx-auto md:translate-x-0 w-[2px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent z-0 opacity-60"
              initial={{ top: "0%", bottom: "100%" }}
              animate={{ top: "100%", bottom: "0%" }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
            />

            {experienceData.length > 0 ? (
              experienceData.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 25, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-[#0a0a0a] group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.4)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-all z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary group-hover:scale-125 transition-transform" />
                  </div>

                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-4 sm:p-6 rounded-xl border border-white/5 group-hover:border-primary/30 group-hover:shadow-[0_8px_30px_-8px_rgba(14,165,233,0.15)] transition-all duration-300">
                    <div className="flex flex-col mb-2">
                      <span className="text-primary text-xs font-semibold uppercase tracking-wider">
                        {item.date}
                      </span>
                      <h4 className="font-bold text-lg mt-1 text-foreground group-hover:text-primary transition-colors">
                        {item.role}
                      </h4>
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-3">
                      {item.organization}
                    </div>
                    <p className="text-sm text-muted-foreground/80 mb-4 leading-relaxed">
                      {item.description}
                    </p>

                    {item.responsibilities && item.responsibilities.length > 0 && (
                      <ul className="mb-4 space-y-1.5">
                        {item.responsibilities.map((resp, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start">
                            <span className="mr-2 mt-1.5 w-1 h-1 bg-primary rounded-full shrink-0"></span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {item.keyLearning && (
                      <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/15">
                        <span className="text-[11px] font-semibold text-primary block mb-1 uppercase tracking-wider">
                          Key Learning
                        </span>
                        <p className="text-xs text-muted-foreground/90">{item.keyLearning}</p>
                      </div>
                    )}

                    {item.technologies && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {item.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="text-[11px] bg-secondary/60 px-2 py-0.5 rounded text-muted-foreground border border-white/5"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-panel p-6 rounded-lg text-center border-dashed border-white/10">
                <p className="text-muted-foreground text-sm">Professional experience will be updated here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
