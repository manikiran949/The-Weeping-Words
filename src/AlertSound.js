/**
 * AlertSound — Procedural warning sound using Web Audio API.
 *
 * Generates a pulsing low-frequency alarm tone when the player
 * looks away from the screen. No external audio files needed.
 */

export class AlertSound {
  /** @type {AudioContext | null} */
  #ctx = null;

  /** @type {OscillatorNode | null} */
  #oscillator = null;

  /** @type {GainNode | null} */
  #gain = null;

  /** @type {boolean} */
  #playing = false;

  /**
   * Initialize the AudioContext. Must be called from a user gesture
   * (e.g. button click) to satisfy browser autoplay policies.
   */
  init() {
    if (this.#ctx) return;
    this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  /**
   * Start playing the warning tone.
   * Uses a low sawtooth oscillator with a pulsing gain envelope.
   */
  play() {
    if (this.#playing || !this.#ctx) return;
    this.#playing = true;

    // Oscillator: low menacing tone
    this.#oscillator = this.#ctx.createOscillator();
    this.#oscillator.type = 'sawtooth';
    this.#oscillator.frequency.setValueAtTime(80, this.#ctx.currentTime);

    // Gain node for pulsing effect
    this.#gain = this.#ctx.createGain();
    this.#gain.gain.setValueAtTime(0, this.#ctx.currentTime);

    // Pulse the volume: ramp up → down repeatedly
    const now = this.#ctx.currentTime;
    for (let i = 0; i < 60; i++) {
      // Each pulse is 0.3s: 0.1s ramp up, 0.2s ramp down
      this.#gain.gain.linearRampToValueAtTime(0.25, now + i * 0.3 + 0.1);
      this.#gain.gain.linearRampToValueAtTime(0.05, now + i * 0.3 + 0.3);
    }

    // Connect: oscillator → gain → output
    this.#oscillator.connect(this.#gain);
    this.#gain.connect(this.#ctx.destination);
    this.#oscillator.start();
  }

  /**
   * Stop the warning tone with a quick fade-out.
   */
  stop() {
    if (!this.#playing || !this.#ctx) return;
    this.#playing = false;

    if (this.#gain) {
      this.#gain.gain.cancelScheduledValues(this.#ctx.currentTime);
      this.#gain.gain.linearRampToValueAtTime(0, this.#ctx.currentTime + 0.1);
    }

    // Clean up after fade-out
    setTimeout(() => {
      if (this.#oscillator) {
        try { this.#oscillator.stop(); } catch (_) { /* already stopped */ }
        this.#oscillator.disconnect();
        this.#oscillator = null;
      }
      if (this.#gain) {
        this.#gain.disconnect();
        this.#gain = null;
      }
    }, 150);
  }

  /** @returns {boolean} */
  get isPlaying() {
    return this.#playing;
  }
}
