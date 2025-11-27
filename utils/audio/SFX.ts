
import { AudioCore } from './AudioCore';
import { Instruments } from './Instruments';

export class SFX {
  private buffers: Map<string, AudioBuffer> = new Map();

  constructor(private core: AudioCore, private inst: Instruments) {}

  async initStep(name: string, log: (msg: string) => void) {
      log(`Generating SFX: ${name}`);
      let buf: AudioBuffer | null = null;
      
      // Increased duration slightly for some effects to cut through
      switch(name) {
          case 'explosion_small':
              buf = await this.core.renderToBuffer(0.8, (ctx, dest) => this.synthExplosion(ctx, dest, 0, 0.8), log);
              break;
          case 'explosion_medium':
              buf = await this.core.renderToBuffer(1.5, (ctx, dest) => this.synthExplosion(ctx, dest, 0, 1.2), log);
              break;
          case 'explosion_large':
              buf = await this.core.renderToBuffer(3.0, (ctx, dest) => this.synthExplosion(ctx, dest, 0, 2.5), log);
              break;
          case 'shoot':
              buf = await this.core.renderToBuffer(0.3, (ctx, dest) => this.synthShoot(ctx, dest, 0, 400), log);
              break;
          case 'shoot_heavy':
              buf = await this.core.renderToBuffer(0.5, (ctx, dest) => this.synthShoot(ctx, dest, 0, 150), log);
              break;
          case 'ui_click':
               buf = await this.core.renderToBuffer(0.1, (ctx, dest) => this.synthClick(ctx, dest, 0), log);
               break;
          case 'cancel':
              buf = await this.core.renderToBuffer(0.3, (ctx, dest) => this.synthCancel(ctx, dest, 0), log);
              break;
          case 'plasma':
              buf = await this.core.renderToBuffer(0.4, (ctx, dest) => this.synthPlasma(ctx, dest, 0), log);
              break;
          case 'alarm':
              buf = await this.core.renderToBuffer(0.6, (ctx, dest) => this.synthAlarm(ctx, dest, 0), log);
              break;
          case 'sniper':
              buf = await this.core.renderToBuffer(1.0, (ctx, dest) => this.synthSniper(ctx, dest, 0), log);
              break;
          case 'wave_start':
              buf = await this.core.renderToBuffer(4.0, (ctx, dest) => this.synthWaveStart(ctx, dest, 0), log);
              break;
          case 'laser': 
              buf = await this.core.renderToBuffer(0.2, (ctx, dest) => this.synthLaser(ctx, dest, 0), log);
              break;
          case 'phantom_death': 
              buf = await this.core.renderToBuffer(2.5, (ctx, dest) => this.synthPhantomDeath(ctx, dest, 0), log);
              break;
          case 'void_intro':
              buf = await this.core.renderToBuffer(4.0, (ctx, dest) => this.synthVoidIntro(ctx, dest, 0), log);
              break;
          case 'void_death':
              buf = await this.core.renderToBuffer(6.0, (ctx, dest) => this.synthVoidDeath(ctx, dest, 0), log);
              break;
          case 'hit': 
              buf = await this.core.renderToBuffer(0.2, (ctx, dest) => this.synthHit(ctx, dest, 0), log);
              break;
      }
      
      if (buf) {
          this.buffers.set(name, buf);
      } else {
          log(`FAILED to generate ${name}`);
      }
  }

  // --- Public Methods ---
  // Boosted volumes (generally +0.2 to +0.5 compared to previous)

  waveStart() {
      const buf = this.buffers.get('wave_start');
      if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 1.5);
  }

  shoot(pitchVar = 1.0) {
    const buf = pitchVar < 0.8 ? this.buffers.get('shoot_heavy') : this.buffers.get('shoot');
    if (buf) {
        const rate = pitchVar * (0.98 + Math.random() * 0.04);
        // High volume for main action
        this.core.playBuffer(buf, this.core.currentTime, 'SFX', rate, 1.2); 
    }
  }

  sniper() {
      const buf = this.buffers.get('sniper');
      if (buf) {
          this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 1.5);
          this.core.triggerDuck(0.2, 0.4); 
      }
  }

  plasma() {
      const buf = this.buffers.get('plasma');
      if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 0.9 + Math.random() * 0.2, 1.0);
  }
  
  laser() {
      const buf = this.buffers.get('laser');
      if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 0.9 + Math.random() * 0.2, 0.8); 
  }

  playPhantomDeath() {
      const buf = this.buffers.get('phantom_death');
      if (buf) {
          this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 2.0);
          this.core.triggerDuck(0.1, 1.0);
      }
  }

  playVoidIntro() {
      const buf = this.buffers.get('void_intro');
      if (buf) {
          this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 2.5);
          this.core.triggerDuck(0.1, 2.0);
      }
  }

  playVoidDeath() {
      const buf = this.buffers.get('void_death');
      if (buf) {
          this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 2.5);
          this.core.triggerDuck(0, 3.0);
      }
  }

  explosion(size: 'small' | 'medium' | 'large' = 'medium') {
    let buf;
    let vol = 1.5;
    if (size === 'small') { buf = this.buffers.get('explosion_small'); vol = 1.2; }
    else if (size === 'large') { buf = this.buffers.get('explosion_large'); vol = 2.0; this.core.triggerDuck(0.3, 0.5); }
    else { buf = this.buffers.get('explosion_medium'); }

    if (buf) {
        this.core.playBuffer(buf, this.core.currentTime, 'SFX', 0.9 + Math.random() * 0.2, vol);
    }
  }

  gold() {
      // Replaced Felt Piano with Chiptune equivalent logic locally or just a simple ping
      if (!this.core.ctx || !this.core.sfxBus) return;
      // Simple Pulse wave coin sound
      const t = this.core.currentTime;
      const osc = this.core.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1760, t + 0.05);
      const gain = this.core.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.connect(gain);
      gain.connect(this.core.sfxBus);
      osc.start(t); osc.stop(t+0.2);
  }

  build() {
      if(!this.core.ctx) return;
      const buf = this.buffers.get('ui_click');
      if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 0.8, 1.0);
  }
  
  levelUp() {
      // Chiptune powerup
      if (!this.core.ctx || !this.core.sfxBus) return;
      const t = this.core.currentTime;
      const osc = this.core.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.2);
      const gain = this.core.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.connect(gain);
      gain.connect(this.core.sfxBus);
      osc.start(t); osc.stop(t+0.3);
  }

  upgrade() {
      this.levelUp();
  }

  cancel() {
     const buf = this.buffers.get('cancel');
     if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 1.0);
  }
  
  hit() {
     const buf = this.buffers.get('hit');
     if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 0.9 + Math.random() * 0.2, 0.8);
  }

  pulse() {
     if (!this.core.ctx) return;
     // Deep triangle kick
     this.inst.nesTriangleBass(this.core.currentTime, 80, 0.4);
  }

  alarm() {
      const buf = this.buffers.get('alarm');
      if (buf) this.core.playBuffer(buf, this.core.currentTime, 'SFX', 1.0, 0.8);
  }

  gameover() {
      if (!this.core.ctx || !this.core.sfxBus) return;
      const t = this.core.currentTime;
      // Descending slide
      const osc = this.core.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 2.0);
      const gain = this.core.ctx.createGain();
      gain.gain.setValueAtTime(1.0, t);
      gain.gain.linearRampToValueAtTime(0, t + 2.0);
      osc.connect(gain);
      gain.connect(this.core.sfxBus);
      osc.start(t); osc.stop(t+2.0);
  }

  // --- Synthesis Logic ---

  private synthExplosion(ctx: BaseAudioContext, dest: AudioNode, time: number, scale: number) {
    const duration = 0.5 * scale;
    
    // Noise
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(10, time + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    
    // Sub-Bass
    const sub = ctx.createOscillator();
    sub.type = 'triangle'; // Cleaner rumble
    sub.frequency.setValueAtTime(120, time);
    sub.frequency.exponentialRampToValueAtTime(10, time + duration);
    
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(1.5, time);
    subGain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(20);

    sub.connect(subGain);
    subGain.connect(shaper);
    shaper.connect(dest);
    sub.start(time);

    // Crack
    if (scale > 1) {
        const crack = ctx.createOscillator();
        crack.type = 'square';
        crack.frequency.setValueAtTime(400, time);
        crack.frequency.exponentialRampToValueAtTime(50, time + 0.1);
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(0.5, time);
        crackGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        crack.connect(crackGain);
        crackGain.connect(dest);
        crack.start(time);
    }
  }

  private synthClick(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, time);
      osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time); osc.stop(time + 0.05);
  }

  private synthHit(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      // Crunchy impact
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 500;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
  }

  private synthShoot(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(time);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private synthCancel(ctx: BaseAudioContext, dest: AudioNode, time: number) {
     const osc = ctx.createOscillator();
     osc.type = 'square'; 
     osc.frequency.setValueAtTime(150, time);
     osc.frequency.linearRampToValueAtTime(100, time + 0.1);
     const gain = ctx.createGain();
     gain.gain.setValueAtTime(0.5, time);
     gain.gain.linearRampToValueAtTime(0, time + 0.1);
     osc.connect(gain);
     gain.connect(dest);
     osc.start(time);
     osc.stop(time + 0.2);
  }

  private synthPlasma(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, time);
      osc.frequency.linearRampToValueAtTime(100, time + 0.2);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, time);
      filter.frequency.linearRampToValueAtTime(200, time + 0.2);
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.2);
  }

  private synthAlarm(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, time); 
      osc.frequency.linearRampToValueAtTime(600, time + 0.5);
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.linearRampToValueAtTime(0, time + 0.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.5);
  }
  
  private synthSniper(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.4);
      const snap = ctx.createOscillator();
      snap.type = 'square';
      snap.frequency.setValueAtTime(2000, time);
      snap.frequency.exponentialRampToValueAtTime(500, time + 0.1);
      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.5, time);
      snapGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      gain.gain.setValueAtTime(1.0, time); 
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
      osc.connect(gain);
      snap.connect(snapGain);
      gain.connect(dest);
      snapGain.connect(dest);
      osc.start(time); osc.stop(time + 0.4);
      snap.start(time); snap.stop(time + 0.1);
  }
  
  private synthLaser(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, time); 
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.15);
  }
  
  private synthWaveStart(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(55, time); 
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(1.0, time + 1.0);
      gain.gain.linearRampToValueAtTime(0, time + 3.0);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, time);
      filter.frequency.linearRampToValueAtTime(400, time + 1.5);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time); osc.stop(time + 3.0);
  }
  
  private synthPhantomDeath(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, time);
      osc.frequency.exponentialRampToValueAtTime(100, time + 2.0); 
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.linearRampToValueAtTime(2000, time + 0.5);
      filter.frequency.linearRampToValueAtTime(200, time + 2.0);
      filter.Q.value = 10;
      gain.gain.setValueAtTime(1.0, time);
      gain.gain.linearRampToValueAtTime(0, time + 2.2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 2.5);
  }

  private synthVoidIntro(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, time);
      osc.frequency.linearRampToValueAtTime(40, time + 3.0);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, time);
      filter.frequency.linearRampToValueAtTime(500, time + 3.0);
      filter.Q.value = 5;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(1.5, time + 1.0);
      gain.gain.linearRampToValueAtTime(0, time + 4.0);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 4.0);
  }

  private synthVoidDeath(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const boomTime = time + 2.2;
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(150, boomTime);
      sub.frequency.exponentialRampToValueAtTime(10, boomTime + 3.0);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(2.0, boomTime); 
      subGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 3.0);
      sub.connect(subGain);
      subGain.connect(dest);
      sub.start(boomTime);
      sub.stop(boomTime + 3.5);
      this.synthExplosion(ctx, dest, boomTime, 3.0);
  }
  
  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
