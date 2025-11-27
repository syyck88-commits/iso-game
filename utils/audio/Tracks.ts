
import { AudioTrack } from './types';

// SCALE HELPER: 
// Intervals relative to root.
// Minor: 0, 2, 3, 5, 7, 8, 10
// Phrygian (Trap): 0, 1, 4, 5, 7, 8, 10

// IDLE: "NEON RAIN"
// 120 BPM. Chill Lofi/Synth.
export const TRACK_LOFI: AudioTrack = {
  name: 'NEON RAIN',
  mood: 'IDLE',
  tempo: 120, 
  rootFreq: 261.63, // C4
  scale: [0, 3, 7, 10], // Cm7 Arpeggio
  melodyProb: 0.1, // Mostly sparse
  // Slow, atmospheric arp
  arpPattern: [0, -1, 3, -1, 7, -1, 10, -1, 7, -1, 3, -1, 0, -1, -1, -1], 
  padFreqs: [1, 1.2, 1.5], // Cm Chord
  bassPattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  drumKit: {
      kickPattern: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], // Lofi beat
      snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihatPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
      hasFills: false
  }
};

// COMBAT: "DRIFT CITY"
// 160 BPM. Drift Phonk Style.
// Catchy Cowbell Melody.
export const TRACK_PHONK: AudioTrack = {
  name: 'DRIFT CITY',
  mood: 'COMBAT',
  tempo: 160, 
  rootFreq: 329.63, // E4 (High for cowbell)
  scale: [0, 1, 4, 5, 7, 8, 10], // Phrygian
  melodyProb: 1.0, 
  // THE HOOK (Phonk Cowbell Loop)
  // Intervals from root: 0=E, 12=E(8va), 7=B, 1=F
  melodyPattern: [0, -1, 12, -1, 0, -1, 7, -1, 1, -1, 0, -1, 7, -1, 12, 1],
  
  bassPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], 
  padFreqs: [],
  arpPattern: [], 
  drumKit: {
      kickPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // 4-on-the-floor
      snarePattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Classic trap snare
      hihatPattern: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2], // Rolling hats
      hasFills: true
  }
};

// BOSS: "CYBER WRATH"
// 175 BPM. Hardwave / Trap.
export const TRACK_TRAP_BOSS: AudioTrack = {
  name: 'CYBER WRATH',
  mood: 'BOSS',
  tempo: 175,
  rootFreq: 293.66, // D4
  scale: [0, 3, 5, 7, 10], // Minor Pentatonic
  melodyProb: 1.0,
  // Fast melodic run
  melodyPattern: [0, 3, 7, 12, 10, 7, 3, 0, 5, 8, 12, 15, 12, 8, 5, 0],
  
  bassPattern: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1], 
  padFreqs: [1, 1.5, 2], // Power chords
  arpPattern: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12], // Fast background arp
  drumKit: {
      kickPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
      snarePattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      hihatPattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1], // Open hats aggressive
      hasFills: true
  }
};
