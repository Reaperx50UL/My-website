import { webLabData } from "@/data/projects";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Github, Calendar, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="py-24 max-w-4xl mx-auto">
      <Link 
        href="/web-lab" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-12"
      >
        <ArrowLeft size={16} />
        Back to Web Lab
      </Link>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded-md uppercase tracking-wider">{project.category}</span>
          <span className={cn(
            "text-xs px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1",
            project.status === "Completed" ? "bg-green-500/10 text-green-500" :
            project.status === "Development" ? "bg-yellow-500/10 text-yellow-500" :
            "bg-secondary/50 text-muted-foreground"
          )}>
            <Activity size={12} />
            {project.status}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <Calendar size={12} />
            {project.date}
          </span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">{project.title}</h1>
        
        <p className="text-xl text-muted-foreground leading-relaxed">
          {project.fullDescription}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-16">
        {project.liveUrl && (
          <a 
            href={project.liveUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink size={18} />
            Live Preview
          </a>
        )}
        {project.githubUrl && (
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
        {project.problem && project.solution && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-panel p-8 rounded-xl border border-white/5">
              <h3 className="text-lg font-bold text-destructive mb-4">The Challenge</h3>
              <p className="text-muted-foreground leading-relaxed">{project.problem}</p>
            </div>
            <div className="glass-panel p-8 rounded-xl border border-white/5 border-t-primary/50">
              <h3 className="text-lg font-bold text-primary mb-4">The Solution</h3>
              <p className="text-muted-foreground leading-relaxed">{project.solution}</p>
            </div>
          </div>
        )}

        <div className="glass-panel p-8 rounded-xl border border-white/5">
          <h2 className="text-2xl font-bold mb-6">Key Features</h2>
          <ul className="grid md:grid-cols-2 gap-4">
            {project.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
          <div className="flex flex-wrap gap-3">
            {project.technologies.map(tech => (
              <div key={tech} className="px-4 py-2 rounded-lg glass-panel border border-white/5 flex items-center justify-center">
                <span className="text-foreground font-medium">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
