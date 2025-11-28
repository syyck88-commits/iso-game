
import { AudioCore } from './audio/AudioCore';
import { Instruments } from './audio/Instruments';
import { Sequencer } from './audio/Sequencer';
import { SFX } from './audio/SFX';
import { MusicState } from './audio/types';
import { Tracker } from './audio/Tracker';
import { TRACK_LIBRARY } from './audio/TrackLibrary';

export class SoundEngine {
  core: AudioCore;
  instruments: Instruments;
  sequencer: Sequencer;
  tracker: Tracker;
  sfx: SFX;
  isInitialized = false;

  // Track Cycling State
  private currentMusicState: MusicState = 'IDLE';
  private idleTrackIndex: number = 0;
  private readonly IDLE_TRACK_KEYS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];

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
      // If we are initialized but nothing is playing, kickstart the intro or idle track
      if (this.isInitialized && !this.tracker.isPlayingState && !this.sequencer.isPlaying) {
          // Default to INTRO on fresh load if nothing is specified
          this.setMusicState('INTRO');
      }
  }

  setMusicState(newState: MusicState) {
      // Prevent redundant switching if state hasn't changed
      if (this.currentMusicState === newState) return;

      const previousState = this.currentMusicState;
      this.currentMusicState = newState;

      // --- LOGIC FOR NEW STATE ---
      if (newState === 'BOSS' || newState === 'PANIC') {
          // 1. BOSS MODE: Tracker Engine (Boss Theme)
          if (this.sequencer.isPlaying) this.sequencer.stop();
          this.tracker.playTrack(TRACK_LIBRARY.BOSS.data);
      } 
      else if (newState === 'COMBAT') {
          // 2. COMBAT MODE: Sequencer Engine (Legacy Phonk)
          this.tracker.stop();
          this.sequencer.setState('COMBAT');
          if (!this.sequencer.isPlaying) this.sequencer.start();
      } 
      else if (newState === 'INTRO') {
          // 3. INTRO MODE: Tracker Engine (Special Intro Track)
          if (this.sequencer.isPlaying) this.sequencer.stop();
          this.tracker.playTrack(TRACK_LIBRARY.INTRO.data);
      }
      else if (newState === 'IDLE') {
          // 4. IDLE MODE: Tracker Engine (Cycling Levels)
          if (this.sequencer.isPlaying) this.sequencer.stop();

          // Select current track in cycle
          // @ts-ignore
          const trackKey = this.IDLE_TRACK_KEYS[this.idleTrackIndex];
          // @ts-ignore
          const trackData = TRACK_LIBRARY[trackKey].data;
          
          this.tracker.playTrack(trackData);

          // Increment cycle index ONLY if we are coming from a non-idle state (e.g. finishing a wave)
          // This prevents the track from skipping if setMusicState('IDLE') is called redundantly
          if (previousState === 'COMBAT' || previousState === 'BOSS' || previousState === 'PANIC') {
              this.idleTrackIndex = (this.idleTrackIndex + 1) % this.IDLE_TRACK_KEYS.length;
          }
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
