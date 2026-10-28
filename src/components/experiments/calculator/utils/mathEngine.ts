import { create, all, type MathNode } from 'mathjs';

const rawMath = create(all, {
  number: 'number',
  precision: 14,
});

export type AngleMode = 'RAD' | 'DEG';

export interface EvaluationResult {
  ok: boolean;
  value?: number;
  formatted?: string;
  normalizedExpression?: string;
  error?: string;
  errorType?: 'syntax' | 'math' | 'domain' | 'unsupported';
}

const ALLOWED_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'asin',
  'acos',
  'atan',
  'asec',
  'acsc',
  'acot',
  'arcsin',
  'arccos',
  'arctan',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'log',
  'log10',
  'log2',
  'ln',
  'exp',
  'sqrt',
  'cbrt',
  'nthRoot',
  'nthroot',
  'abs',
  'mod',
  'factorial',
  'fact',
  'floor',
  'ceil',
  'round',
  'sign',
  'pow',
  'min',
  'max',
  'gcd',
  'lcm',
]);

const ALLOWED_SYMBOLS = new Set([
  'pi',
  'PI',
  'e',
  'E',
  'tau',
  'phi',
  'Ans',
  'ans',
  'x',
  't',
  'u',
  'n',
]);

/**
 * Normalizes human-friendly mathematical notation into canonical parser syntax.
 */
export function normalizeMathExpression(
  input: string,
  options: { allowVariables?: string[] } = {}
): string {
  let expr = input.trim();
  if (!expr) return '';

  // Replace typography symbols with standard ASCII math operators
  expr = expr
    .replace(/×/g, '*')
    .replace(/⋅/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/τ/g, 'tau')
    .replace(/φ/g, 'phi')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/∛\s*\(/g, 'cbrt(')
    .replace(/√\s*([0-9.]+|[a-zA-Z_]+)/g, 'sqrt($1)')
    .replace(/∛\s*([0-9.]+|[a-zA-Z_]+)/g, 'cbrt($1)');

  // Convert |expr| simple absolute value bars if balanced and non-nested
  expr = expr.replace(/\|([^|]+)\|/g, 'abs($1)');

  // Handle percentage operator: e.g. 50% -> ((50)/100) or (a+b)% -> ((a+b)/100)
  // Avoid replacing modulo if someone wrote % between two numbers?
  // Wait: in scientific calculator keypad, modulo is 'mod(a, b)' or ' mod ', and '%' is percentage.
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '(($1)/100)');
  expr = expr.replace(/\)\s*%/g, ')/100');

  // Support ' mod ' infix keyword by converting simple 'a mod b' or keeping mathjs 'mod(a,b)'
  // Note: mathjs natively supports `a mod b` as an infix operator!

  // Insert implicit multiplication in unambiguous cases:
  // 1) Number followed by constant or variable or '(' or function: e.g., 2pi -> 2*pi, 3(4) -> 3*(4), 2sin(x) -> 2*sin(x)
  // Be careful NOT to break scientific notation like 1.5e-4, 2e5, 3E+2!
  expr = expr.replace(
    /(\d+(?:\.\d+)?)\s*(?=(?:pi|tau|phi|Ans|ans|sin|cos|tan|sec|csc|cot|asin|acos|atan|arcsin|arccos|arctan|sinh|cosh|tanh|asinh|acosh|atanh|log|ln|exp|sqrt|cbrt|abs|floor|ceil|round)\b|\()/g,
    '$1*'
  );

  // Number followed by 'e' when 'e' is NOT followed by [+-]?\d (so 2e -> 2*e, 2e^x -> 2*e^x, while 2e-4 stays 2e-4)
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*e(?![+-]?\d|[a-zA-Z_])/g, '$1*e');

  // If custom variables are allowed (like x in graphing/calculus), handle 3x -> 3*x, )x -> )*x, x( -> x*(
  const vars = options.allowVariables ?? ['x'];
  for (const v of vars) {
    if (/^[a-zA-Z]$/.test(v) && v !== 'e' && v !== 'E') {
      const numVarRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${v})(?![a-zA-Z0-9_])`, 'g');
      expr = expr.replace(numVarRegex, '$1*$2');
      const closeParenVarRegex = new RegExp(`\\)\\s*(${v})(?![a-zA-Z0-9_])`, 'g');
      expr = expr.replace(closeParenVarRegex, ')*$1');
      const varOpenParenRegex = new RegExp(`\\b(${v})\\s*(?=\\()`, 'g');
      expr = expr.replace(varOpenParenRegex, '$1*');
      const varFuncRegex = new RegExp(
        `\\b(${v})\\s*(?=(?:sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|log|ln|exp|sqrt|cbrt|abs|pi|tau|phi)\\b)`,
        'g'
      );
      expr = expr.replace(varFuncRegex, '$1*');
    }
  }

  // Closing parenthesis followed by opening parenthesis, number, constant, or function: (2)(3) -> (2)*(3), (2)pi -> (2)*pi
  expr = expr.replace(
    /\)\s*(?=\(|\d|(?:pi|e|tau|phi|Ans|ans|sin|cos|tan|sec|csc|cot|asin|acos|atan|arcsin|arccos|arctan|sinh|cosh|tanh|asinh|acosh|atanh|log|ln|exp|sqrt|cbrt|abs)\b)/g,
    ')*'
  );

  // Constant (pi, e, Ans) followed by '(' or another constant/variable: pi(2) -> pi*(2), pi*x
  expr = expr.replace(/\b(pi|tau|phi|Ans|ans)\s*(?=\(|[0-9]|\b(?:pi|e|tau|phi|Ans|ans|x)\b)/g, '$1*');

  return expr;
}

/**
 * Checks whether parentheses are balanced.
 */
function checkParenthesesBalance(expr: string): { ok: boolean; error?: string } {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth < 0) {
        return { ok: false, error: 'Syntax Error: Unexpected closing parenthesis ")"' };
      }
    }
  }
  if (depth > 0) {
    return {
      ok: false,
      error: `Syntax Error: Missing ${depth} closing parenthesis${depth > 1 ? 'es' : ''} ")"`,
    };
  }
  return { ok: true };
}

/**
 * Formats a numeric result cleanly with high precision and no floating-point noise (e.g. 0.30000000000000004 -> 0.3).
 */
export function formatNumber(value: number, maxPrecision = 12): string {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) return 'NaN';
    return value > 0 ? '∞' : '-∞';
  }

  // Clamp tiny floating-point noise around zero
  if (Math.abs(value) < 1e-14 && value !== 0) {
    // Only clamp if it's likely trig noise;Wait: what if the user explicitly computed 1e-20?
    // We handle trig noise inside the trig functions themselves so genuine 1e-20 is preserved!
  }

  if (Object.is(value, -0) || value === 0) return '0';

  const absVal = Math.abs(value);
  if (absVal >= 1e12 || (absVal > 0 && absVal < 1e-7)) {
    // Use scientific notation
    const expStr = value.toExponential(maxPrecision - 1);
    const [mantissa, exponent] = expStr.split('e');
    const cleanMantissa = mantissa.replace(/\.?0+$/, '');
    const cleanExp = exponent.replace(/^\+/, '');
    return `${cleanMantissa}e${cleanExp}`;
  }

  // Standard decimal representation with precision rounding to strip 0.30000000000000004
  const rounded = Number(value.toPrecision(maxPrecision));
  return String(rounded);
}

/**
 * Builds a scoped, angle-mode-aware evaluation scope with domain checks.
 */
function buildScope(
  angleMode: AngleMode,
  ansValue: number,
  extraVars: Record<string, number> = {}
): Record<string, unknown> {
  const toRad = (x: number) => (angleMode === 'DEG' ? (x * Math.PI) / 180 : x);
  const fromRad = (r: number) => (angleMode === 'DEG' ? (r * 180) / Math.PI : r);

  const sinFn = (x: number): number => {
    if (!Number.isFinite(x)) throw new Error('Domain Error: Invalid input to sin');
    if (angleMode === 'DEG') {
      const mod180 = ((x % 180) + 180) % 180;
      if (Math.abs(mod180) < 1e-12 || Math.abs(mod180 - 180) < 1e-12) return 0;
      const mod360 = ((x % 360) + 360) % 360;
      if (Math.abs(mod360 - 90) < 1e-12) return 1;
      if (Math.abs(mod360 - 270) < 1e-12) return -1;
    } else {
      const ratio = x / Math.PI;
      if (Math.abs(ratio - Math.round(ratio)) < 1e-12) return 0;
      const halfRatio = x / (Math.PI / 2);
      if (Math.abs(halfRatio - Math.round(halfRatio)) < 1e-12) {
        const k = ((Math.round(halfRatio) % 4) + 4) % 4;
        if (k === 1) return 1;
        if (k === 3) return -1;
      }
    }
    return Math.sin(toRad(x));
  };

  const cosFn = (x: number): number => {
    if (!Number.isFinite(x)) throw new Error('Domain Error: Invalid input to cos');
    if (angleMode === 'DEG') {
      const mod180 = (((x - 90) % 180) + 180) % 180;
      if (Math.abs(mod180) < 1e-12 || Math.abs(mod180 - 180) < 1e-12) return 0;
      const mod360 = ((x % 360) + 360) % 360;
      if (Math.abs(mod360) < 1e-12 || Math.abs(mod360 - 360) < 1e-12) return 1;
      if (Math.abs(mod360 - 180) < 1e-12) return -1;
    } else {
      const ratio = x / Math.PI - 0.5;
      if (Math.abs(ratio - Math.round(ratio)) < 1e-12) return 0;
      const fullRatio = x / Math.PI;
      if (Math.abs(fullRatio - Math.round(fullRatio)) < 1e-12) {
        return Math.round(fullRatio) % 2 === 0 ? 1 : -1;
      }
    }
    return Math.cos(toRad(x));
  };

  const tanFn = (x: number): number => {
    const c = cosFn(x);
    if (Math.abs(c) < 1e-12) {
      throw new Error(
        angleMode === 'DEG'
          ? 'Domain Error: tan(x) is undefined at 90° + k·180°'
          : 'Domain Error: tan(x) is undefined at odd multiples of π/2'
      );
    }
    const s = sinFn(x);
    if (s === 0) return 0;
    if (angleMode === 'DEG') {
      const mod180 = ((x % 180) + 180) % 180;
      if (Math.abs(mod180 - 45) < 1e-12) return 1;
      if (Math.abs(mod180 - 135) < 1e-12) return -1;
    }
    return s / c;
  };

  const secFn = (x: number): number => {
    const c = cosFn(x);
    if (Math.abs(c) < 1e-12) {
      throw new Error('Domain Error: sec(x) is undefined where cos(x) = 0');
    }
    return 1 / c;
  };

  const cscFn = (x: number): number => {
    const s = sinFn(x);
    if (Math.abs(s) < 1e-12) {
      throw new Error('Domain Error: csc(x) is undefined where sin(x) = 0');
    }
    return 1 / s;
  };

  const cotFn = (x: number): number => {
    const s = sinFn(x);
    if (Math.abs(s) < 1e-12) {
      throw new Error('Domain Error: cot(x) is undefined where sin(x) = 0');
    }
    const c = cosFn(x);
    return c / s;
  };

  const asinFn = (x: number): number => {
    if (x < -1 || x > 1) {
      throw new Error('Domain Error: asin(x) requires input in [-1, 1]');
    }
    return fromRad(Math.asin(x));
  };

  const acosFn = (x: number): number => {
    if (x < -1 || x > 1) {
      throw new Error('Domain Error: acos(x) requires input in [-1, 1]');
    }
    return fromRad(Math.acos(x));
  };

  const atanFn = (x: number): number => fromRad(Math.atan(x));

  const asecFn = (x: number): number => {
    if (x > -1 && x < 1) {
      throw new Error('Domain Error: asec(x) requires |x| ≥ 1');
    }
    return fromRad(Math.acos(1 / x));
  };

  const acscFn = (x: number): number => {
    if (x > -1 && x < 1) {
      throw new Error('Domain Error: acsc(x) requires |x| ≥ 1');
    }
    return fromRad(Math.asin(1 / x));
  };

  const acotFn = (x: number): number => {
    if (x === 0) return angleMode === 'DEG' ? 90 : Math.PI / 2;
    return fromRad(Math.atan(1 / x));
  };

  const sinhFn = (x: number): number => Math.sinh(x);
  const coshFn = (x: number): number => Math.cosh(x);
  const tanhFn = (x: number): number => Math.tanh(x);
  const asinhFn = (x: number): number => Math.asinh(x);
  const acoshFn = (x: number): number => {
    if (x < 1) {
      throw new Error('Domain Error: acosh(x) requires x ≥ 1');
    }
    return Math.acosh(x);
  };
  const atanhFn = (x: number): number => {
    if (x <= -1 || x >= 1) {
      throw new Error('Domain Error: atanh(x) requires input strictly in (-1, 1)');
    }
    return Math.atanh(x);
  };

  const lnFn = (x: number): number => {
    if (x <= 0) {
      throw new Error('Domain Error: Natural logarithm ln(x) requires x > 0');
    }
    return Math.log(x);
  };

  const log10Fn = (x: number, base?: number): number => {
    if (x <= 0) {
      throw new Error('Domain Error: Logarithm log(x) requires x > 0');
    }
    if (base !== undefined) {
      if (base <= 0 || base === 1) {
        throw new Error('Domain Error: Logarithm base must be positive and not equal to 1');
      }
      return Math.log(x) / Math.log(base);
    }
    return Math.log10(x);
  };

  const log2Fn = (x: number): number => {
    if (x <= 0) {
      throw new Error('Domain Error: log2(x) requires x > 0');
    }
    return Math.log2(x);
  };

  const sqrtFn = (x: number): number => {
    if (x < 0) {
      throw new Error('Domain Error: Square root of a negative number is not a real value');
    }
    return Math.sqrt(x);
  };

  const cbrtFn = (x: number): number => Math.cbrt(x);

  const nthRootFn = (x: number, n = 2): number => {
    if (n === 0) {
      throw new Error('Domain Error: Root index n cannot be zero');
    }
    if (x < 0) {
      if (!Number.isInteger(n) || Math.abs(n % 2) !== 1) {
        throw new Error('Domain Error: Even root of a negative number is not a real value');
      }
      return -Math.pow(-x, 1 / n);
    }
    return Math.pow(x, 1 / n);
  };

  const factorialFn = (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) {
      throw new Error('Domain Error: Factorial requires a non-negative integer');
    }
    if (n > 170) {
      throw new Error('Math Error: Factorial overflow (n > 170 exceeds 64-bit float range)');
    }
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };

  const modFn = (a: number, b: number): number => {
    if (Math.abs(b) === 0) {
      throw new Error('Math Error: Modulo by zero');
    }
    return ((a % b) + b) % b;
  };

  return {
    pi: Math.PI,
    PI: Math.PI,
    e: Math.E,
    E: Math.E,
    tau: Math.PI * 2,
    phi: (1 + Math.sqrt(5)) / 2,
    Ans: ansValue,
    ans: ansValue,
    sin: sinFn,
    cos: cosFn,
    tan: tanFn,
    sec: secFn,
    csc: cscFn,
    cot: cotFn,
    asin: asinFn,
    acos: acosFn,
    atan: atanFn,
    asec: asecFn,
    acsc: acscFn,
    acot: acotFn,
    arcsin: asinFn,
    arccos: acosFn,
    arctan: atanFn,
    sinh: sinhFn,
    cosh: coshFn,
    tanh: tanhFn,
    asinh: asinhFn,
    acosh: acoshFn,
    atanh: atanhFn,
    ln: lnFn,
    log: log10Fn,
    log10: log10Fn,
    log2: log2Fn,
    exp: Math.exp,
    sqrt: sqrtFn,
    cbrt: cbrtFn,
    nthRoot: nthRootFn,
    nthroot: nthRootFn,
    abs: Math.abs,
    sign: Math.sign,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    factorial: factorialFn,
    fact: factorialFn,
    mod: modFn,
    ...extraVars,
  };
}

/**
 * Recursively validates and evaluates a MathNode AST against the safe scope.
 * Never uses eval() or new Function().
 */
function evalAstNode(
  node: MathNode,
  scope: Record<string, unknown>,
  allowedSymbolSet: Set<string>
): number {
  switch (node.type) {
    case 'ConstantNode': {
      const val = (node as unknown as { value: unknown }).value;
      if (typeof val !== 'number' || Number.isNaN(val)) {
        throw new Error('Syntax Error: Invalid numeric constant');
      }
      return val;
    }

    case 'ParenthesisNode': {
      const content = (node as unknown as { content: MathNode }).content;
      return evalAstNode(content, scope, allowedSymbolSet);
    }

    case 'SymbolNode': {
      const name = (node as unknown as { name: string }).name;
      if (!allowedSymbolSet.has(name) || !(name in scope)) {
        throw new Error(`Unsupported Expression: Unknown symbol or variable "${name}"`);
      }
      const val = scope[name];
      if (typeof val !== 'number') {
        throw new Error(`Syntax Error: Symbol "${name}" must be called as a function`);
      }
      return val;
    }

    case 'OperatorNode': {
      const opNode = node as unknown as {
        op: string;
        fn: string;
        args: MathNode[];
      };
      const args = opNode.args.map((arg) => evalAstNode(arg, scope, allowedSymbolSet));

      if (args.length === 1) {
        const a = args[0];
        if (opNode.op === '-') return -a;
        if (opNode.op === '+') return +a;
        if (opNode.op === '!') {
          const factFn = scope.factorial as (n: number) => number;
          return factFn(a);
        }
        throw new Error(`Unsupported Expression: Unary operator "${opNode.op}" is not supported`);
      }

      if (args.length === 2) {
        const [a, b] = args;
        switch (opNode.op) {
          case '+':
            return a + b;
          case '-':
            return a - b;
          case '*':
            return a * b;
          case '/': {
            if (b === 0) {
              throw new Error('Math Error: Division by zero');
            }
            return a / b;
          }
          case '^': {
            if (a === 0 && b < 0) {
              throw new Error('Math Error: Division by zero (0 raised to a negative power)');
            }
            if (a < 0 && !Number.isInteger(b)) {
              throw new Error(
                'Domain Error: Negative base raised to a non-integer power is not a real value'
              );
            }
            const res = Math.pow(a, b);
            if (!Number.isFinite(res)) {
              throw new Error('Math Error: Numeric overflow in exponentiation');
            }
            return res;
          }
          case 'mod':
          case '%': {
            const modFn = scope.mod as (x: number, y: number) => number;
            return modFn(a, b);
          }
          default:
            throw new Error(
              `Unsupported Expression: Binary operator "${opNode.op}" is not supported`
            );
        }
      }

      throw new Error(`Unsupported Expression: Operator "${opNode.op}" is not supported`);
    }

    case 'FunctionNode': {
      const fnNode = node as unknown as {
        fn: { name?: string };
        name?: string;
        args: MathNode[];
      };
      const fnName = fnNode.name || fnNode.fn?.name || '';
      if (!ALLOWED_FUNCTIONS.has(fnName)) {
        throw new Error(`Unsupported Expression: Function "${fnName}" is not supported`);
      }
      const args = fnNode.args.map((arg) => evalAstNode(arg, scope, allowedSymbolSet));
      if (args.length === 0) {
        throw new Error(`Syntax Error: Function "${fnName}()" requires at least one argument`);
      }

      if (fnName === 'gcd' || fnName === 'lcm') {
        if (args.length !== 2 || !Number.isInteger(args[0]) || !Number.isInteger(args[1])) {
          throw new Error(`Domain Error: ${fnName}(a, b) requires two integers`);
        }
        return fnName === 'gcd'
          ? Number(rawMath.gcd(args[0], args[1]))
          : Number(rawMath.lcm(args[0], args[1]));
      }

      const fnImpl = scope[fnName];
      if (typeof fnImpl !== 'function') {
        throw new Error(`Unsupported Expression: Function "${fnName}" is unavailable`);
      }
      const result = (fnImpl as (...a: number[]) => number)(...args);
      if (typeof result !== 'number' || Number.isNaN(result)) {
        throw new Error(`Domain Error: "${fnName}" produced an undefined real value`);
      }
      if (!Number.isFinite(result)) {
        throw new Error(`Math Error: "${fnName}" overflowed real numeric bounds`);
      }
      return result;
    }

    default:
      throw new Error(
        `Unsupported Expression: Construct "${node.type.replace(/Node$/, '')}" is not allowed in calculator mode`
      );
  }
}

/**
 * Evaluates a mathematical expression safely and deterministically.
 */
export function evaluateMathExpression(
  rawInput: string,
  options: {
    angleMode?: AngleMode;
    ans?: number;
    variables?: Record<string, number>;
  } = {}
): EvaluationResult {
  const angleMode = options.angleMode ?? 'RAD';
  const ans = options.ans ?? 0;
  const extraVars = options.variables ?? {};

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Syntax Error: Enter an expression to evaluate',
      errorType: 'syntax',
    };
  }

  const parenCheck = checkParenthesesBalance(trimmed);
  if (!parenCheck.ok) {
    return {
      ok: false,
      error: parenCheck.error,
      errorType: 'syntax',
    };
  }

  // Catch consecutive binary operators like 2 + * 3 or 5 * / 2 before parsing
  if (/[+\-*/^×÷−]\s*[*/^×÷]/.test(trimmed) || /[*/^×÷]\s*$/.test(trimmed) || /[+\-−]\s*$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Syntax Error: Incomplete or consecutive operators in expression',
      errorType: 'syntax',
    };
  }

  // Catch empty parentheses ()
  if (/\(\s*\)/.test(trimmed)) {
    return {
      ok: false,
      error: 'Syntax Error: Empty parentheses "()" are not valid',
      errorType: 'syntax',
    };
  }

  const normalized = normalizeMathExpression(trimmed, {
    allowVariables: Object.keys(extraVars),
  });

  try {
    const ast = rawMath.parse(normalized);
    const allowedSymbols = new Set(ALLOWED_SYMBOLS);
    for (const key of Object.keys(extraVars)) {
      allowedSymbols.add(key);
    }
    // Only allow 'x', 't', 'u', 'n' if actually present in extraVars!
    for (const v of ['x', 't', 'u', 'n']) {
      if (!(v in extraVars)) {
        allowedSymbols.delete(v);
      }
    }

    const scope = buildScope(angleMode, ans, extraVars);
    const value = evalAstNode(ast, scope, allowedSymbols);

    if (Number.isNaN(value)) {
      return {
        ok: false,
        error: 'Domain Error: Result is undefined (NaN) in the real number domain',
        errorType: 'domain',
      };
    }

    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: 'Math Error: Result exceeds finite numeric range (overflow or division by zero)',
        errorType: 'math',
      };
    }

    return {
      ok: true,
      value,
      formatted: formatNumber(value),
      normalizedExpression: normalized,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.startsWith('Domain Error:')) {
      return { ok: false, error: msg, errorType: 'domain' };
    }
    if (msg.startsWith('Math Error:')) {
      return { ok: false, error: msg, errorType: 'math' };
    }
    if (msg.startsWith('Unsupported Expression:')) {
      return { ok: false, error: msg, errorType: 'unsupported' };
    }
    if (msg.startsWith('Syntax Error:')) {
      return { ok: false, error: msg, errorType: 'syntax' };
    }

    return {
      ok: false,
      error: `Syntax Error: ${msg.replace(/^Error:\s*/i, '')}`,
      errorType: 'syntax',
    };
  }
}
