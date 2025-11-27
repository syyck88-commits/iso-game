
import React from 'react';

interface GameOverProps {
    wave: number;
    onRestart: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ wave, onRestart }) => {
    return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-300 backdrop-blur-sm">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-500 to-orange-600 mb-4 drop-shadow-lg">GAME OVER</h1>
            <p className="text-2xl text-slate-300 mb-8">You survived <span className="text-white font-mono font-bold">{wave}</span> waves.</p>
            <button 
                onClick={onRestart}
                className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
                TRY AGAIN
            </button>
        </div>
    );
};
