import {
  Award,
  BookOpen,
  Bot,
  Globe,
  Play,
  RotateCcw,
  Settings,
  UserCheck,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { AVATAR_OPTIONS, COLOR_META } from '../../game/constants';
import { GameState, PlayerStats, UserProfile } from '../../game/gameTypes';
import { calculatePlayerLevel } from '../../game/progression';

interface MainMenuProps {
  profile: UserProfile;
  stats: PlayerStats;
  savedGame: GameState | null;
  onQuickPlay: () => void;
  onResumeGame: () => void;
  onOpenSetup: (mode: 'ai' | 'local') => void;
  onOpenOnlineRoom: () => void;
  onOpenMatchmaking: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  stats,
  savedGame,
  onQuickPlay,
  onResumeGame,
  onOpenSetup,
  onOpenOnlineRoom,
  onOpenMatchmaking,
  onOpenRules,
  onOpenStats,
  onOpenSettings,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const avatarIcon =
    AVATAR_OPTIONS.find((a) => a.id === profile.avatar)?.icon || '👑';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx * 10, y: -ny * 10 });
  };

  return (
    <main
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative h-[100dvh] w-full bg-[#0B101E] text-slate-100 flex flex-col justify-between px-3.5 py-3 sm:px-6 sm:py-5 lg:px-10 lg:py-7 overflow-hidden select-none"
    >
      {/* Subtle Radial Tabletop Illumination */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 68% 45%, rgba(245, 158, 11, 0.11) 0%, rgba(59, 130, 246, 0.08) 38%, rgba(11, 16, 30, 0.98) 78%)',
        }}
      />

      {/* Top Utility Row: Player Profile Trigger & Utility Modals (Fits 390px without overflow) */}
      <div className="relative z-10 flex items-center justify-between gap-2 max-w-7xl w-full mx-auto shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Edit Player Profile and Settings"
          className="flex items-center gap-2.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer min-w-0"
        >
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-base sm:text-lg shrink-0">
            {avatarIcon}
          </span>
          <div className="text-left min-w-0">
            <div className="text-xs sm:text-sm font-bold text-slate-100 leading-tight truncate max-w-[110px] sm:max-w-[160px]">
              {profile.nickname}
            </div>
            <div className="text-[10px] sm:text-xs text-amber-400 font-mono-tabular whitespace-nowrap">
              Lv. {calculatePlayerLevel(profile.experiencePoints).level} · {profile.wins}W · {stats.totalGames}G
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenRules}
            aria-label="How to Play"
            className="flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">How to Play</span>
            <span className="sm:hidden">Rules</span>
          </button>

          <button
            type="button"
            onClick={onOpenStats}
            aria-label="Statistics"
            className="flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Statistics</span>
            <span className="sm:hidden">Stats</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Main Center Stage: Adaptive for Mobile Portrait, Mobile Landscape, Tablet Portrait, and Desktop */}
      <div className="relative z-10 max-w-7xl w-full mx-auto my-auto grid grid-cols-1 landscape:grid-cols-12 lg:grid-cols-12 gap-3 sm:gap-5 landscape:max-lg:gap-4 lg:gap-10 items-center">
        {/* Left / Main Action Column */}
        <div className="landscape:col-span-8 lg:col-span-7 flex flex-col items-start gap-2.5 sm:gap-4 landscape:max-lg:gap-2">
          {/* Custom Inline SVG Emblem, Title Lockup & Inline Landscape CTA */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <svg
                viewBox="0 0 88 88"
                className="w-11 h-11 sm:w-14 sm:h-14 landscape:max-lg:w-10 landscape:max-lg:h-10 lg:w-20 lg:h-20 shrink-0"
                role="img"
                aria-label="Ludo Royale Emblem"
              >
                <defs>
                  <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                </defs>
                <rect
                  x="6"
                  y="6"
                  width="76"
                  height="76"
                  rx="20"
                  fill="#0F172A"
                  stroke="url(#crestGold)"
                  strokeWidth="4"
                />
                <rect x="14" y="14" width="24" height="24" rx="6" fill="#EF4444" />
                <rect x="50" y="14" width="24" height="24" rx="6" fill="#10B981" />
                <rect x="50" y="50" width="24" height="24" rx="6" fill="#F59E0B" />
                <rect x="14" y="50" width="24" height="24" rx="6" fill="#3B82F6" />
                <circle
                  cx="44"
                  cy="44"
                  r="15"
                  fill="#0F172A"
                  stroke="url(#crestGold)"
                  strokeWidth="3"
                />
                <path
                  d="M 35 49 L 33 38 L 39 43 L 44 35 L 49 43 L 55 38 L 53 49 Z"
                  fill="url(#crestGold)"
                />
              </svg>

              <div className="min-w-0">
                <h1
                  className="font-display font-extrabold tracking-tight text-white leading-none truncate"
                  style={{
                    fontSize: 'clamp(1.45rem, 3.4vw, 3.5rem)',
                  }}
                >
                  LUDO ROYALE
                </h1>
                <p className="text-[11px] sm:text-xs lg:text-base text-slate-400 font-medium mt-0.5 truncate">
                  Grandmaster Tabletop Strategy · Official 52-Track Ruleset
                </p>
              </div>
            </div>
          </div>

          {/* Primary Start CTA & Optional Resume Saved Game */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full">
            <button
              type="button"
              data-start="true"
              onClick={onQuickPlay}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 sm:px-7 sm:py-3 landscape:max-lg:py-2 landscape:max-lg:px-5 lg:py-3.5 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display font-extrabold text-sm sm:text-base lg:text-lg tracking-wide shadow-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
              style={{
                boxShadow: '0 10px 26px -6px rgba(245, 158, 11, 0.45)',
              }}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
              <span>Play Now</span>
            </button>

            {savedGame && (
              <button
                type="button"
                onClick={onResumeGame}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 landscape:max-lg:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-display font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resume (Turn {savedGame.turnNumber})</span>
              </button>
            )}
          </div>

          {/* 4 Game Mode Selection Cards — 2x2 Grid on ALL viewports */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 landscape:max-lg:gap-2 w-full">
            <button
              type="button"
              onClick={() => onOpenSetup('ai')}
              className="group flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 landscape:max-lg:p-2.5 lg:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 landscape:max-lg:w-8 landscape:max-lg:h-8 lg:w-11 lg:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs sm:text-sm lg:text-base text-slate-100 truncate">
                  Play Against AI
                </div>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1 lg:line-clamp-2">
                  Battle 1–3 tactical bots (Easy, Medium, Hard).
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenSetup('local')}
              className="group flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 landscape:max-lg:p-2.5 lg:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 landscape:max-lg:w-8 landscape:max-lg:h-8 lg:w-11 lg:h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs sm:text-sm lg:text-base text-slate-100 truncate">
                  Local Multiplayer
                </div>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1 lg:line-clamp-2">
                  Pass-and-play for 2–4 players on one screen.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenOnlineRoom}
              className="group flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 landscape:max-lg:p-2.5 lg:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800 hover:border-sky-500/50 text-left transition-all cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 landscape:max-lg:w-8 landscape:max-lg:h-8 lg:w-11 lg:h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs sm:text-sm lg:text-base text-slate-100 truncate">
                  Play With Friends
                </div>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1 lg:line-clamp-2">
                  Private room codes with live synced turns.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenMatchmaking}
              className="group flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 landscape:max-lg:p-2.5 lg:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-slate-800 hover:border-rose-500/50 text-left transition-all cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 landscape:max-lg:w-8 landscape:max-lg:h-8 lg:w-11 lg:h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs sm:text-sm lg:text-base text-slate-100 truncate">
                  Matchmaking
                </div>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1 lg:line-clamp-2">
                  Queue into live public matches online.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive 3D Cosmic Galaxy Board Showcase */}
        <div className="hidden sm:flex landscape:flex lg:flex landscape:col-span-4 lg:col-span-5 items-center justify-center">
          <div
            className="relative w-full max-w-[200px] md:max-w-[240px] landscape:max-lg:max-w-[175px] lg:max-w-[360px] aspect-square rounded-3xl p-2.5 lg:p-4 bg-[#070B18] border border-slate-700/80 ludo-3d-chassis transition-transform duration-200 ease-out"
            style={{
              transform: `perspective(900px) rotateY(${tilt.x - 6}deg) rotateX(${tilt.y + 8}deg)`,
            }}
          >
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full rounded-2xl overflow-hidden"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="menuBhHalo" cx="50%" cy="50%" r="50%">
                  <stop offset="30%" stopColor="#000000" />
                  <stop offset="58%" stopColor="#F59E0B" />
                  <stop offset="78%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="rgba(6,4,20,0)" />
                </radialGradient>
              </defs>
              <rect width="400" height="400" fill="#060916" />

              {/* Ruby Reactor (Top-Left) */}
              <rect x="10" y="10" width="144" height="144" rx="16" fill="#2A0510" stroke="#E11D48" strokeWidth="2" />
              <circle cx="82" cy="82" r="60" fill="#130207" stroke="#F59E0B" strokeWidth="2" />
              <circle cx="82" cy="82" r="48" fill="#3B0414" stroke="#FB7185" strokeWidth="1" strokeDasharray="8 4" />
              <circle cx="62" cy="62" r="12" fill="#040711" stroke="#FB7185" strokeWidth="1.5" />
              <circle cx="102" cy="62" r="12" fill="#040711" stroke="#FB7185" strokeWidth="1.5" />
              <circle cx="62" cy="102" r="12" fill="#040711" stroke="#FB7185" strokeWidth="1.5" />
              <circle cx="102" cy="102" r="12" fill="#040711" stroke="#FB7185" strokeWidth="1.5" />
              <circle cx="62" cy="60" r="7" fill="#FB7185" />
              <circle cx="102" cy="60" r="7" fill="#FB7185" />
              <circle cx="62" cy="100" r="7" fill="#FB7185" />
              <circle cx="102" cy="100" r="7" fill="#FB7185" />

              {/* Emerald Sanctuary (Top-Right) */}
              <rect x="246" y="10" width="144" height="144" rx="16" fill="#032219" stroke="#10B981" strokeWidth="2" />
              <circle cx="318" cy="82" r="60" fill="#02130E" stroke="#6EE7B7" strokeWidth="2" />
              <circle cx="318" cy="82" r="48" fill="#052E22" stroke="#34D399" strokeWidth="1" strokeDasharray="8 4" />
              <circle cx="298" cy="62" r="12" fill="#040711" stroke="#34D399" strokeWidth="1.5" />
              <circle cx="338" cy="62" r="12" fill="#040711" stroke="#34D399" strokeWidth="1.5" />
              <circle cx="298" cy="102" r="12" fill="#040711" stroke="#34D399" strokeWidth="1.5" />
              <circle cx="338" cy="102" r="12" fill="#040711" stroke="#34D399" strokeWidth="1.5" />
              <circle cx="298" cy="60" r="7" fill="#34D399" />
              <circle cx="338" cy="60" r="7" fill="#34D399" />
              <circle cx="298" cy="100" r="7" fill="#34D399" />
              <circle cx="338" cy="100" r="7" fill="#34D399" />

              {/* Solar Forge (Bottom-Right) */}
              <rect x="246" y="246" width="144" height="144" rx="16" fill="#301302" stroke="#F59E0B" strokeWidth="2" />
              <circle cx="318" cy="318" r="60" fill="#170801" stroke="#FDE68A" strokeWidth="2" />
              <circle cx="318" cy="318" r="48" fill="#451A03" stroke="#FBBF24" strokeWidth="1" strokeDasharray="8 4" />
              <circle cx="298" cy="298" r="12" fill="#040711" stroke="#FBBF24" strokeWidth="1.5" />
              <circle cx="338" cy="298" r="12" fill="#040711" stroke="#FBBF24" strokeWidth="1.5" />
              <circle cx="298" cy="338" r="12" fill="#040711" stroke="#FBBF24" strokeWidth="1.5" />
              <circle cx="338" cy="338" r="12" fill="#040711" stroke="#FBBF24" strokeWidth="1.5" />
              <circle cx="298" cy="296" r="7" fill="#FBBF24" />
              <circle cx="338" cy="296" r="7" fill="#FBBF24" />
              <circle cx="298" cy="336" r="7" fill="#FBBF24" />
              <circle cx="338" cy="336" r="7" fill="#FBBF24" />

              {/* Sapphire Core (Bottom-Left) */}
              <rect x="10" y="246" width="144" height="144" rx="16" fill="#09193D" stroke="#3B82F6" strokeWidth="2" />
              <circle cx="82" cy="318" r="60" fill="#040C21" stroke="#BAE6FD" strokeWidth="2" />
              <circle cx="82" cy="318" r="48" fill="#10275C" stroke="#38BDF8" strokeWidth="1" strokeDasharray="8 4" />
              <circle cx="62" cy="298" r="12" fill="#040711" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="102" cy="298" r="12" fill="#040711" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="62" cy="338" r="12" fill="#040711" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="102" cy="338" r="12" fill="#040711" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="62" cy="296" r="7" fill="#38BDF8" />
              <circle cx="102" cy="296" r="7" fill="#38BDF8" />
              <circle cx="62" cy="336" r="7" fill="#38BDF8" />
              <circle cx="102" cy="336" r="7" fill="#38BDF8" />

              {/* Beveled Track Arms */}
              <rect x="160" y="10" width="80" height="144" rx="8" fill="#141838" stroke="#312E81" strokeWidth="1.5" />
              <rect x="186" y="32" width="28" height="120" rx="4" fill="#065F46" stroke="#34D399" strokeWidth="1.2" />

              <rect x="160" y="246" width="80" height="144" rx="8" fill="#141838" stroke="#312E81" strokeWidth="1.5" />
              <rect x="186" y="248" width="28" height="120" rx="4" fill="#1E3A8A" stroke="#38BDF8" strokeWidth="1.2" />

              <rect x="10" y="160" width="144" height="80" rx="8" fill="#141838" stroke="#312E81" strokeWidth="1.5" />
              <rect x="32" y="186" width="120" height="28" rx="4" fill="#881337" stroke="#FB7185" strokeWidth="1.2" />

              <rect x="246" y="160" width="144" height="80" rx="8" fill="#141838" stroke="#312E81" strokeWidth="1.5" />
              <rect x="248" y="186" width="120" height="28" rx="4" fill="#78350F" stroke="#FBBF24" strokeWidth="1.2" />

              {/* Central Black Hole Reactor */}
              <polygon points="158,158 200,200 158,242" fill="#881337" />
              <polygon points="158,158 200,200 242,158" fill="#064E3B" />
              <polygon points="242,158 200,200 242,242" fill="#78350F" />
              <polygon points="158,242 200,200 242,242" fill="#1E3A8A" />
              <circle cx="200" cy="200" r="32" fill="#0F172A" stroke="#A855F7" strokeWidth="2.5" />
              <circle cx="200" cy="200" r="27" fill="url(#menuBhHalo)" />
              <g transform="translate(200, 200)">
                <g className="animate-orbit-cw">
                  <ellipse cx="0" cy="0" rx="24" ry="13" transform="rotate(-25)" fill="none" stroke="#FEF08A" strokeWidth="2.5" />
                  <ellipse cx="0" cy="0" rx="20" ry="11" transform="rotate(35)" fill="none" stroke="#38BDF8" strokeWidth="2" />
                </g>
              </g>
              <circle cx="200" cy="200" r="11" fill="#010104" stroke="#FDE047" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Flat Borderless Control Hint Line */}
      <div className="relative z-10 max-w-7xl w-full mx-auto flex items-center justify-between gap-2 pt-2 border-t border-slate-900 text-[11px] sm:text-xs text-slate-400 shrink-0">
        <span className="truncate">
          Space Roll Dice · 1–4 Move Token · P Pause · M Mute
        </span>
        <span className="hidden md:inline font-mono-tabular whitespace-nowrap">
          52-Square Standard Perimeter · Exact-Roll Home Stretch
        </span>
      </div>
    </main>
  );
};
