import Link from "next/link";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import { portfolioData } from "@/data/portfolio";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background/50 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-bold tracking-widest text-xl mb-2">APAN DATTA</span>
          <p className="text-muted-foreground text-sm text-center md:text-left max-w-sm">
            Building technology. Exploring possibilities.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/#about" className="hover:text-primary transition-colors">About</Link>
          <Link href="/#projects" className="hover:text-primary transition-colors">Projects</Link>
          <Link href="/web-lab" className="hover:text-primary transition-colors">Web Lab</Link>
          <Link href="/resume.pdf" className="hover:text-primary transition-colors">Resume</Link>
        </div>

        <div className="flex gap-4">
          <a href={portfolioData.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Github size={20} />
          </a>
          <a href={portfolioData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Linkedin size={20} />
          </a>
          <a href={portfolioData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Twitter size={20} />
          </a>
          <a href={`mailto:${portfolioData.personalInfo.email}`} className="text-muted-foreground hover:text-primary transition-colors">
            <Mail size={20} />
          </a>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Apan Datta. All rights reserved.
      </div>
    </footer>
  );
}
