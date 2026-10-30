import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioController } from '../game/audio';
import {
  BIRD_PROFILES,
  BirdId,
  DEFAULT_GAME_CONFIG,
  ENVIRONMENT_PROFILES,
  EnvironmentId,
  GameConfig,
  TUNING_PRESETS,
  WORLD_HEIGHT,
  getBirdProfile,
  getEnvironmentProfile,
} from '../game/config';
import {
  computeDifficultyParams,
  createInitialState,
  getComboTierInfo,
  resetForNewRun,
  selectBird,
  selectEnvironment,
  stepSimulation,
  triggerFlap,
  triggerSpecialAbility,
} from '../game/engine';
import { renderGameCanvas } from '../game/renderer';
import {
  HighScoreQualification,
  LeaderboardEntry,
  LeaderboardTabId,
  SubmitHighScoreResult,
  evaluateHighScoreQualification,
  fetchSharedLeaderboard,
  loadEnvironmentBestScores,
  loadLastPilotName,
  saveEnvironmentBestScore,
  saveLastPilotName,
  submitSharedLeaderboardScore,
} from '../game/leaderboard';
import {
  loadBestScore,
  loadMutedPreference,
  loadSelectedBird,
  loadSelectedEnvironment,
  saveBestScore,
  saveMutedPreference,
  saveSelectedBird,
  saveSelectedEnvironment,
} from '../game/storage';
import { DefeatCause, GamePhase, RunStats, SimulationState } from '../game/types';
import {
  HighScoreNameEntryPanel,
  LeaderboardModal,
} from './LeaderboardModal';
import {
  AbilityIconSvg,
  BirdAvatarSvg,
  EnvironmentIconSvg,
  MedalBadgeSvg,
  PauseIconSvg,
  RestartIconSvg,
  SoundIconSvg,
  TitleEmblemSvg,
  TrophyIconSvg,
  TuningIconSvg,
} from './TitleEmblemSvg';

export interface AetherGliderGameProps {
  /** Optional custom CSS class for the outer game container */
  className?: string;
  /** Optional initial gameplay configuration overrides */
  initialConfig?: Partial<GameConfig>;
  /** LocalStorage key prefix for isolated score/audio persistence */
  storageKeyPrefix?: string;
}

function formatDefeatReason(cause: DefeatCause): string {
  switch (cause) {
    case 'conduit_top':
    case 'conduit_bottom':
      return 'Struck a conduit pillar';
    case 'trap_magma':
      return 'Caught in a Molten Magma Geyser';
    case 'trap_icicle':
      return 'Struck by a Falling Glacial Icicle';
    case 'trap_laser':
      return 'Intercepted by a Cyber Pulse Laser';
    case 'cloud_deck':
      return 'Clipped the lower boundary deck';
    case 'stratosphere':
      return 'Exceeded upper stratosphere ceiling';
    default:
      return 'Run ended';
  }
}

export const AetherGliderGame: React.FC<AetherGliderGameProps> = ({
  className = 'w-full h-dvh',
  initialConfig,
  storageKeyPrefix = 'aether_glider',
}) => {
  const bestScoreKey = `${storageKeyPrefix}_best_score`;
  const mutedKey = `${storageKeyPrefix}_muted`;
  const birdStorageKey = `${storageKeyPrefix}_bird`;
  const envStorageKey = `${storageKeyPrefix}_env`;
  const envBestStorageKey = `${storageKeyPrefix}_env_best_scores`;
  const pilotNameStorageKey = `${storageKeyPrefix}_pilot_name`;

  const [config, setConfig] = useState<GameConfig>(() => ({
    ...DEFAULT_GAME_CONFIG,
    ...initialConfig,
  }));
  const configRef = useRef<GameConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [selectedBirdId, setSelectedBirdId] = useState<BirdId>(() =>
    loadSelectedBird(birdStorageKey)
  );
  const selectedBird = getBirdProfile(selectedBirdId);

  const [selectedEnvId, setSelectedEnvId] = useState<EnvironmentId>(() =>
    loadSelectedEnvironment(envStorageKey)
  );
  const selectedEnv = getEnvironmentProfile(selectedEnvId);

  const [activePresetId, setActivePresetId] = useState<string>('standard');
  const [showTuningModal, setShowTuningModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<LeaderboardTabId>('global');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const leaderboardEntriesRef = useRef<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(true);
  const [leaderboardLoadError, setLeaderboardLoadError] = useState<string | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);
  const [envBestScores, setEnvBestScores] = useState<Record<EnvironmentId, number>>(() =>
    loadEnvironmentBestScores(envBestStorageKey)
  );
  const [pilotName, setPilotName] = useState<string>(() =>
    loadLastPilotName(pilotNameStorageKey)
  );
  const [highScoreQualification, setHighScoreQualification] =
    useState<HighScoreQualification | null>(null);
  const [submittedRunResult, setSubmittedRunResult] =
    useState<SubmitHighScoreResult | null>(null);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [quickSubmitError, setQuickSubmitError] = useState<string | null>(null);
  const [quickSubmitSuccess, setQuickSubmitSuccess] = useState<string | null>(null);

  const [muted, setMuted] = useState<boolean>(() => loadMutedPreference(mutedKey));
  const audioRef = useRef<AudioController | null>(null);

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    const controller = new AudioController(loadMutedPreference(mutedKey));
    controller.setEnvironmentMusic(loadSelectedEnvironment(envStorageKey), 'title');
    audioRef.current = controller;
    return () => {
      controller.dispose();
      audioRef.current = null;
    };
  }, [envStorageKey, mutedKey]);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => loadBestScore(bestScoreKey));
  const [comboCount, setComboCount] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [tierLabel, setTierLabel] = useState<string>('Calm Skies');
  const [runStats, setRunStats] = useState<RunStats | null>(null);

  const [abilityStatusText, setAbilityStatusText] = useState<string>('READY');
  const [abilityReady, setAbilityReady] = useState<boolean>(true);
  const [abilityActive, setAbilityActive] = useState<boolean>(false);
  const [loadoutTab, setLoadoutTab] = useState<'aviator' | 'realm'>('aviator');
  const [isCompactHeight, setIsCompactHeight] = useState<boolean>(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<SimulationState>(
    createInitialState(
      config,
      loadBestScore(bestScoreKey),
      480,
      WORLD_HEIGHT,
      1337,
      loadSelectedBird(birdStorageKey),
      loadSelectedEnvironment(envStorageKey)
    )
  );
  const heldKeysRef = useRef<Set<string>>(new Set());
  const preRunGlobalBestRef = useRef<number>(loadBestScore(bestScoreKey));
  const preRunEnvBestRef = useRef<number>(
    loadEnvironmentBestScores(envBestStorageKey)[loadSelectedEnvironment(envStorageKey)] ?? 0
  );

  const syncPhaseAttr = useCallback((nextPhase: GamePhase) => {
    setPhase(nextPhase);
    audioRef.current?.setMusicPhase(nextPhase);
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.state = nextPhase;
    }
  }, []);

  const handleSelectBird = useCallback(
    (birdId: BirdId, e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.stopPropagation();
        e.currentTarget.blur();
      }
      setSelectedBirdId(birdId);
      saveSelectedBird(birdId, birdStorageKey);
      selectBird(simRef.current, birdId);
      setAbilityStatusText('READY');
      setAbilityReady(true);
      setAbilityActive(false);
      audioRef.current?.playBirdSelect(birdId);
    },
    [birdStorageKey]
  );

  const handleSelectEnvironment = useCallback(
    (envId: EnvironmentId, e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.stopPropagation();
        e.currentTarget.blur();
      }
      setSelectedEnvId(envId);
      saveSelectedEnvironment(envId, envStorageKey);
      selectEnvironment(simRef.current, envId);
      audioRef.current?.playEnvironmentSelect(envId, simRef.current.phase);
    },
    [envStorageKey]
  );

  const handleToggleMute = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.stopPropagation();
        e.currentTarget.blur();
      }
      setMuted((prev) => {
        const next = !prev;
        saveMutedPreference(next, mutedKey);
        audioRef.current?.setMuted(next);
        if (!next) {
          audioRef.current?.setEnvironmentMusic(simRef.current.environmentId, simRef.current.phase);
          audioRef.current?.playClick();
        }
        return next;
      });
    },
    [mutedKey]
  );

  const handleStartOrRestart = useCallback(
    (e?: React.MouseEvent<HTMLElement>) => {
      if (e) {
        e.stopPropagation();
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.blur();
        }
      }
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const sim = simRef.current;
      const currentBest = loadBestScore(bestScoreKey);
      sim.bestScore = Math.max(sim.bestScore, currentBest);
      preRunGlobalBestRef.current = sim.bestScore;
      const currentEnvBests = loadEnvironmentBestScores(envBestStorageKey);
      preRunEnvBestRef.current = currentEnvBests[sim.environmentId] ?? 0;

      resetForNewRun(sim, configRef.current, Date.now());
      heldKeysRef.current.clear();

      setShowTuningModal(false);
      setShowLeaderboardModal(false);
      setScore(0);
      setComboCount(0);
      setComboMultiplier(1);
      setBestScore(sim.bestScore);
      setAbilityStatusText('READY');
      setAbilityReady(true);
      setAbilityActive(false);
      const diff = computeDifficultyParams(0, configRef.current);
      setSpeedMultiplier(diff.multiplier);
      setTierLabel(diff.tierLabel);
      setRunStats(null);
      setHighScoreQualification(null);
      setSubmittedRunResult(null);
      setNameValidationError(null);
      syncPhaseAttr('playing');
      audioRef.current?.setEnvironmentMusic(sim.environmentId, 'playing');
      audioRef.current?.playFlap(sim.birdId);
    },
    [bestScoreKey, envBestStorageKey, syncPhaseAttr]
  );

  const handleReturnToTitle = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.stopPropagation();
        e.currentTarget.blur();
      }
      const sim = simRef.current;
      sim.phase = 'title';
      sim.obstacles = [];
      sim.pendingGameOver = false;
      sim.score = 0;
      sim.comboCount = 0;
      sim.comboMultiplier = 1;
      sim.abilityActiveTimer = 0;
      sim.abilityCooldownTimer = 0;
      sim.shieldActive = false;
      setShowTuningModal(false);
      setShowLeaderboardModal(false);
      setScore(0);
      setComboCount(0);
      setComboMultiplier(1);
      syncPhaseAttr('title');
      audioRef.current?.playClick();
    },
    [syncPhaseAttr]
  );

  const handleTogglePause = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.stopPropagation();
        e.currentTarget.blur();
      }
      const sim = simRef.current;
      if (sim.phase === 'playing' && !sim.pendingGameOver) {
        sim.phase = 'paused';
        heldKeysRef.current.clear();
        syncPhaseAttr('paused');
        audioRef.current?.playClick();
      } else if (sim.phase === 'paused') {
        sim.phase = 'playing';
        setShowTuningModal(false);
        setShowLeaderboardModal(false);
        heldKeysRef.current.clear();
        syncPhaseAttr('playing');
        audioRef.current?.playClick();
      }
    },
    [syncPhaseAttr]
  );

  const getLeaderboardApiEndpoint = useCallback((): string => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('simulateLeaderboardError') === '1') {
        return '/api/leaderboard?simulateError=1';
      }
    }
    return '/api/leaderboard';
  }, []);

  const refreshSharedLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true);
    const res = await fetchSharedLeaderboard(getLeaderboardApiEndpoint());
    setIsLeaderboardLoading(false);
    if (res.ok) {
      setLeaderboardLoadError(null);
      setLeaderboardEntries(res.entries);
      leaderboardEntriesRef.current = res.entries;
    } else {
      setLeaderboardLoadError(
        res.error ?? 'Unable to load shared leaderboard from server.'
      );
      setLeaderboardEntries([]);
      leaderboardEntriesRef.current = [];
    }
  }, [getLeaderboardApiEndpoint]);

  useEffect(() => {
    void refreshSharedLeaderboard();
  }, [refreshSharedLeaderboard]);

  const handleOpenLeaderboard = useCallback(
    (tab?: LeaderboardTabId, e?: React.MouseEvent<HTMLElement>) => {
      if (e) {
        e.stopPropagation();
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.blur();
        }
      }
      const sim = simRef.current;
      if (sim.phase === 'playing' && !sim.pendingGameOver) {
        sim.phase = 'paused';
        heldKeysRef.current.clear();
        syncPhaseAttr('paused');
      }
      setShowTuningModal(false);
      setQuickSubmitError(null);
      setQuickSubmitSuccess(null);
      if (tab) {
        setActiveLeaderboardTab(tab);
      }
      setShowLeaderboardModal(true);
      void refreshSharedLeaderboard();
      audioRef.current?.playClick();
    },
    [refreshSharedLeaderboard, syncPhaseAttr]
  );

  const handleSubmitRunHighScore = useCallback(async () => {
    if (isSubmittingScore) return;
    const finalScore = runStats?.score ?? score;
    const targetBird = runStats?.birdId ?? selectedBirdId;
    const targetEnv = runStats?.environmentId ?? selectedEnvId;

    setIsSubmittingScore(true);
    setNameValidationError(null);
    const res = await submitSharedLeaderboardScore(
      {
        playerName: pilotName,
        score: finalScore,
        birdId: targetBird,
        environmentId: targetEnv,
        maxCombo: runStats?.maxCombo ?? comboCount,
        peakComboMultiplier: runStats?.peakComboMultiplier ?? comboMultiplier,
        medal: runStats?.medal,
      },
      getLeaderboardApiEndpoint()
    );
    setIsSubmittingScore(false);

    if (!res.ok) {
      setNameValidationError(
        res.error ?? 'Unable to record score to shared leaderboard.'
      );
      return;
    }

    setNameValidationError(null);
    setLeaderboardLoadError(null);
    setLeaderboardEntries(res.entries);
    leaderboardEntriesRef.current = res.entries;
    setSubmittedRunResult(res);
    setHighlightedEntryId(res.entry?.id ?? null);
    const updatedEnvBests = saveEnvironmentBestScore(
      targetEnv,
      finalScore,
      envBestStorageKey
    );
    setEnvBestScores(updatedEnvBests);
    if (res.entry) {
      setPilotName(res.entry.playerName);
      saveLastPilotName(res.entry.playerName, pilotNameStorageKey);
    }
    audioRef.current?.playMilestone();
  }, [
    comboCount,
    comboMultiplier,
    envBestStorageKey,
    getLeaderboardApiEndpoint,
    isSubmittingScore,
    pilotName,
    pilotNameStorageKey,
    runStats,
    score,
    selectedBirdId,
    selectedEnvId,
  ]);

  const handleQuickSubmitScore = useCallback(
    async (targetEnvId: EnvironmentId) => {
      if (isSubmittingScore) return;
      const envBest = envBestScores[targetEnvId] ?? 0;
      const candidateScore = Math.max(score, envBest, bestScore);

      setIsSubmittingScore(true);
      setQuickSubmitError(null);
      setQuickSubmitSuccess(null);
      const res = await submitSharedLeaderboardScore(
        {
          playerName: pilotName,
          score: candidateScore,
          birdId: selectedBirdId,
          environmentId: targetEnvId,
          maxCombo: runStats?.maxCombo ?? comboCount,
          peakComboMultiplier: runStats?.peakComboMultiplier ?? comboMultiplier,
        },
        getLeaderboardApiEndpoint()
      );
      setIsSubmittingScore(false);

      if (!res.ok) {
        setQuickSubmitError(
          res.error ?? 'Unable to record score to shared leaderboard.'
        );
        setQuickSubmitSuccess(null);
        return;
      }

      setQuickSubmitError(null);
      setLeaderboardLoadError(null);
      setLeaderboardEntries(res.entries);
      leaderboardEntriesRef.current = res.entries;
      setHighlightedEntryId(res.entry?.id ?? null);
      const updatedEnvBests = saveEnvironmentBestScore(
        targetEnvId,
        candidateScore,
        envBestStorageKey
      );
      setEnvBestScores(updatedEnvBests);
      if (res.entry) {
        setPilotName(res.entry.playerName);
        saveLastPilotName(res.entry.playerName, pilotNameStorageKey);
        const realmShort = getEnvironmentProfile(targetEnvId).shortName;
        if (res.keptExistingBest) {
          setQuickSubmitSuccess(
            `Kept higher shared record for ${res.entry.playerName} (${res.entry.score} pts) — Global #${res.globalRank} · ${realmShort} #${res.environmentRank}`
          );
        } else {
          setQuickSubmitSuccess(
            `Recorded ${res.entry.playerName} (${res.entry.score} pts) — Global #${res.globalRank} · ${realmShort} #${res.environmentRank}`
          );
        }
      }
      audioRef.current?.playMilestone();
    },
    [
      bestScore,
      comboCount,
      comboMultiplier,
      envBestScores,
      envBestStorageKey,
      getLeaderboardApiEndpoint,
      isSubmittingScore,
      pilotName,
      pilotNameStorageKey,
      runStats,
      score,
      selectedBirdId,
    ]
  );

  const handlePlayerFlapAction = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase === 'title') {
      handleStartOrRestart();
      return;
    }
    if (sim.phase !== 'playing' || sim.pendingGameOver) {
      return;
    }
    const flapped = triggerFlap(sim, configRef.current, reducedMotionRef.current);
    if (flapped) {
      audioRef.current?.playFlap(sim.birdId);
    }
  }, [handleStartOrRestart]);

  const handleTriggerAbility = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>): boolean => {
      if (e) {
        e.stopPropagation();
        e.currentTarget.blur();
      }
      const sim = simRef.current;
      const used = triggerSpecialAbility(sim, configRef.current, reducedMotionRef.current);
      if (used) {
        setScore(sim.score);
        if (sim.score > sim.bestScore || sim.isNewBest) {
          const saved = saveBestScore(sim.score, bestScoreKey);
          sim.bestScore = saved;
          setBestScore(saved);
        }
        const updatedEnvBests = saveEnvironmentBestScore(
          sim.environmentId,
          sim.score,
          envBestStorageKey
        );
        setEnvBestScores(updatedEnvBests);
        setAbilityActive(true);
        setAbilityReady(false);
        setAbilityStatusText(`ACTIVE ${sim.abilityActiveTimer.toFixed(1)}s`);
        audioRef.current?.playAbility(sim.birdId);
      }
      return used;
    },
    [bestScoreKey, envBestStorageKey]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleStartOrRestart();
    } else {
      syncPhaseAttr('title');
    }
  }, [handleStartOrRestart, syncPhaseAttr]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateCanvasMetrics = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      setIsCompactHeight(rect.height < 540);
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : rect.width;
      setIsMobileOrTablet(viewportWidth <= 1024 || rect.width <= 1024);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const aspect = rect.width / rect.height;
      const logicalHeight = WORLD_HEIGHT;
      const logicalWidth = Math.max(360, Math.min(1800, Math.round(logicalHeight * aspect)));

      canvas.width = Math.round(logicalWidth * dpr);
      canvas.height = Math.round(logicalHeight * dpr);

      const sim = simRef.current;
      sim.worldWidth = logicalWidth;
      sim.worldHeight = logicalHeight;
      sim.player.x = Math.max(90, Math.min(180, Math.round(logicalWidth * 0.22)));
    };

    updateCanvasMetrics();
    const observer = new ResizeObserver(updateCanvasMetrics);
    observer.observe(container);
    window.addEventListener('resize', updateCanvasMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateCanvasMetrics);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let lastAbilityHudSync = '';

    const frameLoop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = simRef.current;
      const cfg = configRef.current;
      const rm = reducedMotionRef.current;

      const events = stepSimulation(sim, rawDt, cfg, rm);

      if (sim.phase === 'playing') {
        let nextStatus = 'READY';
        let isReady = true;
        let isActive = false;
        if (sim.abilityActiveTimer > 0) {
          nextStatus = `ACTIVE ${sim.abilityActiveTimer.toFixed(1)}s`;
          isReady = false;
          isActive = true;
        } else if (sim.abilityCooldownTimer > 0) {
          nextStatus = `${sim.abilityCooldownTimer.toFixed(1)}s`;
          isReady = false;
          isActive = false;
        }
        if (nextStatus !== lastAbilityHudSync) {
          lastAbilityHudSync = nextStatus;
          setAbilityStatusText(nextStatus);
          setAbilityReady(isReady);
          setAbilityActive(isActive);
        }
      }

      if (events.trapTriggered) {
        audioRef.current?.playTrapSound(events.trapTriggered);
      }

      if (events.scoredPoint || events.shieldBlocked || events.comboBroken) {
        setScore(sim.score);
        setComboCount(sim.comboCount);
        setComboMultiplier(sim.comboMultiplier);
        const diff = computeDifficultyParams(sim.score, cfg);
        setSpeedMultiplier(diff.multiplier);
        setTierLabel(diff.tierLabel);

        if (sim.score > sim.bestScore || sim.isNewBest) {
          const saved = saveBestScore(sim.score, bestScoreKey);
          sim.bestScore = saved;
          setBestScore(saved);
        }
        const updatedEnvBests = saveEnvironmentBestScore(
          sim.environmentId,
          sim.score,
          envBestStorageKey
        );
        setEnvBestScores(updatedEnvBests);

        if (events.shieldBlocked) {
          audioRef.current?.playShieldShatter();
        } else if (events.comboTierUp) {
          audioRef.current?.playComboTierUp(sim.comboMultiplier);
        } else if (events.milestoneReached) {
          audioRef.current?.playMilestone();
        } else if (events.scoredPoint) {
          audioRef.current?.playScore(sim.score, sim.comboMultiplier);
        }
      }

      if (events.collided) {
        setComboCount(0);
        setComboMultiplier(1);
        const saved = saveBestScore(sim.score, bestScoreKey);
        sim.bestScore = saved;
        if (sim.frozenRunStats) {
          sim.frozenRunStats.bestScore = saved;
        }
        setBestScore(saved);

        const updatedEnvBests = saveEnvironmentBestScore(
          sim.environmentId,
          sim.score,
          envBestStorageKey
        );
        setEnvBestScores(updatedEnvBests);

        const currentEntries = leaderboardEntriesRef.current;
        const qual = evaluateHighScoreQualification(
          currentEntries,
          sim.score,
          sim.environmentId,
          preRunGlobalBestRef.current,
          preRunEnvBestRef.current
        );
        setHighScoreQualification(qual);
        void refreshSharedLeaderboard();

        audioRef.current?.setMusicPhase('gameover');
        audioRef.current?.playCollision(sim.causeOfDefeat);
      }

      if (events.gameOverTransitioned) {
        setRunStats(sim.frozenRunStats);
        syncPhaseAttr('gameover');
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scaleX = canvas.width / sim.worldWidth;
          const scaleY = canvas.height / sim.worldHeight;
          ctx.save();
          ctx.scale(scaleX, scaleY);
          renderGameCanvas(ctx, sim, cfg.visualRadius, rm);
          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(frameLoop);
    };

    rafId = window.requestAnimationFrame(frameLoop);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [bestScoreKey, envBestStorageKey, refreshSharedLeaderboard, syncPhaseAttr]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Do not intercept keystrokes when typing inside Pilot Callsign / Leaderboard inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const code = e.code;
      const key = e.key.toLowerCase();

      if (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'KeyW'
      ) {
        e.preventDefault();
      }

      if (heldKeysRef.current.has(code)) return;
      heldKeysRef.current.add(code);

      const sim = simRef.current;

      if (code === 'KeyM') {
        handleToggleMute();
        return;
      }

      if (code === 'KeyL') {
        if (showLeaderboardModal) {
          setShowLeaderboardModal(false);
        } else {
          handleOpenLeaderboard(sim.environmentId);
        }
        return;
      }

      if (code === 'KeyE' || code === 'ShiftLeft' || code === 'ShiftRight') {
        if (sim.phase === 'playing' && !showLeaderboardModal && !showTuningModal) {
          e.preventDefault();
          handleTriggerAbility();
        }
        return;
      }

      // Cycle environment with Q in any phase (Title, Playing, Paused, Game Over)
      if (code === 'KeyQ' && !showLeaderboardModal) {
        const idx = ENVIRONMENT_PROFILES.findIndex((env) => env.id === sim.environmentId);
        const nextEnv = ENVIRONMENT_PROFILES[(idx + 1) % ENVIRONMENT_PROFILES.length];
        if (sim.phase === 'title' || sim.phase === 'gameover') {
          setLoadoutTab('realm');
        }
        handleSelectEnvironment(nextEnv.id);
        return;
      }

      if (code === 'Digit1' && sim.phase === 'title' && !showLeaderboardModal) {
        setLoadoutTab('aviator');
        handleSelectBird('kora');
        return;
      }
      if (code === 'Digit2' && sim.phase === 'title' && !showLeaderboardModal) {
        setLoadoutTab('aviator');
        handleSelectBird('zephyr');
        return;
      }
      if (code === 'Digit3' && sim.phase === 'title' && !showLeaderboardModal) {
        setLoadoutTab('aviator');
        handleSelectBird('ignis');
        return;
      }
      if (code === 'Digit4' && sim.phase === 'title' && !showLeaderboardModal) {
        setLoadoutTab('aviator');
        handleSelectBird('chronos');
        return;
      }
      if (code === 'Digit5' && sim.phase === 'title' && !showLeaderboardModal) {
        setLoadoutTab('aviator');
        handleSelectBird('valkyrie');
        return;
      }
      if (code === 'Digit6' && sim.phase === 'title' && !showLeaderboardModal) {
        setLoadoutTab('aviator');
        handleSelectBird('volt');
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (showLeaderboardModal) {
          setShowLeaderboardModal(false);
          return;
        }
        if (showTuningModal) {
          setShowTuningModal(false);
          return;
        }
        if (sim.phase === 'playing' || sim.phase === 'paused') {
          handleTogglePause();
        }
        return;
      }

      if (code === 'KeyR' && !showLeaderboardModal && !showTuningModal) {
        if (sim.phase === 'playing' || sim.phase === 'paused' || sim.phase === 'gameover') {
          handleStartOrRestart();
        }
        return;
      }

      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || key === ' ') {
        if (showTuningModal || showLeaderboardModal) return;
        if (sim.phase === 'title' || sim.phase === 'gameover') {
          handleStartOrRestart();
        } else if (sim.phase === 'playing') {
          handlePlayerFlapAction();
        }
        return;
      }

      if (code === 'Enter') {
        if (showTuningModal || showLeaderboardModal) return;
        if (sim.phase === 'title' || sim.phase === 'gameover') {
          e.preventDefault();
          handleStartOrRestart();
        } else if (sim.phase === 'paused') {
          e.preventDefault();
          handleTogglePause();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    const clearHeldInputs = () => {
      heldKeysRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldInputs);
    document.addEventListener('visibilitychange', clearHeldInputs);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldInputs);
      document.removeEventListener('visibilitychange', clearHeldInputs);
    };
  }, [
    handleOpenLeaderboard,
    handlePlayerFlapAction,
    handleSelectBird,
    handleSelectEnvironment,
    handleStartOrRestart,
    handleToggleMute,
    handleTogglePause,
    handleTriggerAbility,
    showLeaderboardModal,
    showTuningModal,
  ]);

  const applyPreset = (presetId: string) => {
    const found = TUNING_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setConfig((prev) => ({
      ...prev,
      ...found.config,
    }));
    audioRef.current?.playClick();
  };

  return (
    <div
      ref={containerRef}
      data-game-root="aether-glider"
      data-state={phase}
      data-bird={selectedBirdId}
      data-environment={selectedEnvId}
      className={`relative overflow-hidden select-none bg-[#0F1326] text-amber-50 ${className}`}
      style={{
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        touchAction: 'none',
      }}
    >
      {/* Screen-reader live region for accessible score announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === 'playing'
          ? `Flying as ${selectedBird.name} in ${selectedEnv.name}. Trap: ${selectedEnv.trapName}. Score ${score}. Combo ${comboMultiplier}x (${comboCount} streak).`
          : phase === 'gameover'
          ? `Game Over. Final score ${runStats?.score ?? score}. Max combo ${runStats?.maxCombo ?? 0} (${runStats?.peakComboMultiplier ?? 1}x). Best score ${bestScore}.`
          : `Aether Glider ready. Bird: ${selectedBird.name}. Environment: ${selectedEnv.name} (${selectedEnv.trapName}).`}
      </div>

      {/* Isolated High-DPI Canvas2D Playfield */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        aria-label={
          isMobileOrTablet
            ? 'Aether Glider interactive sky playfield. Tap to flap upward. Tap Ability button to activate special ability.'
            : 'Aether Glider interactive sky playfield. Click or press Space to flap upward.'
        }
        onPointerDown={(e) => {
          if (e.button === 2 && phase === 'playing') {
            e.preventDefault();
            handleTriggerAbility();
            return;
          }
          if (e.button !== 0 && e.pointerType === 'mouse') return;
          e.preventDefault();
          if (phase === 'playing') {
            handlePlayerFlapAction();
          } else if (phase === 'title' && !showTuningModal && !showLeaderboardModal) {
            handleStartOrRestart();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full cursor-pointer"
      />

      {/* World-Matched Perimeter HUD (Pointer Pass-Through) */}
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-between ${
          isCompactHeight ? 'p-2' : 'p-3 sm:p-6'
        }`}
      >
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className={`flex ${isCompactHeight ? 'flex-row items-center gap-2' : 'flex-col items-start gap-2'}`}>
            {/* Top-Left Telemetry Plaque (Global Best + Realm Best) */}
            <div
              className={`pointer-events-auto flex items-center gap-2 sm:gap-2.5 rounded-xl ${
                isCompactHeight ? 'px-2.5 py-1' : 'px-2.5 sm:px-3.5 py-1.5 sm:py-2'
              }`}
              style={{
                backgroundColor: 'rgba(20, 14, 30, 0.88)',
                border: `2px solid ${selectedEnv.colors.accentHex}`,
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div>
                <div className="text-[9px] sm:text-[10px] font-bold tracking-widest text-amber-300/80 uppercase whitespace-nowrap">
                  {phase === 'playing' ? (
                    <>
                      <span className="sm:hidden">Best</span>
                      <span className="hidden sm:inline">Global Best</span>
                    </>
                  ) : (
                    'Global Best'
                  )}
                </div>
                <div
                  data-testid="hud-best-score"
                  className={`${
                    isCompactHeight ? 'text-sm' : 'text-base sm:text-lg'
                  } font-extrabold text-amber-100 leading-tight`}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {bestScore}
                </div>
              </div>

              <div
                className={`${
                  phase === 'playing' ? 'hidden sm:block' : 'block'
                } h-6 w-[1px] bg-amber-700/50`}
                aria-hidden="true"
              />

              <div className={phase === 'playing' ? 'hidden sm:block' : 'block'}>
                <div
                  className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
                  style={{ color: selectedEnv.colors.accentHex }}
                >
                  {selectedEnv.shortName} Best
                </div>
                <div
                  data-testid="hud-env-best-score"
                  className={`${
                    isCompactHeight ? 'text-sm' : 'text-base sm:text-lg'
                  } font-extrabold text-amber-200 leading-tight`}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {envBestScores[selectedEnvId] ?? 0}
                </div>
              </div>

              {phase === 'playing' && (
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="h-6 w-[1px] bg-amber-700/50" aria-hidden="true" />
                  <div>
                    <div
                      className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
                      style={{ color: selectedEnv.colors.accentHex }}
                    >
                      {selectedEnv.shortName} · {selectedEnv.trapName}
                    </div>
                    <div
                      className="text-[11px] sm:text-xs font-bold text-amber-200/90 whitespace-nowrap"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {speedMultiplier.toFixed(2)}x · {tierLabel}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* In-Flight Special Ability Button [E] (Desktop only; Mobile/Tablet use dedicated bottom-right ability button) */}
            {phase === 'playing' && !isMobileOrTablet && (
              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-ability-button"
                onClick={handleTriggerAbility}
                disabled={!abilityReady && !abilityActive}
                aria-label={`Activate ${selectedBird.abilityName} (${
                  isMobileOrTablet ? 'Ability Button' : 'Press E'
                }). Status: ${abilityStatusText}`}
                className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 rounded-xl ${
                  isCompactHeight ? 'px-2 py-1' : 'px-2.5 sm:px-3 py-1.5 sm:py-2'
                } text-left transition-transform active:scale-95 cursor-pointer disabled:opacity-65`}
                style={{
                  backgroundColor: abilityActive
                    ? 'rgba(180, 83, 9, 0.94)'
                    : abilityReady
                    ? 'rgba(20, 14, 30, 0.92)'
                    : 'rgba(15, 12, 24, 0.78)',
                  border: abilityActive
                    ? '2px solid #FEF3C7'
                    : abilityReady
                    ? `2px solid ${selectedBird.colors.auraHex}`
                    : '2px solid #475569',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
                }}
              >
                <AbilityIconSvg
                  birdId={selectedBirdId}
                  className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] sm:text-xs font-extrabold text-amber-100 whitespace-nowrap">
                      {selectedBird.abilityName}
                    </span>
                    <span
                      className="text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded bg-amber-950/90 text-amber-300 whitespace-nowrap"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {isMobileOrTablet ? 'ABILITY' : '[E]'}
                    </span>
                  </div>
                  <div
                    data-testid="hud-ability-status"
                    className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                      color: abilityActive
                        ? '#FEF08A'
                        : abilityReady
                        ? '#34D399'
                        : '#94A3B8',
                    }}
                  >
                    {abilityStatusText}
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Top-Center Live Score & Combo Multiplier Display during Active Play */}
          {phase === 'playing' && (() => {
            const comboTier = getComboTierInfo(comboCount);
            return (
              <div className="flex flex-col items-center shrink-0">
                <div
                  data-testid="hud-live-score"
                  className={`${
                    isCompactHeight ? 'text-3xl leading-none' : 'text-3xl sm:text-6xl leading-none'
                  } font-extrabold tracking-tight text-amber-200 select-none`}
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow:
                      '0 4px 0 #1C120C, 0 -2px 0 #1C120C, 3px 0 0 #1C120C, -3px 0 0 #1C120C, 0 10px 24px rgba(0,0,0,0.65)',
                  }}
                >
                  {score}
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-amber-100/90 uppercase">
                  Score
                </span>

                {/* Live Combo Multiplier & Dodge Streak Badge */}
                <div
                  data-testid="hud-combo-badge"
                  data-combo-count={comboCount}
                  data-combo-multiplier={comboMultiplier}
                  className={`mt-1 flex flex-col items-center rounded-lg px-2 py-0.5 transition-transform ${
                    comboMultiplier > 1 ? 'scale-105' : 'opacity-90'
                  }`}
                  style={{
                    backgroundColor: 'rgba(18, 13, 28, 0.9)',
                    border: `1.5px solid ${
                      comboMultiplier > 1 ? comboTier.colorHex : 'rgba(217, 119, 6, 0.45)'
                    }`,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      data-testid="hud-combo-multiplier"
                      className="text-[11px] sm:text-xs font-extrabold"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontVariantNumeric: 'tabular-nums',
                        color: comboTier.colorHex,
                      }}
                    >
                      {comboMultiplier}x COMBO
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-100/80">
                      · {comboCount} {comboCount === 1 ? 'DODGE' : 'STREAK'}
                    </span>
                  </div>
                  {/* Tier progress bar */}
                  <div className="mt-0.5 h-1 w-full rounded-full bg-slate-900/90 overflow-hidden">
                    <div
                      className="h-full transition-all duration-200 rounded-full"
                      style={{
                        width: `${Math.max(8, Math.round(comboTier.progressToNext * 100))}%`,
                        backgroundColor: comboTier.colorHex,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Top-Right Compact Utility Icon Buttons */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              data-testid="open-leaderboard-button"
              onClick={(e) => handleOpenLeaderboard(selectedEnvId, e)}
              aria-label="Open Global and Environment Leaderboards (L)"
              title="Hall of Fame Leaderboards [L]"
              className={`${
                phase === 'playing' ? 'hidden sm:flex' : 'flex'
              } h-9 sm:h-11 px-2.5 sm:px-3 items-center justify-center gap-1.5 rounded-xl transition-transform active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400`}
              style={{
                backgroundColor: showLeaderboardModal
                  ? 'rgba(180, 83, 9, 0.92)'
                  : 'rgba(20, 14, 30, 0.9)',
                border: '2px solid #FBBF24',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
              }}
            >
              <TrophyIconSvg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="hidden sm:inline text-xs font-extrabold text-amber-100 whitespace-nowrap">
                Ranks
              </span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={handleToggleMute}
              aria-label={muted ? 'Unmute sound effects (M)' : 'Mute sound effects (M)'}
              aria-pressed={!muted}
              title={muted ? 'Unmute Sound [M]' : 'Mute Sound [M]'}
              className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              style={{
                backgroundColor: 'rgba(20, 14, 30, 0.9)',
                border: '2px solid #B45309',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
              }}
            >
              <SoundIconSvg muted={muted} />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                if (phase === 'playing') {
                  handleTogglePause();
                }
                setShowLeaderboardModal(false);
                setShowTuningModal((v) => !v);
                audioRef.current?.playClick();
              }}
              aria-label="Gameplay tuning and accessibility settings"
              title="Tuning & Settings"
              className={`${
                phase === 'playing' ? 'hidden sm:flex' : 'flex'
              } h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400`}
              style={{
                backgroundColor: showTuningModal
                  ? 'rgba(180, 83, 9, 0.92)'
                  : 'rgba(20, 14, 30, 0.9)',
                border: '2px solid #B45309',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
              }}
            >
              <TuningIconSvg />
            </button>

            {phase === 'playing' && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={handleTogglePause}
                  aria-label="Pause game (P)"
                  title="Pause Game [P]"
                  className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                  style={{
                    backgroundColor: 'rgba(20, 14, 30, 0.9)',
                    border: '2px solid #B45309',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  <PauseIconSvg />
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={handleStartOrRestart}
                  aria-label="Restart run (R)"
                  title="Restart Run [R]"
                  className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                  style={{
                    backgroundColor: 'rgba(20, 14, 30, 0.9)',
                    border: '2px solid #B45309',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  <RestartIconSvg />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Area: Mobile/Tablet Dedicated Ability Action Button + Control Hint */}
        <div className="relative flex flex-col items-center justify-end">
          {/* Dedicated On-Screen Ability Button — Exclusively for Mobile & Tablet View */}
          {phase === 'playing' && isMobileOrTablet && (
            <div
              className={`pointer-events-auto self-end ${
                isCompactHeight ? 'mb-1 mr-1' : 'mb-2 sm:mb-3 mr-1 sm:mr-2'
              }`}
            >
              <button
                type="button"
                tabIndex={-1}
                data-testid="mobile-ability-button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTriggerAbility();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTriggerAbility(e);
                }}
                disabled={!abilityReady && !abilityActive}
                aria-label={`Activate ${selectedBird.abilityName} ability. Status: ${abilityStatusText}`}
                className={`group flex items-center gap-2.5 rounded-2xl ${
                  isCompactHeight
                    ? 'px-3 py-2'
                    : 'px-3.5 py-2.5 sm:px-4 sm:py-3'
                } text-left transition-transform active:scale-90 cursor-pointer select-none disabled:opacity-65`}
                style={{
                  backgroundColor: abilityActive
                    ? 'rgba(180, 83, 9, 0.96)'
                    : abilityReady
                    ? 'rgba(20, 14, 30, 0.94)'
                    : 'rgba(15, 12, 24, 0.82)',
                  border: abilityActive
                    ? '2.5px solid #FEF3C7'
                    : abilityReady
                    ? `2.5px solid ${selectedBird.colors.auraHex}`
                    : '2px solid #475569',
                  boxShadow: abilityActive
                    ? '0 0 22px rgba(251, 191, 36, 0.75), 0 8px 20px rgba(0, 0, 0, 0.6)'
                    : abilityReady
                    ? `0 0 18px ${selectedBird.colors.auraHex}55, 0 8px 20px rgba(0, 0, 0, 0.6)`
                    : '0 6px 16px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className={`flex items-center justify-center rounded-xl ${
                    isCompactHeight ? 'w-9 h-9' : 'w-11 h-11 sm:w-12 sm:h-12'
                  } shrink-0`}
                  style={{
                    backgroundColor: abilityActive
                      ? 'rgba(254, 243, 199, 0.22)'
                      : abilityReady
                      ? 'rgba(245, 158, 11, 0.18)'
                      : 'rgba(51, 65, 85, 0.35)',
                    border: abilityActive
                      ? '1.5px solid #FEF3C7'
                      : abilityReady
                      ? `1.5px solid ${selectedBird.colors.auraHex}`
                      : '1.5px solid #64748B',
                  }}
                >
                  <AbilityIconSvg
                    birdId={selectedBirdId}
                    className={isCompactHeight ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'}
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase text-amber-300/90 leading-none"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    ABILITY
                  </span>
                  <span
                    className={`${
                      isCompactHeight ? 'text-xs' : 'text-xs sm:text-sm'
                    } font-extrabold text-amber-50 whitespace-nowrap leading-tight mt-0.5`}
                  >
                    {selectedBird.abilityName}
                  </span>
                  <span
                    data-testid="mobile-ability-status"
                    className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap leading-tight mt-0.5"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontVariantNumeric: 'tabular-nums',
                      color: abilityActive
                        ? '#FEF08A'
                        : abilityReady
                        ? '#34D399'
                        : '#94A3B8',
                    }}
                  >
                    {abilityStatusText}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Bottom Safe Margin Control Hint */}
          <div className="flex justify-center pb-0.5">
            <p
              className="text-center text-[10px] sm:text-xs font-medium tracking-wide text-amber-100/95 px-2 py-0.5 whitespace-nowrap"
              style={{
                textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)',
              }}
            >
              {isMobileOrTablet
                ? 'Tap Flap · Ability Button · P Pause · M Mute'
                : 'Space / Click Flap · E Ability · Q Realm · P Pause · M Mute'}
            </p>
          </div>
        </div>
      </div>

      {/* TITLE / READY SCREEN OVERLAY */}
      {phase === 'title' && !showTuningModal && !showLeaderboardModal && (
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-between ${
            isCompactHeight ? 'pt-1 pb-1.5 px-4' : 'py-5 sm:py-10 px-3 sm:px-4'
          }`}
        >
          {/* Upper Negative-Space Emblem Lockup */}
          <div
            className={`pointer-events-auto flex flex-col items-center text-center max-w-md w-full ${
              isCompactHeight ? 'mt-0' : 'mt-11 sm:mt-2'
            }`}
          >
            <TitleEmblemSvg
              className={isCompactHeight ? '!max-w-[175px]' : '!max-w-[245px] sm:!max-w-[380px]'}
            />
            {!isCompactHeight && (
              <p
                className="mt-1 text-xs sm:text-sm font-medium text-amber-100/95 max-w-sm"
                style={{
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
                  textWrap: 'balance',
                }}
              >
                Choose your Aviator or Sky Realm below, then launch into the brass-and-sky horizon.
              </p>
            )}
          </div>

          {/* Lower Tabbed Loadout Selector & Launch CTA Cluster */}
          <div
            className={`pointer-events-auto flex flex-col items-center w-full ${
              isCompactHeight
                ? 'gap-1 mb-6 max-w-xl'
                : 'gap-1.5 sm:gap-2 mb-5 sm:mb-6 max-w-xl'
            }`}
          >
            {/* Segmented Loadout Switcher: [ Aviator & Ability ] vs [ Sky Realm ] */}
            <div
              role="tablist"
              aria-label="Flight Loadout Category"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl w-full"
              style={{
                backgroundColor: 'rgba(13, 9, 22, 0.92)',
                border: '1.5px solid rgba(180, 83, 9, 0.6)',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
              }}
            >
              <button
                type="button"
                role="tab"
                data-testid="loadout-tab-aviator"
                aria-selected={loadoutTab === 'aviator'}
                onClick={(e) => {
                  e.stopPropagation();
                  setLoadoutTab('aviator');
                  audioRef.current?.playClick();
                }}
                className={`flex items-center justify-start gap-2 rounded-xl ${
                  isCompactHeight ? 'py-1 px-2' : 'py-1.5 sm:py-2 px-2.5 sm:px-3'
                } transition-all cursor-pointer min-w-0 focus-visible:outline-2 focus-visible:outline-amber-300`}
                style={{
                  backgroundColor:
                    loadoutTab === 'aviator'
                      ? 'rgba(38, 27, 58, 0.98)'
                      : 'rgba(18, 13, 28, 0.45)',
                  border:
                    loadoutTab === 'aviator'
                      ? `2px solid ${selectedBird.colors.auraHex}`
                      : '1.5px solid transparent',
                  boxShadow:
                    loadoutTab === 'aviator'
                      ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                      : 'none',
                }}
              >
                <BirdAvatarSvg
                  birdId={selectedBirdId}
                  className={isCompactHeight ? 'w-5 h-5 shrink-0' : 'w-6 h-6 sm:w-7 sm:h-7 shrink-0'}
                />
                <div className="text-left min-w-0 flex-1 overflow-hidden">
                  <div className="text-[11px] sm:text-xs font-extrabold text-amber-50 whitespace-nowrap truncate leading-tight">
                    Aviator: {selectedBird.name}
                  </div>
                  <div
                    className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap truncate leading-tight"
                    style={{ color: selectedBird.colors.auraHex }}
                  >
                    {selectedBird.abilityName}
                  </div>
                </div>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="loadout-tab-realm"
                aria-selected={loadoutTab === 'realm'}
                onClick={(e) => {
                  e.stopPropagation();
                  setLoadoutTab('realm');
                  audioRef.current?.playClick();
                }}
                className={`flex items-center justify-start gap-2 rounded-xl ${
                  isCompactHeight ? 'py-1 px-2' : 'py-1.5 sm:py-2 px-2.5 sm:px-3'
                } transition-all cursor-pointer min-w-0 focus-visible:outline-2 focus-visible:outline-amber-300`}
                style={{
                  backgroundColor:
                    loadoutTab === 'realm'
                      ? 'rgba(38, 27, 58, 0.98)'
                      : 'rgba(18, 13, 28, 0.45)',
                  border:
                    loadoutTab === 'realm'
                      ? `2px solid ${selectedEnv.colors.accentHex}`
                      : '1.5px solid transparent',
                  boxShadow:
                    loadoutTab === 'realm'
                      ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                      : 'none',
                }}
              >
                <div
                  className={`flex items-center justify-center rounded-lg ${
                    isCompactHeight ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'
                  } shrink-0`}
                  style={{
                    backgroundColor: 'rgba(15, 11, 24, 0.75)',
                    border: `1px solid ${selectedEnv.colors.accentHex}66`,
                  }}
                >
                  <EnvironmentIconSvg
                    envId={selectedEnvId}
                    className={isCompactHeight ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'}
                  />
                </div>
                <div className="text-left min-w-0 flex-1 overflow-hidden">
                  <div className="text-[11px] sm:text-xs font-extrabold text-amber-50 whitespace-nowrap truncate leading-tight">
                    Realm: {selectedEnv.shortName}
                  </div>
                  <div
                    className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap truncate leading-tight"
                    style={{ color: selectedEnv.colors.accentHex }}
                  >
                    {selectedEnv.trapName}
                  </div>
                </div>
              </button>
            </div>

            {/* Active Tab Panel 1: 6 Clockwork Birds & Focused Ability Plaque */}
            {loadoutTab === 'aviator' && (
              <>
                <div
                  role="group"
                  aria-label="Choose Clockwork Bird"
                  className={`grid ${
                    isCompactHeight
                      ? 'grid-cols-6 gap-1.5'
                      : 'grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2'
                  } w-full`}
                >
                  {BIRD_PROFILES.map((bird) => {
                    const isSelected = bird.id === selectedBirdId;
                    return (
                      <button
                        key={bird.id}
                        type="button"
                        data-testid={`select-bird-${bird.id}`}
                        aria-pressed={isSelected}
                        onClick={(e) => handleSelectBird(bird.id, e)}
                        className={`flex items-center justify-start gap-1.5 sm:gap-2 rounded-xl overflow-hidden min-w-0 ${
                          isCompactHeight ? 'py-1 px-1.5' : 'py-1.5 sm:py-2 px-2 sm:px-2.5'
                        } transition-transform active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300`}
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(30, 22, 46, 0.96)'
                            : 'rgba(17, 13, 28, 0.86)',
                          border: isSelected
                            ? `2px solid ${bird.colors.auraHex}`
                            : '1.5px solid rgba(146, 64, 14, 0.5)',
                        }}
                      >
                        <BirdAvatarSvg
                          birdId={bird.id}
                          className={
                            isCompactHeight
                              ? 'w-5 h-5 shrink-0'
                              : 'w-6 h-6 sm:w-7 sm:h-7 shrink-0'
                          }
                        />
                        <div className="text-left min-w-0 overflow-hidden">
                          <div className="text-[11px] sm:text-xs font-extrabold text-amber-100 whitespace-nowrap truncate leading-tight">
                            {bird.name}
                          </div>
                          <div
                            className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap truncate"
                            style={{ color: bird.colors.auraHex }}
                          >
                            {bird.abilityName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!isCompactHeight && (
                  <div
                    data-testid="selected-loadout-card"
                    className="w-full rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-left flex items-center gap-2.5 sm:gap-3"
                    style={{
                      backgroundColor: 'rgba(18, 13, 28, 0.94)',
                      border: `1.5px solid ${selectedBird.colors.auraHex}`,
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0"
                      style={{
                        backgroundColor: 'rgba(30, 22, 46, 0.95)',
                        border: `1.5px solid ${selectedBird.colors.auraHex}`,
                      }}
                    >
                      <AbilityIconSvg
                        birdId={selectedBirdId}
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs font-extrabold text-amber-100">
                        <span>{selectedBird.name}</span>
                        <span aria-hidden="true" className="text-amber-500/60">·</span>
                        <span style={{ color: selectedBird.colors.auraHex }}>
                          {isMobileOrTablet ? 'Ability' : '[E]'}: {selectedBird.abilityName} ({selectedBird.abilityCooldownSec}s CD)
                        </span>
                        <span aria-hidden="true" className="text-amber-500/60">·</span>
                        <span className="text-amber-300/90 font-semibold">
                          Passive: {selectedBird.passiveName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] sm:text-[11px] text-amber-100/85 leading-snug line-clamp-2">
                        {selectedBird.abilityDesc} {selectedBird.passiveDesc}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Active Tab Panel 2: 5 Sky Environments & Focused Hazard Plaque */}
            {loadoutTab === 'realm' && (
              <>
                <div
                  role="group"
                  aria-label="Choose Sky Environment"
                  className={`grid ${
                    isCompactHeight
                      ? 'grid-cols-5 gap-1.5'
                      : 'grid-cols-6 sm:grid-cols-5 gap-1.5 sm:gap-2'
                  } w-full`}
                >
                  {ENVIRONMENT_PROFILES.map((env, index) => {
                    const isSelected = env.id === selectedEnvId;
                    const mobileSpanClass = isCompactHeight
                      ? ''
                      : index < 3
                      ? 'col-span-2 sm:col-span-1'
                      : 'col-span-3 sm:col-span-1';
                    return (
                      <button
                        key={env.id}
                        type="button"
                        data-testid={`select-env-${env.id}`}
                        aria-pressed={isSelected}
                        onClick={(e) => handleSelectEnvironment(env.id, e)}
                        className={`${mobileSpanClass} flex flex-col items-center justify-center rounded-xl overflow-hidden min-w-0 ${
                          isCompactHeight ? 'py-1 px-1.5' : 'py-1.5 sm:py-2 px-2'
                        } transition-transform active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300`}
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(28, 22, 44, 0.96)'
                            : 'rgba(15, 11, 24, 0.86)',
                          border: isSelected
                            ? `2px solid ${env.colors.accentHex}`
                            : '1.5px solid rgba(146, 64, 14, 0.45)',
                        }}
                      >
                        <div className="flex items-center justify-center gap-1 max-w-full overflow-hidden">
                          <EnvironmentIconSvg
                            envId={env.id}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                          />
                          <span className="text-[11px] sm:text-xs font-extrabold text-amber-100 whitespace-nowrap truncate">
                            {env.shortName}
                          </span>
                        </div>
                        <span
                          className="text-[9px] sm:text-[10px] font-bold whitespace-nowrap truncate max-w-full"
                          style={{ color: env.colors.accentHex }}
                        >
                          {env.trapName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!isCompactHeight && (
                  <div
                    data-testid="selected-loadout-card"
                    className="w-full rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-left flex items-center gap-2.5 sm:gap-3"
                    style={{
                      backgroundColor: 'rgba(18, 13, 28, 0.94)',
                      border: `1.5px solid ${selectedEnv.colors.accentHex}`,
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0"
                      style={{
                        backgroundColor: 'rgba(28, 22, 44, 0.95)',
                        border: `1.5px solid ${selectedEnv.colors.accentHex}`,
                      }}
                    >
                      <EnvironmentIconSvg
                        envId={selectedEnvId}
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs font-extrabold text-amber-100">
                        <span>{selectedEnv.name}</span>
                        <span aria-hidden="true" className="text-amber-500/60">·</span>
                        <span style={{ color: selectedEnv.colors.accentHex }}>
                          Hazard: {selectedEnv.trapName}
                        </span>
                        <span aria-hidden="true" className="text-amber-500/60">·</span>
                        <span className="text-amber-300/90 font-semibold">
                          Realm Best: {envBestScores[selectedEnvId] ?? 0}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] sm:text-[11px] text-amber-100/85 leading-snug line-clamp-2">
                        {selectedEnv.trapDesc}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Primary Launch CTA + Unified Leaderboard & Speed Presets Row */}
            <div
              className={`flex ${
                isCompactHeight
                  ? 'flex-row items-center gap-1.5'
                  : 'flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2'
              } w-full`}
            >
              {isCompactHeight && (
                <div
                  data-testid="selected-loadout-card"
                  className="hidden sm:flex flex-col justify-center rounded-xl px-2.5 py-1 text-left min-w-0 max-w-[195px] shrink"
                  style={{
                    backgroundColor: 'rgba(18, 13, 28, 0.94)',
                    border: `1.5px solid ${selectedEnv.colors.accentHex}`,
                  }}
                >
                  <div className="text-[10px] font-extrabold text-amber-100 whitespace-nowrap truncate">
                    {selectedBird.name} ({selectedBird.abilityName}) · {selectedEnv.shortName}
                  </div>
                  <div className="text-[9px] text-amber-100/75 whitespace-nowrap truncate">
                    Trap: {selectedEnv.trapName}
                  </div>
                </div>
              )}

              <button
                type="button"
                data-start="true"
                onClick={handleStartOrRestart}
                className={`flex-1 ${
                  isCompactHeight ? 'py-1.5 px-4 text-xs sm:text-sm' : 'py-2.5 sm:py-3 px-6 text-base sm:text-lg'
                } rounded-xl font-extrabold tracking-wide text-amber-950 transition-transform hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer whitespace-nowrap`}
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  backgroundColor: '#FBBF24',
                  border: '2px solid #FEF3C7',
                  boxShadow: isCompactHeight
                    ? '0 3px 0 #92400E, 0 6px 12px rgba(0, 0, 0, 0.45)'
                    : '0 4px 0 #92400E, 0 8px 16px rgba(0, 0, 0, 0.5)',
                }}
              >
                Launch Flight
              </button>

              {/* Unified Secondary Bar on Mobile Portrait; Inline on Tablet/Desktop */}
              <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  data-testid="title-leaderboard-button"
                  onClick={(e) => handleOpenLeaderboard('global', e)}
                  className={`flex items-center justify-center gap-1.5 ${
                    isCompactHeight ? 'py-1.5 px-2.5 text-xs' : 'py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm'
                  } rounded-xl font-extrabold text-amber-100 transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0`}
                  style={{
                    backgroundColor: 'rgba(28, 20, 44, 0.94)',
                    border: '2px solid #FBBF24',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  <TrophyIconSvg className="w-4 h-4 shrink-0" />
                  <span className="sm:hidden">Ranks</span>
                  <span className="hidden sm:inline">Leaderboards</span>
                </button>

                <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial">
                  {TUNING_PRESETS.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={`${
                          isCompactHeight ? 'py-1.5 px-2 text-[10px]' : 'py-2 sm:py-2.5 px-2 sm:px-2.5 text-[11px] sm:text-xs'
                        } rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap truncate focus-visible:outline-2 focus-visible:outline-amber-300`}
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(245, 158, 11, 0.92)'
                            : 'rgba(20, 14, 30, 0.88)',
                          color: isSelected ? '#1C120C' : '#FDE68A',
                          border: isSelected ? '1.5px solid #FEF3C7' : '1.5px solid #78350F',
                        }}
                      >
                        {preset.label === 'Gentle Breeze' ? (
                          <>
                            <span className="sm:hidden">Gentle</span>
                            <span className="hidden sm:inline">{preset.label}</span>
                          </>
                        ) : (
                          preset.label
                        )}
                      </button>
                    );
                  })}
                </div>

                <a
                  href="/web-lab"
                  className="py-1.5 px-3 rounded-xl text-xs font-bold text-amber-200/80 transition-colors hover:bg-amber-900/30 text-center cursor-pointer whitespace-nowrap self-center sm:self-auto"
                  style={{
                    backgroundColor: '#1E162B',
                    border: '1px solid rgba(146, 64, 14, 0.4)',
                  }}
                >
                  Exit to Web Lab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL CARD */}
      {phase === 'paused' && !showTuningModal && !showLeaderboardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="pointer-events-auto absolute inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(12, 10, 22, 0.72)' }}
        >
          <div
            className={`w-full max-w-sm rounded-2xl ${
              isCompactHeight ? 'p-4' : 'p-5 sm:p-6'
            } text-center my-auto`}
            style={{
              backgroundColor: '#1B1429',
              border: '3px solid #D97706',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
            }}
          >
            <h2
              id="pause-modal-title"
              className={`${
                isCompactHeight ? 'text-xl' : 'text-2xl sm:text-3xl'
              } font-extrabold tracking-tight text-amber-200`}
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Flight Paused
            </h2>
            <p className="mt-0.5 text-xs font-medium text-amber-100/75">
              {selectedBird.name} · {selectedEnv.name} ({selectedEnv.trapName})
            </p>

            <div className={`${isCompactHeight ? 'mt-3' : 'mt-5'} grid grid-cols-2 gap-3`}>
              <div
                className="flex flex-col justify-between rounded-xl p-2.5 sm:p-3"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(217, 119, 6, 0.4)',
                }}
              >
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300/75 whitespace-nowrap">
                  Current Score
                </div>
                <div
                  className="mt-0.5 text-xl sm:text-2xl font-extrabold text-amber-100"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {score}
                </div>
              </div>

              <div
                className="flex flex-col justify-between rounded-xl p-2.5 sm:p-3"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(217, 119, 6, 0.4)',
                }}
              >
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300/75 whitespace-nowrap">
                  Best Score
                </div>
                <div
                  className="mt-0.5 text-xl sm:text-2xl font-extrabold text-amber-300"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {bestScore}
                </div>
              </div>
            </div>

            <div className={`${isCompactHeight ? 'mt-3' : 'mt-6'} flex flex-col gap-2`}>
              <button
                type="button"
                onClick={handleTogglePause}
                className={`w-full ${
                  isCompactHeight ? 'py-2 text-sm' : 'py-3 text-base'
                } px-5 rounded-xl font-extrabold text-amber-950 transition-transform active:scale-98 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300`}
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  backgroundColor: '#FBBF24',
                  border: '2px solid #FEF3C7',
                  boxShadow: '0 4px 0 #92400E',
                }}
              >
                Resume Flight
              </button>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleStartOrRestart}
                  className="py-2 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-100 transition-colors hover:bg-amber-900/40 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
                  style={{
                    backgroundColor: '#291E3A',
                    border: '1.5px solid #92400E',
                  }}
                >
                  Restart Run
                </button>

                <button
                  type="button"
                  onClick={handleReturnToTitle}
                  className="py-2 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-100 transition-colors hover:bg-amber-900/40 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
                  style={{
                    backgroundColor: '#291E3A',
                    border: '1.5px solid #92400E',
                  }}
                >
                  Change Loadout
                </button>
              </div>

              <a
                href="/web-lab"
                className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-amber-200/80 transition-colors hover:bg-amber-900/30 text-center cursor-pointer whitespace-nowrap block"
                style={{
                  backgroundColor: '#1E162B',
                  border: '1px solid rgba(146, 64, 14, 0.4)',
                }}
              >
                Exit to Web Lab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL CARD */}
      {phase === 'gameover' && !showTuningModal && !showLeaderboardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="pointer-events-auto absolute inset-0 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(12, 10, 22, 0.76)' }}
        >
          <div
            className={`w-full max-w-md rounded-2xl ${
              isCompactHeight ? 'p-3' : 'p-3.5 sm:p-5'
            } text-center my-auto`}
            style={{
              backgroundColor: '#1B1429',
              border: '3px solid #D97706',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-amber-400">
              {selectedBird.name} · {selectedEnv.name}
            </div>
            <h2
              id="gameover-modal-title"
              className={`mt-0.5 ${
                isCompactHeight ? 'text-xl' : 'text-2xl sm:text-3xl'
              } font-extrabold tracking-tight text-amber-100`}
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Flight Concluded
            </h2>
            <p className="mt-0.5 text-xs font-medium text-amber-200/80">
              {formatDefeatReason(runStats?.causeOfDefeat ?? 'none')}
            </p>

            {/* Medal Recognition Row */}
            {!isCompactHeight && (
              <div
                className="mt-2 flex items-center justify-between rounded-xl px-3.5 py-1.5"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1.5px solid rgba(217, 119, 6, 0.45)',
                }}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80 whitespace-nowrap">
                  Wing Rating
                </span>
                <MedalBadgeSvg medal={runStats?.medal ?? 'none'} />
              </div>
            )}

            {/* 4 Tabular Stat Tiles (Score, Best Run, Max Combo, Flight Time) */}
            <div className={`${isCompactHeight ? 'mt-2' : 'mt-2'} grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2`}>
              <div
                className="flex flex-col justify-between rounded-xl p-2"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/75 whitespace-nowrap">
                  Score
                </div>
                <div
                  data-testid="gameover-final-score"
                  className={`mt-0.5 ${
                    isCompactHeight ? 'text-lg' : 'text-xl sm:text-2xl'
                  } font-extrabold text-amber-100`}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {runStats?.score ?? score}
                </div>
              </div>

              <div
                className="flex flex-col justify-between rounded-xl p-2"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/75 whitespace-nowrap">
                  {runStats?.isNewBest ? 'New Best!' : 'Best Run'}
                </div>
                <div
                  data-testid="gameover-best-score"
                  className={`mt-0.5 ${
                    isCompactHeight ? 'text-lg' : 'text-xl sm:text-2xl'
                  } font-extrabold text-amber-400`}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {runStats?.bestScore ?? bestScore}
                </div>
              </div>

              <div
                className="flex flex-col justify-between rounded-xl p-2"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/75 whitespace-nowrap">
                  Max Combo
                </div>
                <div
                  data-testid="gameover-max-combo"
                  className={`mt-0.5 ${
                    isCompactHeight ? 'text-lg' : 'text-xl sm:text-2xl'
                  } font-extrabold text-emerald-400 whitespace-nowrap`}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {runStats?.maxCombo ?? 0}{' '}
                  <span className="text-xs font-bold text-amber-300">
                    ({runStats?.peakComboMultiplier ?? 1}x)
                  </span>
                </div>
              </div>

              <div
                className="flex flex-col justify-between rounded-xl p-2"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/75 whitespace-nowrap">
                  Flight Time
                </div>
                <div
                  className={`mt-0.5 ${
                    isCompactHeight ? 'text-lg' : 'text-xl sm:text-2xl'
                  } font-extrabold text-sky-300`}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {(runStats?.flightTimeSec ?? 0).toFixed(0)}s
                </div>
              </div>
            </div>

            {/* High-Score Player Name Entry Panel */}
            <HighScoreNameEntryPanel
              score={runStats?.score ?? score}
              environmentId={runStats?.environmentId ?? selectedEnvId}
              qualification={
                highScoreQualification ?? {
                  qualifies: (runStats?.score ?? score) > 0,
                  isNewGlobalPersonalBest: Boolean(runStats?.isNewBest),
                  isNewEnvironmentPersonalBest: (runStats?.score ?? score) > 0,
                  projectedGlobalRank: null,
                  projectedEnvironmentRank: null,
                }
              }
              pilotName={pilotName}
              onPilotNameChange={(val) => {
                setPilotName(val);
                if (nameValidationError) setNameValidationError(null);
              }}
              onSubmit={() => void handleSubmitRunHighScore()}
              isSubmitting={isSubmittingScore}
              validationError={nameValidationError}
              submittedResult={submittedRunResult}
              onOpenLeaderboard={(tab) => handleOpenLeaderboard(tab)}
              isCompactHeight={isCompactHeight}
            />

            {/* Tabbed Quick Loadout Switcher inside Game Over (Aviator vs Sky Realm) */}
            <div className={`${isCompactHeight ? 'mt-1.5 space-y-1' : 'mt-2 space-y-1.5'}`}>
              <div
                role="tablist"
                aria-label="Switch Loadout for Next Run"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl"
                style={{
                  backgroundColor: '#120D1D',
                  border: '1px solid rgba(180, 83, 9, 0.45)',
                }}
              >
                <button
                  type="button"
                  role="tab"
                  data-testid="gameover-tab-aviator"
                  aria-selected={loadoutTab === 'aviator'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoadoutTab('aviator');
                    audioRef.current?.playClick();
                  }}
                  className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap truncate"
                  style={{
                    backgroundColor: loadoutTab === 'aviator' ? '#291E3A' : 'transparent',
                    color: loadoutTab === 'aviator' ? '#FEF3C7' : '#D97706',
                    border:
                      loadoutTab === 'aviator'
                        ? `1.5px solid ${selectedBird.colors.auraHex}`
                        : '1.5px solid transparent',
                  }}
                >
                  <BirdAvatarSvg birdId={selectedBirdId} className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Aviator: {selectedBird.name}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  data-testid="gameover-tab-realm"
                  aria-selected={loadoutTab === 'realm'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoadoutTab('realm');
                    audioRef.current?.playClick();
                  }}
                  className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap truncate"
                  style={{
                    backgroundColor: loadoutTab === 'realm' ? '#291E3A' : 'transparent',
                    color: loadoutTab === 'realm' ? '#FEF3C7' : '#D97706',
                    border:
                      loadoutTab === 'realm'
                        ? `1.5px solid ${selectedEnv.colors.accentHex}`
                        : '1.5px solid transparent',
                  }}
                >
                  <EnvironmentIconSvg envId={selectedEnvId} className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Realm: {selectedEnv.shortName}
                  </span>
                </button>
              </div>

              {loadoutTab === 'aviator' ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {BIRD_PROFILES.map((bird) => {
                    const isSelected = bird.id === selectedBirdId;
                    return (
                      <button
                        key={bird.id}
                        type="button"
                        data-testid={`gameover-select-bird-${bird.id}`}
                        onClick={(e) => handleSelectBird(bird.id, e)}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg overflow-hidden min-w-0 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isSelected ? '#291E3A' : '#120D1D',
                          border: isSelected
                            ? `1.5px solid ${bird.colors.auraHex}`
                            : '1px solid rgba(146, 64, 14, 0.35)',
                        }}
                      >
                        <BirdAvatarSvg birdId={bird.id} className="w-4 h-4 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-bold text-amber-100 whitespace-nowrap truncate">
                          {bird.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-5 gap-1">
                  {ENVIRONMENT_PROFILES.map((env, index) => {
                    const isSelected = env.id === selectedEnvId;
                    const mobileSpan =
                      index < 3 ? 'col-span-2 sm:col-span-1' : 'col-span-3 sm:col-span-1';
                    return (
                      <button
                        key={env.id}
                        type="button"
                        data-testid={`gameover-select-env-${env.id}`}
                        onClick={(e) => handleSelectEnvironment(env.id, e)}
                        className={`${mobileSpan} flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg overflow-hidden min-w-0 cursor-pointer transition-colors`}
                        style={{
                          backgroundColor: isSelected ? '#291E3A' : '#120D1D',
                          border: isSelected
                            ? `1.5px solid ${env.colors.accentHex}`
                            : '1px solid rgba(146, 64, 14, 0.35)',
                        }}
                      >
                        <EnvironmentIconSvg envId={env.id} className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-100 whitespace-nowrap truncate max-w-full">
                          {env.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${isCompactHeight ? 'mt-2 flex-row' : 'mt-2.5 flex-col'} flex gap-1.5 sm:gap-2`}>
              <button
                type="button"
                data-start="true"
                onClick={handleStartOrRestart}
                className={`flex-1 ${
                  isCompactHeight ? 'py-2 text-sm' : 'py-2.5 text-base sm:text-lg'
                } px-5 rounded-xl font-extrabold text-amber-950 transition-transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300`}
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  backgroundColor: '#FBBF24',
                  border: '2px solid #FEF3C7',
                  boxShadow: '0 4px 0 #92400E',
                }}
              >
                Play Again
              </button>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  data-testid="gameover-leaderboard-button"
                  onClick={(e) =>
                    handleOpenLeaderboard(runStats?.environmentId ?? selectedEnvId, e)
                  }
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold text-amber-200 transition-colors hover:bg-amber-900/40 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
                  style={{
                    backgroundColor: '#291E3A',
                    border: '1.5px solid #FBBF24',
                  }}
                >
                  <TrophyIconSvg className="w-4 h-4 shrink-0" />
                  <span>Leaderboards</span>
                </button>

                <button
                  type="button"
                  onClick={handleReturnToTitle}
                  className="py-2 px-3 rounded-xl text-xs sm:text-sm font-bold text-amber-100 transition-colors hover:bg-amber-900/40 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
                  style={{
                    backgroundColor: '#291E3A',
                    border: '1.5px solid #92400E',
                  }}
                >
                  Return to Title
                </button>
              </div>

              <a
                href="/web-lab"
                className="w-full py-2 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-200/80 transition-colors hover:bg-amber-900/30 text-center cursor-pointer whitespace-nowrap block"
                style={{
                  backgroundColor: '#1E162B',
                  border: '1px solid rgba(146, 64, 14, 0.4)',
                }}
              >
                Exit to Web Lab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* GAMEPLAY TUNING & ACCESSIBILITY MODAL */}
      {showTuningModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tuning-modal-title"
          className="pointer-events-auto absolute inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(12, 10, 22, 0.8)' }}
        >
          <div
            className={`w-full max-w-md rounded-2xl ${
              isCompactHeight ? 'p-4' : 'p-5 sm:p-6'
            } text-left my-auto`}
            style={{
              backgroundColor: '#1B1429',
              border: '3px solid #D97706',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2
                id="tuning-modal-title"
                className="text-lg sm:text-xl font-extrabold text-amber-200"
                style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
              >
                Clockwork Tuning & Comfort
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href="/web-lab"
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/40 cursor-pointer"
                  style={{ border: '1px solid #92400E' }}
                >
                  Exit to Web Lab
                </a>
                <button
                  type="button"
                  onClick={() => setShowTuningModal(false)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-amber-200 hover:bg-amber-900/40 cursor-pointer"
                  style={{ border: '1px solid #92400E' }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className={`${isCompactHeight ? 'mt-2 space-y-2' : 'mt-4 space-y-3.5'} text-xs`}>
              <div>
                <div className="flex justify-between font-bold text-amber-100 mb-0.5">
                  <label htmlFor="tune-gravity">Gravity Pull</label>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {config.gravity} u/s²
                  </span>
                </div>
                <input
                  id="tune-gravity"
                  type="range"
                  min={800}
                  max={1600}
                  step={20}
                  value={config.gravity}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, gravity: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-amber-100 mb-0.5">
                  <label htmlFor="tune-flap">Flap Lift Impulse</label>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {Math.abs(config.flapVelocity)} u/s
                  </span>
                </div>
                <input
                  id="tune-flap"
                  type="range"
                  min={300}
                  max={500}
                  step={5}
                  value={Math.abs(config.flapVelocity)}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      flapVelocity: -Math.abs(Number(e.target.value)),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-amber-100 mb-0.5">
                  <label htmlFor="tune-speed">Base Wind Speed</label>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {config.baseObstacleSpeed} u/s
                  </span>
                </div>
                <input
                  id="tune-speed"
                  type="range"
                  min={130}
                  max={280}
                  step={5}
                  value={config.baseObstacleSpeed}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      baseObstacleSpeed: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-amber-100 mb-0.5">
                  <label htmlFor="tune-gap">Starting Conduit Gap</label>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {config.initialGapHeight} px
                  </span>
                </div>
                <input
                  id="tune-gap"
                  type="range"
                  min={130}
                  max={220}
                  step={4}
                  value={config.initialGapHeight}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      initialGapHeight: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="pt-1.5 flex items-center justify-between border-t border-amber-900/50">
                <label htmlFor="toggle-reduced-motion" className="font-bold text-amber-100">
                  Reduced Motion Mode
                </label>
                <input
                  id="toggle-reduced-motion"
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="h-4 w-4 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className={`${isCompactHeight ? 'mt-3' : 'mt-5'} flex gap-2.5`}>
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-bold text-amber-100 cursor-pointer"
                style={{
                  backgroundColor: '#291E3A',
                  border: '1.5px solid #92400E',
                }}
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowTuningModal(false)}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-extrabold text-amber-950 cursor-pointer"
                style={{
                  backgroundColor: '#FBBF24',
                  border: '1.5px solid #FEF3C7',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL & PER-ENVIRONMENT LEADERBOARD MODAL */}
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        activeTab={activeLeaderboardTab}
        onSelectTab={(tab) => {
          setActiveLeaderboardTab(tab);
          setQuickSubmitError(null);
          setQuickSubmitSuccess(null);
          audioRef.current?.playClick();
        }}
        entries={leaderboardEntries}
        isLoading={isLeaderboardLoading}
        loadError={leaderboardLoadError}
        isSubmitting={isSubmittingScore}
        onRefresh={() => void refreshSharedLeaderboard()}
        globalBestScore={bestScore}
        envBestScores={envBestScores}
        selectedEnvironmentId={selectedEnvId}
        highlightedEntryId={highlightedEntryId}
        pilotName={pilotName}
        onPilotNameChange={(val) => {
          setPilotName(val);
          if (quickSubmitError) setQuickSubmitError(null);
        }}
        onQuickSubmitScore={(targetEnvId) => void handleQuickSubmitScore(targetEnvId)}
        quickSubmitError={quickSubmitError}
        quickSubmitSuccess={quickSubmitSuccess}
        isCompactHeight={isCompactHeight}
      />
    </div>
  );
};

export default AetherGliderGame;
