import {
  AlertCircle,
  Award,
  Bot,
  Check,
  Clock,
  Copy,
  Crown,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Signal,
  Sparkles,
  Trophy,
  Unlock,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  ACHIEVEMENTS_LIST,
  AVATAR_OPTIONS,
  BOARD_THEME_OPTIONS,
  COLOR_META,
  DICE_STYLE_OPTIONS,
  getBoardThemeOption,
} from '../../game/constants';
import { BoardThemePreviewSVG } from '../Board/LudoBoard';
import { DiceFaceSVG, ThreeDimensionalDie } from '../Dice/DiceRoller';
import {
  calculatePlayerLevel,
  getAvatarUnlockProgress,
  isAvatarUnlocked,
} from '../../game/progression';
import {
  AIDifficulty,
  AppSettings,
  BoardTheme,
  DiceStyle,
  GameState,
  HapticIntensity,
  HouseRules,
  PlayerColor,
  PlayerConfig,
  PlayerStats,
  PlayerType,
  UserProfile,
} from '../../game/gameTypes';
import {
  buildSetupPlayerRoster,
  describeActiveRules,
  getColorsForPlayerCount,
  getDefaultSeatName,
} from '../../game/rules';
import { BackendStatusInfo, OnlineRoomInfo } from '../../services/multiplayer';
import { soundManager } from '../../services/sound';

/* ============================================================================
   1. GAME SETUP MODAL (Play vs AI & Local Pass-and-Play)
   ============================================================================ */
interface SetupModalProps {
  mode: 'ai' | 'local';
  profile: UserProfile;
  initialRules: HouseRules;
  boardTheme?: BoardTheme;
  onSelectBoardTheme?: (theme: BoardTheme) => void;
  onStartMatch: (players: PlayerConfig[], rules: HouseRules) => void;
  onClose: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  mode,
  profile,
  initialRules,
  boardTheme,
  onSelectBoardTheme,
  onStartMatch,
  onClose,
}) => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [rules, setRules] = useState<HouseRules>(initialRules);
  const [seatTypes, setSeatTypes] = useState<Record<PlayerColor, PlayerType>>({
    red: 'human',
    green: mode === 'ai' ? 'ai' : 'human',
    yellow: mode === 'ai' ? 'ai' : 'human',
    blue: mode === 'ai' ? 'ai' : 'human',
  });
  const [botDifficulties, setBotDifficulties] = useState<
    Record<PlayerColor, AIDifficulty>
  >({
    red: 'medium',
    green: 'medium',
    yellow: 'medium',
    blue: 'medium',
  });
  const [customNames, setCustomNames] = useState<Record<PlayerColor, string>>({
    red: profile.nickname || 'Player 1',
    green: mode === 'ai' ? 'Emerald Bot' : 'Player 2',
    yellow: mode === 'ai' ? 'Solar Bot' : 'Player 3',
    blue: mode === 'ai' ? 'Sapphire Bot' : 'Player 4',
  });

  const activeColors = getColorsForPlayerCount(playerCount);
  const ruleDescriptions = describeActiveRules(rules);

  const botCount = activeColors.filter(
    (c, idx) => idx > 0 && seatTypes[c] === 'ai'
  ).length;
  const humanCount = activeColors.length - botCount;
  const canAddMoreBots =
    activeColors.some((c, idx) => idx > 0 && seatTypes[c] === 'human') ||
    playerCount < 4;

  const handleToggleSeatType = (color: PlayerColor, idx: number) => {
    if (idx === 0) return; // Host seat 0 remains human
    const currentType = seatTypes[color];
    const nextType: PlayerType = currentType === 'human' ? 'ai' : 'human';
    const prevDefault = getDefaultSeatName(
      color,
      idx,
      currentType,
      profile.nickname
    );
    const nextDefault = getDefaultSeatName(
      color,
      idx,
      nextType,
      profile.nickname
    );

    setSeatTypes((prev) => ({ ...prev, [color]: nextType }));
    setCustomNames((prev) => {
      const currentName = prev[color]?.trim();
      const isDefaultPlayerName = /^Player \d+$/.test(currentName || '');
      const isDefaultBotName = /Bot$/i.test(currentName || '');
      if (
        !currentName ||
        currentName === prevDefault ||
        (nextType === 'ai' && isDefaultPlayerName) ||
        (nextType === 'human' && isDefaultBotName)
      ) {
        return { ...prev, [color]: nextDefault };
      }
      return prev;
    });
  };

  const handleAddAiBot = () => {
    // 1. If any currently active non-host seat is Human, convert the first available Human seat to an AI Bot
    const targetHumanIdx = activeColors.findIndex(
      (c, idx) => idx > 0 && seatTypes[c] === 'human'
    );
    if (targetHumanIdx !== -1) {
      const targetColor = activeColors[targetHumanIdx];
      handleToggleSeatType(targetColor, targetHumanIdx);
      return;
    }

    // 2. Otherwise, if playerCount < 4, expand playerCount by 1 and set the new seat to AI Bot
    if (playerCount < 4) {
      const nextCount = (playerCount + 1) as 3 | 4;
      const nextColors = getColorsForPlayerCount(nextCount);
      const addedColor = nextColors.find((c) => !activeColors.includes(c));
      setPlayerCount(nextCount);
      if (addedColor) {
        const addedIdx = nextColors.indexOf(addedColor);
        setSeatTypes((prev) => ({ ...prev, [addedColor]: 'ai' }));
        setCustomNames((prev) => ({
          ...prev,
          [addedColor]: getDefaultSeatName(
            addedColor,
            addedIdx,
            'ai',
            profile.nickname
          ),
        }));
      }
    }
  };

  const handleResetAllHuman = () => {
    setSeatTypes({
      red: 'human',
      green: 'human',
      yellow: 'human',
      blue: 'human',
    });
    setCustomNames((prev) => {
      const updated = { ...prev };
      (['green', 'yellow', 'blue'] as PlayerColor[]).forEach((color, i) => {
        if (/Bot$/i.test(updated[color] || '')) {
          updated[color] = `Player ${i + 2}`;
        }
      });
      return updated;
    });
  };

  const handleSelectGlobalDifficulty = (tier: AIDifficulty) => {
    setAiDifficulty(tier);
    setBotDifficulties({
      red: tier,
      green: tier,
      yellow: tier,
      blue: tier,
    });
  };

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const players = buildSetupPlayerRoster({
      playerCount,
      seatTypes,
      botDifficulties,
      customNames,
      profile,
    });

    onStartMatch(players, rules);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
    >
      <form
        onSubmit={handleLaunch}
        className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-3xl p-6 md:p-7 shadow-2xl my-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2
              id="setup-modal-title"
              className="font-display font-bold text-xl md:text-2xl text-white"
            >
              {mode === 'ai'
                ? 'Configure AI Match'
                : 'Configure Local Multiplayer'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize player seating, mix Human &amp; AI Bots, and configure house rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Setup Modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 py-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Player Count Selector */}
          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-2">
              Number of Players
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {([2, 3, 4] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setPlayerCount(cnt)}
                  className={`py-2.5 px-4 rounded-xl font-display font-bold text-sm border transition-all cursor-pointer ${
                    playerCount === cnt
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {cnt} Players
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty Selector (shown in AI mode OR whenever at least 1 AI Bot is added in Local mode) */}
          {(mode === 'ai' || botCount > 0) && (
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                AI Tactical Difficulty
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      id: 'easy',
                      label: 'Easy',
                      desc: 'Random legal moves',
                    },
                    {
                      id: 'medium',
                      label: 'Medium',
                      desc: 'Prioritizes captures & stars',
                    },
                    {
                      id: 'hard',
                      label: 'Hard',
                      desc: 'Weighted risk & threat engine',
                    },
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSelectGlobalDifficulty(tier.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      aiDifficulty === tier.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-display font-bold text-sm">
                      {tier.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {tier.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player Roster Inputs & AI Bot Controls */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Seated Players ({activeColors.length})
                </span>
                <span className="text-[11px] font-mono-tabular text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                  {humanCount} Human{humanCount !== 1 ? 's' : ''}
                  {botCount > 0
                    ? ` · ${botCount} AI Bot${botCount !== 1 ? 's' : ''}`
                    : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {mode === 'local' && botCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllHuman}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300 transition-colors cursor-pointer"
                  >
                    <Users className="w-3 h-3" />
                    All Human
                  </button>
                )}
                {canAddMoreBots && (
                  <button
                    type="button"
                    onClick={handleAddAiBot}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-[11px] font-semibold text-indigo-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <Bot className="w-3.5 h-3.5" />
                    Add AI Bot
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeColors.map((color, idx) => {
                const meta = COLOR_META[color];
                const isBot = idx > 0 && seatTypes[color] === 'ai';
                const currentDiff = botDifficulties[color] || aiDifficulty;

                return (
                  <div
                    key={color}
                    className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-colors ${
                      isBot
                        ? 'bg-indigo-950/25 border-indigo-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-950 shrink-0"
                        style={{ backgroundColor: meta.primaryHex }}
                      >
                        {meta.symbol}
                      </span>
                      <input
                        type="text"
                        maxLength={18}
                        value={customNames[color]}
                        onChange={(e) =>
                          setCustomNames((prev) => ({
                            ...prev,
                            [color]: e.target.value,
                          }))
                        }
                        aria-label={`${meta.label} Player Name`}
                        className="w-full bg-transparent text-xs font-semibold text-slate-100 focus:outline-none min-w-0"
                      />

                      {idx === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 text-[10px] font-semibold text-amber-300 shrink-0">
                          <Crown className="w-3 h-3" />
                          Host
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleSeatType(color, idx)}
                          aria-label={`Toggle ${meta.label} between Human and AI Bot`}
                          title="Click to switch between Human and AI Bot"
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                            isBot
                              ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/35'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isBot ? (
                            <>
                              <Bot className="w-3 h-3 text-indigo-300" />
                              AI Bot
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3 text-emerald-300" />
                              Human
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Per-Bot Difficulty Pill Selector when seat is AI Bot */}
                    {isBot && (
                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-indigo-500/20 text-[10px]">
                        <span className="text-indigo-300/80 font-medium">
                          Bot Skill:
                        </span>
                        <div className="flex items-center gap-1">
                          {(['easy', 'medium', 'hard'] as const).map((tier) => (
                            <button
                              key={tier}
                              type="button"
                              onClick={() =>
                                setBotDifficulties((prev) => ({
                                  ...prev,
                                  [color]: tier,
                                }))
                              }
                              className={`px-1.5 py-0.5 rounded font-semibold capitalize transition-colors cursor-pointer ${
                                currentDiff === tier
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800/90 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {tier === 'medium' ? 'Med' : tier}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* House Rules Configuration */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="font-display font-bold text-sm text-slate-200">
              Ruleset Configuration
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">Triple 6s Forfeit Turn</span>
                <input
                  type="checkbox"
                  checked={rules.maxConsecutiveSixes === 3}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      maxConsecutiveSixes: e.target.checked ? 3 : 0,
                    }))
                  }
                  className="accent-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">Bonus Roll on Capture</span>
                <input
                  type="checkbox"
                  checked={rules.bonusRollOnCapture}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      bonusRollOnCapture: e.target.checked,
                    }))
                  }
                  className="accent-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">Safe Star Squares</span>
                <input
                  type="checkbox"
                  checked={rules.safeStarSquares}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      safeStarSquares: e.target.checked,
                    }))
                  }
                  className="accent-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">
                  Fast Start (1 Token Deployed)
                </span>
                <input
                  type="checkbox"
                  checked={rules.fastStart}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      fastStart: e.target.checked,
                    }))
                  }
                  className="accent-amber-500 w-4 h-4"
                />
              </label>
            </div>

            <ul className="space-y-1 text-[11px] text-slate-400 pt-1">
              {ruleDescriptions.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          </div>

          {/* Board & Token Design Quick Selector inside Match Setup */}
          {onSelectBoardTheme && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Board &amp; Token Design
                </span>
                <span className="text-[11px] text-amber-400 font-semibold">
                  {getBoardThemeOption(boardTheme).label} ·{' '}
                  {getBoardThemeOption(boardTheme).tokenStyleLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BOARD_THEME_OPTIONS.map((t) => {
                  const isSelected =
                    getBoardThemeOption(boardTheme).id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectBoardTheme(t.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <BoardThemePreviewSVG
                        themeOption={t}
                        className="w-9 h-9"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-[11px] truncate">
                          {t.indexNumber}. {t.label}
                        </div>
                        <div className="text-[9px] text-amber-300/90 truncate">
                          {t.tokenStyleLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm shadow-lg cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Start Match</span>
          </button>
        </div>
      </form>
    </div>
  );
};

/* ============================================================================
   2. ONLINE MULTIPLAYER ROOM & MATCHMAKING MODAL
   ============================================================================ */
interface OnlineModalProps {
  mode: 'friends' | 'matchmaking';
  room: OnlineRoomInfo | null;
  assignedColor: PlayerColor | null;
  errorMessage: string | null;
  matchmakingStatus: 'idle' | 'searching' | 'matched';
  connectionStatus?: 'connected' | 'connecting' | 'offline';
  backendStatus?: BackendStatusInfo | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onAddBot: () => void;
  onToggleReady: () => void;
  onStartOnlineMatch: () => void;
  onLeaveRoom?: () => void;
  onCancelMatchmaking?: () => void;
  onRetryMatchmaking?: () => void;
  onClose: () => void;
}

export const OnlineModal: React.FC<OnlineModalProps> = ({
  mode,
  room,
  assignedColor,
  errorMessage,
  matchmakingStatus,
  connectionStatus = 'connected',
  backendStatus,
  onCreateRoom,
  onJoinRoom,
  onAddBot,
  onToggleReady,
  onStartOnlineMatch,
  onLeaveRoom,
  onCancelMatchmaking,
  onRetryMatchmaking,
  onClose,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);

  // Timer for searching state
  React.useEffect(() => {
    let timer: any = null;
    if (mode === 'matchmaking' && matchmakingStatus === 'searching') {
      setSearchSeconds(0);
      timer = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, matchmakingStatus]);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const normalizedJoinCode = joinCodeInput.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  const isJoinCodeValid = normalizedJoinCode.length === 6;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="online-modal-title"
    >
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-sky-400" />
            <div>
              <h2
                id="online-modal-title"
                className="font-display font-bold text-lg sm:text-xl text-white"
              >
                {mode === 'matchmaking'
                  ? 'Public Online Matchmaking'
                  : 'Play With Friends · Room Lobby'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Online Modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Connection Status Indicator Pill */}
        <div className="flex items-center justify-between gap-2 pt-3 text-[11px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-medium capitalize">
              {connectionStatus === 'connected'
                ? 'Server Synced'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800/80 text-[10px] text-slate-400">
            <Signal className="w-3 h-3 text-sky-400" />
            <span>
              {backendStatus?.type === 'upstash'
                ? 'Cloud Sync (Upstash Redis)'
                : 'Local Sync Engine'}
            </span>
          </div>
        </div>

        <div className="py-4 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* MODE: PUBLIC ONLINE MATCHMAKING */}
          {mode === 'matchmaking' ? (
            <div className="py-4 space-y-5 text-center">
              {matchmakingStatus === 'matched' ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <Check className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg text-emerald-300">
                      Opponent Found!
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Joining matched game session... Launching board.
                    </p>
                  </div>
                </div>
              ) : matchmakingStatus === 'searching' ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400 relative">
                    <Globe className="w-8 h-8 animate-spin" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-400 animate-ping" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg text-white">
                      Searching for Opponent...
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTimer(searchSeconds)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                      Looking for an active online challenger. You can test matchmaking instantly by opening a second browser tab or window!
                    </p>
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={onCancelMatchmaking || onClose}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Cancel Search
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base text-white">
                      Connecting to Matchmaking Queue...
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Establishing server synchronization...
                    </p>
                  </div>
                  {onRetryMatchmaking && (
                    <button
                      type="button"
                      onClick={onRetryMatchmaking}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : !room ? (
            /* MODE: PRIVATE ROOM - NO ACTIVE ROOM */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Create a New Private Room</span>
                </div>
                <p className="text-xs text-slate-400">
                  Generate a unique 6-character room code with server-authoritative turns and dice validation.
                </p>
                <button
                  type="button"
                  onClick={onCreateRoom}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer transition-colors"
                >
                  Create Room Code
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isJoinCodeValid) {
                    onJoinRoom(normalizedJoinCode);
                  }
                }}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <label className="block font-display font-bold text-sm text-white">
                  Join Existing Room
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-character code"
                    value={joinCodeInput}
                    onChange={(e) =>
                      setJoinCodeInput(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
                    }
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono tracking-widest uppercase text-white focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    disabled={!isJoinCodeValid}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-sm cursor-pointer transition-colors"
                  >
                    Join Room
                  </button>
                </div>
                {joinCodeInput.length > 0 && !isJoinCodeValid && (
                  <span className="text-[11px] text-amber-400/90 block">
                    Room code must be exactly 6 alphanumeric characters.
                  </span>
                )}
              </form>
            </div>
          ) : (
            /* MODE: PRIVATE ROOM - IN LOBBY */
            <div className="space-y-4">
              {/* Active Room Code Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">
                    Share Room Code
                  </span>
                  <span className="font-mono font-bold text-2xl tracking-widest text-amber-400">
                    {room.roomCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Connected Room Players */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Players in Lobby ({room.players.length}/4)</span>
                  {assignedColor && (
                    <span>
                      Your Seat:{' '}
                      <strong className="text-white">
                        {COLOR_META[assignedColor].label}
                      </strong>
                    </span>
                  )}
                </div>

                {room.players.map((p) => {
                  const meta = COLOR_META[p.color];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-slate-950"
                          style={{ backgroundColor: meta.primaryHex }}
                        >
                          {meta.symbol}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-white">
                            {p.name}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {p.isHost ? '(Host)' : p.isAI ? '(AI Bot)' : ''}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          p.ready ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {p.ready ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Room Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleReady}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                  >
                    Toggle Ready
                  </button>
                  {room.players.length < 4 && (
                    <button
                      type="button"
                      onClick={onAddBot}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bot</span>
                    </button>
                  )}
                  {onLeaveRoom && (
                    <button
                      type="button"
                      onClick={onLeaveRoom}
                      title="Leave Room Lobby"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-xs font-semibold text-rose-300 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={room.players.length < 2}
                  onClick={onStartOnlineMatch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-sm cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Start Online Match</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   3. PAUSE MODAL (`document.body.dataset.state = 'paused'`)
   ============================================================================ */
interface PauseModalProps {
  turnNumber: number;
  onResume: () => void;
  onRestart: () => void;
  onSaveAndExit: () => void;
  onExitWebLab?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  turnNumber,
  onResume,
  onRestart,
  onSaveAndExit,
  onExitWebLab,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-5">
        <div>
          <h2
            id="pause-modal-title"
            className="font-display font-extrabold text-2xl text-white"
          >
            Match Paused
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono-tabular">
            Turn {turnNumber} · Local progress automatically saved
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
          >
            Resume Match [Esc / P]
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm cursor-pointer"
          >
            Restart Match
          </button>
          <button
            type="button"
            onClick={onSaveAndExit}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-rose-950/70 border border-slate-800 text-slate-300 hover:text-rose-200 font-display font-semibold text-sm cursor-pointer"
          >
            Save & Return to Title
          </button>
          {onExitWebLab && (
            <button
              type="button"
              onClick={onExitWebLab}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-amber-600/30 hover:border-amber-400 text-amber-300 font-display font-semibold text-xs cursor-pointer transition-colors"
            >
              Exit to Web Lab
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. VICTORY / GAME OVER MODAL (`document.body.dataset.state = 'gameover'`)
   ============================================================================ */
interface VictoryModalProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onExitWebLab?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameState,
  onPlayAgain,
  onMainMenu,
  onExitWebLab,
}) => {
  const winnerColor = gameState.winner || gameState.players[0].color;
  const winnerPlayer =
    gameState.players.find((p) => p.color === winnerColor) ||
    gameState.players[0];
  const meta = COLOR_META[winnerColor];

  const totalCaptures = gameState.players.reduce(
    (acc, p) => acc + p.capturesMade,
    0
  );

  // Order all players by their final podium placement (1st, 2nd, 3rd, 4th)
  const orderedStandings = [...gameState.players].sort((a, b) => {
    const idxA = gameState.rankings.indexOf(a.color);
    const idxB = gameState.rankings.indexOf(b.color);
    const rankA = a.finishRank || (idxA !== -1 ? idxA + 1 : 99);
    const rankB = b.finishRank || (idxB !== -1 ? idxB + 1 : 99);
    return rankA - rankB;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-modal-title"
    >
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-4 my-auto">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-slate-950 shadow-lg"
          style={{ backgroundColor: meta.primaryHex }}
        >
          <Trophy className="w-7 h-7" />
        </div>

        <div>
          <h2
            id="victory-modal-title"
            className="font-display font-extrabold text-2xl md:text-3xl text-white"
          >
            {winnerPlayer.name} Triumphs!
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {meta.symbol} {meta.label} claimed 1st Place · All ranks decided
          </p>
        </div>

        {/* Full Podium Standings (1st, 2nd, 3rd, 4th) */}
        <div className="text-left space-y-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-1">
            Final Standings ({orderedStandings.length} Players)
          </div>
          {orderedStandings.map((p, index) => {
            const rank = index + 1;
            const pMeta = COLOR_META[p.color];
            const medal =
              rank === 1
                ? '🥇 1st'
                : rank === 2
                ? '🥈 2nd'
                : rank === 3
                ? '🥉 3rd'
                : `${rank}th`;
            return (
              <div
                key={p.color}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                  rank === 1
                    ? 'bg-amber-500/15 border-amber-500/40'
                    : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="px-2 py-0.5 rounded-lg text-[11px] font-display font-bold shrink-0 bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    {medal}
                  </span>
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                    style={{ backgroundColor: pMeta.primaryHex }}
                  >
                    {pMeta.symbol}
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {p.name}
                  </span>
                  {p.type === 'ai' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold shrink-0">
                      AI
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                  {p.capturesMade} cap · {p.sixesRolled} sixes
                </span>
              </div>
            );
          })}
        </div>

        {/* 3 Tabular Mastery Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Turns
            </div>
            <div className="font-mono-tabular font-bold text-lg text-white mt-0.5">
              {Math.round(gameState.turnNumber)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Captures
            </div>
            <div className="font-mono-tabular font-bold text-lg text-amber-400 mt-0.5">
              {Math.round(winnerPlayer.capturesMade)}/{Math.round(totalCaptures)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Sixes
            </div>
            <div className="font-mono-tabular font-bold text-lg text-emerald-400 mt-0.5">
              {Math.round(winnerPlayer.sixesRolled)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMainMenu}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm cursor-pointer"
            >
              Main Menu
            </button>
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm shadow-lg cursor-pointer"
            >
              Play Again
            </button>
          </div>
          {onExitWebLab && (
            <button
              type="button"
              onClick={onExitWebLab}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-amber-600/30 hover:border-amber-400 text-amber-300 font-display font-semibold text-xs cursor-pointer transition-colors"
            >
              Exit to Web Lab
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   5. HOW TO PLAY & RULES MODAL
   ============================================================================ */
export const RulesModal: React.FC<{
  rules: HouseRules;
  onClose: () => void;
}> = ({ rules, onClose }) => {
  const activeLines = describeActiveRules(rules);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2
            id="rules-modal-title"
            className="font-display font-bold text-xl text-white"
          >
            How to Play Ludo Royale
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Rules Modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs md:text-sm text-slate-300 max-h-[68vh] overflow-y-auto pr-1 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-display font-bold text-white mb-1">
              1. Objective & The 52-Square Track
            </h3>
            <p className="text-slate-400 text-xs">
              Each player commands 4 tokens starting in their corner yard. Navigate your tokens clockwise around the 52-cell perimeter track, up your 5-cell colored Home Stretch, and into the central Finishing Triangle. The first player to bring all 4 tokens home wins!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-display font-bold text-white mb-1">
              2. Deploying Tokens & Bonus Rolls
            </h3>
            <p className="text-slate-400 text-xs">
              You must roll a 6 to deploy a token from your starting yard onto your colored entry square. Rolling a 6 also awards a bonus roll.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-display font-bold text-white mb-1">
              3. Capturing & Safe Squares
            </h3>
            <p className="text-slate-400 text-xs">
              Landing on a square occupied by an opponent’s token captures it and sends it back to its starting yard! However, tokens resting on any of the 4 colored Start Squares or the 4 Star Squares cannot be captured.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-display font-bold text-amber-300 mb-1.5">
              Active Ruleset Summary
            </h3>
            <ul className="space-y-1 text-xs text-slate-300">
              {activeLines.map((line, idx) => (
                <li key={idx}>• {line}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   6. STATISTICS & ACHIEVEMENTS MODAL
   ============================================================================ */
export const StatsModal: React.FC<{
  stats: PlayerStats;
  onClose: () => void;
}> = ({ stats, onClose }) => {
  const winRate =
    stats.totalGames > 0
      ? Math.round((stats.wins / stats.totalGames) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2
              id="stats-modal-title"
              className="font-display font-bold text-xl text-white"
            >
              Career Statistics & Achievements
            </h2>
            <p className="text-xs text-slate-400">
              Stored locally on this device via LocalStorage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Statistics Modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                Matches Played
              </span>
              <span className="font-mono-tabular font-bold text-2xl text-white">
                {stats.totalGames}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                Win Rate
              </span>
              <span className="font-mono-tabular font-bold text-2xl text-emerald-400">
                {winRate}%
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                Tokens Captured
              </span>
              <span className="font-mono-tabular font-bold text-2xl text-amber-400">
                {stats.tokensCaptured}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                Best Win Streak
              </span>
              <span className="font-mono-tabular font-bold text-2xl text-sky-400">
                {stats.longestWinStreak}
              </span>
            </div>
          </div>

          {/* Achievements Grid */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-200 mb-2.5">
              Milestones & Achievements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS_LIST.map((ach) => {
                const currentVal = stats[ach.metric] || 0;
                const unlocked =
                  stats.unlockedAchievements.includes(ach.id) ||
                  currentVal >= ach.target;
                const pct = Math.min(
                  100,
                  Math.round((currentVal / ach.target) * 100)
                );

                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border ${
                      unlocked
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-xs text-white">
                        {ach.title}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-amber-400">
                        {Math.min(currentVal, ach.target)}/{ach.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {ach.description}
                    </p>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   7. SETTINGS, ACCESSIBILITY & PLAYER PROFILE MODAL
   ============================================================================ */
export const SettingsModal: React.FC<{
  profile: UserProfile;
  stats: PlayerStats;
  settings: AppSettings;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
}> = ({
  profile,
  stats,
  settings,
  onUpdateProfile,
  onUpdateSettings,
  onClose,
}) => {
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [avatarFilter, setAvatarFilter] = useState<'all' | 'starter' | 'progression'>('all');
  const [inspectedAvatarId, setInspectedAvatarId] = useState<string>(profile.avatar);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [previewRollingDiceId, setPreviewRollingDiceId] =
    useState<DiceStyle | null>(null);

  const { level, currentLevelXp, nextLevelXp, progressPercent } =
    calculatePlayerLevel(profile.experiencePoints);

  const filteredAvatars = AVATAR_OPTIONS.filter((opt) => {
    if (avatarFilter === 'all') return true;
    return opt.category === avatarFilter;
  });

  const inspectedAvatar =
    AVATAR_OPTIONS.find((a) => a.id === inspectedAvatarId) || AVATAR_OPTIONS[0];
  const inspectedUnlocked = isAvatarUnlocked(inspectedAvatar, profile, stats);
  const inspectedProgress = getAvatarUnlockProgress(
    inspectedAvatar,
    profile,
    stats
  );

  const handleSelectAvatar = (opt: (typeof AVATAR_OPTIONS)[number]) => {
    setInspectedAvatarId(opt.id);
    const unlocked = isAvatarUnlocked(opt, profile, stats);
    if (unlocked) {
      setAvatar(opt.id);
      setLockedNotice(null);
    } else {
      const prog = getAvatarUnlockProgress(opt, profile, stats);
      setLockedNotice(
        `Locked: ${prog.requirementText} (${prog.current}/${prog.target})`
      );
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      nickname: nickname.trim() || 'Grandmaster',
      avatar,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display font-bold text-lg sm:text-xl text-white"
            >
              Profile, Crests & Preferences
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Customize your identity, equip unlocked avatar crests, and configure display settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings Modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1 text-xs">
          {/* Player Progression & Level Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300 tracking-wider">
                  LEVEL {level}
                </span>
                <span className="font-semibold text-slate-200">
                  Royale Progression
                </span>
              </div>
              <span className="font-mono-tabular text-[11px] text-amber-400">
                {currentLevelXp} / {nextLevelXp} XP ({progressPercent}%)
              </span>
            </div>

            {/* XP Bar */}
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 mb-3">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Career Summary Badges */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="px-2 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Career Wins</span>
                <span className="font-mono-tabular font-bold text-sm text-white">
                  🏆 {profile.wins}
                </span>
              </div>
              <div className="px-2 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Experience</span>
                <span className="font-mono-tabular font-bold text-sm text-amber-300">
                  ✨ {profile.experiencePoints}
                </span>
              </div>
              <div className="px-2 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Captures</span>
                <span className="font-mono-tabular font-bold text-sm text-emerald-400">
                  🎯 {stats.tokensCaptured}
                </span>
              </div>
            </div>
          </div>

          {/* Nickname & Avatar Crest Selector */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <label className="block">
              <span className="font-semibold text-slate-300 block mb-1">
                Player Nickname
              </span>
              <input
                type="text"
                maxLength={18}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter player nickname"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">
                  Select Avatar Crest
                </span>
                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'starter', label: 'Starter' },
                      { id: 'progression', label: 'Unlockable' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAvatarFilter(f.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                        avatarFilter === f.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {filteredAvatars.map((opt) => {
                  const unlocked = isAvatarUnlocked(opt, profile, stats);
                  const isSelected = avatar === opt.id;
                  const isInspected = inspectedAvatarId === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAvatar(opt)}
                      title={`${opt.label}${unlocked ? '' : ' (Locked)'}`}
                      aria-label={`${opt.label}${unlocked ? ' (Unlocked)' : ' (Locked)'}`}
                      className={`relative min-w-[44px] min-h-[44px] h-11 rounded-xl flex items-center justify-center text-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/60 scale-105 shadow-md shadow-amber-500/20'
                          : isInspected
                          ? 'bg-slate-800 border-slate-500 scale-102'
                          : unlocked
                          ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/70 border-slate-800/80 opacity-60 hover:opacity-85'
                      }`}
                    >
                      <span className={unlocked ? '' : 'grayscale-[40%]'}>
                        {opt.icon}
                      </span>
                      {!unlocked && (
                        <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] text-amber-400">
                          <Lock className="w-2 h-2" />
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Locked Notice Banner (shows when user clicks a locked avatar) */}
              {lockedNotice && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-200 animate-fadeIn">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{lockedNotice}</span>
                </div>
              )}

              {/* Inspected Avatar Details & Unlock Requirement Card */}
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                    {inspectedAvatar.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs truncate">
                        {inspectedAvatar.label}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          inspectedAvatar.category === 'starter'
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {inspectedAvatar.category === 'starter'
                          ? 'Starter'
                          : 'Unlockable'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {inspectedUnlocked ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3 inline" /> Unlocked & Available
                        </span>
                      ) : (
                        <span>
                          Requirement: {inspectedProgress.requirementText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0 flex items-center justify-between sm:justify-end gap-2.5">
                  {!inspectedUnlocked && (
                    <div className="text-right">
                      <div className="text-[10px] font-mono-tabular text-slate-300">
                        {inspectedProgress.current} / {inspectedProgress.target}
                      </div>
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${inspectedProgress.progressPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {inspectedUnlocked && avatar !== inspectedAvatar.id && (
                    <button
                      type="button"
                      onClick={() => handleSelectAvatar(inspectedAvatar)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-[11px] cursor-pointer"
                    >
                      Equip Crest
                    </button>
                  )}

                  {avatar === inspectedAvatar.id && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Equipped
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dice Design Selector */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                Select Dice Design
              </span>
              <span className="text-[10px] text-amber-400 font-medium">
                6 Unique Styles
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {DICE_STYLE_OPTIONS.map((d) => {
                const isSelected = (settings.diceStyle || 'classic_ivory') === d.id;
                const isPreviewRolling = previewRollingDiceId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, diceStyle: d.id });
                      setPreviewRollingDiceId(d.id);
                      window.setTimeout(() => {
                        setPreviewRollingDiceId((prev) =>
                          prev === d.id ? null : prev
                        );
                      }, 450);
                    }}
                    aria-label={`Select ${d.label} Dice`}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPreviewRolling && !settings.reducedMotion
                          ? 'animate-dice-roll-2d'
                          : ''
                      }`}
                      style={{
                        background: d.surfaceGradient,
                        boxShadow: d.shadowStyle,
                        border: `1.5px solid ${d.borderHex}`,
                      }}
                    >
                      <DiceFaceSVG
                        face={5}
                        diceStyle={d.id}
                        className="w-8 h-8"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs truncate">
                        {d.label}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
                        {d.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board & Token Theme Selector (6 Signature Designs) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">
                  Tabletop Board &amp; Token Design
                </span>
                <span className="text-[10px] text-slate-400">
                  Each board theme automatically equips its matching 3D token sculpt
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-medium shrink-0">
                6 Signature Realms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BOARD_THEME_OPTIONS.map((t) => {
                const activeThemeOpt = getBoardThemeOption(settings.boardTheme);
                const isSelected = activeThemeOpt.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={`Select ${t.label} Board and ${t.tokenStyleLabel} Tokens`}
                    onClick={() =>
                      onUpdateSettings({ ...settings, boardTheme: t.id })
                    }
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <BoardThemePreviewSVG
                      themeOption={t}
                      className="w-12 h-12"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-white text-xs truncate">
                          {t.indexNumber}. {t.label}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-300 font-semibold truncate mt-0.5">
                        Token: {t.tokenStyleLabel}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
                        {t.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Haptic Feedback Intensity Toggle & Selector */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-200 block">
                  Mobile Haptic Feedback Intensity
                </span>
                <span className="text-[10px] text-slate-400">
                  Tactile vibration response for dice rolls, captures &amp; home arrivals
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <span className="text-[11px] font-semibold text-slate-300">
                  {(settings.hapticIntensity || 'medium') === 'off'
                    ? 'Off'
                    : 'Enabled'}
                </span>
                <input
                  type="checkbox"
                  aria-label="Toggle Mobile Haptic Feedback"
                  checked={(settings.hapticIntensity || 'medium') !== 'off'}
                  onChange={(e) => {
                    const nextIntensity: HapticIntensity = e.target.checked
                      ? 'medium'
                      : 'off';
                    soundManager.setHapticIntensity(nextIntensity);
                    if (nextIntensity !== 'off') {
                      soundManager.triggerHaptic(18);
                    }
                    onUpdateSettings({
                      ...settings,
                      hapticIntensity: nextIntensity,
                    });
                  }}
                  className="accent-amber-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'off', label: 'Off', desc: 'Disabled' },
                  { id: 'light', label: 'Light', desc: 'Subtle · 0.5x' },
                  { id: 'medium', label: 'Medium', desc: 'Balanced · 1.0x' },
                  { id: 'heavy', label: 'Heavy', desc: 'Strong · 1.8x' },
                ] as { id: HapticIntensity; label: string; desc: string }[]
              ).map((tier) => {
                const currentIntensity = settings.hapticIntensity || 'medium';
                const isSelected = currentIntensity === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-label={`Haptic Intensity ${tier.label}`}
                    onClick={() => {
                      soundManager.setHapticIntensity(tier.id);
                      if (tier.id !== 'off') {
                        soundManager.triggerHaptic(20);
                      }
                      onUpdateSettings({
                        ...settings,
                        hapticIntensity: tier.id,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="font-display font-bold text-xs">
                      {tier.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {tier.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound, Motion & Accessibility Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <span className="text-slate-200 font-medium">Sound Effects</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    soundEnabled: e.target.checked,
                  })
                }
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <span className="text-slate-200 font-medium">
                Ambient Tabletop Music
              </span>
              <input
                type="checkbox"
                checked={settings.musicEnabled}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    musicEnabled: e.target.checked,
                  })
                }
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <span className="text-slate-200 font-medium">
                Color-Blind Token Symbols (▲ ◆ ★ ●)
              </span>
              <input
                type="checkbox"
                checked={settings.colorBlindMode}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    colorBlindMode: e.target.checked,
                  })
                }
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <span className="text-slate-200 font-medium">
                Reduced Motion Mode
              </span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    reducedMotion: e.target.checked,
                  })
                }
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs cursor-pointer shadow-md"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
