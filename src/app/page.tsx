import { HeroSection } from "@/components/hero";
import { AboutSection } from "@/components/about";
import { SkillsSection } from "@/components/skills";
import { HistorySection } from "@/components/history";
import { ProjectsSection } from "@/components/projects";
import { ContactSection } from "@/components/contact";
import { CosmicBackground } from "@/components/cosmic-background";

export default function Home() {
  return (
    <>
      <CosmicBackground />
      <div className="flex flex-col gap-8 md:gap-16">
        <HeroSection />
        <div className="h-px w-full max-w-5xl mx-auto bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <AboutSection />
        <div className="h-px w-full max-w-5xl mx-auto bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <SkillsSection />
        <div className="h-px w-full max-w-5xl mx-auto bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <HistorySection />
        <div className="h-px w-full max-w-5xl mx-auto bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <ProjectsSection />
        <div className="h-px w-full max-w-5xl mx-auto bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <ContactSection />
      </div>
    </>
  );
}
