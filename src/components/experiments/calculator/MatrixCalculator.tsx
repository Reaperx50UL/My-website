"use client";

import React, { useState, useRef } from 'react';
import {
  Grid,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  ArrowLeftRight,
  AlertTriangle,
  Sparkles,
  Play,
  CornerDownLeft,
} from 'lucide-react';
import {
  MIN_MATRIX_DIM,
  MAX_MATRIX_DIM,
  parseMatrixGrid,
  parseVectorStrings,
  parsePastedMatrixText,
  addOrSubtractMatrices,
  multiplyMatrices,
  scalarMultiplyMatrix,
  transposeMatrix,
  determinantMatrix,
  traceMatrix,
  inverseMatrix,
  powerMatrix,
  rankMatrix,
  rrefMatrix,
  solveLinearSystem,
  type MatrixGridStrings,
  type MatrixOperationType,
  type MatrixTarget,
  type MatrixCalculationResult,
} from './utils/matrixEngine';

export interface MatrixCalculatorProps {
  onSendScalarToCalculator?: (value: string) => void;
  className?: string;
}

const DEFAULT_MATRIX_A: MatrixGridStrings = [
  ['1', '2'],
  ['3', '4'],
];

const DEFAULT_MATRIX_B: MatrixGridStrings = [
  ['5', '6'],
  ['7', '8'],
];

const DEFAULT_VECTOR_B: string[] = ['5', '11'];

function resizeGrid(
  grid: MatrixGridStrings,
  newRows: number,
  newCols: number,
  fillValue = '0'
): MatrixGridStrings {
  const clampedRows = Math.max(MIN_MATRIX_DIM, Math.min(MAX_MATRIX_DIM, newRows));
  const clampedCols = Math.max(MIN_MATRIX_DIM, Math.min(MAX_MATRIX_DIM, newCols));

  return Array.from({ length: clampedRows }, (_, r) =>
    Array.from({ length: clampedCols }, (__, c) => grid[r]?.[c] ?? fillValue)
  );
}

function resizeVector(vec: string[], newLen: number, fillValue = '0'): string[] {
  const clamped = Math.max(MIN_MATRIX_DIM, Math.min(MAX_MATRIX_DIM, newLen));
  return Array.from({ length: clamped }, (_, i) => vec[i] ?? fillValue);
}

export const MatrixCalculator: React.FC<MatrixCalculatorProps> = ({
  onSendScalarToCalculator,
  className = '',
}) => {
  const [matrixA, setMatrixA] = useState<MatrixGridStrings>(DEFAULT_MATRIX_A);
  const [matrixB, setMatrixB] = useState<MatrixGridStrings>(DEFAULT_MATRIX_B);
  const [vectorB, setVectorB] = useState<string[]>(DEFAULT_VECTOR_B);

  const [selectedOp, setSelectedOp] = useState<MatrixOperationType>('determinant');
  const [targetMatrix, setTargetMatrix] = useState<MatrixTarget>('A');
  const [scalarK, setScalarK] = useState<string>('2');
  const [powerN, setPowerN] = useState<string>('2');
  const [displayFormat, setDisplayFormat] = useState<'fraction' | 'decimal'>('fraction');
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState<boolean>(false);

  // Initial computed result: det(A) for [[1,2],[3,4]] = -2
  const [result, setResult] = useState<MatrixCalculationResult | null>(() => {
    const parsedA = parseMatrixGrid(DEFAULT_MATRIX_A, 'Matrix A');
    if (parsedA.ok && parsedA.matrix) {
      return determinantMatrix(parsedA.matrix, 'A');
    }
    return null;
  });

  const cellRefsA = useRef<Record<string, HTMLInputElement | null>>({});
  const cellRefsB = useRef<Record<string, HTMLInputElement | null>>({});
  const cellRefsVec = useRef<Record<string, HTMLInputElement | null>>({});

  const rowsA = matrixA.length;
  const colsA = matrixA[0]?.length ?? 0;
  const rowsB = matrixB.length;
  const colsB = matrixB[0]?.length ?? 0;

  // Execute a matrix operation deterministically
  const executeOperation = (
    opOverride?: MatrixOperationType,
    targetOverride?: MatrixTarget,
    gridAOverride?: MatrixGridStrings,
    gridBOverride?: MatrixGridStrings,
    vecBOverride?: string[],
    scalarOverride?: string,
    powerOverride?: string
  ) => {
    const op = opOverride ?? selectedOp;
    const target = targetOverride ?? targetMatrix;
    const currentA = gridAOverride ?? matrixA;
    const currentB = gridBOverride ?? matrixB;
    const currentVecB = vecBOverride ?? vectorB;
    const currentScalar = scalarOverride ?? scalarK;
    const currentPower = powerOverride ?? powerN;

    setSelectedOp(op);
    if (targetOverride) setTargetMatrix(targetOverride);

    // Binary operations require both Matrix A and Matrix B
    if (op === 'add' || op === 'subtract' || op === 'multiply') {
      const parsedA = parseMatrixGrid(currentA, 'Matrix A');
      if (!parsedA.ok || !parsedA.matrix) {
        setResult({
          ok: false,
          operation: op,
          operationLabel: op === 'add' ? 'A + B' : op === 'subtract' ? 'A − B' : 'A × B',
          resultType: 'matrix',
          error: parsedA.error,
        });
        return;
      }
      const parsedB = parseMatrixGrid(currentB, 'Matrix B');
      if (!parsedB.ok || !parsedB.matrix) {
        setResult({
          ok: false,
          operation: op,
          operationLabel: op === 'add' ? 'A + B' : op === 'subtract' ? 'A − B' : 'A × B',
          resultType: 'matrix',
          error: parsedB.error,
        });
        return;
      }

      if (op === 'multiply') {
        setResult(multiplyMatrices(parsedA.matrix, parsedB.matrix));
      } else {
        setResult(addOrSubtractMatrices(parsedA.matrix, parsedB.matrix, op));
      }
      return;
    }

    // Solve Ax = b requires Matrix A and Vector b
    if (op === 'solve') {
      const parsedA = parseMatrixGrid(currentA, 'Matrix A');
      if (!parsedA.ok || !parsedA.matrix) {
        setResult({
          ok: false,
          operation: 'solve',
          operationLabel: 'Solve Ax = b',
          resultType: 'vector',
          error: parsedA.error,
        });
        return;
      }
      const parsedVec = parseVectorStrings(currentVecB, 'Vector b');
      if (!parsedVec.ok || !parsedVec.values) {
        setResult({
          ok: false,
          operation: 'solve',
          operationLabel: 'Solve Ax = b',
          resultType: 'vector',
          error: parsedVec.error,
        });
        return;
      }
      setResult(solveLinearSystem(parsedA.matrix, parsedVec.values));
      return;
    }

    // Unary operations on target matrix ('A' or 'B')
    const targetGrid = target === 'A' ? currentA : currentB;
    const parsedTarget = parseMatrixGrid(targetGrid, `Matrix ${target}`);
    if (!parsedTarget.ok || !parsedTarget.matrix) {
      setResult({
        ok: false,
        operation: op,
        operationLabel: `${op}(${target})`,
        resultType: op === 'determinant' || op === 'trace' || op === 'rank' ? 'scalar' : 'matrix',
        error: parsedTarget.error,
      });
      return;
    }

    const M = parsedTarget.matrix;
    switch (op) {
      case 'determinant':
        setResult(determinantMatrix(M, target));
        break;
      case 'trace':
        setResult(traceMatrix(M, target));
        break;
      case 'transpose':
        setResult(transposeMatrix(M, target));
        break;
      case 'inverse':
        setResult(inverseMatrix(M, target));
        break;
      case 'rank':
        setResult(rankMatrix(M, target));
        break;
      case 'rref':
        setResult(rrefMatrix(M, target));
        break;
      case 'scalarMultiply':
        setResult(scalarMultiplyMatrix(M, currentScalar, target));
        break;
      case 'power':
        setResult(powerMatrix(M, currentPower, target));
        break;
    }
  };

  // Update a single cell in Matrix A or B
  const handleCellChange = (
    which: MatrixTarget,
    r: number,
    c: number,
    value: string
  ) => {
    const updater = (prev: MatrixGridStrings) =>
      prev.map((row, rowIdx) =>
        rowIdx === r ? row.map((cell, colIdx) => (colIdx === c ? value : cell)) : row
      );
    if (which === 'A') setMatrixA(updater);
    else setMatrixB(updater);
  };

  // Keyboard navigation between cells
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    which: 'A' | 'B' | 'vec',
    r: number,
    c: number,
    maxR: number,
    maxC: number
  ) => {
    const input = e.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd =
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length;

    const focusCell = (nextR: number, nextC: number) => {
      if (nextR < 0 || nextR >= maxR || nextC < 0 || nextC >= maxC) return;
      e.preventDefault();
      const map =
        which === 'A'
          ? cellRefsA.current
          : which === 'B'
          ? cellRefsB.current
          : cellRefsVec.current;
      const el = map[`${nextR}-${nextC}`];
      if (el) {
        el.focus();
        el.select();
      }
    };

    if (e.key === 'ArrowUp') {
      focusCell(r - 1, c);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      if (e.key === 'Enter' && r === maxR - 1) {
        e.preventDefault();
        executeOperation();
      } else {
        focusCell(r + 1, c);
      }
    } else if (e.key === 'ArrowLeft' && atStart) {
      focusCell(r, c - 1);
    } else if (e.key === 'ArrowRight' && atEnd) {
      focusCell(r, c + 1);
    }
  };

  // Paste CSV/TSV/Matrix text into Matrix A, Matrix B, or Vector b
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    which: 'A' | 'B' | 'vec'
  ) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // Only intercept multi-value pastes (containing tabs, newlines, commas, or brackets)
    if (!/[\t\n,;[\]]/.test(text)) return;

    e.preventDefault();
    const parsed = parsePastedMatrixText(text, MAX_MATRIX_DIM);
    if (!parsed.ok || !parsed.grid) {
      setPasteNotice(parsed.error ?? 'Could not parse pasted matrix values.');
      setTimeout(() => setPasteNotice(null), 3000);
      return;
    }

    if (which === 'vec') {
      // Flatten first column or row into vector b
      const flat =
        parsed.grid.length === 1
          ? parsed.grid[0]
          : parsed.grid.map((row) => row[0] ?? '0');
      const clampedVec = flat.slice(0, MAX_MATRIX_DIM);
      setVectorB(clampedVec);
      setPasteNotice(`Pasted ${clampedVec.length}×1 vector into b.`);
    } else if (which === 'A') {
      setMatrixA(parsed.grid);
      setPasteNotice(`Pasted ${parsed.rows}×${parsed.cols} values into Matrix A.`);
    } else {
      setMatrixB(parsed.grid);
      setPasteNotice(`Pasted ${parsed.rows}×${parsed.cols} values into Matrix B.`);
    }
    setTimeout(() => setPasteNotice(null), 3000);
  };

  const handleSwapMatrices = () => {
    const tempA = matrixA.map((r) => [...r]);
    const tempB = matrixB.map((r) => [...r]);
    setMatrixA(tempB);
    setMatrixB(tempA);
    executeOperation(selectedOp, targetMatrix, tempB, tempA);
  };

  const handleLoadPreset = (
    preset: 'default2x2' | 'singular2x2' | 'system3x3' | 'identity3x3'
  ) => {
    if (preset === 'default2x2') {
      const a = [
        ['1', '2'],
        ['3', '4'],
      ];
      const b = [
        ['5', '6'],
        ['7', '8'],
      ];
      const vec = ['5', '11'];
      setMatrixA(a);
      setMatrixB(b);
      setVectorB(vec);
      executeOperation(selectedOp, targetMatrix, a, b, vec);
    } else if (preset === 'singular2x2') {
      const a = [
        ['1', '2'],
        ['2', '4'],
      ];
      setMatrixA(a);
      executeOperation('inverse', 'A', a, matrixB, vectorB);
    } else if (preset === 'system3x3') {
      const a = [
        ['2', '1', '-1'],
        ['-3', '-1', '2'],
        ['-2', '1', '2'],
      ];
      const b = [
        ['1', '0', '2'],
        ['0', '3', '1'],
        ['4', '-1', '1'],
      ];
      const vec = ['8', '-11', '-3'];
      setMatrixA(a);
      setMatrixB(b);
      setVectorB(vec);
      executeOperation('solve', 'A', a, b, vec);
    } else if (preset === 'identity3x3') {
      const id = [
        ['1', '0', '0'],
        ['0', '1', '0'],
        ['0', '0', '1'],
      ];
      setMatrixA(id);
      executeOperation(selectedOp, 'A', id, matrixB, vectorB);
    }
  };

  const formatResultForClipboard = (): string => {
    if (!result || !result.ok) return '';
    if (result.resultType === 'scalar' && result.formattedScalar) {
      return displayFormat === 'fraction'
        ? result.formattedScalar.fraction
        : result.formattedScalar.decimal;
    }
    if (result.formattedMatrix) {
      return result.formattedMatrix
        .map((row) =>
          row
            .map((cell) => (displayFormat === 'fraction' ? cell.fraction : cell.decimal))
            .join('\t')
        )
        .join('\n');
    }
    return '';
  };

  const handleCopyResult = async () => {
    const text = formatResultForClipboard();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 1500);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleLoadResultIntoMatrix = (dest: MatrixTarget) => {
    if (!result || !result.ok || !result.formattedMatrix) return;
    const newGrid: MatrixGridStrings = result.formattedMatrix.map((row) =>
      row.map((c) => (c.isExactFraction ? c.fraction : c.decimal))
    );
    if (dest === 'A') setMatrixA(newGrid);
    else setMatrixB(newGrid);
  };

  return (
    <section
      aria-label="Matrix Calculator"
      className={`flex flex-col bg-[#0F1624] border border-slate-800/90 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header & Sample Presets */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Matrix Workbench
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            · Up to {MAX_MATRIX_DIM}×{MAX_MATRIX_DIM} · RREF &amp; Ax = b
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400">Presets:</span>
          <button
            type="button"
            onClick={() => handleLoadPreset('default2x2')}
            className="px-2 py-1 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700/80 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Sample 2×2
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('system3x3')}
            className="px-2 py-1 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded transition-colors whitespace-nowrap shrink-0"
          >
            3×3 System
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('singular2x2')}
            className="px-2 py-1 text-xs font-mono bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700/80 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Singular 2×2
          </button>
          <button
            type="button"
            onClick={handleSwapMatrices}
            aria-label="Swap Matrix A and Matrix B"
            title="Swap Matrix A and Matrix B"
            className="px-2 py-1 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="w-3 h-3 text-violet-400" aria-hidden="true" />
            <span>Swap A↔B</span>
          </button>
        </div>
      </div>

      {pasteNotice && (
        <div
          role="status"
          className="px-4 py-1.5 bg-cyan-950/50 border-b border-cyan-500/30 text-xs text-cyan-200 font-mono"
        >
          {pasteNotice}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Matrix A & Matrix B Editors */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* MATRIX A CARD */}
          <div className="p-3 bg-[#090E19] border border-slate-800/90 rounded-lg space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-cyan-300">
                  Matrix A
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({rowsA}×{colsA})
                </span>
              </div>

              {/* Row / Col controls for Matrix A */}
              <div className="flex items-center gap-1 flex-wrap">
                <label className="sr-only" htmlFor="matrix-a-rows">
                  Matrix A rows
                </label>
                <select
                  id="matrix-a-rows"
                  aria-label="Matrix A rows"
                  value={rowsA}
                  onChange={(e) =>
                    setMatrixA((prev) => resizeGrid(prev, Number(e.target.value), colsA))
                  }
                  className="px-1.5 py-0.5 text-xs font-mono bg-[#070A12] border border-slate-700 rounded text-slate-200"
                >
                  {Array.from({ length: MAX_MATRIX_DIM }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}R
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">×</span>
                <label className="sr-only" htmlFor="matrix-a-cols">
                  Matrix A columns
                </label>
                <select
                  id="matrix-a-cols"
                  aria-label="Matrix A columns"
                  value={colsA}
                  onChange={(e) =>
                    setMatrixA((prev) => resizeGrid(prev, rowsA, Number(e.target.value)))
                  }
                  className="px-1.5 py-0.5 text-xs font-mono bg-[#070A12] border border-slate-700 rounded text-slate-200"
                >
                  {Array.from({ length: MAX_MATRIX_DIM }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}C
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setMatrixA((prev) => resizeGrid(prev, rowsA + 1, colsA))}
                  disabled={rowsA >= MAX_MATRIX_DIM}
                  aria-label="Add row to Matrix A"
                  title="Add Row"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  +R
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixA((prev) => resizeGrid(prev, rowsA - 1, colsA))}
                  disabled={rowsA <= MIN_MATRIX_DIM}
                  aria-label="Remove row from Matrix A"
                  title="Remove Row"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  −R
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixA((prev) => resizeGrid(prev, rowsA, colsA + 1))}
                  disabled={colsA >= MAX_MATRIX_DIM}
                  aria-label="Add column to Matrix A"
                  title="Add Column"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  +C
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixA((prev) => resizeGrid(prev, rowsA, colsA - 1))}
                  disabled={colsA <= MIN_MATRIX_DIM}
                  aria-label="Remove column from Matrix A"
                  title="Remove Column"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  −C
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMatrixA(
                      Array.from({ length: rowsA }, () =>
                        Array.from({ length: colsA }, () => '0')
                      )
                    )
                  }
                  aria-label="Clear Matrix A to zeros"
                  title="Reset Matrix A to zeros"
                  className="px-1.5 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-950/50 rounded border border-rose-500/30"
                >
                  0
                </button>
              </div>
            </div>

            {/* Scrollable Grid for Matrix A */}
            <div className="overflow-x-auto pb-1">
              <div
                role="grid"
                aria-label="Matrix A entries"
                className="inline-flex flex-col gap-1.5 min-w-full"
              >
                {matrixA.map((row, r) => (
                  <div key={`a-row-${r}`} role="row" className="flex items-center gap-1.5">
                    {row.map((val, c) => (
                      <input
                        key={`a-${r}-${c}`}
                        ref={(el) => {
                          cellRefsA.current[`${r}-${c}`] = el;
                        }}
                        type="text"
                        aria-label={`Matrix A row ${r + 1} column ${c + 1}`}
                        value={val}
                        onChange={(e) => handleCellChange('A', r, c, e.target.value)}
                        onKeyDown={(e) =>
                          handleCellKeyDown(e, 'A', r, c, rowsA, colsA)
                        }
                        onPaste={(e) => handleCellPaste(e, 'A')}
                        className="w-14 sm:w-16 min-w-[54px] px-2 py-1.5 text-xs sm:text-sm font-mono text-center bg-[#070A12] border border-slate-700/80 rounded text-slate-100 focus:outline-none focus:border-cyan-400"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MATRIX B CARD */}
          <div className="p-3 bg-[#090E19] border border-slate-800/90 rounded-lg space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-violet-300">
                  Matrix B
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({rowsB}×{colsB})
                </span>
              </div>

              {/* Row / Col controls for Matrix B */}
              <div className="flex items-center gap-1 flex-wrap">
                <label className="sr-only" htmlFor="matrix-b-rows">
                  Matrix B rows
                </label>
                <select
                  id="matrix-b-rows"
                  aria-label="Matrix B rows"
                  value={rowsB}
                  onChange={(e) =>
                    setMatrixB((prev) => resizeGrid(prev, Number(e.target.value), colsB))
                  }
                  className="px-1.5 py-0.5 text-xs font-mono bg-[#070A12] border border-slate-700 rounded text-slate-200"
                >
                  {Array.from({ length: MAX_MATRIX_DIM }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}R
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">×</span>
                <label className="sr-only" htmlFor="matrix-b-cols">
                  Matrix B columns
                </label>
                <select
                  id="matrix-b-cols"
                  aria-label="Matrix B columns"
                  value={colsB}
                  onChange={(e) =>
                    setMatrixB((prev) => resizeGrid(prev, rowsB, Number(e.target.value)))
                  }
                  className="px-1.5 py-0.5 text-xs font-mono bg-[#070A12] border border-slate-700 rounded text-slate-200"
                >
                  {Array.from({ length: MAX_MATRIX_DIM }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}C
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setMatrixB((prev) => resizeGrid(prev, rowsB + 1, colsB))}
                  disabled={rowsB >= MAX_MATRIX_DIM}
                  aria-label="Add row to Matrix B"
                  title="Add Row"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  +R
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixB((prev) => resizeGrid(prev, rowsB - 1, colsB))}
                  disabled={rowsB <= MIN_MATRIX_DIM}
                  aria-label="Remove row from Matrix B"
                  title="Remove Row"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  −R
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixB((prev) => resizeGrid(prev, rowsB, colsB + 1))}
                  disabled={colsB >= MAX_MATRIX_DIM}
                  aria-label="Add column to Matrix B"
                  title="Add Column"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  +C
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixB((prev) => resizeGrid(prev, rowsB, colsB - 1))}
                  disabled={colsB <= MIN_MATRIX_DIM}
                  aria-label="Remove column from Matrix B"
                  title="Remove Column"
                  className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
                >
                  −C
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMatrixB(
                      Array.from({ length: rowsB }, () =>
                        Array.from({ length: colsB }, () => '0')
                      )
                    )
                  }
                  aria-label="Clear Matrix B to zeros"
                  title="Reset Matrix B to zeros"
                  className="px-1.5 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-950/50 rounded border border-rose-500/30"
                >
                  0
                </button>
              </div>
            </div>

            {/* Scrollable Grid for Matrix B */}
            <div className="overflow-x-auto pb-1">
              <div
                role="grid"
                aria-label="Matrix B entries"
                className="inline-flex flex-col gap-1.5 min-w-full"
              >
                {matrixB.map((row, r) => (
                  <div key={`b-row-${r}`} role="row" className="flex items-center gap-1.5">
                    {row.map((val, c) => (
                      <input
                        key={`b-${r}-${c}`}
                        ref={(el) => {
                          cellRefsB.current[`${r}-${c}`] = el;
                        }}
                        type="text"
                        aria-label={`Matrix B row ${r + 1} column ${c + 1}`}
                        value={val}
                        onChange={(e) => handleCellChange('B', r, c, e.target.value)}
                        onKeyDown={(e) =>
                          handleCellKeyDown(e, 'B', r, c, rowsB, colsB)
                        }
                        onPaste={(e) => handleCellPaste(e, 'B')}
                        className="w-14 sm:w-16 min-w-[54px] px-2 py-1.5 text-xs sm:text-sm font-mono text-center bg-[#070A12] border border-slate-700/80 rounded text-slate-100 focus:outline-none focus:border-violet-400"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vector b Input Bar (for Linear System Ax = b) */}
        <div className="p-3 bg-[#090E19] border border-slate-800/90 rounded-lg space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-emerald-300">
                Vector b (for Ax = b)
              </span>
              <span className="text-xs font-mono text-slate-400">
                ({vectorB.length}×1)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setVectorB((prev) => resizeVector(prev, rowsA))}
                className="px-2 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded transition-colors"
                title="Match Vector b length to Matrix A rows"
              >
                Sync to rows(A) ({rowsA})
              </button>
              <button
                type="button"
                onClick={() => setVectorB((prev) => resizeVector(prev, prev.length + 1))}
                disabled={vectorB.length >= MAX_MATRIX_DIM}
                aria-label="Add entry to Vector b"
                className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setVectorB((prev) => resizeVector(prev, prev.length - 1))}
                disabled={vectorB.length <= MIN_MATRIX_DIM}
                aria-label="Remove entry from Vector b"
                className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setVectorB(Array.from({ length: vectorB.length }, () => '0'))}
                aria-label="Clear Vector b to zeros"
                className="px-1.5 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-950/50 rounded border border-rose-500/30"
              >
                0
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {vectorB.map((val, idx) => (
                <div key={`vec-b-${idx}`} className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    b<sub className="text-[9px]">{idx + 1}</sub>
                  </span>
                  <input
                    ref={(el) => {
                      cellRefsVec.current[`0-${idx}`] = el;
                    }}
                    type="text"
                    aria-label={`Vector b row ${idx + 1}`}
                    value={val}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setVectorB((prev) => prev.map((v, i) => (i === idx ? nextVal : v)));
                    }}
                    onKeyDown={(e) =>
                      handleCellKeyDown(e, 'vec', 0, idx, 1, vectorB.length)
                    }
                    onPaste={(e) => handleCellPaste(e, 'vec')}
                    className="w-14 sm:w-16 min-w-[54px] px-2 py-1 text-xs sm:text-sm font-mono text-center bg-[#070A12] border border-slate-700/80 rounded text-slate-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operations Deck */}
        <div className="p-3 bg-[#0B101B] border border-slate-800/90 rounded-lg space-y-3">
          {/* Row 1: Binary Operations & Linear System */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300">
              Binary &amp; Linear System
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => executeOperation('add')}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  selectedOp === 'add'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-[#131C2E] hover:bg-slate-800 text-cyan-200 border-slate-700'
                }`}
              >
                A + B
              </button>
              <button
                type="button"
                onClick={() => executeOperation('subtract')}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  selectedOp === 'subtract'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-[#131C2E] hover:bg-slate-800 text-cyan-200 border-slate-700'
                }`}
              >
                A − B
              </button>
              <button
                type="button"
                onClick={() => executeOperation('multiply')}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  selectedOp === 'multiply'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-[#131C2E] hover:bg-slate-800 text-cyan-200 border-slate-700'
                }`}
              >
                A × B
              </button>
              <button
                type="button"
                onClick={() => executeOperation('solve')}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  selectedOp === 'solve'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                Solve Ax = b
              </button>
            </div>
          </div>

          {/* Row 2: Single-Matrix Operations with Target Selector (Matrix A / Matrix B) */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">
                  Single-Matrix Operations on:
                </span>
                <div
                  role="group"
                  aria-label="Target matrix selector"
                  className="inline-flex p-0.5 bg-[#070A12] border border-slate-800 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMatrix('A');
                      if (
                        selectedOp !== 'add' &&
                        selectedOp !== 'subtract' &&
                        selectedOp !== 'multiply' &&
                        selectedOp !== 'solve'
                      ) {
                        executeOperation(selectedOp, 'A');
                      }
                    }}
                    aria-pressed={targetMatrix === 'A'}
                    className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded transition-colors ${
                      targetMatrix === 'A'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Matrix A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMatrix('B');
                      if (
                        selectedOp !== 'add' &&
                        selectedOp !== 'subtract' &&
                        selectedOp !== 'multiply' &&
                        selectedOp !== 'solve'
                      ) {
                        executeOperation(selectedOp, 'B');
                      }
                    }}
                    aria-pressed={targetMatrix === 'B'}
                    className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded transition-colors ${
                      targetMatrix === 'B'
                        ? 'bg-violet-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Matrix B
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'determinant', label: `det(${targetMatrix})` },
                  { id: 'trace', label: `trace(${targetMatrix})` },
                  { id: 'transpose', label: `transpose(${targetMatrix})` },
                  { id: 'inverse', label: `inv(${targetMatrix})` },
                  { id: 'rank', label: `rank(${targetMatrix})` },
                  { id: 'rref', label: `rref(${targetMatrix})` },
                  { id: 'scalarMultiply', label: `k · ${targetMatrix}` },
                  { id: 'power', label: `${targetMatrix}^n` },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => executeOperation(item.id, targetMatrix)}
                  className={`py-1.5 px-2.5 text-xs font-mono font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    selectedOp === item.id
                      ? 'bg-violet-600 text-white border-violet-400'
                      : 'bg-[#131C2E] hover:bg-slate-800 text-slate-200 border-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Conditional Parameter Input for k · M (Scalar) or M^n (Power) */}
            {selectedOp === 'scalarMultiply' && (
              <div className="flex items-center gap-2 bg-[#070A12] px-2.5 py-1.5 rounded-lg border border-slate-800">
                <label
                  htmlFor="matrix-scalar-input"
                  className="text-xs font-mono text-slate-400 whitespace-nowrap"
                >
                  Scalar k =
                </label>
                <input
                  id="matrix-scalar-input"
                  type="text"
                  value={scalarK}
                  onChange={(e) => setScalarK(e.target.value)}
                  className="w-full px-2 py-0.5 text-xs font-mono bg-[#0B101D] border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    executeOperation('scalarMultiply', targetMatrix, undefined, undefined, undefined, scalarK)
                  }
                  className="px-2.5 py-1 text-xs font-mono font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded whitespace-nowrap shrink-0"
                >
                  Compute k·{targetMatrix}
                </button>
              </div>
            )}

            {selectedOp === 'power' && (
              <div className="flex items-center gap-2 bg-[#070A12] px-2.5 py-1.5 rounded-lg border border-slate-800">
                <label
                  htmlFor="matrix-power-input"
                  className="text-xs font-mono text-slate-400 whitespace-nowrap"
                >
                  Integer Power n =
                </label>
                <input
                  id="matrix-power-input"
                  type="text"
                  value={powerN}
                  onChange={(e) => setPowerN(e.target.value)}
                  className="w-full px-2 py-0.5 text-xs font-mono bg-[#0B101D] border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    executeOperation('power', targetMatrix, undefined, undefined, undefined, undefined, powerN)
                  }
                  className="px-2.5 py-1 text-xs font-mono font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-500/30 rounded whitespace-nowrap shrink-0"
                >
                  Compute {targetMatrix}^n
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result Display Area */}
        <div
          aria-live="polite"
          data-testid="matrix-result-panel"
          className="p-4 bg-[#070A12] border border-slate-800 rounded-lg space-y-3"
        >
          {!result ? (
            <div className="text-xs text-slate-400 text-center py-4">
              Select a matrix operation above to inspect the result.
            </div>
          ) : !result.ok ? (
            <div
              role="alert"
              data-testid="matrix-error"
              className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-lg flex items-start gap-2.5 text-xs text-rose-200"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <div className="font-semibold text-rose-300">
                  Operation Failed: {result.operationLabel}
                </div>
                <div>{result.error}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Result Top Bar: Title, Format Toggle (Exact Fraction vs Decimal), Copy & Clear */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="matrix-result-label"
                      className="text-xs font-semibold font-mono text-cyan-300"
                    >
                      {result.operationLabel}
                    </span>
                    {result.auxiliaryInfo && (
                      <span className="text-xs font-mono text-slate-400">
                        · {result.auxiliaryInfo}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Fraction / Decimal Format Switch */}
                  <div
                    role="group"
                    aria-label="Matrix number display format"
                    className="inline-flex p-0.5 bg-[#0B101D] border border-slate-800 rounded-md"
                  >
                    <button
                      type="button"
                      onClick={() => setDisplayFormat('fraction')}
                      aria-pressed={displayFormat === 'fraction'}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                        displayFormat === 'fraction'
                          ? 'bg-cyan-500/25 text-cyan-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Exact / Frac
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayFormat('decimal')}
                      aria-pressed={displayFormat === 'decimal'}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                        displayFormat === 'decimal'
                          ? 'bg-cyan-500/25 text-cyan-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Decimal
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyResult}
                    aria-label="Copy matrix result"
                    className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 transition-colors"
                  >
                    {copiedResult ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>

                  {result.formattedMatrix && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleLoadResultIntoMatrix('A')}
                        className="px-2 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded transition-colors"
                        title="Copy result matrix into Matrix A"
                      >
                        → A
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadResultIntoMatrix('B')}
                        className="px-2 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-violet-300 border border-slate-700 rounded transition-colors"
                        title="Copy result matrix into Matrix B"
                      >
                        → B
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    aria-label="Clear matrix result"
                    className="p-1 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors"
                    title="Clear result"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scalar Result View (det, trace, rank) */}
              {result.resultType === 'scalar' && result.formattedScalar && (
                <div className="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div
                      data-testid="matrix-scalar-result"
                      className="text-2xl font-mono font-bold text-slate-50 tabular-nums"
                    >
                      {displayFormat === 'fraction'
                        ? result.formattedScalar.fraction
                        : result.formattedScalar.decimal}
                    </div>
                    {result.formattedScalar.fraction !== result.formattedScalar.decimal && (
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {displayFormat === 'fraction'
                          ? `Decimal: ≈ ${result.formattedScalar.decimal}`
                          : result.formattedScalar.isExactFraction
                          ? `Exact fraction: ${result.formattedScalar.fraction}`
                          : 'Rounded decimal approximation (6 d.p.)'}
                      </div>
                    )}
                  </div>

                  {onSendScalarToCalculator && (
                    <button
                      type="button"
                      onClick={() =>
                        onSendScalarToCalculator(result.formattedScalar?.decimal ?? '0')
                      }
                      className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-md flex items-center gap-1 transition-colors shrink-0"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Use in Calc</span>
                    </button>
                  )}
                </div>
              )}

              {/* Matrix or Vector Grid Result View */}
              {result.formattedMatrix && (
                <div className="space-y-2">
                  <div className="overflow-x-auto py-1">
                    <div className="inline-flex items-stretch">
                      {/* Left Matrix Bracket */}
                      <div
                        className="w-2.5 border-l-2 border-t-2 border-b-2 border-cyan-400/70 rounded-l-sm mr-1.5"
                        aria-hidden="true"
                      />

                      <table
                        data-testid="matrix-result-grid"
                        aria-label={`Result for ${result.operationLabel}`}
                        className="border-collapse"
                      >
                        <tbody>
                          {result.formattedMatrix.map((row, r) => (
                            <tr key={`res-row-${r}`}>
                              {row.map((cell, c) => {
                                const text =
                                  displayFormat === 'fraction'
                                    ? cell.fraction
                                    : cell.decimal;
                                return (
                                  <td
                                    key={`res-${r}-${c}`}
                                    data-testid={`matrix-res-cell-${r}-${c}`}
                                    className="px-3 py-1.5 text-sm font-mono font-semibold text-slate-100 text-right tabular-nums bg-[#0B101D] border border-slate-800/80 min-w-[56px]"
                                  >
                                    {text}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Right Matrix Bracket */}
                      <div
                        className="w-2.5 border-r-2 border-t-2 border-b-2 border-cyan-400/70 rounded-r-sm ml-1.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Vector summary line for Ax = b */}
                  {result.resultType === 'vector' && (
                    <div
                      data-testid="matrix-vector-summary"
                      className="text-xs font-mono text-emerald-300"
                    >
                      x = [
                      {result.formattedMatrix
                        .map((row) =>
                          displayFormat === 'fraction'
                            ? row[0].fraction
                            : row[0].decimal
                        )
                        .join(', ')}
                      ]
                    </div>
                  )}

                  {/* Precision / Approximation Badge */}
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
                    <span>
                      {displayFormat === 'fraction' && !result.hasApproximations
                        ? 'Exact rational / integer representation verified.'
                        : displayFormat === 'decimal' && result.hasApproximations
                        ? 'Values shown are rounded decimal approximations (up to 6 decimal places).'
                        : 'Values formatted with 6-digit decimal precision.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MatrixCalculator;
