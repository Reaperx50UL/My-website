export const profileData = {
  name: "Apan Datta",
  title: "Electronics Engineering Student • Developer • Technology Enthusiast • Cybersecurity Learner",
  shortBio: "I enjoy building technology projects and exploring the connection between software, electronics and cybersecurity.",
  fullBio: "I am an Electronics Engineering student with a deep interest in modern technology. I enjoy software development and am actively exploring cybersecurity alongside my core engineering studies. My approach is centered on continuous learning—whether that involves diving into modern web technologies, building hardware prototypes, or experimenting with new software frameworks.",
  status: "Open to opportunities",
  
  contact: {
    email: "apandatta063@gmail.com", // e.g., "hello@example.com"
    phone: "7384000682", // e.g., "+1 234 567 8900"
  },
  
  socialLinks: {
    github: "YOUR_GITHUB_URL_HERE",
    linkedin: "YOUR_LINKEDIN_URL_HERE",
    twitter: "YOUR_TWITTER_URL_HERE",
  },

  resumePath: "/resume/Apan-Datta-Resume.pdf", // Ensure this file exists in public/resume/
  
  aboutCards: [
    {
      title: "B.Tech / Electronics Engineering",
      subtitle: "Current Education"
    },
    {
      title: "Web Development • Cybersecurity • Electronics",
      subtitle: "Interests"
    },
    {
      title: "Learning • Building • Experimenting",
      subtitle: "Focus"
    }
  ]
};

export type SkillCategory = "Comfortable With" | "Familiar With" | "Currently Learning" | "Areas of Interest";

export interface Skill {
  name: string;
}

export const skillsData: Record<SkillCategory, Skill[]> = {
  "Comfortable With": [
    { name: "Python" },
    { name: "JavaScript" },
    { name: "HTML/CSS" },
  ],
  "Familiar With": [
    { name: "TypeScript" },
    { name: "C/C++" },
    { name: "React" },
    { name: "Git" },
    { name: "Linux" },
  ],
  "Currently Learning": [
    { name: "Next.js" },
    { name: "Full-Stack Web Development" },
    { name: "Backend Development" },
    { name: "Cloud & Deployment" },
  ],
  "Areas of Interest": [
    { name: "Cybersecurity" },
    { name: "Web Development" },
    { name: "Electronics" },
    { name: "Software" },
    { name: "3D / Blender" },
  ]
};

export interface Education {
  degree: string;
  institution: string;
  date: string;
  description?: string;
}

export const educationData: Education[] = [
  {
    degree: "B.Tech / Electronics Engineering",
    institution: "CGEC",
    date: "2021 - Present",
  }
];

export interface Experience {
  role: string;
  organization: string;
  date: string;
  description: string;
  responsibilities?: string[];
  technologies?: string[];
  keyLearning?: string;
}

export const experienceData: Experience[] = [
  // Example of a real entry structure. Uncomment and fill with real data.
  /*
  {
    role: "YOUR_POSITION_HERE",
    organization: "YOUR_COMPANY_HERE",
    date: "YOUR_DATES_HERE",
    description: "YOUR_DESCRIPTION_HERE",
    responsibilities: [
      "Responsibility 1",
      "Responsibility 2"
    ],
    technologies: ["Tech 1", "Tech 2"],
    keyLearning: "Key learning outcome"
  }
  */
];

export interface Project {
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription?: string;
  problem?: string;
  solution?: string;
  features?: string[];
  category: "Web" | "Python" | "Cybersecurity" | "Electronics" | "Other";
  technologies: string[];
  image?: string;
  githubUrl?: string;
  liveUrl?: string;
  date?: string;
  status?: string;
  tags?: string[];
  featured?: boolean;
}

export const projectsData: Project[] = [
  // Example placeholder project. Replace with real projects.
  /*
  {
    slug: "portfolio-v2",
    title: "Portfolio Platform V2",
    shortDescription: "A modern futuristic portfolio and web lab platform.",
    fullDescription: "Detailed description here.",
    category: "Web",
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    image: "/projects/portfolio-v2.webp",
    githubUrl: "YOUR_GITHUB_URL_HERE",
    liveUrl: "YOUR_LIVE_URL_HERE",
    featured: true
  }
  */
];

export interface WebLabProject {
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription?: string;
  problem?: string;
  solution?: string;
  features?: string[];
  category: "Websites" | "Web Apps" | "Experiments" | "Tools" | "Other";
  technologies: string[];
  image?: string;
  screenshots?: string[];
  githubUrl?: string;
  liveUrl?: string;
  status: "Development" | "Completed" | "Archived" | "Planning";
  date: string;
  tags?: string[];
  featured?: boolean;
}

export const webLabData: WebLabProject[] = [
  // Example placeholder Web Lab project. Replace with real experiments.
  /*
  {
    slug: "modern-ecommerce",
    title: "Modern E-Commerce Experiment",
    category: "Web Apps",
    shortDescription: "A frontend e-commerce storefront experiment.",
    technologies: ["React", "Next.js", "Tailwind CSS"],
    status: "Development",
    date: "2024-03",
    githubUrl: "YOUR_GITHUB_URL_HERE",
    liveUrl: "YOUR_LIVE_URL_HERE",
    featured: true
  }
  */
];
