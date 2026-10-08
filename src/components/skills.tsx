"use client";
import { skillsData } from "@/data/skills";
import { motion } from "framer-motion";

export function SkillsSection() {
  return (
    <section id="skills" className="py-24 relative scroll-mt-20">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Technical Arsenal</h2>
        <div className="w-20 h-1 bg-primary rounded-full"></div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {skillsData.map((category, idx) => (
          <motion.div
            key={category.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="glass-panel rounded-lg p-6 flex flex-col"
          >
            <h3 className="font-semibold text-lg mb-4 text-primary">{category.category}</h3>
            <div className="flex flex-col gap-3">
              {category.skills.map((skill) => (
                <div key={skill.name} className="flex justify-between items-center group">
                  <span className="text-foreground group-hover:text-primary transition-colors">{skill.name}</span>
                  <span className="text-xs px-2 py-1 rounded bg-secondary/50 text-muted-foreground border border-white/5 group-hover:border-primary/30 transition-colors">
                    {skill.level}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
