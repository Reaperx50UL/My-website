import { determinantMatrix } from './matrixEngine';

console.log('=== Matrix Determinant Regression Checks ===');

// 1. 1x1 matrix
const m1x1 = [[5]];
const res1x1 = determinantMatrix(m1x1, 'A');
console.log('1x1 [[5]]: det =', res1x1.scalar, 'aux:', res1x1.auxiliaryInfo);

// 2. Triangular 3x3 matrix
const mTri = [
  [2, 1, 5],
  [0, 3, 2],
  [0, 0, 4],
];
const resTri = determinantMatrix(mTri, 'A');
console.log('Triangular 3x3: det =', resTri.scalar, 'expected: 24');

// 3. Singular 2x2 matrix
const mSingular = [
  [1, 2],
  [2, 4],
];
const resSingular = determinantMatrix(mSingular, 'A');
console.log('Singular 2x2: det =', resSingular.scalar, 'aux:', resSingular.auxiliaryInfo);

// 4. General 3x3 matrix
const m3x3 = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];
const res3x3 = determinantMatrix(m3x3, 'A');
console.log('General 3x3: det =', res3x3.scalar, 'expected: 1');
