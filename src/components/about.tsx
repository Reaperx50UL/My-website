"use client";
import { portfolioData } from "@/data/portfolio";
import { motion } from "framer-motion";
import { Cpu, Code2, ShieldAlert } from "lucide-react";

export function AboutSection() {
  return (
    <section id="about" className="py-24 relative scroll-mt-20">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">About Me</h2>
        <div className="w-20 h-1 bg-primary rounded-full"></div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="prose prose-invert max-w-none"
        >
          <p className="text-lg text-muted-foreground leading-relaxed">
            {portfolioData.personalInfo.fullBio}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid gap-4"
        >
          <div className="glass-panel p-6 rounded-lg group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-md bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Cpu size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Electronics Engineering</h3>
                <p className="text-sm text-muted-foreground">Current Education</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-lg group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-md bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Code2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Technology & Software</h3>
                <p className="text-sm text-muted-foreground">Primary Focus</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-lg group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-md bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Cybersecurity • Web • Electronics</h3>
                <p className="text-sm text-muted-foreground">Core Interests</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
