export interface Skill {
  name: string;
  level: "Learning" | "Familiar" | "Proficient";
}

export interface SkillCategory {
  category: string;
  skills: Skill[];
}

export const skillsData: SkillCategory[] = [
  {
    category: "Programming",
    skills: [
      { name: "Python", level: "Proficient" },
      { name: "JavaScript", level: "Proficient" },
      { name: "TypeScript", level: "Familiar" },
      { name: "C/C++", level: "Familiar" },
    ],
  },
  {
    category: "Web Development",
    skills: [
      { name: "HTML", level: "Proficient" },
      { name: "CSS", level: "Proficient" },
      { name: "React", level: "Familiar" },
      { name: "Next.js", level: "Learning" },
    ],
  },
  {
    category: "Tools",
    skills: [
      { name: "Git", level: "Proficient" },
      { name: "GitHub", level: "Proficient" },
      { name: "VS Code", level: "Proficient" },
      { name: "Linux", level: "Familiar" },
    ],
  },
  {
    category: "Areas of Interest",
    skills: [
      { name: "Cybersecurity", level: "Learning" },
      { name: "Web Development", level: "Proficient" },
      { name: "Electronics", level: "Proficient" },
      { name: "3D / Technology", level: "Familiar" },
    ],
  }
];
