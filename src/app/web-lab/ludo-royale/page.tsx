import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LudoRoyaleGame } from '@/components/experiments/ludo-royale';

export const metadata: Metadata = {
  title: 'Ludo Royale — Grandmaster Tabletop Edition | VOIDNOD Web Lab',
  description:
    'Play Ludo Royale: Grandmaster Tabletop Strategy with the official 52-track ruleset, tactical AI bots, local pass-and-play, and live online multiplayer.',
};

export default function LudoRoyalePage() {
  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden bg-[#0B101E] select-none">
      {/* Subtle, elegant back to Web Lab link revealing smoothly on hover/focus at top-left edge */}
      <Link
        href="/web-lab"
        className="fixed top-3 left-3 z-[110] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-amber-600/30 hover:border-amber-400 text-amber-300/70 hover:text-amber-100 text-xs font-mono tracking-wider transition-all shadow-lg backdrop-blur-md opacity-0 hover:opacity-100 focus-visible:opacity-100"
        title="Return to VOIDNOD Web Lab"
      >
        <ArrowLeft size={14} />
        <span>WEB LAB</span>
      </Link>
      <LudoRoyaleGame className="w-full h-full" />
    </div>
  );
}
