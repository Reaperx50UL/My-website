"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ludo.css';
import { cn } from '@/lib/utils';
import { LudoBoard } from './components/Board/LudoBoard';
import { GameHUD } from './components/GameHUD/GameHUD';
import { MainMenu } from './components/MainMenu/MainMenu';
import {
  OnlineModal,
  PauseModal,
  RulesModal,
  SettingsModal,
  SetupModal,
  StatsModal,
  VictoryModal,
} from './components/Modals/GameModals';
import { chooseAIMove } from './game/aiStrategy';
import {
  BOARD_THEME_OPTIONS,
  DICE_STYLE_OPTIONS,
  getBoardThemeOption,
} from './game/constants';
import {
  commitDiceRoll,
  completeTurnTransition,
  createInitialGameState,
  executeTokenMove,
  generateFairDiceRoll,
} from './game/gameEngine';
import {
  AppSettings,
  GameState,
  GridCoord,
  HouseRules,
  PlayerColor,
  PlayerConfig,
  PlayerStats,
  ShellState,
  UserProfile,
} from './game/gameTypes';
import {
  multiplayerClient,
  OnlineRoomInfo,
  ServerMessage,
} from './services/multiplayer';
import { soundManager } from './services/sound';
import {
  clearSavedGame,
  loadHouseRules,
  loadProfile,
  loadSavedGame,
  loadSettings,
  loadStats,
  recordCompletedMatch,
  saveActiveGame,
  saveHouseRules,
  saveProfile,
  saveSettings,
} from './services/storage';

type ActiveModal =
  | null
  | 'setup_ai'
  | 'setup_local'
  | 'online_friends'
  | 'online_matchmaking'
  | 'rules'
  | 'stats'
  | 'settings';

export interface LudoRoyaleGameProps {
  className?: string;
  onExit?: () => void;
}

export function LudoRoyaleGame({ className, onExit }: LudoRoyaleGameProps) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [rules, setRules] = useState<HouseRules>(() => loadHouseRules());
  const [stats, setStats] = useState<PlayerStats>(() => loadStats());
  const [savedGame, setSavedGame] = useState<GameState | null>(() =>
    loadSavedGame()
  );

  // Determine initial shell state (?autostart=1 boots directly into 'playing')
  const [shellState, setShellState] = useState<ShellState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        const saved = loadSavedGame();
        if (saved && saved.turnPhase !== 'GAME_OVER') {
          return saved;
        }
      }
    }
    const defaultPlayers: PlayerConfig[] = [
      {
        color: 'red',
        name: loadProfile().nickname || 'Grandmaster',
        avatar: loadProfile().avatar || 'crown',
        type: 'human',
      },
      {
        color: 'green',
        name: 'Emerald Bot',
        avatar: 'knight',
        type: 'ai',
        aiDifficulty: 'medium',
      },
      {
        color: 'yellow',
        name: 'Solar Bot',
        avatar: 'shield',
        type: 'ai',
        aiDifficulty: 'medium',
      },
      {
        color: 'blue',
        name: 'Sapphire Bot',
        avatar: 'falcon',
        type: 'ai',
        aiDifficulty: 'hard',
      },
    ];
    return createInitialGameState({
      mode: 'ai',
      players: defaultPlayers,
      rules: loadHouseRules(),
    });
  });

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [animatingMove, setAnimatingMove] = useState<{
    tokenId: string;
    coord: GridCoord;
  } | null>(null);

  // Online Multiplayer State
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomInfo | null>(null);
  const [assignedColor, setAssignedColor] = useState<PlayerColor | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<
    'idle' | 'searching' | 'matched'
  >('idle');
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'offline'
  >(() => multiplayerClient.getConnectionStatus());

  const recordedMatchIdRef = useRef<string | null>(null);

  // Sync document.body.dataset.state with shellState
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
  }, [shellState]);

  // Restore active online session on page load/reconnect
  useEffect(() => {
    const savedRoom = multiplayerClient.getCurrentRoomCode();
    if (savedRoom && shellState === 'title') {
      multiplayerClient.connect(savedRoom);
    }
  }, []);

  // Configure sound & haptics engine whenever sound/music/haptic settings change
  useEffect(() => {
    soundManager.configure(
      settings.soundEnabled,
      settings.musicEnabled,
      settings.hapticIntensity || 'medium'
    );
  }, [
    settings.soundEnabled,
    settings.musicEnabled,
    settings.hapticIntensity,
  ]);

  // Save active offline match to LocalStorage on state updates
  useEffect(() => {
    if (shellState === 'playing' || shellState === 'paused') {
      if (gameState.mode === 'ai' || gameState.mode === 'local') {
        saveActiveGame(gameState);
        setSavedGame(gameState);
      }
    }
  }, [gameState, shellState]);

  // Detect GAME_OVER transition and record statistics
  useEffect(() => {
    if (
      gameState.turnPhase === 'GAME_OVER' &&
      shellState === 'playing' &&
      recordedMatchIdRef.current !== gameState.id
    ) {
      recordedMatchIdRef.current = gameState.id;
      soundManager.playVictory();
      soundManager.triggerHaptic(40);
      clearSavedGame();
      setSavedGame(null);
      const { stats: updatedStats, profile: updatedProfile } =
        recordCompletedMatch(gameState, assignedColor || 'red');
      setStats(updatedStats);
      setProfile(updatedProfile);
      setShellState('gameover');
    }
  }, [gameState, shellState, assignedColor]);

  // Subscribe to WebSocket & realtime multiplayer events
  useEffect(() => {
    const unsubscribe = multiplayerClient.subscribe((msg: ServerMessage) => {
      if (msg.type === 'CONNECTION_STATUS') {
        setConnectionStatus(msg.status);
      } else if (msg.type === 'ROOM_UPDATED') {
        setOnlineRoom(msg.room);
        setAssignedColor(msg.assignedColor);
        setOnlineError(null);
        if (msg.room.status === 'playing' && msg.room.gameState) {
          setGameState(msg.room.gameState);
          setActiveModal(null);
          setShellState('playing');
        }
      } else if (msg.type === 'GAME_STATE_SYNC') {
        setGameState(msg.gameState);
        setActiveModal(null);
        if (msg.gameState.turnPhase !== 'GAME_OVER') {
          setShellState('playing');
        }
      } else if (msg.type === 'MATCHMAKING_STATUS') {
        setMatchmakingStatus(msg.status);
        if (msg.status === 'matched' && msg.room) {
          setOnlineRoom(msg.room);
          if (msg.assignedColor) setAssignedColor(msg.assignedColor);
          if (msg.room.gameState) setGameState(msg.room.gameState);
          setActiveModal(null);
          setShellState('playing');
        }
      } else if (msg.type === 'ERROR') {
        setOnlineError(msg.message);
      }
    });
    return unsubscribe;
  }, []);

  // Start a quick 4-player match vs AI immediately
  const handleQuickPlay = useCallback(() => {
    soundManager.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const quickPlayers: PlayerConfig[] = [
      {
        color: 'red',
        name: profile.nickname || 'Grandmaster',
        avatar: profile.avatar || 'crown',
        type: 'human',
      },
      {
        color: 'green',
        name: 'Emerald Bot',
        avatar: 'knight',
        type: 'ai',
        aiDifficulty: 'medium',
      },
      {
        color: 'yellow',
        name: 'Solar Bot',
        avatar: 'shield',
        type: 'ai',
        aiDifficulty: 'medium',
      },
      {
        color: 'blue',
        name: 'Sapphire Bot',
        avatar: 'falcon',
        type: 'ai',
        aiDifficulty: 'hard',
      },
    ];
    const fresh = createInitialGameState({
      mode: 'ai',
      players: quickPlayers,
      rules,
    });
    setGameState(fresh);
    setActiveModal(null);
    setShellState('playing');
  }, [profile, rules]);

  // Start custom match from SetupModal
  const handleStartConfiguredMatch = useCallback(
    (players: PlayerConfig[], configuredRules: HouseRules, mode: 'ai' | 'local') => {
      soundManager.playClick();
      saveHouseRules(configuredRules);
      setRules(configuredRules);
      const fresh = createInitialGameState({
        mode,
        players,
        rules: configuredRules,
      });
      setGameState(fresh);
      setActiveModal(null);
      setShellState('playing');
    },
    []
  );

  // Step-by-step animated token movement
  const handleSelectToken = useCallback(
    (tokenId: string) => {
      if (
        shellState !== 'playing' ||
        gameState.turnPhase !== 'SELECTING_TOKEN' ||
        animatingMove !== null
      ) {
        return;
      }

      const move = gameState.legalMoves.find((m) => m.tokenId === tokenId);
      if (!move) return;

      // Online mode delegates move execution to the authoritative server
      if (
        (gameState.mode === 'friends' || gameState.mode === 'matchmaking') &&
        gameState.roomCode
      ) {
        soundManager.playStep(0);
        soundManager.triggerHaptic(10);
        multiplayerClient.requestMoveToken(gameState.roomCode, tokenId);
        return;
      }

      // Offline step-by-step animation along `move.pathCoords`
      const coords = move.pathCoords;
      if (settings.reducedMotion || coords.length <= 1) {
        if (move.capturesTokenIds.length > 0) {
          soundManager.playCapture();
          soundManager.triggerHaptic(30);
        } else if (move.reachesHome) {
          soundManager.playReachHome();
          soundManager.triggerHaptic(25);
        } else {
          soundManager.playStep(0);
          soundManager.triggerHaptic(10);
        }
        setGameState((prev) => executeTokenMove(prev, tokenId));
        return;
      }

      let stepIdx = 0;
      setAnimatingMove({ tokenId, coord: coords[0] });
      soundManager.playStep(0);
      soundManager.triggerHaptic(10);

      const stepInterval = window.setInterval(() => {
        stepIdx += 1;
        if (stepIdx < coords.length) {
          setAnimatingMove({ tokenId, coord: coords[stepIdx] });
          soundManager.playStep(stepIdx);
        } else {
          clearInterval(stepInterval);
          setAnimatingMove(null);
          if (move.capturesTokenIds.length > 0) {
            soundManager.playCapture();
            soundManager.triggerHaptic(30);
          } else if (move.reachesHome) {
            soundManager.playReachHome();
            soundManager.triggerHaptic(25);
          }
          setGameState((prev) => executeTokenMove(prev, tokenId));
        }
      }, 115);
    },
    [shellState, gameState, animatingMove, settings.reducedMotion]
  );

  // Trigger a dice roll for the current player
  const handleRollDice = useCallback(() => {
    if (
      shellState !== 'playing' ||
      gameState.turnPhase !== 'WAITING_FOR_ROLL' ||
      isRolling ||
      animatingMove !== null
    ) {
      return;
    }

    // Online mode requests server-authoritative roll
    if (
      (gameState.mode === 'friends' || gameState.mode === 'matchmaking') &&
      gameState.roomCode
    ) {
      soundManager.playDiceRoll();
      soundManager.triggerHaptic(15);
      multiplayerClient.requestRollDice(gameState.roomCode);
      return;
    }

    setIsRolling(true);
    soundManager.playDiceRoll();
    soundManager.triggerHaptic(15);

    const rollDelay = settings.reducedMotion ? 60 : 680;
    window.setTimeout(() => {
      const outcome = generateFairDiceRoll();
      if (outcome === 6) {
        soundManager.playSixRolled();
        soundManager.triggerHaptic(22);
      }
      setIsRolling(false);
      setGameState((prev) => commitDiceRoll(prev, outcome));
    }, rollDelay);
  }, [shellState, gameState, isRolling, animatingMove, settings.reducedMotion]);

  // Automatic Turn Transition when a player has no legal moves or rolls three 6s
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      gameState.turnPhase !== 'TURN_TRANSITION' ||
      gameState.mode === 'friends' ||
      gameState.mode === 'matchmaking'
    ) {
      return;
    }

    const allRemainingAreAI = gameState.players
      .filter((p) => !p.hasFinished)
      .every((p) => p.type === 'ai');

    const timer = window.setTimeout(
      () => {
        setGameState((prev) => completeTurnTransition(prev));
      },
      allRemainingAreAI ? 220 : 850
    );

    return () => clearTimeout(timer);
  }, [shellState, gameState.turnPhase, gameState.mode, gameState.players]);

  // Automatic Turn Transition for Online Matches
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      gameState.turnPhase !== 'TURN_TRANSITION' ||
      (gameState.mode !== 'friends' && gameState.mode !== 'matchmaking') ||
      !gameState.roomCode
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (gameState.roomCode) {
        multiplayerClient.requestAdvanceTurn(gameState.roomCode);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [shellState, gameState.turnPhase, gameState.mode, gameState.roomCode]);

  // Automatic AI Opponent Turn Loop (Offline AI & Local Multiplayer with AI Bots)
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      isRolling ||
      animatingMove !== null ||
      gameState.mode === 'friends' ||
      gameState.mode === 'matchmaking'
    ) {
      return;
    }

    const activePlayer = gameState.players[gameState.activePlayerIndex];
    if (!activePlayer || activePlayer.type !== 'ai') {
      return;
    }

    const allRemainingAreAI = gameState.players
      .filter((p) => !p.hasFinished)
      .every((p) => p.type === 'ai');

    if (gameState.turnPhase === 'WAITING_FOR_ROLL') {
      const timer = window.setTimeout(
        () => {
          handleRollDice();
        },
        allRemainingAreAI ? 220 : 650
      );
      return () => clearTimeout(timer);
    }

    if (gameState.turnPhase === 'SELECTING_TOKEN') {
      const timer = window.setTimeout(
        () => {
          const chosenMove = chooseAIMove(
            gameState.legalMoves,
            activePlayer.aiDifficulty || 'medium',
            activePlayer.color,
            gameState.players,
            gameState.rules
          );
          if (chosenMove) {
            handleSelectToken(chosenMove.tokenId);
          }
        },
        allRemainingAreAI ? 200 : 600
      );
      return () => clearTimeout(timer);
    }
  }, [
    shellState,
    gameState,
    isRolling,
    animatingMove,
    handleRollDice,
    handleSelectToken,
  ]);

  const handleRestartMatch = useCallback(() => {
    soundManager.playClick();
    const restarted = createInitialGameState({
      mode: gameState.mode,
      players: gameState.players.map((p) => ({
        color: p.color,
        name: p.name,
        avatar: p.avatar,
        type: p.type,
        aiDifficulty: p.aiDifficulty,
      })),
      rules: gameState.rules,
    });
    setGameState(restarted);
    setShellState('playing');
  }, [gameState.mode, gameState.players, gameState.rules]);

  // Global Keyboard Shortcuts (Enter/Space on Title, Space to Roll, 1-4 to Move Token, P/Esc to Pause, M to Mute, R to Restart)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (shellState === 'title' && activeModal === null) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleQuickPlay();
        }
        return;
      }

      if (shellState === 'playing' && activeModal === null) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setShellState('paused');
          return;
        }
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setSettings((prev) => {
            const next = { ...prev, soundEnabled: !prev.soundEnabled };
            saveSettings(next);
            return next;
          });
          return;
        }
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setActiveModal('rules');
          return;
        }
        if (
          (e.key === 'r' || e.key === 'R') &&
          gameState.mode !== 'friends' &&
          gameState.mode !== 'matchmaking'
        ) {
          e.preventDefault();
          handleRestartMatch();
          return;
        }

        const activePlayer = gameState.players[gameState.activePlayerIndex];
        const isLocalTurn =
          gameState.mode === 'friends' || gameState.mode === 'matchmaking'
            ? assignedColor === activePlayer.color
            : activePlayer.type === 'human';

        if (!isLocalTurn) return;

        if (e.key === ' ' && gameState.turnPhase === 'WAITING_FOR_ROLL') {
          e.preventDefault();
          handleRollDice();
        } else if (
          ['1', '2', '3', '4'].includes(e.key) &&
          gameState.turnPhase === 'SELECTING_TOKEN'
        ) {
          const tokenIndex = Number(e.key) - 1;
          const matchingMove = gameState.legalMoves.find(
            (m) => m.tokenIndex === tokenIndex
          );
          if (matchingMove) {
            e.preventDefault();
            handleSelectToken(matchingMove.tokenId);
          } else if (gameState.legalMoves.length === 1) {
            e.preventDefault();
            handleSelectToken(gameState.legalMoves[0].tokenId);
          }
        }
      } else if (shellState === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setShellState('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    activeModal,
    gameState,
    assignedColor,
    handleQuickPlay,
    handleRollDice,
    handleSelectToken,
    handleRestartMatch,
  ]);

  return (
    <div className={cn("ludo-royale-theme min-h-screen w-full bg-[#0B101E] text-slate-100", className)}>
      {shellState === 'title' ? (
        <MainMenu
          profile={profile}
          stats={stats}
          savedGame={savedGame}
          onQuickPlay={handleQuickPlay}
          onResumeGame={() => {
            if (savedGame) {
              soundManager.playClick();
              setGameState(savedGame);
              setShellState('playing');
            }
          }}
          onOpenSetup={(mode) => {
            soundManager.playClick();
            setActiveModal(mode === 'ai' ? 'setup_ai' : 'setup_local');
          }}
          onOpenOnlineRoom={() => {
            soundManager.playClick();
            setOnlineError(null);
            multiplayerClient.connect();
            setActiveModal('online_friends');
          }}
          onOpenMatchmaking={() => {
            soundManager.playClick();
            setOnlineError(null);
            setMatchmakingStatus('searching');
            multiplayerClient.joinMatchmaking(profile.nickname, profile.avatar);
            setActiveModal('online_matchmaking');
          }}
          onOpenRules={() => {
            soundManager.playClick();
            setActiveModal('rules');
          }}
          onOpenStats={() => {
            soundManager.playClick();
            setStats(loadStats());
            setActiveModal('stats');
          }}
          onOpenSettings={() => {
            soundManager.playClick();
            setActiveModal('settings');
          }}
        />
      ) : (
        /* Full-Viewport Game Shell (Zero-Scroll Portrait & Landscape Layout) */
        <main className="h-[100dvh] w-full overflow-hidden flex flex-col landscape:flex-row lg:flex-row items-center justify-between landscape:justify-center lg:justify-center gap-2 sm:gap-3 lg:gap-6 px-2.5 py-2 sm:px-4 sm:py-3 lg:p-6 max-w-[1440px] mx-auto">
          <div className="flex-1 flex items-center justify-center w-full min-h-0 min-w-0">
            {(() => {
              const activePlayer =
                gameState.players[gameState.activePlayerIndex];
              const isOnline =
                gameState.mode === 'friends' || gameState.mode === 'matchmaking';
              const isLocalPlayersTurn = isOnline
                ? assignedColor === activePlayer.color
                : activePlayer.type === 'human';
              const canRoll =
                gameState.turnPhase === 'WAITING_FOR_ROLL' &&
                isLocalPlayersTurn &&
                !isRolling &&
                animatingMove === null;

              return (
                <LudoBoard
                  players={gameState.players}
                  activeColor={activePlayer.color}
                  legalMoves={gameState.legalMoves}
                  selectedTokenId={gameState.selectedTokenId}
                  theme={settings.boardTheme}
                  colorBlindMode={settings.colorBlindMode}
                  reducedMotion={settings.reducedMotion}
                  showMoveHints={settings.showMoveHints}
                  animatingMove={animatingMove}
                  isRolling={isRolling}
                  diceValue={gameState.diceValue}
                  diceStyle={settings.diceStyle}
                  canRoll={canRoll}
                  onRollDice={handleRollDice}
                  onSelectToken={(tokenId) => {
                    if (activePlayer?.type === 'ai') return;
                    handleSelectToken(tokenId);
                  }}
                />
              );
            })()}
          </div>

          <GameHUD
            gameState={gameState}
            settings={settings}
            isRolling={isRolling}
            isAnimatingMove={animatingMove !== null}
            localAssignedColor={assignedColor}
            onRollDice={handleRollDice}
            onSelectToken={handleSelectToken}
            onToggleSound={() => {
              const next = {
                ...settings,
                soundEnabled: !settings.soundEnabled,
              };
              setSettings(next);
              saveSettings(next);
            }}
            onCycleDiceStyle={() => {
              soundManager.playClick();
              const currentIdx = DICE_STYLE_OPTIONS.findIndex(
                (d) => d.id === settings.diceStyle
              );
              const nextStyle =
                DICE_STYLE_OPTIONS[(currentIdx + 1) % DICE_STYLE_OPTIONS.length]
                  .id;
              const next = {
                ...settings,
                diceStyle: nextStyle,
              };
              setSettings(next);
              saveSettings(next);
            }}
            onCycleBoardTheme={() => {
              soundManager.playClick();
              const activeOpt = getBoardThemeOption(settings.boardTheme);
              const currentIdx = BOARD_THEME_OPTIONS.findIndex(
                (b) => b.id === activeOpt.id
              );
              const nextTheme =
                BOARD_THEME_OPTIONS[
                  (currentIdx + 1) % BOARD_THEME_OPTIONS.length
                ].id;
              const next = {
                ...settings,
                boardTheme: nextTheme,
              };
              setSettings(next);
              saveSettings(next);
            }}
            onOpenRules={() => setActiveModal('rules')}
            onPause={() => setShellState('paused')}
            onRestart={handleRestartMatch}
            onRequestExit={() => setShellState('paused')}
          />
        </main>
      )}

      {/* Status & Utility Modals */}
      {shellState === 'paused' && (
        <PauseModal
          turnNumber={gameState.turnNumber}
          onResume={() => setShellState('playing')}
          onRestart={handleRestartMatch}
          onSaveAndExit={() => {
            saveActiveGame(gameState);
            setSavedGame(loadSavedGame());
            setShellState('title');
          }}
          onExitWebLab={onExit}
        />
      )}

      {shellState === 'gameover' && (
        <VictoryModal
          gameState={gameState}
          onPlayAgain={handleRestartMatch}
          onMainMenu={() => setShellState('title')}
          onExitWebLab={onExit}
        />
      )}

      {(activeModal === 'setup_ai' || activeModal === 'setup_local') && (
        <SetupModal
          mode={activeModal === 'setup_ai' ? 'ai' : 'local'}
          profile={profile}
          initialRules={rules}
          boardTheme={settings.boardTheme}
          onSelectBoardTheme={(nextBoardTheme) => {
            soundManager.playClick();
            const next = { ...settings, boardTheme: nextBoardTheme };
            setSettings(next);
            saveSettings(next);
          }}
          onStartMatch={(players, newRules) =>
            handleStartConfiguredMatch(
              players,
              newRules,
              activeModal === 'setup_ai' ? 'ai' : 'local'
            )
          }
          onClose={() => setActiveModal(null)}
        />
      )}

      {(activeModal === 'online_friends' ||
        activeModal === 'online_matchmaking') && (
        <OnlineModal
          mode={
            activeModal === 'online_matchmaking' ? 'matchmaking' : 'friends'
          }
          room={onlineRoom}
          assignedColor={assignedColor}
          errorMessage={onlineError}
          matchmakingStatus={matchmakingStatus}
          connectionStatus={connectionStatus}
          backendStatus={multiplayerClient.getBackendStatus()}
          onCreateRoom={() => {
            setOnlineError(null);
            multiplayerClient.createRoom(
              profile.nickname,
              profile.avatar,
              rules
            );
          }}
          onJoinRoom={(code) => {
            setOnlineError(null);
            multiplayerClient.joinRoom(code, profile.nickname, profile.avatar);
          }}
          onAddBot={() => {
            if (onlineRoom) {
              multiplayerClient.addBotToRoom(onlineRoom.roomCode);
            }
          }}
          onToggleReady={() => {
            if (onlineRoom) {
              multiplayerClient.toggleReady(onlineRoom.roomCode);
            }
          }}
          onStartOnlineMatch={() => {
            if (onlineRoom) {
              multiplayerClient.startOnlineMatch(onlineRoom.roomCode);
            }
          }}
          onLeaveRoom={() => {
            multiplayerClient.leaveRoom();
            setOnlineRoom(null);
            setOnlineError(null);
          }}
          onCancelMatchmaking={() => {
            multiplayerClient.leaveMatchmaking();
            setMatchmakingStatus('idle');
            setActiveModal(null);
          }}
          onRetryMatchmaking={() => {
            setOnlineError(null);
            setMatchmakingStatus('searching');
            multiplayerClient.joinMatchmaking(profile.nickname, profile.avatar);
          }}
          onClose={() => {
            if (activeModal === 'online_matchmaking') {
              multiplayerClient.leaveMatchmaking();
              setMatchmakingStatus('idle');
            }
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'rules' && (
        <RulesModal rules={rules} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'stats' && (
        <StatsModal stats={stats} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          profile={profile}
          stats={stats}
          settings={settings}
          onUpdateProfile={(nextProfile) => {
            setProfile(nextProfile);
            saveProfile(nextProfile);
          }}
          onUpdateSettings={(nextSettings) => {
            setSettings(nextSettings);
            saveSettings(nextSettings);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

export default LudoRoyaleGame;
