"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Calculator, 
  RotateCcw, 
  Delete, 
  History, 
  Sparkles, 
  Check, 
  Copy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

type AngleMode = "DEG" | "RAD";

export function ScientificCalculator() {
  const [expression, setExpression] = useState<string>("");
  const [displayResult, setDisplayResult] = useState<string>("0");
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastAns, setLastAns] = useState<string>("0");
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Factorial helper
  const factorial = (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // overflow limit
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };

  // Safe evaluation parser
  const safeEvaluate = useCallback((rawExpr: string): { success: boolean; value: string } => {
    if (!rawExpr.trim()) return { success: true, value: "0" };

    try {
      let parsed = rawExpr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "Math.PI")
        .replace(/\be\b/g, "Math.E")
        .replace(/Ans/g, `(${lastAns || "0"})`);

      // Convert trig based on DEG / RAD
      if (angleMode === "DEG") {
        parsed = parsed
          .replace(/sin\(/g, "Math.sin((Math.PI/180)*")
          .replace(/cos\(/g, "Math.cos((Math.PI/180)*")
          .replace(/tan\(/g, "Math.tan((Math.PI/180)*")
          .replace(/asin\(/g, "(180/Math.PI)*Math.asin(")
          .replace(/acos\(/g, "(180/Math.PI)*Math.acos(")
          .replace(/atan\(/g, "(180/Math.PI)*Math.atan(");
      } else {
        parsed = parsed
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/asin\(/g, "Math.asin(")
          .replace(/acos\(/g, "Math.acos(")
          .replace(/atan\(/g, "Math.atan(");
      }

      // Logarithms and roots
      parsed = parsed
        .replace(/ln\(/g, "Math.log(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/cbrt\(/g, "Math.cbrt(")
        .replace(/\^/g, "**");

      // Handle factorial n!
      parsed = parsed.replace(/(\d+(?:\.\d+)?)!/g, (_, num) => {
        return `(${factorial(parseFloat(num))})`;
      });

      // Strict validation: only allowed characters
      if (/[^0-9+\-*/%().\sMathPIE,]/.test(parsed)) {
        return { success: false, value: "Syntax Error" };
      }

      // Evaluate safely via Function constructor with sandbox args
      const evaluator = new Function("Math", `return (${parsed});`);
      const val = evaluator(Math);

      if (typeof val !== "number" || isNaN(val)) {
        return { success: false, value: "Error" };
      }
      if (!isFinite(val)) {
        return { success: false, value: "Overflow" };
      }

      // Format clean precision
      const rounded = Math.round(val * 1e12) / 1e12;
      return { success: true, value: rounded.toString() };
    } catch {
      return { success: false, value: "Error" };
    }
  }, [angleMode, lastAns]);

  // Handle Input Append
  const appendInput = useCallback((val: string) => {
    if (hasEvaluated) {
      if (/^[0-9.]/.test(val)) {
        setExpression(val);
        setDisplayResult(val);
      } else {
        setExpression(lastAns + val);
        setDisplayResult(lastAns + val);
      }
      setHasEvaluated(false);
      return;
    }

    setExpression(prev => {
      const next = prev + val;
      setDisplayResult(next);
      return next;
    });
  }, [hasEvaluated, lastAns]);

  // Clear All
  const clearAll = useCallback(() => {
    setExpression("");
    setDisplayResult("0");
    setHasEvaluated(false);
  }, []);

  // Backspace Delete
  const deleteLast = useCallback(() => {
    if (hasEvaluated) {
      clearAll();
      return;
    }
    setExpression(prev => {
      if (prev.length <= 1) {
        setDisplayResult("0");
        return "";
      }
      const next = prev.slice(0, -1);
      setDisplayResult(next);
      return next;
    });
  }, [clearAll, hasEvaluated]);

  // Execute Calculation
  const calculate = useCallback(() => {
    if (!expression.trim()) return;
    const res = safeEvaluate(expression);
    if (res.success) {
      setLastAns(res.value);
      setDisplayResult(res.value);
      setHistory(prev => [
        { expr: expression, result: res.value },
        ...prev.slice(0, 19) // keep last 20
      ]);
      setHasEvaluated(true);
    } else {
      setDisplayResult(res.value);
    }
  }, [expression, safeEvaluate]);

  // Copy result to clipboard
  const copyResult = () => {
    navigator.clipboard.writeText(displayResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Memory keys
  const handleMemory = (action: "MC" | "MR" | "M+" | "M-") => {
    const current = parseFloat(displayResult) || 0;
    switch (action) {
      case "MC":
        setMemory(0);
        break;
      case "MR":
        appendInput(memory.toString());
        break;
      case "M+":
        setMemory(prev => prev + current);
        break;
      case "M-":
        setMemory(prev => prev - current);
        break;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in another input element
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key;

      if (key >= "0" && key <= "9") {
        appendInput(key);
      } else if (key === "+" || key === "-" || key === "%" || key === "(" || key === ")" || key === "^") {
        appendInput(key);
      } else if (key === "*") {
        appendInput("×");
      } else if (key === "/") {
        e.preventDefault();
        appendInput("÷");
      } else if (key === ".") {
        appendInput(".");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        calculate();
      } else if (key === "Backspace") {
        deleteLast();
      } else if (key === "Escape") {
        clearAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appendInput, calculate, clearAll, deleteLast]);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-2xl mx-auto rounded-2xl bg-slate-950/80 border border-cyan-500/30 p-4 md:p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-xl select-none"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cyan-200 tracking-wider uppercase">
              VOID // SCIENTIFIC COMPUTE
            </h3>
            <span className="text-[10px] text-cyan-400/60 font-mono">V4.2 HIGH-PRECISION KERNEL</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Angle Mode Toggle */}
          <button
            onClick={() => setAngleMode(m => m === "DEG" ? "RAD" : "DEG")}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm"
            title="Toggle Degrees / Radians"
          >
            {angleMode}
          </button>

          {/* History Drawer Button */}
          <button
            onClick={() => setShowHistory(h => !h)}
            className={cn(
              "p-1.5 rounded-md text-xs font-mono border transition-all",
              showHistory 
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50" 
                : "bg-cyan-950/40 text-cyan-400/80 border-cyan-500/20 hover:text-cyan-200"
            )}
            title="View calculation history"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="mb-4 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/20 max-h-48 overflow-y-auto space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-cyan-400/60 pb-1 border-b border-cyan-500/10 text-[11px]">
            <span>RECENT COMPUTATIONS</span>
            <button 
              onClick={() => setHistory([])}
              className="text-red-400/80 hover:text-red-300 hover:underline"
            >
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-2">No previous calculations recorded</p>
          ) : (
            history.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setExpression(item.result);
                  setDisplayResult(item.result);
                }}
                className="flex justify-between items-center p-1.5 rounded bg-slate-950/60 hover:bg-cyan-500/10 cursor-pointer text-slate-300 transition-colors"
              >
                <span className="text-cyan-400/80 truncate max-w-[65%]">{item.expr}</span>
                <span className="text-cyan-200 font-bold">= {item.result}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Screen / Display */}
      <div className="relative mb-5 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 shadow-inner flex flex-col justify-end min-h-[105px]">
        {/* Subtle glowing grid background in LCD */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none rounded-xl" />

        {/* Expression trace */}
        <div className="text-xs font-mono text-cyan-400/60 tracking-wider truncate mb-1">
          {expression || "READY"}
        </div>

        {/* Main readout */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-3xl md:text-4xl font-mono font-bold text-cyan-100 tracking-tight overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            {displayResult}
          </div>
          
          <button
            onClick={copyResult}
            className="p-1.5 text-cyan-400/60 hover:text-cyan-200 rounded-md hover:bg-cyan-500/10 transition-colors shrink-0"
            title="Copy answer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Indicator badges */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cyan-500/10 text-[10px] font-mono text-cyan-400/50">
          <span>MODE: {angleMode}</span>
          <span>•</span>
          <span>MEM: {memory !== 0 ? memory : "EMPTY"}</span>
          <span>•</span>
          <span className="text-emerald-400/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>

      {/* Memory Bar */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {(["MC", "MR", "M+", "M-"] as const).map(action => (
          <button
            key={action}
            onClick={() => handleMemory(action)}
            className="py-1 text-xs font-mono rounded bg-slate-900/60 border border-cyan-500/20 text-cyan-400/70 hover:bg-cyan-500/15 hover:text-cyan-200 transition-all active:scale-95"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Scientific & Arithmetic Keypad */}
      <div className="grid grid-cols-5 gap-2 font-mono text-sm">
        {/* Row 1: Advanced functions */}
        <button
          onClick={() => appendInput("sin(")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          sin
        </button>
        <button
          onClick={() => appendInput("cos(")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          cos
        </button>
        <button
          onClick={() => appendInput("tan(")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          tan
        </button>
        <button
          onClick={() => appendInput("log(")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          log
        </button>
        <button
          onClick={() => appendInput("ln(")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          ln
        </button>

        {/* Row 2: Powers, Roots, Pi, E */}
        <button
          onClick={() => appendInput("sqrt(")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          √x
        </button>
        <button
          onClick={() => appendInput("^")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          xʸ
        </button>
        <button
          onClick={() => appendInput("π")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          π
        </button>
        <button
          onClick={() => appendInput("e")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          e
        </button>
        <button
          onClick={() => appendInput("!")}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all active:scale-95 text-xs font-semibold"
        >
          n!
        </button>

        {/* Row 3: Brackets, AC, DEL */}
        <button
          onClick={() => appendInput("(")}
          className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-all active:scale-95 font-semibold"
        >
          (
        </button>
        <button
          onClick={() => appendInput(")")}
          className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-all active:scale-95 font-semibold"
        >
          )
        </button>
        <button
          onClick={() => appendInput("%")}
          className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-all active:scale-95 font-semibold"
        >
          %
        </button>
        <button
          onClick={deleteLast}
          className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 font-bold flex items-center justify-center"
          title="Backspace"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={clearAll}
          className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all active:scale-95 font-bold"
          title="All Clear"
        >
          AC
        </button>

        {/* Row 4: 7, 8, 9, Operators */}
        <button
          onClick={() => appendInput("7")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          7
        </button>
        <button
          onClick={() => appendInput("8")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          8
        </button>
        <button
          onClick={() => appendInput("9")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          9
        </button>
        <button
          onClick={() => appendInput("÷")}
          className="p-3.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all active:scale-95 font-bold text-lg"
        >
          ÷
        </button>
        <button
          onClick={() => appendInput("×")}
          className="p-3.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all active:scale-95 font-bold text-lg"
        >
          ×
        </button>

        {/* Row 5: 4, 5, 6, -, + */}
        <button
          onClick={() => appendInput("4")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          4
        </button>
        <button
          onClick={() => appendInput("5")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          5
        </button>
        <button
          onClick={() => appendInput("6")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          6
        </button>
        <button
          onClick={() => appendInput("-")}
          className="p-3.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all active:scale-95 font-bold text-lg"
        >
          -
        </button>
        <button
          onClick={() => appendInput("+")}
          className="p-3.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all active:scale-95 font-bold text-lg"
        >
          +
        </button>

        {/* Row 6: 1, 2, 3, Ans, Equals */}
        <button
          onClick={() => appendInput("1")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          1
        </button>
        <button
          onClick={() => appendInput("2")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          2
        </button>
        <button
          onClick={() => appendInput("3")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          3
        </button>
        <button
          onClick={() => appendInput("Ans")}
          className="p-3.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all active:scale-95 font-semibold text-xs"
          title="Last Answer"
        >
          Ans
        </button>
        <button
          onClick={calculate}
          className="row-span-2 p-3.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xl hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all active:scale-95 flex items-center justify-center"
        >
          =
        </button>

        {/* Row 7: 0, ., ± */}
        <button
          onClick={() => appendInput("0")}
          className="col-span-2 p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-medium text-base"
        >
          0
        </button>
        <button
          onClick={() => appendInput(".")}
          className="p-3.5 rounded-lg bg-slate-900/90 border border-white/5 text-white hover:bg-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 font-bold text-base"
        >
          .
        </button>
        <button
          onClick={() => {
            if (displayResult.startsWith("-")) {
              setDisplayResult(displayResult.substring(1));
              setExpression(prev => prev.startsWith("-") ? prev.substring(1) : prev);
            } else {
              setDisplayResult("-" + displayResult);
              setExpression(prev => "-" + prev);
            }
          }}
          className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-all active:scale-95 font-medium text-sm"
        >
          ±
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-4 pt-3 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono text-cyan-400/50">
        <span>KEYBOARD ENABLED</span>
        <span>ENTER = EVAL • ESC = CLEAR</span>
      </div>
    </div>
  );
}
