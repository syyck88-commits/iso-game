
import { AudioCore } from './AudioCore';

const PPQ = 48;
// Use 44.1kHz for broader compatibility.
const SAMPLE_RATE = 44100;

interface Note {
    pitch: number;
    time: number;
    dur: number;
}

interface Track {
    id: number;
    notes: Note[];
    ptr: number;
    settings: any;
}

export class Tracker {
    private core: AudioCore;
    private buffers: Map<string, AudioBuffer> = new Map();
    private tracks: Record<number, Track> = {};
    private activeNodes: AudioBufferSourceNode[] = [];
    
    // Playback State
    private isPlaying: boolean = false;
    private bpm: number = 70;
    private tickRate: number = 0;
    private loopStart: number = 0;
    private loopEnd: number = 0;
    private currentTick: number = 0;
    private audioRefTime: number = 0;
    private schedulerTimer: any = null;
    
    // Synthesis Helpers
    private echoOn: boolean = true;
    private isBaked: boolean = false;
    private currentDataStr: string = '';
    
    // FX for this player
    private delayNode: DelayNode | null = null;
    private delayWet: GainNode | null = null;

    constructor(core: AudioCore) {
        this.core = core;
    }

    async init(log: (msg: string) => void) {
        log("Initializing Tracker Engine...");
        
        try {
            log("Baking Instruments...");
            await this.bakeSamples();
            
            // Setup FX specific to this engine
            if (this.core.ctx) {
                this.delayNode = this.core.ctx.createDelay();
                this.delayNode.delayTime.value = 0.375;
                
                const fb = this.core.ctx.createGain(); 
                fb.gain.value = 0.4;
                
                const flt = this.core.ctx.createBiquadFilter(); 
                flt.type='lowpass'; 
                flt.frequency.value=2000;
                
                this.delayNode.connect(fb); 
                fb.connect(flt); 
                flt.connect(this.delayNode);
                
                this.delayWet = this.core.ctx.createGain(); 
                this.delayWet.gain.value = 0.35;
                
                // Route delay to master music bus
                this.delayNode.connect(this.delayWet);
                if (this.core.musicBus) {
                    this.delayWet.connect(this.core.musicBus);
                }
            }
            log("Tracker Engine Ready.");
        } catch (e) {
            console.error("Tracker Init Failed", e);
            log("WARNING: Tracker Init Failed");
            this.isBaked = false;
        }
    }

    async playTrack(base64Data: string) {
        if (!this.isBaked || !this.core.ctx) return;
        
        // If already playing this track, do nothing
        if (this.isPlaying && this.currentDataStr === base64Data) return;
        
        this.stop();
        this.currentDataStr = base64Data;

        try {
            const jsonStr = await this.gzipDecompress(base64Data);
            this.parseData(JSON.parse(jsonStr));
            
            this.isPlaying = true;
            this.core.resume();
            
            // Reset pointers
            this.currentTick = this.loopStart;
            Object.values(this.tracks).forEach(t => {
                let i = 0;
                while(i < t.notes.length && t.notes[i].time < this.currentTick) i++;
                t.ptr = i;
            });
            
            this.audioRefTime = this.core.currentTime + 0.1;
            this.schedule();
        } catch (e) {
            console.error("Failed to play track", e);
        }
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.schedulerTimer);
        this.activeNodes.forEach(node => { try { node.stop(); } catch(e) {} });
        this.activeNodes = [];
    }

    private schedule() {
        if (!this.isPlaying || !this.core.ctx) return;
        
        const lookahead = 0.1;
        while (this.audioRefTime < this.core.ctx.currentTime + lookahead) {
            Object.values(this.tracks).forEach(t => {
                while(t.ptr < t.notes.length && t.notes[t.ptr].time === this.currentTick) {
                    if (!t.settings.muted) {
                        this.playSample(t, t.notes[t.ptr].pitch, this.audioRefTime, t.notes[t.ptr].dur);
                    }
                    t.ptr++;
                }
            });
            
            this.currentTick++;
            this.audioRefTime += this.tickRate;
            
            if (this.currentTick >= this.loopEnd) {
                this.currentTick = this.loopStart;
                Object.values(this.tracks).forEach(t => {
                    let i = 0;
                    while(i < t.notes.length && t.notes[i].time < this.currentTick) i++;
                    t.ptr = i;
                });
            }
        }
        
        this.schedulerTimer = setTimeout(() => this.schedule(), 25);
    }

    private playSample(track: Track, notePitch: number, time: number, durTick: number) {
        if (this.activeNodes.length >= 80) {
            const oldSrc = this.activeNodes.shift();
            try { oldSrc?.stop(); } catch(e) {}
        }
        
        const s = track.settings;
        const buffer = this.buffers.get(s.inst);
        if (!buffer || !this.core.ctx || !this.core.musicBus) return;
        
        const src = this.core.ctx.createBufferSource();
        src.buffer = buffer;
        
        const targetPitch = notePitch + s.pitch;
        const detune = targetPitch - 60;
        src.playbackRate.value = Math.pow(2, detune / 12);
        
        const gain = this.core.ctx.createGain();
        gain.gain.value = s.vol;
        
        src.connect(gain);
        gain.connect(this.core.musicBus); // Route to main engine bus
        
        // Echo send (Data Driven > Legacy Fallback)
        let sendAmount = 0;
        if (s.delay !== undefined) {
            sendAmount = s.delay;
        } else {
            // Legacy fallback for tracks without explicit delay setting
            if (s.inst === 'lead' || s.inst === 'acid') sendAmount = 0.4;
        }

        if (sendAmount > 0 && this.echoOn && this.delayNode) {
            const send = this.core.ctx.createGain();
            send.gain.value = sendAmount;
            gain.connect(send);
            send.connect(this.delayNode);
        }
        
        src.start(time);
        this.activeNodes.push(src);
        src.onended = () => {
            const idx = this.activeNodes.indexOf(src);
            if (idx > -1) this.activeNodes.splice(idx, 1);
        };
        
        // Envelope/Gate
        const durSec = durTick * this.tickRate;
        if (s.inst === 'lead' || s.inst === 'acid' || s.inst === 'bass') {
            gain.gain.setValueAtTime(s.vol, time);
            gain.gain.setValueAtTime(s.vol, time + durSec);
            gain.gain.linearRampToValueAtTime(0, time + durSec + 0.1);
            src.stop(time + durSec + 0.15); 
        }
    }

    private async gzipDecompress(base64: string) {
        if (!base64) throw new Error("Invalid base64 data");

        // Clean up whitespace/newlines that may break atob
        const cleanBase64 = base64.replace(/[\s\n\r]/g, '');
        
        if (cleanBase64.length < 10) throw new Error("Base64 data too short");

        const binaryString = window.atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for(let i=0; i<binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        
        const stream = new Blob([bytes]).stream();
        
        // @ts-ignore
        if (typeof DecompressionStream === 'undefined') {
            throw new Error("DecompressionStream not supported in this browser");
        }

        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        
        try {
            const response = new Response(decompressedStream);
            return await response.text();
        } catch (e) {
            throw new Error("Decompression stream failed: " + (e as any).message);
        }
    }

    private parseData(data: any) {
        this.bpm = data[0];
        this.tickRate = 60 / (this.bpm * PPQ);
        this.loopStart = data[2];
        this.loopEnd = data[3];
        this.tracks = {};
        
        data[4].forEach((tArr: any) => {
            const id = tArr[0];
            const settings = tArr[2];
            const flatNotes = tArr[3];
            
            const notes: Note[] = [];
            let lastTime = this.loopStart;
            
            for(let i=0; i<flatNotes.length; i+=3) {
                const pitch = flatNotes[i];
                const delta = flatNotes[i+1];
                const dur = flatNotes[i+2];
                const absTime = lastTime + delta;
                notes.push({ pitch, time: absTime, dur });
                lastTime = absTime;
            }
            
            settings.inst = tArr[1];
            this.tracks[id] = { id, notes, ptr: 0, settings };
        });
    }

    // --- BAKING SAMPLES ---
    
    private async bakeSamples() {
        this.buffers.set('lead', await this.bakeSynth('saw', 6.0));
        this.buffers.set('acid', await this.bakeSynth('acid', 6.0));
        this.buffers.set('bass', await this.bakeSynth('bass', 6.0));
        this.buffers.set('kick', await this.bakeDrum('kick'));
        this.buffers.set('snare', await this.bakeDrum('snare'));
        this.buffers.set('hat', await this.bakeDrum('hat'));
        this.isBaked = true;
    }

    private async bakeSynth(type: string, dur: number) {
        // @ts-ignore
        const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const off = new OfflineCtx(2, SAMPLE_RATE * dur, SAMPLE_RATE);
        
        if (type === 'saw') {
            [-20, -10, 0, 10, 20].forEach((d, i) => {
                const o = off.createOscillator(); o.type='sawtooth'; o.frequency.value=261.63; o.detune.value=d;
                const p = off.createStereoPanner(); p.pan.value = [-1, -0.5, 0, 0.5, 1][i];
                const g = off.createGain(); g.gain.value = 0.2;
                o.connect(g); g.connect(p); p.connect(off.destination); o.start(0);
            });
        } else if (type === 'acid') {
            const o = off.createOscillator(); o.type='square'; o.frequency.value=261.63;
            const f = off.createBiquadFilter(); f.type='lowpass'; f.Q.value=18; f.frequency.setValueAtTime(800, 0); f.frequency.exponentialRampToValueAtTime(100, 0.4);
            const s = off.createWaveShaper(); s.curve = this.makeDistortionCurve(400);
            o.connect(f); f.connect(s); s.connect(off.destination); o.start(0);
        } else if (type === 'bass') {
            const o = off.createOscillator(); o.type='triangle'; o.frequency.value=261.63;
            const sub = off.createOscillator(); sub.type='sine'; sub.frequency.value=261.63;
            o.connect(off.destination); sub.connect(off.destination); o.start(0); sub.start(0);
        }
        return off.startRendering();
    }
    
    private async bakeDrum(type: string) {
        // @ts-ignore
        const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const dur = (type==='hat') ? 0.1 : 0.4;
        const off = new OfflineCtx(2, SAMPLE_RATE * dur, SAMPLE_RATE);
        
        if (type === 'kick') {
            const o = off.createOscillator(); o.frequency.setValueAtTime(150, 0); o.frequency.exponentialRampToValueAtTime(40, 0.1);
            const g = off.createGain(); g.gain.setValueAtTime(1,0); g.gain.exponentialRampToValueAtTime(0.01, 0.3);
            const b = off.createBuffer(1, SAMPLE_RATE*0.02, SAMPLE_RATE); const d = b.getChannelData(0); for(let i=0; i<d.length; i++) d[i] = Math.random()*2-1;
            const cSrc = off.createBufferSource(); cSrc.buffer=b; const cG = off.createGain(); cG.gain.value=0.3;
            const s = off.createWaveShaper(); s.curve = this.makeDistortionCurve(50);
            o.connect(g); g.connect(s); s.connect(off.destination); cSrc.connect(cG); cG.connect(off.destination); o.start(0); cSrc.start(0);
        } else {
            const b = off.createBuffer(1, SAMPLE_RATE*dur, SAMPLE_RATE); const d = b.getChannelData(0); for(let i=0; i<d.length; i++) d[i] = Math.random()*2-1;
            const src = off.createBufferSource(); src.buffer = b;
            const f = off.createBiquadFilter();
            if(type==='hat') { f.type='highpass'; f.frequency.value=8000; } else { f.type='bandpass'; f.frequency.value=2000; f.Q.value=1; }
            const g = off.createGain(); g.gain.setValueAtTime(1,0); g.gain.exponentialRampToValueAtTime(0.01, dur);
            src.connect(f); f.connect(g); g.connect(off.destination); src.start(0);
        }
        return off.startRendering();
    }

    private makeDistortionCurve(amount: number) {
        const n = 44100, curve = new Float32Array(n);
        for (let i=0; i<n; ++i ) { const x = i*2/n - 1; curve[i] = (3+amount)*x*20*(Math.PI/180)/(Math.PI+amount*Math.abs(x)); }
        return curve;
    }
}
