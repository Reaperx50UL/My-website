import React from 'react';
import { BirdId, EnvironmentId, getBirdProfile, getEnvironmentProfile } from '../game/config';
import { MedalTier } from '../game/types';

export const TitleEmblemSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 460 128"
    className={`w-full max-w-[390px] select-none ${className}`}
    role="img"
    aria-label="Aether Glider crest emblem"
  >
    <defs>
      <linearGradient id="agBrassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="48%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
      <linearGradient id="agWingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B45309" />
        <stop offset="50%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>

    {/* Left & Right Mechanical Wings */}
    <path
      d="M88 46 L18 24 L36 44 L12 54 L46 64 L28 76 L92 68 Z"
      fill="url(#agWingGrad)"
      stroke="#1C120C"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M372 46 L442 24 L424 44 L448 54 L414 64 L432 76 L368 68 Z"
      fill="url(#agWingGrad)"
      stroke="#1C120C"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* Central Brass Plaque Shield */}
    <rect
      x="68"
      y="22"
      width="324"
      height="74"
      rx="14"
      fill="#1E162B"
      stroke="url(#agBrassGrad)"
      strokeWidth="3.5"
    />
    <rect
      x="75"
      y="29"
      width="310"
      height="60"
      rx="10"
      fill="none"
      stroke="rgba(253, 230, 138, 0.25)"
      strokeWidth="1.2"
    />

    {/* Top Crown Compass Gem */}
    <circle cx="230" cy="22" r="12" fill="#1E162B" stroke="url(#agBrassGrad)" strokeWidth="3" />
    <circle cx="230" cy="22" r="5.5" fill="#38BDF8" />

    {/* Main Display Title Lockup */}
    <text
      x="230"
      y="64"
      textAnchor="middle"
      fill="url(#agBrassGrad)"
      stroke="#120B1D"
      strokeWidth="5"
      style={{
        paintOrder: 'stroke fill',
        fontFamily: '"Bricolage Grotesque", sans-serif',
        fontWeight: 800,
        fontSize: '33px',
        letterSpacing: '0.06em',
      }}
    >
      AETHER GLIDER
    </text>

    {/* Subtitle inscription */}
    <text
      x="230"
      y="83"
      textAnchor="middle"
      fill="#FDE68A"
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 600,
        fontSize: '10px',
        letterSpacing: '0.24em',
      }}
    >
      CLOCKWORK SKY TRIALS
    </text>
  </svg>
);

export const BirdAvatarSvg: React.FC<{ birdId: BirdId; className?: string }> = ({
  birdId,
  className = 'w-8 h-8',
}) => {
  const bird = getBirdProfile(birdId);
  return (
    <svg viewBox="0 0 36 36" className={`shrink-0 ${className}`} aria-hidden="true">
      <path
        d="M10 18 L3 14 L5 21 Z"
        fill={bird.colors.tail}
        stroke="#140D0B"
        strokeWidth="1.8"
      />
      <ellipse
        cx="18"
        cy="18"
        rx="10"
        ry="8"
        fill={bird.colors.bodyMid}
        stroke="#140D0B"
        strokeWidth="2"
      />
      <path
        d={
          birdId === 'chronos'
            ? 'M26 16 L35 18 L26 20 Z'
            : 'M26 15.5 L32.5 18.2 L26 20.8 Z'
        }
        fill={bird.colors.beak}
        stroke="#140D0B"
        strokeWidth="1.6"
      />
      <circle cx="22" cy="16" r="3.2" fill="#140D0B" />
      <circle cx="22" cy="16" r="2" fill={bird.colors.eye} />
      <path
        d="M19 19 Q13 11 9 16 Q13 23 19 19 Z"
        fill={bird.colors.wing}
        stroke="#140D0B"
        strokeWidth="1.8"
      />
    </svg>
  );
};

export const EnvironmentIconSvg: React.FC<{
  envId: EnvironmentId;
  className?: string;
}> = ({ envId, className = 'w-5 h-5' }) => {
  const env = getEnvironmentProfile(envId);
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
      {envId === 'clockwork' && (
        <>
          <circle
            cx="12"
            cy="12"
            r="7"
            fill="#78350F"
            stroke={env.colors.accentHex}
            strokeWidth="2.2"
          />
          <circle cx="12" cy="12" r="2.5" fill="#FEF3C7" />
        </>
      )}
      {envId === 'bamboo' && (
        <>
          <rect
            x="9"
            y="3"
            width="6"
            height="18"
            rx="2"
            fill="#2D6A4F"
            stroke={env.colors.accentHex}
            strokeWidth="2"
          />
          <line x1="8" y1="9" x2="16" y2="9" stroke="#D8F3DC" strokeWidth="2" />
          <line x1="8" y1="15" x2="16" y2="15" stroke="#D8F3DC" strokeWidth="2" />
        </>
      )}
      {envId === 'volcano' && (
        <path
          d="M3 20 L9 7 L12 10 L15 7 L21 20 Z"
          fill="#991B1B"
          stroke={env.colors.accentHex}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {envId === 'ice' && (
        <polygon
          points="12,2 16,9 21,12 16,15 12,22 8,15 3,12 8,9"
          fill="#0284C7"
          stroke="#E0F2FE"
          strokeWidth="1.8"
        />
      )}
      {envId === 'cyber' && (
        <>
          <rect
            x="4"
            y="6"
            width="6"
            height="15"
            fill="#1E293B"
            stroke="#22D3EE"
            strokeWidth="1.8"
          />
          <rect
            x="13"
            y="3"
            width="7"
            height="18"
            fill="#1E293B"
            stroke="#F43F5E"
            strokeWidth="1.8"
          />
        </>
      )}
    </svg>
  );
};

export const AbilityIconSvg: React.FC<{ birdId: BirdId; className?: string }> = ({
  birdId,
  className = 'w-5 h-5',
}) => {
  const bird = getBirdProfile(birdId);
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
      {birdId === 'kora' && (
        <path
          d="M12 2L4 5.5v6c0 5.25 3.4 10.15 8 11.5 4.6-1.35 8-6.25 8-11.5v-6L12 2z"
          fill={bird.colors.auraHex}
          stroke="#140D0B"
          strokeWidth="2"
        />
      )}
      {birdId === 'zephyr' && (
        <path
          d="M13 2L4 14h7l-1 8 10-12h-7l0-8z"
          fill={bird.colors.auraHex}
          stroke="#140D0B"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {birdId === 'ignis' && (
        <circle
          cx="12"
          cy="12"
          r="8"
          fill={bird.colors.auraHex}
          stroke="#FEF08A"
          strokeWidth="2.5"
        />
      )}
      {birdId === 'chronos' && (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="#064E3B"
            stroke={bird.colors.auraHex}
            strokeWidth="2.2"
          />
          <path
            d="M12 7v5l3.5 2"
            fill="none"
            stroke="#FEF3C7"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
};

export const SoundIconSvg: React.FC<{ muted: boolean }> = ({ muted }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M11 5L6 9H2v6h4l5 4V5z"
      fill="#FDE68A"
      stroke="#1C120C"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {muted ? (
      <path
        d="M22 9l-6 6M16 9l6 6"
        stroke="#F87171"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    ) : (
      <>
        <path
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M19.07 4.93a10 10 0 0 1 0 14.14"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

export const PauseIconSvg: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <rect
      x="6"
      y="4"
      width="4.5"
      height="16"
      rx="1.5"
      fill="#FDE68A"
      stroke="#1C120C"
      strokeWidth="2"
    />
    <rect
      x="13.5"
      y="4"
      width="4.5"
      height="16"
      rx="1.5"
      fill="#FDE68A"
      stroke="#1C120C"
      strokeWidth="2"
    />
  </svg>
);

export const RestartIconSvg: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M3 12a9 9 0 1 0 3-6.7L3 8"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 3v5h5"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TuningIconSvg: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="3.5"
      fill="#38BDF8"
      stroke="#1C120C"
      strokeWidth="2"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="1.9"
    />
  </svg>
);

export const MedalBadgeSvg: React.FC<{ medal: MedalTier }> = ({ medal }) => {
  const palette: Record<
    MedalTier,
    { outer: string; inner: string; gem: string; label: string }
  > = {
    none: {
      outer: '#475569',
      inner: '#1E293B',
      gem: '#64748B',
      label: 'Cadet Wings',
    },
    bronze: {
      outer: '#D97706',
      inner: '#78350F',
      gem: '#FBBF24',
      label: 'Bronze Navigator',
    },
    silver: {
      outer: '#E2E8F0',
      inner: '#475569',
      gem: '#38BDF8',
      label: 'Silver Aeronaut',
    },
    gold: {
      outer: '#FDE047',
      inner: '#B45309',
      gem: '#34D399',
      label: 'Gold Skycaptain',
    },
    aether: {
      outer: '#67E8F9',
      inner: '#312E81',
      gem: '#F472B6',
      label: 'Aether Sovereign',
    },
  };

  const c = palette[medal];
  return (
    <div className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0" aria-hidden="true">
        <circle
          cx="18"
          cy="18"
          r="15"
          fill={c.inner}
          stroke={c.outer}
          strokeWidth="3"
        />
        <polygon
          points="18,7 21,14 28,14 22.5,18.5 24.5,26 18,21.5 11.5,26 13.5,18.5 8,14 15,14"
          fill={c.gem}
          stroke="#0F172A"
          strokeWidth="1.2"
        />
      </svg>
      <span className="text-sm font-semibold text-amber-100">{c.label}</span>
    </div>
  );
};

export const TrophyIconSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M6 4h12v5a6 6 0 0 1-12 0V4z"
      fill="#FBBF24"
      stroke="#1C120C"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M6 6H3.5a2 2 0 0 0 0 4c.8 0 1.8.8 2.5 2M18 6h2.5a2 2 0 0 1 0 4c-.8 0-1.8.8-2.5 2"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 15v4M8 20h8"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="8.5" r="1.8" fill="#FEF3C7" />
  </svg>
);

