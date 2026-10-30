import { HapticIntensity } from '../game/gameTypes';

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

  public configure(
    soundEnabled: boolean,
    musicEnabled: boolean,
    hapticIntensity: HapticIntensity = 'medium'
  ): void {
    this.soundEnabled = soundEnabled;
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

  public playDiceRoll(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Play realistic multi-tumble clatter ticks followed by a solid table impact thud
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
      osc.start(now);
      osc.stop(now + (isImpact ? 0.11 : 0.055));
    });
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
}

export const soundManager = new SoundManager();
