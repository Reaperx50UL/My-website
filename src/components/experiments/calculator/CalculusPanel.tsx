"use client";

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  differentiateExpression,
  integrateIndefinite,
  integrateDefinite,
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
  { label: 'x³', expr: 'x^3', evalAt: '2' },
  { label: 'sin(x)·cos(x)', expr: 'sin(x)*cos(x)', evalAt: 'pi/4' },
  { label: 'x²·ln(x)', expr: 'x^2 * ln(x)', evalAt: 'e' },
  { label: 'e^(2x)', expr: 'e^(2*x)', evalAt: '0' },
];

const INDEF_PRESETS = [
  { label: 'x²', expr: 'x^2' },
  { label: '2x·cos(x²)', expr: '2*x*cos(x^2)' },
  { label: '1/(1+x²)', expr: '1/(1+x^2)' },
  { label: 'e^(−x²) (Non-elementary)', expr: 'e^(-x^2)' },
];

const DEF_PRESETS = [
  { label: '∫[0→1] x² dx', expr: 'x^2', lower: '0', upper: '1' },
  { label: '∫[0→π] sin(x) dx', expr: 'sin(x)', lower: '0', upper: 'pi' },
  { label: '∫[0→1] e^(−x²) dx', expr: 'e^(-x^2)', lower: '0', upper: '1' },
  { label: '∫[1→0] x² dx (Reversed)', expr: 'x^2', lower: '1', upper: '0' },
];

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
      // Clipboard fallback ignored safely
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
            · Symbolic CAS &amp; Adaptive Simpson
          </span>
        </div>

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
        className="grid grid-cols-3 gap-1 p-1.5 bg-[#090D16] border-b border-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'differentiate'}
          onClick={() => {
            setActiveTab('differentiate');
          }}
          className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            activeTab === 'differentiate'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          Differentiate (d/dx)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'indefinite'}
          onClick={() => {
            setActiveTab('indefinite');
          }}
          className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            activeTab === 'indefinite'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          Indefinite (∫ dx)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'definite'}
          onClick={() => {
            setActiveTab('definite');
          }}
          className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            activeTab === 'definite'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          Definite (∫[a→b])
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
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Examples:</span>
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
                className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {preset.label}
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
                className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {preset.label}
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
                className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {preset.label}
              </button>
            ))}
        </div>

        {/* Expression & Variable Row */}
        <div className="grid grid-cols-12 gap-2.5">
          <div className="col-span-9">
            <label
              htmlFor="calculus-expr-input"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Function Expression <span className="font-mono text-slate-400">f({variable || 'x'})</span>
            </label>
            <input
              id="calculus-expr-input"
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g. x^3, sin(x), x^2 + 2*x"
              className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="col-span-3">
            <label
              htmlFor="calculus-var-input"
              className="block text-xs font-medium text-slate-300 mb-1"
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
              className="w-full px-3 py-2 text-sm font-mono text-center bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
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
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                className="w-full px-2.5 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value={1}>1st (d/d{variable || 'x'})</option>
                <option value={2}>2nd (d²/d{variable || 'x'}²)</option>
                <option value={3}>3rd (d³/d{variable || 'x'}³)</option>
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
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        )}

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

        {/* Results Output Card */}
        <div
          aria-live="polite"
          className="mt-3 p-3.5 bg-[#070A12] border border-slate-800 rounded-lg space-y-2.5"
        >
          {/* DIFFERENTIATION RESULT */}
          {activeTab === 'differentiate' && diffResult && (
            <>
              {!diffResult.ok ? (
                <div className="flex items-start gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{diffResult.error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>
                        Symbolic Derivative{' '}
                        <code className="font-mono text-violet-300">
                          {diffResult.order === 1
                            ? `d/d${diffResult.variable}`
                            : `d^${diffResult.order}/d${diffResult.variable}^${diffResult.order}`}{' '}
                          [{diffResult.expressionInput}]
                        </code>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onPlotExpression(diffResult.symbolicRaw ?? diffResult.symbolicDisplay ?? '')
                          }
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition-colors"
                        >
                          Plot f&apos;(x)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              diffResult.symbolicDisplay ?? '',
                              'diff-symbolic'
                            )
                          }
                          aria-label="Copy symbolic derivative"
                          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
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
                      className="text-lg font-mono font-semibold text-cyan-300 break-all"
                    >
                      {diffResult.symbolicDisplay}
                    </div>
                    {diffResult.symbolicRaw &&
                      diffResult.symbolicRaw !== diffResult.symbolicDisplay && (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Parser syntax: {diffResult.symbolicRaw}
                        </div>
                      )}
                  </div>

                  {diffResult.evaluatedAt !== undefined &&
                    diffResult.evaluatedNumeric !== undefined && (
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-400">
                            Evaluated at{' '}
                            <code className="font-mono text-slate-200">
                              {diffResult.variable} = {diffResult.evaluatedAt}
                            </code>
                          </div>
                          <div
                            data-testid="calculus-diff-evaluated"
                            className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-0.5"
                          >
                            {diffResult.evaluatedNumeric}
                          </div>
                        </div>

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
                    )}
                </div>
              )}
            </>
          )}

          {/* INDEFINITE INTEGRAL RESULT */}
          {activeTab === 'indefinite' && indefResult && (
            <>
              {!indefResult.ok ? (
                <div className="flex items-start gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{indefResult.error}</span>
                </div>
              ) : !indefResult.supported ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">
                        Symbolic Closed-Form Antiderivative Unavailable
                      </p>
                      <p className="text-slate-300 mt-1 leading-relaxed">
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
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>
                      Symbolic Antiderivative{' '}
                      <code className="font-mono text-violet-300">
                        ∫ ({indefResult.expressionInput}) d{indefResult.variable}
                      </code>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(indefResult.symbolicWithConstant ?? '', 'indef-symbolic')
                      }
                      aria-label="Copy indefinite integral"
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      {copiedKey === 'indef-symbolic' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div
                    data-testid="calculus-indef-result"
                    className="text-lg font-mono font-semibold text-cyan-300 break-all"
                  >
                    {indefResult.symbolicWithConstant}
                  </div>
                </div>
              )}
            </>
          )}

          {/* DEFINITE INTEGRAL RESULT */}
          {activeTab === 'definite' && defResult && (
            <>
              {!defResult.ok ? (
                <div className="flex items-start gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{defResult.error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Definite Integral{' '}
                      <code className="font-mono text-violet-300">
                        ∫[{defResult.lowerBoundInput} → {defResult.upperBoundInput}] (
                        {defResult.expressionInput}) d{defResult.variable}
                      </code>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {defResult.isApproximateOnly ? 'Numerical Approximation' : 'Exact + Numeric'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Exact Symbolic Box */}
                    <div className="p-2.5 rounded-lg bg-[#0B101D] border border-slate-800/90">
                      <div className="text-[11px] text-slate-400 mb-1">
                        Exact Symbolic Value
                      </div>
                      {defResult.exactSymbolic !== null &&
                      defResult.exactSymbolic !== undefined ? (
                        <div
                          data-testid="calculus-def-exact"
                          className="text-lg font-mono font-bold text-violet-300 break-all"
                        >
                          {defResult.exactSymbolic}
                        </div>
                      ) : (
                        <div
                          data-testid="calculus-def-exact"
                          className="text-xs font-mono text-amber-300/90"
                        >
                          No closed-form symbolic value (Approximate only)
                        </div>
                      )}
                    </div>

                    {/* Decimal Approximation Box */}
                    <div className="p-2.5 rounded-lg bg-[#0B101D] border border-slate-800/90 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">
                          {defResult.isApproximateOnly
                            ? 'Approximate (Adaptive Simpson)'
                            : 'Decimal Approximation'}
                        </div>
                        <div
                          data-testid="calculus-def-numeric"
                          className="text-lg font-mono font-bold text-cyan-300 tabular-nums"
                        >
                          {defResult.isApproximateOnly ? '≈ ' : ''}
                          {defResult.numericApprox}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onSendResultToCalculator(defResult.numericApprox ?? '')
                        }
                        className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        Use
                      </button>
                    </div>
                  </div>

                  {defResult.note && (
                    <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{defResult.note}</span>
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
