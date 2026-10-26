"use client";

import React, { useState } from 'react';
import { ScientificCalculator as CalculatorConsole } from './calculator/ScientificCalculator';
import { Keyboard, X } from 'lucide-react';

export function ScientificCalculator() {
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  return (
    <div className="w-full max-w-[1536px] mx-auto text-slate-100 relative">
      {/* Workspace Header Toolbar */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Scientific Calculator &amp; Symbolic Calculus Workstation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            High-precision expression evaluation, symbolic differentiation &amp; integration,
            Adaptive Simpson quadrature, and asymptote-aware function plotting.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-mono text-slate-400 whitespace-nowrap">
            <span>Precision: 64-bit IEEE 754</span>
            <span aria-hidden="true"> · </span>
            <span>Parser: AST Validated</span>
          </div>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-100 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
            <span>Keyboard Guide</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Engineering Console */}
      <CalculatorConsole />

      {/* Concise Technical Reference Strip */}
      <section
        id="calculus-guide"
        aria-label="Mathematical syntax and conventions reference"
        className="w-full mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400"
      >
        <div>
          <h3 className="text-slate-200 font-semibold mb-1.5">
            Supported Functions &amp; Constants
          </h3>
          <p className="leading-relaxed">
            Trigonometric (<code className="font-mono text-slate-300">sin, cos, tan, asin, acos, atan</code>),
            hyperbolic (<code className="font-mono text-slate-300">sinh, cosh, tanh</code>),
            logarithmic (<code className="font-mono text-slate-300">ln, log, log2</code>), roots
            (<code className="font-mono text-slate-300">sqrt, cbrt</code>), factorials (
            <code className="font-mono text-slate-300">n!</code>), absolute value (
            <code className="font-mono text-slate-300">abs(x)</code> or{' '}
            <code className="font-mono text-slate-300">|x|</code>), modulo (
            <code className="font-mono text-slate-300">a mod b</code>), and constants{' '}
            <code className="font-mono text-slate-300">π, e, Ans</code>.
          </p>
        </div>

        <div>
          <h3 className="text-slate-200 font-semibold mb-1.5">
            Calculus &amp; Radian Convention
          </h3>
          <p className="leading-relaxed">
            Symbolic differentiation and integration use a client-side Computer Algebra System
            (Nerdamer CAS) paired with Adaptive Simpson&apos;s rule for numerical definite
            integrals. All calculus operations follow standard radian convention.
          </p>
        </div>

        <div>
          <h3 className="text-slate-200 font-semibold mb-1.5">
            Discontinuity-Aware Plotting
          </h3>
          <p className="leading-relaxed">
            The function plotter samples across configurable <code className="font-mono text-slate-300">[xMin, xMax]</code>{' '}
            intervals and automatically detects poles and jump discontinuities (such as{' '}
            <code className="font-mono text-slate-300">1/x</code> or{' '}
            <code className="font-mono text-slate-300">tan(x)</code>) without drawing false
            asymptote lines.
          </p>
        </div>
      </section>

      {/* Keyboard Shortcuts Dialog */}
      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-[#0F1624] border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="shortcuts-modal-title" className="text-sm font-semibold text-slate-100">
                Keyboard Controls &amp; Syntax
              </h2>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close keyboard guide"
                className="p-1 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Evaluate expression</span>
                <kbd className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Enter / =</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Delete character</span>
                <kbd className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Backspace</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">All Clear (AC)</span>
                <kbd className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Escape</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Operators &amp; Powers</span>
                <kbd className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">+ - * / ^ % !</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Direct Function Typing</span>
                <kbd className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">sin(pi/2), sqrt(16), ln(e)</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
