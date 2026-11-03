import React, { useEffect, useRef, useState } from 'react';
import {
  COLOR_META,
  DICE_FACE_ROTATIONS,
  getDiceStyleOption,
} from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';
import { RoundedCube3DCanvas } from './RoundedCube3DCanvas';

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
  showShadow = true,
  showSixGlow = true,
  interactive = true,
  onClick,
  className = '',
}) => {
  const [displayFace, setDisplayFace] = useState<number>(value || 6);
  const [isLanding, setIsLanding] = useState<boolean>(false);
  const prevRollingRef = useRef<boolean>(isRolling);

  const styleOpt = getDiceStyleOption(diceStyle);
  const colorMeta = COLOR_META[activeColor] || COLOR_META.red;
  const isPremium2D = Boolean(styleOpt.isPremium2D);

  // Sync displayFace whenever value updates and detect Phase 4-5 Landing & Settling
  useEffect(() => {
    if (value !== null && value >= 1 && value <= 6) {
      setDisplayFace(value);
    }
    if (prevRollingRef.current && !isRolling) {
      if (!reducedMotion) {
        setIsLanding(true);
        const timer = window.setTimeout(() => {
          setIsLanding(false);
        }, 540);
        prevRollingRef.current = isRolling;
        return () => window.clearTimeout(timer);
      }
    }
    prevRollingRef.current = isRolling;
  }, [isRolling, value, reducedMotion]);

  const safeFace = displayFace >= 1 && displayFace <= 6 ? displayFace : 6;
  const isSix = !isRolling && value === 6;

  return (
    <div
      data-dice-style={styleOpt.id}
      data-dice-texture={styleOpt.texturePattern}
      data-dice-animation={styleOpt.animationProfile}
      data-dice-roll-class={styleOpt.rollPhysics.rollingEffectClass}
      data-dice-model={isPremium2D ? styleOpt.modelGeometry : 'cube_3d'}
      data-dice-landing={isLanding ? 'true' : 'false'}
      className={`dice-stage-perspective relative inline-flex items-center justify-center select-none overflow-visible ${
        !isRolling && interactive && canRoll
          ? 'hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer'
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
      {/* Dynamic 3D Tabletop Contact Shadow & Ambient Subsurface Glow */}
      {showShadow && (
        <div
          aria-hidden="true"
          className={`absolute pointer-events-none transition-all duration-200 rounded-full ${
            isRolling && !reducedMotion
              ? 'animate-dice-shadow-bounce'
              : !reducedMotion
              ? 'animate-dice-shadow-breathe'
              : ''
          }`}
          style={{
            width: `${Math.round(size * 0.86)}px`,
            height: `${Math.round(size * 0.28)}px`,
            bottom: `-${Math.round(size * 0.1)}px`,
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, ${styleOpt.coreGlowHex} 52%, transparent 84%)`,
            opacity: isRolling ? 0.92 : 0.82,
            filter: 'blur(2.5px)',
          }}
        />
      )}

      {/* Celebratory Golden Aura on Rolling a 6 */}
      {showSixGlow && isSix && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -m-1.5 rounded-2xl pointer-events-none border-2 border-amber-400/80 animate-ping"
        />
      )}

      {/* ======================================================================
           1. LAVA CUBE PULSATING IDLE AURA & RISING EMBERS
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'lava_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-lava-cube"
          className="absolute inset-0 -m-2 pointer-events-none overflow-visible flex items-center justify-center"
        >
          <div
            className="w-full h-full rounded-full animate-lava-aura-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(255,106,0,0.48) 0%, rgba(239,68,68,0.22) 55%, transparent 76%)',
            }}
          />
          {isRolling && (
            <>
              <span className="absolute -top-2 left-1/4 w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#FF5500] animate-ping" />
              <span className="absolute -bottom-1 right-1/4 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#FF2200] animate-ping" />
            </>
          )}
        </div>
      )}

      {/* ======================================================================
           2. ELECTRO CUBE PULSATING CAPACITOR AURA & HIGH-VOLTAGE ARCS
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'electro_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-electro-cube"
          className="absolute inset-0 -m-2 pointer-events-none overflow-visible flex items-center justify-center"
        >
          <div
            className="w-full h-full rounded-full animate-electro-aura-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(0,240,255,0.46) 0%, rgba(56,189,248,0.22) 55%, transparent 76%)',
            }}
          />
          {(showShadow || isRolling) && (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full overflow-visible animate-electro-arc"
            >
              <polyline
                points="14,26 18,17 27,14"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <polyline
                points="73,86 82,83 86,74"
                fill="none"
                stroke="#E0F2FE"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {isRolling && (
                <>
                  <polyline
                    points="50,-4 44,10 56,16 48,28"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <polyline
                    points="50,104 56,90 44,84 52,72"
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          )}
        </div>
      )}

      {/* ======================================================================
           3. TESSERACT CUBE PULSATING 4D PORTAL AURA
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'tesseract_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-tesseract-cube"
          className="absolute inset-0 -m-2 pointer-events-none overflow-visible flex items-center justify-center"
        >
          <div
            className="w-full h-full rounded-xl animate-tesseract-aura-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(192,132,252,0.48) 0%, rgba(103,232,249,0.24) 55%, transparent 76%)',
            }}
          />
          {isRolling && (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full overflow-visible animate-orbit-ccw"
            >
              <polygon
                points="50,3 85,15 97,50 85,85 50,97 15,85 3,50 15,15"
                fill="none"
                stroke="#67E8F9"
                strokeWidth="1.4"
                strokeDasharray="5 4"
                opacity="0.82"
              />
            </svg>
          )}
        </div>
      )}

      {/* ======================================================================
           4. COSMO CUBE PULSATING SUPERNOVA AURA & CELESTIAL ORBITS
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'cosmo_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-cosmo-cube"
          className="absolute inset-0 -m-2 pointer-events-none overflow-visible flex items-center justify-center"
        >
          <div
            className="w-full h-full rounded-full animate-cosmo-aura-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(244,114,182,0.42) 0%, rgba(139,92,246,0.26) 52%, transparent 76%)',
            }}
          />
          {(showShadow || isRolling) && (
            <svg
              viewBox="0 0 100 100"
              className={`absolute inset-0 w-full h-full overflow-visible ${
                isRolling ? 'animate-orbit-cw-fast' : 'animate-cosmo-orbit'
              }`}
            >
              <ellipse
                cx="50"
                cy="50"
                rx="46"
                ry="15"
                fill="none"
                stroke="rgba(253, 230, 138, 0.62)"
                strokeWidth={isRolling ? '1.5' : '0.95'}
                strokeDasharray="14 8"
                transform="rotate(-24 50 50)"
              />
              <circle cx="10" cy="64" r="2.0" fill="#FDE68A" />
              <circle cx="90" cy="36" r="1.7" fill="#38BDF8" />
            </svg>
          )}
        </div>
      )}

      {/* ======================================================================
          LANDING IMPACT SHOCKWAVE PER DIE
          ====================================================================== */}
      {isLanding && !reducedMotion && (
        <div
          aria-hidden="true"
          data-testid="dice-landing-impact"
          className="absolute inset-0 -m-2.5 pointer-events-none flex items-center justify-center overflow-visible z-20"
        >
          {diceStyle === 'lava_cube' && (
            <>
              <div
                className="w-full h-full rounded-xl border-2 border-orange-500 animate-dice-impact-ripple"
                style={{
                  boxShadow:
                    '0 0 20px rgba(255, 106, 0, 0.9), inset 0 0 12px rgba(255, 42, 0, 0.75)',
                }}
              />
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full overflow-visible animate-dice-impact-ripple"
              >
                <circle cx="15" cy="15" r="2.2" fill="#FFEE58" />
                <circle cx="85" cy="18" r="2.0" fill="#FF6D00" />
                <circle cx="18" cy="85" r="2.0" fill="#FF6D00" />
                <circle cx="84" cy="84" r="2.2" fill="#FFEE58" />
              </svg>
            </>
          )}

          {diceStyle === 'electro_cube' && (
            <>
              <div
                className="w-full h-full rounded-xl border-2 border-cyan-300 animate-dice-impact-ripple"
                style={{
                  boxShadow:
                    '0 0 22px rgba(0, 240, 255, 0.95), inset 0 0 14px rgba(56, 189, 248, 0.8)',
                }}
              />
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full overflow-visible animate-dice-impact-ripple"
              >
                <polyline points="4,4 -8,-4 -3,-10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                <polyline points="96,4 108,-4 103,-10" fill="none" stroke="#00F0FF" strokeWidth="2" />
                <polyline points="4,96 -8,104 -3,110" fill="none" stroke="#00F0FF" strokeWidth="2" />
                <polyline points="96,96 108,104 103,110" fill="none" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </>
          )}

          {diceStyle === 'tesseract_cube' && (
            <>
              <div
                className="w-full h-full rounded-lg border-2 border-purple-400 animate-dice-impact-ripple"
                style={{
                  boxShadow:
                    '0 0 20px rgba(192, 132, 252, 0.9), inset 0 0 14px rgba(56, 189, 248, 0.8)',
                }}
              />
              <div
                className="absolute inset-1 rounded-lg border border-cyan-300 animate-dice-impact-ripple"
                style={{ transform: 'rotate(45deg) scale(0.9)' }}
              />
            </>
          )}

          {diceStyle === 'cosmo_cube' && (
            <div
              className="w-full h-full rounded-full border-2 border-indigo-300 animate-dice-impact-ripple"
              style={{
                boxShadow:
                  '0 0 20px rgba(192, 132, 252, 0.85), 0 0 28px rgba(56, 189, 248, 0.7)',
              }}
            />
          )}

          {!isPremium2D && (
            <div
              className="w-full h-full rounded-xl border border-white/40 animate-dice-impact-ripple"
              style={{
                boxShadow: `0 0 14px ${styleOpt.coreGlowHex}`,
              }}
            />
          )}
        </div>
      )}

      {/* ======================================================================
          HYPER-REALISTIC 3D RAYCASTED ROUNDED-CUBE RENDERER
          Single solid 3D rounded cube (`sdRoundBox` with 24% corner/edge fillet)
          with 3D bump-mapped surface relief, PBR specular reflections, and
          style-specific pulsating 3D idle & rolling animations
          ====================================================================== */}
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <RoundedCube3DCanvas
          value={safeFace}
          isRolling={isRolling}
          isLanding={isLanding}
          diceStyle={diceStyle}
          activeColor={activeColor}
          size={size}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Interactive Can-Roll Indicator Pip */}
      {interactive && canRoll && !isRolling && (
        <span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 pointer-events-none animate-pulse z-20"
          style={{ backgroundColor: colorMeta.primaryHex }}
        />
      )}
    </div>
  );
};
