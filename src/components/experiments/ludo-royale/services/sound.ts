import { DiceStyle, HapticIntensity } from '../game/gameTypes';

export interface DiceAudioIdentity {
  diceStyle: DiceStyle;
  assetFolder: string;
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
        idleProfile: 'lava_magma_simmer',
        rollProfile: 'lava_volcanic',
        landProfile: 'heavy_basalt_slam',
      };
    case 'electro_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/electro/',
        idleProfile: 'electro_tesla_hum',
        rollProfile: 'electro_plasma',
        landProfile: 'electric_snap',
      };
    case 'tesseract_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/tesseract/',
        idleProfile: 'tesseract_hyper_drone',
        rollProfile: 'tesseract_spatial',
        landProfile: 'dimensional_chime',
      };
    case 'cosmo_cube':
      return {
        diceStyle,
        assetFolder: '/audio/ludo/cosmo/',
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
 * Computes the design-matched procedural idle audio specification for each die style.
 * - Lava Cube: Subterranean volcanic magma simmer, viscous bubble pops & steam vent hiss (slows & dims when cooling).
 * - Electro Cube: 120Hz ionized Tesla coil harmonic hum & high-voltage micro-spark corona snaps.
 * - Tesseract Cube: 4D crystal-glass binaural fifth shimmer & dimensional conduit harmonic pings.
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
        intervalMs: isCooling ? 3800 : 2500,
        baseDroneFreqHz: isCooling ? 42 : 54,
        harmonicFreqsHz: isCooling ? [63, 95] : [81, 135],
        accentBurstFreqsHz: isCooling ? [155, 420] : [185, 340, 880],
        peakGain: isCooling ? 0.014 : 0.026,
        description: isCooling
          ? 'Smoldering Basalt Ember Pulse'
          : 'Subterranean Magma Simmer & Bubble Pop',
      };
    case 'electro_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
        intervalMs: 2100,
        baseDroneFreqHz: 120,
        harmonicFreqsHz: [240, 360],
        accentBurstFreqsHz: [1680, 2340, 920],
        peakGain: 0.022,
        description: 'Ionized Tesla Hum & Micro-Spark Snaps',
      };
    case 'tesseract_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
        intervalMs: 2900,
        baseDroneFreqHz: 528,
        harmonicFreqsHz: [530.5, 792],
        accentBurstFreqsHz: [1056, 1320, 1584],
        peakGain: 0.021,
        description: '4D Crystal-Glass Resonance & Conduit Ping',
      };
    case 'cosmo_cube':
      return {
        diceStyle,
        enabled: true,
        idleProfile: identity.idleProfile,
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
 * Procedural Web Audio API synthesizer for Ludo Royale sound effects and optional ambient music.
 * Requires zero external MP3/WAV requests so it never produces 404 errors and works offline.
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

  public stopActiveDiceSounds(): void {
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
    this.stopActiveIdleNodes();
  }

  private stopActiveIdleNodes(): void {
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
      this.stopActiveDiceSounds();
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

  public playDiceRoll(diceStyle: DiceStyle = 'classic_ivory'): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Prevent overlapping sounds on rapid rolls
    this.stopActiveDiceSounds();

    const identity = getDiceAudioIdentity(diceStyle);

    if (identity.rollProfile === 'lava_volcanic') {
      // Deep tectonic sub-bass magma rumble + heavy basalt boulder tumbles + bubbling lava & ember crackle bursts
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
      return;
    }

    if (identity.rollProfile === 'electro_plasma') {
      // High-voltage Tesla coil hum + rapid staccato lightning arc snaps + plasma capacitor sweep
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

        // Secondary high-frequency plasma spark snap
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
      return;
    }

    if (identity.rollProfile === 'tesseract_spatial') {
      // Counter-sweeping 4D phase-shift oscillators + crystalline hyper-geometric harmonic arpeggio
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

        // Crystalline octave harmonic shimmer
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
      return;
    }

    if (identity.rollProfile === 'cosmo_celestial') {
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
      return;
    }

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

    this.stopActiveDiceSounds();

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

    const ctx = this.getContext();
    if (!ctx) {
      return spec;
    }

    this.stopActiveIdleNodes();
    const now = ctx.currentTime;
    const cycleIdx = this.idleCycleCounter++;

    if (spec.idleProfile === 'lava_magma_simmer') {
      const isCooling = Boolean(options?.isCooling);
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
