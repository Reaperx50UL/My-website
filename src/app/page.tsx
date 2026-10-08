import { HeroSection } from "@/components/hero";
import { AboutSection } from "@/components/about";
import { SkillsSection } from "@/components/skills";
import { HistorySection } from "@/components/history";
import { ProjectsSection } from "@/components/projects";
import { ContactSection } from "@/components/contact";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 md:gap-16">
      <HeroSection />
      <div className="border-t border-white/5 w-full max-w-5xl mx-auto" />
      <AboutSection />
      <div className="border-t border-white/5 w-full max-w-5xl mx-auto" />
      <SkillsSection />
      <div className="border-t border-white/5 w-full max-w-5xl mx-auto" />
      <HistorySection />
      <div className="border-t border-white/5 w-full max-w-5xl mx-auto" />
      <ProjectsSection />
      <div className="border-t border-white/5 w-full max-w-5xl mx-auto" />
      <ContactSection />
    </div>
  );
}
