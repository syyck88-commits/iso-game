
import { AudioCore } from './audio/AudioCore';
import { Instruments } from './audio/Instruments';
import { Sequencer } from './audio/Sequencer';
import { SFX } from './audio/SFX';
import { MusicState } from './audio/types';

export class SoundEngine {
  core: AudioCore;
  instruments: Instruments;
  sequencer: Sequencer;
  sfx: SFX;
  isInitialized = false;

  constructor() {
      this.core = new AudioCore();
      this.instruments = new Instruments(this.core);
      this.sequencer = new Sequencer(this.core, this.instruments);
      this.sfx = new SFX(this.core, this.instruments);
  }

  async initialize(onProgress?: (pct: number) => void, onLog?: (msg: string) => void) {
      if (this.isInitialized) {
          if (onProgress) onProgress(100);
          return;
      }
      
      const log = (msg: string) => {
          console.log(`[AudioEngine] ${msg}`);
          if (onLog) onLog(msg);
      };

      log("Starting Sound Engine Initialization...");
      
      // Instruments (7) + SFX (21) = 28 steps
      let completed = 0;
      const totalSteps = 28;
      
      const updateProgress = () => {
          completed++;
          if (onProgress) onProgress((completed / totalSteps) * 100);
      };

      const waitFrame = () => new Promise(resolve => setTimeout(resolve, 15)); // Faster load

      // --- INSTRUMENTS ---
      log("Queueing Instruments...");
      await waitFrame();
      await this.instruments.initStep('kick', log); updateProgress(); await waitFrame();
      await this.instruments.initStep('snare', log); updateProgress(); await waitFrame();
      await this.instruments.initStep('hat_closed', log); updateProgress(); await waitFrame();
      await this.instruments.initStep('hat_open', log); updateProgress(); await waitFrame();
      await this.instruments.initStep('tom', log); updateProgress(); await waitFrame();
      await this.instruments.initStep('crash', log); updateProgress(); await waitFrame();
      await this.instruments.initStep('cowbell', log); updateProgress(); await waitFrame();

      // --- SFX ---
      log("Queueing SFX...");
      await waitFrame();
      await this.sfx.initStep('explosion_small', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('explosion_medium', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('explosion_large', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('shoot', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('shoot_heavy', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('ui_click', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('ui_hover', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('ui_error', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('impact_metal', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('impact_organic', log); updateProgress(); await waitFrame();
      
      await this.sfx.initStep('cancel', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('plasma', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('pulse', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('alarm', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('sniper', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('wave_start', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('laser', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('phantom_death', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('void_intro', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('void_death', log); updateProgress(); await waitFrame();
      await this.sfx.initStep('hit', log); updateProgress(); await waitFrame();
      
      this.isInitialized = true;
      log("Sound initialization complete!");
  }

  ensureContext() {
      this.core.resume();
      this.sequencer.start();
  }

  setMusicState(state: MusicState) {
      this.sequencer.setState(state);
  }

  setMusicVolume(vol: number) { this.core.setMusicVolume(vol); }
  setSfxVolume(vol: number) { this.core.setSfxVolume(vol); }

  playShoot(pitchVar?: number) { this.sfx.shoot(pitchVar); }
  playSniper() { this.sfx.sniper(); }
  playPlasma() { this.sfx.plasma(); }
  playExplosion(size: 'small' | 'medium' | 'large' = 'medium') { this.sfx.explosion(size); }
  playGold() { this.sfx.gold(); }
  playBuild() { this.sfx.build(); }
  playHover() { this.sfx.hover(); }
  playError() { this.sfx.error(); }
  playImpactMetal() { this.sfx.impactMetal(); }
  playImpactOrganic() { this.sfx.impactOrganic(); }
  playUpgrade() { this.sfx.upgrade(); }
  playCancel() { this.sfx.cancel(); }
  playHit() { this.sfx.hit(); }
  playPulse() { this.sfx.pulse(); }
  playAlarm() { this.sfx.alarm(); }
  playWaveStart() { this.sfx.waveStart(); }
  playGameOver() { this.sfx.gameover(); }
  playLaser() { this.sfx.laser(); }
  playPhantomDeath() { this.sfx.playPhantomDeath(); }
  playVoidIntro() { this.sfx.playVoidIntro(); }
  playVoidDeath() { this.sfx.playVoidDeath(); }
}
