import { type AngleMode, evaluateMathExpression } from './mathEngine';

export interface PlotPoint {
  x: number;
  y: number;
}

export interface GraphPlotData {
  ok: boolean;
  expression: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  segments: PlotPoint[][];
  sampleCount: number;
  discontinuityCount: number;
  xTicks: number[];
  yTicks: number[];
  error?: string;
}

/**
 * Computes clean, human-readable tick marks for a given [min, max] range.
 */
export function computeAxisTicks(min: number, max: number, targetTickCount = 6): number[] {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return [min];

  const roughStep = span / targetTickCount;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / mag;

  let step: number;
  if (residual > 5) step = 10 * mag;
  else if (residual > 2) step = 5 * mag;
  else if (residual > 1) step = 2 * mag;
  else step = mag;

  const firstTick = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = firstTick; t <= max + step * 1e-9; t += step) {
    const cleanTick = Math.abs(t) < step * 1e-9 ? 0 : Number(t.toPrecision(10));
    ticks.push(cleanTick);
    if (ticks.length > 24) break;
  }
  return ticks;
}

/**
 * Samples y = f(x) across [xMin, xMax] and splits into continuous polyline segments
 * whenever undefined domains, vertical asymptotes, or jump discontinuities occur.
 */
export function generateFunctionPlot(
  expression: string,
  xMinInput: number,
  xMaxInput: number,
  options: {
    angleMode?: AngleMode;
    numSamples?: number;
    yMinOverride?: number;
    yMaxOverride?: number;
  } = {}
): GraphPlotData {
  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      ok: false,
      expression,
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      segments: [],
      sampleCount: 0,
      discontinuityCount: 0,
      xTicks: [],
      yTicks: [],
      error: 'Enter a function of x (e.g., sin(x), x^3 - 3x, 1/x) to plot.',
    };
  }

  if (!Number.isFinite(xMinInput) || !Number.isFinite(xMaxInput)) {
    return {
      ok: false,
      expression,
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      segments: [],
      sampleCount: 0,
      discontinuityCount: 0,
      xTicks: [],
      yTicks: [],
      error: 'Domain bounds xMin and xMax must be finite numbers.',
    };
  }

  if (xMinInput >= xMaxInput) {
    return {
      ok: false,
      expression,
      xMin: xMinInput,
      xMax: xMaxInput,
      yMin: -10,
      yMax: 10,
      segments: [],
      sampleCount: 0,
      discontinuityCount: 0,
      xTicks: [],
      yTicks: [],
      error: 'Lower bound xMin must be strictly less than upper bound xMax.',
    };
  }

  const angleMode = options.angleMode ?? 'RAD';
  const numSamples = options.numSamples ?? 480;
  const dx = (xMaxInput - xMinInput) / numSamples;

  // First test syntax at a single point so syntax/unsupported errors are reported immediately
  const syntaxProbe = evaluateMathExpression(trimmed, {
    angleMode,
    variables: { x: (xMinInput + xMaxInput) / 2 },
  });
  if (
    !syntaxProbe.ok &&
    (syntaxProbe.errorType === 'syntax' || syntaxProbe.errorType === 'unsupported')
  ) {
    return {
      ok: false,
      expression,
      xMin: xMinInput,
      xMax: xMaxInput,
      yMin: -10,
      yMax: 10,
      segments: [],
      sampleCount: 0,
      discontinuityCount: 0,
      xTicks: [],
      yTicks: [],
      error: syntaxProbe.error,
    };
  }

  const evalAt = (x: number): number | null => {
    const res = evaluateMathExpression(trimmed, {
      angleMode,
      variables: { x },
    });
    if (!res.ok || res.value === undefined || !Number.isFinite(res.value)) {
      return null;
    }
    return res.value;
  };

  const rawSamples: { x: number; y: number | null }[] = [];
  const validYs: number[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const x = xMinInput + i * dx;
    // Snap very close to 0 so x=0 singularities (like 1/x) are hit cleanly
    const cleanX = Math.abs(x) < dx * 1e-6 ? 0 : x;
    const y = evalAt(cleanX);
    rawSamples.push({ x: cleanX, y });
    if (y !== null && Math.abs(y) < 1e9) {
      validYs.push(y);
    }
  }

  if (validYs.length === 0) {
    return {
      ok: false,
      expression,
      xMin: xMinInput,
      xMax: xMaxInput,
      yMin: -10,
      yMax: 10,
      segments: [],
      sampleCount: 0,
      discontinuityCount: 0,
      xTicks: [],
      yTicks: [],
      error: `Function "${trimmed}" has no real values on the interval [${xMinInput}, ${xMaxInput}].`,
    };
  }

  // Determine vertical y-range using robust percentile clamping so vertical asymptotes (e.g. 1/x, tan(x)) don't flatten the curve
  const sortedY = [...validYs].sort((a, b) => a - b);
  const p05 = sortedY[Math.floor(sortedY.length * 0.04)] ?? sortedY[0];
  const p95 = sortedY[Math.ceil(sortedY.length * 0.96) - 1] ?? sortedY[sortedY.length - 1];
  const minActual = sortedY[0];
  const maxActual = sortedY[sortedY.length - 1];

  // If extreme values are far outside the 4th–96th percentile spread, clamp to percentile range
  const coreSpan = Math.max(p95 - p05, 1e-3);
  const hasAsymptoteSpikes =
    maxActual - minActual > coreSpan * 4.5 && maxActual - minActual > 20;

  let yMin = options.yMinOverride ?? (hasAsymptoteSpikes ? p05 - coreSpan * 0.35 : minActual);
  let yMax = options.yMaxOverride ?? (hasAsymptoteSpikes ? p95 + coreSpan * 0.35 : maxActual);

  if (Math.abs(yMax - yMin) < 1e-6) {
    const center = yMin;
    yMin = center - 5;
    yMax = center + 5;
  } else if (options.yMinOverride === undefined && options.yMaxOverride === undefined) {
    const pad = (yMax - yMin) * 0.12;
    yMin -= pad;
    yMax += pad;
  }

  const ySpan = yMax - yMin;
  const maxAllowedJump = ySpan * 1.6;

  // Build segments and detect discontinuities (undefined points, vertical asymptote jumps, or non-monotonic midpoint spikes)
  const segments: PlotPoint[][] = [];
  let currentSegment: PlotPoint[] = [];
  let discontinuityCount = 0;

  for (let i = 0; i < rawSamples.length; i++) {
    const pt = rawSamples[i];
    if (pt.y === null || Math.abs(pt.y) > 1e8) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
        discontinuityCount++;
      }
      continue;
    }

    if (currentSegment.length > 0) {
      const prev = currentSegment[currentSegment.length - 1];
      const dy = Math.abs(pt.y - prev.y);

      // Check if jump is suspiciously large or crosses a pole/discontinuity
      let isDiscontinuous = false;
      if (dy > maxAllowedJump) {
        isDiscontinuous = true;
      } else if (dy > ySpan * 0.25) {
        // Probe the midpoint between prev.x and pt.x
        const midX = 0.5 * (prev.x + pt.x);
        const midY = evalAt(midX);
        if (midY === null) {
          isDiscontinuous = true;
        } else {
          // For a smooth function, midY lies between prev.y and pt.y (or close to their average).
          // For a vertical asymptote (like 1/x or tan(x)) or step jump (like floor(x)), midY deviates sharply or flips sign!
          const minEnd = Math.min(prev.y, pt.y);
          const maxEnd = Math.max(prev.y, pt.y);
          if (midY < minEnd - dy * 0.5 || midY > maxEnd + dy * 0.5) {
            isDiscontinuous = true;
          }
          // Step discontinuity check (e.g. floor(x), sign(x)):
          const q1Y = evalAt(0.75 * prev.x + 0.25 * pt.x);
          const q3Y = evalAt(0.25 * prev.x + 0.75 * pt.x);
          if (q1Y !== null && q3Y !== null && Math.abs(q3Y - q1Y) > dy * 0.92 && dy > ySpan * 0.05) {
            isDiscontinuous = true;
          }
        }
      }

      if (isDiscontinuous) {
        segments.push(currentSegment);
        currentSegment = [{ x: pt.x, y: pt.y }];
        discontinuityCount++;
        continue;
      }
    }

    currentSegment.push({ x: pt.x, y: pt.y });
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return {
    ok: true,
    expression: trimmed,
    xMin: xMinInput,
    xMax: xMaxInput,
    yMin,
    yMax,
    segments,
    sampleCount: validYs.length,
    discontinuityCount,
    xTicks: computeAxisTicks(xMinInput, xMaxInput, 6),
    yTicks: computeAxisTicks(yMin, yMax, 5),
  };
}
