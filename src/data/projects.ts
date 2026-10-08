export interface Project {
  id: string;
  title: string;
  description: string;
  category: "Web" | "Python" | "Cybersecurity" | "Electronics" | "Other";
  technologies: string[];
  image?: string;
  githubUrl?: string;
  liveUrl?: string;
}

export const projectsData: Project[] = [
  {
    id: "proj-1",
    title: "Portfolio Platform",
    description: "A modern futuristic portfolio and web lab platform built with Next.js and Tailwind CSS.",
    category: "Web",
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    githubUrl: "https://github.com/",
    liveUrl: "https://example.com"
  },
  {
    id: "proj-2",
    title: "IoT Sensor Node",
    description: "Microcontroller-based environmental sensing unit with wireless data transmission.",
    category: "Electronics",
    technologies: ["C++", "Arduino", "ESP32", "MQTT"],
    githubUrl: "https://github.com/"
  },
  {
    id: "proj-3",
    title: "Network Scanner Utility",
    description: "A lightweight python script for discovering active devices and open ports on a local network.",
    category: "Cybersecurity",
    technologies: ["Python", "Socket", "Scapy"],
    githubUrl: "https://github.com/"
  }
];

export interface WebLabProject {
  slug: string;
  title: string;
  category: "Web Apps" | "Experiments" | "Tools" | "Other";
  shortDescription: string;
  fullDescription: string;
  problem?: string;
  solution?: string;
  features: string[];
  technologies: string[];
  image?: string;
  screenshots?: string[];
  githubUrl?: string;
  liveUrl?: string;
  status: "Development" | "Completed" | "Archived";
  date: string;
}

export const webLabData: WebLabProject[] = [
  {
    slug: "modern-ecommerce",
    title: "Modern E-Commerce",
    category: "Web Apps",
    shortDescription: "A fully functional e-commerce storefront experiment.",
    fullDescription: "This project explores building a highly performant and accessible e-commerce frontend using modern web technologies.",
    problem: "Traditional e-commerce templates are often bloated and slow.",
    solution: "Built a custom frontend from scratch prioritizing lighthouse scores and smooth animations.",
    features: ["Product listing", "Cart state management", "Checkout flow UI", "Responsive design"],
    technologies: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    status: "Development",
    date: "2024-03",
    githubUrl: "https://github.com/",
    liveUrl: "https://example.com"
  }
];
