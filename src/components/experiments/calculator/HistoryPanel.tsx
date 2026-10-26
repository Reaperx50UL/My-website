"use client";

import React, { useState } from 'react';
import { History, Trash2, Copy, Check, CornerUpLeft, PlusCircle } from 'lucide-react';
import type { AngleMode } from './utils/mathEngine';

export interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  angleMode: AngleMode;
  timestamp: number;
}

interface HistoryPanelProps {
  items: CalculationHistoryItem[];
  onReuseExpression: (expression: string) => void;
  onInsertResult: (result: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  className?: string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  items,
  onReuseExpression,
  onInsertResult,
  onDeleteItem,
  onClearHistory,
  className = '',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <section
      aria-label="Calculation History"
      className={`flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Calculation History
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            · {items.length} {items.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            aria-label="Clear calculation history"
            className="px-2.5 py-1 text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/50 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Scrollable History List */}
      <div className="flex-1 max-h-[380px] overflow-y-auto divide-y divide-slate-800/70">
        {items.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <p className="text-xs font-medium text-slate-300">No calculations recorded yet</p>
            <p className="text-xs text-slate-400">
              Evaluated expressions are saved automatically to local storage for reuse.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              data-testid="history-item"
              className="p-3.5 hover:bg-slate-800/30 transition-colors flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onReuseExpression(item.expression)}
                  className="text-xs font-mono text-slate-300 hover:text-cyan-300 text-left break-all transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
                  title="Reuse this expression"
                >
                  {item.expression}
                </button>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {item.angleMode}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onInsertResult(item.result)}
                  className="text-base font-mono font-bold text-cyan-300 hover:text-cyan-200 tabular-nums text-left break-all transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
                  title="Insert result into calculator"
                >
                  = {item.result}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onReuseExpression(item.expression)}
                    aria-label={`Reuse expression ${item.expression}`}
                    title="Load expression"
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertResult(item.result)}
                    aria-label={`Insert result ${item.result}`}
                    title="Insert result"
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.result, item.id)}
                    aria-label={`Copy result ${item.result}`}
                    title="Copy result"
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    aria-label={`Delete calculation ${item.expression}`}
                    title="Remove entry"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
