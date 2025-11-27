
import React from 'react';

interface LoadingScreenProps {
    loadingState: 'INIT' | 'LOADING' | 'READY' | 'ERROR';
    progress: number;
    statusLog: string[];
    errorMsg: string;
    initComplete: boolean;
    onStart: () => void;
    onForceStart: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
    loadingState, progress, statusLog, errorMsg, initComplete, onStart, onForceStart 
}) => {
    
    if (loadingState === 'ERROR') {
        return (
            <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white p-4">
                <div className="text-rose-500 text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-rose-400 mb-2">Initialization Failed</h2>
                <div className="bg-black/40 p-4 rounded mb-6 font-mono text-xs text-rose-300 w-full max-w-md border border-rose-900/50">
                    <p className="mb-2 border-b border-rose-900/50 pb-2">CRITICAL ERROR LOG:</p>
                    {statusLog.slice(-5).map((log, i) => (
                        <div key={i} className="truncate">{log}</div>
                    ))}
                    <div className="mt-2 text-white bg-rose-900/50 p-1">LAST ERROR: {errorMsg}</div>
                </div>
                <button 
                    onClick={onForceStart}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded border border-slate-500 transition-colors"
                >
                    Start Without Audio
                </button>
            </div>
        );
    }

    if (loadingState === 'INIT' || loadingState === 'LOADING') {
        return (
            <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white font-mono">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-95"></div>
                
                <div className="z-10 flex flex-col items-center max-w-2xl w-full px-6">
                    <div className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-8 tracking-tighter drop-shadow-lg font-sans">
                        ISODEFEND
                    </div>
                    
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2 border border-slate-700">
                        <div 
                            className={`h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)] ${initComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    
                    <div className="flex justify-between w-full text-xs text-slate-500 mb-6">
                        <span className={initComplete ? "text-emerald-500 font-bold" : "animate-pulse"}>
                            {initComplete ? "SYSTEM READY" : "Initializing Systems..."}
                        </span>
                        <span>{Math.round(progress)}%</span>
                    </div>

                    <div className="w-full bg-black/90 border border-slate-800 rounded p-4 h-80 overflow-y-auto flex flex-col-reverse shadow-inner font-mono text-xs">
                        <div className="flex flex-col justify-end min-h-full whitespace-pre-wrap">
                            {statusLog.map((log, i) => (
                                <div key={i} className={`py-0.5 border-b border-white/5 break-all ${log.includes('ERROR') || log.includes('FAILED') ? 'text-rose-500 bg-rose-900/10' : 'text-emerald-500/90'}`}>
                                    <span className="text-slate-600 mr-2 opacity-50 select-none">{(i+1).toString().padStart(2, '0')}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>

                    {initComplete ? (
                        <button 
                            onClick={onStart}
                            className="mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-12 rounded-lg border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105 active:scale-95 text-lg tracking-widest"
                        >
                            LAUNCH SYSTEM
                        </button>
                    ) : (
                        <button 
                            onClick={onForceStart}
                            className="mt-6 text-xs text-slate-500 hover:text-white transition-colors underline decoration-slate-700 underline-offset-4 cursor-pointer"
                        >
                            Wait too long? Skip Audio Loading &rarr;
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
