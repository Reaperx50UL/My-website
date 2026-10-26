"use client";

import React, { useState, useMemo, useRef } from 'react';
import {
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Crosshair,
} from 'lucide-react';
import { generateFunctionPlot } from './utils/graphEngine';
import { evaluateMathExpression, formatNumber, type AngleMode } from './utils/mathEngine';

interface GraphPlotterProps {
  expression: string;
  onExpressionChange: (expr: string) => void;
  angleMode: AngleMode;
}

const GRAPH_PRESETS = [
  { label: 'sin(x)', expr: 'sin(x)', xMin: -6.28, xMax: 6.28 },
  { label: 'x³ − 3x', expr: 'x^3 - 3*x', xMin: -3, xMax: 3 },
  { label: '1/x (Asymptote)', expr: '1/x', xMin: -6, xMax: 6 },
  { label: 'tan(x)', expr: 'tan(x)', xMin: -4.71, xMax: 4.71 },
  { label: 'e^(−x²/2)', expr: 'e^(-x^2 / 2)', xMin: -4, xMax: 4 },
];

export const GraphPlotter: React.FC<GraphPlotterProps> = ({
  expression,
  onExpressionChange,
  angleMode,
}) => {
  const [xMinInput, setXMinInput] = useState<string>('-10');
  const [xMaxInput, setXMaxInput] = useState<string>('10');
  const [hoverX, setHoverX] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const parsedBounds = useMemo(() => {
    const minEval = evaluateMathExpression(xMinInput.trim() || '-10', { angleMode: 'RAD' });
    const maxEval = evaluateMathExpression(xMaxInput.trim() || '10', { angleMode: 'RAD' });
    return {
      xMin: minEval.ok && minEval.value !== undefined ? minEval.value : NaN,
      xMax: maxEval.ok && maxEval.value !== undefined ? maxEval.value : NaN,
    };
  }, [xMinInput, xMaxInput]);

  const plotData = useMemo(() => {
    return generateFunctionPlot(expression, parsedBounds.xMin, parsedBounds.xMax, {
      angleMode,
      numSamples: 480,
    });
  }, [expression, parsedBounds.xMin, parsedBounds.xMax, angleMode]);

  const handleZoom = (factor: number) => {
    if (!plotData.ok) return;
    const center = 0.5 * (plotData.xMin + plotData.xMax);
    const halfSpan = Math.max(0.5 * (plotData.xMax - plotData.xMin) * factor, 0.1);
    setXMinInput(formatNumber(center - halfSpan, 4));
    setXMaxInput(formatNumber(center + halfSpan, 4));
  };

  const handleResetBounds = () => {
    setXMinInput('-10');
    setXMaxInput('10');
  };

  // SVG coordinate dimensions
  const VIEW_W = 560;
  const VIEW_H = 300;
  const PAD_LEFT = 48;
  const PAD_RIGHT = 18;
  const PAD_TOP = 18;
  const PAD_BOTTOM = 32;
  const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

  const mapX = (x: number) => {
    if (!plotData.ok) return PAD_LEFT;
    return PAD_LEFT + ((x - plotData.xMin) / (plotData.xMax - plotData.xMin)) * PLOT_W;
  };

  const mapY = (y: number) => {
    if (!plotData.ok) return PAD_TOP;
    return PAD_TOP + (1 - (y - plotData.yMin) / (plotData.yMax - plotData.yMin)) * PLOT_H;
  };

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !plotData.ok) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    if (relX < PAD_LEFT || relX > VIEW_W - PAD_RIGHT) {
      setHoverX(null);
      return;
    }
    const ratio = (relX - PAD_LEFT) / PLOT_W;
    const xVal = plotData.xMin + ratio * (plotData.xMax - plotData.xMin);
    setHoverX(xVal);
  };

  const hoverPoint = useMemo(() => {
    if (hoverX === null || !plotData.ok) return null;
    const res = evaluateMathExpression(expression, {
      angleMode,
      variables: { x: hoverX },
    });
    if (!res.ok || res.value === undefined || !Number.isFinite(res.value)) {
      return { x: hoverX, y: null };
    }
    return { x: hoverX, y: res.value };
  }, [hoverX, plotData.ok, expression, angleMode]);

  return (
    <section
      aria-label="Function Plotter"
      className="flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Function Plotter
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            · y = f(x) · {angleMode}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleZoom(0.65)}
            aria-label="Zoom in graph"
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.5)}
            aria-label="Zoom out graph"
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetBounds}
            aria-label="Reset graph bounds"
            title="Reset Bounds [-10, 10]"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        {/* Preset curves */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
          {GRAPH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onExpressionChange(preset.expr);
                setXMinInput(String(preset.xMin));
                setXMaxInput(String(preset.xMax));
              }}
              className="px-2 py-1 text-xs font-mono bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/70 rounded transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Function & Domain Bounds Inputs */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-6">
            <label
              htmlFor="graph-fn-input"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Function <span className="font-mono text-cyan-400">y = f(x)</span>
            </label>
            <input
              id="graph-fn-input"
              type="text"
              value={expression}
              onChange={(e) => onExpressionChange(e.target.value)}
              placeholder="e.g. sin(x), x^2 - 4, 1/x"
              className="w-full px-3 py-1.5 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="col-span-3">
            <label
              htmlFor="graph-xmin-input"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              x Min
            </label>
            <input
              id="graph-xmin-input"
              type="text"
              value={xMinInput}
              onChange={(e) => setXMinInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="col-span-3">
            <label
              htmlFor="graph-xmax-input"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              x Max
            </label>
            <input
              id="graph-xmax-input"
              type="text"
              value={xMaxInput}
              onChange={(e) => setXMaxInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm font-mono bg-[#070A12] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* SVG Graph Viewport */}
        {!plotData.ok ? (
          <div className="h-[240px] bg-[#070A12] border border-slate-800 rounded-lg p-4 flex items-center justify-center text-center">
            <div className="max-w-xs space-y-1.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto" aria-hidden="true" />
              <p className="text-xs text-rose-300 font-medium">{plotData.error}</p>
            </div>
          </div>
        ) : (
          <div className="relative bg-[#070A12] border border-slate-800 rounded-lg overflow-hidden">
            {/* Top Range & Crosshair Telemetry Overlay */}
            <div className="px-3 py-1.5 bg-[#0A0F1A]/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <span>
                Domain x: [{formatNumber(plotData.xMin, 4)}, {formatNumber(plotData.xMax, 4)}] ·
                Range y: [{formatNumber(plotData.yMin, 3)}, {formatNumber(plotData.yMax, 3)}]
              </span>

              <span className="flex items-center gap-1 text-cyan-300">
                <Crosshair className="w-3 h-3" aria-hidden="true" />
                {hoverPoint ? (
                  <span>
                    x = {formatNumber(hoverPoint.x, 4)}, y ={' '}
                    {hoverPoint.y !== null ? formatNumber(hoverPoint.y, 4) : 'undefined'}
                  </span>
                ) : (
                  <span className="text-slate-400">Hover graph to inspect (x, y)</span>
                )}
              </span>
            </div>

            <svg
              ref={svgRef}
              data-testid="function-graph-svg"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="w-full h-[240px] block cursor-crosshair select-none"
              onMouseMove={handlePointerMove}
              onMouseLeave={() => setHoverX(null)}
              role="img"
              aria-label={`Plot of y = ${plotData.expression} from x = ${plotData.xMin} to ${plotData.xMax}`}
            >
              <defs>
                <clipPath id="voidnod-graph-clip">
                  <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} />
                </clipPath>
              </defs>

              {/* Vertical Grid Lines & X-Axis Labels */}
              {plotData.xTicks.map((tick) => {
                const cx = mapX(tick);
                const isZero = Math.abs(tick) < 1e-9;
                return (
                  <g key={`xtick-${tick}`}>
                    <line
                      x1={cx}
                      y1={PAD_TOP}
                      x2={cx}
                      y2={PAD_TOP + PLOT_H}
                      stroke={isZero ? '#475569' : '#1E293B'}
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? undefined : '3 3'}
                    />
                    <text
                      x={cx}
                      y={VIEW_H - 10}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {formatNumber(tick, 4)}
                    </text>
                  </g>
                );
              })}

              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {plotData.yTicks.map((tick) => {
                const cy = mapY(tick);
                const isZero = Math.abs(tick) < 1e-9;
                return (
                  <g key={`ytick-${tick}`}>
                    <line
                      x1={PAD_LEFT}
                      y1={cy}
                      x2={PAD_LEFT + PLOT_W}
                      y2={cy}
                      stroke={isZero ? '#475569' : '#1E293B'}
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? undefined : '3 3'}
                    />
                    <text
                      x={PAD_LEFT - 6}
                      y={cy + 3}
                      textAnchor="end"
                      fill="#94A3B8"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {formatNumber(tick, 3)}
                    </text>
                  </g>
                );
              })}

              {/* Plot Frame Border */}
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={PLOT_W}
                height={PLOT_H}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Continuous Function Segments (split at discontinuities/asymptotes) */}
              <g clipPath="url(#voidnod-graph-clip)">
                {plotData.segments.map((seg, idx) => {
                  if (seg.length === 0) return null;
                  if (seg.length === 1) {
                    return (
                      <circle
                        key={`seg-${idx}`}
                        cx={mapX(seg[0].x)}
                        cy={mapY(seg[0].y)}
                        r={2}
                        fill="#06B6D4"
                      />
                    );
                  }
                  const d = seg
                    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapX(pt.x).toFixed(2)} ${mapY(pt.y).toFixed(2)}`)
                    .join(' ');
                  return (
                    <path
                      key={`seg-${idx}`}
                      d={d}
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Interactive Crosshair Probe */}
                {hoverPoint && (
                  <>
                    <line
                      x1={mapX(hoverPoint.x)}
                      y1={PAD_TOP}
                      x2={mapX(hoverPoint.x)}
                      y2={PAD_TOP + PLOT_H}
                      stroke="#8B5CF6"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    {hoverPoint.y !== null &&
                      hoverPoint.y >= plotData.yMin &&
                      hoverPoint.y <= plotData.yMax && (
                        <>
                          <line
                            x1={PAD_LEFT}
                            y1={mapY(hoverPoint.y)}
                            x2={PAD_LEFT + PLOT_W}
                            y2={mapY(hoverPoint.y)}
                            stroke="#8B5CF6"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                          />
                          <circle
                            cx={mapX(hoverPoint.x)}
                            cy={mapY(hoverPoint.y)}
                            r={4.5}
                            fill="#06B6D4"
                            stroke="#07090E"
                            strokeWidth="1.5"
                          />
                        </>
                      )}
                  </>
                )}
              </g>
            </svg>

            {plotData.discontinuityCount > 0 && (
              <div className="px-3 py-1 bg-[#0B101D] border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  Asymptote / discontinuity guard active ({plotData.segments.length} continuous
                  branches plotted)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
