"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { 
  Gamepad2, 
  RotateCcw, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface Pillar {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  passed: boolean;
}

export function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "GAMEOVER" | "PAUSED">("IDLE");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Audio Context (Web Audio API synthesizers)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Procedural Sound Effects
  const playSound = useCallback((type: "jump" | "score" | "crash") => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "jump") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "score") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "crash") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [getAudioContext, soundEnabled]);

  // Game internal mutable state refs for 60fps render loop
  const stateRef = useRef({
    gameState: "IDLE" as "IDLE" | "PLAYING" | "GAMEOVER" | "PAUSED",
    score: 0,
    birdY: 250,
    birdVelocity: 0,
    birdAngle: 0,
    pillars: [] as Pillar[],
    particles: [] as Particle[],
    stars: [] as Star[],
    frameCount: 0,
    lastPillarX: 400,
  });

  // Load high score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("voidnod_flappy_highscore");
      if (saved) {
        setHighScore(parseInt(saved, 10) || 0);
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  // Physics constants
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 560;
  const GRAVITY = 0.42;
  const JUMP_FORCE = -7.5;
  const PILLAR_WIDTH = 58;
  const PILLAR_GAP = 140;
  const PILLAR_SPEED = 2.4;
  const BIRD_RADIUS = 14;
  const BIRD_X = 85;

  // Initialize stars background
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.8 + 0.2,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    stateRef.current.stars = stars;
  }, []);

  // Jump Action
  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === "IDLE") {
      s.gameState = "PLAYING";
      s.birdY = CANVAS_HEIGHT / 2;
      s.birdVelocity = JUMP_FORCE;
      s.pillars = [];
      s.score = 0;
      s.lastPillarX = CANVAS_WIDTH;
      setScore(0);
      setGameState("PLAYING");
      playSound("jump");
    } else if (s.gameState === "PLAYING") {
      s.birdVelocity = JUMP_FORCE;
      playSound("jump");
      // Add engine burst particles
      for (let i = 0; i < 5; i++) {
        s.particles.push({
          x: BIRD_X - 12,
          y: s.birdY,
          vx: -(Math.random() * 3 + 2),
          vy: (Math.random() - 0.5) * 3,
          size: Math.random() * 3 + 2,
          alpha: 1,
          color: Math.random() > 0.4 ? "#06b6d4" : "#818cf8",
        });
      }
    } else if (s.gameState === "GAMEOVER") {
      s.gameState = "PLAYING";
      s.birdY = CANVAS_HEIGHT / 2;
      s.birdVelocity = JUMP_FORCE;
      s.pillars = [];
      s.score = 0;
      s.particles = [];
      s.lastPillarX = CANVAS_WIDTH;
      setScore(0);
      setGameState("PLAYING");
      playSound("jump");
    }
  }, [playSound, JUMP_FORCE]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        triggerJump();
      } else if (e.code === "KeyP") {
        const s = stateRef.current;
        if (s.gameState === "PLAYING") {
          s.gameState = "PAUSED";
          setGameState("PAUSED");
        } else if (s.gameState === "PAUSED") {
          s.gameState = "PLAYING";
          setGameState("PLAYING");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerJump]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Deep Space Background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGradient.addColorStop(0, "#030712");
      bgGradient.addColorStop(0.5, "#0b0f19");
      bgGradient.addColorStop(1, "#020617");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield parallax
      for (const star of s.stars) {
        if (s.gameState === "PLAYING") {
          star.x -= star.speed;
          if (star.x < 0) {
            star.x = CANVAS_WIDTH;
            star.y = Math.random() * CANVAS_HEIGHT;
          }
        }
        ctx.fillStyle = `rgba(186, 230, 253, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle cosmic grid lines
      ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
      ctx.lineWidth = 1;
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // 2. Physics & State Updating
      if (s.gameState === "PLAYING") {
        s.frameCount++;
        s.birdVelocity += GRAVITY;
        s.birdY += s.birdVelocity;

        // Smooth angle rotation
        s.birdAngle = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, s.birdVelocity * 0.06));

        // Trail particles
        if (s.frameCount % 2 === 0) {
          s.particles.push({
            x: BIRD_X - 10,
            y: s.birdY,
            vx: -Math.random() * 2 - 1,
            vy: (Math.random() - 0.5) * 1.5,
            size: Math.random() * 2.5 + 1,
            alpha: 0.8,
            color: Math.random() > 0.5 ? "#22d3ee" : "#a855f7",
          });
        }

        // Spawn Pillars
        if (s.pillars.length === 0 || CANVAS_WIDTH - s.pillars[s.pillars.length - 1].x >= 180) {
          const minHeight = 60;
          const maxHeight = CANVAS_HEIGHT - PILLAR_GAP - minHeight;
          const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
          s.pillars.push({
            x: CANVAS_WIDTH,
            topHeight,
            bottomY: topHeight + PILLAR_GAP,
            width: PILLAR_WIDTH,
            passed: false,
          });
        }

        // Move Pillars & Collision Detection
        for (let i = s.pillars.length - 1; i >= 0; i--) {
          const p = s.pillars[i];
          p.x -= PILLAR_SPEED;

          // Check Score
          if (!p.passed && p.x + p.width < BIRD_X) {
            p.passed = true;
            s.score += 1;
            setScore(s.score);
            playSound("score");

            // Update high score
            if (s.score > highScore) {
              setHighScore(s.score);
              try {
                localStorage.setItem("voidnod_flappy_highscore", s.score.toString());
              } catch {
                // ignore
              }
            }
          }

          // Collision Check
          const birdBox = {
            left: BIRD_X - BIRD_RADIUS + 3,
            right: BIRD_X + BIRD_RADIUS - 3,
            top: s.birdY - BIRD_RADIUS + 3,
            bottom: s.birdY + BIRD_RADIUS - 3,
          };

          // Top pillar collision
          const collidesTop = 
            birdBox.right > p.x && 
            birdBox.left < p.x + p.width && 
            birdBox.top < p.topHeight;

          // Bottom pillar collision
          const collidesBottom = 
            birdBox.right > p.x && 
            birdBox.left < p.x + p.width && 
            birdBox.bottom > p.bottomY;

          if (collidesTop || collidesBottom) {
            s.gameState = "GAMEOVER";
            setGameState("GAMEOVER");
            playSound("crash");
          }

          // Cull off-screen pillars
          if (p.x + p.width < -10) {
            s.pillars.splice(i, 1);
          }
        }

        // Boundary Collision (Ceiling / Floor)
        if (s.birdY + BIRD_RADIUS >= CANVAS_HEIGHT - 10) {
          s.birdY = CANVAS_HEIGHT - 10 - BIRD_RADIUS;
          s.gameState = "GAMEOVER";
          setGameState("GAMEOVER");
          playSound("crash");
        }
        if (s.birdY - BIRD_RADIUS <= 5) {
          s.birdY = 5 + BIRD_RADIUS;
          s.birdVelocity = 0;
        }
      } else if (s.gameState === "IDLE") {
        // Floating hover motion
        s.frameCount++;
        s.birdY = CANVAS_HEIGHT / 2 + Math.sin(s.frameCount * 0.05) * 8;
        s.birdAngle = 0;
      }

      // 3. Render Cosmic Pillars
      for (const p of s.pillars) {
        // Top Pillar Body
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
        topGrad.addColorStop(0, "#083344");
        topGrad.addColorStop(0.5, "#0e7490");
        topGrad.addColorStop(1, "#083344");
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, 0, p.width, p.topHeight);

        // Top Pillar Glowing Cap
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(p.x - 2, p.topHeight - 8, p.width + 4, 8);
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x, 0, p.width, p.topHeight);
        ctx.shadowBlur = 0; // reset

        // Bottom Pillar Body
        const botHeight = CANVAS_HEIGHT - p.bottomY;
        const botGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
        botGrad.addColorStop(0, "#083344");
        botGrad.addColorStop(0.5, "#0e7490");
        botGrad.addColorStop(1, "#083344");
        ctx.fillStyle = botGrad;
        ctx.fillRect(p.x, p.bottomY, p.width, botHeight);

        // Bottom Pillar Glowing Cap
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(p.x - 2, p.bottomY, p.width + 4, 8);
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x, p.bottomY, p.width, botHeight);
        ctx.shadowBlur = 0; // reset
      }

      // 4. Update and Render Particle Trail
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.025;

        if (pt.alpha <= 0) {
          s.particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 5. Render Quantum Drone (Player)
      ctx.save();
      ctx.translate(BIRD_X, s.birdY);
      ctx.rotate(s.birdAngle);

      // Drone outer glow
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 15;

      // Drone Main Body (Sleek aerodynamic probe)
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit / Quantum Core
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Wing Accents
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 6);
      ctx.stroke();

      ctx.restore();

      // 6. Draw Floor Line (Grid horizon)
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - 10);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 10);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 7. HUD Score Overlay (While Playing)
      if (s.gameState === "PLAYING" || s.gameState === "PAUSED") {
        ctx.font = "bold 32px monospace";
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 8;
        ctx.fillText(s.score.toString(), CANVAS_WIDTH / 2, 60);
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [highScore, playSound]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center select-none">
      {/* Game Header Bar */}
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cyan-200 tracking-wider uppercase">
              COSMIC FLAPPY BIRD
            </h3>
            <span className="text-[10px] text-cyan-400/60 font-mono">QUANTUM DRIFT ENGINE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className="p-1.5 rounded-md bg-slate-900 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-xs"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Pause Toggle */}
          {gameState === "PLAYING" && (
            <button
              onClick={() => {
                stateRef.current.gameState = "PAUSED";
                setGameState("PAUSED");
              }}
              className="p-1.5 rounded-md bg-slate-900 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-xs"
              title="Pause Game (P)"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {gameState === "PAUSED" && (
            <button
              onClick={() => {
                stateRef.current.gameState = "PLAYING";
                setGameState("PLAYING");
              }}
              className="p-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all text-xs"
              title="Resume Game (P)"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Container */}
      <div 
        onClick={triggerJump}
        onTouchStart={(e) => {
          // Prevent scroll or double triggers on mobile touch screens
          if (e.cancelable) e.preventDefault();
          triggerJump();
        }}
        className="relative w-full aspect-[400/560] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] cursor-pointer bg-slate-950 touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block"
        />

        {/* State Overlay: IDLE (Start Screen) */}
        {gameState === "IDLE" && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Gamepad2 className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold font-mono text-cyan-100 tracking-tight mb-2">
              QUANTUM GLIDER
            </h2>
            <p className="text-xs font-mono text-cyan-400/70 max-w-[240px] mb-8 leading-relaxed">
              Navigate your probe through cosmic void pillars without collision.
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerJump();
              }}
              className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-sm tracking-wider uppercase hover:bg-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-95"
            >
              LAUNCH PROBE
            </button>

            <div className="mt-8 text-[11px] font-mono text-cyan-400/50 flex flex-col gap-1">
              <span>TAP SCREEN • PRESS SPACEBAR</span>
            </div>
          </div>
        )}

        {/* State Overlay: PAUSED */}
        {gameState === "PAUSED" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold font-mono text-cyan-200 tracking-wider mb-4">
              SYSTEM PAUSED
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stateRef.current.gameState = "PLAYING";
                setGameState("PLAYING");
              }}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-sm tracking-wider hover:bg-cyan-400 transition-all"
            >
              RESUME FLIGHT
            </button>
          </div>
        )}

        {/* State Overlay: GAME OVER */}
        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="text-rose-400 text-xs font-mono tracking-widest uppercase mb-1">
              CRITICAL FAILURE
            </div>
            <h2 className="text-3xl font-extrabold font-mono text-white tracking-tight mb-6">
              PROBE DESTROYED
            </h2>

            {/* Scorecard Box */}
            <div className="w-full max-w-[260px] p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 mb-6 font-mono space-y-3">
              <div className="flex justify-between items-center text-xs text-cyan-400/70 pb-2 border-b border-cyan-500/10">
                <span>SCORE</span>
                <span className="text-xl font-bold text-cyan-100">{score}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-amber-400/80">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  BEST
                </span>
                <span className="text-xl font-bold text-amber-300">{highScore}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerJump();
              }}
              className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-sm tracking-wider uppercase hover:bg-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-95 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              RE-LAUNCH PROBE
            </button>
          </div>
        )}
      </div>

      {/* Footer Info / High Score Pill */}
      <div className="w-full flex items-center justify-between mt-3 px-1 text-xs font-mono text-cyan-400/60">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400/80" />
          <span>RECORD: <strong className="text-cyan-200">{highScore}</strong></span>
        </div>
        <div>
          <span>SPACE / CLICK TO FLAP</span>
        </div>
      </div>
    </div>
  );
}
