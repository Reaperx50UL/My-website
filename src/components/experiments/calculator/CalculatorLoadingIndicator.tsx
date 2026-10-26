"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export interface CalculatorLoadingIndicatorProps {
  stage?: string;
  delayMs?: number;
  className?: string;
  variant?: 'panel' | 'inline' | 'bar';
}

/**
 * Hook to manage loading indicator visibility:
 * - Only reveals if loading exceeds delayMs (default 150ms) to avoid flashing on fast loads.
 * - Tracks honest, live elapsed seconds ("Preparing calculus tools… 3s").
 * - Never fabricates fake percentages or countdowns.
 */
export function useDelayedLoading(isLoading: boolean, delayMs = 150) {
  const [shouldShow, setShouldShow] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null;
    let intervalTimer: NodeJS.Timeout | null = null;

    if (isLoading) {
      startTimeRef.current = Date.now();
      delayTimer = setTimeout(() => {
        setShouldShow(true);
        intervalTimer = setInterval(() => {
          const now = Date.now();
          const elapsed = Math.floor((now - startTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);
        }, 1000);
      }, delayMs);
    } else {
      setShouldShow(false);
      setElapsedSeconds(0);
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [isLoading, delayMs]);

  return { shouldShow, elapsedSeconds };
}

export const CalculatorLoadingIndicator: React.FC<CalculatorLoadingIndicatorProps> = ({
  stage = 'Preparing calculator',
  delayMs = 150,
  className = '',
  variant = 'panel',
}) => {
  const { shouldShow, elapsedSeconds } = useDelayedLoading(true, delayMs);

  if (!shouldShow) {
    return null;
  }

  const label = elapsedSeconds > 0 ? `${stage}… ${elapsedSeconds}s` : `${stage}…`;

  if (variant === 'inline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 text-xs font-mono text-cyan-300 ${className}`}
      >
        <span
          className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin motion-reduce:animate-none motion-reduce:border-cyan-400"
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`w-full space-y-1.5 ${className}`}
      >
        <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
          <span>{label}</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 w-1/3 rounded-full animate-indeterminate motion-reduce:animate-none motion-reduce:w-full"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  // Default 'panel' variant: polished card loader with indeterminate bar
  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-6 rounded-xl bg-[#0F1624] border border-slate-800/90 flex flex-col items-center justify-center text-center space-y-4 shadow-lg ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin motion-reduce:animate-none motion-reduce:border-cyan-400"
          aria-hidden="true"
        />
        <div
          className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-1 max-w-xs w-full">
        <p className="text-sm font-mono font-medium text-slate-200">
          {label}
        </p>
        <p className="text-[11px] font-mono text-slate-400">
          Initializing mathematical module
        </p>

        {/* Indeterminate animated progress bar */}
        <div
          className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mt-3 relative"
          aria-hidden="true"
        >
          <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-2/3 rounded-full animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
};

export interface CalculatorErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const CalculatorErrorFallback: React.FC<CalculatorErrorFallbackProps> = ({
  title = 'Initialization Failed',
  message = 'An error occurred while loading this mathematical tool.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-6 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-5 h-5" aria-hidden="true" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-rose-200">{title}</h3>
        <p className="text-xs text-rose-300/80 mt-1 max-w-sm">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 px-4 py-1.5 text-xs font-mono font-medium rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-rose-400"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry Loading</span>
        </button>
      )}
    </div>
  );
};
