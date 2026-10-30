import React, { useEffect, useState } from 'react';
import {
  COLOR_META,
  DICE_FACE_ROTATIONS,
  getDiceStyleOption,
} from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';
import { DiceFaceSVG } from './DiceFaceSVG';

export interface ThreeDimensionalDieProps {
  value: number | null;
  isRolling: boolean;
  canRoll?: boolean;
  activeColor?: PlayerColor;
  diceStyle?: DiceStyle;
  size?: number;
  reducedMotion?: boolean;
  showShadow?: boolean;
  showSixGlow?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const FACE_ROTATIONS = DICE_FACE_ROTATIONS;

export const ThreeDimensionalDie: React.FC<ThreeDimensionalDieProps> = ({
  value,
  isRolling,
  canRoll = false,
  activeColor = 'red',
  diceStyle = 'classic_ivory',
  size = 54,
  reducedMotion = false,
  showSixGlow = true,
  interactive = true,
  onClick,
  className = '',
}) => {
  const [displayFace, setDisplayFace] = useState<number>(value || 6);

  const styleOpt = getDiceStyleOption(diceStyle);
  const colorMeta = COLOR_META[activeColor] || COLOR_META.red;

  // Cycle 2D dice faces rapidly while rolling, then snap to final value
  useEffect(() => {
    if (!isRolling) {
      if (value !== null) {
        setDisplayFace(value);
      }
      return;
    }

    if (reducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setDisplayFace((prev) => (prev % 6) + 1);
    }, 75);

    return () => window.clearInterval(interval);
  }, [isRolling, value, reducedMotion]);

  const safeFace = displayFace >= 1 && displayFace <= 6 ? displayFace : 6;
  const isSix = !isRolling && value === 6;

  const faceBackground = isSix
    ? styleOpt.rolledSixGradient
    : styleOpt.surfaceGradient;

  const faceBorderColor = isSix
    ? '#F59E0B'
    : diceStyle === 'classic_ivory'
    ? colorMeta.primaryHex
    : styleOpt.borderHex;

  const borderRadiusPx = Math.max(10, Math.round(size * 0.22));

  return (
    <div
      data-dice-style={styleOpt.id}
      data-dice-texture={styleOpt.texturePattern}
      data-dice-animation={styleOpt.animationProfile}
      data-dice-model="flat_2d"
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-150 ${
        !reducedMotion && isRolling
          ? 'animate-dice-roll-2d'
          : interactive && canRoll
          ? 'hover:scale-105 active:scale-95'
          : ''
      } ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      onClick={interactive && canRoll && !isRolling ? onClick : undefined}
      role={interactive && canRoll ? 'button' : undefined}
      tabIndex={interactive && canRoll ? 0 : undefined}
      aria-label={`${styleOpt.label} Dice (${safeFace}${
        isRolling ? ' - rolling' : ''
      })`}
      onKeyDown={(e) => {
        if (
          interactive &&
          canRoll &&
          !isRolling &&
          onClick &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Celebratory Golden Aura on Rolling a 6 */}
      {showSixGlow && isSix && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -m-1.5 rounded-2xl pointer-events-none border-2 border-amber-400/80 animate-ping"
        />
      )}

      {/* Clean 2D Die Face Surface */}
      <div
        className="w-full h-full relative flex items-center justify-center overflow-hidden shadow-lg"
        style={{
          borderRadius: `${borderRadiusPx}px`,
          background: faceBackground,
          border: `2px solid ${faceBorderColor}`,
          boxShadow: isSix
            ? `0 0 18px rgba(245, 158, 11, 0.55), ${styleOpt.shadowStyle}`
            : canRoll && !isRolling
            ? `0 6px 14px -3px ${colorMeta.glowHex}, ${styleOpt.shadowStyle}`
            : styleOpt.shadowStyle,
        }}
      >
        <DiceFaceSVG
          face={safeFace}
          diceStyle={diceStyle}
          activeColor={activeColor}
          className="w-full h-full p-1"
        />
      </div>

      {/* Interactive Can-Roll Indicator Pip */}
      {interactive && canRoll && !isRolling && (
        <span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 pointer-events-none animate-pulse"
          style={{ backgroundColor: colorMeta.primaryHex }}
        />
      )}
    </div>
  );
};


