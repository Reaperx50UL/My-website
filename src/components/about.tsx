"use client";

import { profileData } from "@/data/profile";
import { motion } from "framer-motion";
import { Cpu, Code2, ShieldAlert } from "lucide-react";

export function AboutSection() {
  const icons = [Cpu, Code2, ShieldAlert];

  return (
    <section id="about" className="py-16 sm:py-24 relative scroll-mt-20 sm:scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          Overview // Profile
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">About Me</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-cyan-400 rounded-full shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-12 items-start">
        {/* Bio Text Column */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 prose prose-invert max-w-none"
        >
          <div className="glass-panel p-5 sm:p-8 rounded-2xl border border-white/5 relative overflow-hidden backdrop-blur-md">
            {/* Subtle cybernetic corner accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
            <p className="text-lg text-muted-foreground/95 leading-relaxed whitespace-pre-line">
              {profileData.fullBio}
            </p>
          </div>
        </motion.div>

        {/* Feature Cards Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {profileData.aboutCards.map((card, idx) => {
            const IconComponent = icons[idx % icons.length];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 25 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.55,
                  delay: 0.15 + idx * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="glass-panel p-6 rounded-xl border border-white/5 group hover:border-primary/40 hover:shadow-[0_4px_25px_-5px_rgba(14,165,233,0.2)] transition-all duration-300 backdrop-blur-md hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-300">
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
