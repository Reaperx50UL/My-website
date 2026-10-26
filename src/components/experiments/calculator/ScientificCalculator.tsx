"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import {
  Calculator,
  Delete,
  Copy,
  Check,
  AlertCircle,
  Sigma,
  Activity,
  History,
  RotateCcw,
  TrendingUp,
  Grid,
} from 'lucide-react';
import {
  evaluateMathExpression,
  formatNumber,
  type AngleMode,
} from './utils/mathEngine';
import { HistoryPanel, type CalculationHistoryItem } from './HistoryPanel';
import { CalculatorLoadingIndicator } from './CalculatorLoadingIndicator';
import { CalculatorErrorBoundary } from './CalculatorErrorBoundary';
import {
  CalculusPanelSkeleton,
  GraphPlotterSkeleton,
  MatrixCalculatorSkeleton,
} from './ToolSkeletons';

const LazyCalculusPanel = React.lazy(() =>
  import('./CalculusPanel').then((mod) => ({ default: mod.CalculusPanel }))
);

const LazyGraphPlotter = React.lazy(() =>
  import('./GraphPlotter').then((mod) => ({ default: mod.GraphPlotter }))
);

const LazyMatrixCalculator = React.lazy(() =>
  import('./MatrixCalculator').then((mod) => ({ default: mod.MatrixCalculator }))
);

const HISTORY_STORAGE_KEY = 'voidnod_scientific_calc_history_v1';
const MEMORY_STORAGE_KEY = 'voidnod_scientific_calc_memory_v1';

const DEFAULT_SEED_HISTORY: CalculationHistoryItem[] = [
  {
    id: 'seed-1',
    expression: '2 + 3 × 4',
    result: '14',
    angleMode: 'RAD',
    timestamp: 1729890000000,
  },
  {
    id: 'seed-2',
    expression: 'sin(π/2)',
    result: '1',
    angleMode: 'RAD',
    timestamp: 1729890060000,
  },
];

export interface ScientificCalculatorProps {
  initialExpression?: string;
  initialAngleMode?: AngleMode;
  className?: string;
}

type MobileWorkspaceTab = 'calculator' | 'matrix' | 'calculus' | 'graph' | 'history';
type DesktopDeckFilter = 'all' | 'matrix' | 'calculus' | 'graph' | 'history';

export const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({
  initialExpression = '',
  initialAngleMode = 'RAD',
  className = '',
}) => {
  const [expression, setExpression] = useState<string>(initialExpression);
  const [displayResult, setDisplayResult] = useState<string>('0');
  const [ansValue, setAnsValue] = useState<number>(0);
  const [angleMode, setAngleMode] = useState<AngleMode>(initialAngleMode);
  const [isSecondMode, setIsSecondMode] = useState<boolean>(false);
  const [isHyperbolic, setIsHyperbolic] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState<boolean>(false);

  // Dynamic tool retry keys
  const [calculusRetryKey, setCalculusRetryKey] = useState<number>(0);
  const [graphRetryKey, setGraphRetryKey] = useState<number>(0);
  const [matrixRetryKey, setMatrixRetryKey] = useState<number>(0);

  // Engine readiness & active calculation states
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Memory state with safe localStorage persistence
  const [memoryValue, setMemoryValue] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(MEMORY_STORAGE_KEY);
        if (saved !== null) {
          const parsed = Number(saved);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
    } catch {
      // Safe fallback
    }
    return 0;
  });

  // Calculation history with safe localStorage persistence
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
      // Safe fallback
    }
    return DEFAULT_SEED_HISTORY;
  });

  // Graph expression state
  const [graphExpression, setGraphExpression] = useState<string>('sin(x)');

  // Mobile and Desktop layout tabs
  const [mobileTab, setMobileTab] = useState<MobileWorkspaceTab>('calculator');
  const [desktopDeckFilter, setDesktopDeckFilter] = useState<DesktopDeckFilter>('all');

  const expressionInputRef = useRef<HTMLInputElement | null>(null);

  // Check and warm up math engine readiness
  useEffect(() => {
    try {
      const probe = evaluateMathExpression('1+1', { angleMode: 'RAD' });
      if (probe.ok) {
        setIsEngineReady(true);
      } else {
        setIsEngineReady(true);
      }
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : 'Engine initialization failed');
    }
  }, []);

  // Persist history safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
      }
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }, [history]);

  // Persist memory safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(MEMORY_STORAGE_KEY, String(memoryValue));
      }
    } catch {
      // Ignore storage errors
    }
  }, [memoryValue]);

  // Live preview evaluation while typing
  const livePreview = useMemo(() => {
    const trimmed = expression.trim();
    if (!trimmed) return null;
    const res = evaluateMathExpression(trimmed, {
      angleMode,
      ans: ansValue,
    });
    if (res.ok && res.formatted !== undefined) {
      return res.formatted;
    }
    return null;
  }, [expression, angleMode, ansValue]);

  // Evaluate current expression and record to history
  const handleEvaluate = useCallback(() => {
    const trimmed = expression.trim();
    if (!trimmed) {
      setErrorMessage('Syntax Error: Enter an expression to evaluate');
      return;
    }

    setIsEvaluating(true);
    setTimeout(() => {
      try {
        const res = evaluateMathExpression(trimmed, {
          angleMode,
          ans: ansValue,
        });

        if (!res.ok || res.value === undefined || res.formatted === undefined) {
          setErrorMessage(res.error ?? 'Syntax Error: Invalid mathematical expression');
          return;
        }

        setErrorMessage(null);
        setDisplayResult(res.formatted);
        setAnsValue(res.value);

        const newItem: CalculationHistoryItem = {
          id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          expression: trimmed,
          result: res.formatted,
          angleMode,
          timestamp: Date.now(),
        };

        setHistory((prev) => [newItem, ...prev.slice(0, 49)]);
      } finally {
        setIsEvaluating(false);
      }
    }, 0);
  }, [expression, angleMode, ansValue]);

  // Insert token into expression line
  const insertToken = useCallback((token: string) => {
    setErrorMessage(null);
    setExpression((prev) => `${prev}${token}`);
  }, []);

  // Clear All (AC)
  const handleClearAll = useCallback(() => {
    setExpression('');
    setDisplayResult('0');
    setErrorMessage(null);
  }, []);

  // Backspace
  const handleBackspace = useCallback(() => {
    setErrorMessage(null);
    setExpression((prev) => prev.slice(0, -1));
  }, []);

  // Toggle sign (±)
  const handleToggleSign = useCallback(() => {
    setErrorMessage(null);
    setExpression((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return '-';
      if (trimmed.startsWith('-(') && trimmed.endsWith(')')) {
        return trimmed.slice(2, -1);
      }
      return `-(${trimmed})`;
    });
  }, []);

  // Memory actions
  const resolveCurrentNumericValue = (): number | null => {
    const fromResult = Number(displayResult);
    if (Number.isFinite(fromResult)) return fromResult;
    const evaluated = evaluateMathExpression(expression, { angleMode, ans: ansValue });
    if (evaluated.ok && evaluated.value !== undefined) return evaluated.value;
    return null;
  };

  const handleMemoryRecall = () => {
    setErrorMessage(null);
    const formattedMem = formatNumber(memoryValue);
    setExpression((prev) => {
      if (!prev) return formattedMem;
      const lastChar = prev.slice(-1);
      if (/[0-9.]/.test(lastChar)) {
        return `${prev} × ${formattedMem}`;
      }
      return `${prev}${formattedMem}`;
    });
  };

  const handleMemoryAdd = () => {
    const val = resolveCurrentNumericValue();
    if (val !== null) {
      setMemoryValue((prev) => prev + val);
      setDisplayResult(formatNumber(val));
    }
  };

  const handleMemorySubtract = () => {
    const val = resolveCurrentNumericValue();
    if (val !== null) {
      setMemoryValue((prev) => prev - val);
      setDisplayResult(formatNumber(val));
    }
  };

  // Copy primary result
  const handleCopyResult = async () => {
    try {
      await navigator.clipboard.writeText(displayResult);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  // Global keyboard handler when user is not focused in an input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (target === expressionInputRef.current) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleEvaluate();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleClearAll();
          }
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        insertToken(e.key);
      } else if (['+', '-', '*', '/', '^', '(', ')', '.', '%', '!'].includes(e.key)) {
        e.preventDefault();
        const mapped = e.key === '*' ? ' × ' : e.key === '/' ? ' ÷ ' : e.key;
        insertToken(mapped);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearAll();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEvaluate, handleClearAll, handleBackspace, insertToken]);

  // Dynamic trig button definitions based on 2nd and HYP modes
  const trigButtons = useMemo(() => {
    if (!isHyperbolic && !isSecondMode) {
      return [
        { label: 'sin', token: 'sin(', aria: 'Sine function' },
        { label: 'cos', token: 'cos(', aria: 'Cosine function' },
        { label: 'tan', token: 'tan(', aria: 'Tangent function' },
      ];
    }
    if (!isHyperbolic && isSecondMode) {
      return [
        { label: 'asin', token: 'asin(', aria: 'Inverse sine function' },
        { label: 'acos', token: 'acos(', aria: 'Inverse cosine function' },
        { label: 'atan', token: 'atan(', aria: 'Inverse tangent function' },
      ];
    }
    if (isHyperbolic && !isSecondMode) {
      return [
        { label: 'sinh', token: 'sinh(', aria: 'Hyperbolic sine function' },
        { label: 'cosh', token: 'cosh(', aria: 'Hyperbolic cosine function' },
        { label: 'tanh', token: 'tanh(', aria: 'Hyperbolic tangent function' },
      ];
    }
    return [
      { label: 'asinh', token: 'asinh(', aria: 'Inverse hyperbolic sine function' },
      { label: 'acosh', token: 'acosh(', aria: 'Inverse hyperbolic cosine function' },
      { label: 'atanh', token: 'atanh(', aria: 'Inverse hyperbolic tangent function' },
    ];
  }, [isSecondMode, isHyperbolic]);

  const handlePlotCurrentExpression = (exprToPlot?: string) => {
    const candidate = (exprToPlot ?? expression).trim();
    if (candidate) {
      setGraphExpression(candidate);
    }
    setMobileTab('graph');
    if (desktopDeckFilter !== 'all' && desktopDeckFilter !== 'graph') {
      setDesktopDeckFilter('graph');
    }
  };

  return (
    <div className={`w-full max-w-[1400px] mx-auto ${className}`}>
      {/* Mobile Workspace Switcher (< 1024px) */}
      <div
        role="tablist"
        aria-label="Mobile calculator workspace tabs"
        className="grid grid-cols-5 gap-1 p-1.5 mb-4 bg-[#0B101B] border border-slate-800 rounded-xl lg:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'calculator'}
          onClick={() => setMobileTab('calculator')}
          className={`min-h-[44px] px-1.5 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            mobileTab === 'calculator'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Keypad</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'matrix'}
          onClick={() => setMobileTab('matrix')}
          className={`min-h-[44px] px-1.5 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            mobileTab === 'matrix'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Matrix</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'calculus'}
          onClick={() => setMobileTab('calculus')}
          className={`min-h-[44px] px-1.5 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            mobileTab === 'calculus'
              ? 'bg-violet-500/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sigma className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Calculus</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'graph'}
          onClick={() => setMobileTab('graph')}
          className={`min-h-[44px] px-1.5 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            mobileTab === 'graph'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Graph</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'history'}
          onClick={() => setMobileTab('history')}
          className={`min-h-[44px] px-1.5 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            mobileTab === 'history'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" aria-hidden="true" />
          <span>History</span>
        </button>
      </div>

      {/* Main 12-Column Engineering Console (Balanced 2-Column Bento Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN (7 cols on Desktop): Primary Scientific Calculator + Matrix Workbench */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div
            className={`flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden ${
              mobileTab !== 'calculator' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Instrument Telemetry & Angle Mode Bar */}
            <div className="px-4 py-3 bg-[#0B101B] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Degree / Radian Toggle */}
                <div
                  role="group"
                  aria-label="Angle unit mode"
                  className="inline-flex items-center p-0.5 bg-[#070A12] border border-slate-800 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => setAngleMode('RAD')}
                    aria-pressed={angleMode === 'RAD'}
                    className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                      angleMode === 'RAD'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    RAD
                  </button>
                  <button
                    type="button"
                    onClick={() => setAngleMode('DEG')}
                    aria-pressed={angleMode === 'DEG'}
                    className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                      angleMode === 'DEG'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    DEG
                  </button>
                </div>

                {/* Quiet unboxed telemetry metadata */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span data-testid="memory-indicator">
                    M = <strong className="text-slate-200">{formatNumber(memoryValue, 6)}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Ans = <strong className="text-cyan-300">{formatNumber(ansValue, 6)}</strong>
                  </span>
                </div>

                {/* Startup progress indicator if initialization takes >150ms */}
                {!isEngineReady && !engineError && (
                  <CalculatorLoadingIndicator
                    stage="Preparing calculator"
                    variant="inline"
                    delayMs={150}
                  />
                )}
                {engineError && (
                  <div
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-rose-300 font-mono"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                    <span>Engine warning</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEngineError(null);
                        setIsEngineReady(true);
                      }}
                      className="underline text-rose-200 hover:text-white ml-1 focus-visible:outline-2 focus-visible:outline-rose-400"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlotCurrentExpression()}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800/90 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
                  title="Plot current expression on function graph"
                >
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Plot Expr</span>
                </button>
              </div>
            </div>

            {/* High-Contrast Primary Display Screen */}
            <div className="p-5 bg-[#070A12] border-b border-slate-800/90 space-y-3">
              {/* Editable Expression Input Line */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="calculator-expression-input"
                    className="text-xs font-medium text-slate-400"
                  >
                    Expression Line
                  </label>
                  {expression && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <input
                  ref={expressionInputRef}
                  id="calculator-expression-input"
                  type="text"
                  aria-label="Mathematical expression"
                  value={expression}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setExpression(e.target.value);
                  }}
                  placeholder="Type or click keys: e.g. 2 + 3 × 4, sin(π/2), 5! + sqrt(81)"
                  className="w-full px-3.5 py-2.5 text-base sm:text-lg font-mono bg-[#0B101D] border border-slate-800 focus:border-cyan-400 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Error Alert Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  data-testid="calculator-error"
                  className="px-3.5 py-2.5 bg-rose-950/50 border border-rose-500/40 rounded-lg flex items-start gap-2.5 text-xs text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Primary Result Readout */}
              <div className="pt-1 flex items-end justify-between gap-4">
                <div className="text-xs font-mono text-slate-400 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span>RESULT ({angleMode})</span>
                    {isEvaluating && (
                      <CalculatorLoadingIndicator
                        stage="Evaluating"
                        variant="inline"
                        delayMs={150}
                      />
                    )}
                  </div>
                  {livePreview !== null && livePreview !== displayResult && !errorMessage && (
                    <div className="text-cyan-400/80" data-testid="calculator-live-preview">
                      Preview: = {livePreview}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <output
                    aria-label="Calculation result"
                    data-testid="calculator-result"
                    className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-slate-50 tabular-nums truncate"
                  >
                    {displayResult}
                  </output>

                  <button
                    type="button"
                    onClick={handleCopyResult}
                    aria-label="Copy calculation result"
                    title="Copy result to clipboard"
                    className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg border border-slate-800 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {copiedResult ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Scientific & Primary Keypad Grid */}
            <div className="p-4 space-y-3 bg-[#0F1624]">
              {/* Scientific Function Matrix (4 rows x 6 cols on sm+, 4 cols on xs) */}
              <div
                role="group"
                aria-label="Scientific functions keypad"
                className="grid grid-cols-4 sm:grid-cols-6 gap-1.5"
              >
                {/* Mode Toggles */}
                <button
                  type="button"
                  onClick={() => setIsSecondMode(!isSecondMode)}
                  aria-pressed={isSecondMode}
                  className={`min-h-[44px] py-2 px-2 text-xs font-mono font-semibold rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isSecondMode
                      ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60'
                      : 'bg-[#0B101D] text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  2nd
                </button>

                <button
                  type="button"
                  onClick={() => setIsHyperbolic(!isHyperbolic)}
                  aria-pressed={isHyperbolic}
                  className={`min-h-[44px] py-2 px-2 text-xs font-mono font-semibold rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isHyperbolic
                      ? 'bg-violet-500/25 text-violet-200 border-violet-400/60'
                      : 'bg-[#0B101D] text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  hyp
                </button>

                {/* Trigonometric functions */}
                {trigButtons.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => insertToken(btn.token)}
                    aria-label={btn.aria}
                    className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {btn.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => insertToken('π')}
                  aria-label="Constant Pi (π)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-semibold bg-[#0B101D] hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  π
                </button>

                {/* Logarithms and Exponentials */}
                <button
                  type="button"
                  onClick={() => insertToken(isSecondMode ? 'e^(' : 'ln(')}
                  aria-label={isSecondMode ? 'e to the power of x' : 'Natural logarithm'}
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {isSecondMode ? 'eˣ' : 'ln'}
                </button>

                <button
                  type="button"
                  onClick={() => insertToken(isSecondMode ? '10^(' : 'log(')}
                  aria-label={isSecondMode ? '10 to the power of x' : 'Base-10 logarithm'}
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {isSecondMode ? '10ˣ' : 'log'}
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('log2(')}
                  aria-label="Base-2 logarithm"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  log₂
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('e')}
                  aria-label="Euler constant (e)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-semibold bg-[#0B101D] hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  e
                </button>

                {/* Powers and Roots */}
                <button
                  type="button"
                  onClick={() => insertToken('^2')}
                  aria-label="Square (x²)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  x²
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('^')}
                  aria-label="Power (xʸ)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  xʸ
                </button>

                <button
                  type="button"
                  onClick={() => insertToken(isSecondMode ? 'cbrt(' : 'sqrt(')}
                  aria-label={isSecondMode ? 'Cube root' : 'Square root'}
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {isSecondMode ? '∛x' : '√x'}
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('abs(')}
                  aria-label="Absolute value"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  |x|
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('!')}
                  aria-label="Factorial (n!)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  n!
                </button>

                <button
                  type="button"
                  onClick={() => insertToken(' mod ')}
                  aria-label="Modulo operator"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  mod
                </button>

                {/* Brackets & Inversion */}
                <button
                  type="button"
                  onClick={() => insertToken('(')}
                  aria-label="Open parenthesis"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-semibold bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  (
                </button>

                <button
                  type="button"
                  onClick={() => insertToken(')')}
                  aria-label="Close parenthesis"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-semibold bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  )
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('^(-1)')}
                  aria-label="Reciprocal (1/x)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-medium bg-[#0B101D] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  1/x
                </button>

                <button
                  type="button"
                  onClick={() => insertToken('Ans')}
                  aria-label="Previous answer (Ans)"
                  className="min-h-[44px] py-2 px-2 text-xs font-mono font-semibold bg-[#0B101D] hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  Ans
                </button>
              </div>

              {/* Memory Function Strip */}
              <div
                role="group"
                aria-label="Memory operations"
                className="grid grid-cols-5 gap-1.5 pt-1"
              >
                <button
                  type="button"
                  onClick={() => setMemoryValue(0)}
                  aria-label="Clear Memory (MC)"
                  className="min-h-[38px] py-1.5 px-2 text-xs font-mono bg-[#0B101B] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  MC
                </button>
                <button
                  type="button"
                  onClick={handleMemoryRecall}
                  aria-label="Recall Memory (MR)"
                  className="min-h-[38px] py-1.5 px-2 text-xs font-mono bg-[#0B101B] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  MR
                </button>
                <button
                  type="button"
                  onClick={handleMemoryAdd}
                  aria-label="Add to Memory (M+)"
                  className="min-h-[38px] py-1.5 px-2 text-xs font-mono bg-[#0B101B] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  M+
                </button>
                <button
                  type="button"
                  onClick={handleMemorySubtract}
                  aria-label="Subtract from Memory (M-)"
                  className="min-h-[38px] py-1.5 px-2 text-xs font-mono bg-[#0B101B] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  M−
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = resolveCurrentNumericValue();
                    if (val !== null) setMemoryValue(val);
                  }}
                  aria-label="Store into Memory (MS)"
                  className="min-h-[38px] py-1.5 px-2 text-xs font-mono bg-[#0B101B] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  MS
                </button>
              </div>

              {/* Primary Arithmetic Numeric Keypad (4 columns) */}
              <div
                role="group"
                aria-label="Numeric keypad"
                className="grid grid-cols-4 gap-2 pt-1"
              >
                {/* Row 1: AC, DEL, ±, ÷ */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  aria-label="All Clear (AC)"
                  className="min-h-[48px] py-2.5 px-3 text-sm font-mono font-bold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-rose-400"
                >
                  AC
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Delete character (DEL)"
                  className="min-h-[48px] py-2.5 px-3 text-sm font-mono font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center justify-center focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  <Delete className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleSign}
                  aria-label="Negate sign (±)"
                  className="min-h-[48px] py-2.5 px-3 text-sm font-mono font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  ±
                </button>
                <button
                  type="button"
                  onClick={() => insertToken(' ÷ ')}
                  aria-label="Divide (÷)"
                  className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-bold bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  ÷
                </button>

                {/* Row 2: 7, 8, 9, × */}
                {['7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => insertToken(digit)}
                    aria-label={`Digit ${digit}`}
                    className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-semibold bg-[#162035] hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => insertToken(' × ')}
                  aria-label="Multiply (×)"
                  className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-bold bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  ×
                </button>

                {/* Row 3: 4, 5, 6, − */}
                {['4', '5', '6'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => insertToken(digit)}
                    aria-label={`Digit ${digit}`}
                    className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-semibold bg-[#162035] hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => insertToken(' − ')}
                  aria-label="Subtract (−)"
                  className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-bold bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  −
                </button>

                {/* Row 4: 1, 2, 3, + */}
                {['1', '2', '3'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => insertToken(digit)}
                    aria-label={`Digit ${digit}`}
                    className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-semibold bg-[#162035] hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => insertToken(' + ')}
                  aria-label="Add (+)"
                  className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-bold bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  +
                </button>

                {/* Row 5: 0, ., = (2 cols) */}
                <button
                  type="button"
                  onClick={() => insertToken('0')}
                  aria-label="Digit 0"
                  className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-semibold bg-[#162035] hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => insertToken('.')}
                  aria-label="Decimal point"
                  className="min-h-[48px] py-2.5 px-3 text-lg font-mono font-bold bg-[#162035] hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={handleEvaluate}
                  aria-label="Evaluate expression (=)"
                  className="col-span-2 min-h-[48px] py-2.5 px-4 text-lg font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-white"
                >
                  =
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Workbench sits directly below the Main Calculator on Desktop ('all' or 'matrix' view), and in 'matrix' tab on Mobile */}
          <div
            className={`flex-1 flex flex-col ${
              mobileTab === 'matrix' ? 'flex' : 'hidden'
            } ${
              desktopDeckFilter === 'all' || desktopDeckFilter === 'matrix'
                ? 'lg:flex'
                : 'lg:hidden'
            }`}
          >
            <CalculatorErrorBoundary
              key={`matrix-boundary-${matrixRetryKey}`}
              fallbackTitle="Matrix Workbench Initialization Error"
              fallbackMessage="Could not load the linear algebra matrix engine. Check your connection and retry."
              onRetry={() => setMatrixRetryKey((k) => k + 1)}
            >
              <Suspense fallback={<MatrixCalculatorSkeleton />}>
                <LazyMatrixCalculator
                  className="flex-1"
                  onSendScalarToCalculator={(val) => {
                    setErrorMessage(null);
                    setExpression(val);
                    setDisplayResult(val);
                    setMobileTab('calculator');
                  }}
                />
              </Suspense>
            </CalculatorErrorBoundary>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols on Desktop): Inspection Deck (Calculus, Graph, History) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Desktop Panel Filter Control */}
          <div className="hidden lg:flex items-center justify-between p-1.5 bg-[#0B101B] border border-slate-800/90 rounded-xl">
            <span className="px-2.5 text-xs font-medium text-slate-400">
              Lab Deck View
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Tools' },
                  { id: 'matrix', label: 'Matrix' },
                  { id: 'calculus', label: 'Calculus' },
                  { id: 'graph', label: 'Graph' },
                  { id: 'history', label: `History (${history.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDesktopDeckFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    desktopDeckFilter === tab.id
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Calculus Panel (Lazy-loaded with isolated error boundary and elapsed-time loader) */}
          <div
            className={`${
              mobileTab === 'calculus' ? 'block' : 'hidden'
            } ${
              desktopDeckFilter === 'all' ||
              desktopDeckFilter === 'calculus' ||
              desktopDeckFilter === 'matrix'
                ? 'lg:block'
                : 'lg:hidden'
            }`}
          >
            <CalculatorErrorBoundary
              key={`calculus-boundary-${calculusRetryKey}`}
              fallbackTitle="Calculus Tool Initialization Error"
              fallbackMessage="Could not load the symbolic calculus module. Check your connection and retry."
              onRetry={() => setCalculusRetryKey((k) => k + 1)}
            >
              <Suspense fallback={<CalculusPanelSkeleton />}>
                <LazyCalculusPanel
                  currentCalculatorExpression={expression}
                  angleMode={angleMode}
                  onSendResultToCalculator={(val) => {
                    setErrorMessage(null);
                    setExpression(val);
                    setDisplayResult(val);
                    setMobileTab('calculator');
                  }}
                  onPlotExpression={(expr) => {
                    handlePlotCurrentExpression(expr);
                  }}
                />
              </Suspense>
            </CalculatorErrorBoundary>
          </div>

          {/* 2. Function Plotter (Lazy-loaded with isolated error boundary and elapsed-time loader) */}
          <div
            className={`${
              mobileTab === 'graph' ? 'block' : 'hidden'
            } ${
              desktopDeckFilter === 'all' ||
              desktopDeckFilter === 'graph' ||
              desktopDeckFilter === 'matrix'
                ? 'lg:block'
                : 'lg:hidden'
            }`}
          >
            <CalculatorErrorBoundary
              key={`graph-boundary-${graphRetryKey}`}
              fallbackTitle="Graph Plotter Initialization Error"
              fallbackMessage="Could not load the coordinate plotting engine. Check your connection and retry."
              onRetry={() => setGraphRetryKey((k) => k + 1)}
            >
              <Suspense fallback={<GraphPlotterSkeleton />}>
                <LazyGraphPlotter
                  expression={graphExpression}
                  onExpressionChange={setGraphExpression}
                  angleMode={angleMode}
                />
              </Suspense>
            </CalculatorErrorBoundary>
          </div>

          {/* 3. Persistent Calculation History */}
          <div
            className={`flex-1 flex flex-col ${
              mobileTab === 'history' ? 'flex' : 'hidden'
            } ${
              desktopDeckFilter === 'all' ||
              desktopDeckFilter === 'history' ||
              desktopDeckFilter === 'matrix'
                ? 'lg:flex'
                : 'lg:hidden'
            }`}
          >
            <HistoryPanel
              className="flex-1"
              items={history}
              onReuseExpression={(expr) => {
                setErrorMessage(null);
                setExpression(expr);
                setMobileTab('calculator');
              }}
              onInsertResult={(res) => {
                setErrorMessage(null);
                setExpression((prev) => `${prev}${res}`);
                setMobileTab('calculator');
              }}
              onDeleteItem={(id) => {
                setHistory((prev) => prev.filter((item) => item.id !== id));
              }}
              onClearHistory={() => {
                setHistory([]);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScientificCalculator;
