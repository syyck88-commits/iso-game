
import { AudioCore } from './AudioCore';
import { Instruments } from './Instruments';
import { AudioTrack, MusicState } from './types';
import { TRACK_LOFI, TRACK_PHONK, TRACK_TRAP_BOSS } from './Tracks';

export class Sequencer {
  nextNoteTime: number = 0;
  current16thNote: number = 0;
  isPlaying: boolean = false;
  
  // Track State
  currentState: MusicState = 'IDLE';
  currentTrack: AudioTrack = TRACK_LOFI;
  
  // Melody Logic
  measureCount: number = 0;

  // Settings
  scheduleAheadTime = 0.1;

  constructor(private core: AudioCore, private inst: Instruments) {}

  start() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      if (this.core.ctx) {
        this.nextNoteTime = this.core.currentTime + 0.1;
        this.core.resume();
      }
      this.scheduler();
  }

  setState(state: MusicState) {
      if (this.currentState === state) return;
      
      this.currentState = state;
      
      switch(state) {
          case 'PANIC': 
          case 'BOSS': 
              this.switchTrack(TRACK_TRAP_BOSS); 
              break;
          case 'COMBAT': 
              this.switchTrack(TRACK_PHONK); 
              break;
          case 'IDLE':
          default: 
              this.switchTrack(TRACK_LOFI); 
              break;
      }
  }

  switchTrack(track: AudioTrack) {
      this.currentTrack = track;
      this.measureCount = 0;
      this.current16thNote = 0; 
  }

  scheduler() {
      if (!this.core.ctx) return;

      while (this.nextNoteTime < this.core.currentTime + this.scheduleAheadTime) {
          this.scheduleNote(this.current16thNote, this.nextNoteTime);
          this.nextNote();
      }
      
      if (this.isPlaying) {
          requestAnimationFrame(this.scheduler.bind(this));
      }
  }

  nextNote() {
      const secondsPerBeat = 60.0 / this.currentTrack.tempo;
      this.nextNoteTime += 0.25 * secondsPerBeat; // 1/16th note
      this.current16thNote++;
      if (this.current16thNote === 16) {
          this.current16thNote = 0;
          this.measureCount++;
      }
  }

  scheduleNote(beat: number, time: number) {
      const track = this.currentTrack;
      const kit = track.drumKit;
      const isFillBar = track.drumKit.hasFills && (this.measureCount % 4 === 3); 
      const isCrashBeat = this.measureCount % 8 === 0 && beat === 0;

      // --- 1. DRUMS ---
      if (isCrashBeat) {
          this.inst.crash(time);
          this.inst.kick(time, 1.2);
      } else {
          // Regular Drums
          const isFillZone = isFillBar && beat >= 12;

          if (!isFillZone) {
              if (kit.kickPattern[beat]) this.inst.kick(time);
              if (kit.snarePattern[beat]) this.inst.snare(time);
              const hh = kit.hihatPattern[beat];
              if (hh === 1) this.inst.hiHat(time, false);
              else if (hh === 2) this.inst.hiHat(time, true);
          } else {
              // TOM ROLL
              if (beat >= 12) {
                  this.inst.tom(time, 1.5 - (beat - 12)*0.1); 
                  if (beat % 2 === 0) this.inst.kick(time); 
              }
          }
      }

      // --- 2. BASS (808) ---
      if (track.bassPattern[beat]) {
          const bassFreq = track.rootFreq / 4; // Sub bass
          this.inst.synth808(time, bassFreq, 0.3);
      }

      // --- 3. MELODY (Phonk Cowbell / Lead) ---
      if (track.melodyPattern && track.melodyPattern.length > 0) {
          const noteOffset = track.melodyPattern[beat];
          if (noteOffset !== undefined && noteOffset !== -1) {
              // Calculate frequency based on Semitones from Root
              const freq = track.rootFreq * Math.pow(2, noteOffset / 12);
              
              if (track.mood === 'COMBAT') {
                  this.inst.phonkCowbell(time, freq); // Phonk Hook
              } else {
                  this.inst.pluck(time, freq); // Regular Lead
              }
          }
      }

      // --- 4. CHORDS / ARPS ---
      // If we have pads defined, play super saws on beat 0
      if (track.padFreqs.length > 0 && beat === 0) {
          track.padFreqs.forEach(mult => {
              this.inst.superSaw(time, track.rootFreq * mult, 2.0, 0.15); // Long chord
          });
      }

      // Arpeggiator
      if (track.arpPattern && track.arpPattern.length > 0) {
           const arpInterval = track.arpPattern[beat];
           if (arpInterval !== undefined && arpInterval !== -1) {
                const freq = track.rootFreq * Math.pow(2, arpInterval / 12);
                this.inst.pluck(time, freq * 2); // High arp
           }
      }
  }
}
