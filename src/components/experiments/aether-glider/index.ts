export { AetherGliderGame } from './components/AetherGliderGame';
export type { AetherGliderGameProps } from './components/AetherGliderGame';
export { LeaderboardModal } from './components/LeaderboardModal';
export type { LeaderboardModalProps } from './components/LeaderboardModal';
export {
  BIRD_PROFILES,
  ENVIRONMENT_PROFILES,
  DEFAULT_GAME_CONFIG,
  TUNING_PRESETS,
} from './game/config';
export type {
  BirdId,
  BirdProfile,
  EnvironmentId,
  EnvironmentProfile,
  GameConfig,
} from './game/config';
export {
  loadLeaderboardEntries,
  saveLeaderboardEntries,
  getGlobalLeaderboard,
  getEnvironmentLeaderboard,
  submitLeaderboardScore,
  validatePilotName,
} from './game/leaderboard';
export type {
  LeaderboardEntry,
  LeaderboardTabId,
  HighScoreQualification,
  SubmitHighScoreInput,
  SubmitHighScoreResult,
} from './game/leaderboard';
