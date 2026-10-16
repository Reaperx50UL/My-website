"use client";

import { skillsData, SkillCategory } from "@/data/profile";
import { motion } from "framer-motion";
import { Code, Terminal, Cpu, Database } from "lucide-react";

export function SkillsSection() {
  const categories = Object.keys(skillsData) as SkillCategory[];

  const categoryIcons: Record<string, React.ReactNode> = {
    "Programming Languages": <Code size={18} className="text-primary" />,
    "Cybersecurity & Tools": <Terminal size={18} className="text-cyan-400" />,
    "Electronics & Hardware": <Cpu size={18} className="text-indigo-400" />,
    "Web Development & Other": <Database size={18} className="text-blue-400" />,
  };

  return (
    <section id="skills" className="py-24 relative scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Stack // Expertise
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Technical Arsenal
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-cyan-400 rounded-full shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category, idx) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.55,
              delay: idx * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="glass-panel rounded-2xl p-6 flex flex-col border border-white/5 hover:border-primary/40 hover:shadow-[0_8px_30px_-8px_rgba(14,165,233,0.2)] transition-all duration-300 backdrop-blur-md group hover:-translate-y-1.5"
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
                  {categoryIcons[category] || <Code size={18} className="text-primary" />}
                </div>
                <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                  {category}
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 flex-1">
              {skillsData[category].map((skill, sIdx) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.3,
                    delay: 0.2 + idx * 0.08 + sIdx * 0.04,
                  }}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-md hover:bg-white/5 transition-all group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover/item:bg-primary group-hover/item:shadow-[0_0_8px_rgba(14,165,233,0.8)] transition-all" />
                    <span className="text-sm text-muted-foreground group-hover/item:text-foreground transition-colors">
                      {skill.name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
