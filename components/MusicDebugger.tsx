
import React, { useEffect, useState, useRef } from 'react';
import { TRACK_LIBRARY } from '../utils/audio/TrackLibrary';

interface MusicDebuggerProps {
    onClose: () => void;
}

export const MusicDebugger: React.FC<MusicDebuggerProps> = ({ onClose }) => {
    const [selectedTrack, setSelectedTrack] = useState<string>('BOSS');
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(70);
    const [channels, setChannels] = useState<any[]>([]);
    const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
    const engineRef = useRef<any>(null);

    // Load persisted settings
    useEffect(() => {
        // @ts-ignore
        engineRef.current = window.engineRef;
        if (!engineRef.current) return;

        // Try load saved state
        const saved = localStorage.getItem('isodefend_music_debug');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.lastTrack) setSelectedTrack(data.lastTrack);
        }

        const tick = setInterval(() => {
            if (engineRef.current) {
                const t = engineRef.current.tracker;
                const state = t.getTrackState();
                
                // Sync Playback State from Engine (Fixes Bug 2)
                if (t.isPlayingState !== isPlaying) {
                    setIsPlaying(t.isPlayingState);
                }

                setChannels(prev => {
                    // Only update if length differs or we force it, otherwise let local state handle sliders until release
                    // Better: We sync ONCE on mount/track change, then UI drives state.
                    if (prev.length === 0 && state.channels.length > 0) {
                        setBpm(state.bpm);
                        return state.channels;
                    }
                    return prev;
                });
                
                if (state.instruments.length > 0 && availableInstruments.length === 0) {
                    setAvailableInstruments(state.instruments);
                }
            }
        }, 100);

        return () => clearInterval(tick);
    }, [isPlaying]);

    const playTrack = () => {
        // Fix Bug 1: Ensure legacy sequencer is stopped when taking manual control
        if (engineRef.current.audio.sequencer) {
            engineRef.current.audio.sequencer.stop();
        }

        const t = engineRef.current.tracker;
        const trackData = (TRACK_LIBRARY as any)[selectedTrack];
        if (trackData) {
            t.playTrack(trackData.data);
            setIsPlaying(true);
            
            // Wait a tick for parse
            setTimeout(() => {
                const state = t.getTrackState();
                setChannels(state.channels);
                setBpm(state.bpm);
                loadMixerSettings(selectedTrack);
            }, 100);
        }
    };

    const stopTrack = () => {
        engineRef.current.tracker.stop();
        setIsPlaying(false);
    };

    const loadMixerSettings = (trackKey: string) => {
        const saved = localStorage.getItem(`isodefend_mix_${trackKey}`);
        if (saved) {
            const mix = JSON.parse(saved);
            const t = engineRef.current.tracker;
            // Apply mix
            mix.forEach((ch: any) => {
                t.setChannelVolume(ch.id, ch.vol);
                t.setChannelMute(ch.id, ch.muted);
                t.setChannelInstrument(ch.id, ch.inst);
                t.setChannelPitch(ch.id, ch.pitch);
            });
            // Refresh UI
            setChannels(t.getTrackState().channels);
        }
    };

    const saveMixerSettings = () => {
        const t = engineRef.current.tracker;
        const state = t.getTrackState();
        localStorage.setItem(`isodefend_mix_${selectedTrack}`, JSON.stringify(state.channels));
        // Also save last track
        localStorage.setItem('isodefend_music_debug', JSON.stringify({ lastTrack: selectedTrack }));
    };

    const handleChannelChange = (id: number, field: string, value: any) => {
        const t = engineRef.current.tracker;
        if (field === 'vol') t.setChannelVolume(id, value);
        if (field === 'muted') t.setChannelMute(id, value);
        if (field === 'inst') t.setChannelInstrument(id, value);
        if (field === 'pitch') t.setChannelPitch(id, value);

        // Optimistic UI update
        setChannels(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleBpmChange = (val: number) => {
        setBpm(val);
        engineRef.current.tracker.setBpm(val);
    };

    return (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 w-[800px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                {/* Header */}
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <span className="text-emerald-500">♫</span> MUSIC DEBUGGER
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {/* Toolbar */}
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex gap-4 items-center">
                    <select 
                        value={selectedTrack} 
                        onChange={(e) => {
                            setSelectedTrack(e.target.value);
                            stopTrack();
                            setChannels([]); // Clear UI to force refresh on next play
                        }}
                        className="bg-slate-800 text-white text-xs p-2 rounded border border-slate-700 outline-none"
                    >
                        {Object.keys(TRACK_LIBRARY).map(key => (
                            <option key={key} value={key}>{(TRACK_LIBRARY as any)[key].name}</option>
                        ))}
                    </select>

                    <button 
                        onClick={isPlaying ? stopTrack : playTrack}
                        className={`px-4 py-1.5 rounded text-xs font-bold ${isPlaying ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}
                    >
                        {isPlaying ? 'STOP' : 'PLAY'}
                    </button>

                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-slate-500 font-bold">BPM</span>
                        <input 
                            type="range" min="30" max="200" value={bpm} 
                            onChange={(e) => handleBpmChange(parseInt(e.target.value))}
                            className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <span className="text-xs text-emerald-400 w-8">{bpm}</span>
                    </div>

                    <button 
                        onClick={saveMixerSettings}
                        className="ml-auto bg-blue-900/50 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded text-xs border border-blue-800"
                    >
                        SAVE PRESET
                    </button>
                </div>

                {/* Mixer */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/20">
                    {channels.length === 0 && (
                        <div className="text-center text-slate-600 italic py-10">Press Play to Load Channels</div>
                    )}
                    
                    {channels.map(ch => (
                        <div key={ch.id} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                            <div className="w-6 text-center text-xs font-bold text-slate-500">{ch.id}</div>
                            
                            {/* Instrument Select */}
                            <select 
                                value={ch.inst}
                                onChange={(e) => handleChannelChange(ch.id, 'inst', e.target.value)}
                                className="w-24 bg-black/30 text-[10px] text-cyan-300 p-1 rounded border border-slate-700 outline-none"
                            >
                                {availableInstruments.map(inst => (
                                    <option key={inst} value={inst}>{inst.toUpperCase()}</option>
                                ))}
                            </select>

                            {/* Pitch */}
                            <div className="flex flex-col w-24">
                                <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                                    <span>Pitch</span>
                                    <span>{ch.pitch > 0 ? '+' : ''}{ch.pitch}</span>
                                </div>
                                <input 
                                    type="range" min="-24" max="24" step="1" value={ch.pitch}
                                    onChange={(e) => handleChannelChange(ch.id, 'pitch', parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>

                            {/* Vol */}
                            <div className="flex flex-col flex-1">
                                <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                                    <span>Gain</span>
                                    <span>{Math.round(ch.vol * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1.5" step="0.05" value={ch.vol}
                                    onChange={(e) => handleChannelChange(ch.id, 'vol', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>

                            {/* Mute */}
                            <button 
                                onClick={() => handleChannelChange(ch.id, 'muted', !ch.muted)}
                                className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${ch.muted ? 'bg-rose-900/80 text-rose-200 border-rose-700' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}
                            >
                                {ch.muted ? 'M' : 'ON'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
