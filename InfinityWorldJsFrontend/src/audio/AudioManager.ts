/**
 * AudioManager: Synthesized sound effects and ambient music using Web Audio API.
 * No external audio files needed - all sounds are procedurally generated.
 */

export type SoundEffect = 'place' | 'delete' | 'buy' | 'error' | 'click' | 'coins' | 'notification'

const STORAGE_KEY_MUSIC = 'iw_music_enabled'
const STORAGE_KEY_SFX = 'iw_sfx_enabled'

class AudioManager {
  private ctx: AudioContext | null = null
  private musicEnabled: boolean
  private sfxEnabled: boolean
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicOsc: OscillatorNode | null = null
  private musicLfo: OscillatorNode | null = null

  constructor() {
    this.musicEnabled = localStorage.getItem(STORAGE_KEY_MUSIC) !== '0'
    this.sfxEnabled = localStorage.getItem(STORAGE_KEY_SFX) !== '0'
  }

  /** Lazily initialize AudioContext (must be called from user gesture) */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this.musicEnabled ? 0.08 : 0
      this.musicGain.connect(this.ctx.destination)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this.sfxEnabled ? 0.3 : 0
      this.sfxGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  /** Start ambient background music (gentle pad sound) */
  startMusic(): void {
    const ctx = this.ensureContext()
    if (this.musicOsc) return // Already playing

    // Simple ambient pad: low oscillator with slow LFO
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 110 // A2

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.15
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 15
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    // Second voice for chord
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 165 // E3

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 300

    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(this.musicGain!)

    osc.start()
    osc2.start()
    lfo.start()

    this.musicOsc = osc
    this.musicLfo = lfo
    // Store osc2 reference for cleanup
    ;(this as unknown as { _musicOsc2: OscillatorNode })._musicOsc2 = osc2
  }

  stopMusic(): void {
    if (this.musicOsc) {
      this.musicOsc.stop()
      this.musicOsc = null
    }
    if (this.musicLfo) {
      this.musicLfo.stop()
      this.musicLfo = null
    }
    const osc2 = (this as unknown as { _musicOsc2?: OscillatorNode })._musicOsc2
    if (osc2) {
      osc2.stop()
      ;(this as unknown as { _musicOsc2?: OscillatorNode })._musicOsc2 = undefined
    }
  }

  /** Play a synthesized sound effect */
  play(effect: SoundEffect): void {
    if (!this.sfxEnabled) return
    const ctx = this.ensureContext()
    const now = ctx.currentTime

    switch (effect) {
      case 'place':
        this.playTone(ctx, now, 440, 0.08, 'sine', 0.15)
        this.playTone(ctx, now + 0.08, 660, 0.06, 'sine', 0.12)
        break

      case 'delete':
        this.playTone(ctx, now, 330, 0.1, 'sawtooth', 0.08)
        this.playTone(ctx, now + 0.05, 220, 0.15, 'sawtooth', 0.06)
        break

      case 'buy':
        this.playTone(ctx, now, 523, 0.06, 'sine', 0.15)
        this.playTone(ctx, now + 0.1, 659, 0.06, 'sine', 0.15)
        this.playTone(ctx, now + 0.2, 784, 0.08, 'sine', 0.2)
        break

      case 'coins':
        this.playTone(ctx, now, 1200, 0.04, 'sine', 0.1)
        this.playTone(ctx, now + 0.06, 1500, 0.04, 'sine', 0.08)
        break

      case 'error':
        this.playTone(ctx, now, 200, 0.15, 'square', 0.1)
        this.playTone(ctx, now + 0.12, 150, 0.2, 'square', 0.08)
        break

      case 'click':
        this.playTone(ctx, now, 800, 0.03, 'sine', 0.12)
        break

      case 'notification':
        this.playTone(ctx, now, 600, 0.05, 'sine', 0.1)
        this.playTone(ctx, now + 0.08, 800, 0.05, 'sine', 0.1)
        break
    }
  }

  private playTone(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    osc.connect(gain)
    gain.connect(this.sfxGain!)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.01)
  }

  // --- Settings ---

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled
    localStorage.setItem(STORAGE_KEY_MUSIC, enabled ? '1' : '0')
    if (this.musicGain) {
      this.musicGain.gain.value = enabled ? 0.08 : 0
    }
    if (!enabled) {
      this.stopMusic()
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled
    localStorage.setItem(STORAGE_KEY_SFX, enabled ? '1' : '0')
    if (this.sfxGain) {
      this.sfxGain.gain.value = enabled ? 0.3 : 0
    }
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled
  }
}

export const audio = new AudioManager()
