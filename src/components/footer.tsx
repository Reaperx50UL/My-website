import Link from "next/link";
import { Github, Linkedin, Twitter, Mail, Phone } from "lucide-react";
import { profileData } from "@/data/profile";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background/50 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-bold tracking-widest text-xl mb-2 uppercase">VOIDNOD</span>
          <p className="text-muted-foreground text-sm text-center md:text-left max-w-sm">
            Built by {profileData.name}.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/#about" className="hover:text-primary transition-colors">About</Link>
          <Link href="/#projects" className="hover:text-primary transition-colors">Projects</Link>
          <Link href="/web-lab" className="hover:text-primary transition-colors">Web Lab</Link>
          <Link href={profileData.resumePath} className="hover:text-primary transition-colors">Resume</Link>
        </div>

        <div className="flex gap-4">
          {profileData.socialLinks.github !== "YOUR_GITHUB_URL_HERE" && (
            <a href={profileData.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub">
              <Github size={20} />
            </a>
          )}
          {profileData.socialLinks.linkedin !== "YOUR_LINKEDIN_URL_HERE" && (
            <a href={profileData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn">
              <Linkedin size={20} />
            </a>
          )}
          {profileData.socialLinks.twitter !== "YOUR_TWITTER_URL_HERE" && (
            <a href={profileData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Twitter">
              <Twitter size={20} />
            </a>
          )}
          {profileData.contact.email !== "YOUR_EMAIL_HERE" && (
            <a href={`mailto:${profileData.contact.email}`} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Email">
              <Mail size={20} />
            </a>
          )}
          {profileData.contact.phone && profileData.contact.phone !== "YOUR_PHONE_NUMBER_HERE" && (
            <a href={`tel:${profileData.contact.phone}`} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Phone">
              <Phone size={20} />
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} VOIDNOD. All rights reserved.
      </div>
    </footer>
  );
}
