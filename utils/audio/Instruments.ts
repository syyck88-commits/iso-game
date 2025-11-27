
import { AudioCore } from './AudioCore';

export class Instruments {
  private buffers: Map<string, AudioBuffer> = new Map();

  constructor(private core: AudioCore) {}

  // Granular init
  async initStep(name: string, log: (msg: string) => void) {
      log(`Generating Instrument: ${name}`);
      let buf: AudioBuffer | null = null;

      switch(name) {
          case 'kick':
               buf = await this.core.renderToBuffer(0.3, (ctx, dest) => this.synthKick(ctx, dest, 0), log);
               break;
          case 'snare':
               buf = await this.core.renderToBuffer(0.2, (ctx, dest) => this.synthSnare(ctx, dest, 0), log);
               break;
          case 'hat_closed':
               buf = await this.core.renderToBuffer(0.05, (ctx, dest) => this.synthHiHat(ctx, dest, 0, false), log);
               break;
          case 'hat_open':
               buf = await this.core.renderToBuffer(0.25, (ctx, dest) => this.synthHiHat(ctx, dest, 0, true), log);
               break;
          case 'crash':
               buf = await this.core.renderToBuffer(1.5, (ctx, dest) => this.synthCrash(ctx, dest, 0), log);
               break;
          case 'tom':
               buf = await this.core.renderToBuffer(0.3, (ctx, dest) => this.synthTom(ctx, dest, 0), log);
               break;
          case 'cowbell':
               buf = await this.core.renderToBuffer(0.4, (ctx, dest) => this.synthCowbell(ctx, dest, 0), log);
               break;
      }

      if (buf) {
          this.buffers.set(name, buf);
      }
  }

  // --- Public Methods (Play) ---

  kick(time: number, vol = 1.0) {
    const buf = this.buffers.get('kick');
    // Tight, punchy kick
    if (buf) this.core.playBuffer(buf, time, 'MUSIC', 1.0, vol * 1.3);
  }

  snare(time: number, vol = 1.0) {
    const buf = this.buffers.get('snare');
    if (buf) this.core.playBuffer(buf, time, 'MUSIC', 1.0, vol * 1.1, false); 
  }

  tom(time: number, pitch = 1.0) {
      const buf = this.buffers.get('tom');
      if (buf) this.core.playBuffer(buf, time, 'MUSIC', pitch, 0.9, false); 
  }

  crash(time: number) {
      const buf = this.buffers.get('crash');
      if (buf) this.core.playBuffer(buf, time, 'MUSIC', 1.0, 0.6, false);
  }

  hiHat(time: number, open: boolean) {
     const buf = this.buffers.get(open ? 'hat_open' : 'hat_closed');
     if (buf) this.core.playBuffer(buf, time, 'MUSIC', 1.0, open ? 0.5 : 0.4); 
  }

  phonkCowbell(time: number, freq: number) {
      const buf = this.buffers.get('cowbell');
      // Base cowbell is usually C5 ish (approx 523Hz). 
      // We pitch shift it to play melodies.
      const baseFreq = 523.25;
      const rate = freq / baseFreq;
      if (buf) this.core.playBuffer(buf, time, 'MUSIC', rate, 0.7, true);
  }

  // --- SYNTHS ---

  // 1. 808 Bass: Deep Sine + Saturation + Slide
  synth808(time: number, freq: number, dur: number) {
    if (!this.core.ctx || !this.core.musicBus) return;
    const ctx = this.core.ctx;
    
    const osc = ctx.createOscillator();
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(freq, time);
    // Pitch slide (kick feel)
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);
    osc.frequency.linearRampToValueAtTime(freq * 0.8, time + dur); // Slight pitch drop

    const gain = ctx.createGain();
    
    // Envelope: Punchy attack, long sustain
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1.0, time + 0.02);
    gain.gain.setValueAtTime(0.8, time + 0.1);
    gain.gain.linearRampToValueAtTime(0, time + dur);

    // Distortion for that "Phone" sound
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(10); 
    
    // Lowpass to tame the distortion sizzle
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(shaper);
    shaper.connect(filter);
    filter.connect(gain);
    gain.connect(this.core.musicBus);
    
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  // 2. SuperSaw: Thick, detuned saws for pads/leads
  superSaw(time: number, freq: number, dur: number, vol: number = 0.3) {
      if (!this.core.ctx || !this.core.musicBus) return;
      const ctx = this.core.ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, time);
      masterGain.gain.linearRampToValueAtTime(vol, time + 0.05);
      masterGain.gain.setValueAtTime(vol * 0.7, time + dur - 0.05);
      masterGain.gain.linearRampToValueAtTime(0, time + dur);
      masterGain.connect(this.core.musicBus);

      // Create 3 detuned oscillators
      const detunes = [0, -12, 12]; // Cents
      detunes.forEach(d => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = d;
          osc.connect(masterGain);
          osc.start(time);
          osc.stop(time + dur);
      });
  }

  // 3. Pluck: Short, percussive synth for arps
  pluck(time: number, freq: number) {
      if (!this.core.ctx || !this.core.musicBus) return;
      const ctx = this.core.ctx;
      
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, time);
      filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);
      filter.Q.value = 5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.core.musicBus);

      osc.start(time); 
      osc.stop(time + 0.25);
  }

  // 4. NES Triangle Bass: Pseudo-triangle wave with simple envelope
  nesTriangleBass(time: number, freq: number, dur: number) {
      if (!this.core.ctx || !this.core.musicBus) return;
      const ctx = this.core.ctx;
      
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.linearRampToValueAtTime(0, time + dur);

      osc.connect(gain);
      gain.connect(this.core.musicBus);
      
      osc.start(time);
      osc.stop(time + dur + 0.05);
  }

  // --- Private Synthesis Logic ---
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

  // --- DRUMS ---

  private synthKick(ctx: BaseAudioContext, dest: AudioNode, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Modern EDM Kick: Fast pitch sweep
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.1);
    
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    // Gentle clip
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(10);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(dest);
    
    osc.start(time); osc.stop(time + 0.3);
  }

  private synthSnare(ctx: BaseAudioContext, dest: AudioNode, time: number) {
    // Body (Tone)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.1);
    
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    // Noise (Snap)
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.connect(oscGain);
    oscGain.connect(dest);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    
    osc.start(time);
    noise.start(time);
  }

  private synthHiHat(ctx: BaseAudioContext, dest: AudioNode, time: number, open: boolean) {
     const duration = open ? 0.3 : 0.05;
     const bufferSize = ctx.sampleRate * duration;
     const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
     const data = buffer.getChannelData(0);
     for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1);

     const noise = ctx.createBufferSource();
     noise.buffer = buffer;

     const filter = ctx.createBiquadFilter();
     filter.type = 'highpass'; 
     filter.frequency.value = 8000;

     const gain = ctx.createGain();
     gain.gain.setValueAtTime(open ? 0.6 : 0.4, time);
     gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

     noise.connect(filter);
     filter.connect(gain);
     gain.connect(dest);
     noise.start(time);
  }

  private synthCrash(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const duration = 2.0;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
  }

  private synthTom(ctx: BaseAudioContext, dest: AudioNode, time: number) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
  }

  private synthCowbell(ctx: BaseAudioContext, dest: AudioNode, time: number) {
    // 808 Cowbell style
    // Two square waves passed through a bandpass filter
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'square';
    osc2.type = 'square';
    
    // Frequencies for the metallic clank
    osc1.frequency.value = 540; 
    osc2.frequency.value = 800;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600; // Resonant frequency
    filter.Q.value = 2; // Medium resonance
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    
    osc1.start(time); osc1.stop(time + 0.3);
    osc2.start(time); osc2.stop(time + 0.3);
  }
}
