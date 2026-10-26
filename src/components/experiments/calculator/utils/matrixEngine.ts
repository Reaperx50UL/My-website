import { evaluateMathExpression, formatNumber } from './mathEngine';

export const MIN_MATRIX_DIM = 1;
export const MAX_MATRIX_DIM = 10;

export type MatrixGridStrings = string[][];
export type NumericMatrix = number[][];

export type MatrixOperationType =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'scalarMultiply'
  | 'transpose'
  | 'determinant'
  | 'trace'
  | 'inverse'
  | 'power'
  | 'rank'
  | 'rref'
  | 'solve';

export type MatrixTarget = 'A' | 'B';

export interface FormattedCell {
  raw: number;
  decimal: string;
  fraction: string;
  isExactFraction: boolean;
  isRoundedDecimal: boolean;
}

export interface MatrixCalculationResult {
  ok: boolean;
  operation: MatrixOperationType;
  operationLabel: string;
  resultType: 'matrix' | 'scalar' | 'vector';
  matrix?: NumericMatrix;
  formattedMatrix?: FormattedCell[][];
  scalar?: number;
  formattedScalar?: FormattedCell;
  auxiliaryInfo?: string;
  hasApproximations?: boolean;
  error?: string;
}

/**
 * Approximates a floating-point number as a simplified rational p/q using continued fractions
 * if an exact representation with |q| <= maxDenominator exists within tolerance.
 */
export function toExactFraction(
  value: number,
  tolerance = 1e-10,
  maxDenominator = 10000
): { text: string; isExact: boolean } {
  if (!Number.isFinite(value)) {
    return { text: formatNumber(value), isExact: false };
  }
  const cleanVal = Math.abs(value) < 1e-13 ? 0 : value;
  if (cleanVal === 0) {
    return { text: '0', isExact: true };
  }

  const sign = cleanVal < 0 ? -1 : 1;
  const x = Math.abs(cleanVal);

  if (Math.abs(x - Math.round(x)) < tolerance) {
    return { text: String(sign * Math.round(x)), isExact: true };
  }

  let h1 = 1;
  let h2 = 0;
  let k1 = 0;
  let k2 = 1;
  let b = x;

  for (let i = 0; i < 25; i++) {
    const a = Math.floor(b);
    const hAux = a * h1 + h2;
    const kAux = a * k1 + k2;

    if (kAux > maxDenominator) break;

    h2 = h1;
    h1 = hAux;
    k2 = k1;
    k1 = kAux;

    const approx = h1 / k1;
    if (Math.abs(x - approx) <= tolerance * Math.max(1, x)) {
      if (k1 === 1) {
        return { text: String(sign * h1), isExact: true };
      }
      return { text: `${sign < 0 ? '-' : ''}${h1}/${k1}`, isExact: true };
    }

    const rem = b - a;
    if (Math.abs(rem) < 1e-12) break;
    b = 1 / rem;
  }

  return { text: formatNumber(cleanVal, 6), isExact: false };
}

/**
 * Formats a single numeric value with both exact-fraction and decimal representations.
 */
export function formatMatrixCellValue(val: number, decimalPlaces = 6): FormattedCell {
  const clean = Math.abs(val) < 1e-12 ? 0 : val;
  const frac = toExactFraction(clean);
  const roundedDec = Number(clean.toFixed(decimalPlaces));
  const decimalStr = String(roundedDec);
  const isRoundedDecimal = Math.abs(clean - roundedDec) > 1e-12;

  return {
    raw: clean,
    decimal: decimalStr,
    fraction: frac.text,
    isExactFraction: frac.isExact,
    isRoundedDecimal,
  };
}

/**
 * Formats a 2D numeric matrix into FormattedCell[][].
 */
export function formatNumericMatrix(
  matrix: NumericMatrix,
  decimalPlaces = 6
): { cells: FormattedCell[][]; hasApproximations: boolean } {
  let hasApproximations = false;
  const cells = matrix.map((row) =>
    row.map((val) => {
      const cell = formatMatrixCellValue(val, decimalPlaces);
      if (!cell.isExactFraction || cell.isRoundedDecimal) {
        hasApproximations = true;
      }
      return cell;
    })
  );
  return { cells, hasApproximations };
}

/**
 * Validates and parses a 2D string grid into a NumericMatrix using safe AST math evaluation.
 */
export function parseMatrixGrid(
  grid: MatrixGridStrings,
  matrixName = 'Matrix'
): { ok: boolean; matrix?: NumericMatrix; rows: number; cols: number; error?: string } {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  if (
    rows < MIN_MATRIX_DIM ||
    rows > MAX_MATRIX_DIM ||
    cols < MIN_MATRIX_DIM ||
    cols > MAX_MATRIX_DIM
  ) {
    return {
      ok: false,
      rows,
      cols,
      error: `Dimension Error: ${matrixName} dimensions (${rows}×${cols}) must be between ${MIN_MATRIX_DIM}×${MIN_MATRIX_DIM} and ${MAX_MATRIX_DIM}×${MAX_MATRIX_DIM}.`,
    };
  }

  const numeric: NumericMatrix = [];
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) {
      return {
        ok: false,
        rows,
        cols,
        error: `Dimension Error: ${matrixName} row ${r + 1} has inconsistent column count.`,
      };
    }
    const rowVals: number[] = [];
    for (let c = 0; c < cols; c++) {
      const rawCell = (grid[r][c] ?? '').trim();
      if (rawCell === '') {
        return {
          ok: false,
          rows,
          cols,
          error: `Invalid Entry: ${matrixName} cell (${r + 1}, ${c + 1}) is empty. Enter a valid number or expression.`,
        };
      }
      const evalRes = evaluateMathExpression(rawCell, { angleMode: 'RAD' });
      if (!evalRes.ok || evalRes.value === undefined || !Number.isFinite(evalRes.value)) {
        return {
          ok: false,
          rows,
          cols,
          error: `Invalid Entry in ${matrixName} at row ${r + 1}, col ${c + 1} ("${rawCell}"): ${
            evalRes.error ?? 'Not a finite real number'
          }`,
        };
      }
      rowVals.push(evalRes.value);
    }
    numeric.push(rowVals);
  }

  return { ok: true, matrix: numeric, rows, cols };
}

/**
 * Parses a 1D string array (vector b) into a numeric array.
 */
export function parseVectorStrings(
  vec: string[],
  vectorName = 'Vector b'
): { ok: boolean; values?: number[]; error?: string } {
  if (vec.length < MIN_MATRIX_DIM || vec.length > MAX_MATRIX_DIM) {
    return {
      ok: false,
      error: `Dimension Error: ${vectorName} length (${vec.length}) must be between ${MIN_MATRIX_DIM} and ${MAX_MATRIX_DIM}.`,
    };
  }
  const values: number[] = [];
  for (let i = 0; i < vec.length; i++) {
    const raw = (vec[i] ?? '').trim();
    if (!raw) {
      return {
        ok: false,
        error: `Invalid Entry: ${vectorName} entry ${i + 1} is empty.`,
      };
    }
    const evalRes = evaluateMathExpression(raw, { angleMode: 'RAD' });
    if (!evalRes.ok || evalRes.value === undefined || !Number.isFinite(evalRes.value)) {
      return {
        ok: false,
        error: `Invalid Entry in ${vectorName} at row ${i + 1} ("${raw}"): ${
          evalRes.error ?? 'Not a finite real number'
        }`,
      };
    }
    values.push(evalRes.value);
  }
  return { ok: true, values };
}

/**
 * Parses tab-separated (TSV), comma-separated (CSV), or bracketed matrix text pasted from clipboard.
 */
export function parsePastedMatrixText(
  text: string,
  maxDim = MAX_MATRIX_DIM
): { ok: boolean; grid?: MatrixGridStrings; rows: number; cols: number; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, rows: 0, cols: 0, error: 'Clipboard text is empty.' };
  }

  // Handle JSON-like [[1,2],[3,4]] format if pasted
  let normalizedLines: string[];
  if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
    const inner = trimmed.slice(2, -2);
    normalizedLines = inner.split(/\]\s*,\s*\[/);
  } else {
    normalizedLines = trimmed
      .split(/\r?\n|;/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  if (normalizedLines.length === 0) {
    return { ok: false, rows: 0, cols: 0, error: 'No matrix rows found in pasted text.' };
  }

  const parsedRows: string[][] = normalizedLines.slice(0, maxDim).map((line) => {
    const cleanedLine = line.replace(/^\[|\]$/g, '').trim();
    if (cleanedLine.includes('\t')) {
      return cleanedLine.split('\t').map((s) => s.trim()).slice(0, maxDim);
    }
    if (cleanedLine.includes(',')) {
      return cleanedLine.split(',').map((s) => s.trim()).slice(0, maxDim);
    }
    return cleanedLine.split(/\s+/).map((s) => s.trim()).slice(0, maxDim);
  });

  const maxCols = Math.min(
    maxDim,
    Math.max(...parsedRows.map((r) => r.length), 1)
  );

  const uniformGrid: MatrixGridStrings = parsedRows.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('0');
    return padded.slice(0, maxCols);
  });

  return {
    ok: true,
    grid: uniformGrid,
    rows: uniformGrid.length,
    cols: maxCols,
  };
}

/**
 * Matrix Addition (A + B) and Subtraction (A - B).
 */
export function addOrSubtractMatrices(
  A: NumericMatrix,
  B: NumericMatrix,
  op: 'add' | 'subtract'
): MatrixCalculationResult {
  const rA = A.length;
  const cA = A[0]?.length ?? 0;
  const rB = B.length;
  const cB = B[0]?.length ?? 0;
  const opSymbol = op === 'add' ? 'A + B' : 'A − B';

  if (rA !== rB || cA !== cB) {
    return {
      ok: false,
      operation: op,
      operationLabel: opSymbol,
      resultType: 'matrix',
      error: `Incompatible Dimensions: Cannot compute ${opSymbol} because Matrix A is ${rA}×${cA} and Matrix B is ${rB}×${cB}. Matrix addition and subtraction require identical dimensions.`,
    };
  }

  const result: NumericMatrix = A.map((row, r) =>
    row.map((val, c) => (op === 'add' ? val + B[r][c] : val - B[r][c]))
  );
  const formatted = formatNumericMatrix(result);

  return {
    ok: true,
    operation: op,
    operationLabel: opSymbol,
    resultType: 'matrix',
    matrix: result,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Dimensions: ${rA}×${cA}`,
  };
}

/**
 * Matrix Multiplication (A × B).
 */
export function multiplyMatrices(
  A: NumericMatrix,
  B: NumericMatrix
): MatrixCalculationResult {
  const rA = A.length;
  const cA = A[0]?.length ?? 0;
  const rB = B.length;
  const cB = B[0]?.length ?? 0;

  if (cA !== rB) {
    return {
      ok: false,
      operation: 'multiply',
      operationLabel: 'A × B',
      resultType: 'matrix',
      error: `Incompatible Dimensions: Cannot multiply Matrix A (${rA}×${cA}) by Matrix B (${rB}×${cB}). Inner dimensions must match: cols(A) = ${cA} ≠ rows(B) = ${rB}.`,
    };
  }

  const result: NumericMatrix = Array.from({ length: rA }, () =>
    Array.from({ length: cB }, () => 0)
  );

  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cB; j++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = Math.abs(sum) < 1e-13 ? 0 : sum;
    }
  }

  const formatted = formatNumericMatrix(result);
  return {
    ok: true,
    operation: 'multiply',
    operationLabel: 'A × B',
    resultType: 'matrix',
    matrix: result,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Product Dimensions: ${rA}×${cB}`,
  };
}

/**
 * Scalar Multiplication (k · M).
 */
export function scalarMultiplyMatrix(
  M: NumericMatrix,
  scalarInput: string,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const evalScalar = evaluateMathExpression(scalarInput.trim(), { angleMode: 'RAD' });
  if (!evalScalar.ok || evalScalar.value === undefined || !Number.isFinite(evalScalar.value)) {
    return {
      ok: false,
      operation: 'scalarMultiply',
      operationLabel: `k · ${targetName}`,
      resultType: 'matrix',
      error: `Invalid Scalar Value "${scalarInput}": ${
        evalScalar.error ?? 'Enter a valid real number or expression'
      }`,
    };
  }

  const k = evalScalar.value;
  const result = M.map((row) =>
    row.map((val) => {
      const prod = k * val;
      return Math.abs(prod) < 1e-13 ? 0 : prod;
    })
  );
  const formatted = formatNumericMatrix(result);

  return {
    ok: true,
    operation: 'scalarMultiply',
    operationLabel: `${formatNumber(k, 6)} · ${targetName}`,
    resultType: 'matrix',
    matrix: result,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Dimensions: ${M.length}×${M[0]?.length ?? 0}`,
  };
}

/**
 * Matrix Transpose (M^T).
 */
export function transposeMatrix(
  M: NumericMatrix,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const result: NumericMatrix = Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (__, r) => M[r][c])
  );
  const formatted = formatNumericMatrix(result);

  return {
    ok: true,
    operation: 'transpose',
    operationLabel: `transpose(${targetName})`,
    resultType: 'matrix',
    matrix: result,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Transposed Dimensions: ${cols}×${rows}`,
  };
}

/**
 * Computes Gaussian elimination with partial pivoting for determinant, rank, and RREF.
 */
function gaussianElimination(M: NumericMatrix): {
  rref: NumericMatrix;
  det: number;
  rank: number;
  pivotCols: number[];
} {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const work: NumericMatrix = M.map((row) => [...row]);

  let det = 1;
  let swapSign = 1;
  let pivotRow = 0;
  const pivotCols: number[] = [];
  const eps = 1e-11;

  for (let col = 0; col < cols && pivotRow < rows; col++) {
    // Partial pivoting: find largest magnitude in current column from pivotRow..rows-1
    let maxRow = pivotRow;
    let maxAbs = Math.abs(work[pivotRow][col]);
    for (let r = pivotRow + 1; r < rows; r++) {
      const absVal = Math.abs(work[r][col]);
      if (absVal > maxAbs) {
        maxAbs = absVal;
        maxRow = r;
      }
    }

    if (maxAbs <= eps) {
      // Column has no pivot; if square and col === pivotRow, determinant is 0
      if (rows === cols) {
        det = 0;
      }
      continue;
    }

    if (maxRow !== pivotRow) {
      const tmp = work[pivotRow];
      work[pivotRow] = work[maxRow];
      work[maxRow] = tmp;
      swapSign = -swapSign;
    }

    const pivotVal = work[pivotRow][col];
    det *= pivotVal;
    pivotCols.push(col);

    // Normalize pivot row so leading entry is 1
    for (let c = col; c < cols; c++) {
      work[pivotRow][c] /= pivotVal;
    }

    // Eliminate all other rows (above and below for full Gauss-Jordan RREF)
    for (let r = 0; r < rows; r++) {
      if (r === pivotRow) continue;
      const factor = work[r][col];
      if (Math.abs(factor) > eps) {
        work[r][col] = 0;
        for (let c = col + 1; c < cols; c++) {
          work[r][c] -= factor * work[pivotRow][c];
          if (Math.abs(work[r][c]) <= 1e-13) work[r][c] = 0;
        }
      } else {
        work[r][col] = 0;
      }
    }

    pivotRow++;
  }

  if (rows === cols && pivotCols.length < rows) {
    det = 0;
  } else {
    det *= swapSign;
  }

  // Clean near-zero floating noise
  const cleanRref = work.map((row) =>
    row.map((v) => (Math.abs(v) < 1e-12 ? 0 : v))
  );
  const cleanDet = Math.abs(det) < 1e-12 ? 0 : det;

  return {
    rref: cleanRref,
    det: cleanDet,
    rank: pivotCols.length,
    pivotCols,
  };
}

/**
 * Determinant of a square matrix.
 */
export function determinantMatrix(
  M: NumericMatrix,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;

  if (rows !== cols) {
    return {
      ok: false,
      operation: 'determinant',
      operationLabel: `det(${targetName})`,
      resultType: 'scalar',
      error: `Non-Square Matrix Error: Determinant requires a square (n×n) matrix, but Matrix ${targetName} is ${rows}×${cols}.`,
    };
  }

  const { det } = gaussianElimination(M);
  const formattedScalar = formatMatrixCellValue(det);

  return {
    ok: true,
    operation: 'determinant',
    operationLabel: `det(${targetName})`,
    resultType: 'scalar',
    scalar: formattedScalar.raw,
    formattedScalar,
    hasApproximations: !formattedScalar.isExactFraction || formattedScalar.isRoundedDecimal,
    auxiliaryInfo:
      Math.abs(det) === 0
        ? `Matrix ${targetName} is singular (non-invertible, det = 0).`
        : `Matrix ${targetName} is invertible (non-singular, det ≠ 0).`,
  };
}

/**
 * Trace of a square matrix (sum of main diagonal entries).
 */
export function traceMatrix(
  M: NumericMatrix,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;

  if (rows !== cols) {
    return {
      ok: false,
      operation: 'trace',
      operationLabel: `trace(${targetName})`,
      resultType: 'scalar',
      error: `Non-Square Matrix Error: Trace requires a square (n×n) matrix, but Matrix ${targetName} is ${rows}×${cols}.`,
    };
  }

  let tr = 0;
  for (let i = 0; i < rows; i++) {
    tr += M[i][i];
  }
  const formattedScalar = formatMatrixCellValue(tr);

  return {
    ok: true,
    operation: 'trace',
    operationLabel: `trace(${targetName})`,
    resultType: 'scalar',
    scalar: formattedScalar.raw,
    formattedScalar,
    hasApproximations: !formattedScalar.isExactFraction || formattedScalar.isRoundedDecimal,
    auxiliaryInfo: `Sum of ${rows} main diagonal entries`,
  };
}

/**
 * Matrix Inverse (M^-1) for square invertible matrices.
 */
export function inverseMatrix(
  M: NumericMatrix,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const n = M.length;
  const cols = M[0]?.length ?? 0;

  if (n !== cols) {
    return {
      ok: false,
      operation: 'inverse',
      operationLabel: `inv(${targetName})`,
      resultType: 'matrix',
      error: `Non-Square Matrix Error: Matrix inverse requires a square (n×n) matrix, but Matrix ${targetName} is ${n}×${cols}.`,
    };
  }

  // Build augmented matrix [M | I_n]
  const augmented: NumericMatrix = M.map((row, r) => [
    ...row,
    ...Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
  ]);

  const { rref, pivotCols } = gaussianElimination(augmented);

  // Verify that the first n columns reduced to the identity matrix I_n
  const isInvertible =
    pivotCols.length >= n &&
    Array.from({ length: n }, (_, i) => pivotCols[i] === i).every(Boolean);

  if (!isInvertible) {
    return {
      ok: false,
      operation: 'inverse',
      operationLabel: `inv(${targetName})`,
      resultType: 'matrix',
      error: `Singular Matrix Error: Matrix ${targetName} is singular (det(${targetName}) = 0, rank < ${n}) and cannot be inverted.`,
    };
  }

  const inv: NumericMatrix = rref.map((row) => row.slice(n, 2 * n));
  const formatted = formatNumericMatrix(inv);

  return {
    ok: true,
    operation: 'inverse',
    operationLabel: `${targetName}⁻¹`,
    resultType: 'matrix',
    matrix: inv,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Dimensions: ${n}×${n}`,
  };
}

/**
 * Integer Matrix Power (M^p) for square matrices.
 */
export function powerMatrix(
  M: NumericMatrix,
  exponentInput: string,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const n = M.length;
  const cols = M[0]?.length ?? 0;

  if (n !== cols) {
    return {
      ok: false,
      operation: 'power',
      operationLabel: `${targetName}^n`,
      resultType: 'matrix',
      error: `Non-Square Matrix Error: Matrix powers require a square (n×n) matrix, but Matrix ${targetName} is ${n}×${cols}.`,
    };
  }

  const evalExp = evaluateMathExpression(exponentInput.trim(), { angleMode: 'RAD' });
  if (
    !evalExp.ok ||
    evalExp.value === undefined ||
    !Number.isInteger(evalExp.value)
  ) {
    return {
      ok: false,
      operation: 'power',
      operationLabel: `${targetName}^n`,
      resultType: 'matrix',
      error: `Invalid Exponent "${exponentInput}": Matrix power requires an integer exponent (e.g., 0, 2, 3, -1).`,
    };
  }

  const p = evalExp.value;
  if (p < -20 || p > 20) {
    return {
      ok: false,
      operation: 'power',
      operationLabel: `${targetName}^${p}`,
      resultType: 'matrix',
      error: `Exponent Out of Bounds: Integer power (${p}) must be between -20 and 20.`,
    };
  }

  // Identity matrix I_n
  let acc: NumericMatrix = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (__, c) => (r === c ? 1 : 0))
  );

  if (p === 0) {
    const formatted = formatNumericMatrix(acc);
    return {
      ok: true,
      operation: 'power',
      operationLabel: `${targetName}⁰`,
      resultType: 'matrix',
      matrix: acc,
      formattedMatrix: formatted.cells,
      hasApproximations: false,
      auxiliaryInfo: `Identity matrix I_${n}`,
    };
  }

  let base: NumericMatrix = M.map((row) => [...row]);
  if (p < 0) {
    const invRes = inverseMatrix(M, targetName);
    if (!invRes.ok || !invRes.matrix) {
      return {
        ok: false,
        operation: 'power',
        operationLabel: `${targetName}^(${p})`,
        resultType: 'matrix',
        error: `Singular Matrix Error: Negative matrix power ${targetName}^(${p}) requires an invertible matrix, but Matrix ${targetName} is singular (det = 0).`,
      };
    }
    base = invRes.matrix;
  }

  let expRemain = Math.abs(p);
  while (expRemain > 0) {
    if (expRemain % 2 === 1) {
      const mult = multiplyMatrices(acc, base);
      if (!mult.ok || !mult.matrix) {
        return mult;
      }
      acc = mult.matrix;
    }
    expRemain = Math.floor(expRemain / 2);
    if (expRemain > 0) {
      const sq = multiplyMatrices(base, base);
      if (!sq.ok || !sq.matrix) {
        return sq;
      }
      base = sq.matrix;
    }
  }

  const formatted = formatNumericMatrix(acc);
  return {
    ok: true,
    operation: 'power',
    operationLabel: `${targetName}^${p}`,
    resultType: 'matrix',
    matrix: acc,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Integer power p = ${p} (${n}×${n})`,
  };
}

/**
 * Matrix Rank.
 */
export function rankMatrix(
  M: NumericMatrix,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const { rank } = gaussianElimination(M);
  const formattedScalar = formatMatrixCellValue(rank);

  return {
    ok: true,
    operation: 'rank',
    operationLabel: `rank(${targetName})`,
    resultType: 'scalar',
    scalar: rank,
    formattedScalar,
    hasApproximations: false,
    auxiliaryInfo: `Rank is ${rank} out of max possible ${Math.min(rows, cols)} (${rows}×${cols} matrix)`,
  };
}

/**
 * Reduced Row-Echelon Form (RREF).
 */
export function rrefMatrix(
  M: NumericMatrix,
  targetName: MatrixTarget = 'A'
): MatrixCalculationResult {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const { rref, rank } = gaussianElimination(M);
  const formatted = formatNumericMatrix(rref);

  return {
    ok: true,
    operation: 'rref',
    operationLabel: `rref(${targetName})`,
    resultType: 'matrix',
    matrix: rref,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Dimensions: ${rows}×${cols} · Rank = ${rank}`,
  };
}

/**
 * Linear System Solver: Solve A * x = b.
 */
export function solveLinearSystem(
  A: NumericMatrix,
  b: number[]
): MatrixCalculationResult {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;

  if (b.length !== rows) {
    return {
      ok: false,
      operation: 'solve',
      operationLabel: 'Solve Ax = b',
      resultType: 'vector',
      error: `Incompatible Dimensions: Matrix A has ${rows} rows (${rows}×${cols}), but vector b has ${b.length} entries. Solving Ax = b requires length(b) = rows(A) = ${rows}.`,
    };
  }

  if (rows !== cols) {
    return {
      ok: false,
      operation: 'solve',
      operationLabel: 'Solve Ax = b',
      resultType: 'vector',
      error: `Non-Square Coefficient Matrix: Matrix A is ${rows}×${cols}. A unique solution x to Ax = b requires a square (n×n) invertible matrix A.`,
    };
  }

  const n = rows;
  const { rank: rankA } = gaussianElimination(A);

  // Build augmented matrix [A | b]
  const augmented: NumericMatrix = A.map((row, r) => [...row, b[r]]);
  const { rref: augRref, rank: rankAug } = gaussianElimination(augmented);

  if (rankA < rankAug) {
    return {
      ok: false,
      operation: 'solve',
      operationLabel: 'Solve Ax = b',
      resultType: 'vector',
      error: `No Solution (Inconsistent System): Matrix A is singular (rank(A) = ${rankA} < rank([A|b]) = ${rankAug}), and the system Ax = b is inconsistent.`,
    };
  }

  if (rankA < n) {
    return {
      ok: false,
      operation: 'solve',
      operationLabel: 'Solve Ax = b',
      resultType: 'vector',
      error: `No Unique Solution (Singular System): Matrix A is singular (det(A) = 0, rank = ${rankA} < ${n}). The system Ax = b has infinitely many solutions rather than a unique vector x.`,
    };
  }

  // Extract unique solution column vector [[x_1], [x_2], ..., [x_n]]
  const solutionMatrix: NumericMatrix = augRref.map((row) => [row[n]]);
  const formatted = formatNumericMatrix(solutionMatrix);

  return {
    ok: true,
    operation: 'solve',
    operationLabel: 'Solution x (where Ax = b)',
    resultType: 'vector',
    matrix: solutionMatrix,
    formattedMatrix: formatted.cells,
    hasApproximations: formatted.hasApproximations,
    auxiliaryInfo: `Unique solution vector x (${n}×1)`,
  };
}
