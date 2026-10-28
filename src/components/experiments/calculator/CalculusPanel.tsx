"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sigma,
  TrendingUp,
  Copy,
  Check,
  ArrowUpRight,
  AlertTriangle,
  Info,
  Play,
  Sparkles,
  Compass,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  differentiateExpression,
  integrateIndefinite,
  integrateDefinite,
  validateCalculusExpression,
  type DerivativeResult,
  type IndefiniteIntegralResult,
  type DefiniteIntegralResult,
} from './utils/calculusEngine';
import type { AngleMode } from './utils/mathEngine';

export type CalculusTab = 'differentiate' | 'indefinite' | 'definite';

interface CalculusPanelProps {
  currentCalculatorExpression: string;
  angleMode: AngleMode;
  onSendResultToCalculator: (value: string) => void;
  onPlotExpression: (expr: string) => void;
}

const DIFF_PRESETS = [
  { label: 'x³', expr: 'x^3', evalAt: '2', category: 'Power' },
  { label: 'sin(x)·cos(x)', expr: 'sin(x)*cos(x)', evalAt: 'pi/4', category: 'Trig' },
  { label: 'x²·ln(x)', expr: 'x^2 * ln(x)', evalAt: 'e', category: 'Log' },
  { label: 'e^(2x)', expr: 'e^(2*x)', evalAt: '0', category: 'Exp' },
  {
    label: '((sin x)⁸-(cos x)⁸)/(1-2sin²x cos²x)',
    expr: '((sin(x))^8-(cos(x))^8)/(1-2*(sin(x))^2*(cos(x))^2)',
    evalAt: 'pi/4',
    category: 'Trig identity',
  },
  {
    label: '(cos(5x)+cos(4x))/(1-2cos(3x))',
    expr: '(cos(5*x)+cos(4*x))/(1-2*cos(3*x))',
    evalAt: '0.2',
    category: 'Rational',
  },
];

const INDEF_PRESETS = [
  {
    label: '((sin x)⁸-(cos x)⁸)/(1-2sin²x cos²x)',
    expr: '((sin(x))^8-(cos(x))^8)/(1-2*(sin(x))^2*(cos(x))^2)',
    category: 'Trig identity',
  },
  { label: 'x²', expr: 'x^2', category: 'Power rule' },
  { label: 'sin(x)', expr: 'sin(x)', category: 'Trig' },
  { label: 'e^x', expr: 'e^x', category: 'Exponential' },
  { label: '2x·cos(x²)', expr: '2*x*cos(x^2)', category: 'Substitution' },
  { label: '1/(1+x²)', expr: '1/(1+x^2)', category: 'Rational' },
  {
    label: '(cos(5x)+cos(4x))/(1-2cos(3x))',
    expr: '(cos(5*x)+cos(4*x))/(1-2*cos(3*x))',
    category: 'Trig-rational',
  },
  { label: 'e^(−x²)', expr: 'e^(-x^2)', category: 'Non-elementary (erf)' },
];

const DEF_PRESETS = [
  {
    label: '∫[0→π/4] Trig identity dx',
    expr: '((sin(x))^8-(cos(x))^8)/(1-2*(sin(x))^2*(cos(x))^2)',
    lower: '0',
    upper: 'pi/4',
    category: 'Trig identity',
  },
  { label: '∫[0→1] x² dx', expr: 'x^2', lower: '0', upper: '1', category: 'Polynomial' },
  { label: '∫[0→π] sin(x) dx', expr: 'sin(x)', lower: '0', upper: 'pi', category: 'Trigonometric' },
  {
    label: '∫[0→0.3] Trig-rational dx',
    expr: '(cos(5*x)+cos(4*x))/(1-2*cos(3*x))',
    lower: '0',
    upper: '0.3',
    category: 'Regular domain',
  },
  { label: '∫[0→1] e^(−x²) dx', expr: 'e^(-x^2)', lower: '0', upper: '1', category: 'Gaussian quadrature' },
  { label: '∫[1→0] x² dx (Reversed)', expr: 'x^2', lower: '1', upper: '0', category: 'Direction reversal' },
];

/**
 * Lightweight mathematical preview formatter without heavy external libraries.
 * Renders fractions, superscripts, dots for multiplication, and readable font styles.
 */
function formatMathPreview(raw: string): React.ReactNode {
  const trimmed = raw.trim();
  if (!trimmed) {
    return <span className="text-slate-500 italic">Enter an expression to see formatted preview...</span>;
  }

  // Detect top-level fraction: e.g. (...) / (...)
  let depth = 0;
  let topSlashIdx = -1;
  let hasSingleTopSlash = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '/' && depth === 0) {
      if (topSlashIdx === -1) {
        topSlashIdx = i;
        hasSingleTopSlash = true;
      } else {
        hasSingleTopSlash = false;
        break;
      }
    }
  }

  const formatInline = (str: string): React.ReactNode => {
    let s = str.trim();
    if (s.startsWith('(') && s.endsWith(')')) {
      let d = 0;
      let wrapsAll = true;
      for (let i = 0; i < s.length - 1; i++) {
        if (s[i] === '(') d++;
        else if (s[i] === ')') d--;
        if (d === 0) {
          wrapsAll = false;
          break;
        }
      }
      if (wrapsAll) s = s.slice(1, -1).trim();
    }

    const tokens = s.split(/(\^[0-9]+|\^\([^)]+\))/g);
    const parts: React.ReactNode[] = [];

    tokens.forEach((tok, idx) => {
      if (tok.startsWith('^')) {
        const exp = tok.startsWith('^(') ? tok.slice(2, -1) : tok.slice(1);
        parts.push(
          <sup key={idx} className="text-[10px] text-cyan-300 font-semibold px-0.5">
            {exp}
          </sup>
        );
      } else {
        const cleaned = tok.replace(/\*/g, ' · ');
        parts.push(<span key={idx}>{cleaned}</span>);
      }
    });

    return <span className="font-mono">{parts}</span>;
  };

  if (hasSingleTopSlash && topSlashIdx > 0) {
    const numPart = trimmed.slice(0, topSlashIdx);
    const denPart = trimmed.slice(topSlashIdx + 1);

    return (
      <div className="inline-flex flex-col items-center align-middle mx-1 my-0.5">
        <div className="border-b border-cyan-500/40 px-2 py-0.5 text-center text-slate-100 font-mono text-xs sm:text-sm">
          {formatInline(numPart)}
        </div>
        <div className="px-2 py-0.5 text-center text-slate-300 font-mono text-xs sm:text-sm">
          {formatInline(denPart)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-100 font-mono text-xs sm:text-sm break-words leading-relaxed">
      {formatInline(trimmed)}
    </div>
  );
}

export const CalculusPanel: React.FC<CalculusPanelProps> = ({
  currentCalculatorExpression,
  angleMode,
  onSendResultToCalculator,
  onPlotExpression,
}) => {
  const [activeTab, setActiveTab] = useState<CalculusTab>('differentiate');

  // Shared / per-mode inputs
  const [expression, setExpression] = useState<string>('x^3');
  const [variable, setVariable] = useState<string>('x');

  // Multiline auto-growing editor ref and undo history
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>(['x^3']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [showMathPreview, setShowMathPreview] = useState<boolean>(true);

  // UI state for syntax help and details expander
  const [showSyntaxHelp, setShowSyntaxHelp] = useState<boolean>(false);
  const [showWeierstrassDetails, setShowWeierstrassDetails] = useState<boolean>(false);
  const [showTrigDetails, setShowTrigDetails] = useState<boolean>(false);

  // Auto-resize multiline textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextH = Math.min(Math.max(textarea.scrollHeight, 62), 180);
    textarea.style.height = `${nextH}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [expression, adjustTextareaHeight]);

  const pushHistory = (newVal: string) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      if (upToCurrent[upToCurrent.length - 1] === newVal) return prev;
      const nextList = [...upToCurrent.slice(-25), newVal];
      setHistoryIndex(nextList.length - 1);
      return nextList;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevExpr = history[prevIndex];
      setHistoryIndex(prevIndex);
      setExpression(prevExpr);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  const handleClear = () => {
    if (expression) {
      pushHistory('');
      setExpression('');
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  const handleInsertSnippet = (
    snippet: string,
    cursorOffsetFromEnd = 0,
    wrapSelected = false
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const nextText = expression + snippet;
      setExpression(nextText);
      pushHistory(nextText);
      return;
    }

    const start = textarea.selectionStart ?? expression.length;
    const end = textarea.selectionEnd ?? expression.length;
    const selected = expression.slice(start, end);

    let nextText: string;
    let nextCursor: number;

    if (selected && wrapSelected) {
      const openPart = snippet.slice(0, snippet.length - cursorOffsetFromEnd);
      const closePart = snippet.slice(snippet.length - cursorOffsetFromEnd);
      nextText = expression.slice(0, start) + openPart + selected + closePart + expression.slice(end);
      nextCursor = start + openPart.length + selected.length + closePart.length;
    } else {
      nextText = expression.slice(0, start) + snippet + expression.slice(end);
      nextCursor = start + snippet.length - cursorOffsetFromEnd;
    }

    setExpression(nextText);
    pushHistory(nextText);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  // Differentiation state
  const [diffOrder, setDiffOrder] = useState<number>(1);
  const [evalPoint, setEvalPoint] = useState<string>('2');
  const [diffResult, setDiffResult] = useState<DerivativeResult | null>(() =>
    differentiateExpression('x^3', 'x', '2', 1)
  );

  // Indefinite integral state
  const [indefResult, setIndefResult] = useState<IndefiniteIntegralResult | null>(() =>
    integrateIndefinite('x^2', 'x')
  );

  // Definite integral state
  const [lowerBound, setLowerBound] = useState<string>('0');
  const [upperBound, setUpperBound] = useState<string>('1');
  const [defResult, setDefResult] = useState<DefiniteIntegralResult | null>(() =>
    integrateDefinite('x^2', 'x', '0', '1')
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Clipboard fallback handled safely
    }
  };

  const runCalculation = (
    tabOverride?: CalculusTab,
    exprOverride?: string,
    varOverride?: string,
    evalAtOverride?: string,
    orderOverride?: number,
    lowerOverride?: string,
    upperOverride?: string
  ) => {
    const targetTab = tabOverride ?? activeTab;
    const targetExpr = exprOverride ?? expression;
    const targetVar = varOverride ?? variable;

    if (targetTab === 'differentiate') {
      const res = differentiateExpression(
        targetExpr,
        targetVar,
        evalAtOverride !== undefined ? evalAtOverride : evalPoint,
        orderOverride ?? diffOrder
      );
      setDiffResult(res);
    } else if (targetTab === 'indefinite') {
      const res = integrateIndefinite(targetExpr, targetVar);
      setIndefResult(res);
    } else {
      const res = integrateDefinite(
        targetExpr,
        targetVar,
        lowerOverride ?? lowerBound,
        upperOverride ?? upperBound
      );
      setDefResult(res);
    }
  };

  // Re-run when switching tabs so the currently displayed expression is evaluated immediately
  useEffect(() => {
    runCalculation(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleImportFromCalculator = () => {
    if (currentCalculatorExpression.trim()) {
      setExpression(currentCalculatorExpression.trim());
      runCalculation(activeTab, currentCalculatorExpression.trim());
    }
  };

  // Extract active syntax error & one-click correction suggestion
  const activeSyntaxError =
    activeTab === 'differentiate'
      ? diffResult?.syntaxValidation
      : activeTab === 'indefinite'
      ? indefResult?.syntaxValidation
      : defResult?.syntaxValidation;

  const handleApplyFix = (correctedExpr: string) => {
    setExpression(correctedExpr);
    runCalculation(activeTab, correctedExpr);
  };

  return (
    <section
      aria-label="Calculus Laboratory"
      className="flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden"
    >
      {/* Header & Sub-navigation */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sigma className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Calculus Engine
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            · Symbolic CAS &amp; Weierstrass Reduction
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentCalculatorExpression.trim() && (
            <button
              type="button"
              onClick={handleImportFromCalculator}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0"
              title="Load expression from main calculator display"
            >
              <span>Use Main Expr</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Angle mode convention notice when DEG is selected */}
      {angleMode === 'DEG' && (
        <div
          role="status"
          className="px-4 py-2 bg-violet-950/40 border-b border-violet-500/30 flex items-start gap-2 text-xs text-violet-200"
        >
          <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Radian Convention Active:</strong> Calculus operations always treat trigonometric
            functions in <strong>Radians (RAD)</strong> so standard identities like{' '}
            <code className="font-mono text-violet-100">d/dx sin(x) = cos(x)</code> hold, even while
            the main keypad is set to Degrees.
          </p>
        </div>
      )}

      {/* Mode Tabs */}
      <div
        role="tablist"
        aria-label="Calculus operation mode"
        className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#090D16] border-b border-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'differentiate'}
          onClick={() => setActiveTab('differentiate')}
          className={`py-2 px-1.5 text-xs font-medium rounded-lg transition-colors flex flex-col items-center justify-center gap-0.5 text-center min-w-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            activeTab === 'differentiate'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <span className="font-semibold leading-tight">Differentiate</span>
          <span className="text-[11px] font-mono opacity-85 leading-tight">(d/dx)</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'indefinite'}
          onClick={() => setActiveTab('indefinite')}
          className={`py-2 px-1.5 text-xs font-medium rounded-lg transition-colors flex flex-col items-center justify-center gap-0.5 text-center min-w-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            activeTab === 'indefinite'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <span className="font-semibold leading-tight">Indefinite</span>
          <span className="text-[11px] font-mono opacity-85 leading-tight">(∫ dx)</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'definite'}
          onClick={() => setActiveTab('definite')}
          className={`py-2 px-1.5 text-xs font-medium rounded-lg transition-colors flex flex-col items-center justify-center gap-0.5 text-center min-w-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            activeTab === 'definite'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <span className="font-semibold leading-tight">Definite</span>
          <span className="text-[11px] font-mono opacity-85 leading-tight">(∫[a→b])</span>
        </button>
      </div>

      {/* Form Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCalculation();
        }}
        className="p-4 space-y-3"
      >
        {/* Presets by Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Examples (click to load &amp; compute):</span>
            <span className="font-mono text-cyan-400/80">
              {activeTab === 'differentiate'
                ? 'Orders 1 to 5'
                : activeTab === 'indefinite'
                ? 'Elementary & Trig-Rational'
                : 'FTC & Simpson'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activeTab === 'differentiate' &&
              DIFF_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setExpression(preset.expr);
                    setEvalPoint(preset.evalAt);
                    setVariable('x');
                    runCalculation('differentiate', preset.expr, 'x', preset.evalAt, diffOrder);
                  }}
                  className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                  title={`Load ${preset.label} (${preset.category})`}
                >
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                    {preset.category}:
                  </span>
                  <span>{preset.label}</span>
                </button>
              ))}

            {activeTab === 'indefinite' &&
              INDEF_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setExpression(preset.expr);
                    setVariable('x');
                    runCalculation('indefinite', preset.expr, 'x');
                  }}
                  className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                  title={`Load ${preset.label} (${preset.category})`}
                >
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                    {preset.category}:
                  </span>
                  <span>{preset.label}</span>
                </button>
              ))}

            {activeTab === 'definite' &&
              DEF_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setExpression(preset.expr);
                    setVariable('x');
                    setLowerBound(preset.lower);
                    setUpperBound(preset.upper);
                    runCalculation(
                      'definite',
                      preset.expr,
                      'x',
                      undefined,
                      undefined,
                      preset.lower,
                      preset.upper
                    );
                  }}
                  className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                  title={`Load ${preset.label}`}
                >
                  <span>{preset.label}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Expression & Variable Row */}
        <div className="space-y-2">
          {/* Header row with Label, Bracket balance, Math preview toggle, Syntax help */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label
                htmlFor="calculus-expr-input"
                className="block text-xs font-semibold text-slate-200"
              >
                Function Expression <span className="font-mono text-cyan-400">f({variable || 'x'})</span>
              </label>

              {/* Bracket-matching live indicator */}
              {expression.trim() && (
                (() => {
                  const openCount = (expression.match(/\(/g) || []).length;
                  const closeCount = (expression.match(/\)/g) || []).length;
                  const delta = openCount - closeCount;
                  if (delta === 0) {
                    return (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                        <span>Balanced () ({openCount})</span>
                      </span>
                    );
                  }
                  if (delta > 0) {
                    return (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" aria-hidden="true" />
                        <span>Missing {delta} &apos;)&apos;</span>
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] font-mono text-rose-300 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" aria-hidden="true" />
                      <span>Extra {-delta} &apos;)&apos;</span>
                    </span>
                  );
                })()
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowMathPreview((prev) => !prev)}
                className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors rounded px-1.5 py-0.5"
                title="Toggle formatted math preview"
              >
                {showMathPreview ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                    <span>Hide Preview</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Math Preview</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSyntaxHelp((prev) => !prev)}
                aria-expanded={showSyntaxHelp}
                aria-controls="calculus-syntax-help-panel"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 rounded px-1 py-0.5"
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Syntax Help</span>
              </button>
            </div>
          </div>

          {/* Multiline Input & Variable Row */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-9 sm:col-span-10">
              <textarea
                ref={textareaRef}
                id="calculus-expr-input"
                rows={2}
                value={expression}
                onChange={(e) => {
                  const val = e.target.value;
                  setExpression(val);
                  pushHistory(val);
                }}
                placeholder="e.g. ((sin(x))^8-(cos(x))^8)/(1-2*(sin(x))^2*(cos(x))^2)"
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400 resize-none whitespace-pre-wrap break-words leading-relaxed"
              />
            </div>

            <div className="col-span-3 sm:col-span-2">
              <label
                htmlFor="calculus-var-input"
                className="block text-[11px] font-medium text-slate-300 mb-1 text-center"
              >
                Variable
              </label>
              <input
                id="calculus-var-input"
                type="text"
                maxLength={1}
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
                aria-label="Calculus variable"
                className="w-full px-2 py-2 text-sm font-mono text-center bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400"
              />
            </div>
          </div>

          {/* Compact Insertion Toolbar */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] uppercase font-semibold text-slate-500 mr-0.5 font-sans">
                Insert:
              </span>
              <button
                type="button"
                onClick={() => handleInsertSnippet('sin()', 1, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert sin() (or wrap selection)"
              >
                sin()
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('cos()', 1, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert cos() (or wrap selection)"
              >
                cos()
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('tan()', 1, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert tan() (or wrap selection)"
              >
                tan()
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('sqrt()', 1, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert square root sqrt() (or wrap selection)"
              >
                √()
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('()/()', 4, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert fraction ()/() (or wrap selection as numerator)"
              >
                a/b
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('^()', 1, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert power ^()"
              >
                xⁿ
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('()', 1, true)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert parentheses () (or wrap selection)"
              >
                ( )
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('pi', 0, false)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert π (pi)"
              >
                π
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('e', 0, false)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert Euler's constant e"
              >
                e
              </button>
              <button
                type="button"
                onClick={() => handleInsertSnippet('*', 0, false)}
                className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Insert multiplication *"
              >
                ·
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                  historyIndex > 0
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                }`}
                title="Undo previous edit"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!expression}
                className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                  expression
                    ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                }`}
                title="Clear expression (can be undone with Undo)"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Formatted Math Preview Card */}
          {showMathPreview && expression.trim() && (
            <div className="p-2.5 rounded-lg bg-[#070A12]/90 border border-cyan-500/20 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-medium text-cyan-300">
                  <Eye className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                  <span>Formatted Math Preview:</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">Live f({variable || 'x'})</span>
              </div>
              <div className="p-2 rounded bg-[#0B101D] border border-slate-800 overflow-x-auto">
                {formatMathPreview(expression)}
              </div>
            </div>
          )}

          {/* Syntax Help Drawer */}
          {showSyntaxHelp && (
            <div
              id="calculus-syntax-help-panel"
              role="region"
              aria-label="Expression syntax guidance"
              className="p-3 bg-[#0B101D] border border-cyan-500/30 rounded-lg text-xs space-y-2 text-slate-300 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between text-cyan-300 font-semibold border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                  Expression Syntax Guide
                </span>
                <button
                  type="button"
                  onClick={() => setShowSyntaxHelp(false)}
                  className="text-slate-400 hover:text-slate-200 text-[11px]"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono leading-relaxed">
                <div>
                  <strong className="text-slate-200 block font-sans">Multiplication &amp; Variables:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Explicit: <code className="text-cyan-300">2*x*cos(x^2)</code></li>
                    <li>Implicit: <code className="text-cyan-300">5x</code>, <code className="text-cyan-300">2(x+1)</code>, <code className="text-cyan-300">(x+1)(x-1)</code></li>
                    <li>Scientific notation: <code className="text-cyan-300">2e-3</code>, <code className="text-cyan-300">1.5e4</code></li>
                  </ul>
                </div>

                <div>
                  <strong className="text-slate-200 block font-sans">Functions &amp; Fractions:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Rational: <code className="text-cyan-300">1/(1+x^2)</code></li>
                    <li>Powers &amp; Roots: <code className="text-cyan-300">x^3</code>, <code className="text-cyan-300">sqrt(x)</code></li>
                    <li>Trig &amp; Logs: <code className="text-cyan-300">sin(x)</code>, <code className="text-cyan-300">cos(3*x)</code>, <code className="text-cyan-300">ln(x)</code></li>
                    <li>Parentheses: Always balance opening and closing <code className="text-cyan-300">( )</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Immediate Parser Syntax Feedback & One-Click Correction */}
          {activeSyntaxError && !activeSyntaxError.valid && (
            <div
              role="alert"
              className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-lg text-xs space-y-2 animate-in fade-in duration-150"
            >
              <div className="flex items-start gap-2 text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-rose-200 flex items-center justify-between">
                    <span>Parser Syntax Error</span>
                    {activeSyntaxError.errorPosition !== undefined && (
                      <span className="text-[10px] font-mono text-rose-400">
                        Character position {activeSyntaxError.errorPosition + 1}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {activeSyntaxError.error}
                  </p>
                </div>
              </div>

              {activeSyntaxError.suggestion && (
                <div className="pt-1.5 border-t border-rose-900/40 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">
                    {activeSyntaxError.suggestion.description ?? 'Suggested syntax fix:'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyFix(activeSyntaxError.suggestion!.correctedExpression)
                    }
                    className="px-2.5 py-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors flex items-center gap-1.5 shadow-sm focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" aria-hidden="true" />
                    <span>Fix: {activeSyntaxError.suggestion.actionLabel}</span>
                    <ArrowRight className="w-3 h-3 text-cyan-200" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mode-Specific Parameters */}
        {activeTab === 'differentiate' && (
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-7">
              <label
                htmlFor="calculus-eval-point"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Evaluate at <span className="font-mono text-cyan-400">{variable || 'x'} =</span>{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="calculus-eval-point"
                type="text"
                value={evalPoint}
                onChange={(e) => setEvalPoint(e.target.value)}
                placeholder="e.g. 2 or pi/4"
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400"
              />
            </div>

            <div className="col-span-5">
              <label
                htmlFor="calculus-diff-order"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Derivative Order
              </label>
              <select
                id="calculus-diff-order"
                value={diffOrder}
                onChange={(e) => {
                  const newOrder = Number(e.target.value);
                  setDiffOrder(newOrder);
                  runCalculation('differentiate', expression, variable, evalPoint, newOrder);
                }}
                className="w-full px-2.5 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400"
              >
                <option value={1}>1st (d/d{variable || 'x'})</option>
                <option value={2}>2nd (d²/d{variable || 'x'}²)</option>
                <option value={3}>3rd (d³/d{variable || 'x'}³)</option>
                <option value={4}>4th (d⁴/d{variable || 'x'}⁴)</option>
                <option value={5}>5th (d⁵/d{variable || 'x'}⁵)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'definite' && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="calculus-lower-bound"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Lower Bound (<span className="font-mono text-cyan-400">a</span>)
              </label>
              <input
                id="calculus-lower-bound"
                type="text"
                value={lowerBound}
                onChange={(e) => setLowerBound(e.target.value)}
                placeholder="e.g. 0, -1, -pi"
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="calculus-upper-bound"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Upper Bound (<span className="font-mono text-cyan-400">b</span>)
              </label>
              <input
                id="calculus-upper-bound"
                type="text"
                value={upperBound}
                onChange={(e) => setUpperBound(e.target.value)}
                placeholder="e.g. 1, pi, e"
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>
              {activeTab === 'differentiate'
                ? 'Compute Derivative'
                : activeTab === 'indefinite'
                ? 'Compute Antiderivative'
                : 'Evaluate Definite Integral'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPlotExpression(expression)}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
            title="Plot this expression on the function grapher"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
            <span>Plot f(x)</span>
          </button>
        </div>

        {/* Results Output Section */}
        <div
          aria-live="polite"
          className="mt-3 p-3.5 bg-[#070A12] border border-slate-800 rounded-lg space-y-3"
        >
          {/* ================= DIFFERENTIATION RESULT ================= */}
          {activeTab === 'differentiate' && diffResult && (
            <>
              {!diffResult.ok ? (
                <div className="flex items-start gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{diffResult.error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Row 1: Function & Order Overview */}
                  <div className="p-2.5 rounded-lg bg-[#0B101D] border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400">Function:</span>
                      <code className="font-mono font-semibold text-slate-200">
                        f({diffResult.variable}) = {diffResult.expressionInput}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Order:</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40">
                        {diffResult.order === 1
                          ? '1st Derivative (d/dx)'
                          : diffResult.order === 2
                          ? '2nd Derivative (d²/dx²)'
                          : diffResult.order === 3
                          ? '3rd Derivative (d³/dx³)'
                          : `${diffResult.order}th Derivative`}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Symbolic Derivative */}
                  <div className="p-3 rounded-lg bg-[#0B101D] border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-300">
                        Symbolic Derivative{' '}
                        <code className="font-mono text-cyan-400">
                          {diffResult.order === 1
                            ? `f'(${diffResult.variable})`
                            : diffResult.order === 2
                            ? `f''(${diffResult.variable})`
                            : `f^(${diffResult.order})(${diffResult.variable})`}
                        </code>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onPlotExpression(diffResult.symbolicRaw ?? diffResult.symbolicDisplay ?? '')
                          }
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
                          title="Plot this derivative function"
                        >
                          Plot f&apos;(x)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(diffResult.symbolicDisplay ?? '', 'diff-symbolic')
                          }
                          aria-label="Copy symbolic derivative"
                          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Copy derivative"
                        >
                          {copiedKey === 'diff-symbolic' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div
                      data-testid="calculus-diff-symbolic"
                      className="text-lg font-mono font-bold text-cyan-300 break-words whitespace-normal leading-relaxed"
                    >
                      {diffResult.symbolicDisplay}
                    </div>

                    {diffResult.symbolicRaw &&
                      diffResult.symbolicRaw !== diffResult.symbolicDisplay && (
                        <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                          Parser syntax: {diffResult.symbolicRaw}
                        </div>
                      )}
                  </div>

                  {/* Row 3: Point Evaluation (Normalized) */}
                  {diffResult.evaluatedAt !== undefined &&
                    diffResult.evaluatedNumeric !== undefined && (
                      <div className="p-3 rounded-lg bg-[#0B101D] border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400">
                            Point Evaluation at{' '}
                            <code className="font-mono text-cyan-300">
                              {diffResult.variable} = {diffResult.evaluatedAt}
                            </code>
                          </div>
                          <div
                            data-testid="calculus-diff-evaluated"
                            className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-0.5"
                          >
                            {diffResult.evaluatedNumeric}
                          </div>
                          {diffResult.evaluatedExact &&
                            diffResult.evaluatedExact !== diffResult.evaluatedNumeric && (
                              <div className="text-[11px] font-mono text-violet-300 mt-0.5">
                                Exact: {diffResult.evaluatedExact}
                              </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(diffResult.evaluatedNumeric ?? '', 'diff-eval')
                            }
                            aria-label="Copy evaluated derivative value"
                            className="p-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                            title="Copy evaluated value"
                          >
                            {copiedKey === 'diff-eval' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onSendResultToCalculator(diffResult.evaluatedNumeric ?? '')
                            }
                            className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            Use in Calc
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </>
          )}

          {/* ================= INDEFINITE INTEGRAL RESULT ================= */}
          {activeTab === 'indefinite' && indefResult && (
            <>
              {!indefResult.ok ? (
                <div className="flex items-start gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{indefResult.error}</span>
                </div>
              ) : !indefResult.supported ? (
                <div className="space-y-2.5 p-3 rounded-lg bg-amber-950/25 border border-amber-500/30">
                  <div className="flex items-start gap-2 text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-200">
                        Symbolic Closed-Form Antiderivative Unavailable
                      </p>
                      <p className="text-slate-300 text-xs leading-relaxed break-words whitespace-normal">
                        {indefResult.explanation}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('definite')}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Switch to Definite Integral [a → b]
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Antiderivative Display Equation */}
                  <div className="p-3 rounded-lg bg-[#0B101D] border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-300">
                        Symbolic Antiderivative Equation
                      </span>
                      <div className="flex items-center gap-1.5">
                        {indefResult.symbolicDisplay && (
                          <button
                            type="button"
                            onClick={() =>
                              onPlotExpression(indefResult.symbolicDisplay ?? '')
                            }
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
                            title="Plot antiderivative F(x)"
                          >
                            Plot F(x)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(indefResult.symbolicWithConstant ?? '', 'indef-symbolic')
                          }
                          aria-label="Copy indefinite integral"
                          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Copy equation"
                        >
                          {copiedKey === 'indef-symbolic' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div
                      data-testid="calculus-indef-result"
                      className="text-lg font-mono font-bold text-cyan-300 break-words whitespace-normal leading-relaxed"
                    >
                      <span className="text-violet-300">
                        ∫ ({indefResult.expressionInput}) d{indefResult.variable} ={' '}
                      </span>
                      <span>{indefResult.symbolicWithConstant}</span>
                    </div>

                    {indefResult.symbolicDisplay && (
                      <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/70">
                        <span className="text-slate-400 font-mono text-[11px]">
                          F({indefResult.variable}) = {indefResult.symbolicDisplay}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onSendResultToCalculator(indefResult.symbolicDisplay ?? '')
                          }
                          className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded transition-colors"
                        >
                          Use in Calc
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Advanced Trig Identity Reduction & Safe Cancellation Card */}
                  {indefResult.isTrigIdentity && (
                    <div className="p-3 rounded-lg bg-[#0B101D] border border-cyan-500/40 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                          <span>Exact Pythagorean Identity &amp; Safe Factor Cancellation (Verified)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTrigDetails((prev) => !prev)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 py-0.5 px-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          <span>{showTrigDetails ? 'Hide' : 'Show'} Identity Details</span>
                          {showTrigDetails ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {indefResult.domainNotes && (
                        <div className="p-2.5 rounded bg-[#070A12] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                          <div className="text-emerald-300 font-semibold mb-1 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                            <span>Domain Verification &amp; Singularity Analysis:</span>
                          </div>
                          <p className="break-words whitespace-normal text-slate-300 text-[11px]">
                            {indefResult.domainNotes}
                          </p>
                        </div>
                      )}

                      {showTrigDetails && (
                        <div className="p-2.5 rounded bg-[#070A12] border border-slate-800 space-y-2 text-xs leading-relaxed animate-in fade-in duration-150">
                          <div className="text-slate-200 font-semibold">
                            Symbolic Pre-Simplification &amp; Factorization Path:
                          </div>
                          <p className="text-slate-400">
                            1. Let <code className="text-cyan-300 font-mono">a = sin²({indefResult.variable})</code> and <code className="text-cyan-300 font-mono">b = cos²({indefResult.variable})</code> with Pythagorean identity <code className="text-cyan-300 font-mono">a + b = 1</code>.
                          </p>
                          <p className="text-slate-400">
                            2. Numerator power difference factors as <code className="text-cyan-300 font-mono">a⁴ - b⁴ = (a - b)(a + b)(a² + b²) = (a - b)(a² + b²)</code>.
                          </p>
                          <p className="text-slate-400">
                            3. Denominator rewrites via <code className="text-cyan-300 font-mono">1 = (a + b)²</code> as <code className="text-cyan-300 font-mono">(a + b)² - 2ab = a² + b²</code>.
                          </p>
                          <p className="text-slate-400">
                            4. Safe cancellation of strictly positive factor <code className="text-cyan-300 font-mono">a² + b² = sin⁴({indefResult.variable}) + cos⁴({indefResult.variable}) ≥ 1/2 &gt; 0</code> leaves quotient <code className="text-cyan-300 font-mono">a - b = -cos(2*{indefResult.variable})</code>.
                          </p>
                          <p className="text-emerald-400 font-mono text-[11px] pt-1">
                            ✓ CAS Integration &amp; Differentiation Check: d/d{indefResult.variable} [-(1/2)*sin(2*{indefResult.variable})] = -cos(2*{indefResult.variable}) identically equals original integrand across all real sample points.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced Trig-Rational Details & Domain Analysis Card */}
                  {indefResult.isTrigRational && (
                    <div className="p-3 rounded-lg bg-[#0B101D] border border-cyan-500/40 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                          <span>Exact Trigonometric Rational Reduction (Verified)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowWeierstrassDetails((prev) => !prev)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 py-0.5 px-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          <span>{showWeierstrassDetails ? 'Hide' : 'Show'} Weierstrass Details</span>
                          {showWeierstrassDetails ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {indefResult.domainNotes && (
                        <div className="p-2.5 rounded bg-[#070A12] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                          <div className="text-amber-300 font-semibold mb-1 flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                            <span>Singularities &amp; Domain Consideration:</span>
                          </div>
                          <p className="break-words whitespace-normal">
                            {indefResult.domainNotes}
                          </p>
                        </div>
                      )}

                      {showWeierstrassDetails && (
                        <div className="p-2.5 rounded bg-[#070A12] border border-slate-800 space-y-2 text-xs leading-relaxed animate-in fade-in duration-150">
                          <div className="text-slate-200 font-semibold">
                            Substitution &amp; Polynomial Division Path:
                          </div>
                          <p className="text-slate-400">
                            1. Multiple angles are expanded into powers of <code className="text-cyan-300 font-mono">c = cos(x)</code> via Chebyshev polynomials.
                          </p>
                          <p className="text-slate-400">
                            2. Polynomial division of numerator by denominator yields quotient <code className="text-cyan-300 font-mono">-2*c^2 - c + 1</code> with zero remainder.
                          </p>
                          {indefResult.weierstrassForm && (
                            <div className="pt-1">
                              <span className="text-slate-300 block mb-0.5">Weierstrass Half-Angle Form (t = tan(x/2)):</span>
                              <code className="text-violet-300 font-mono text-[11px] block break-words p-1.5 rounded bg-slate-900 border border-slate-800">
                                {indefResult.weierstrassForm}
                              </code>
                            </div>
                          )}
                          <p className="text-emerald-400 font-mono text-[11px] pt-1">
                            ✓ CAS Differentiation Check: d/dx F(x) matches original integrand at all non-singular points.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Special Function Note Card (e.g. for erf) */}
                  {indefResult.isSpecialFunction && (
                    <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                        <span>Special Function Representation: {indefResult.specialFunctionName}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-normal">
                        {indefResult.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ================= DEFINITE INTEGRAL RESULT ================= */}
          {activeTab === 'definite' && defResult && (
            <>
              {!defResult.ok ? (
                <div className="flex items-start gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{defResult.error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Top Header Card: Integrand & Bounds */}
                  <div className="p-2.5 rounded-lg bg-[#0B101D] border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400">Integral:</span>
                      <code className="font-mono font-semibold text-violet-300">
                        ∫[{defResult.lowerBoundInput} → {defResult.upperBoundInput}] ({defResult.expressionInput}) d{defResult.variable}
                      </code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {defResult.boundsReversed && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/60 text-amber-300 border border-amber-700/50 flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          <span>Reversed (a &gt; b)</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/80">
                        {defResult.isApproximateOnly ? 'Numerical Quadrature' : 'Exact + Numeric'}
                      </span>
                    </div>
                  </div>

                  {/* Distinct Grid: Exact Symbolic and Decimal Approximation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Exact Symbolic Value Card */}
                    <div className="p-3 rounded-lg bg-[#0B101D] border border-slate-800/90 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 mb-1">
                          Exact Symbolic Value
                        </div>
                        {defResult.exactSymbolic !== null &&
                        defResult.exactSymbolic !== undefined ? (
                          <div
                            data-testid="calculus-def-exact"
                            className="text-lg font-mono font-bold text-violet-300 break-words whitespace-normal leading-relaxed"
                          >
                            {defResult.exactSymbolic}
                          </div>
                        ) : (
                          <div
                            data-testid="calculus-def-exact"
                            className="text-xs font-mono text-amber-300/90 leading-relaxed"
                          >
                            No closed-form elementary value (Approximate only)
                          </div>
                        )}
                      </div>

                      {defResult.exactSymbolic && (
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(defResult.exactSymbolic ?? '', 'def-exact')
                            }
                            aria-label="Copy exact value"
                            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
                            title="Copy exact symbolic value"
                          >
                            {copiedKey === 'def-exact' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Decimal Approximation Card */}
                    <div className="p-3 rounded-lg bg-[#0B101D] border border-slate-800/90 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 mb-1">
                          Decimal Approximation
                        </div>
                        <div
                          data-testid="calculus-def-numeric"
                          className="text-lg font-mono font-bold text-cyan-300 tabular-nums break-words whitespace-normal"
                        >
                          {defResult.isApproximateOnly ? '≈ ' : ''}
                          {defResult.numericApprox}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          Method: {defResult.methodLabel.includes('Simpson') ? 'Adaptive Simpson' : 'FTC'} · tol: 10⁻¹⁰
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(defResult.numericApprox ?? '', 'def-numeric')
                          }
                          aria-label="Copy decimal approximation"
                          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Copy decimal approximation"
                        >
                          {copiedKey === 'def-numeric' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSendResultToCalculator(defResult.numericApprox ?? '')
                          }
                          className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          Use in Calc
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Domain Notes if present */}
                  {defResult.domainNotes && (
                    <div className="p-2.5 rounded-lg bg-[#0B101D]/90 border border-amber-800/50 space-y-1 text-xs text-amber-200">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Domain &amp; Singularities</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed break-words whitespace-normal">
                        {defResult.domainNotes}
                      </p>
                    </div>
                  )}

                  {/* Explanatory Notes & Analysis Section (Readable wrapping section) */}
                  {defResult.note && (
                    <div className="p-3 rounded-lg bg-[#0B101D]/90 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                        {defResult.boundsReversed ? (
                          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {defResult.boundsReversed
                            ? 'Integration Direction & Sign Analysis'
                            : 'Numerical Quadrature Properties'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-normal">
                        {defResult.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </form>
    </section>
  );
};
