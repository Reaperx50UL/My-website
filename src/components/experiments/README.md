# Web Lab Applications & Experiments Directory

Welcome to the **VOIDNOD Web Lab Experiments Directory** (`src/components/experiments/`).
This folder contains the source code for all interactive web applications, games, and tools embedded directly inside your website.

---

## 📂 Current Applications

### 1. **Scientific Calculator** (`scientific-calculator.tsx`)
- **Route**: [`/web-lab/scientific-calculator`](/web-lab/scientific-calculator)
- **Features**:
  - Full arithmetic and scientific math operations (Trigonometry: `sin`, `cos`, `tan`, Logarithms: `log`, `ln`, `e^x`, `10^x`, Powers: `x^y`, `√x`, `n!`).
  - Angle mode switching: **DEG** (Degrees) / **RAD** (Radians).
  - Memory buttons: `MC`, `MR`, `M+`, `M-`.
  - Expression history tape with click-to-recall.
  - One-click copy output to clipboard.
  - Full keyboard shortcuts (`0-9`, `+`, `-`, `*`, `/`, `Enter`, `Backspace`, `Escape`).
  - Glassmorphic neon LCD styling matching the VOIDNOD dark cosmic aesthetic.

### 2. **Cosmic Flappy Bird** (`flappy-bird.tsx`)
- **Route**: [`/web-lab/flappy-bird`](/web-lab/flappy-bird)
- **Features**:
  - 60 FPS HTML5 Canvas gravity and thrust physics loop.
  - Procedural cosmic starfield background and neon void energy pillars.
  - Futuristic quantum probe with engine exhaust particle trails.
  - Integrated Web Audio API synthesized sound effects (jump, point scored, crash) with mute/unmute toggle.
  - High score tracking saved persistently in browser `localStorage`.
  - Keyboard (`Spacebar`, `Up Arrow`, `P` to pause), mouse click, and mobile touch controls.

---

## 🛠️ How to Edit or Modify These Applications

- **To adjust the Calculator logic or UI**:
  Open `src/components/experiments/scientific-calculator.tsx`. You can add more scientific constants, change button layouts, or style colors in Tailwind.

- **To adjust Flappy Bird physics or graphics**:
  Open `src/components/experiments/flappy-bird.tsx`. You can tweak gravity (`GRAVITY = 0.42`), jump height (`JUMP_FORCE = -7.5`), pillar gaps (`PILLAR_GAP = 140`), or pillar speed (`PILLAR_SPEED = 2.4`).

---

## ➕ How to Add a New Web Application

1. **Create your component**:
   Create a new file in this folder, e.g. `src/components/experiments/my-new-app.tsx` with `"use client";`.
2. **Add metadata to `src/data/profile.ts`**:
   Add an entry to `webLabData`:
   ```ts
   {
     slug: "my-new-app",
     title: "My New Application",
     category: "Tools", // or "Experiments", "Web Apps"
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
