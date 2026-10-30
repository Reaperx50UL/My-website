import { BirdId, EnvironmentId, TrapType, getEnvironmentProfile } from './config';
import { DefeatCause, GamePhase } from './types';

interface EnvMusicSpec {
  stepDurationMs: number;
  bassNotes: number[];
  melodyNotes: number[];
  arpNotes: number[];
}

const ENV_MUSIC_SPECS: Record<EnvironmentId, EnvMusicSpec> = {
  // Clockwork Citadel: Steampunk Mechanical March in D Dorian / Harmonic Minor
  clockwork: {
    stepDurationMs: 195,
    bassNotes: [
      146.83, 0, 220.0, 0, 174.61, 0, 220.0, 0,
      164.81, 0, 220.0, 0, 138.59, 0, 164.81, 220.0,
    ],
    melodyNotes: [
      587.33, 0, 659.25, 698.46, 880.0, 0, 783.99, 698.46,
      659.25, 0, 587.33, 554.37, 587.33, 0, 440.0, 0,
    ],
    arpNotes: [
      293.66, 349.23, 440.0, 349.23, 293.66, 349.23, 440.0, 523.25,
      329.63, 392.0, 493.88, 392.0, 277.18, 329.63, 440.0, 329.63,
    ],
  },
  // Bamboo Forest: Zen Pentatonic Koto & Shakuhachi Flute in E Minor Pentatonic
  bamboo: {
    stepDurationMs: 230,
    bassNotes: [
      164.81, 0, 0, 246.94, 196.0, 0, 0, 220.0,
      164.81, 0, 0, 146.83, 130.81, 0, 146.83, 0,
    ],
    melodyNotes: [
      659.25, 0, 783.99, 880.0, 0, 987.77, 880.0, 783.99,
      659.25, 0, 587.33, 493.88, 0, 587.33, 659.25, 0,
    ],
    arpNotes: [
      329.63, 392.0, 440.0, 493.88, 659.25, 493.88, 440.0, 392.0,
      329.63, 392.0, 493.88, 587.33, 493.88, 440.0, 392.0, 329.63,
    ],
  },
  // Volcano Field: Molten Tribal Forge in E Phrygian Dominant
  volcano: {
    stepDurationMs: 165,
    bassNotes: [
      82.41, 82.41, 0, 82.41, 87.31, 82.41, 0, 98.0,
      82.41, 82.41, 0, 82.41, 110.0, 98.0, 87.31, 82.41,
    ],
    melodyNotes: [
      329.63, 349.23, 415.3, 0, 440.0, 415.3, 349.23, 329.63,
      493.88, 0, 440.0, 415.3, 349.23, 0, 329.63, 0,
    ],
    arpNotes: [
      164.81, 174.61, 207.65, 220.0, 246.94, 220.0, 207.65, 174.61,
      164.81, 174.61, 207.65, 246.94, 261.63, 246.94, 207.65, 174.61,
    ],
  },
  // Cold Ice Field: Crystalline Aurora & Glass Celeste in A Lydian
  ice: {
    stepDurationMs: 240,
    bassNotes: [
      220.0, 0, 0, 0, 277.18, 0, 0, 0,
      246.94, 0, 0, 0, 329.63, 0, 246.94, 0,
    ],
    melodyNotes: [
      880.0, 0, 1108.73, 1318.51, 0, 1244.51, 1108.73, 987.77,
      880.0, 0, 739.99, 880.0, 0, 987.77, 1108.73, 0,
    ],
    arpNotes: [
      440.0, 554.37, 659.25, 830.61, 659.25, 554.37, 622.25, 659.25,
      493.88, 622.25, 739.99, 880.0, 739.99, 659.25, 554.37, 493.88,
    ],
  },
  // Cybernetic City: Neon Synthwave Arpeggiator in C Minor
  cyber: {
    stepDurationMs: 150,
    bassNotes: [
      130.81, 130.81, 261.63, 130.81, 155.56, 155.56, 311.13, 155.56,
      174.61, 174.61, 349.23, 174.61, 196.0, 196.0, 233.08, 196.0,
    ],
    melodyNotes: [
      523.25, 0, 622.25, 0, 698.46, 622.25, 523.25, 0,
      783.99, 0, 698.46, 622.25, 523.25, 0, 466.16, 0,
    ],
    arpNotes: [
      261.63, 311.13, 392.0, 523.25, 392.0, 311.13, 349.23, 392.0,
      311.13, 392.0, 466.16, 622.25, 466.16, 392.0, 349.23, 311.13,
    ],
  },
};

export class AudioController {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean;
  private currentEnv: EnvironmentId = 'clockwork';
  private currentPhase: GamePhase = 'title';
  private musicTimerId: number | null = null;
  private musicStep = 0;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusicLoop();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.startMusicLoop();
    }
  }

  public getCurrentEnvironmentMusic(): EnvironmentId {
    return this.currentEnv;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.noiseBuffer && this.ctx) {
        this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      }
      if (this.musicTimerId === null) {
        this.startMusicLoop();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playFilteredNoise(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    q: number,
    peakGain: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(Math.max(40, startFreq), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.02, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  /**
   * Updates the active environment music theme and game phase intensity.
   */
  public setEnvironmentMusic(envId: EnvironmentId, phase?: GamePhase): void {
    const envChanged = this.currentEnv !== envId;
    this.currentEnv = envId;
    if (phase) {
      this.currentPhase = phase;
    }
    if (envChanged) {
      this.musicStep = 0;
      if (this.musicTimerId !== null) {
        this.stopMusicLoop();
        if (!this.muted && this.ctx) {
          this.startMusicLoop();
        }
      }
    }
  }

  public setMusicPhase(phase: GamePhase): void {
    this.currentPhase = phase;
  }

  private startMusicLoop(): void {
    if (this.muted || typeof window === 'undefined') return;
    this.stopMusicLoop();
    const spec = ENV_MUSIC_SPECS[this.currentEnv];
    this.musicTimerId = window.setInterval(() => {
      this.tickMusicStep();
    }, spec.stepDurationMs);
  }

  private stopMusicLoop(): void {
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  private tickMusicStep(): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const env = this.currentEnv;
      const spec = ENV_MUSIC_SPECS[env];
      const step = this.musicStep % 16;
      this.musicStep = (this.musicStep + 1) % 16;

      // Adjust volume by phase so active flight feels driving while title/pause are gentler
      const phaseScale =
        this.currentPhase === 'playing'
          ? 1.0
          : this.currentPhase === 'title'
          ? 0.65
          : 0.35;

      const bassFreq = spec.bassNotes[step];
      const melodyFreq = spec.melodyNotes[step];
      const arpFreq = spec.arpNotes[step];

      if (env === 'clockwork') {
        // Brass bass + harpsichord clockwork tine + escapement tick
        if (bassFreq > 0) {
          this.scheduleTone(ctx, now, bassFreq, 'triangle', 0.16, 0.042 * phaseScale);
        }
        if (arpFreq > 0) {
          this.scheduleTone(ctx, now, arpFreq, 'sawtooth', 0.09, 0.022 * phaseScale, 1200);
        }
        if (melodyFreq > 0 && (this.currentPhase === 'playing' || step % 2 === 0)) {
          this.scheduleTone(ctx, now, melodyFreq, 'triangle', 0.17, 0.032 * phaseScale);
        }
        // Subtle mechanical tick-tock on every beat
        if (step % 2 === 0) {
          const tickPitch = step % 4 === 0 ? 1680 : 1240;
          this.scheduleTone(ctx, now, tickPitch, 'sine', 0.025, 0.015 * phaseScale);
        }
      } else if (env === 'bamboo') {
        // Plucked Koto harp + airy Shakuhachi flute + woodblock tap
        if (bassFreq > 0) {
          this.scheduleTone(ctx, now, bassFreq, 'sine', 0.28, 0.045 * phaseScale);
        }
        if (arpFreq > 0) {
          this.scheduleTone(ctx, now, arpFreq, 'triangle', 0.18, 0.028 * phaseScale);
        }
        if (melodyFreq > 0) {
          this.scheduleFluteNote(ctx, now, melodyFreq, 0.24, 0.034 * phaseScale);
        }
        if (step % 4 === 2 && this.currentPhase === 'playing') {
          // Hollow bamboo woodblock tap
          this.scheduleTone(ctx, now, 590, 'triangle', 0.045, 0.024 * phaseScale);
        }
      } else if (env === 'volcano') {
        // Deep molten bass + Phrygian brass stabs + taiko/anvil pulse
        if (bassFreq > 0) {
          this.scheduleTone(ctx, now, bassFreq, 'sawtooth', 0.14, 0.046 * phaseScale, 420);
        }
        if (arpFreq > 0 && this.currentPhase === 'playing') {
          this.scheduleTone(ctx, now, arpFreq, 'triangle', 0.11, 0.025 * phaseScale);
        }
        if (melodyFreq > 0) {
          this.scheduleTone(ctx, now, melodyFreq, 'sawtooth', 0.16, 0.028 * phaseScale, 1100);
        }
        if (step % 4 === 0 && this.currentPhase === 'playing') {
          // Volcanic drum thud
          this.scheduleDrumKick(ctx, now, 115, 38, 0.12, 0.055 * phaseScale);
        }
      } else if (env === 'ice') {
        // Shimmering glass celeste bells + warm aurora sub-pad
        if (bassFreq > 0) {
          this.scheduleTone(ctx, now, bassFreq, 'sine', 0.42, 0.045 * phaseScale);
        }
        if (arpFreq > 0) {
          this.scheduleBellNote(ctx, now, arpFreq, 0.26, 0.028 * phaseScale);
        }
        if (melodyFreq > 0) {
          this.scheduleBellNote(ctx, now, melodyFreq, 0.34, 0.032 * phaseScale);
        }
      } else if (env === 'cyber') {
        // Driving synthwave sawtooth bass arpeggio + neon lead synth + electronic beat
        if (bassFreq > 0) {
          this.scheduleTone(ctx, now, bassFreq, 'sawtooth', 0.12, 0.042 * phaseScale, 780);
        }
        if (arpFreq > 0) {
          this.scheduleTone(ctx, now, arpFreq, 'square', 0.1, 0.02 * phaseScale, 1600);
        }
        if (melodyFreq > 0) {
          this.scheduleTone(ctx, now, melodyFreq, 'sawtooth', 0.18, 0.03 * phaseScale, 2100);
        }
        if (this.currentPhase === 'playing') {
          if (step % 4 === 0) {
            this.scheduleDrumKick(ctx, now, 140, 44, 0.1, 0.055 * phaseScale);
          } else if (step % 4 === 2) {
            this.playFilteredNoise(ctx, now, 0.06, 'bandpass', 1800, 900, 1.5, 0.025 * phaseScale);
          }
        }
      }
    } catch {
      // Ignore background music synthesis errors
    }
  }

  private scheduleTone(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    type: OscillatorType,
    duration: number,
    peakGain: number,
    lowpassCutoff?: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    if (lowpassCutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(lowpassCutoff, startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(180, lowpassCutoff * 0.4), startTime + duration);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private scheduleFluteNote(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.985, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.04);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private scheduleBellNote(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    peakGain: number
  ): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2.0, startTime);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.01);
    osc2.stop(startTime + duration + 0.01);
  }

  private scheduleDrumKick(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  /**
   * Plays a distinct wing-flap sound tailored to the active bird's physiology.
   */
  public playFlap(birdId: BirdId = 'kora'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pitchShift = 0.95 + Math.random() * 0.1;

      if (birdId === 'kora') {
        // Kora (Brass Wing): Warm brass-feather lift + subtle clockwork spring tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250 * pitchShift, now);
        osc.frequency.exponentialRampToValueAtTime(480 * pitchShift, now + 0.095);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        // Subtle brass gear click
        this.scheduleTone(ctx, now + 0.01, 1520 * pitchShift, 'sine', 0.03, 0.035);
      } else if (birdId === 'zephyr') {
        // Zephyr (Gale Falcon): Swift aerodynamic wind-slice whoosh + high falcon whistle
        this.playFilteredNoise(
          ctx,
          now,
          0.11,
          'bandpass',
          650 * pitchShift,
          1950 * pitchShift,
          2.2,
          0.09
        );
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(390 * pitchShift, now);
        osc.frequency.exponentialRampToValueAtTime(790 * pitchShift, now + 0.085);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.085, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (birdId === 'ignis') {
        // Ignis (Ember Phoenix): Warm fiery wing-whoosh + ember crackle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(175 * pitchShift, now);
        osc.frequency.exponentialRampToValueAtTime(380 * pitchShift, now + 0.11);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.016);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);

        this.playFilteredNoise(ctx, now, 0.08, 'bandpass', 1200, 620, 1.8, 0.055);
      } else if (birdId === 'valkyrie') {
        // Valkyrie (Astral Hawk): Shimmering starlight chime-sweep + crisp wing snap
        this.scheduleBellNote(ctx, now, 659.25 * pitchShift, 0.09, 0.065);
        this.scheduleTone(ctx, now + 0.015, 987.77 * pitchShift, 'sine', 0.08, 0.055);
      } else if (birdId === 'volt') {
        // Volt (Tesla Shrike): Snappy high-voltage electric wing-zip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(340 * pitchShift, now);
        osc.frequency.exponentialRampToValueAtTime(860 * pitchShift, now + 0.075);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.075, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else {
        // Chronos (Hummingbird): High-speed crystalline hum-flutter
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520 * pitchShift, now);
        osc.frequency.exponentialRampToValueAtTime(960 * pitchShift, now + 0.08);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(42, now);
        modGain.gain.setValueAtTime(65, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.095, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(ctx.destination);

        mod.start(now);
        osc.start(now);
        mod.stop(now + 0.095);
        osc.stop(now + 0.095);
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Plays a distinct signature call when selecting a bird on the Title Screen.
   */
  public playBirdSelect(birdId: BirdId): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (birdId === 'kora') {
        // Warm brass fanfare chime (C5 -> G5)
        this.scheduleTone(ctx, now, 523.25, 'triangle', 0.12, 0.09);
        this.scheduleTone(ctx, now + 0.07, 783.99, 'triangle', 0.18, 0.1);
      } else if (birdId === 'zephyr') {
        // Swift falcon sky call (E5 -> B5 -> E6 glide)
        this.playFilteredNoise(ctx, now, 0.14, 'bandpass', 900, 2400, 3.0, 0.06);
        this.scheduleTone(ctx, now, 659.25, 'sine', 0.09, 0.085);
        this.scheduleTone(ctx, now + 0.055, 987.77, 'sine', 0.1, 0.09);
        this.scheduleTone(ctx, now + 0.11, 1318.51, 'sine', 0.16, 0.095);
      } else if (birdId === 'ignis') {
        // Rising phoenix flame chord (D5 -> F#5 -> A5) + ember burst
        this.playFilteredNoise(ctx, now, 0.16, 'lowpass', 1400, 400, 1.2, 0.065);
        this.scheduleTone(ctx, now, 587.33, 'sawtooth', 0.14, 0.06, 1400);
        this.scheduleTone(ctx, now + 0.05, 739.99, 'sawtooth', 0.16, 0.065, 1600);
        this.scheduleTone(ctx, now + 0.1, 880.0, 'triangle', 0.2, 0.085);
      } else if (birdId === 'valkyrie') {
        // Astral starlight fifths chime (A5 -> E6 -> A6)
        this.scheduleBellNote(ctx, now, 880.0, 0.16, 0.085);
        this.scheduleBellNote(ctx, now + 0.05, 1318.51, 0.18, 0.085);
        this.scheduleBellNote(ctx, now + 0.1, 1760.0, 0.22, 0.09);
      } else if (birdId === 'volt') {
        // High-voltage Tesla spark arpeggio (C5 -> G5 -> C6 -> E6)
        const freqs = [523.25, 783.99, 1046.5, 1318.51];
        freqs.forEach((f, idx) => {
          this.scheduleTone(ctx, now + idx * 0.035, f, 'square', 0.09, 0.055, 2200);
        });
      } else {
        // Shimmering temporal crystal bell arpeggio (G5 -> B5 -> D6 -> G6)
        const notes = [783.99, 987.77, 1174.66, 1567.98];
        notes.forEach((f, idx) => {
          this.scheduleBellNote(ctx, now + idx * 0.04, f, 0.16, 0.075);
        });
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Plays a rich multi-layered sound effect for each bird's [E] special ability.
   */
  public playAbility(birdId: BirdId): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (birdId === 'kora') {
        // Aether Shield: Golden harmonic forcefield activation chord + metallic shimmer
        const chord = [392.0, 587.33, 783.99, 987.77];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.03;
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq * 0.92, start);
          osc.frequency.exponentialRampToValueAtTime(freq, start + 0.14);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.08, start + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.35);
        });
      } else if (birdId === 'zephyr') {
        // Gale Dash: Supersonic wind jet boom + phase-surge synth sweep
        this.playFilteredNoise(ctx, now, 0.28, 'bandpass', 420, 2800, 2.4, 0.13);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(280, now);
        osc1.frequency.exponentialRampToValueAtTime(1180, now + 0.22);
        osc2.frequency.setValueAtTime(420, now);
        osc2.frequency.exponentialRampToValueAtTime(1640, now + 0.22);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.27);
        osc2.stop(now + 0.27);
      } else if (birdId === 'ignis') {
        // Solar Pulse: Deep solar shockwave detonation + fire blast + bright flare chime
        this.scheduleDrumKick(ctx, now, 185, 42, 0.28, 0.16);
        this.playFilteredNoise(ctx, now, 0.26, 'lowpass', 1800, 240, 1.4, 0.12);
        this.scheduleBellNote(ctx, now + 0.04, 880.0, 0.28, 0.09);
        this.scheduleBellNote(ctx, now + 0.09, 1318.51, 0.3, 0.085);
      } else if (birdId === 'valkyrie') {
        // Astral Blink: Celestial warp shimmer + ascending starlight chord
        this.playFilteredNoise(ctx, now, 0.2, 'bandpass', 1200, 3400, 3.0, 0.08);
        const notes = [587.33, 880.0, 1174.66, 1760.0];
        notes.forEach((f, idx) => {
          this.scheduleBellNote(ctx, now + idx * 0.032, f, 0.26, 0.09);
        });
      } else if (birdId === 'volt') {
        // Tesla Overload: High-voltage EMP thunderclap + electric synth cascade
        this.scheduleDrumKick(ctx, now, 195, 50, 0.24, 0.15);
        this.playFilteredNoise(ctx, now, 0.22, 'bandpass', 2200, 900, 2.2, 0.1);
        const zaps = [659.25, 987.77, 1318.51, 1975.53];
        zaps.forEach((f, idx) => {
          this.scheduleTone(ctx, now + idx * 0.03, f, 'sawtooth', 0.12, 0.065, 2400);
        });
      } else {
        // Chronos Time Dilation: Pitch-bending clockwork warp down-sweep + decelerating ticks
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.exponentialRampToValueAtTime(210, now + 0.32);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.13, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);

        const tickTimes = [0.02, 0.09, 0.18, 0.3];
        const tickFreqs = [1480, 1180, 880, 640];
        tickTimes.forEach((offset, i) => {
          this.scheduleBellNote(ctx, now + offset, tickFreqs[i], 0.08, 0.075);
        });
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Plays when Kora's Aether Shield blocks and shatters an obstacle or trap.
   */
  public playShieldShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Metallic ward impact + crystalline upward shatter arpeggio
      this.scheduleDrumKick(ctx, now, 220, 65, 0.18, 0.14);
      this.playFilteredNoise(ctx, now, 0.16, 'highpass', 1600, 4200, 2.0, 0.08);
      const notes = [587.33, 880.0, 1174.66, 1567.98];
      notes.forEach((f, idx) => {
        this.scheduleBellNote(ctx, now + idx * 0.035, f, 0.22, 0.095);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Plays the distinct hazard sound for each of the 5 environment traps.
   */
  public playTrapSound(trapType: TrapType): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (trapType === 'oscillating_gears') {
        // Clockwork Citadel: Mechanical brass gear ratchet clicks + steam piston puff
        const clicks = [1120, 1460, 1820];
        clicks.forEach((freq, idx) => {
          this.scheduleTone(ctx, now + idx * 0.032, freq, 'triangle', 0.035, 0.065);
        });
        this.playFilteredNoise(ctx, now + 0.03, 0.11, 'bandpass', 1400, 750, 2.0, 0.055);
      } else if (trapType === 'whirlwind_gust') {
        // Bamboo Forest: Swirling crosswind vortex whoosh + hollow bamboo clack
        this.playFilteredNoise(ctx, now, 0.24, 'bandpass', 380, 1350, 3.2, 0.095);
        this.scheduleTone(ctx, now + 0.02, 420, 'triangle', 0.065, 0.075);
        this.scheduleTone(ctx, now + 0.07, 310, 'triangle', 0.075, 0.065);
      } else if (trapType === 'magma_geyser') {
        // Volcano Field: Erupting magma geyser rumble + sizzling lava steam burst
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(98, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.24);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);

        this.playFilteredNoise(ctx, now, 0.22, 'bandpass', 1600, 620, 1.5, 0.085);
      } else if (trapType === 'falling_icicle') {
        // Cold Ice Field: High-Q glacial ice crack snap + falling icicle whistle
        this.scheduleBellNote(ctx, now, 2350, 0.09, 0.09);
        this.scheduleBellNote(ctx, now + 0.025, 3120, 0.11, 0.085);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1680, now + 0.03);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.22);

        gain.gain.setValueAtTime(0.001, now + 0.03);
        gain.gain.linearRampToValueAtTime(0.075, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.03);
        osc.stop(now + 0.24);
      } else if (trapType === 'laser_grid') {
        // Cybernetic City: Sci-fi holo-laser zap + electric grid hum
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1560, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.16);

        mod.type = 'square';
        mod.frequency.setValueAtTime(95, now);
        modGain.gain.setValueAtTime(180, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(ctx.destination);

        mod.start(now);
        osc.start(now);
        mod.stop(now + 0.19);
        osc.stop(now + 0.19);
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Switches the active environment soundtrack and plays a brief preview of its trap sound.
   */
  public playEnvironmentSelect(envId: EnvironmentId, phase?: GamePhase): void {
    this.setEnvironmentMusic(envId, phase);
    const profile = getEnvironmentProfile(envId);
    this.playTrapSound(profile.trapType);
  }

  public playScore(score: number, comboMultiplier = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const scaleNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const pitchBoost = 1 + Math.max(0, comboMultiplier - 1) * 0.06;
      const baseFreq = scaleNotes[score % scaleNotes.length] * pitchBoost;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = comboMultiplier >= 3 ? 'sawtooth' : 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.setValueAtTime(baseFreq * 1.25, now + 0.065);
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
      osc2.frequency.setValueAtTime(baseFreq * 2.5, now + 0.065);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.13, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {
      // Ignore audio errors
    }
  }

  public playComboTierUp(multiplier: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const rootShift = 1 + Math.max(0, multiplier - 2) * 0.12;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51].slice(
        0,
        Math.min(5, multiplier + 1)
      );
      notes.forEach((freq, idx) => {
        this.scheduleBellNote(ctx, now + idx * 0.042, freq * rootShift, 0.22, 0.095);
      });
    } catch {
      // Ignore audio errors
    }
  }

  public playMilestone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.055;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.29);
      });
    } catch {
      // Ignore audio errors
    }
  }

  public playCollision(cause: DefeatCause = 'conduit_top'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (cause === 'trap_magma') {
        // Sizzling lava impact + deep eruption thud
        this.playFilteredNoise(ctx, now, 0.32, 'bandpass', 1800, 320, 1.4, 0.14);
        this.scheduleDrumKick(ctx, now, 150, 38, 0.3, 0.18);
        return;
      }
      if (cause === 'trap_icicle') {
        // Shattering ice crystal impact
        this.playFilteredNoise(ctx, now, 0.22, 'highpass', 2200, 4800, 2.2, 0.11);
        this.scheduleBellNote(ctx, now, 1960, 0.14, 0.11);
        this.scheduleBellNote(ctx, now + 0.03, 1240, 0.18, 0.1);
        this.scheduleDrumKick(ctx, now, 160, 48, 0.24, 0.15);
        return;
      }
      if (cause === 'trap_laser') {
        // High-voltage electric short-circuit zap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(62, now + 0.28);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.31);
        return;
      }

      // Standard conduit/boundary impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.26);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {
      // Ignore audio errors
    }
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore audio errors
    }
  }

  public dispose(): void {
    this.stopMusicLoop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
