

import React from 'react';

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
    onAnimDebug?: () => void; // New prop
    onMusicVolChange: (val: number) => void;
    onSfxVolChange: (val: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    money, health, wave, nextWaveType, debugMode, isPaused, timeScale,
    musicVol, sfxVol,
    onRestart, onPause, onTimeScale, onDebugToggle, onAnimDebug, onMusicVolChange, onSfxVolChange
}) => {
    // Calculate potential interest (10% capped at 1000)
    const nextInterest = Math.min(1000, Math.floor(money * 0.10));

    return (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-20">
            <div className="bg-slate-900/90 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-slate-700 pointer-events-auto flex gap-6 items-center">
                <div>
                    <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">ISODEFEND</h1>
                    <p className="text-xs text-slate-400 tracking-widest">V3.5 ENGINE</p>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="flex flex-col">
                    <span className="text-slate-400 text-xs uppercase font-bold">Credits</span>
                    <div className="flex flex-col leading-none">
                        <span className={`text-2xl font-mono ${debugMode ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {debugMode ? '∞' : '$' + money}
                        </span>
                        {!debugMode && nextInterest > 0 && (
                             <span className="text-[10px] text-emerald-500/80 font-mono tracking-tighter">
                                (+${nextInterest})
                             </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-slate-400 text-xs uppercase font-bold">Integrity</span>
                    <span className="text-2xl font-mono text-rose-400">{health}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-slate-400 text-xs uppercase font-bold">Wave</span>
                    <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-mono text-blue-400">{wave}</span>
                         {nextWaveType && (
                             <span className="text-[10px] text-slate-500 bg-slate-800 px-1 rounded uppercase tracking-wider">
                                Next: {nextWaveType.replace('BOSS_', '⚠️ ')}
                             </span>
                         )}
                    </div>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <button 
                    onClick={onRestart}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-3 rounded border border-slate-600 transition-colors"
                >
                    NEW MAP
                </button>
                
                <div className="flex gap-2">
                    <button onClick={onPause} className={`w-8 h-8 flex items-center justify-center rounded border ${isPaused ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                        {isPaused ? '▶' : '⏸'}
                    </button>
                    <button onClick={onTimeScale} className={`w-8 h-8 flex items-center justify-center rounded border ${timeScale > 1 ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                        ⏩
                    </button>
                </div>
            </div>
            
            <div className="pointer-events-auto flex flex-col gap-2 items-end">
                {/* Audio Controls */}
                <div className="bg-slate-900/90 backdrop-blur text-white p-3 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-2 w-48">
                    <div className="flex items-center gap-2">
                         <span className="text-xs text-slate-400 w-4">♪</span>
                         <input 
                            type="range" 
                            min="0" max="1" step="0.1" 
                            value={musicVol} 
                            onChange={(e) => onMusicVolChange(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                         />
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-xs text-slate-400 w-4">🔊</span>
                         <input 
                            type="range" 
                            min="0" max="1" step="0.1" 
                            value={sfxVol} 
                            onChange={(e) => onSfxVolChange(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                         />
                    </div>
                </div>

                {/* Debug Toggle */}
                <div className="flex gap-2">
                     <button onClick={onAnimDebug} className="bg-slate-900/90 text-xs text-purple-400 p-2 rounded border border-purple-500/50 hover:bg-slate-800">
                         ANIM DEBUG
                     </button>
                     <label className="flex items-center gap-2 bg-slate-900/90 text-xs text-slate-400 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-800">
                         <input 
                            type="checkbox" 
                            checked={debugMode} 
                            onChange={onDebugToggle} 
                            className="rounded bg-slate-700 border-slate-600 text-yellow-500 focus:ring-0"
                         />
                         <span>DEBUG MODE</span>
                     </label>
                 </div>
            </div>
        </div>
    );
};