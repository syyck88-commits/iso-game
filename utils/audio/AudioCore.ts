
export class AudioCore {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  compressor: DynamicsCompressorNode | null = null;
  
  // Buses
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;

  // FX Buses
  reverbNode: ConvolverNode | null = null;
  reverbGain: GainNode | null = null;
  delayNode: DelayNode | null = null;
  delayFeedback: GainNode | null = null;
  delayGain: GainNode | null = null;

  constructor() {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // --- MASTER CHAIN ---
      // Limiter/Compressor -> Master Gain -> Out
      this.compressor = this.ctx.createDynamicsCompressor();
      
      // Adjusted for cleaner transients (less squashing)
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime); // Was -18
      this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime); // Was 16 (too heavy)
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8; 

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // --- BUS SETUP ---
      // 1. SFX Bus (Louder, Direct)
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1.0; 
      this.sfxBus.connect(this.compressor);

      // 2. Music Bus (Background, duckable)
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.35; // Lower default music volume to let SFX shine
      this.musicBus.connect(this.compressor);

      // --- FX BUSES SETUP ---
      this.setupEffects();

    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  setupEffects() {
      if (!this.ctx || !this.compressor || !this.musicBus) return;

      // 1. REVERB (Convolver)
      this.reverbNode = this.ctx.createConvolver();
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.3; 
      
      this.generateImpulseResponse(2.0, 2.5);
      
      this.reverbNode.connect(this.reverbGain);
      // Route reverb to music bus so it ducks with music
      this.reverbGain.connect(this.musicBus); 

      // 2. DELAY
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.35; 
      
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.4;

      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = 0.3;

      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode); 
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.musicBus);
  }

  generateImpulseResponse(duration: number, decay: number) {
      if (!this.ctx || !this.reverbNode) return;
      const rate = this.ctx.sampleRate;
      const length = rate * duration;
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
          const n = i / length;
          const val = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
          left[i] = val;
          right[i] = val;
      }
      this.reverbNode.buffer = impulse;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  get currentTime() {
      return this.ctx ? this.ctx.currentTime : 0;
  }

  // Action Logic: Duck the music volume briefly for loud events
  triggerDuck(intensity: number = 0.5, duration: number = 0.2) {
      if (!this.musicBus || !this.ctx) return;
      
      const t = this.ctx.currentTime;
      // Dip down
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
      this.musicBus.gain.linearRampToValueAtTime(0.1, t + 0.05);
      
      // Return to normal
      this.musicBus.gain.exponentialRampToValueAtTime(0.35, t + 0.05 + duration);
  }

  async renderToBuffer(
      duration: number, 
      renderFn: (ctx: BaseAudioContext, dest: AudioNode) => void,
      log?: (msg: string) => void
  ): Promise<AudioBuffer | null> {
      try {
          // @ts-ignore
          const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          if (!OfflineCtx) return null;

          const sampleRate = 44100; 
          const offlineCtx = new OfflineCtx(1, Math.ceil(sampleRate * duration), sampleRate);
          
          renderFn(offlineCtx, offlineCtx.destination);
          
          const result = await offlineCtx.startRendering();
          return result;
      } catch (e) {
          return null;
      }
  }

  // Unified player with Bus Routing
  playBuffer(
      buffer: AudioBuffer, 
      time: number, 
      type: 'SFX' | 'MUSIC',
      playbackRate: number = 1.0, 
      volume: number = 1.0, 
      sendReverb = false
  ) {
      if (!this.ctx || !this.musicBus || !this.sfxBus) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      const gain = this.ctx.createGain();
      gain.gain.value = volume;

      source.connect(gain);
      
      // Route to correct bus
      if (type === 'SFX') {
          gain.connect(this.sfxBus);
      } else {
          gain.connect(this.musicBus);
      }
      
      // FX Sends (Only applied to music usually, or specific SFX)
      if (sendReverb && this.reverbNode && type === 'MUSIC') {
          const send = this.ctx.createGain();
          send.gain.value = 0.4;
          gain.connect(send);
          send.connect(this.reverbNode);
      }

      source.start(time);
  }
}
