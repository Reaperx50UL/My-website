# Web Lab Applications & Experiments Directory

Welcome to the **VOIDNOD Web Lab Experiments Directory** (`src/components/experiments/`).
This folder contains the source code for all interactive web applications, games, and tools embedded directly inside your website.

---

## 📂 Current Applications

### 1. **Quantum Scientific Calculator** (`scientific-calculator.tsx`, `calculator/`)
- **Route**: [`/web-lab/scientific-calculator`](/web-lab/scientific-calculator)
- **Features**:
  - Full arithmetic and scientific math operations (Trigonometry: `sin`, `cos`, `tan`, Logarithms: `log`, `ln`, `e^x`, `10^x`, Powers: `x^y`, `√x`, `n!`).
  - Symbolic and numerical calculus workbench (Differentiation, Indefinite/Definite Integrals with step explanations, domain notes, and poles verification).
  - Angle mode switching: **DEG** (Degrees) / **RAD** (Radians).
  - Interactive multi-category Unit Converter (Length, Mass).
  - Memory buttons: `MC`, `MR`, `M+`, `M-`.
  - Expression history tape with click-to-recall.
  - One-click copy output to clipboard.
  - Full keyboard shortcuts (`0-9`, `+`, `-`, `*`, `/`, `Enter`, `Backspace`, `Escape`).
  - Glassmorphic neon LCD styling matching the VOIDNOD dark cosmic aesthetic.

### 2. **Aether Glider: Clockwork Sky Trials** (`aether-glider/`)
- **Route**: [`/web-lab/aether-glider`](/web-lab/aether-glider)
- **Features**:
  - 60 FPS HTML5 Canvas clockwork flight engine with responsive flap and glide physics.
  - 4 Aviators with signature active abilities (Aether Shield, Gale Dash, Solar Pulse, Time Dilation).
  - 5 Sky Realms with dynamic hazards (Piston Gears, Crosswind Vortex, Magma Geysers, Falling Icicles, Pulse Lasers).
  - Global and per-realm persistent leaderboard with callsign validation and rank tiers.
  - Procedural Web Audio API sound synthesis and ambient soundtrack with mute support.
  - Configurable physics tuning and medal tier rewards.

### 3. **Ludo Royale — Grandmaster Tabletop Edition** (`ludo-royale/`)
- **Route**: [`/web-lab/ludo-royale`](/web-lab/ludo-royale)
- **Features**:
  - Authoritative 15×15 grandmaster tabletop board with official 52-track ruleset.
  - Play Against AI with 3 tactical difficulty settings (Easy, Medium, Hard).
  - Local pass-and-play for 2–4 players with customizable names and mixed bot rosters.
  - Private rooms with room codes, bot additions, and online matchmaking.
  - Serverless Upstash Redis durable room state and Server-Sent Events (SSE) live updates.
  - 6 customizable board themes, 6 3D dice styles, procedural audio synthesis, and stats progression.

---

## 🛠️ How to Add a New Web Application

1. **Create your component**:
   Create a new folder or file in this directory, e.g. `src/components/experiments/my-new-app/` with `"use client";`.
2. **Add metadata to `src/data/profile.ts`**:
   Add an entry to `webLabData`:
   ```ts
   {
     slug: "my-new-app",
     title: "My New Application",
     category: "Web Apps", // or "Tools", "Experiments"
     shortDescription: "...",
     fullDescription: "...",
     features: [...],
     technologies: ["React", "TypeScript", ...],
     status: "Completed",
     date: "2026-10",
     featured: true
   }
   ```
3. **Mount the component in `src/app/web-lab/[slug]/page.tsx`**:
   Import your component and render it conditionally when `project.slug === "my-new-app"`.
