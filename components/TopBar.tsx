
import React from 'react';
import { SoundEngine } from '../utils/sound';

// Helper to access global audio for UI sounds since components are outside engine loop
// In a real app, this might be via Context, but direct access works here given the architecture.
const playHover = () => {
    // @ts-ignore
    if(window.engineRef) window.engineRef.audio.playHover();
};

const playClick = () => {
    // @ts-ignore
    if(window.engineRef) window.engineRef.audio.playBuild(); // Use generic click
};

interface TopBarProps {
    money: number;
    health: number;
    wave: number;
    nextWaveType?: string;
    debugMode: boolean;
    isPaused: boolean;
    timeScale: number;
    musicVol: number;
    sfxVol: number;
    onRestart: () => void;
    onPause: () => void;
    onTimeScale: () => void;
    onDebugToggle: () => void;
    onAnimDebug?: () => void; 
    onMusicVolChange: (val: number) => void;
    onSfxVolChange: (val: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    money, health, wave, nextWaveType, debugMode, isPaused, timeScale,
    musicVol, sfxVol,
    onRestart, onPause, onTimeScale, onDebugToggle, onAnimDebug, onMusicVolChange, onSfxVolChange
}) => {
    
    // Calculate potential interest
    const nextInterest = Math.min(1000, Math.floor(money * 0.10));

    return (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-20">
            
            {/* LEFT: STATUS MODULE */}
            <div className="flex gap-4 pointer-events-auto">
                <div className="bg-slate-950/90 backdrop-blur-md text-white p-1 rounded-bl-2xl rounded-tr-2xl shadow-2xl border-l-2 border-b-2 border-slate-700 flex flex-col min-w-[280px] overflow-hidden group">
                    {/* Header Strip */}
                    <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-800">
                        <h1 className="text-lg font-black italic tracking-tighter text-slate-200">
                            ISO<span className="text-amber-500">DEFEND</span>
                        </h1>
                        <span className="text-[10px] text-slate-500 font-mono">SYS.ONLINE</span>
                    </div>

                    {/* Resources Grid */}
                    <div className="p-4 grid grid-cols-2 gap-4">
                        {/* Money */}
                        <div className="relative">
                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Credits</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-emerald-500 font-mono text-sm">$</span>
                                <span className={`text-2xl font-mono font-bold ${debugMode ? 'text-yellow-400' : 'text-white'}`}>
                                    {money}
                                </span>
                            </div>
                            {!debugMode && nextInterest > 0 && (
                                <div className="text-[10px] text-emerald-500/80 font-mono absolute top-0 right-0">
                                    +{nextInterest} INT
                                </div>
                            )}
                        </div>

                        {/* Health */}
                        <div>
                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Integrity</div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-rose-500 transition-all duration-300"
                                        style={{width: `${Math.min(100, (health / 20) * 100)}%`}}
                                    ></div>
                                </div>
                                <span className="text-xl font-mono font-bold text-rose-400">{health}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave Info Pill */}
                <div className="bg-slate-950/90 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-slate-800 h-fit self-center flex items-center gap-3 px-4 py-2">
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Wave</span>
                        <span className="text-2xl font-mono font-bold text-blue-400">{wave}</span>
                    </div>
                    {nextWaveType && (
                        <div className="border-l border-slate-700 pl-3 flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase">Incoming</span>
                            <span className={`text-xs font-bold uppercase ${nextWaveType.includes('BOSS') ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
                                {nextWaveType.replace('BOSS_', '⚠️ CLASS ')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: CONTROL MODULE */}
            <div className="flex flex-col items-end gap-3 pointer-events-auto">
                {/* Audio Mix */}
                <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-xl w-48 transition-opacity duration-300 opacity-50 hover:opacity-100">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2" onMouseEnter={playHover}>
                             <span className="text-[10px] font-bold text-slate-500 w-6">MSC</span>
                             <input 
                                type="range" min="0" max="1" step="0.1" value={musicVol} 
                                onChange={(e) => onMusicVolChange(parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                             />
                        </div>
                        <div className="flex items-center gap-2" onMouseEnter={playHover}>
                             <span className="text-[10px] font-bold text-slate-500 w-6">SFX</span>
                             <input 
                                type="range" min="0" max="1" step="0.1" value={sfxVol} 
                                onChange={(e) => onSfxVolChange(parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                             />
                        </div>
                    </div>
                </div>

                {/* Game Controls */}
                <div className="flex gap-2 bg-slate-950/90 p-1.5 rounded-lg border border-slate-800 shadow-xl">
                    <button 
                        onClick={() => { playClick(); onRestart(); }}
                        onMouseEnter={playHover}
                        className="bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-white text-xs font-bold py-2 px-3 rounded transition-colors border border-transparent hover:border-rose-500/30"
                    >
                        RESET
                    </button>
                    <div className="w-px bg-slate-800 mx-1"></div>
                    <button 
                        onClick={() => { playClick(); onPause(); }}
                        onMouseEnter={playHover}
                        className={`w-9 h-9 flex items-center justify-center rounded transition-all ${isPaused ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        {isPaused ? '▶' : '⏸'}
                    </button>
                    <button 
                        onClick={() => { playClick(); onTimeScale(); }}
                        onMouseEnter={playHover}
                        className={`w-9 h-9 flex items-center justify-center rounded transition-all ${timeScale > 1 ? 'bg-blue-500 text-black shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        ⏩
                    </button>
                </div>
                
                {/* Debug Tools */}
                <div className="flex gap-2">
                     <button 
                        onClick={() => { playClick(); if(onAnimDebug) onAnimDebug(); }}
                        onMouseEnter={playHover}
                        className="bg-black/40 text-[10px] text-purple-400 px-2 py-1 rounded border border-purple-900/30 hover:bg-purple-900/20 transition-colors"
                     >
                         VIEWER
                     </button>
                     <label 
                        onMouseEnter={playHover}
                        className="flex items-center gap-2 bg-black/40 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors"
                     >
                         <input 
                            type="checkbox" 
                            checked={debugMode} 
                            onChange={() => { playClick(); onDebugToggle(); }} 
                            className="rounded bg-slate-700 border-slate-600 text-yellow-500 focus:ring-0 w-3 h-3"
                         />
                         <span>DEBUG</span>
                     </label>
                 </div>
            </div>
        </div>
    );
};
