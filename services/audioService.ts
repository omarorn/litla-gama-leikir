
class AudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgMusic: HTMLAudioElement | null = null;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not supported");
      this.enabled = false;
    }

    if (typeof window !== 'undefined') {
        // Retro Arcade Style Music
        this.bgMusic = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/paza-moduless.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.2; // Default volume
    }
  }

  private ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMusic() {
      if (this.bgMusic) {
          this.bgMusic.play().catch(e => {
              // Ignore autoplay errors, wait for interaction
              console.debug("Music autoplay blocked, waiting for interaction");
          });
      }
  }

  pauseMusic() {
      if (this.bgMusic) {
          this.bgMusic.pause();
      }
  }

  setMusicVolume(volume: number) {
      if (this.bgMusic) {
          this.bgMusic.volume = Math.max(0, Math.min(1, volume));
      }
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSuccess() {
    // High pitch "Ding"
    this.playTone(880, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1760, 'sine', 0.3, 0.05), 50);
  }

  playError() {
    // Low pitch "Buzz"
    this.playTone(150, 'sawtooth', 0.3, 0.1);
    this.playTone(100, 'sawtooth', 0.3, 0.1);
  }

  playClick() {
    // Short "Blip"
    this.playTone(400, 'square', 0.05, 0.05);
  }

  playWin() {
    // Victory fanfare sequence
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.4, 0.1), i * 150);
    });
  }

  // Custom Trash Sounds
  playTrashCorrect() {
      // A satisfying "pop" / "coin" sound
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.playTone(1200, 'sine', 0.1, 0.1);
      setTimeout(() => this.playTone(2000, 'triangle', 0.2, 0.05), 50);
  }

  playTrashWrong() {
      // A dull "thud" or "splat"
      if (!this.ctx) return;
      this.playTone(100, 'sawtooth', 0.1, 0.2);
      setTimeout(() => this.playTone(80, 'square', 0.2, 0.2), 50);
  }

  playTrashBreak() {
      // A crunch/smash sound
      if (!this.ctx || !this.enabled) return;
      this.ensureContext();

      // Noise burst (simulated with random frequencies on sawtooth)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.2); // Drop pitch fast
      
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
      
      // Secondary high pitch "crack"
      this.playTone(800, 'square', 0.05, 0.1);
  }
}

export const audio = new AudioService();
