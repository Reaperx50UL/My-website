import { webLabData } from "@/data/profile";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Github, Calendar, Activity, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ScientificCalculator } from "@/components/experiments/scientific-calculator";
import { FlappyBird } from "@/components/experiments/flappy-bird";

export function generateStaticParams() {
  return webLabData.map((project) => ({
    slug: project.slug,
  }));
}

export default function WebLabProjectPage({ params }: { params: { slug: string } }) {
  const project = webLabData.find((p) => p.slug === params.slug);

  if (!project) {
    notFound();
  }

  const isInteractiveApp = project.slug === "scientific-calculator" || project.slug === "flappy-bird";

  return (
    <div className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
      <Link 
        href="/web-lab" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 text-sm"
      >
        <ArrowLeft size={16} />
        Back to Web Lab
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-xs px-2.5 py-1 bg-secondary text-cyan-300 border border-cyan-500/20 rounded-md uppercase tracking-wider font-mono">
            {project.category}
          </span>
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 font-mono",
            project.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
            project.status === "Development" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
            "bg-secondary/50 text-muted-foreground"
          )}>
            <Activity size={12} />
            {project.status}
          </span>
          {isInteractiveApp && (
            <span className="text-xs px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles size={12} className="text-cyan-400" />
              Live Interactive
            </span>
          )}
          {project.date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto font-mono">
              <Calendar size={12} />
              {project.date}
            </span>
          )}
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">{project.title}</h1>
        
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          {project.fullDescription || project.shortDescription}
        </p>
      </div>

      {/* Live Interactive Application Embed */}
      {project.slug === "scientific-calculator" && (
        <div className="mb-16">
          <div className="text-xs font-mono text-cyan-400/70 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Live Application Terminal
          </div>
          <ScientificCalculator />
        </div>
      )}

      {project.slug === "flappy-bird" && (
        <div className="mb-16">
          <div className="text-xs font-mono text-cyan-400/70 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Live Arcade Canvas
          </div>
          <FlappyBird />
        </div>
      )}
      
      {project.image && !isInteractiveApp && (
        <div className="w-full h-[400px] relative rounded-xl overflow-hidden mb-12 border border-white/5">
          <Image src={project.image} alt={project.title} fill className="object-cover" />
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-16">
        {project.liveUrl && project.liveUrl !== "YOUR_LIVE_URL_HERE" && (
          <a 
            href={project.liveUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink size={18} />
            Open Live Website
          </a>
        )}
        {project.githubUrl && project.githubUrl !== "YOUR_GITHUB_URL_HERE" && (
          <a 
            href={project.githubUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-medium hover:bg-secondary/80 border border-white/5 transition-colors"
          >
            <Github size={18} />
            View Source
          </a>
        )}
      </div>

      <div className="space-y-16">
        {(project.problem || project.solution) && (
          <div className="grid md:grid-cols-2 gap-8">
            {project.problem && (
              <div className="glass-panel p-8 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-destructive mb-4">The Challenge</h3>
                <p className="text-muted-foreground leading-relaxed">{project.problem}</p>
              </div>
            )}
            {project.solution && (
              <div className="glass-panel p-8 rounded-xl border border-white/5 border-t-primary/50">
                <h3 className="text-lg font-bold text-primary mb-4">The Solution</h3>
                <p className="text-muted-foreground leading-relaxed">{project.solution}</p>
              </div>
            )}
          </div>
        )}

        {project.features && project.features.length > 0 && (
          <div className="glass-panel p-8 rounded-xl border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Key Features</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              {project.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.technologies && project.technologies.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
            <div className="flex flex-wrap gap-3">
              {project.technologies.map(tech => (
                <div key={tech} className="px-4 py-2 rounded-lg glass-panel border border-white/5 flex items-center justify-center font-mono text-sm text-cyan-200">
                  <span>{tech}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
