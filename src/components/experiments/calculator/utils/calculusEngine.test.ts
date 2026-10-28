import {
  differentiateExpression,
  integrateIndefinite,
  integrateDefinite,
  validateCalculusExpression,
  ZERO_DISPLAY_TOLERANCE,
} from './calculusEngine';
import { determinantMatrix } from './matrixEngine';
import nerdamer from 'nerdamer';

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

console.log('=== CALCULUS VERIFICATION SUITE ===\n');

// ==========================================
// 1. UNBALANCED INPUT DETECTION & SUGGESTION
// ==========================================
console.log('-- 1. Unbalanced Input Syntax Handling --');
const unbalancedInput = '((cos(5x)+cos(4x))/(1-2*cos(3x))';
const unbalSyntax = validateCalculusExpression(unbalancedInput, 'x');

assert(
  !unbalSyntax.valid && unbalSyntax.errorType === 'unbalanced_parentheses',
  'Unbalanced input detected as unbalanced_parentheses error',
  unbalSyntax
);
assert(
  unbalSyntax.errorPosition === 0 && unbalSyntax.error?.includes('position 1'),
  'Identifies exact position of unmatched opening parenthesis',
  unbalSyntax
);
assert(
  unbalSyntax.suggestion?.actionLabel === "Add ')' at the end",
  'Offers explicit suggestion: "Add \')\' at the end"',
  unbalSyntax.suggestion
);
assert(
  unbalSyntax.suggestion?.correctedExpression === '((cos(5x)+cos(4x))/(1-2*cos(3x)))',
  'Corrected expression appends ")" to balance the input',
  unbalSyntax.suggestion
);

const unbalIndef = integrateIndefinite(unbalancedInput, 'x');
assert(
  !unbalIndef.ok && unbalIndef.errorType === 'syntax' && unbalIndef.expressionInput === unbalancedInput,
  'integrateIndefinite returns syntax error while keeping raw user input untouched',
  unbalIndef
);

// One-click correction execution
const correctedIndef = integrateIndefinite(
  unbalSyntax.suggestion?.correctedExpression ?? '',
  'x'
);
assert(
  correctedIndef.ok && correctedIndef.supported && correctedIndef.symbolicWithConstant?.includes('sin'),
  'Applying one-click suggestion enables successful indefinite integration',
  correctedIndef
);

// ==========================================
// 2. BALANCED TRIG-RATIONAL INTEGRATION
// ==========================================
console.log('\n-- 2. Balanced Trig-Rational Symbolic Antiderivative --');
const trigRationalExpr = '(cos(5*x)+cos(4*x))/(1-2*cos(3*x))';
const trigRationalRes = integrateIndefinite(trigRationalExpr, 'x');

assert(
  trigRationalRes.ok && trigRationalRes.supported,
  'Trig-rational expression produces valid supported antiderivative',
  trigRationalRes
);
assert(
  trigRationalRes.isTrigRational === true,
  'Identified and processed via trigonometric rational reduction',
  trigRationalRes
);
assert(
  trigRationalRes.symbolicDisplay?.includes('sin(2x)') && trigRationalRes.symbolicDisplay?.includes('sin(x)'),
  'Antiderivative matches (-1/2)*sin(2x) - sin(x)',
  trigRationalRes.symbolicDisplay
);
assert(
  trigRationalRes.weierstrassForm?.includes('tan(x/2)'),
  'Weierstrass half-angle rational form provided in details',
  trigRationalRes.weierstrassForm
);

// Verify derivative matches original integrand algebraically
// d/dx [-1/2*sin(2x) - sin(x)] = -cos(2x) - cos(x)
// (-cos(2x) - cos(x)) * (1 - 2*cos(3x)) = cos(5x) + cos(4x)
const cPoly = '1 - c - 2*c^2'; // -2c^2 - c + 1
const denC = '1 - 8*c^3 + 6*c';
const numC = '16*c^5 + 8*c^4 - 20*c^3 - 8*c^2 + 5*c + 1';
const prodCheck = nerdamer(`(${cPoly}) * (${denC}) - (${numC})`).expand().text();
assert(
  prodCheck === '0',
  'Algebraic verification: quotient * denominator identically equals numerator (remainder 0)',
  prodCheck
);

// ==========================================
// 3. NUMERICAL CHECKS AWAY FROM & AT POLES
// ==========================================
console.log('\n-- 3. Numerical Verification Away From & Across Poles --');
// Poles of 1 - 2*cos(3x) are at 2kπ/3 ± π/9. For k=0: x ≈ ±0.34906585.
const testPointsAway = [0.1, 0.2, 0.6, 1.2, 2.0, -0.7];
let allRegularMatch = true;

for (const p of testPointsAway) {
  const origVal = (Math.cos(5 * p) + Math.cos(4 * p)) / (1 - 2 * Math.cos(3 * p));
  const derivVal = -Math.cos(2 * p) - Math.cos(p);
  const diff = Math.abs(origVal - derivVal);
  if (diff > 1e-12) {
    allRegularMatch = false;
    console.error(`Mismatch at p=${p}: orig=${origVal}, deriv=${derivVal}`);
  }
}
assert(
  allRegularMatch,
  'Numerical check: derivative matches original integrand across all regular test points (< 1e-12)',
  testPointsAway
);

// Definite integral on [0, 0.3] (away from pole at pi/9 ≈ 0.349)
const defTrigAway = integrateDefinite(trigRationalExpr, 'x', '0', '0.3');
const expectedFtVal = (-0.5 * Math.sin(0.6) - Math.sin(0.3)) - 0;
assert(
  defTrigAway.ok && Math.abs((defTrigAway.numericValue ?? 0) - expectedFtVal) < 1e-8,
  'Definite integral on [0, 0.3] agrees with FTC exact value (-0.577841)',
  { value: defTrigAway.numericValue, expected: expectedFtVal }
);

// Domain note contains pole information
assert(
  trigRationalRes.domainNotes?.includes('2kπ/3 ± π/9'),
  'Domain note clearly documents poles at 2kπ/3 ± π/9',
  trigRationalRes.domainNotes
);

// ==========================================
// 4. EVERY INTEGRATION PRESET TEST
// ==========================================
console.log('\n-- 4. Integration Presets Coverage --');

// Power rule: x^2 -> x^3/3 + C
const pPower = integrateIndefinite('x^2', 'x');
assert(
  pPower.ok && pPower.supported && pPower.symbolicWithConstant?.includes('x^3'),
  'Power rule preset: ∫ x² dx = (1/3)x³ + C',
  pPower.symbolicWithConstant
);

// Trigonometric: sin(x) -> -cos(x) + C
const pTrig = integrateIndefinite('sin(x)', 'x');
assert(
  pTrig.ok && pTrig.supported && pTrig.symbolicWithConstant?.includes('cos(x)'),
  'Trig preset: ∫ sin(x) dx = -cos(x) + C',
  pTrig.symbolicWithConstant
);

// Exponential: e^x -> e^x + C
const pExp = integrateIndefinite('e^x', 'x');
assert(
  pExp.ok && pExp.supported && pExp.symbolicWithConstant?.includes('e^x'),
  'Exponential preset: ∫ e^x dx = e^x + C',
  pExp.symbolicWithConstant
);

// Substitution: 2*x*cos(x^2) -> sin(x^2) + C
const pSubst = integrateIndefinite('2*x*cos(x^2)', 'x');
assert(
  pSubst.ok && pSubst.supported && pSubst.symbolicWithConstant?.includes('sin(x^2)'),
  'Substitution preset: ∫ 2x·cos(x²) dx = sin(x²) + C',
  pSubst.symbolicWithConstant
);

// Rational: 1/(1+x^2) -> atan(x) + C
const pRational = integrateIndefinite('1/(1+x^2)', 'x');
assert(
  pRational.ok && pRational.supported && pRational.symbolicWithConstant?.includes('atan(x)'),
  'Rational preset: ∫ 1/(1+x²) dx = atan(x) + C',
  pRational.symbolicWithConstant
);

// Advanced Trig-Rational: (cos(5*x)+cos(4*x))/(1-2*cos(3*x))
const pAdv = integrateIndefinite('(cos(5*x)+cos(4*x))/(1-2*cos(3*x))', 'x');
assert(
  pAdv.ok && pAdv.supported && pAdv.symbolicWithConstant?.includes('sin'),
  'Advanced trig-rational preset produces exact antiderivative',
  pAdv.symbolicWithConstant
);

// Non-elementary: e^(-x^2) -> erf(x) Gauss error function
const pErf = integrateIndefinite('e^(-x^2)', 'x');
assert(
  pErf.ok && pErf.supported && pErf.isSpecialFunction && pErf.symbolicWithConstant?.includes('erf(x)'),
  'Non-elementary preset: ∫ e^(-x²) dx returns erf(x) special function',
  pErf.symbolicWithConstant
);

// Truly unsupported non-elementary integral (e.g. sin(x^2))
const pSinX2 = integrateIndefinite('sin(x^2)', 'x');
assert(
  pSinX2.ok && !pSinX2.supported && pSinX2.explanation?.includes('Definite Integral'),
  'Non-elementary integral without closed form guides user to Definite Integral',
  pSinX2
);

// ==========================================
// 5. EXISTING CALCULUS & MATRIX INTEGRATION
// ==========================================
console.log('\n-- 5. Existing Differentiation, Definite & Matrix Features --');

// Differentiation of x^3 orders 1 to 5
const diff1 = differentiateExpression('x^3', 'x', undefined, 1);
assert(diff1.ok && diff1.symbolicDisplay === '3x^2', 'Order 1 of x^3 is 3x^2');
const diff2 = differentiateExpression('x^3', 'x', undefined, 2);
assert(diff2.ok && diff2.symbolicDisplay === '6x', 'Order 2 of x^3 is 6x');
const diff3 = differentiateExpression('x^3', 'x', undefined, 3);
assert(diff3.ok && diff3.symbolicDisplay === '6', 'Order 3 of x^3 is 6');
const diff4 = differentiateExpression('x^3', 'x', undefined, 4);
assert(diff4.ok && diff4.symbolicDisplay === '0', 'Order 4 of x^3 is 0');
const diff5 = differentiateExpression('x^3', 'x', undefined, 5);
assert(diff5.ok && diff5.symbolicDisplay === '0', 'Order 5 of x^3 is 0');

// Floating-point noise normalization at sin(x)*cos(x) at x = pi/4
const diffTrigEval = differentiateExpression('sin(x)*cos(x)', 'x', 'pi/4', 1);
assert(
  diffTrigEval.ok && diffTrigEval.evaluatedNumeric === '0',
  'Noise at sin(x)*cos(x) x=pi/4 normalized to "0"',
  diffTrigEval
);

// Definite integral of sin(x) on [0, pi]
const defSin = integrateDefinite('sin(x)', 'x', '0', 'pi');
assert(
  defSin.ok && defSin.exactSymbolic === '2' && Math.abs((defSin.numericValue ?? 0) - 2) < 1e-10,
  '∫[0→π] sin(x) dx = 2',
  defSin
);

// Definite integral of x^2 with reversed bounds [1, 0]
const defRev = integrateDefinite('x^2', 'x', '1', '0');
assert(
  defRev.ok && defRev.boundsReversed && defRev.exactSymbolic === '-1/3',
  '∫[1→0] x^2 dx = -1/3 with direction reversal',
  defRev
);

// Matrix Workbench determinant check
const m3x3 = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];
const det3x3 = determinantMatrix(m3x3, 'A');
assert(
  Math.abs((det3x3.scalar ?? 0) - 1) < 1e-12 && det3x3.formattedScalar?.decimal === '1',
  'Matrix Workbench 3x3 determinant is 1',
  det3x3
);

// ==========================================
// 6. REPORTED TRIG IDENTITY INTEGRAL & DOMAIN
// ==========================================
console.log('\n-- 6. Reported Trig Identity Integral & Domain Verification --');
const reportedExpr = '((sin(x))^8-(cos(x))^8)/(1-2*(sin(x))^2*(cos(x))^2)';
const reportedIndef = integrateIndefinite(reportedExpr, 'x');

assert(
  reportedIndef.ok && reportedIndef.supported,
  'Reported integral successfully supported via pre-simplification',
  reportedIndef
);

assert(
  reportedIndef.symbolicWithConstant === '-(1/2)*sin(2*x) + C' ||
    reportedIndef.symbolicWithConstant === '-(1/2)*sin(2x) + C',
  'Antiderivative equals -(1/2)*sin(2*x) + C',
  reportedIndef.symbolicWithConstant
);

assert(
  reportedIndef.isTrigIdentity === true,
  'Identified as trigonometric identity reduction',
  reportedIndef
);

assert(
  reportedIndef.domainNotes?.includes('no real zeros') &&
    reportedIndef.domainNotes?.includes('1/2'),
  'Domain note proves denominator 1-2sin²(x)cos²(x) has no real zeros (minimum 1/2)',
  reportedIndef.domainNotes
);

// Differentiating the returned antiderivative simplifies to original integrand
const returnedAntideriv = '-(1/2)*sin(2*x)';
const diffAntideriv = nerdamer.diff(returnedAntideriv, 'x').simplify().text();
assert(
  diffAntideriv === '-cos(2*x)',
  'Derivative of -(1/2)*sin(2*x) is -cos(2*x)',
  diffAntideriv
);

// Algebraic equivalence of -cos(2x) and the reported integrand:
// Factorization: a^4 - b^4 = (a - b)*(a + b)*(a^2 + b^2)
// Since a + b = sin^2(x) + cos^2(x) = 1, this equals (a - b)*(a^2 + b^2).
// Denominator 1 - 2ab = (a + b)^2 - 2ab = a^2 + b^2.
// Cancellation yields a - b = sin^2(x) - cos^2(x) = -cos(2x).
const factorCheck = nerdamer('(a - b)*(a + b)*(a^2 + b^2) - (a^4 - b^4)').expand().text();
assert(
  factorCheck === '0',
  'Algebraic verification: (a - b)*(a + b)*(a^2 + b^2) identically equals a^4 - b^4',
  factorCheck
);
const denomCheck = nerdamer('(a + b)^2 - 2*a*b - (a^2 + b^2)').expand().text();
assert(
  denomCheck === '0',
  'Algebraic verification: (a + b)^2 - 2ab identically equals a^2 + b^2 (equals 1 - 2ab when a+b=1)',
  denomCheck
);

// Numerical derivative checks at multiple real sample points
const samplePoints = [0, 0.2, 0.5, 1.0, 1.5, 2.3, -0.7, Math.PI / 4, Math.PI / 6];
let allSamplePointsMatch = true;
for (const p of samplePoints) {
  const sinP = Math.sin(p);
  const cosP = Math.cos(p);
  const origVal = (Math.pow(sinP, 8) - Math.pow(cosP, 8)) / (1 - 2 * Math.pow(sinP, 2) * Math.pow(cosP, 2));
  const derivVal = -Math.cos(2 * p);
  if (Math.abs(origVal - derivVal) > 1e-12) {
    allSamplePointsMatch = false;
    console.error(`Sample point mismatch at p=${p}: orig=${origVal}, deriv=${derivVal}`);
  }
}
assert(
  allSamplePointsMatch,
  'Numerical derivative matches original integrand across all real sample points (< 1e-12)',
  samplePoints
);

// Definite integral of reported expression on [0, pi/4]
const defReported = integrateDefinite(reportedExpr, 'x', '0', 'pi/4');
assert(
  defReported.ok &&
    defReported.exactSymbolic === '-1/2' &&
    Math.abs((defReported.numericValue ?? 0) - (-0.5)) < 1e-8,
  'Definite integral on [0, π/4] equals exact -1/2 (numeric -0.5)',
  { exact: defReported.exactSymbolic, numeric: defReported.numericValue }
);

// Algebraic removable singularity check: (x^2 - 1)/(x - 1)
const algRemovable = integrateIndefinite('(x^2 - 1)/(x - 1)', 'x');
assert(
  algRemovable.ok &&
    algRemovable.symbolicDisplay?.includes('x') &&
    algRemovable.domainNotes?.includes('root(s) at x ∈ {1}'),
  'Algebraic cancellation preserves domain restriction note for x ∈ {1}',
  algRemovable.domainNotes
);

console.log('\n========================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} passed`);
if (passedTests === totalTests) {
  console.log('ALL VERIFICATION SUITE TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
