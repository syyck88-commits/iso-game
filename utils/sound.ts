
import { AudioCore } from './audio/AudioCore';
import { Instruments } from './audio/Instruments';
import { Sequencer } from './audio/Sequencer';
import { SFX } from './audio/SFX';
import { MusicState } from './audio/types';
import { Tracker } from './audio/Tracker';
import { TRACK_DATA_BOSS } from './audio/tracks/BossTrack';

export class SoundEngine {
  core: AudioCore;
  instruments: Instruments;
  sequencer: Sequencer;
  tracker: Tracker;
  sfx: SFX;
  isInitialized = false;

  constructor() {
      this.core = new AudioCore();
      this.instruments = new Instruments(this.core);
      this.sequencer = new Sequencer(this.core, this.instruments);
      this.tracker = new Tracker(this.core);
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
      
      // Instruments (7) + SFX (21) + Tracker (1) = 29 steps
      let completed = 0;
      const totalSteps = 29;
      
      const updateProgress = () => {
          completed++;
          if (onProgress) onProgress((completed / totalSteps) * 100);
      };

      const waitFrame = () => new Promise(resolve => setTimeout(resolve, 15)); // Faster load

      // --- TRACKER ENGINE (Primary) ---
      await this.tracker.init(log);
      updateProgress();
      await waitFrame();

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
      if (this.sequencer.isPlaying) return;
      // Default to IDLE music start if not playing
      // Note: Tracker is manually started via setMusicState
      if (!this.sequencer.isPlaying) {
          this.sequencer.start();
      }
  }

  setMusicState(state: MusicState) {
      if (state === 'BOSS' || state === 'PANIC') {
          // Switch to Tracker Engine
          if (this.sequencer.isPlaying) {
              this.sequencer.isPlaying = false; // Soft stop legacy engine
          }
          this.tracker.playTrack(TRACK_DATA_BOSS);
      } else {
          // Switch to Standard Engine (Legacy) for now
          this.tracker.stop();
          this.sequencer.setState(state);
          if (!this.sequencer.isPlaying) this.sequencer.start();
      }
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
