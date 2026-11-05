import {
  HelpCircle,
  LogOut,
  Palette,
  Pause,
  RotateCcw,
  ScrollText,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { getThemeTileSpec } from '../../game/boardLayout';
import {
  AVATAR_OPTIONS,
  COLOR_META,
  FINISH_STEP,
  getBoardThemeOption,
} from '../../game/constants';
import { AppSettings, GameState, PlayerColor } from '../../game/gameTypes';
import {
  canBreakPairAtPosition,
  getFormablePairOptionsForPlayer,
} from '../../game/legalMoves';
import { DiceRoller } from '../Dice/DiceRoller';

interface GameHUDProps {
  gameState: GameState;
  settings: AppSettings;
  isRolling: boolean;
  isAnimatingMove: boolean;
  localAssignedColor?: PlayerColor | null;
  onRollDice: () => void;
  onSelectToken: (tokenId: string) => void;
  onBreakPair?: (pairId: string) => void;
  onFormYardPair?: (tokenAId?: string, tokenBId?: string) => void;
  onToggleSound: () => void;
  onCycleDiceStyle?: () => void;
  onCycleBoardTheme?: () => void;
  onOpenRules: () => void;
  onPause: () => void;
  onRestart: () => void;
  onRequestExit: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  settings,
  isRolling,
  isAnimatingMove,
  localAssignedColor,
  onRollDice,
  onSelectToken,
  onBreakPair,
  onFormYardPair,
  onToggleSound,
  onCycleDiceStyle,
  onCycleBoardTheme,
  onOpenRules,
  onPause,
  onRestart,
  onRequestExit,
}) => {
  const [showMobileLog, setShowMobileLog] = useState(false);

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const activeBoardTheme = getBoardThemeOption(settings.boardTheme);
  const isOnline =
    gameState.mode === 'friends' || gameState.mode === 'matchmaking';

  const isLocalPlayersTurn = isOnline
    ? localAssignedColor === activePlayer.color
    : activePlayer.type === 'human';

  const canRoll =
    gameState.turnPhase === 'WAITING_FOR_ROLL' &&
    isLocalPlayersTurn &&
    !isRolling &&
    !isAnimatingMove;

  // Manual Pair Formation ON/OFF Switch: available whenever two unpaired same-color tokens share any board square (0..55, outside Home Yard -1),
  // regardless of dice roll (1..6 or before rolling), supporting all 2-token combinations when >2 same-color tokens share a square.
  const pairableGroups = (() => {
    if (
      !isLocalPlayersTurn ||
      !onFormYardPair ||
      (gameState.turnPhase !== 'SELECTING_TOKEN' &&
        gameState.turnPhase !== 'WAITING_FOR_ROLL') ||
      isRolling ||
      isAnimatingMove
    ) {
      return [];
    }
    const options = getFormablePairOptionsForPlayer(
      activePlayer.color,
      gameState.diceValue,
      gameState.players,
      gameState.pairs || [],
      gameState.brokenPairTokenIdsThisRoll || []
    );
    return options.map((opt) => {
      const locLabel =
        opt.steps === 0
          ? 'Start Point'
          : opt.steps >= 51
          ? `Home Stretch ${opt.steps - 50}`
          : `Step ${opt.steps}`;
      return {
        steps: opt.steps,
        tokenAId: opt.tokenIds[0],
        tokenBId: opt.tokenIds[1],
        label: `FORM PAIR #${opt.tokenIndices[0] + 1} & #${opt.tokenIndices[1] + 1} (${locLabel})`,
      };
    });
  })();

  const canFormYardPair = pairableGroups.length > 0;

  // Voluntary Pair Breaking: allowed at ANY board location (0..55) during the player's turn
  const breakablePairs =
    isLocalPlayersTurn &&
    !isRolling &&
    !isAnimatingMove &&
    (gameState.turnPhase === 'WAITING_FOR_ROLL' ||
      gameState.turnPhase === 'SELECTING_TOKEN')
      ? (gameState.pairs || []).filter(
          (p) =>
            p.color === activePlayer.color &&
            canBreakPairAtPosition(p, gameState.rules)
        )
      : [];

  const getAvatarEmoji = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.icon || '👑';
  };

  const latestEvent = gameState.eventLog[0];

  return (
    <aside
      aria-label="Game Controls and Player Status"
      className="relative flex flex-col justify-between gap-2 sm:gap-2.5 lg:gap-3 w-full landscape:w-[330px] md:landscape:w-[360px] lg:w-[385px] lg:landscape:w-[385px] xl:w-[405px] xl:landscape:w-[405px] shrink-0 bg-[#111827] border border-slate-800/90 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 lg:p-4 shadow-2xl"
    >
      {/* Top Bar: Turn Counter & Quick Utility Controls */}
      <div className="flex items-center justify-between gap-1.5 pb-1.5 sm:pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className="text-xs font-mono-tabular font-semibold text-slate-200 whitespace-nowrap shrink-0">
            Turn {Math.round(gameState.turnNumber)}
          </span>
          {gameState.consecutiveSixes > 0 && (
            <span
              data-testid="hud-consecutive-sixes-badge"
              title="Three consecutive sixes will cancel all moves in this sequence!"
              className="text-[10px] font-mono-tabular font-bold text-amber-300 bg-amber-500/15 border border-amber-400/40 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0"
            >
              6×{gameState.consecutiveSixes}/3
            </span>
          )}
          {gameState.roomCode && (
            <>
              <span aria-hidden="true" className="text-slate-600 shrink-0">
                ·
              </span>
              <span
                title={`Online Room ${gameState.roomCode}`}
                className="text-[11px] font-mono-tabular font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0"
              >
                #{gameState.roomCode}
              </span>
            </>
          )}
        </div>

        {/* Utility Icon Buttons (Board Theme [B], Mute [M], Rules [H], Log [L], Restart [R], Pause [P], Exit) */}
        <div className="flex items-center gap-1 shrink-0">
          {onCycleBoardTheme && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleBoardTheme();
              }}
              aria-label={`Switch Board & Token Theme (Current: ${activeBoardTheme.label})`}
              title={`Board: ${activeBoardTheme.label} · Token: ${activeBoardTheme.tokenStyleLabel} (Click to switch)`}
              className={`${
                isOnline ? 'w-7 h-7 justify-center' : 'h-8 px-2'
              } rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-amber-300 flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              {!isOnline && (
                <span className="hidden xl:inline max-w-[78px] truncate">
                  {activeBoardTheme.label}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={settings.soundEnabled ? 'Mute Audio [M]' : 'Unmute Audio [M]'}
            title={settings.soundEnabled ? 'Mute Audio [M]' : 'Unmute Audio [M]'}
            className={`${
              isOnline ? 'w-7 h-7' : 'w-8 h-8'
            } rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer`}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setShowMobileLog((v) => !v);
            }}
            aria-label="Toggle Match Chronicle Log"
            title="Match Chronicle Log"
            className={`lg:hidden ${
              isOnline ? 'w-7 h-7' : 'w-8 h-8'
            } rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer`}
          >
            <ScrollText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenRules();
            }}
            aria-label="Game Rules [H]"
            title="Game Rules [H]"
            className={`${
              isOnline ? 'w-7 h-7' : 'w-8 h-8'
            } rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {!isOnline && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Restart Match [R]"
              title="Restart Match [R]"
              className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause Game [P]"
            title="Pause Game [P]"
            className={`${
              isOnline ? 'w-7 h-7' : 'w-8 h-8'
            } rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer`}
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          {isOnline ? (
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-leave-room-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onRequestExit();
              }}
              aria-label="Leave Room"
              title="Leave Online Room"
              className="h-7 px-2.5 rounded-lg bg-rose-950/85 hover:bg-rose-900 border border-rose-500/50 text-rose-200 flex items-center gap-1 text-[11px] font-display font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              <span>Leave Room</span>
            </button>
          ) : (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRequestExit();
              }}
              aria-label="Exit Match"
              title="Exit Match"
              className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Player Roster Cards:
          - 4 columns in a single compact row on Tablet Portrait (sm:grid-cols-4)
          - 2x2 grid on Mobile Portrait (grid-cols-2), Mobile Landscape (landscape:grid-cols-2), and Desktop (lg:grid-cols-2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 landscape:grid-cols-2 lg:grid-cols-2 gap-1.5 sm:gap-2">
        {gameState.players.map((player, idx) => {
          const isTurn = idx === gameState.activePlayerIndex;
          const meta = COLOR_META[player.color];
          const inYard = player.tokens.filter((t) => t.steps === -1).length;
          const onBoard = player.tokens.filter(
            (t) => t.steps >= 0 && t.steps < FINISH_STEP
          ).length;
          const inHome = player.tokens.filter(
            (t) => t.steps === FINISH_STEP
          ).length;

          const rawTitle =
            getThemeTileSpec(settings.boardTheme).territoryTitles[
              player.color
            ] || 'Ruby Reactor';
          const territoryLabel = rawTitle
            .toLowerCase()
            .replace(/\b\w/g, (ch) => ch.toUpperCase());

          return (
            <div
              key={player.color}
              data-testid={`hud-player-card-${player.color}`}
              className={`flex flex-col justify-between p-1.5 sm:p-2 lg:p-2.5 rounded-xl border transition-all ${
                isTurn
                  ? 'bg-slate-800/95 border-slate-500 shadow-lg'
                  : 'bg-slate-900/75 border-slate-800/90 opacity-88'
              }`}
              style={
                isTurn
                  ? {
                      borderColor: meta.primaryHex,
                      background:
                        'linear-gradient(145deg, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
                      boxShadow: `0 6px 20px -6px ${meta.glowHex}, inset 0 1px 1px rgba(255,255,255,0.14)`,
                    }
                  : {
                      background:
                        'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 13, 24, 0.92) 100%)',
                    }
              }
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-5 h-5 lg:w-6 lg:h-6 rounded-md flex items-center justify-center text-[11px] lg:text-xs shrink-0 shadow-inner"
                    style={{
                      backgroundColor: meta.darkHex,
                      border: `1px solid ${meta.lightHex}`,
                    }}
                  >
                    {getAvatarEmoji(player.avatar)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="block text-[11px] lg:text-xs font-bold text-slate-100 truncate">
                        {player.name}
                      </span>
                      {player.replacedByBot ? (
                        <span
                          data-testid={`bot-badge-${player.color}`}
                          title={`${player.originalHumanName || player.name} left — AI Bot is now controlling this seat`}
                          className="px-1.5 py-0.2 rounded bg-amber-500/25 border border-amber-400/60 text-[8px] font-extrabold uppercase tracking-wider text-amber-200 shrink-0"
                        >
                          BOT
                        </span>
                      ) : (
                        player.type === 'ai' && (
                          <span
                            data-testid={`bot-badge-${player.color}`}
                            className="px-1 py-0.2 rounded bg-indigo-500/25 border border-indigo-400/40 text-[8px] font-bold uppercase tracking-wider text-indigo-200 shrink-0"
                          >
                            AI
                          </span>
                        )
                      )}
                    </div>
                    <span className="hidden lg:block text-[10px] text-slate-400 truncate">
                      {meta.symbol} {territoryLabel}
                      {player.replacedByBot
                        ? ' · AI Bot Takeover'
                        : player.type === 'ai'
                        ? ` · ${player.aiDifficulty || 'medium'}`
                        : ''}
                    </span>
                  </div>
                </div>

                {(() => {
                  const rankIndex = gameState.rankings.indexOf(player.color);
                  const rank =
                    player.finishRank ||
                    (rankIndex !== -1 ? rankIndex + 1 : undefined);
                  if (rank) {
                    const rankText =
                      rank === 1
                        ? '🥇 1st'
                        : rank === 2
                        ? '🥈 2nd'
                        : rank === 3
                        ? '🥉 3rd'
                        : `${rank}th`;
                    return (
                      <span className="text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 shrink-0">
                        {rankText}
                      </span>
                    );
                  }
                  if (isTurn) {
                    return (
                      <span
                        className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-slate-950 shrink-0"
                        style={{ backgroundColor: meta.primaryHex }}
                      >
                        Turn
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Token Pips & Tabular Readout */}
              <div className="flex items-center justify-between text-[9px] lg:text-[10px] tracking-tight text-slate-400 pt-1 border-t border-slate-800/80 font-mono-tabular">
                <span className="whitespace-nowrap">Yard:{inYard}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="whitespace-nowrap">Track:{onBoard}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="font-bold text-slate-200 whitespace-nowrap">
                  Home:{inHome}/4
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dice Roller & Active Turn Action Box */}
      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800">
        <DiceRoller
          value={gameState.diceValue}
          isRolling={isRolling}
          canRoll={canRoll}
          activeColor={activePlayer.color}
          activePlayerName={activePlayer.name}
          isAI={activePlayer.type === 'ai'}
          reducedMotion={settings.reducedMotion}
          hasLegalMoves={gameState.legalMoves.length > 0}
          turnPhase={gameState.turnPhase}
          diceStyle={settings.diceStyle}
          onCycleDiceStyle={onCycleDiceStyle}
          onRoll={onRollDice}
        />

        {/* Quick Playable Token & Pair Switch Actions */}
        {(canFormYardPair ||
          (breakablePairs.length > 0 && Boolean(onBreakPair)) ||
          (gameState.turnPhase === 'SELECTING_TOKEN' &&
            isLocalPlayersTurn &&
            gameState.legalMoves.length > 0)) && (
          <div
            className="mt-2 pt-2 border-t border-slate-800 space-y-1.5"
            data-testid="hud-quick-moves"
          >
            {/* Token Pair ON/OFF Switch Controls (Form Pair & Break Pair stay in the same top slot) */}
            {((canFormYardPair && Boolean(onFormYardPair)) ||
              (isLocalPlayersTurn &&
                breakablePairs.length > 0 &&
                Boolean(onBreakPair))) && (
              <div
                className="grid grid-cols-1 gap-1"
                data-testid="hud-pair-switch-group"
              >
                {canFormYardPair &&
                  onFormYardPair &&
                  pairableGroups.map((grp, idx) => (
                    <button
                      key={`form-${grp.tokenAId}-${grp.tokenBId}`}
                      type="button"
                      onClick={() => onFormYardPair(grp.tokenAId, grp.tokenBId)}
                      data-testid={
                        idx === 0
                          ? 'hud-pair-yard-btn'
                          : `hud-pair-step-${grp.steps}-${grp.tokenAId}-${grp.tokenBId}`
                      }
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-xs font-display font-bold text-amber-200 transition-colors cursor-pointer"
                    >
                      <span className="truncate">🔗 {grp.label}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/40 text-[10px] font-mono-tabular uppercase tracking-wider text-amber-100 shrink-0">
                        OFF → ON
                      </span>
                    </button>
                  ))}

                {isLocalPlayersTurn &&
                  breakablePairs.length > 0 &&
                  onBreakPair &&
                  breakablePairs.map((pair) => {
                    const nums = pair.tokenIds
                      .map((tid) => {
                        const tok = activePlayer.tokens.find(
                          (t) => t.id === tid
                        );
                        return tok ? `#${tok.index + 1}` : '';
                      })
                      .filter(Boolean)
                      .join(' & ');
                    const locLabel =
                      pair.steps === 0
                        ? 'Start Point'
                        : pair.steps >= 51
                        ? `Home Stretch ${pair.steps - 50}`
                        : `Step ${pair.steps}`;
                    return (
                      <button
                        key={`break-${pair.id}`}
                        type="button"
                        onClick={() => onBreakPair(pair.id)}
                        data-testid={`hud-break-pair-${pair.id}`}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-xs font-display font-bold text-sky-200 transition-colors cursor-pointer"
                      >
                        <span className="truncate">
                          ⛓️‍💥 BREAK PAIR {nums} ({locLabel})
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-400/25 border border-sky-300/50 text-[10px] font-mono-tabular uppercase tracking-wider text-sky-100 shrink-0">
                          ON → OFF
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}

            {gameState.turnPhase === 'SELECTING_TOKEN' &&
              isLocalPlayersTurn &&
              gameState.legalMoves.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {gameState.legalMoves.map((move) => {
                    const tokenNumber = move.tokenIndex + 1;
                    const isPair = Boolean(move.isPairMove);
                    const stepDelta =
                      move.moveDistance || move.toSteps - move.fromSteps;
                    const actionText = isPair
                      ? move.fromSteps === -1
                        ? 'Move Pair (Deploy)'
                        : move.capturesTokenIds.length > 0
                        ? '⚔ Move Pair (Capture!)'
                        : `Move Pair (+${stepDelta})`
                      : move.fromSteps === -1
                      ? '→ Start'
                      : move.reachesHome
                      ? '👑 Finish!'
                      : move.capturesTokenIds.length > 0
                      ? '⚔ Capture!'
                      : `→ +${stepDelta} steps`;

                    return (
                      <button
                        key={move.tokenId}
                        type="button"
                        onClick={() => onSelectToken(move.tokenId)}
                        data-testid={`quick-move-${move.tokenId}`}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800/95 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/60 text-xs font-semibold text-slate-100 transition-colors text-left truncate cursor-pointer"
                      >
                        <span
                          className="inline-flex items-center justify-center px-1.5 h-5 rounded-md text-[11px] font-black text-white shrink-0 border border-white/40 font-mono-tabular shadow-sm"
                          style={{
                            backgroundColor:
                              COLOR_META[activePlayer.color].primaryHex,
                          }}
                        >
                          {isPair ? `2×#${tokenNumber}` : `#${tokenNumber}`}
                        </span>
                        <span className="truncate font-mono-tabular">
                          {actionText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Mobile / Tablet 1-Line Live Event Ticker (Saves vertical space so page never scrolls) */}
      {latestEvent && (
        <div
          onClick={() => setShowMobileLog(true)}
          className="lg:hidden flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/75 border border-slate-800/80 text-xs cursor-pointer"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span
              className="font-bold shrink-0"
              style={{ color: COLOR_META[latestEvent.playerColor].primaryHex }}
            >
              {COLOR_META[latestEvent.playerColor].symbol}
            </span>
            <span className="text-slate-300 truncate">
              {latestEvent.message}
            </span>
          </div>
          <span className="text-[10px] font-mono-tabular text-slate-400 shrink-0">
            Log ({gameState.eventLog.length})
          </span>
        </div>
      )}

      {/* Desktop Persistent Match Chronicle & Mobile Expandable Drawer */}
      <div
        className={`${
          showMobileLog
            ? 'fixed inset-x-3 bottom-3 z-50 max-h-[55dvh] shadow-2xl bg-[#0F172A] border-slate-700'
            : 'hidden lg:flex min-h-[100px] max-h-[150px] bg-slate-900/70 border-slate-800/80'
        } flex-col flex-1 border rounded-2xl p-3 overflow-hidden`}
      >
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
          <span>Match Chronicle</span>
          <div className="flex items-center gap-2">
            <span className="font-mono-tabular text-[11px] text-slate-500">
              {gameState.eventLog.length} events
            </span>
            {showMobileLog && (
              <button
                type="button"
                onClick={() => setShowMobileLog(false)}
                aria-label="Close Match Chronicle"
                className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs"
          aria-live="polite"
        >
          {gameState.eventLog.slice(0, 12).map((evt) => {
            const meta = COLOR_META[evt.playerColor];
            return (
              <div
                key={evt.id}
                className="flex items-start gap-1.5 text-slate-300 leading-snug"
              >
                <span
                  className="font-bold shrink-0"
                  style={{ color: meta.primaryHex }}
                >
                  {meta.symbol}
                </span>
                <span className="break-words">{evt.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
