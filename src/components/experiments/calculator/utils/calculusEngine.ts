import nerdamer from 'nerdamer';
import { evaluateMathExpression, formatNumber, normalizeMathExpression } from './mathEngine';

/**
 * Documented tolerance for normalizing tiny floating-point residual noise
 * to clean '0' in display values (e.g. 2.22044604925e-16 -> 0).
 * Underlying mathematical calculations remain unaltered.
 */
export const ZERO_DISPLAY_TOLERANCE = 1e-14;

export interface DerivativeResult {
  ok: boolean;
  expressionInput: string;
  variable: string;
  order: number;
  symbolicRaw?: string;
  symbolicDisplay?: string;
  symbolicLatex?: string;
  evaluatedAt?: string;
  evaluatedExact?: string;
  evaluatedNumeric?: string;
  error?: string;
}

export interface IndefiniteIntegralResult {
  ok: boolean;
  supported: boolean;
  expressionInput: string;
  variable: string;
  symbolicRaw?: string;
  symbolicDisplay?: string;
  symbolicWithConstant?: string;
  isSpecialFunction?: boolean;
  specialFunctionName?: string;
  explanation?: string;
  error?: string;
}

export interface DefiniteIntegralResult {
  ok: boolean;
  expressionInput: string;
  variable: string;
  lowerBoundInput: string;
  upperBoundInput: string;
  lowerBoundValue?: number;
  upperBoundValue?: number;
  boundsReversed?: boolean;
  exactSymbolic?: string | null;
  numericApprox?: string;
  numericValue?: number;
  isApproximateOnly: boolean;
  methodLabel: string;
  toleranceLabel?: string;
  note?: string;
  error?: string;
}

/**
 * Prepares an expression for Nerdamer CAS parsing.
 * Note: In Nerdamer, `log(x)` represents the natural logarithm ln(x),
 * and `log10(x)` represents base-10 logarithm.
 */
export function prepareForNerdamer(input: string, variable = 'x'): string {
  let expr = normalizeMathExpression(input, {
    allowVariables: [variable, 'x', 't', 'u', 'n', 'y', 'z', 's'],
  });
  // Convert ln(...) to log(...) for Nerdamer's natural log convention
  expr = expr.replace(/\bln\s*\(/g, 'log(');
  return expr;
}

/**
 * Formats Nerdamer symbolic output into clean, readable mathematical notation.
 * Converts Nerdamer's `log(` back to `ln(` for clarity, and provides both canonical
 * and compact display forms (e.g. `3*x^2` and `3x^2`).
 */
export function formatSymbolicDisplay(rawNerdamerText: string, variable = 'x'): {
  canonical: string;
  compact: string;
} {
  const canonical = rawNerdamerText.replace(/\blog\(/g, 'ln(');

  // Create a clean human-readable compact string (e.g., 3*x^2 -> 3x^2) while keeping * where needed
  const escapedVar = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const compact = canonical
    .replace(new RegExp(`(\\d)\\*(${escapedVar}\\b)`, 'g'), '$1$2')
    .replace(new RegExp(`(\\d)\\*\\(`, 'g'), '$1(');

  return { canonical, compact };
}

/**
 * Validates that a variable name is a single algebraic identifier (e.g. x, t, u).
 */
function validateVariable(variable: string): { ok: boolean; clean: string; error?: string } {
  const clean = variable.trim();
  if (!clean) {
    return { ok: false, clean: '', error: 'Please specify a differentiation/integration variable (e.g., x).' };
  }
  if (!/^[a-zA-Z]$/.test(clean) || clean === 'e' || clean === 'i') {
    return {
      ok: false,
      clean,
      error: `Invalid variable "${clean}". Use a single letter variable such as x, t, or u (excluding constants e, i).`,
    };
  }
  return { ok: true, clean };
}

/**
 * 1. Symbolic Differentiation + Optional Point Evaluation (always in Radians).
 * Supports orders 1 through 10 and normalizes floating-point noise for display.
 */
export function differentiateExpression(
  expressionInput: string,
  variableInput = 'x',
  evalAtInput?: string,
  order = 1
): DerivativeResult {
  const trimmedExpr = expressionInput.trim();
  if (!trimmedExpr) {
    return {
      ok: false,
      expressionInput,
      variable: variableInput,
      order,
      error: 'Enter an expression f(x) to differentiate.',
    };
  }

  const varCheck = validateVariable(variableInput);
  if (!varCheck.ok) {
    return {
      ok: false,
      expressionInput,
      variable: variableInput,
      order,
      error: varCheck.error,
    };
  }
  const variable = varCheck.clean;

  if (!Number.isInteger(order) || order < 1 || order > 10) {
    return {
      ok: false,
      expressionInput,
      variable,
      order,
      error: 'Derivative order must be a positive integer between 1 and 10.',
    };
  }

  try {
    const casInput = prepareForNerdamer(trimmedExpr, variable);
    const diffEntity = nerdamer.diff(casInput, variable, order).simplify();
    const rawText = diffEntity.text({ sort: true });

    if (!rawText || rawText.includes('diff(')) {
      return {
        ok: false,
        expressionInput,
        variable,
        order,
        error: 'The symbolic engine could not differentiate this expression.',
      };
    }

    const { canonical, compact } = formatSymbolicDisplay(rawText, variable);
    let latex = '';
    try {
      latex = diffEntity.toTeX();
    } catch {
      latex = canonical;
    }

    const result: DerivativeResult = {
      ok: true,
      expressionInput,
      variable,
      order,
      symbolicRaw: canonical,
      symbolicDisplay: compact,
      symbolicLatex: latex,
    };

    // Optional evaluation at a point (e.g. x = 2 or x = pi/4)
    if (evalAtInput !== undefined && evalAtInput.trim() !== '') {
      const pointEval = evaluateMathExpression(evalAtInput.trim(), { angleMode: 'RAD' });
      if (!pointEval.ok || pointEval.value === undefined) {
        return {
          ...result,
          ok: false,
          error: `Invalid evaluation point ${variable} = ${evalAtInput}: ${pointEval.error ?? 'Unable to parse value'}`,
        };
      }

      const numResult = evaluateMathExpression(canonical, {
        angleMode: 'RAD',
        variables: { [variable]: pointEval.value },
      });

      if (!numResult.ok || numResult.value === undefined) {
        return {
          ...result,
          ok: false,
          error: `Derivative is undefined at ${variable} = ${evalAtInput.trim()} (${numResult.error ?? 'Domain error'})`,
        };
      }

      result.evaluatedAt = evalAtInput.trim();

      // Compute exact symbolic value at point if possible
      let exactText = '';
      try {
        const pointCas = prepareForNerdamer(evalAtInput.trim(), variable);
        const exactEntity = diffEntity.subst(variable, pointCas).simplify();
        exactText = exactEntity.text({ sort: true }).replace(/\blog\(/g, 'ln(');
        result.evaluatedExact = exactText;
      } catch {
        exactText = numResult.formatted ?? '';
        result.evaluatedExact = numResult.formatted ?? '';
      }

      // Floating-point noise normalization:
      // If exact symbolic result resolves to 0 or numeric magnitude is below ZERO_DISPLAY_TOLERANCE,
      // present clean '0' to avoid distracting representations like 2.22044604925e-16.
      if (
        exactText === '0' ||
        (numResult.value !== undefined && Math.abs(numResult.value) < ZERO_DISPLAY_TOLERANCE)
      ) {
        result.evaluatedNumeric = '0';
        result.evaluatedExact = '0';
      } else {
        result.evaluatedNumeric = numResult.formatted ?? '';
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      expressionInput,
      variable,
      order,
      error: `Unable to differentiate expression: ${msg.replace(/^Error:\s*/i, '')}`,
    };
  }
}

/**
 * 2. Symbolic Indefinite Integration with + C, special function handling (e.g. erf),
 * and honest unsupported detection.
 */
export function integrateIndefinite(
  expressionInput: string,
  variableInput = 'x'
): IndefiniteIntegralResult {
  const trimmedExpr = expressionInput.trim();
  if (!trimmedExpr) {
    return {
      ok: false,
      supported: false,
      expressionInput,
      variable: variableInput,
      error: 'Enter an integrand f(x) to integrate.',
    };
  }

  const varCheck = validateVariable(variableInput);
  if (!varCheck.ok) {
    return {
      ok: false,
      supported: false,
      expressionInput,
      variable: variableInput,
      error: varCheck.error,
    };
  }
  const variable = varCheck.clean;

  try {
    const casInput = prepareForNerdamer(trimmedExpr, variable);
    const integralEntity = nerdamer.integrate(casInput, variable);
    const rawText = integralEntity.text({ sort: true });

    // Check if Nerdamer left an unevaluated integral
    const hasUnevaluatedIntegral =
      integralEntity.hasIntegral() ||
      /\bintegrate\s*\(/.test(rawText) ||
      /\bdefint\s*\(/.test(rawText);

    if (hasUnevaluatedIntegral) {
      // Check for special function antiderivatives that CAS can differentiate and verify:
      // 1. Gauss Error Function for Gaussian forms e^(-x^2), exp(-x^2), or e^(-a*x^2)
      const specialCandidates: Array<{
        name: string;
        candidate: string;
        explanation: string;
      }> = [];

      // Unscaled Gaussian e^(-x^2)
      specialCandidates.push({
        name: `Gauss error function erf(${variable})`,
        candidate: `(sqrt(pi)/2)*erf(${variable})`,
        explanation: `Antiderivative expressed in terms of the Gauss error function erf(${variable}), as this non-elementary integral has no closed-form in terms of elementary functions.`,
      });

      // Scaled Gaussian e^(-a*x^2)
      const scaledMatch = casInput.match(/^(?:e\^|-e\^|exp)\s*\(\s*-\s*([0-9.]+)\s*\*?\s*[a-zA-Z]\^2\s*\)$/);
      if (scaledMatch && scaledMatch[1]) {
        const aVal = scaledMatch[1];
        specialCandidates.push({
          name: `Gauss error function erf(sqrt(${aVal})*${variable})`,
          candidate: `(sqrt(pi)/(2*sqrt(${aVal})))*erf(sqrt(${aVal})*${variable})`,
          explanation: `Antiderivative expressed in terms of the Gauss error function erf(u) with scaling a = ${aVal}.`,
        });
      }

      // Check each candidate by differentiating back to verify it matches casInput
      for (const sp of specialCandidates) {
        try {
          const deriv = nerdamer.diff(sp.candidate, variable).simplify();
          const diff = nerdamer(`(${deriv.text()}) - (${casInput})`).simplify().text();
          if (diff === '0') {
            const { canonical, compact } = formatSymbolicDisplay(sp.candidate, variable);
            return {
              ok: true,
              supported: true,
              expressionInput,
              variable,
              symbolicRaw: canonical,
              symbolicDisplay: compact,
              symbolicWithConstant: `${compact} + C`,
              isSpecialFunction: true,
              specialFunctionName: sp.name,
              explanation: sp.explanation,
            };
          }
        } catch {
          // Verification failed, proceed to next candidate
        }
      }

      // If no special function matches, report clearly and guide user to definite integration
      return {
        ok: true,
        supported: false,
        expressionInput,
        variable,
        explanation:
          'No closed-form elementary antiderivative could be resolved by the symbolic engine for this integrand. Switch to Definite Integral mode to compute a high-precision numerical approximation over [a, b].',
      };
    }

    const { canonical, compact } = formatSymbolicDisplay(rawText, variable);

    return {
      ok: true,
      supported: true,
      expressionInput,
      variable,
      symbolicRaw: canonical,
      symbolicDisplay: compact,
      symbolicWithConstant: `${compact} + C`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/integral|recursion|maximum call stack|unable to/i.test(msg)) {
      return {
        ok: true,
        supported: false,
        expressionInput,
        variable,
        explanation:
          'The symbolic engine cannot resolve a closed-form antiderivative for this expression. Use Definite Integral mode for numerical evaluation.',
      };
    }
    return {
      ok: false,
      supported: false,
      expressionInput,
      variable,
      error: `Integration Error: ${msg.replace(/^Error:\s*/i, '')}`,
    };
  }
}

/**
 * Adaptive Simpson's Rule for reliable numerical definite integration.
 * Detects singularities, NaN/Infinity values, and convergence failures.
 */
export function adaptiveSimpsonIntegrate(
  fn: (x: number) => number,
  a: number,
  b: number,
  tolerance = 1e-10,
  maxDepth = 18
): {
  ok: boolean;
  value?: number;
  error?: string;
} {
  if (a === b) {
    const val = fn(a);
    if (!Number.isFinite(val)) {
      return {
        ok: false,
        error: `Singularity detected: Integrand is undefined or infinite at x = ${formatNumber(a)}.`,
      };
    }
    return { ok: true, value: 0 };
  }

  const sign = a > b ? -1 : 1;
  const left = Math.min(a, b);
  const right = Math.max(a, b);

  // Probe interior and endpoint points to detect poles/singularities (like 1/x on [-1, 1] or [0, 1])
  const probeRatios = [
    0,
    1e-9,
    0.05,
    0.125,
    0.25,
    1 / 3,
    0.375,
    0.5,
    0.625,
    2 / 3,
    0.75,
    0.875,
    0.95,
    1 - 1e-9,
    1,
  ];

  for (const r of probeRatios) {
    const xProbe = left + (right - left) * r;
    let yProbe: number;
    try {
      yProbe = fn(xProbe);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: `Singularity / Domain Error inside integration interval at x ≈ ${formatNumber(xProbe, 6)}: ${errMsg}`,
      };
    }
    if (!Number.isFinite(yProbe) || Math.abs(yProbe) > 1e14) {
      return {
        ok: false,
        error: `Singularity or divergence detected at x ≈ ${formatNumber(xProbe, 6)} within [${formatNumber(a, 6)}, ${formatNumber(b, 6)}].`,
      };
    }
  }

  let nonConvergentCount = 0;

  function simpsonStep(
    x0: number,
    x2: number,
    f0: number,
    f1: number,
    f2: number,
    whole: number,
    eps: number,
    depth: number
  ): number {
    const x1 = 0.5 * (x0 + x2);
    const leftMid = 0.5 * (x0 + x1);
    const rightMid = 0.5 * (x1 + x2);

    const fLeftMid = fn(leftMid);
    const fRightMid = fn(rightMid);

    if (
      !Number.isFinite(fLeftMid) ||
      !Number.isFinite(fRightMid) ||
      Math.abs(fLeftMid) > 1e14 ||
      Math.abs(fRightMid) > 1e14
    ) {
      throw new Error(
        `Singularity or pole encountered near x ≈ ${formatNumber(!Number.isFinite(fLeftMid) ? leftMid : rightMid, 6)}.`
      );
    }

    const h = x2 - x0;
    const leftSimp = (h / 12) * (f0 + 4 * fLeftMid + f1);
    const rightSimp = (h / 12) * (f1 + 4 * fRightMid + f2);
    const sum = leftSimp + rightSimp;
    const delta = sum - whole;

    if (Math.abs(delta) <= 15 * eps) {
      return sum + delta / 15;
    }

    if (depth <= 0) {
      nonConvergentCount++;
      if (nonConvergentCount > 24) {
        throw new Error(
          'Numerical integration failed to converge (possible interior singularity, vertical asymptote, or rapid oscillation).'
        );
      }
      return sum + delta / 15;
    }

    return (
      simpsonStep(x0, x1, f0, fLeftMid, f1, leftSimp, eps / 2, depth - 1) +
      simpsonStep(x1, x2, f1, fRightMid, f2, rightSimp, eps / 2, depth - 1)
    );
  }

  try {
    // Subdivide interval into 4 base panels so symmetric functions never fool a single 3-point Simpson check
    const numPanels = 4;
    const panelWidth = (right - left) / numPanels;
    let total = 0;

    for (let i = 0; i < numPanels; i++) {
      const p0 = left + i * panelWidth;
      const p2 = p0 + panelWidth;
      const p1 = 0.5 * (p0 + p2);

      const f0 = fn(p0);
      const f1 = fn(p1);
      const f2 = fn(p2);

      if (!Number.isFinite(f0) || !Number.isFinite(f1) || !Number.isFinite(f2)) {
        return {
          ok: false,
          error: `Integrand is undefined or singular on subinterval [${formatNumber(p0, 6)}, ${formatNumber(p2, 6)}].`,
        };
      }

      const initialWhole = ((p2 - p0) / 6) * (f0 + 4 * f1 + f2);
      total += simpsonStep(p0, p2, f0, f1, f2, initialWhole, tolerance / numPanels, maxDepth);
    }

    const signedTotal = sign * total;
    // Clamp near-zero floating point residual (e.g. integrating odd function over [-a, a])
    const finalVal = Math.abs(signedTotal) < ZERO_DISPLAY_TOLERANCE ? 0 : signedTotal;
    return { ok: true, value: finalVal };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * 3. Definite Integral over [lowerBound, upperBound].
 * Returns exact symbolic result when available, plus numerical approximation via Adaptive Simpson's Rule.
 * Evaluates reversed bounds with direction sign inversion and detailed mathematical explanation.
 */
export function integrateDefinite(
  expressionInput: string,
  variableInput = 'x',
  lowerBoundInput = '0',
  upperBoundInput = '1'
): DefiniteIntegralResult {
  const trimmedExpr = expressionInput.trim();
  if (!trimmedExpr) {
    return {
      ok: false,
      expressionInput,
      variable: variableInput,
      lowerBoundInput,
      upperBoundInput,
      isApproximateOnly: false,
      methodLabel: 'Unavailable',
      error: 'Enter an integrand f(x) to evaluate the definite integral.',
    };
  }

  const varCheck = validateVariable(variableInput);
  if (!varCheck.ok) {
    return {
      ok: false,
      expressionInput,
      variable: variableInput,
      lowerBoundInput,
      upperBoundInput,
      isApproximateOnly: false,
      methodLabel: 'Unavailable',
      error: varCheck.error,
    };
  }
  const variable = varCheck.clean;

  const lowerEval = evaluateMathExpression(lowerBoundInput.trim(), { angleMode: 'RAD' });
  if (!lowerEval.ok || lowerEval.value === undefined) {
    return {
      ok: false,
      expressionInput,
      variable,
      lowerBoundInput,
      upperBoundInput,
      isApproximateOnly: false,
      methodLabel: 'Unavailable',
      error: `Invalid lower bound "${lowerBoundInput}": ${lowerEval.error ?? 'Must be a real number or constant'}`,
    };
  }

  const upperEval = evaluateMathExpression(upperBoundInput.trim(), { angleMode: 'RAD' });
  if (!upperEval.ok || upperEval.value === undefined) {
    return {
      ok: false,
      expressionInput,
      variable,
      lowerBoundInput,
      upperBoundInput,
      isApproximateOnly: false,
      methodLabel: 'Unavailable',
      error: `Invalid upper bound "${upperBoundInput}": ${upperEval.error ?? 'Must be a real number or constant'}`,
    };
  }

  const a = lowerEval.value;
  const b = upperEval.value;
  const boundsReversed = a > b;

  // Validate that expression only depends on the integration variable and constants
  const probeMid = 0.5 * (a + b);
  const initialProbe = evaluateMathExpression(trimmedExpr, {
    angleMode: 'RAD',
    variables: { [variable]: probeMid },
  });
  if (!initialProbe.ok && initialProbe.errorType === 'syntax') {
    return {
      ok: false,
      expressionInput,
      variable,
      lowerBoundInput,
      upperBoundInput,
      isApproximateOnly: false,
      methodLabel: 'Unavailable',
      error: initialProbe.error,
    };
  }
  if (!initialProbe.ok && initialProbe.errorType === 'unsupported') {
    return {
      ok: false,
      expressionInput,
      variable,
      lowerBoundInput,
      upperBoundInput,
      isApproximateOnly: false,
      methodLabel: 'Unavailable',
      error: initialProbe.error,
    };
  }

  // Numerical integration via Adaptive Simpson's Rule
  const evaluator = (val: number): number => {
    const res = evaluateMathExpression(trimmedExpr, {
      angleMode: 'RAD',
      variables: { [variable]: val },
    });
    if (!res.ok || res.value === undefined) {
      throw new Error(res.error ?? `Undefined at ${variable} = ${val}`);
    }
    return res.value;
  };

  const simpsonRes = adaptiveSimpsonIntegrate(evaluator, a, b);
  if (!simpsonRes.ok || simpsonRes.value === undefined) {
    return {
      ok: false,
      expressionInput,
      variable,
      lowerBoundInput,
      upperBoundInput,
      lowerBoundValue: a,
      upperBoundValue: b,
      boundsReversed,
      isApproximateOnly: true,
      methodLabel: "Adaptive Simpson's Rule",
      error: simpsonRes.error ?? 'Numerical integration failed to converge on this interval.',
    };
  }

  const numericValue = simpsonRes.value;
  let numericApprox =
    Math.abs(numericValue) < ZERO_DISPLAY_TOLERANCE ? '0' : formatNumber(numericValue, 12);

  // Attempt exact symbolic evaluation via Fundamental Theorem of Calculus: F(b) - F(a)
  let exactSymbolic: string | null = null;
  try {
    const casInput = prepareForNerdamer(trimmedExpr, variable);
    const antideriv = nerdamer.integrate(casInput, variable);
    if (!antideriv.hasIntegral() && !/\bintegrate\s*\(/.test(antideriv.text())) {
      const lowerCas = prepareForNerdamer(lowerBoundInput.trim(), variable);
      const upperCas = prepareForNerdamer(upperBoundInput.trim(), variable);
      const fb = antideriv.subst(variable, upperCas);
      const fa = antideriv.subst(variable, lowerCas);
      const diffExpr = nerdamer(`(${fb.text()}) - (${fa.text()})`).simplify();
      const candidateText = diffExpr.text({ sort: true }).replace(/\blog\(/g, 'ln(');

      // Verify candidate exact result numerically against Adaptive Simpson to guard against branch cuts
      const candidateEval = evaluateMathExpression(candidateText, { angleMode: 'RAD' });
      if (
        candidateEval.ok &&
        candidateEval.value !== undefined &&
        Math.abs(candidateEval.value - numericValue) <=
          Math.max(1e-6, Math.abs(numericValue) * 1e-5)
      ) {
        exactSymbolic = candidateText === '0' ? '0' : candidateText;
        if (exactSymbolic === '0') {
          numericApprox = '0';
        }
      }
    }
  } catch {
    exactSymbolic = null;
  }

  const isApproximateOnly = exactSymbolic === null;

  // Build clear, informative multi-line note
  let note: string | undefined;
  if (boundsReversed) {
    note = `Direction Reversal Property: Lower bound a = ${lowerBoundInput.trim()} is greater than upper bound b = ${upperBoundInput.trim()}. Because integration proceeds backwards along the real line, the integral changes sign according to the fundamental property: ∫[a→b] f(x) dx = −∫[b→a] f(x) dx.`;
  } else if (isApproximateOnly) {
    note = `Symbolic closed-form evaluation is unavailable for this integral. Displaying high-precision numerical approximation evaluated via Adaptive Simpson’s quadrature (tolerance: 10⁻¹⁰).`;
  }

  return {
    ok: true,
    expressionInput,
    variable,
    lowerBoundInput,
    upperBoundInput,
    lowerBoundValue: a,
    upperBoundValue: b,
    boundsReversed,
    exactSymbolic,
    numericApprox,
    numericValue,
    isApproximateOnly,
    methodLabel: isApproximateOnly
      ? "Adaptive Simpson's Rule (Numerical Approximation)"
      : "Fundamental Theorem of Calculus + Adaptive Simpson's Rule",
    toleranceLabel: "Adaptive Simpson Quadrature (rel-tol: 10⁻¹⁰, max-depth: 18)",
    note,
  };
}
