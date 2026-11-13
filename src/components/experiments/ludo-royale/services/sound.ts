import { DiceStyle, HapticIntensity } from '../game/gameTypes';

export const LAVA_CUBE_IDLE_AUDIO_ASSET =
  '/assets/aistudio/Create_a_subtle_volc__4-1794493498531_1b63f895.wav';

export const LAVA_CUBE_ROLL_AUDIO_ASSET =
  '/assets/aistudio/lava_cube_rolling.wav';

export const ELECTRO_CUBE_IDLE_AUDIO_ASSET =
  '/assets/aistudio/A_futuristic_electri__4-1794495895509_a7071723.wav';

export const ELECTRO_CUBE_ROLL_AUDIO_ASSET =
  '/assets/aistudio/electro_cube_rolling.wav';

export const TESSERACT_CUBE_IDLE_AUDIO_ASSET =
  '/assets/aistudio/tesseract_cube_idle.wav';

export const TESSERACT_CUBE_ROLL_AUDIO_ASSET =
  '/assets/aistudio/tesseract_cube_rolling.wav';

export const COSMO_CUBE_IDLE_AUDIO_ASSET =
  '/assets/aistudio/cosmo_cube_idle.wav';

export const COSMO_CUBE_ROLL_AUDIO_ASSET =
  '/assets/aistudio/A_magical_cosmic_cub__3-1794498753087_98bbee8a.wav';

export interface DiceAudioIdentity {
  diceStyle: DiceStyle;
  assetFolder: string;
  idleAudioAsset?: string;
  rollAudioAsset?: string;
  idleProfile:
    | 'silent_tabletop'
    | 'lava_magma_simmer'
    | 'electro_tesla_hum'
    | 'tesseract_hyper_drone'
    | 'cosmo_nebula_choir';
  rollProfile:
    | 'classic_clatter'
    | 'lava_volcanic'
    | 'electro_plasma'
    | 'tesseract_spatial'
    | 'cosmo_celestial';
  landProfile:
    | 'tabletop_thud'
    | 'heavy_basalt_slam'
    | 'electric_snap'
    | 'dimensional_chime'
    | 'cosmic_resonance';
}

export interface DiceIdleAudioSpec {
  diceStyle: DiceStyle;
  enabled: boolean;
  idleProfile: DiceAudioIdentity['idleProfile'];
  audioAssetUrl?: string;
  intervalMs: number;
  baseDroneFreqHz: number;
  harmonicFreqsHz: ReadonlyArray<number>;
  accentBurstFreqsHz: ReadonlyArray<number>;
  peakGain: number;
  description: string;
}

export function getDiceAudioIdentity(
  diceStyle: DiceStyle = 'classic_ivory'
): DiceAudioIdentity {
  switch (diceStyle) {
    case 'lava_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/lava/',
        idleAudioAsset: LAVA_CUBE_IDLE_AUDIO_ASSET,
        rollAudioAsset: LAVA_CUBE_ROLL_AUDIO_ASSET,
        idleProfile: 'lava_magma_simmer',
        rollProfile: 'lava_volcanic',
        landProfile: 'heavy_basalt_slam',
      };
    case 'electro_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/electro/',
        idleAudioAsset: ELECTRO_CUBE_IDLE_AUDIO_ASSET,
        rollAudioAsset: ELECTRO_CUBE_ROLL_AUDIO_ASSET,
        idleProfile: 'electro_tesla_hum',
        rollProfile: 'electro_plasma',
        landProfile: 'electric_snap',
      };
    case 'tesseract_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/tesseract/',
        idleAudioAsset: TESSERACT_CUBE_IDLE_AUDIO_ASSET,
        rollAudioAsset: TESSERACT_CUBE_ROLL_AUDIO_ASSET,
        idleProfile: 'tesseract_hyper_drone',
        rollProfile: 'tesseract_spatial',
        landProfile: 'dimensional_chime',
      };
    case 'cosmo_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/cosmo/',
        idleAudioAsset: COSMO_CUBE_IDLE_AUDIO_ASSET,
        rollAudioAsset: COSMO_CUBE_ROLL_AUDIO_ASSET,
        idleProfile: 'cosmo_nebula_choir',
        rollProfile: 'cosmo_celestial',
        landProfile: 'cosmic_resonance',
      };
    default:
      return {
        diceStyle,
        assetFolder: '/audio/ludo/classic/',
        idleProfile: 'silent_tabletop',
        rollProfile: 'classic_clatter',
        landProfile: 'tabletop_thud',
      };
  }
}

/**
 * Computes the design-matched idle audio specification for each die style.
 * - Lava Cube: Uses the authentic volcanic bubbling & magma simmer WAV asset (`/assets/aistudio/Create_a_subtle_volc__4-1794493498531_1b63f895.wav`), slowing & dimming when cooling.
 * - Electro Cube: Uses the futuristic electric plasma buzz & crackling arc WAV asset (`/assets/aistudio/A_futuristic_electri__4-1794495895509_a7071723.wav`).
 * - Tesseract Cube: Uses the deep 4D spatial cavern drone & crystalline harmonic WAV asset (`/assets/aistudio/tesseract_cube_idle.wav`).
 * - Cosmo Cube: Deep-space celestial fifth drone & twinkling Lydian stardust bell glints.
 */
export function getDiceIdleAudioSpec(
  diceStyle: DiceStyle = 'classic_ivory',
  options?: { isCooling?: boolean }
): DiceIdleAudioSpec {
  const identity = getDiceAudioIdentity(diceStyle);
  const isCooling = Boolean(options?.isCooling);

  switch (diceStyle) {
    case 'lava_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
        audioAssetUrl: LAVA_CUBE_IDLE_AUDIO_ASSET,
        intervalMs: isCooling ? 3800 : 2500,
        baseDroneFreqHz: isCooling ? 42 : 54,
        harmonicFreqsHz: isCooling ? [63, 95] : [81, 135],
        accentBurstFreqsHz: isCooling ? [155, 420] : [185, 340, 880],
        peakGain: isCooling ? 0.014 : 0.026,
        description: isCooling
          ? 'Smoldering Volcanic Magma Simmer (Cooling)'
          : 'Volcanic Magma Bubbling & Simmer',
      };
    case 'electro_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
        audioAssetUrl: ELECTRO_CUBE_IDLE_AUDIO_ASSET,
        intervalMs: 2100,
        baseDroneFreqHz: 120,
        harmonicFreqsHz: [240, 360],
        accentBurstFreqsHz: [1680, 2340, 920],
        peakGain: 0.022,
        description: 'Futuristic Electric Plasma Hum & Spark Arcs',
      };
    case 'tesseract_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
        audioAssetUrl: TESSERACT_CUBE_IDLE_AUDIO_ASSET,
        intervalMs: 2900,
        baseDroneFreqHz: 528,
        harmonicFreqsHz: [530.5, 792],
        accentBurstFreqsHz: [1056, 1320, 1584],
        peakGain: 0.021,
        description: '4D Spatial Cavern Drone & Crystal Resonance',
      };
    case 'cosmo_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
        audioAssetUrl: COSMO_CUBE_IDLE_AUDIO_ASSET,
        intervalMs: 3100,
        baseDroneFreqHz: 130.81, // C3
        harmonicFreqsHz: [196.0, 293.66], // G3, D4
        accentBurstFreqsHz: [1046.5, 1318.51, 1479.98], // C6, E6, F#6 Lydian starlight chimes
        peakGain: 0.023,
        description: 'Celestial Nebula Pad & Starlight Chimes',
      };
    default:
      return {
        diceStyle,
        enabled: false,
        idleProfile: 'silent_tabletop',
        intervalMs: 0,
        baseDroneFreqHz: 0,
        harmonicFreqsHz: [],
        accentBurstFreqsHz: [],
        peakGain: 0,
        description: 'Silent Tabletop Rest',
      };
  }
}

/**
 * Computes the effective vibration duration in milliseconds for a given base duration and haptic intensity tier.
 */
export function computeHapticDuration(
  baseDurationMs: number,
  intensity: HapticIntensity = 'medium'
): number {
  if (intensity === 'off' || baseDurationMs <= 0) {
    return 0;
  }
  if (intensity === 'light') {
    return Math.max(6, Math.round(baseDurationMs * 0.5));
  }
  if (intensity === 'heavy') {
    return Math.max(15, Math.round(baseDurationMs * 1.8));
  }
  // 'medium' default
  return Math.max(8, Math.round(baseDurationMs));
}

/**
 * Hybrid Web Audio API & custom WAV asset sound manager for Ludo Royale.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = false;
  private hapticIntensity: HapticIntensity = 'medium';
  private musicInterval: number | null = null;
  private activeDiceNodes: OscillatorNode[] = [];
  private activeIdleNodes: OscillatorNode[] = [];
  private idleInterval: number | null = null;
  private activeIdleDiceStyle: DiceStyle | null = null;
  private activeIdleCooling: boolean = false;
  private idleCycleCounter: number = 0;
  private lavaIdleAudio: HTMLAudioElement | null = null;
  private lavaIdlePreviewTimer: number | null = null;
  private lavaRollAudio: HTMLAudioElement | null = null;
  private electroIdleAudio: HTMLAudioElement | null = null;
  private electroIdlePreviewTimer: number | null = null;
  private electroRollAudio: HTMLAudioElement | null = null;
  private tesseractIdleAudio: HTMLAudioElement | null = null;
  private tesseractIdlePreviewTimer: number | null = null;
  private tesseractRollAudio: HTMLAudioElement | null = null;
  private cosmoIdleAudio: HTMLAudioElement | null = null;
  private cosmoIdlePreviewTimer: number | null = null;
  private cosmoRollAudio: HTMLAudioElement | null = null;

  private getContext(): AudioContext | null {
    if (!this.soundEnabled && !this.musicEnabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getLavaIdleAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.lavaIdleAudio) {
      const audio = new Audio(LAVA_CUBE_IDLE_AUDIO_ASSET);
      audio.loop = true;
      audio.preload = 'auto';
      this.lavaIdleAudio = audio;
    }
    return this.lavaIdleAudio;
  }

  private stopLavaIdleAudioElement(): void {
    if (this.lavaIdlePreviewTimer !== null) {
      clearTimeout(this.lavaIdlePreviewTimer);
      this.lavaIdlePreviewTimer = null;
    }
    if (this.lavaIdleAudio) {
      try {
        this.lavaIdleAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }
  }

  private getLavaRollAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.lavaRollAudio) {
      const audio = new Audio(LAVA_CUBE_ROLL_AUDIO_ASSET);
      audio.loop = false;
      audio.preload = 'auto';
      this.lavaRollAudio = audio;
    }
    return this.lavaRollAudio;
  }

  private stopLavaRollAudioElement(): void {
    if (this.lavaRollAudio) {
      try {
        this.lavaRollAudio.pause();
        this.lavaRollAudio.currentTime = 0;
      } catch {
        // Ignore pause/reset errors
      }
    }
  }

  private getElectroIdleAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.electroIdleAudio) {
      const audio = new Audio(ELECTRO_CUBE_IDLE_AUDIO_ASSET);
      audio.loop = true;
      audio.preload = 'auto';
      this.electroIdleAudio = audio;
    }
    return this.electroIdleAudio;
  }

  private stopElectroIdleAudioElement(): void {
    if (this.electroIdlePreviewTimer !== null) {
      clearTimeout(this.electroIdlePreviewTimer);
      this.electroIdlePreviewTimer = null;
    }
    if (this.electroIdleAudio) {
      try {
        this.electroIdleAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }
  }

  private getElectroRollAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.electroRollAudio) {
      const audio = new Audio(ELECTRO_CUBE_ROLL_AUDIO_ASSET);
      audio.loop = false;
      audio.preload = 'auto';
      this.electroRollAudio = audio;
    }
    return this.electroRollAudio;
  }

  private stopElectroRollAudioElement(): void {
    if (this.electroRollAudio) {
      try {
        this.electroRollAudio.pause();
        this.electroRollAudio.currentTime = 0;
      } catch {
        // Ignore pause/reset errors
      }
    }
  }

  private getTesseractIdleAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.tesseractIdleAudio) {
      const audio = new Audio(TESSERACT_CUBE_IDLE_AUDIO_ASSET);
      audio.loop = true;
      audio.preload = 'auto';
      this.tesseractIdleAudio = audio;
    }
    return this.tesseractIdleAudio;
  }

  private stopTesseractIdleAudioElement(): void {
    if (this.tesseractIdlePreviewTimer !== null) {
      clearTimeout(this.tesseractIdlePreviewTimer);
      this.tesseractIdlePreviewTimer = null;
    }
    if (this.tesseractIdleAudio) {
      try {
        this.tesseractIdleAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }
  }

  private getTesseractRollAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.tesseractRollAudio) {
      const audio = new Audio(TESSERACT_CUBE_ROLL_AUDIO_ASSET);
      audio.loop = false;
      audio.preload = 'auto';
      this.tesseractRollAudio = audio;
    }
    return this.tesseractRollAudio;
  }

  private stopTesseractRollAudioElement(): void {
    if (this.tesseractRollAudio) {
      try {
        this.tesseractRollAudio.pause();
        this.tesseractRollAudio.currentTime = 0;
      } catch {
        // Ignore pause/reset errors
      }
    }
  }

  private getCosmoIdleAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.cosmoIdleAudio) {
      const audio = new Audio(COSMO_CUBE_IDLE_AUDIO_ASSET);
      audio.loop = true;
      audio.preload = 'auto';
      this.cosmoIdleAudio = audio;
    }
    return this.cosmoIdleAudio;
  }

  private stopCosmoIdleAudioElement(): void {
    if (this.cosmoIdlePreviewTimer !== null) {
      clearTimeout(this.cosmoIdlePreviewTimer);
      this.cosmoIdlePreviewTimer = null;
    }
    if (this.cosmoIdleAudio) {
      try {
        this.cosmoIdleAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }
  }

  private getCosmoRollAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.cosmoRollAudio) {
      const audio = new Audio(COSMO_CUBE_ROLL_AUDIO_ASSET);
      audio.loop = false;
      audio.preload = 'auto';
      this.cosmoRollAudio = audio;
    }
    return this.cosmoRollAudio;
  }

  private stopCosmoRollAudioElement(): void {
    if (this.cosmoRollAudio) {
      try {
        this.cosmoRollAudio.pause();
        this.cosmoRollAudio.currentTime = 0;
      } catch {
        // Ignore pause/reset errors
      }
    }
  }

  public stopActiveDiceSounds(preserveCustomRollTail: boolean = false): void {
    if (this.activeDiceNodes.length > 0) {
      for (const node of this.activeDiceNodes) {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // Ignore already-stopped nodes
        }
      }
      this.activeDiceNodes = [];
    }
    if (!preserveCustomRollTail) {
      this.stopLavaRollAudioElement();
      this.stopElectroRollAudioElement();
      this.stopTesseractRollAudioElement();
      this.stopCosmoRollAudioElement();
    }
    this.stopActiveIdleNodes();
  }

  private stopActiveIdleNodes(): void {
    this.stopLavaIdleAudioElement();
    this.stopElectroIdleAudioElement();
    this.stopTesseractIdleAudioElement();
    this.stopCosmoIdleAudioElement();
    if (this.activeIdleNodes.length === 0) return;
    for (const node of this.activeIdleNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.activeIdleNodes = [];
  }

  private registerDiceOsc(osc: OscillatorNode): void {
    this.activeDiceNodes.push(osc);
    osc.onended = () => {
      this.activeDiceNodes = this.activeDiceNodes.filter((n) => n !== osc);
    };
  }

  private registerIdleOsc(osc: OscillatorNode): void {
    this.activeIdleNodes.push(osc);
    osc.onended = () => {
      this.activeIdleNodes = this.activeIdleNodes.filter((n) => n !== osc);
    };
  }

  public configure(
    soundEnabled: boolean,
    musicEnabled: boolean,
    hapticIntensity: HapticIntensity = 'medium'
  ): void {
    this.soundEnabled = soundEnabled;
    if (!soundEnabled) {
      this.stopActiveDiceSounds(false);
      this.stopDiceIdleLoop();
    }
    this.hapticIntensity = hapticIntensity;
    if (this.musicEnabled !== musicEnabled) {
      this.musicEnabled = musicEnabled;
      if (musicEnabled) {
        this.startAmbientMusic();
      } else {
        this.stopAmbientMusic();
      }
    }
  }

  public setHapticIntensity(intensity: HapticIntensity): void {
    this.hapticIntensity = intensity;
  }

  public getHapticIntensity(): HapticIntensity {
    return this.hapticIntensity;
  }

  public playClick(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.045);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  private synthesizeLavaVolcanicRoll(ctx: AudioContext): void {
    const now0 = ctx.currentTime;
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(58, now0);
    rumble.frequency.exponentialRampToValueAtTime(41, now0 + 0.56);
    rumbleGain.gain.setValueAtTime(0.065, now0);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now0 + 0.58);
    rumble.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    this.registerDiceOsc(rumble);
    rumble.start(now0);
    rumble.stop(now0 + 0.6);

    const stoneSteps = [0, 0.095, 0.195, 0.305, 0.415, 0.51];
    stoneSteps.forEach((offset, idx) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const basePitch = 104 + (idx % 3) * 26 - idx * 4;
      osc.frequency.setValueAtTime(basePitch, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.088);
      gain.gain.setValueAtTime(0.145, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.092);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this.registerDiceOsc(osc);
      osc.start(now);
      osc.stop(now + 0.096);

      // Molten magma bubble pop
      const bubble = ctx.createOscillator();
      const bGain = ctx.createGain();
      bubble.type = 'sine';
      bubble.frequency.setValueAtTime(170 + idx * 32, now + 0.012);
      bubble.frequency.exponentialRampToValueAtTime(340 + idx * 40, now + 0.055);
      bGain.gain.setValueAtTime(0.05, now + 0.012);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      bubble.connect(bGain);
      bGain.connect(ctx.destination);
      this.registerDiceOsc(bubble);
      bubble.start(now + 0.012);
      bubble.stop(now + 0.065);

      // High-frequency obsidian rock-fracture & ember crackle overtone
      const crackle = ctx.createOscillator();
      const cGain = ctx.createGain();
      crackle.type = 'sawtooth';
      crackle.frequency.setValueAtTime(1180 + idx * 190, now + 0.018);
      crackle.frequency.exponentialRampToValueAtTime(410, now + 0.048);
      cGain.gain.setValueAtTime(0.042, now + 0.018);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.052);
      crackle.connect(cGain);
      cGain.connect(ctx.destination);
      this.registerDiceOsc(crackle);
      crackle.start(now + 0.018);
      crackle.stop(now + 0.056);
    });
  }

  private synthesizeElectroPlasmaRoll(ctx: AudioContext): void {
    const now0 = ctx.currentTime;
    const charge = ctx.createOscillator();
    const chargeGain = ctx.createGain();
    charge.type = 'sawtooth';
    charge.frequency.setValueAtTime(220, now0);
    charge.frequency.exponentialRampToValueAtTime(980, now0 + 0.52);
    chargeGain.gain.setValueAtTime(0.048, now0);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now0 + 0.55);
    charge.connect(chargeGain);
    chargeGain.connect(ctx.destination);
    this.registerDiceOsc(charge);
    charge.start(now0);
    charge.stop(now0 + 0.56);

    const pulses = [0.02, 0.085, 0.15, 0.22, 0.29, 0.36, 0.43, 0.5];
    pulses.forEach((offset, idx) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      const freq = 780 + (idx % 3) * 420 + (idx % 2 === 0 ? 180 : -140);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(
        idx % 2 === 0 ? freq * 1.65 : freq * 0.48,
        now + 0.042
      );
      gain.gain.setValueAtTime(0.068, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.046);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this.registerDiceOsc(osc);
      osc.start(now);
      osc.stop(now + 0.05);

      const spark = ctx.createOscillator();
      const sGain = ctx.createGain();
      spark.type = 'triangle';
      spark.frequency.setValueAtTime(2100 + (idx % 4) * 320, now + 0.01);
      spark.frequency.exponentialRampToValueAtTime(640, now + 0.032);
      sGain.gain.setValueAtTime(0.045, now + 0.01);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      spark.connect(sGain);
      sGain.connect(ctx.destination);
      this.registerDiceOsc(spark);
      spark.start(now + 0.01);
      spark.stop(now + 0.038);
    });
  }

  private synthesizeTesseractSpatialRoll(ctx: AudioContext): void {
    const now0 = ctx.currentTime;
    const sweepUp = ctx.createOscillator();
    const sweepDown = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepUp.type = 'sine';
    sweepDown.type = 'triangle';
    sweepUp.frequency.setValueAtTime(310, now0);
    sweepUp.frequency.exponentialRampToValueAtTime(1240, now0 + 0.54);
    sweepDown.frequency.setValueAtTime(1240, now0);
    sweepDown.frequency.exponentialRampToValueAtTime(310, now0 + 0.54);
    sweepGain.gain.setValueAtTime(0.045, now0);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now0 + 0.56);
    sweepUp.connect(sweepGain);
    sweepDown.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    this.registerDiceOsc(sweepUp);
    this.registerDiceOsc(sweepDown);
    sweepUp.start(now0);
    sweepDown.start(now0);
    sweepUp.stop(now0 + 0.57);
    sweepDown.stop(now0 + 0.57);

    const notes = [528, 660, 792, 1056, 1320, 1584];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.082;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.88, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.075);
      gain.gain.setValueAtTime(0.072, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this.registerDiceOsc(osc);
      osc.start(now);
      osc.stop(now + 0.1);

      const overtone = ctx.createOscillator();
      const oGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, now + 0.015);
      oGain.gain.setValueAtTime(0.032, now + 0.015);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      overtone.connect(oGain);
      oGain.connect(ctx.destination);
      this.registerDiceOsc(overtone);
      overtone.start(now + 0.015);
      overtone.stop(now + 0.08);
    });
  }

  private synthesizeCosmoCelestialRoll(ctx: AudioContext): void {
    // Deep-space pulsar fifth pad + swirling Lydian celestial galaxy arpeggio & stardust chimes
    const now0 = ctx.currentTime;
    const padRoot = ctx.createOscillator();
    const padFifth = ctx.createOscillator();
    const padGain = ctx.createGain();
    padRoot.type = 'sine';
    padFifth.type = 'sine';
    padRoot.frequency.setValueAtTime(130.81, now0); // C3
    padRoot.frequency.exponentialRampToValueAtTime(146.83, now0 + 0.55); // D3
    padFifth.frequency.setValueAtTime(196.0, now0); // G3
    padFifth.frequency.exponentialRampToValueAtTime(220.0, now0 + 0.55); // A3
    padGain.gain.setValueAtTime(0.055, now0);
    padGain.gain.exponentialRampToValueAtTime(0.001, now0 + 0.58);
    padRoot.connect(padGain);
    padFifth.connect(padGain);
    padGain.connect(ctx.destination);
    this.registerDiceOsc(padRoot);
    this.registerDiceOsc(padFifth);
    padRoot.start(now0);
    padFifth.start(now0);
    padRoot.stop(now0 + 0.6);
    padFifth.stop(now0 + 0.6);

    // Lydian celestial notes (C5, E5, F#5, G5, B5, D6)
    const shimmerNotes = [523.25, 659.25, 739.99, 783.99, 987.77, 1174.66];
    shimmerNotes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, now + 0.115);
      gain.gain.setValueAtTime(0.068, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this.registerDiceOsc(osc);
      osc.start(now);
      osc.stop(now + 0.135);

      // High stardust bell twinkle
      const twinkle = ctx.createOscillator();
      const tGain = ctx.createGain();
      twinkle.type = 'sine';
      twinkle.frequency.setValueAtTime(freq * 2.5, now + 0.02);
      tGain.gain.setValueAtTime(0.028, now + 0.02);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      twinkle.connect(tGain);
      tGain.connect(ctx.destination);
      this.registerDiceOsc(twinkle);
      twinkle.start(now + 0.02);
      twinkle.stop(now + 0.095);
    });
  }

  public playDiceRoll(diceStyle: DiceStyle = 'classic_ivory'): void {
    if (!this.soundEnabled) return;

    // Prevent overlapping sounds on rapid rolls
    this.stopActiveDiceSounds(false);

    const identity = getDiceAudioIdentity(diceStyle);

    if (identity.rollProfile === 'lava_volcanic') {
      const rollAudio = this.getLavaRollAudioElement();
      if (rollAudio) {
        try {
          rollAudio.currentTime = 0;
          rollAudio.volume = 0.85;
          rollAudio.playbackRate = 1.0;
          const playPromise = rollAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              const fallbackCtx = this.getContext();
              if (fallbackCtx) {
                this.synthesizeLavaVolcanicRoll(fallbackCtx);
              }
            });
          }
          return;
        } catch {
          // Fall through to procedural Web Audio synthesis if HTMLAudioElement fails
        }
      }
      const ctx = this.getContext();
      if (ctx) {
        this.synthesizeLavaVolcanicRoll(ctx);
      }
      return;
    }

    if (identity.rollProfile === 'electro_plasma') {
      const rollAudio = this.getElectroRollAudioElement();
      if (rollAudio) {
        try {
          rollAudio.currentTime = 0;
          rollAudio.volume = 0.85;
          rollAudio.playbackRate = 1.0;
          const playPromise = rollAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              const fallbackCtx = this.getContext();
              if (fallbackCtx) {
                this.synthesizeElectroPlasmaRoll(fallbackCtx);
              }
            });
          }
          return;
        } catch {
          // Fall through to procedural Web Audio synthesis if HTMLAudioElement fails
        }
      }
      const ctx = this.getContext();
      if (ctx) {
        this.synthesizeElectroPlasmaRoll(ctx);
      }
      return;
    }

    if (identity.rollProfile === 'tesseract_spatial') {
      const rollAudio = this.getTesseractRollAudioElement();
      if (rollAudio) {
        try {
          rollAudio.currentTime = 0;
          rollAudio.volume = 0.85;
          rollAudio.playbackRate = 1.0;
          const playPromise = rollAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              const fallbackCtx = this.getContext();
              if (fallbackCtx) {
                this.synthesizeTesseractSpatialRoll(fallbackCtx);
              }
            });
          }
          return;
        } catch {
          // Fall through to procedural Web Audio synthesis if HTMLAudioElement fails
        }
      }
      const ctx = this.getContext();
      if (ctx) {
        this.synthesizeTesseractSpatialRoll(ctx);
      }
      return;
    }

    if (identity.rollProfile === 'cosmo_celestial') {
      const rollAudio = this.getCosmoRollAudioElement();
      if (rollAudio) {
        try {
          rollAudio.currentTime = 0;
          rollAudio.volume = 0.85;
          rollAudio.playbackRate = 1.0;
          const playPromise = rollAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              const fallbackCtx = this.getContext();
              if (fallbackCtx) {
                this.synthesizeCosmoCelestialRoll(fallbackCtx);
              }
            });
          }
          return;
        } catch {
          // Fall through to procedural Web Audio synthesis if HTMLAudioElement fails
        }
      }
      const ctx = this.getContext();
      if (ctx) {
        this.synthesizeCosmoCelestialRoll(ctx);
      }
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    // Default classic multi-tumble clatter ticks followed by a solid table impact thud
    const ticks = [0, 0.08, 0.16, 0.25, 0.35, 0.46, 0.58];
    ticks.forEach((offset, i) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const isImpact = i === ticks.length - 1;
      osc.type = isImpact ? 'sine' : 'triangle';
      const pitch = isImpact ? 140 : 260 + (i % 3) * 60 + (Math.random() * 40 - 20);
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + (isImpact ? 0.09 : 0.045));

      gain.gain.setValueAtTime(isImpact ? 0.16 : 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isImpact ? 0.1 : 0.05));

      osc.connect(gain);
      gain.connect(ctx.destination);
      this.registerDiceOsc(osc);
      osc.start(now);
      osc.stop(now + (isImpact ? 0.11 : 0.055));
    });
  }

  public playDiceLand(diceStyle: DiceStyle = 'classic_ivory'): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Preserve the natural tail of custom WAV roll audio assets when landing
    this.stopActiveDiceSounds(
      diceStyle === 'lava_cube' ||
        diceStyle === 'electro_cube' ||
        diceStyle === 'tesseract_cube' ||
        diceStyle === 'cosmo_cube'
    );

    const identity = getDiceAudioIdentity(diceStyle);
    const now = ctx.currentTime;

    if (identity.landProfile === 'heavy_basalt_slam') {
      // Explosive volcanic basalt crater impact + deep tectonic boom + molten ember sizzle tail
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(132, now);
      sub.frequency.exponentialRampToValueAtTime(36, now + 0.22);
      subGain.gain.setValueAtTime(0.22, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      this.registerDiceOsc(sub);
      sub.start(now);
      sub.stop(now + 0.25);

      const crunch = ctx.createOscillator();
      const crunchGain = ctx.createGain();
      crunch.type = 'sawtooth';
      crunch.frequency.setValueAtTime(280, now);
      crunch.frequency.exponentialRampToValueAtTime(64, now + 0.14);
      crunchGain.gain.setValueAtTime(0.095, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      crunch.connect(crunchGain);
      crunchGain.connect(ctx.destination);
      this.registerDiceOsc(crunch);
      crunch.start(now);
      crunch.stop(now + 0.16);

      [0.03, 0.07, 0.12].forEach((delay, idx) => {
        const sizzle = ctx.createOscillator();
        const sGain = ctx.createGain();
        sizzle.type = 'triangle';
        sizzle.frequency.setValueAtTime(1450 - idx * 260, now + delay);
        sizzle.frequency.exponentialRampToValueAtTime(520, now + delay + 0.05);
        sGain.gain.setValueAtTime(0.04, now + delay);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.055);
        sizzle.connect(sGain);
        sGain.connect(ctx.destination);
        this.registerDiceOsc(sizzle);
        sizzle.start(now + delay);
        sizzle.stop(now + delay + 0.06);
      });
      return;
    }

    if (identity.landProfile === 'electric_snap') {
      // High-voltage EMP capacitor discharge whip-snap + thunder sub-punch + electric arc sizzle
      const whip = ctx.createOscillator();
      const whipGain = ctx.createGain();
      whip.type = 'sawtooth';
      whip.frequency.setValueAtTime(2480, now);
      whip.frequency.exponentialRampToValueAtTime(110, now + 0.095);
      whipGain.gain.setValueAtTime(0.13, now);
      whipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.105);
      whip.connect(whipGain);
      whipGain.connect(ctx.destination);
      this.registerDiceOsc(whip);
      whip.start(now);
      whip.stop(now + 0.11);

      const punch = ctx.createOscillator();
      const punchGain = ctx.createGain();
      punch.type = 'sine';
      punch.frequency.setValueAtTime(160, now);
      punch.frequency.exponentialRampToValueAtTime(48, now + 0.13);
      punchGain.gain.setValueAtTime(0.16, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      punch.connect(punchGain);
      punchGain.connect(ctx.destination);
      this.registerDiceOsc(punch);
      punch.start(now);
      punch.stop(now + 0.15);

      [0.035, 0.075].forEach((delay, idx) => {
        const arc = ctx.createOscillator();
        const arcGain = ctx.createGain();
        arc.type = 'square';
        arc.frequency.setValueAtTime(1820 + idx * 440, now + delay);
        arc.frequency.exponentialRampToValueAtTime(760, now + delay + 0.035);
        arcGain.gain.setValueAtTime(0.045, now + delay);
        arcGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
        arc.connect(arcGain);
        arcGain.connect(ctx.destination);
        this.registerDiceOsc(arc);
        arc.start(now + delay);
        arc.stop(now + delay + 0.045);
      });
      return;
    }

    if (identity.landProfile === 'dimensional_chime') {
      // 4D hypercube lock-in: resonant 4-voice crystalline chord + high prism ping
      [528, 660, 792, 1056, 1584].forEach((freq, idx) => {
        const t = now + idx * 0.022;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 4 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.008, t + 0.22);
        gain.gain.setValueAtTime(idx === 4 ? 0.05 : 0.068, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.registerDiceOsc(osc);
        osc.start(t);
        osc.stop(t + 0.25);
      });
      return;
    }

    if (identity.landProfile === 'cosmic_resonance') {
      // Warm supernova chord swell + cascading high-register stardust bell sparkles
      [523.25, 659.25, 783.99, 1046.5, 1567.98, 2093.0].forEach((freq, idx) => {
        const t = now + idx * 0.028;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t + 0.28);
        gain.gain.setValueAtTime(idx >= 4 ? 0.042 : 0.072, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.registerDiceOsc(osc);
        osc.start(t);
        osc.stop(t + 0.31);
      });
      return;
    }

    // Classic tabletop solid settle thud + subtle material overtone
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(165, now);
    thud.frequency.exponentialRampToValueAtTime(58, now + 0.11);
    thudGain.gain.setValueAtTime(0.14, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    this.registerDiceOsc(thud);
    thud.start(now);
    thud.stop(now + 0.13);
  }

  public playSixRolled(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    });
  }

  public playStep(stepIndex: number = 0): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 360 + (stepIndex % 6) * 32;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.06);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playCapture(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.25);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playReachHome(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const chord = [587.33, 739.99, 880, 1174.66]; // D major arpeggio
    chord.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  public playVictory(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const fanfare = [
      { f: 523.25, t: 0, d: 0.15 },
      { f: 659.25, t: 0.14, d: 0.15 },
      { f: 783.99, t: 0.28, d: 0.15 },
      { f: 1046.5, t: 0.42, d: 0.45 },
    ];
    fanfare.forEach((n) => {
      const now = ctx.currentTime + n.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + n.d + 0.02);
    });
  }

  public triggerHaptic(durationMs: number = 15): number {
    const effectiveDuration = computeHapticDuration(
      durationMs,
      this.hapticIntensity
    );
    if (effectiveDuration <= 0) return 0;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(effectiveDuration);
      }
    } catch {
      // Ignore unsupported vibrate
    }
    return effectiveDuration;
  }

  public startAmbientMusic(): void {
    this.stopAmbientMusic();
    if (!this.musicEnabled || typeof window === 'undefined') return;

    const playPad = () => {
      if (!this.musicEnabled) return;
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0];
      notes.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.015, now + 1.2);
        gain.gain.linearRampToValueAtTime(0.001, now + 3.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 3.9);
      });
    };

    playPad();
    this.musicInterval = window.setInterval(playPad, 4000);
  }

  public stopAmbientMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  /**
   * Synthesizes a single subtle, design-authentic idle sound cycle for the 4 animated special cubes:
   * - `lava_cube`: Deep volcanic magma simmer + viscous magma bubble pop + subtle fissure steam crackle
   *   (automatically shifts to a slower, quieter smoldering coal breath when `isCooling` is true).
   * - `electro_cube`: 120Hz ionized Tesla coil hum + crisp electrostatic micro-spark snaps.
   * - `tesseract_cube`: 4D crystal-glass binaural fifth shimmer + dimensional conduit harmonic ping.
   * - `cosmo_cube`: Deep-space celestial fifth nebula pad + twinkling Lydian stardust bell glints.
   */
  public playDiceIdlePulse(
    diceStyle: DiceStyle = 'classic_ivory',
    options?: { isCooling?: boolean }
  ): DiceIdleAudioSpec {
    const spec = getDiceIdleAudioSpec(diceStyle, options);
    if (!spec.enabled || !this.soundEnabled) {
      return spec;
    }

    if (spec.idleProfile === 'lava_magma_simmer') {
      const isCooling = Boolean(options?.isCooling);
      const idleAudio = this.getLavaIdleAudioElement();
      if (idleAudio) {
        try {
          idleAudio.volume = isCooling ? 0.18 : 0.42;
          idleAudio.playbackRate = isCooling ? 0.82 : 1.0;
          if (idleAudio.paused) {
            const p = idleAudio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          }
          // If triggered as a standalone one-shot preview (e.g., Dice Showcase modal), pause after one cycle
          if (this.activeIdleDiceStyle !== 'lava_cube') {
            if (this.lavaIdlePreviewTimer !== null) {
              clearTimeout(this.lavaIdlePreviewTimer);
            }
            this.lavaIdlePreviewTimer = window.setTimeout(() => {
              if (this.activeIdleDiceStyle !== 'lava_cube') {
                this.stopLavaIdleAudioElement();
              }
            }, spec.intervalMs);
          }
          return spec;
        } catch {
          // Fall through to Web Audio synthesis fallback
        }
      }

      const ctx = this.getContext();
      if (!ctx) {
        return spec;
      }
      this.stopActiveIdleNodes();
      const now = ctx.currentTime;
      const cycleIdx = this.idleCycleCounter++;

      // 1. Subterranean volcanic magma swell (low triangle/sine wave)
      const drone = ctx.createOscillator();
      const droneGain = ctx.createGain();
      drone.type = 'triangle';
      drone.frequency.setValueAtTime(spec.baseDroneFreqHz, now);
      drone.frequency.exponentialRampToValueAtTime(
        spec.baseDroneFreqHz * 0.84,
        now + (isCooling ? 0.65 : 0.48)
      );
      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(spec.peakGain, now + 0.12);
      droneGain.gain.exponentialRampToValueAtTime(
        0.0008,
        now + (isCooling ? 0.68 : 0.5)
      );
      drone.connect(droneGain);
      droneGain.connect(ctx.destination);
      this.registerIdleOsc(drone);
      drone.start(now);
      drone.stop(now + (isCooling ? 0.7 : 0.52));

      // 2. Viscous molten magma bubble pop (pitch-up resonant sine drop)
      if (!isCooling) {
        const bubbleStart = now + 0.14;
        const bubble = ctx.createOscillator();
        const bGain = ctx.createGain();
        bubble.type = 'sine';
        const baseBubbleFreq =
          spec.accentBurstFreqsHz[cycleIdx % spec.accentBurstFreqsHz.length] || 185;
        bubble.frequency.setValueAtTime(baseBubbleFreq * 0.65, bubbleStart);
        bubble.frequency.exponentialRampToValueAtTime(
          baseBubbleFreq * 1.35,
          bubbleStart + 0.065
        );
        bGain.gain.setValueAtTime(spec.peakGain * 0.72, bubbleStart);
        bGain.gain.exponentialRampToValueAtTime(0.0008, bubbleStart + 0.072);
        bubble.connect(bGain);
        bGain.connect(ctx.destination);
        this.registerIdleOsc(bubble);
        bubble.start(bubbleStart);
        bubble.stop(bubbleStart + 0.078);

        // 3. Subtle pressurized fissure steam & ember micro-crackle
        const hissStart = now + 0.24;
        const crackle = ctx.createOscillator();
        const cGain = ctx.createGain();
        crackle.type = 'sawtooth';
        crackle.frequency.setValueAtTime(880 + (cycleIdx % 3) * 110, hissStart);
        crackle.frequency.exponentialRampToValueAtTime(340, hissStart + 0.045);
        cGain.gain.setValueAtTime(spec.peakGain * 0.35, hissStart);
        cGain.gain.exponentialRampToValueAtTime(0.0008, hissStart + 0.05);
        crackle.connect(cGain);
        cGain.connect(ctx.destination);
        this.registerIdleOsc(crackle);
        crackle.start(hissStart);
        crackle.stop(hissStart + 0.055);
      }
      return spec;
    }

    if (spec.idleProfile === 'electro_tesla_hum') {
      const idleAudio = this.getElectroIdleAudioElement();
      if (idleAudio) {
        try {
          idleAudio.volume = 0.38;
          idleAudio.playbackRate = 1.0;
          if (idleAudio.paused) {
            const p = idleAudio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          }
          if (this.activeIdleDiceStyle !== 'electro_cube') {
            if (this.electroIdlePreviewTimer !== null) {
              clearTimeout(this.electroIdlePreviewTimer);
            }
            this.electroIdlePreviewTimer = window.setTimeout(() => {
              if (this.activeIdleDiceStyle !== 'electro_cube') {
                this.stopElectroIdleAudioElement();
              }
            }, spec.intervalMs);
          }
          return spec;
        } catch {
          // Fall through to Web Audio synthesis fallback
        }
      }

      const ctx = this.getContext();
      if (!ctx) {
        return spec;
      }
      this.stopActiveIdleNodes();
      const now = ctx.currentTime;
      const cycleIdx = this.idleCycleCounter++;

      // 1. Subtle 120Hz ionized plasma core hum + 240Hz harmonic
      const hum = ctx.createOscillator();
      const humGain = ctx.createGain();
      hum.type = 'sine';
      hum.frequency.setValueAtTime(spec.baseDroneFreqHz, now);
      hum.frequency.exponentialRampToValueAtTime(
        spec.harmonicFreqsHz[0] || 240,
        now + 0.26
      );
      humGain.gain.setValueAtTime(0.001, now);
      humGain.gain.linearRampToValueAtTime(spec.peakGain * 0.75, now + 0.06);
      humGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);
      hum.connect(humGain);
      humGain.connect(ctx.destination);
      this.registerIdleOsc(hum);
      hum.start(now);
      hum.stop(now + 0.3);

      // 2. Dual crisp electrostatic micro-spark snaps matching the compact body sparks
      [0.05, 0.16].forEach((offset, idx) => {
        const sparkTime = now + offset;
        const spark = ctx.createOscillator();
        const sGain = ctx.createGain();
        spark.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
        const startFreq =
          spec.accentBurstFreqsHz[(cycleIdx + idx) % spec.accentBurstFreqsHz.length] ||
          1680;
        spark.frequency.setValueAtTime(startFreq, sparkTime);
        spark.frequency.exponentialRampToValueAtTime(
          startFreq * 0.38,
          sparkTime + 0.028
        );
        sGain.gain.setValueAtTime(spec.peakGain * 0.68, sparkTime);
        sGain.gain.exponentialRampToValueAtTime(0.0008, sparkTime + 0.032);
        spark.connect(sGain);
        sGain.connect(ctx.destination);
        this.registerIdleOsc(spark);
        spark.start(sparkTime);
        spark.stop(sparkTime + 0.036);
      });
      return spec;
    }

    if (spec.idleProfile === 'tesseract_hyper_drone') {
      const idleAudio = this.getTesseractIdleAudioElement();
      if (idleAudio) {
        try {
          idleAudio.volume = 0.42;
          idleAudio.playbackRate = 1.0;
          if (idleAudio.paused) {
            const p = idleAudio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          }
          if (this.activeIdleDiceStyle !== 'tesseract_cube') {
            if (this.tesseractIdlePreviewTimer !== null) {
              clearTimeout(this.tesseractIdlePreviewTimer);
            }
            this.tesseractIdlePreviewTimer = window.setTimeout(() => {
              if (this.activeIdleDiceStyle !== 'tesseract_cube') {
                this.stopTesseractIdleAudioElement();
              }
            }, spec.intervalMs);
          }
          return spec;
        } catch {
          // Fall through to Web Audio synthesis fallback
        }
      }

      const ctx = this.getContext();
      if (!ctx) {
        return spec;
      }
      this.stopActiveIdleNodes();
      const now = ctx.currentTime;
      const cycleIdx = this.idleCycleCounter++;

      // 1. 4D crystal-glass binaural shimmer chord (528Hz + 530.5Hz + 792Hz fifth)
      const freqs = [spec.baseDroneFreqHz, ...spec.harmonicFreqsHz];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.004, now + 0.46);
        const voiceGain = idx === 0 ? spec.peakGain * 0.65 : spec.peakGain * 0.42;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(voiceGain, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.48);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this.registerIdleOsc(osc);
        osc.start(now);
        osc.stop(now + 0.5);
      });

      // 2. High crystalline 4D vertex conduit energy pulse ping
      const pingTime = now + 0.14;
      const ping = ctx.createOscillator();
      const pGain = ctx.createGain();
      ping.type = 'triangle';
      const pingFreq =
        spec.accentBurstFreqsHz[cycleIdx % spec.accentBurstFreqsHz.length] || 1056;
      ping.frequency.setValueAtTime(pingFreq, pingTime);
      ping.frequency.exponentialRampToValueAtTime(pingFreq * 1.25, pingTime + 0.14);
      pGain.gain.setValueAtTime(spec.peakGain * 0.52, pingTime);
      pGain.gain.exponentialRampToValueAtTime(0.0008, pingTime + 0.16);
      ping.connect(pGain);
      pGain.connect(ctx.destination);
      this.registerIdleOsc(ping);
      ping.start(pingTime);
      ping.stop(pingTime + 0.17);
      return spec;
    }

    if (spec.idleProfile === 'cosmo_nebula_choir') {
      const idleAudio = this.getCosmoIdleAudioElement();
      if (idleAudio) {
        try {
          idleAudio.volume = 0.42;
          idleAudio.playbackRate = 1.0;
          if (idleAudio.paused) {
            const p = idleAudio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          }
          if (this.activeIdleDiceStyle !== 'cosmo_cube') {
            if (this.cosmoIdlePreviewTimer !== null) {
              clearTimeout(this.cosmoIdlePreviewTimer);
            }
            this.cosmoIdlePreviewTimer = window.setTimeout(() => {
              if (this.activeIdleDiceStyle !== 'cosmo_cube') {
                this.stopCosmoIdleAudioElement();
              }
            }, spec.intervalMs);
          }
          return spec;
        } catch {
          // Fall through to Web Audio synthesis fallback
        }
      }

      const ctx = this.getContext();
      if (!ctx) {
        return spec;
      }

      this.stopActiveIdleNodes();
      const now = ctx.currentTime;
      const cycleIdx = this.idleCycleCounter++;

      // 1. Zero-gravity deep-space fifth pad (C3 130.81Hz + G3 196.00Hz)
      [spec.baseDroneFreqHz, spec.harmonicFreqsHz[0] || 196.0].forEach(
        (freq, idx) => {
          const pad = ctx.createOscillator();
          const padGain = ctx.createGain();
          pad.type = 'sine';
          pad.frequency.setValueAtTime(freq, now);
          pad.frequency.exponentialRampToValueAtTime(freq * 1.012, now + 0.54);
          padGain.gain.setValueAtTime(0.001, now);
          padGain.gain.linearRampToValueAtTime(
            idx === 0 ? spec.peakGain * 0.72 : spec.peakGain * 0.52,
            now + 0.14
          );
          padGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.56);
          pad.connect(padGain);
          padGain.connect(ctx.destination);
          this.registerIdleOsc(pad);
          pad.start(now);
          pad.stop(now + 0.58);
        }
      );

      // 2. Twinkling Lydian stardust bell glint matching the 4-point diamond stars
      const starTime = now + 0.15;
      const starOsc = ctx.createOscillator();
      const starGain = ctx.createGain();
      starOsc.type = 'sine';
      const starFreq =
        spec.accentBurstFreqsHz[cycleIdx % spec.accentBurstFreqsHz.length] ||
        1046.5;
      starOsc.frequency.setValueAtTime(starFreq, starTime);
      starOsc.frequency.exponentialRampToValueAtTime(
        starFreq * 1.02,
        starTime + 0.22
      );
      starGain.gain.setValueAtTime(spec.peakGain * 0.55, starTime);
      starGain.gain.exponentialRampToValueAtTime(0.0008, starTime + 0.24);
      starOsc.connect(starGain);
      starGain.connect(ctx.destination);
      this.registerIdleOsc(starOsc);
      starOsc.start(starTime);
      starOsc.stop(starTime + 0.25);
      return spec;
    }

    return spec;
  }

  /**
   * Starts or updates the periodic ambient idle sound loop for the active die.
   * Only runs for the 4 special animated cubes (`lava_cube`, `electro_cube`,
   * `tesseract_cube`, `cosmo_cube`) while in idle state and when audio is enabled.
   */
  public startDiceIdleLoop(
    diceStyle: DiceStyle = 'classic_ivory',
    options?: { isCooling?: boolean }
  ): boolean {
    const isCooling = Boolean(options?.isCooling);
    const spec = getDiceIdleAudioSpec(diceStyle, { isCooling });
    if (!spec.enabled || !this.soundEnabled) {
      this.stopDiceIdleLoop();
      return false;
    }

    if (
      this.idleInterval !== null &&
      this.activeIdleDiceStyle === diceStyle &&
      this.activeIdleCooling === isCooling
    ) {
      return true;
    }

    // If Lava Cube is already looping and only its cooling state toggled, adjust volume & rate seamlessly
    if (
      diceStyle === 'lava_cube' &&
      this.activeIdleDiceStyle === 'lava_cube' &&
      this.idleInterval !== null &&
      this.lavaIdleAudio
    ) {
      this.activeIdleCooling = isCooling;
      this.lavaIdleAudio.volume = isCooling ? 0.18 : 0.42;
      this.lavaIdleAudio.playbackRate = isCooling ? 0.82 : 1.0;
      if (this.lavaIdleAudio.paused) {
        this.lavaIdleAudio.play().catch(() => {});
      }
      return true;
    }

    this.stopDiceIdleLoop();
    this.activeIdleDiceStyle = diceStyle;
    this.activeIdleCooling = isCooling;

    if (typeof window !== 'undefined') {
      this.playDiceIdlePulse(diceStyle, { isCooling });
      this.idleInterval = window.setInterval(() => {
        if (!this.soundEnabled || !this.activeIdleDiceStyle) {
          this.stopDiceIdleLoop();
          return;
        }
        this.playDiceIdlePulse(this.activeIdleDiceStyle, {
          isCooling: this.activeIdleCooling,
        });
      }, spec.intervalMs);
    }

    return true;
  }

  public stopDiceIdleLoop(): void {
    if (this.idleInterval !== null) {
      clearInterval(this.idleInterval);
      this.idleInterval = null;
    }
    this.activeIdleDiceStyle = null;
    this.activeIdleCooling = false;
    this.stopActiveIdleNodes();
  }

  public isDiceIdleLoopActive(): boolean {
    return this.idleInterval !== null && this.activeIdleDiceStyle !== null;
  }

  public getActiveIdleDiceStyle(): DiceStyle | null {
    return this.activeIdleDiceStyle;
  }
}

export const soundManager = new SoundManager();
