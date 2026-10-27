import { evaluateMathExpression, formatNumber } from './mathEngine';

export type UnitCategory = 'length' | 'mass';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  category: UnitCategory;
  /** Conversion factor to base SI unit (meter for length, kilogram for mass) */
  toBaseFactor: number;
  system: 'SI / Metric' | 'Imperial / US';
}

export const LENGTH_UNITS: UnitDefinition[] = [
  { id: 'mm', name: 'Millimeter', symbol: 'mm', category: 'length', toBaseFactor: 0.001, system: 'SI / Metric' },
  { id: 'cm', name: 'Centimeter', symbol: 'cm', category: 'length', toBaseFactor: 0.01, system: 'SI / Metric' },
  { id: 'm', name: 'Meter', symbol: 'm', category: 'length', toBaseFactor: 1, system: 'SI / Metric' },
  { id: 'km', name: 'Kilometer', symbol: 'km', category: 'length', toBaseFactor: 1000, system: 'SI / Metric' },
  { id: 'in', name: 'Inch', symbol: 'in', category: 'length', toBaseFactor: 0.0254, system: 'Imperial / US' },
  { id: 'ft', name: 'Foot', symbol: 'ft', category: 'length', toBaseFactor: 0.3048, system: 'Imperial / US' },
  { id: 'yd', name: 'Yard', symbol: 'yd', category: 'length', toBaseFactor: 0.9144, system: 'Imperial / US' },
  { id: 'mi', name: 'Mile', symbol: 'mi', category: 'length', toBaseFactor: 1609.344, system: 'Imperial / US' },
  { id: 'nmi', name: 'Nautical Mile', symbol: 'nmi', category: 'length', toBaseFactor: 1852, system: 'Imperial / US' },
];

export const MASS_UNITS: UnitDefinition[] = [
  { id: 'mg', name: 'Milligram', symbol: 'mg', category: 'mass', toBaseFactor: 1e-6, system: 'SI / Metric' },
  { id: 'g', name: 'Gram', symbol: 'g', category: 'mass', toBaseFactor: 0.001, system: 'SI / Metric' },
  { id: 'kg', name: 'Kilogram', symbol: 'kg', category: 'mass', toBaseFactor: 1, system: 'SI / Metric' },
  { id: 't', name: 'Metric Tonne', symbol: 't', category: 'mass', toBaseFactor: 1000, system: 'SI / Metric' },
  { id: 'oz', name: 'Ounce', symbol: 'oz', category: 'mass', toBaseFactor: 0.028349523125, system: 'Imperial / US' },
  { id: 'lb', name: 'Pound', symbol: 'lb', category: 'mass', toBaseFactor: 0.45359237, system: 'Imperial / US' },
  { id: 'st', name: 'Stone', symbol: 'st', category: 'mass', toBaseFactor: 6.35029318, system: 'Imperial / US' },
  { id: 'ton_us', name: 'US Short Ton', symbol: 'ton (US)', category: 'mass', toBaseFactor: 907.18474, system: 'Imperial / US' },
];

export function getUnitsByCategory(category: UnitCategory): UnitDefinition[] {
  return category === 'length' ? LENGTH_UNITS : MASS_UNITS;
}

export interface MultiUnitConversionEntry {
  unit: UnitDefinition;
  numericValue: number;
  formattedValue: string;
}

export interface UnitConversionResult {
  ok: boolean;
  category: UnitCategory;
  fromUnit?: UnitDefinition;
  toUnit?: UnitDefinition;
  inputValue?: number;
  formattedInput?: string;
  outputValue?: number;
  formattedOutput?: string;
  unitRateFormatted?: string;
  allConversions?: MultiUnitConversionEntry[];
  error?: string;
}

/**
 * Converts a numeric or mathematical expression string between units of length or mass.
 */
export function convertUnitValue(
  rawInput: string,
  category: UnitCategory,
  fromUnitId: string,
  toUnitId: string
): UnitConversionResult {
  const units = getUnitsByCategory(category);
  const fromUnit = units.find((u) => u.id === fromUnitId);
  const toUnit = units.find((u) => u.id === toUnitId);

  if (!fromUnit || !toUnit) {
    return {
      ok: false,
      category,
      error: `Invalid unit selection for ${category} conversion.`,
    };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      category,
      fromUnit,
      toUnit,
      error: 'Enter a numeric value or expression to convert.',
    };
  }

  const parsed = evaluateMathExpression(trimmed, { angleMode: 'RAD' });
  if (!parsed.ok || parsed.value === undefined || !Number.isFinite(parsed.value)) {
    return {
      ok: false,
      category,
      fromUnit,
      toUnit,
      error: parsed.error ?? 'Invalid numeric value for unit conversion.',
    };
  }

  const inputValue = parsed.value;
  const baseValue = inputValue * fromUnit.toBaseFactor;
  const outputValue = baseValue / toUnit.toBaseFactor;
  const unitRate = fromUnit.toBaseFactor / toUnit.toBaseFactor;

  const allConversions: MultiUnitConversionEntry[] = units.map((unit) => {
    const val = baseValue / unit.toBaseFactor;
    return {
      unit,
      numericValue: val,
      formattedValue: formatNumber(val, 8),
    };
  });

  return {
    ok: true,
    category,
    fromUnit,
    toUnit,
    inputValue,
    formattedInput: formatNumber(inputValue, 8),
    outputValue,
    formattedOutput: formatNumber(outputValue, 8),
    unitRateFormatted: formatNumber(unitRate, 8),
    allConversions,
  };
}
