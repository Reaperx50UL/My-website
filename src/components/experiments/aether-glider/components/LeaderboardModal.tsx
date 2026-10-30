"use client";

import React, { useState } from 'react';
import {
  ENVIRONMENT_PROFILES,
  EnvironmentId,
  getBirdProfile,
  getEnvironmentProfile,
} from '../game/config';
import {
  HighScoreQualification,
  LeaderboardEntry,
  LeaderboardTabId,
  SubmitHighScoreResult,
  getEnvironmentLeaderboard,
  getGlobalLeaderboard,
} from '../game/leaderboard';
import {
  BirdAvatarSvg,
  EnvironmentIconSvg,
  TrophyIconSvg,
} from './TitleEmblemSvg';

export interface HighScoreNameEntryPanelProps {
  score: number;
  environmentId: EnvironmentId;
  qualification: HighScoreQualification;
  pilotName: string;
  onPilotNameChange: (name: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  validationError: string | null;
  submittedResult: SubmitHighScoreResult | null;
  onOpenLeaderboard: (tab: LeaderboardTabId) => void;
  isCompactHeight?: boolean;
}

export const HighScoreNameEntryPanel: React.FC<HighScoreNameEntryPanelProps> = ({
  score,
  environmentId,
  qualification,
  pilotName,
  onPilotNameChange,
  onSubmit,
  validationError,
  submittedResult,
  onOpenLeaderboard,
  isCompactHeight = false,
}) => {
  const env = getEnvironmentProfile(environmentId);

  if (submittedResult && submittedResult.ok && submittedResult.entry) {
    return (
      <div
        data-testid="highscore-submitted-banner"
        className={`${
          isCompactHeight ? 'mt-2 p-2' : 'mt-3 p-3'
        } rounded-xl text-left`}
        style={{
          backgroundColor: 'rgba(6, 78, 59, 0.35)',
          border: '1.5px solid #34D399',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                High Score Recorded to Hall of Fame
              </span>
            </div>
            <div className="mt-0.5 text-xs sm:text-sm font-bold text-amber-50">
              Pilot{' '}
              <span
                data-testid="submitted-pilot-name"
                className="text-amber-300 font-extrabold"
              >
                {submittedResult.entry.playerName}
              </span>{' '}
              · {submittedResult.entry.score} pts
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {submittedResult.globalRank !== null && (
              <button
                type="button"
                onClick={() => onOpenLeaderboard('global')}
                className="px-2 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold text-amber-200 cursor-pointer hover:bg-amber-900/40"
                style={{
                  backgroundColor: 'rgba(18, 13, 29, 0.85)',
                  border: '1px solid #FBBF24',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                Global #{submittedResult.globalRank}
              </button>
            )}
            {submittedResult.environmentRank !== null && (
              <button
                type="button"
                onClick={() => onOpenLeaderboard(environmentId)}
                className="px-2 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold cursor-pointer hover:bg-slate-800/60"
                style={{
                  backgroundColor: 'rgba(18, 13, 29, 0.85)',
                  border: `1px solid ${env.colors.accentHex}`,
                  color: env.colors.accentHex,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {env.shortName} #{submittedResult.environmentRank}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      data-testid="highscore-entry-panel"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSubmit(e);
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={`${
        isCompactHeight ? 'mt-2 p-2' : 'mt-3 p-3'
      } rounded-xl text-left`}
      style={{
        backgroundColor: '#120D1D',
        border: qualification.qualifies
          ? '2px solid #FBBF24'
          : '1.5px solid rgba(217, 119, 6, 0.55)',
        boxShadow: qualification.qualifies
          ? '0 0 20px rgba(251, 191, 36, 0.2), 0 8px 20px rgba(0, 0, 0, 0.45)'
          : '0 6px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <TrophyIconSvg className="w-4 h-4 shrink-0" />
          <span
            data-testid="highscore-banner-heading"
            className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-300"
          >
            {qualification.qualifies
              ? 'New High Score! Enter Pilot Callsign'
              : 'Record Run on Leaderboard'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {qualification.isNewGlobalPersonalBest && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/50">
              Global Personal Best
            </span>
          )}
          {qualification.isNewEnvironmentPersonalBest && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase"
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.85)',
                color: env.colors.accentHex,
                border: `1px solid ${env.colors.accentHex}`,
              }}
            >
              {env.shortName} Record
            </span>
          )}
          {qualification.projectedEnvironmentRank !== null && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-100/90"
              style={{
                backgroundColor: 'rgba(41, 30, 58, 0.9)',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              Est. {env.shortName} #{qualification.projectedEnvironmentRank}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="highscore-pilot-name-input" className="sr-only">
          Pilot Name for Leaderboard
        </label>
        <input
          id="highscore-pilot-name-input"
          data-testid="highscore-name-input"
          type="text"
          maxLength={18}
          value={pilotName}
          onChange={(e) => onPilotNameChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Enter Pilot Name (e.g. Sky Captain)"
          className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-amber-50 placeholder:text-amber-200/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{
            backgroundColor: '#1E162B',
            border: validationError
              ? '1.5px solid #F43F5E'
              : '1.5px solid rgba(245, 158, 11, 0.5)',
          }}
        />
        <button
          type="submit"
          data-testid="highscore-submit-button"
          className="shrink-0 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold text-amber-950 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          style={{
            fontFamily: '"Bricolage Grotesque", sans-serif',
            backgroundColor: '#FBBF24',
            border: '1.5px solid #FEF3C7',
            boxShadow: '0 2px 0 #92400E',
          }}
        >
          Save Score ({score})
        </button>
      </div>

      {validationError && (
        <p
          data-testid="highscore-name-error"
          role="alert"
          className="mt-1.5 text-[11px] font-bold text-rose-400"
        >
          {validationError}
        </p>
      )}
    </form>
  );
};

export interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: LeaderboardTabId;
  onSelectTab: (tab: LeaderboardTabId) => void;
  entries: LeaderboardEntry[];
  globalBestScore: number;
  envBestScores: Record<EnvironmentId, number>;
  selectedEnvironmentId: EnvironmentId;
  highlightedEntryId?: string | null;
  pilotName: string;
  onPilotNameChange: (name: string) => void;
  onQuickSubmitScore: (targetEnvId: EnvironmentId) => void;
  quickSubmitError: string | null;
  quickSubmitSuccess: string | null;
  isCompactHeight?: boolean;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  entries,
  globalBestScore,
  envBestScores,
  selectedEnvironmentId,
  highlightedEntryId,
  pilotName,
  onPilotNameChange,
  onQuickSubmitScore,
  quickSubmitError,
  quickSubmitSuccess,
  isCompactHeight = false,
}) => {
  const [showCallsignForm, setShowCallsignForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const isGlobal = activeTab === 'global';
  const activeEnvProfile = !isGlobal
    ? getEnvironmentProfile(activeTab as EnvironmentId)
    : getEnvironmentProfile(selectedEnvironmentId);

  const visibleEntries = isGlobal
    ? getGlobalLeaderboard(entries, 10)
    : getEnvironmentLeaderboard(entries, activeTab as EnvironmentId, 10);

  const topChampion = visibleEntries[0] ?? null;
  const personalBestForScope = isGlobal
    ? globalBestScore
    : envBestScores[activeTab as EnvironmentId] ?? 0;

  const targetEnvForQuickRecord: EnvironmentId = isGlobal
    ? selectedEnvironmentId
    : (activeTab as EnvironmentId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
      data-testid="leaderboard-modal"
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(10, 8, 20, 0.84)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl ${
          isCompactHeight ? 'p-3' : 'p-4 sm:p-6'
        } text-left my-auto flex flex-col max-h-[92dvh]`}
        style={{
          backgroundColor: '#1B1429',
          border: `3px solid ${isGlobal ? '#FBBF24' : activeEnvProfile.colors.accentHex}`,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.88)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl shrink-0"
              style={{
                backgroundColor: '#120D1D',
                border: `2px solid ${
                  isGlobal ? '#FBBF24' : activeEnvProfile.colors.accentHex
                }`,
              }}
            >
              <TrophyIconSvg className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-400">
                Aether Glider Hall of Fame
              </div>
              <h2
                id="leaderboard-modal-title"
                data-testid="leaderboard-scope-title"
                className="text-lg sm:text-2xl font-extrabold text-amber-100 leading-tight"
                style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
              >
                {isGlobal
                  ? 'Global Sky Trials Leaderboard'
                  : `${activeEnvProfile.name} Leaderboard`}
              </h2>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-leaderboard-button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-amber-200 hover:bg-amber-900/40 cursor-pointer shrink-0"
            style={{
              backgroundColor: '#120D1D',
              border: '1.5px solid #92400E',
            }}
          >
            Close
          </button>
        </div>

        {/* Scope Switcher Tabs: Global + 5 Environments */}
        <div
          role="tablist"
          aria-label="Leaderboard Scope Tabs"
          className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-1.5 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isGlobal}
            data-testid="leaderboard-tab-global"
            onClick={() => onSelectTab('global')}
            className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl cursor-pointer transition-transform active:scale-95"
            style={{
              backgroundColor: isGlobal ? '#291E3A' : '#120D1D',
              border: isGlobal
                ? '2px solid #FBBF24'
                : '1.5px solid rgba(146, 64, 14, 0.45)',
            }}
          >
            <div className="flex items-center gap-1">
              <TrophyIconSvg className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-extrabold text-amber-100 whitespace-nowrap">
                Global
              </span>
            </div>
            <span className="text-[9px] font-bold text-amber-300/80 whitespace-nowrap">
              All 5 Realms
            </span>
          </button>

          {ENVIRONMENT_PROFILES.map((env) => {
            const isTabSelected = activeTab === env.id;
            return (
              <button
                key={env.id}
                type="button"
                role="tab"
                aria-selected={isTabSelected}
                data-testid={`leaderboard-tab-${env.id}`}
                onClick={() => onSelectTab(env.id)}
                className="flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl cursor-pointer transition-transform active:scale-95 overflow-hidden min-w-0"
                style={{
                  backgroundColor: isTabSelected ? '#291E3A' : '#120D1D',
                  border: isTabSelected
                    ? `2px solid ${env.colors.accentHex}`
                    : '1.5px solid rgba(146, 64, 14, 0.45)',
                }}
              >
                <div className="flex items-center gap-1 max-w-full overflow-hidden">
                  <EnvironmentIconSvg envId={env.id} className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-extrabold text-amber-100 whitespace-nowrap truncate">
                    {env.shortName}
                  </span>
                </div>
                <span
                  className="text-[9px] font-bold whitespace-nowrap truncate max-w-full"
                  style={{ color: env.colors.accentHex }}
                >
                  {env.trapName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scope Telemetry & Personal Best Summary Bar */}
        <div
          className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl p-2.5 shrink-0"
          style={{
            backgroundColor: '#120D1D',
            border: '1.5px solid rgba(217, 119, 6, 0.4)',
          }}
        >
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300/75">
              {isGlobal ? 'Global #1 Ace' : `${activeEnvProfile.shortName} #1 Ace`}
            </div>
            <div className="mt-0.5 text-xs sm:text-sm font-extrabold text-amber-100 truncate">
              {topChampion ? `${topChampion.playerName} (${topChampion.score})` : 'None'}
            </div>
          </div>

          <div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300/75">
              {isGlobal ? 'Your Global Best' : `Your ${activeEnvProfile.shortName} Best`}
            </div>
            <div
              data-testid="leaderboard-scope-personal-best"
              className="mt-0.5 text-sm sm:text-base font-extrabold text-amber-300"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {personalBestForScope} pts
            </div>
          </div>

          <div className="flex flex-col items-end justify-center">
            <button
              type="button"
              data-testid="toggle-register-callsign-button"
              onClick={() => setShowCallsignForm((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold text-amber-950 cursor-pointer transition-transform active:scale-95 whitespace-nowrap"
              style={{
                backgroundColor: '#FBBF24',
                border: '1.5px solid #FEF3C7',
              }}
            >
              {showCallsignForm ? 'Hide Name Entry' : '+ Record Pilot Name'}
            </button>
          </div>
        </div>

        {/* Optional Inline Pilot Callsign & High Score Registration Form */}
        {showCallsignForm && (
          <form
            data-testid="modal-register-score-form"
            onSubmit={(e) => {
              e.preventDefault();
              onQuickSubmitScore(targetEnvForQuickRecord);
            }}
            className="mt-2 rounded-xl p-2.5 shrink-0"
            style={{
              backgroundColor: '#120D1D',
              border: '1.5px solid #FBBF24',
            }}
          >
            <div className="text-[10px] sm:text-xs font-bold text-amber-200">
              Register your pilot name & best run on the{' '}
              <span className="font-extrabold text-amber-300">
                {getEnvironmentProfile(targetEnvForQuickRecord).name}
              </span>{' '}
              & Global Leaderboards:
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                data-testid="modal-pilot-name-input"
                type="text"
                maxLength={18}
                value={pilotName}
                onChange={(e) => onPilotNameChange(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Enter Pilot Callsign (2-18 chars)"
                className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-amber-50 placeholder:text-amber-200/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{
                  backgroundColor: '#1E162B',
                  border: quickSubmitError
                    ? '1.5px solid #F43F5E'
                    : '1.5px solid rgba(245, 158, 11, 0.5)',
                }}
              />
              <button
                type="submit"
                data-testid="modal-pilot-submit-button"
                className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold text-amber-950 cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: '#34D399',
                  border: '1.5px solid #D1FAE5',
                }}
              >
                Post to Board
              </button>
            </div>
            {quickSubmitError && (
              <p
                data-testid="modal-pilot-name-error"
                role="alert"
                className="mt-1 text-[11px] font-bold text-rose-400"
              >
                {quickSubmitError}
              </p>
            )}
            {quickSubmitSuccess && (
              <p
                data-testid="modal-pilot-name-success"
                className="mt-1 text-[11px] font-bold text-emerald-400"
              >
                {quickSubmitSuccess}
              </p>
            )}
          </form>
        )}

        {/* Leaderboard Standings List */}
        <div
          data-testid="leaderboard-entries-list"
          className="mt-2.5 flex-1 overflow-y-auto space-y-1.5 pr-1"
        >
          {visibleEntries.map((entry, idx) => {
            const rank = idx + 1;
            const bird = getBirdProfile(entry.birdId);
            const env = getEnvironmentProfile(entry.environmentId);
            const isHighlighted =
              entry.id === highlightedEntryId || Boolean(entry.isPlayerEntry);

            const rankColors =
              rank === 1
                ? { bg: '#FBBF24', text: '#1C120C', border: '#FEF3C7' }
                : rank === 2
                ? { bg: '#E2E8F0', text: '#0F172A', border: '#F8FAFC' }
                : rank === 3
                ? { bg: '#D97706', text: '#FEF3C7', border: '#FBBF24' }
                : { bg: '#1E162B', text: '#FDE68A', border: '#78350F' };

            return (
              <div
                key={entry.id}
                data-testid={`leaderboard-row-${idx}`}
                data-pilot-name={entry.playerName}
                data-environment={entry.environmentId}
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 sm:px-3.5 py-2 transition-colors"
                style={{
                  backgroundColor: isHighlighted
                    ? 'rgba(41, 30, 58, 0.95)'
                    : 'rgba(18, 13, 29, 0.9)',
                  border:
                    entry.id === highlightedEntryId
                      ? '2px solid #34D399'
                      : entry.isPlayerEntry
                      ? '1.5px solid #FBBF24'
                      : '1px solid rgba(146, 64, 14, 0.38)',
                }}
              >
                {/* Left: Rank + Pilot Name + Bird & Environment Badges */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-extrabold text-xs sm:text-sm shrink-0"
                    style={{
                      backgroundColor: rankColors.bg,
                      color: rankColors.text,
                      border: `1.5px solid ${rankColors.border}`,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    #{rank}
                  </div>

                  <BirdAvatarSvg
                    birdId={entry.birdId}
                    className="w-6 h-6 sm:w-7 sm:h-7 shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-extrabold text-amber-100 truncate">
                        {entry.playerName}
                      </span>
                      {entry.isPlayerEntry && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-200/75 flex-wrap">
                      <span style={{ color: bird.colors.auraHex }}>{bird.name}</span>
                      <span>·</span>
                      <span
                        className="inline-flex items-center gap-1 font-bold"
                        style={{ color: env.colors.accentHex }}
                      >
                        <EnvironmentIconSvg envId={env.id} className="w-3 h-3 shrink-0" />
                        {env.shortName}
                      </span>
                      {entry.maxCombo > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-300/90">
                            {entry.maxCombo}x Streak ({entry.peakComboMultiplier}x)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score */}
                <div className="text-right shrink-0">
                  <div
                    data-testid={`leaderboard-score-${idx}`}
                    className="text-base sm:text-xl font-extrabold text-amber-300 leading-none"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.score}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-200/60 mt-0.5">
                    Points
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
