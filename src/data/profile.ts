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
  {
    slug: "scientific-calculator",
    title: "Quantum Scientific Calculator",
    category: "Tools",
    shortDescription: "A high-precision scientific calculator with trigonometry, logarithms, power functions, and keyboard input support.",
    fullDescription: "A modern, futuristic web application designed for fast and accurate scientific calculations. Features standard arithmetic, advanced algebraic functions, trigonometric calculations (radians/degrees), exponential/logarithmic operations, memory storage, and full keyboard navigation in an interactive glassmorphic interface.",
    problem: "Most online scientific calculators are either cluttered with outdated UI designs or lack keyboard shortcuts and smooth visual feedback on mobile and desktop.",
    solution: "Engineered a streamlined, responsive scientific computation engine with an intuitive LCD expression parser, immediate syntax validation, and a cyberpunk terminal aesthetic that fits the VOIDNOD laboratory.",
    features: [
      "Standard and scientific arithmetic operations",
      "Trigonometric functions (sin, cos, tan, asin, acos, atan)",
      "Degree and Radian angle mode toggling",
      "Logarithmic (log10, ln) and exponential (e^x, 10^x) functions",
      "Power, square root, cube root, and factorial calculations",
      "Full desktop keyboard shortcut support and mobile touch controls",
      "Real-time expression history and answer memory recall",
      "Precision rounding and zero-division error handling",
      "Interactive unit converter for length and mass with multi-scale equivalents"
    ],
    technologies: ["React", "TypeScript", "Tailwind CSS", "Lucide Icons"],
    status: "Completed",
    date: "2026-10",
    tags: ["Calculator", "Math", "Tool", "Web App"],
    featured: true
  },
  {
    slug: "flappy-bird",
    title: "Cosmic Flappy Bird",
    category: "Experiments",
    shortDescription: "A retro arcade gravity-runner rebuilt in an interactive HTML5 canvas with neon particle physics and cosmic barriers.",
    fullDescription: "A high-performance 60fps arcade web game inspired by the classic Flappy Bird. Players pilot a futuristic quantum probe through shifting cosmic energy pillars and void rifts. Features responsive canvas physics, smooth velocity curves, trail particle systems, high-score persistence, and touch/keyboard controls.",
    problem: "Classic web arcade games often suffer from input latency, jerky frame rates on high-refresh monitors, and lack of visual polish on modern dark-mode screens.",
    solution: "Developed an optimized HTML5 Canvas game loop utilizing delta-time physics, dynamic difficulty pacing, particle trail emitters, and local storage state persistence.",
    features: [
      "Smooth 60 FPS HTML5 Canvas physics engine",
      "Responsive flight mechanics (Spacebar, Click, or Tap to flap)",
      "Dynamic procedural cosmic barrier generation",
      "Glowing particle trail and engine exhaust physics",
      "Local storage high score tracking and session bests",
      "Instant restart and pause capability",
      "Mobile-friendly touch screen controls"
    ],
    technologies: ["HTML5 Canvas", "React", "TypeScript", "Tailwind CSS"],
    status: "Completed",
    date: "2026-10",
    tags: ["Game", "Canvas", "Physics", "Arcade"],
    featured: true
  },
  {
    slug: "aether-glider",
    title: "Aether Glider: Clockwork Sky Trials",
    category: "Web Apps",
    shortDescription: "A polished brass-and-sky arcade flight game featuring clockwork aviators, signature sky realms, dynamic hazards, and procedural audio.",
    fullDescription: "A clockwork fantasy arcade flight simulator where players pilot steam-and-aether gliders through perilous celestial realms. Features distinct aviators with signature abilities (Aether Shield, Gale Dash, Solar Pulse, Time Dilation), treacherous sky realms with unique traps, configurable flight mechanics, procedural Web Audio synthesizers, and medal-based achievements.",
    problem: "Standard web flight games frequently lack mechanical depth, rich world-building, responsive tactile feedback, and accessible physics tuning for different player skill levels.",
    solution: "Engineered an illustrated 60fps clockwork flight engine using HTML5 Canvas, deterministic physics simulation, procedural synth audio, multi-aviator abilities, and custom tuning presets.",
    features: [
      "Clockwork flight physics with responsive flap and gliding mechanics",
      "4 Aviators with unique active abilities (Aether Shield, Gale Dash, Solar Pulse, Time Dilation)",
      "5 Sky Realms with dynamic hazards (Piston Gears, Crosswind Vortex, Magma Geysers, Falling Icicles, Pulse Lasers)",
      "3 Difficulty presets: Gentle Breeze, Standard, and Overclocked",
      "Procedural Web Audio soundtrack and sound effects with mute support",
      "Medal tier rewards and local best-run persistence",
      "Full keyboard shortcuts and responsive mobile touch controls"
    ],
    technologies: ["HTML5 Canvas", "React", "TypeScript", "Tailwind CSS", "Web Audio API"],
    status: "Completed",
    date: "2026-10",
    tags: ["Game", "Canvas", "Physics", "Arcade", "Audio"],
    featured: true
  },
  {
    slug: "ludo-royale",
    title: "Ludo Royale — Grandmaster Tabletop Edition",
    category: "Web Apps",
    shortDescription: "A competitive tabletop strategy web app featuring official 52-track rules, tactical AI bots, local pass-and-play, and online multiplayer.",
    fullDescription: "An authoritative grandmaster tabletop edition of classic Ludo. Features 15x15 board geometry, 52-square perimeter, exact-roll home stretch, safe zones, customizable house rules, 6 board themes, 6 3D dice styles, procedural audio synthesis, AI difficulty tiers (Easy, Medium, Hard), local pass-and-play, and live online multiplayer with room codes and matchmaking.",
    problem: "Traditional online Ludo web apps often suffer from intrusive ads, clunky animations, client-side outcome manipulation, and poor mobile/desktop responsive scaling.",
    solution: "Engineered a responsive, high-performance tabletop experience with deterministic game mechanics, server-authoritative turn validation, procedural Web Audio, 3D dice physics, and flexible local and online multiplayer modes.",
    features: [
      "Official 52-track ruleset with safe squares and exact-roll home stretch",
      "Play Against AI with 3 tactical difficulty tiers (Easy, Medium, Hard)",
      "Local pass-and-play for 2–4 players with customizable seat names and bots",
      "Online multiplayer with private room codes and public matchmaking",
      "Server-authoritative dice generation, move validation, and turn timer loops",
      "6 customizable board themes with unique 3D token styling and lighting",
      "6 physical 3D dice styles with custom pip geometries and rolling physics",
      "Procedural Web Audio API sound effects and ambient soundtrack",
      "Grandmaster progression system with XP, level progression, and stats tracking",
      "Color-blind token symbols, reduced motion mode, and keyboard shortcuts"
    ],
    technologies: ["React", "TypeScript", "Tailwind CSS", "Web Audio API", "WebSockets", "Vercel Serverless"],
    status: "Completed",
    date: "2026-10",
    tags: ["Game", "Strategy", "Tabletop", "Multiplayer", "AI", "WebSocket"],
    featured: true
  }
];
