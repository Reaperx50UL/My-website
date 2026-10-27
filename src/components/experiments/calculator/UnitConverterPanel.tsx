"use client";

import React, { useState, useMemo } from 'react';
import {
  Scale,
  Ruler,
  ArrowLeftRight,
  Copy,
  Check,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import {
  convertUnitValue,
  getUnitsByCategory,
  type UnitCategory,
} from './utils/unitConverterEngine';

export interface UnitConverterPanelProps {
  currentCalculatorValue?: string;
  onSendResultToCalculator?: (value: string) => void;
  className?: string;
}

const LENGTH_PRESETS = [
  { label: '1 km → mi', value: '1', from: 'km', to: 'mi' },
  { label: '100 cm → in', value: '100', from: 'cm', to: 'in' },
  { label: '6 ft → m', value: '6', from: 'ft', to: 'm' },
  { label: '1 mi → km', value: '1', from: 'mi', to: 'km' },
];

const MASS_PRESETS = [
  { label: '1 kg → lb', value: '1', from: 'kg', to: 'lb' },
  { label: '500 g → oz', value: '500', from: 'g', to: 'oz' },
  { label: '150 lb → kg', value: '150', from: 'lb', to: 'kg' },
  { label: '1 t → lb', value: '1', from: 't', to: 'lb' },
];

export const UnitConverterPanel: React.FC<UnitConverterPanelProps> = ({
  currentCalculatorValue = '',
  onSendResultToCalculator,
  className = '',
}) => {
  const [category, setCategory] = useState<UnitCategory>('length');
  const [inputValue, setInputValue] = useState<string>('1');
  const [fromUnitId, setFromUnitId] = useState<string>('m');
  const [toUnitId, setToUnitId] = useState<string>('ft');
  const [copied, setCopied] = useState<boolean>(false);

  const units = useMemo(() => getUnitsByCategory(category), [category]);

  const conversion = useMemo(
    () => convertUnitValue(inputValue, category, fromUnitId, toUnitId),
    [inputValue, category, fromUnitId, toUnitId]
  );

  const handleCategoryChange = (nextCategory: UnitCategory) => {
    setCategory(nextCategory);
    if (nextCategory === 'length') {
      setFromUnitId('m');
      setToUnitId('ft');
    } else {
      setFromUnitId('kg');
      setToUnitId('lb');
    }
  };

  const handleSwapUnits = () => {
    setFromUnitId(toUnitId);
    setToUnitId(fromUnitId);
  };

  const handleCopy = async () => {
    if (!conversion.ok || !conversion.formattedOutput) return;
    try {
      await navigator.clipboard.writeText(conversion.formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const presets = category === 'length' ? LENGTH_PRESETS : MASS_PRESETS;

  return (
    <section
      aria-label="Unit Converter"
      className={`flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {category === 'length' ? (
            <Ruler className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          ) : (
            <Scale className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
          )}
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Unit Converter
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            · Length &amp; Mass
          </span>
        </div>

        {currentCalculatorValue.trim() && currentCalculatorValue.trim() !== '0' && (
          <button
            type="button"
            onClick={() => setInputValue(currentCalculatorValue.trim())}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0"
            title="Load value from main calculator"
          >
            <span>Use Main Value</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category Switcher Tabs: Length vs Mass */}
      <div
        role="tablist"
        aria-label="Unit conversion category"
        className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#090D16] border-b border-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={category === 'length'}
          onClick={() => handleCategoryChange('length')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            category === 'length'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Length (m, km, ft, mi)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={category === 'mass'}
          onClick={() => handleCategoryChange('mass')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            category === 'mass'
              ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Mass (kg, g, lb, oz)</span>
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-0.5">Presets:</span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setInputValue(preset.value);
                setFromUnitId(preset.from);
                setToUnitId(preset.to);
              }}
              className="px-2 py-1 text-xs font-mono bg-[#131C2E] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Value Input */}
        <div>
          <label
            htmlFor="unit-converter-input"
            className="block text-xs font-medium text-slate-300 mb-1"
          >
            Input Value or Expression
          </label>
          <input
            id="unit-converter-input"
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value (e.g. 1, 2.5, 100)"
            className="w-full px-3 py-2 text-sm font-mono bg-[#070A12] border border-slate-800 focus:border-cyan-400 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>

        {/* From / Swap / To Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div>
            <label
              htmlFor="unit-from-select"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              From Unit
            </label>
            <select
              id="unit-from-select"
              value={fromUnitId}
              onChange={(e) => setFromUnitId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#070A12] border border-slate-800 focus:border-cyan-400 rounded-lg text-slate-100 focus:outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapUnits}
            aria-label="Swap From and To units"
            title="Swap units"
            className="h-[36px] px-3 bg-[#131C2E] hover:bg-slate-800 text-cyan-300 border border-slate-700/80 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-mono transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sm:hidden">Swap Units</span>
          </button>

          <div>
            <label
              htmlFor="unit-to-select"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              To Unit
            </label>
            <select
              id="unit-to-select"
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#070A12] border border-slate-800 focus:border-cyan-400 rounded-lg text-slate-100 focus:outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Primary Conversion Result Card */}
        {!conversion.ok ? (
          <div
            role="alert"
            className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-lg flex items-start gap-2 text-xs text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{conversion.error}</span>
          </div>
        ) : (
          <div className="p-3.5 bg-[#070A12] border border-slate-800 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <span className="text-xs font-mono text-slate-400">
                {conversion.formattedInput} {conversion.fromUnit?.symbol} =
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                1 {conversion.fromUnit?.symbol} = {conversion.unitRateFormatted}{' '}
                {conversion.toUnit?.symbol}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <output
                  data-testid="unit-converter-result"
                  aria-label="Converted unit value"
                  className="text-2xl font-mono font-bold text-cyan-300 tabular-nums truncate"
                >
                  {conversion.formattedOutput}
                </output>
                <span className="text-sm font-mono font-semibold text-slate-300">
                  {conversion.toUnit?.symbol}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy converted value"
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md inline-flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy</span>
                </button>

                {onSendResultToCalculator && (
                  <button
                    type="button"
                    onClick={() =>
                      onSendResultToCalculator(conversion.formattedOutput ?? '0')
                    }
                    className="px-2.5 py-1 text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Use in Calc
                  </button>
                )}
              </div>
            </div>

            {/* All Units Reference Grid */}
            {conversion.allConversions && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                  Equivalent {category === 'length' ? 'Length' : 'Mass'} Scales
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {conversion.allConversions.map((entry) => {
                    const isSelected = entry.unit.id === toUnitId;
                    return (
                      <button
                        key={entry.unit.id}
                        type="button"
                        onClick={() => setToUnitId(entry.unit.id)}
                        className={`px-2 py-1.5 rounded border text-left transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200'
                            : 'bg-[#0B101D] hover:bg-slate-800/70 border-slate-800/90 text-slate-300'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{entry.unit.name}</span>
                          <span className="font-mono text-slate-300">
                            {entry.unit.symbol}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-semibold truncate mt-0.5">
                          {entry.formattedValue}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default UnitConverterPanel;
