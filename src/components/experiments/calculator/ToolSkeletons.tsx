"use client";

import React from 'react';
import { Sigma, Activity, Grid } from 'lucide-react';
import { CalculatorLoadingIndicator } from './CalculatorLoadingIndicator';

export const CalculusPanelSkeleton: React.FC = () => {
  return (
    <div
      aria-busy="true"
      className="flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sigma className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Calculus Engine
          </span>
          <span className="text-xs text-slate-400 font-mono">
            · Symbolic CAS
          </span>
        </div>
      </div>

      {/* Body with status indicator and matching skeleton structure */}
      <div className="p-4 sm:p-5 space-y-4">
        <CalculatorLoadingIndicator
          stage="Preparing calculus tools"
          delayMs={150}
        />

        {/* Subtle skeleton placeholders */}
        <div className="space-y-3 opacity-30 pointer-events-none" aria-hidden="true">
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-8 w-28 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-8 w-28 bg-slate-800/60 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 bg-slate-800/40 rounded-lg w-full" />
          <div className="h-20 bg-slate-800/30 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
};

export const GraphPlotterSkeleton: React.FC = () => {
  return (
    <div
      aria-busy="true"
      className="flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Function Plotter
          </span>
          <span className="text-xs text-slate-400 font-mono">
            · Coordinate Canvas
          </span>
        </div>
      </div>

      {/* Body with status indicator and matching skeleton structure */}
      <div className="p-4 sm:p-5 space-y-4">
        <CalculatorLoadingIndicator
          stage="Preparing graph"
          delayMs={150}
        />

        {/* Subtle skeleton canvas placeholder */}
        <div className="space-y-3 opacity-30 pointer-events-none" aria-hidden="true">
          <div className="flex gap-1.5">
            <div className="h-6 w-16 bg-slate-800/60 rounded-md" />
            <div className="h-6 w-16 bg-slate-800/60 rounded-md" />
            <div className="h-6 w-16 bg-slate-800/60 rounded-md" />
          </div>
          <div className="h-56 bg-slate-900/50 rounded-lg border border-slate-800/60 flex items-center justify-center">
            <div className="w-full h-px bg-slate-800/40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const MatrixCalculatorSkeleton: React.FC = () => {
  return (
    <div
      aria-busy="true"
      className="flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden shadow-sm flex-1"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Matrix Workbench
          </span>
          <span className="text-xs text-slate-400 font-mono">
            · Linear Algebra CAS
          </span>
        </div>
      </div>

      {/* Body with status indicator and matching skeleton structure */}
      <div className="p-4 sm:p-5 space-y-4">
        <CalculatorLoadingIndicator
          stage="Preparing matrix tools"
          delayMs={150}
        />

        {/* Subtle skeleton matrix grid placeholder */}
        <div className="space-y-3 opacity-30 pointer-events-none" aria-hidden="true">
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-slate-800/60 rounded-lg animate-pulse" />
          </div>
          <div className="h-32 bg-slate-800/40 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
};
