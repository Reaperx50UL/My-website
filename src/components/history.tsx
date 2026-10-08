"use client";
import { educationData, experienceData } from "@/data/history";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase } from "lucide-react";

export function HistorySection() {
  return (
    <section id="history" className="py-24 relative scroll-mt-20">
      <div className="grid lg:grid-cols-2 gap-16">
        
        {/* Education Timeline */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <GraduationCap className="text-primary w-8 h-8" />
            <h2 className="text-3xl font-bold tracking-tight">Education</h2>
          </div>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent">
            {educationData.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Node */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-card group-hover:border-primary/50 group-hover:glow-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-all z-10">
                  <div className="w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                </div>
                
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-5 rounded-lg group-hover:border-primary/30 transition-colors">
                  <div className="flex flex-col mb-2">
                    <span className="text-primary text-sm font-medium">{item.date}</span>
                    <h3 className="font-bold text-lg mt-1">{item.degree}</h3>
                  </div>
                  <div className="text-muted-foreground text-sm font-medium mb-3">{item.institution}</div>
                  {item.description && <p className="text-sm text-muted-foreground/80">{item.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Experience Timeline */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Briefcase className="text-primary w-8 h-8" />
            <h2 className="text-3xl font-bold tracking-tight">Experience</h2>
          </div>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent">
            {experienceData.length > 0 ? (
              experienceData.map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-card group-hover:border-primary/50 group-hover:glow-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-all z-10">
                    <div className="w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-5 rounded-lg group-hover:border-primary/30 transition-colors">
                    <div className="flex flex-col mb-2">
                      <span className="text-primary text-sm font-medium">{item.date}</span>
                      <h3 className="font-bold text-lg mt-1">{item.role}</h3>
                    </div>
                    <div className="text-muted-foreground text-sm font-medium mb-3">{item.organization}</div>
                    <p className="text-sm text-muted-foreground/80 mb-3">{item.description}</p>
                    {item.technologies && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.technologies.map(tech => (
                          <span key={tech} className="text-xs bg-secondary/50 px-2 py-1 rounded text-muted-foreground border border-white/5">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
               <div className="glass-panel p-6 rounded-lg text-center border-dashed border-white/10">
                 <p className="text-muted-foreground">Continuously learning and building. Open for new opportunities.</p>
               </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
