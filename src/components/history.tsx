"use client";

import { educationData, experienceData } from "@/data/profile";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase } from "lucide-react";

export function HistorySection() {
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

      <div className="grid lg:grid-cols-2 gap-16">
        {/* Education Timeline */}
        <div id="education" className="scroll-mt-20 sm:scroll-mt-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <GraduationCap size={22} />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Education</h3>
          </div>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent">
            {/* Animated Light Trail */}
            <motion.div
              className="absolute top-0 bottom-0 ml-5 -translate-x-px md:mx-auto md:translate-x-0 w-[2px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent z-0 opacity-60"
              initial={{ top: "0%", bottom: "100%" }}
              animate={{ top: "100%", bottom: "0%" }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            />

            {educationData.length > 0 ? (
              educationData.map((item, idx) => (
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
                        {item.degree}
                      </h4>
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-3">
                      {item.institution}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground/80 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-panel p-6 rounded-lg text-center border-dashed border-white/10">
                <p className="text-muted-foreground text-sm">Education details will be updated here.</p>
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
