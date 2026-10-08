# Apan Datta - Modern Portfolio & Web Lab Platform

A highly polished, futuristic, and professional personal website and experimental Web Lab platform. Built with Next.js, React, TypeScript, and Tailwind CSS.

## 🚀 Setup & Installation

**Prerequisite:** Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

1. Open a terminal in this project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Architecture & Content Management

The platform is designed with a scalable architecture, separating data from UI components.

To update your information, simply edit the files in the `src/data/` directory:

- `src/data/portfolio.ts`: Personal info, bio, and social links.
- `src/data/skills.ts`: Technical skills and categories.
- `src/data/history.ts`: Education and Experience timelines.
- `src/data/projects.ts`: Your main projects and Web Lab experiments.

### Future Backend Readiness

The architecture is built to support a future migration to a database-driven backend. The `src/data/` structures closely mirror what a typical database schema would look like. 

An `/admin` route placeholder has been established for future backend integration (Authentication, Database, Content Management).

## 🎨 Design System

The visual identity is defined in:
- `tailwind.config.ts`: Colors, animations, typography.
- `src/app/globals.css`: Base layer, CSS variables, glassmorphism utilities, and grid patterns.

## 📄 Resume & Assets

Place your resume PDF file as `resume.pdf` in the `public/` directory so the download links work correctly.

Add project images and thumbnails to the `public/` directory and reference their paths in the data files (e.g., `/project-thumbnail.png`).
