import { Howl, Howler } from 'howler';

/**
 * AudioEngine.js
 * Manages procedural sounds (heartbeat) and sfx using Web Audio API and Howler.
 */
export class AudioEngine {
  constructor() {
    this.ctx = Howler.ctx;
    if (!this.ctx) {
      console.warn('Howler context not ready. Will initialize on user interaction.');
    }
    
    // Heartbeat state
    this.heartbeatOsc1 = null;
    this.heartbeatOsc2 = null;
    this.heartbeatGain = null;
    this.isPlayingHeartbeat = false;
    this.heartbeatInterval = null;
    
    // SFX (using procedural generated buffers instead of external files)
    this.sfx = {};
  }

  init() {
    if (!this.ctx && Howler.ctx) {
      this.ctx = Howler.ctx;
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this._generateSounds();
  }

  _generateSounds() {
    // We generate simple beeps/clicks instead of loading files to keep it dependency-free
    
    // Typing click
    this.sfx.type = this._createProceduralSound('sine', 800, 0.05, 0.1);
    
    // Error buzz
    this.sfx.error = this._createProceduralSound('sawtooth', 150, 0.2, 0.5);
    
    // Backspace
    this.sfx.backspace = this._createProceduralSound('square', 300, 0.05, 0.1);
    
    // Jumpscare
    this.sfx.jumpscare = this._createProceduralSound('sawtooth', 50, 1.0, 1.5, true);
  }

  _createProceduralSound(type, freq, duration, maxVolume, distort = false) {
    return () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      if (distort) {
        osc.frequency.linearRampToValueAtTime(freq * 2, this.ctx.currentTime + duration);
        osc.detune.setValueAtTime(500, this.ctx.currentTime);
      }
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(maxVolume, this.ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    };
  }

  playType() { if (this.sfx.type) this.sfx.type(); }
  playError() { if (this.sfx.error) this.sfx.error(); }
  playBackspace() { if (this.sfx.backspace) this.sfx.backspace(); }
  playJumpscare() { if (this.sfx.jumpscare) this.sfx.jumpscare(); }

  startHeartbeat() {
    if (this.isPlayingHeartbeat || !this.ctx) return;
    this.isPlayingHeartbeat = true;
    
    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.connect(this.ctx.destination);
    
    this._scheduleNextHeartbeat(1.0); // Start at 1 beat per second
  }

  _scheduleNextHeartbeat(rate) {
    if (!this.isPlayingHeartbeat) return;
    
    const now = this.ctx.currentTime;
    
    // Double thump pattern
    this._triggerThump(now, rate);
    this._triggerThump(now + 0.15, rate * 0.8);
    
    // Schedule next
    // Limit max speed to avoid crazy overlapping
    const nextInterval = Math.max(0.3, 1.0 / rate);
    this.heartbeatInterval = setTimeout(() => {
      // the rate can be updated from outside
      this._scheduleNextHeartbeat(this.currentHeartbeatRate || 1.0);
    }, nextInterval * 1000);
  }

  _triggerThump(time, intensity) {
    if (!this.ctx || !this.heartbeatGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Frequency drop for punchy kick sound
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    
    // Volume envelope
    const vol = Math.min(1.0, 0.2 * intensity);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.02);
    gain.gain.linearRampToValueAtTime(0, time + 0.3);
    
    osc.connect(gain);
    gain.connect(this.heartbeatGain);
    
    osc.start(time);
    osc.stop(time + 0.3);
  }

  setHeartbeatIntensity(threatLevel) {
    // threatLevel 0.0 to 1.0
    // Rate: 1.0 (calm) to 3.0 (fast)
    this.currentHeartbeatRate = 1.0 + (threatLevel * 2.0);
  }

  stopHeartbeat() {
    this.isPlayingHeartbeat = false;
    clearTimeout(this.heartbeatInterval);
    if (this.heartbeatGain) {
      this.heartbeatGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      setTimeout(() => {
        if (this.heartbeatGain) {
          this.heartbeatGain.disconnect();
          this.heartbeatGain = null;
        }
      }, 500);
    }
  }
}
