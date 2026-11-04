import {
  Award,
  Bot,
  Check,
  Copy,
  Crown,
  Globe,
  Lock,
  LogOut,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Unlock,
  Users,
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
  getDiceStyleOption,
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
  MatchmakingPlayerCount,
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
import {
  BackendStatusInfo,
  OnlineRoomInfo,
  QueuedPlayerSummary,
} from '../../services/multiplayer';
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
  statusNotice?: { title: string; message: string } | null;
  onDismissNotice?: () => void;
  matchmakingStatus: 'idle' | 'searching' | 'matched';
  selectedPlayerCount: MatchmakingPlayerCount;
  matchmakingFoundPlayers: number;
  queuedPlayers: QueuedPlayerSummary[];
  onSelectPlayerCount: (count: MatchmakingPlayerCount) => void;
  onFindMatch: (count: MatchmakingPlayerCount) => void;
  onCancelMatchmaking: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onAddBot: () => void;
  onToggleReady: () => void;
  onStartOnlineMatch: () => void;
  onClose: () => void;
  connectionStatus?: 'connected' | 'connecting' | 'offline';
  backendStatus?: BackendStatusInfo | null;
}

const MATCHMAKING_MODE_CARDS: {
  count: MatchmakingPlayerCount;
  headerBadge: string;
  label: string;
  description: string;
  indicator: string;
  ruleSummary: string;
  accentHex: string;
  borderActiveClass: string;
  bgActiveClass: string;
}[] = [
  {
    count: 2,
    headerBadge: '2 PLAYER',
    label: 'Duel',
    description: 'Challenge one opponent.',
    indicator: '2 Players',
    ruleSummary: '1v1 Showdown · Match terminates immediately if either player leaves.',
    accentHex: '#F59E0B',
    borderActiveClass: 'border-2 border-amber-400 ring-2 ring-amber-400/30',
    bgActiveClass: 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950',
  },
  {
    count: 3,
    headerBadge: '3 PLAYER',
    label: 'Trio',
    description: 'Battle against two opponents.',
    indicator: '3 Players',
    ruleSummary: 'AI Bot replaces any departed player while 2+ humans remain.',
    accentHex: '#38BDF8',
    borderActiveClass: 'border-2 border-amber-400 ring-2 ring-sky-400/30',
    bgActiveClass: 'bg-gradient-to-br from-sky-500/25 via-slate-900 to-slate-950',
  },
  {
    count: 4,
    headerBadge: '4 PLAYER',
    label: 'Squad',
    description: 'Full four-player Ludo battle.',
    indicator: '4 Players',
    ruleSummary: 'Full 4-corner arena · AI Bots take over departed seats until 1 human remains.',
    accentHex: '#10B981',
    borderActiveClass: 'border-2 border-amber-400 ring-2 ring-emerald-400/30',
    bgActiveClass: 'bg-gradient-to-br from-emerald-500/25 via-slate-900 to-slate-950',
  },
];

export const OnlineModal: React.FC<OnlineModalProps> = ({
  mode,
  room,
  assignedColor,
  errorMessage,
  statusNotice,
  onDismissNotice,
  matchmakingStatus,
  selectedPlayerCount,
  matchmakingFoundPlayers,
  queuedPlayers,
  onSelectPlayerCount,
  onFindMatch,
  onCancelMatchmaking,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onAddBot,
  onToggleReady,
  onStartOnlineMatch,
  onClose,
  connectionStatus = 'connected',
  backendStatus,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getAvatarEmoji = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.icon || '👑';
  };

  const selectedCardMeta =
    MATCHMAKING_MODE_CARDS.find((c) => c.count === selectedPlayerCount) ||
    MATCHMAKING_MODE_CARDS[0];

  const isSearchingOrMatched =
    matchmakingStatus === 'searching' || matchmakingStatus === 'matched';
  const liveFoundCount = isSearchingOrMatched
    ? Math.min(selectedPlayerCount, Math.max(1, matchmakingFoundPlayers))
    : 0;
  const seatColors = getColorsForPlayerCount(selectedPlayerCount);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="online-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="online-modal-title"
                className="font-display font-bold text-lg sm:text-xl text-white"
              >
                {mode === 'matchmaking'
                  ? 'Online Multiplayer Matchmaking'
                  : 'Play With Friends · Private Room'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {mode === 'matchmaking'
                  ? isSearchingOrMatched
                    ? `${selectedCardMeta.label} (${selectedCardMeta.indicator}) · Live Queue`
                    : 'Choose your battle size and queue into a live server-authoritative match'
                  : 'Create or join a 6-character room code with live synced turns'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Online Modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          {/* Live Server Connection Indicator */}
          <div
            data-testid="server-connection-indicator"
            className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {connectionStatus === 'connected' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                )}
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {connectionStatus === 'connected'
                  ? 'Connected to Server'
                  : connectionStatus === 'connecting'
                  ? 'Connecting to Server...'
                  : 'Server Offline'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular">
              {backendStatus?.configured ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Cloud Redis Sync Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  In-Memory Server Mode
                </span>
              )}
            </div>
          </div>

          {backendStatus && !backendStatus.configured && mode === 'matchmaking' && (
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 leading-relaxed">
              ℹ️ <strong>Multi-Device Notice:</strong> Server is currently operating in in-memory mode. For multiple devices across separate Vercel serverless instances to pair together, add <code className="text-amber-100 bg-amber-950/70 px-1 py-0.5 rounded border border-amber-500/30">UPSTASH_REDIS_REST_URL</code> and <code className="text-amber-100 bg-amber-950/70 px-1 py-0.5 rounded border border-amber-500/30">UPSTASH_REDIS_REST_TOKEN</code> to your Vercel Project Environment Variables.
            </div>
          )}
          {/* Status / Termination Notice Banner */}
          {statusNotice && (
            <div
              data-testid="online-status-notice"
              className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-100 shadow-lg"
            >
              <div className="space-y-0.5">
                <div className="font-display font-bold text-xs sm:text-sm text-amber-300">
                  {statusNotice.title}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {statusNotice.message}
                </p>
              </div>
              {onDismissNotice && (
                <button
                  type="button"
                  onClick={onDismissNotice}
                  aria-label="Dismiss Notice"
                  className="w-7 h-7 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              data-testid="online-error-banner"
              className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200"
            >
              {errorMessage}
            </div>
          )}

          {mode === 'matchmaking' ? (
            !isSearchingOrMatched ? (
              /* ============================================================
                 MATCHMAKING STEP 1: PLAYER-COUNT SELECTION CARDS (2P, 3P, 4P)
                 ============================================================ */
              <div className="space-y-5" data-testid="matchmaking-selection-view">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MATCHMAKING_MODE_CARDS.map((card) => {
                    const isSelected = selectedPlayerCount === card.count;
                    const cardColors = getColorsForPlayerCount(card.count);

                    return (
                      <button
                        key={card.count}
                        type="button"
                        data-testid={`matchmaking-card-${card.count}p`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          soundManager.playClick();
                          onSelectPlayerCount(card.count);
                        }}
                        className={`group relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer ${
                          isSelected
                            ? `${card.bgActiveClass} ${card.borderActiveClass} shadow-xl scale-[1.01]`
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
                        }`}
                      >
                        <div>
                          {/* Top Row: Mode Kicker Badge & Active Check */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono-tabular font-extrabold tracking-wider uppercase ${
                                isSelected
                                  ? 'bg-white/15 text-white border border-white/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {card.headerBadge}
                            </span>

                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-amber-400 border-amber-300 text-slate-950'
                                  : 'border-slate-700 bg-slate-950/60 text-transparent group-hover:border-slate-500'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          </div>

                          {/* Custom Mode Illustration / Player Silhouette Icon */}
                          <div className="w-12 h-12 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center mb-3 shadow-inner group-hover:scale-105 transition-transform">
                            {card.count === 2 && (
                              <svg
                                viewBox="0 0 40 40"
                                className="w-7 h-7"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="13"
                                  cy="14"
                                  r="5"
                                  fill="#EF4444"
                                />
                                <path
                                  d="M5 29 C5 23 21 23 21 29"
                                  fill="#EF4444"
                                />
                                <circle
                                  cx="27"
                                  cy="14"
                                  r="5"
                                  fill="#F59E0B"
                                />
                                <path
                                  d="M19 29 C19 23 35 23 35 29"
                                  fill="#F59E0B"
                                />
                              </svg>
                            )}
                            {card.count === 3 && (
                              <svg
                                viewBox="0 0 40 40"
                                className="w-7 h-7"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="20"
                                  cy="10"
                                  r="4.5"
                                  fill="#10B981"
                                />
                                <circle
                                  cx="11"
                                  cy="24"
                                  r="4.5"
                                  fill="#EF4444"
                                />
                                <circle
                                  cx="29"
                                  cy="24"
                                  r="4.5"
                                  fill="#F59E0B"
                                />
                                <polygon
                                  points="20,16 14,26 26,26"
                                  fill="none"
                                  stroke="#38BDF8"
                                  strokeWidth="1.8"
                                />
                              </svg>
                            )}
                            {card.count === 4 && (
                              <svg
                                viewBox="0 0 40 40"
                                className="w-7 h-7"
                                aria-hidden="true"
                              >
                                <rect
                                  x="7"
                                  y="7"
                                  width="11"
                                  height="11"
                                  rx="3"
                                  fill="#EF4444"
                                />
                                <rect
                                  x="22"
                                  y="7"
                                  width="11"
                                  height="11"
                                  rx="3"
                                  fill="#10B981"
                                />
                                <rect
                                  x="22"
                                  y="22"
                                  width="11"
                                  height="11"
                                  rx="3"
                                  fill="#F59E0B"
                                />
                                <rect
                                  x="7"
                                  y="22"
                                  width="11"
                                  height="11"
                                  rx="3"
                                  fill="#3B82F6"
                                />
                              </svg>
                            )}
                          </div>

                          {/* Label & Description */}
                          <div className="font-display font-extrabold text-lg text-white">
                            {card.label}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                            {card.description}
                          </p>
                        </div>

                        {/* Bottom Player Indicator & Color Dots */}
                        <div className="mt-4 pt-3 border-t border-slate-800/90 flex items-center justify-between">
                          <span className="text-xs font-display font-bold text-amber-300">
                            {card.indicator}
                          </span>
                          <div className="flex items-center gap-1">
                            {cardColors.map((col) => (
                              <span
                                key={col}
                                className="w-3 h-3 rounded-full border border-white/30"
                                style={{
                                  backgroundColor: COLOR_META[col].primaryHex,
                                }}
                                title={COLOR_META[col].label}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Mode Match Rules Callout */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-300">
                      <strong className="text-white">
                        {selectedCardMeta.label} ({selectedCardMeta.indicator}):
                      </strong>{' '}
                      {selectedCardMeta.ruleSummary}
                    </span>
                  </div>
                </div>

                {/* Prominent Find Match CTA */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    data-testid="find-match-btn"
                    onClick={() => {
                      soundManager.playClick();
                      onFindMatch(selectedPlayerCount);
                    }}
                    className="flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-sm shadow-xl transition-all cursor-pointer"
                    style={{
                      boxShadow: '0 8px 22px -6px rgba(245, 158, 11, 0.5)',
                    }}
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Find Match ({selectedCardMeta.indicator})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ============================================================
                 MATCHMAKING STEP 2: LIVE QUEUE & PLAYER SLOTS FILLING SCREEN
                 ============================================================ */
              <div
                className="space-y-5 py-2"
                data-testid="matchmaking-queue-view"
              >
                {/* Top Radar Banner & Live Found Counter */}
                <div className="p-5 rounded-2xl bg-slate-900/95 border border-slate-800 text-center space-y-3">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <span className="absolute inset-0 rounded-2xl bg-sky-500/20 border border-sky-400/40 animate-ping" />
                    <div className="relative w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-400/50 flex items-center justify-center text-sky-400 shadow-lg">
                      <Globe className="w-8 h-8 animate-spin" />
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-mono-tabular font-bold mb-1.5">
                      <span>
                        {selectedCardMeta.label.toUpperCase()} ·{' '}
                        {selectedCardMeta.indicator.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-display font-extrabold text-xl text-white">
                      {matchmakingStatus === 'matched'
                        ? 'Match Found! Launching Arena...'
                        : 'Searching for Online Players...'}
                    </div>
                    <div
                      data-testid="matchmaking-found-count"
                      className="text-sm font-mono-tabular font-bold text-amber-400 mt-1"
                    >
                      {liveFoundCount}/{selectedPlayerCount} players found
                    </div>
                  </div>
                </div>

                {/* Live Player Slots Grid (2, 3, or 4 slots) */}
                <div
                  className={`grid gap-2.5 ${
                    selectedPlayerCount === 2
                      ? 'grid-cols-2'
                      : selectedPlayerCount === 3
                      ? 'grid-cols-1 sm:grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {seatColors.map((seatColor, idx) => {
                    const meta = COLOR_META[seatColor];
                    const queuedPlayer = queuedPlayers[idx];
                    const isFilled = Boolean(queuedPlayer);

                    return (
                      <div
                        key={seatColor}
                        data-testid={`queue-slot-${idx}`}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center text-center gap-2 ${
                          isFilled
                            ? 'bg-slate-900 border-emerald-500/50 shadow-md'
                            : 'bg-slate-950/70 border-slate-800/90 border-dashed'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-inner"
                          style={
                            isFilled
                              ? {
                                  backgroundColor: meta.darkHex,
                                  border: `1.5px solid ${meta.primaryHex}`,
                                  color: '#FFFFFF',
                                }
                              : {
                                  backgroundColor: '#0F172A',
                                  border: '1px solid #334155',
                                  color: '#64748B',
                                }
                          }
                        >
                          {isFilled ? (
                            getAvatarEmoji(queuedPlayer.avatar)
                          ) : (
                            <Users className="w-4 h-4 animate-pulse" />
                          )}
                        </div>

                        <div className="min-w-0 w-full">
                          <div className="text-xs font-bold text-white truncate">
                            {isFilled
                              ? queuedPlayer.name
                              : `Slot ${idx + 1} · Waiting`}
                          </div>
                          <div className="text-[10px] font-semibold mt-0.5 flex items-center justify-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: meta.primaryHex }}
                            />
                            <span
                              className={
                                isFilled ? 'text-emerald-400' : 'text-slate-400'
                              }
                            >
                              {isFilled ? 'Player Ready' : 'Searching...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cancel Matchmaking Button */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Match starts automatically once all {selectedPlayerCount}{' '}
                    slots fill.
                  </span>
                  <button
                    type="button"
                    data-testid="cancel-matchmaking-btn"
                    onClick={() => {
                      soundManager.playClick();
                      onCancelMatchmaking();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-xs font-display font-bold text-rose-200 transition-colors cursor-pointer shrink-0"
                  >
                    Cancel Matchmaking
                  </button>
                </div>
              </div>
            )
          ) : !room ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="font-display font-bold text-sm text-white">
                  Create a New Private Room
                </div>
                <p className="text-xs text-slate-400">
                  Generate a unique 6-character room code with server-authoritative turns and dice validation.
                </p>
                <button
                  type="button"
                  data-testid="create-room-btn"
                  onClick={onCreateRoom}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
                >
                  Create Room Code
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (joinCodeInput.trim()) {
                    onJoinRoom(joinCodeInput.trim());
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
                    placeholder="Enter 6-character code"
                    value={joinCodeInput}
                    onChange={(e) =>
                      setJoinCodeInput(e.target.value.toUpperCase())
                    }
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-tabular uppercase text-white focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    data-testid="join-room-submit-btn"
                    disabled={joinCodeInput.trim().length < 4}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-display font-bold text-sm cursor-pointer"
                  >
                    Join Room
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Room Code Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">
                    Share Room Code
                  </span>
                  <span
                    data-testid="private-room-code"
                    className="font-mono-tabular font-bold text-2xl tracking-widest text-amber-400"
                  >
                    {room.roomCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
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
                      Your Color:{' '}
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
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="lobby-leave-room-btn"
                    onClick={onLeaveRoom}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-xs font-semibold text-rose-200 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Room</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleReady}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Toggle Ready
                  </button>
                  {room.players.length < 4 && (
                    <button
                      type="button"
                      onClick={onAddBot}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add AI Bot</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="start-online-match-btn"
                  disabled={room.players.length < 2}
                  onClick={onStartOnlineMatch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-display font-bold text-sm cursor-pointer"
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
   3. PAUSE MODAL & LEAVE MATCH CONFIRMATION DIALOG
   ============================================================================ */
interface PauseModalProps {
  turnNumber: number;
  isOnline?: boolean;
  roomCode?: string;
  onResume: () => void;
  onRestart: () => void;
  onSaveAndExit: () => void;
  onRequestLeaveOnlineMatch?: () => void;
  onExitWebLab?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  turnNumber,
  isOnline,
  roomCode,
  onResume,
  onRestart,
  onSaveAndExit,
  onRequestLeaveOnlineMatch,
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
            {isOnline ? 'Online Match Options' : 'Match Paused'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono-tabular">
            {isOnline
              ? `Turn ${turnNumber}${roomCode ? ` · Room ${roomCode}` : ''} · Live Synchronized Match`
              : `Turn ${turnNumber} · Local progress automatically saved`}
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

          {!isOnline && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm cursor-pointer"
            >
              Restart Match
            </button>
          )}

          {isOnline ? (
            <button
              type="button"
              data-testid="pause-leave-room-btn"
              onClick={onRequestLeaveOnlineMatch || onSaveAndExit}
              className="w-full py-3 px-4 rounded-xl bg-rose-950/85 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Room</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSaveAndExit}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-rose-950/70 border border-slate-800 text-slate-300 hover:text-rose-200 font-display font-semibold text-sm cursor-pointer"
            >
              Save &amp; Return to Title
            </button>
          )}

          {onExitWebLab && (
            <button
              type="button"
              onClick={onExitWebLab}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-display font-medium text-xs cursor-pointer transition-colors"
            >
              Exit to Web Lab
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface LeaveMatchConfirmModalProps {
  onStayInMatch: () => void;
  onConfirmLeaveMatch: () => void;
}

export const LeaveMatchConfirmModal: React.FC<LeaveMatchConfirmModalProps> = ({
  onStayInMatch,
  onConfirmLeaveMatch,
}) => {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-match-confirm-title"
      data-testid="leave-match-confirm-dialog"
    >
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
          <LogOut className="w-6 h-6" />
        </div>

        <div>
          <h2
            id="leave-match-confirm-title"
            className="font-display font-extrabold text-2xl text-white"
          >
            Leave Match?
          </h2>
          <p className="text-sm text-slate-300 mt-1.5">
            Are you sure you want to leave this match?
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            data-testid="stay-in-match-btn"
            onClick={onStayInMatch}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-display font-bold text-sm cursor-pointer"
          >
            Stay in Match
          </button>
          <button
            type="button"
            data-testid="confirm-leave-match-btn"
            onClick={onConfirmLeaveMatch}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-sm shadow-lg cursor-pointer"
          >
            Leave Match
          </button>
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

        <div className="flex items-center gap-3 pt-1">
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
            className="w-full py-2 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-display font-medium text-xs cursor-pointer transition-colors"
          >
            Exit to Web Lab
          </button>
        )}
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
  const [justSelectedDiceId, setJustSelectedDiceId] =
    useState<DiceStyle | null>(null);
  const previewRollTimerRef = React.useRef<number | null>(null);
  const highlightTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewRollTimerRef.current) {
        window.clearTimeout(previewRollTimerRef.current);
      }
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

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
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">
                  Select Dice Design
                </span>
                <span className="text-[10px] text-slate-400">
                  Includes all 6 Classic Dice + 4 VOIDNOD Animated 2D Cubes (🌋 ⚡ 🔷 🌌)
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-medium shrink-0">
                {DICE_STYLE_OPTIONS.length} Unique Styles
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {DICE_STYLE_OPTIONS.map((d) => {
                const isSelected = (settings.diceStyle || 'classic_ivory') === d.id;
                const isPreviewRolling = previewRollingDiceId === d.id;
                const isJustHighlighted = justSelectedDiceId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    data-testid={`dice-style-option-${d.id}`}
                    onClick={() => {
                      onUpdateSettings({ ...settings, diceStyle: d.id });
                      soundManager.playDiceRoll(d.id);
                      setPreviewRollingDiceId(d.id);
                      setJustSelectedDiceId(d.id);
                      if (previewRollTimerRef.current) {
                        window.clearTimeout(previewRollTimerRef.current);
                      }
                      if (highlightTimerRef.current) {
                        window.clearTimeout(highlightTimerRef.current);
                      }
                      highlightTimerRef.current = window.setTimeout(() => {
                        setJustSelectedDiceId((prev) =>
                          prev === d.id ? null : prev
                        );
                      }, 520);
                      previewRollTimerRef.current = window.setTimeout(() => {
                        soundManager.playDiceLand(d.id);
                        setPreviewRollingDiceId((prev) =>
                          prev === d.id ? null : prev
                        );
                      }, 760);
                    }}
                    aria-label={`Select ${d.label} Dice`}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? isJustHighlighted
                          ? 'bg-amber-500/25 border-amber-300 ring-2 ring-amber-300/90 scale-[1.02] shadow-lg shadow-amber-500/25'
                          : 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <ThreeDimensionalDie
                        value={5}
                        isRolling={isPreviewRolling}
                        diceStyle={d.id}
                        size={46}
                        reducedMotion={settings.reducedMotion}
                        showSixGlow={false}
                        interactive={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-bold text-white text-xs truncate">
                        {d.badgeIcon && (
                          <span aria-hidden="true" className="shrink-0">
                            {d.badgeIcon}
                          </span>
                        )}
                        <span className="truncate">{d.label}</span>
                      </div>
                      {d.tagline && (
                        <div className="text-[8px] font-extrabold tracking-wider uppercase text-amber-300/90 truncate mt-0.5">
                          {d.tagline}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
                        {d.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Die Faces 1-6 & Live 3D Cube Roll Showcase */}
            {(() => {
              const activeDie = getDiceStyleOption(settings.diceStyle);
              const isRollingShowcase = previewRollingDiceId === activeDie.id;
              const isHighlightedShowcase = justSelectedDiceId === activeDie.id;
              return (
                <div
                  data-testid="selected-dice-faces-showcase"
                  className={`p-3.5 rounded-xl bg-slate-950/90 border transition-all duration-200 space-y-3 ${
                    isHighlightedShowcase
                      ? 'border-amber-400/80 ring-1 ring-amber-400/40'
                      : 'border-slate-800/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        data-testid="showcase-hero-3d-die"
                        className="w-18 h-18 flex items-center justify-center shrink-0 rounded-xl bg-slate-900/90 border border-slate-800 p-1"
                      >
                        <ThreeDimensionalDie
                          value={6}
                          isRolling={isRollingShowcase}
                          diceStyle={activeDie.id}
                          size={62}
                          reducedMotion={settings.reducedMotion}
                          showSixGlow={false}
                          interactive={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {activeDie.badgeIcon && (
                            <span aria-hidden="true" className="text-sm">
                              {activeDie.badgeIcon}
                            </span>
                          )}
                          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                            {activeDie.label}
                          </span>
                          {activeDie.tagline && (
                            <span className="text-[9px] font-bold tracking-widest uppercase text-amber-400/90">
                              • {activeDie.tagline}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-300/90 font-semibold mt-0.5">
                          3D Roll Physics: {activeDie.animationLabel}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {activeDie.subtitle}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playDiceRoll(activeDie.id);
                        setPreviewRollingDiceId(activeDie.id);
                        if (previewRollTimerRef.current) {
                          window.clearTimeout(previewRollTimerRef.current);
                        }
                        previewRollTimerRef.current = window.setTimeout(() => {
                          soundManager.playDiceLand(activeDie.id);
                          setPreviewRollingDiceId((prev) =>
                            prev === activeDie.id ? null : prev
                          );
                        }, 760);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer shrink-0"
                    >
                      Roll &amp; Test FX
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                    {([1, 2, 3, 4, 5, 6] as const).map((faceNum) => (
                      <div
                        key={faceNum}
                        className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl bg-slate-900/80 border border-slate-800/80"
                      >
                        <ThreeDimensionalDie
                          value={faceNum}
                          isRolling={false}
                          diceStyle={activeDie.id}
                          size={54}
                          reducedMotion={settings.reducedMotion}
                          showSixGlow={false}
                          showShadow={false}
                          interactive={false}
                        />
                        <span className="text-[10px] font-bold text-slate-300">
                          {faceNum}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
