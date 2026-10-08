export interface Education {
  degree: string;
  institution: string;
  date: string;
  description?: string;
}

export const educationData: Education[] = [
  {
    degree: "B.Tech / Bachelor of Technology in Electronics Engineering",
    institution: "CGEC",
    date: "2021 - Present",
    description: "Focusing on embedded systems, microcontrollers, and modern software paradigms."
  }
];

export interface Experience {
  role: string;
  organization: string;
  date: string;
  description: string;
  technologies?: string[];
  achievements?: string[];
}

export const experienceData: Experience[] = [
  // Placeholder structure, add real experience here
  // {
  //   role: "Software Developer Intern",
  //   organization: "Tech Company",
  //   date: "Summer 2023",
  //   description: "Developed modern web interfaces and optimized backend processes.",
  //   technologies: ["React", "Python"],
  //   achievements: ["Improved load times by 20%"]
  // }
];
