"use client";
import { skillsData, SkillCategory } from "@/data/profile";
import { motion } from "framer-motion";

export function SkillsSection() {
  const categories = Object.keys(skillsData) as SkillCategory[];

  return (
    <section id="skills" className="py-24 relative scroll-mt-20">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Technical Arsenal</h2>
        <div className="w-20 h-1 bg-primary rounded-full"></div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category, idx) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="glass-panel rounded-lg p-6 flex flex-col"
          >
            <h3 className="font-semibold text-lg mb-4 text-primary">{category}</h3>
            <div className="flex flex-col gap-3">
              {skillsData[category].map((skill) => (
                <div key={skill.name} className="flex items-center group">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-3 group-hover:bg-primary transition-colors" />
                  <span className="text-foreground group-hover:text-primary transition-colors">{skill.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
