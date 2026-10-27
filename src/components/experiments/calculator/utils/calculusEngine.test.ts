import {
  differentiateExpression,
  integrateIndefinite,
  integrateDefinite,
  ZERO_DISPLAY_TOLERANCE,
} from './calculusEngine';
import { determinantMatrix } from './matrixEngine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: any, desc: string, details?: any) {
  totalTests++;
  if (Boolean(condition)) {
    passedTests++;
    console.log(`✓ PASS: ${desc}`);
  } else {
    console.error(`✗ FAIL: ${desc}`);
    if (details) console.error('  Details:', details);
  }
}

console.log('=== CALCULUS REGRESSION SUITE ===');

// 1. Derivatives of x^3 at orders 1, 2, 3, 4, 5
const diffX3Order1 = differentiateExpression('x^3', 'x', undefined, 1);
assert(diffX3Order1.ok && diffX3Order1.symbolicDisplay === '3x^2', 'Order 1 of x^3 is 3x^2', diffX3Order1);

const diffX3Order2 = differentiateExpression('x^3', 'x', undefined, 2);
assert(diffX3Order2.ok && diffX3Order2.symbolicDisplay === '6x', 'Order 2 of x^3 is 6x', diffX3Order2);

const diffX3Order3 = differentiateExpression('x^3', 'x', undefined, 3);
assert(diffX3Order3.ok && diffX3Order3.symbolicDisplay === '6', 'Order 3 of x^3 is 6', diffX3Order3);

const diffX3Order4 = differentiateExpression('x^3', 'x', undefined, 4);
assert(diffX3Order4.ok && diffX3Order4.symbolicDisplay === '0', 'Order 4 of x^3 is 0', diffX3Order4);

const diffX3Order5 = differentiateExpression('x^3', 'x', undefined, 5);
assert(diffX3Order5.ok && diffX3Order5.symbolicDisplay === '0', 'Order 5 of x^3 is 0', diffX3Order5);

// 2. Derivative presets
// sin(x)*cos(x)
const diffTrig = differentiateExpression('sin(x)*cos(x)', 'x');
assert(diffTrig.ok && diffTrig.symbolicRaw?.includes('cos'), 'Derivative of sin(x)*cos(x) computed', diffTrig);

// x^2 * ln(x)
const diffLog = differentiateExpression('x^2 * ln(x)', 'x');
assert(diffLog.ok && diffLog.symbolicRaw?.includes('ln'), 'Derivative of x^2 * ln(x) computed', diffLog);

// e^(2x)
const diffExp = differentiateExpression('e^(2*x)', 'x');
assert(
  diffExp.ok && (diffExp.symbolicDisplay?.includes('e^(2x)') || diffExp.symbolicRaw?.includes('e^(2*x)')),
  'Derivative of e^(2x) computed as 2*e^(2x)',
  diffExp
);

// 3. Floating-point noise normalization at sin(x)*cos(x) at x = pi/4
const diffTrigEval = differentiateExpression('sin(x)*cos(x)', 'x', 'pi/4', 1);
assert(diffTrigEval.ok, 'd/dx(sin(x)*cos(x)) at pi/4 succeeded', diffTrigEval);
assert(
  diffTrigEval.evaluatedNumeric === '0',
  'Floating-point noise normalized to "0" instead of 2.22044604925e-16',
  { evaluatedNumeric: diffTrigEval.evaluatedNumeric, evaluatedExact: diffTrigEval.evaluatedExact }
);
assert(diffTrigEval.evaluatedExact === '0', 'Exact evaluation at pi/4 is "0"', diffTrigEval);

// 4. Indefinite integrals
// x^2 -> x^3/3 + C
const indefX2 = integrateIndefinite('x^2', 'x');
assert(indefX2.ok && indefX2.supported && indefX2.symbolicWithConstant?.includes('x^3'), 'Indefinite ∫ x^2 dx = x^3/3 + C', indefX2);

// 2x*cos(x^2) -> sin(x^2) + C
const indefChain = integrateIndefinite('2*x*cos(x^2)', 'x');
assert(indefChain.ok && indefChain.supported && indefChain.symbolicWithConstant?.includes('sin(x^2)'), 'Indefinite ∫ 2x*cos(x^2) dx = sin(x^2) + C', indefChain);

// 1/(1+x^2) -> atan(x) + C
const indefAtan = integrateIndefinite('1/(1+x^2)', 'x');
assert(indefAtan.ok && indefAtan.supported && indefAtan.symbolicWithConstant?.includes('atan(x)'), 'Indefinite ∫ 1/(1+x^2) dx = atan(x) + C', indefAtan);

// e^(-x^2) -> erf special function
const indefGauss = integrateIndefinite('e^(-x^2)', 'x');
assert(indefGauss.ok && indefGauss.supported, 'Indefinite ∫ e^(-x^2) dx resolved via CAS special function', indefGauss);
assert(
  indefGauss.isSpecialFunction === true && indefGauss.symbolicWithConstant?.includes('erf(x)'),
  'Antiderivative of e^(-x^2) returns erf(x) + C representation',
  indefGauss
);

// Non-elementary integral with no special function form (e.g. sin(x^2)) reports honest unsupported
const indefSinX2 = integrateIndefinite('sin(x^2)', 'x');
assert(
  indefSinX2.ok && !indefSinX2.supported && indefSinX2.explanation?.includes('Definite Integral'),
  'Non-elementary integral without special form points cleanly to Definite Integral',
  indefSinX2
);

// 5. Definite integrals
// sin(x) from 0 to pi -> exact: 2, numeric: 2
const defSin = integrateDefinite('sin(x)', 'x', '0', 'pi');
assert(defSin.ok && defSin.exactSymbolic === '2' && Math.abs((defSin.numericValue ?? 0) - 2) < 1e-10, '∫[0→π] sin(x) dx = 2', defSin);

// e^(-x^2) from 0 to 1 -> numerical approximation ~ 0.746824132812
const defGauss = integrateDefinite('e^(-x^2)', 'x', '0', '1');
assert(
  defGauss.ok &&
  defGauss.isApproximateOnly &&
  Math.abs((defGauss.numericValue ?? 0) - 0.746824132812) < 1e-5,
  '∫[0→1] e^(-x^2) dx approximates ~ 0.746824',
  defGauss
);

// x^2 with reversed bounds from 1 to 0 -> -1/3, note explains reversed direction
const defRev = integrateDefinite('x^2', 'x', '1', '0');
assert(
  defRev.ok &&
  defRev.boundsReversed === true &&
  defRev.exactSymbolic === '-1/3' &&
  defRev.note?.includes('Direction Reversal Property'),
  '∫[1→0] x^2 dx = -1/3 with Direction Reversal explanation',
  defRev
);

console.log('\n=== MATRIX WORKBENCH DETERMINANT CHECKS ===');

// Check 1: 1x1 matrix
const m1 = [[5]];
const det1 = determinantMatrix(m1, 'A');
assert(det1.scalar === 5, '1x1 matrix [[5]] determinant is 5', det1);

// Check 2: Triangular 3x3 matrix (det is product of diagonals: 2 * 3 * 4 = 24)
const mTri = [
  [2, 1, 5],
  [0, 3, 2],
  [0, 0, 4],
];
const detTri = determinantMatrix(mTri, 'A');
assert(detTri.scalar === 24, 'Triangular 3x3 determinant is 24', detTri);

// Check 3: Singular 2x2 matrix
const mSingular = [
  [1, 2],
  [2, 4],
];
const detSingular = determinantMatrix(mSingular, 'A');
assert(
  detSingular.scalar === 0 && /singular/i.test(detSingular.auxiliaryInfo ?? ''),
  'Singular matrix det is 0 and marked singular',
  detSingular
);

// Check 4: General 3x3 matrix
const m3x3 = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];
const det3x3 = determinantMatrix(m3x3, 'A');
assert(
  Math.abs((det3x3.scalar ?? 0) - 1) < 1e-12 && det3x3.formattedScalar?.decimal === '1',
  'General 3x3 matrix determinant is 1',
  det3x3
);

console.log(`\n========================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} passed`);
if (passedTests === totalTests) {
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
