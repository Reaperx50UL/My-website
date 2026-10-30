import React from 'react';
import {
  COLOR_META,
  DICE_STYLE_OPTIONS,
  getDiceStyleOption,
} from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';
import { DiceFaceSVG, DiceFaceSVGProps, PIP_POSITIONS } from './DiceFaceSVG';
import { ThreeDimensionalDie } from './ThreeDimensionalDie';

export { DiceFaceSVG, PIP_POSITIONS, ThreeDimensionalDie };
export type { DiceFaceSVGProps };

interface DiceRollerProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  activeColor: PlayerColor;
  activePlayerName: string;
  isAI: boolean;
  reducedMotion: boolean;
  hasLegalMoves: boolean;
  turnPhase: string;
  diceStyle?: DiceStyle;
  onCycleDiceStyle?: () => void;
  onRoll: () => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  value,
  isRolling,
  canRoll,
  activeColor,
  activePlayerName,
  isAI,
  reducedMotion,
  hasLegalMoves,
  turnPhase,
  diceStyle = 'classic_ivory',
  onCycleDiceStyle,
  onRoll,
}) => {
  const colorMeta = COLOR_META[activeColor] || COLOR_META.red;
  const styleOpt = getDiceStyleOption(diceStyle);
  const rolledSix = !isRolling && value === 6;

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2 w-full">
      {/* Player Tag & Style Switcher Bar */}
      <div className="flex items-center justify-between w-full px-0.5 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded text-[10px] sm:text-xs font-bold text-slate-950 shrink-0"
            style={{ backgroundColor: colorMeta.primaryHex }}
          >
            {colorMeta.symbol}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
            {activePlayerName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onCycleDiceStyle && (
            <button
              type="button"
              onClick={onCycleDiceStyle}
              title={`Dice Style: ${styleOpt.label} (Click to switch design)`}
              aria-label={`Switch Dice Style (Current: ${styleOpt.label})`}
              className="px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-[10px] font-medium text-amber-300 transition-colors cursor-pointer"
            >
              🎲 {styleOpt.label}
            </button>
          )}
          <span className="text-[11px] sm:text-xs font-medium text-slate-400 whitespace-nowrap">
            {isRolling
              ? 'Rolling...'
              : turnPhase === 'SELECTING_TOKEN'
              ? 'Select Token'
              : turnPhase === 'TURN_TRANSITION'
              ? 'No Moves'
              : isAI
              ? 'AI Thinking'
              : 'Your Turn'}
          </span>
        </div>
      </div>

      {/* 2D Die & Action CTA Bar */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        {/* 2D Die */}
        <div
          className="relative shrink-0 flex items-center justify-center p-0.5"
          data-testid="hud-2d-die-container"
        >
          <ThreeDimensionalDie
            value={value}
            isRolling={isRolling}
            canRoll={canRoll}
            activeColor={activeColor}
            diceStyle={diceStyle}
            size={54}
            reducedMotion={reducedMotion}
            interactive={true}
            onClick={() => {
              if (canRoll && !isRolling) {
                onRoll();
              }
            }}
            className={canRoll && !isRolling ? 'cursor-pointer' : 'cursor-not-allowed'}
          />
        </div>

        {/* Action CTA Button & Status Readout */}
        <div className="flex flex-col flex-1 min-w-0 gap-1">
          <button
            type="button"
            onClick={() => {
              if (canRoll && !isRolling) {
                onRoll();
              }
            }}
            disabled={!canRoll || isRolling}
            className={`w-full py-2 sm:py-2.5 px-3.5 rounded-xl font-display font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
              canRoll && !isRolling
                ? 'text-slate-950 shadow-lg hover:brightness-110 active:scale-[0.98] cursor-pointer'
                : 'bg-slate-800/90 text-slate-400 border border-slate-700/70 cursor-not-allowed'
            }`}
            style={
              canRoll && !isRolling
                ? {
                    backgroundColor: colorMeta.primaryHex,
                    boxShadow: `0 6px 16px -3px ${colorMeta.glowHex}`,
                  }
                : undefined
            }
          >
            {isRolling
              ? 'Rolling Dice...'
              : canRoll
              ? 'Roll Dice [Space]'
              : turnPhase === 'SELECTING_TOKEN'
              ? `Rolled ${value} · Pick Token`
              : value !== null
              ? `Rolled ${value}`
              : 'Waiting...'}
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            {rolledSix ? (
              <span className="font-semibold text-amber-300 truncate">
                ★ Rolled a 6! Bonus roll earned
              </span>
            ) : turnPhase === 'SELECTING_TOKEN' && hasLegalMoves ? (
              <span className="text-emerald-300 truncate">
                Tap a glowing token or press 1–4
              </span>
            ) : turnPhase === 'TURN_TRANSITION' ? (
              <span className="text-rose-300 truncate">
                No legal moves · Passing turn
              </span>
            ) : (
              <span className="truncate">
                {isAI ? 'Computer opponent active' : 'Roll 6 to deploy from yard'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
