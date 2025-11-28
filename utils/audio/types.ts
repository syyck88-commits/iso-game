
export type MusicState = 'IDLE' | 'COMBAT' | 'BOSS' | 'PANIC' | 'INTRO';

export interface AudioTrack {
  name: string;
  tempo: number;
  rootFreq: number; // Base frequency
  scale: number[]; // Interval steps
  bassPattern: number[]; // 16-step grid
  melodyProb: number; // Chance to play random note if no pattern
  melodyPattern?: number[]; // Fixed melody loop (catchy hook)
  padFreqs: number[]; // Chord frequencies relative to root multiplier
  mood: MusicState;
  
  // New Enhanced Fields
  arpPattern: number[]; // 16-step pattern for arpeggiator (interval index offsets)
  drumKit: {
      kickPattern: number[];
      snarePattern: number[];
      hihatPattern: number[]; // 0=off, 1=closed, 2=open
      hasFills: boolean; // If true, sequencer plays tom fills at end of loop
  };
}
