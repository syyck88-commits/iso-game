
import React, { useState, useRef, useEffect } from 'react';
import { EntityType } from '../types';
import { TowerFactory } from '../classes/TowerFactory';

// Access audio from global scope for UI
const playHover = () => {
    // @ts-ignore
    if(window.engineRef) window.engineRef.audio.playHover();
};

const playClick = () => {
    // @ts-ignore
    if(window.engineRef) window.engineRef.audio.playBuild(); 
};

const playError = () => {
    // @ts-ignore
    if(window.engineRef) window.engineRef.audio.playError();
};

interface TooltipInfo {
    title: string;
    cost: number;
    desc: string;
    stats: {
        dmg: string;
        spd: string;
        rng: string;
    }
}

export const TOOLTIPS: Record<string, TooltipInfo> = {
    [EntityType.TOWER_BASIC]: {
        title: 'Gatling Turret',
        cost: 30,
        desc: 'Standard rapid-fire kinetic defense. Good for early waves.',
        stats: { dmg: 'MOD', spd: 'HIGH', rng: 'MOD' }
    },
    [EntityType.TOWER_SNIPER]: {
        title: 'Railgun Sniper',
        cost: 50,
        desc: 'Long-range high-impact rounds. Targets high HP enemies.',
        stats: { dmg: 'HIGH', spd: 'LOW', rng: 'EXTREME' }
    },
    [EntityType.TOWER_PULSE]: {
        title: 'Shockwave Emitter',
        cost: 60,
        desc: 'Area of effect pulse. Damages all enemies in range.',
        stats: { dmg: 'LOW', spd: 'MOD', rng: 'SHORT' }
    },
    [EntityType.TOWER_LASER]: {
        title: 'Prism Beam',
        cost: 120,
        desc: 'Continuous laser that ramps up damage over time on single targets. Boss Killer.',
        stats: { dmg: 'RAMP', spd: 'MAX', rng: 'HIGH' }
    }
};

interface BuildMenuProps {
    selectedTool: EntityType | null;
    money: number;
    debugMode: boolean;
    onSelectTool: (tool: EntityType) => void;
    onNextWave: () => void;
}

// Sub-component for rendering tower preview to a canvas
const TowerIcon = ({ type }: { type: EntityType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;

        // Set resolution (Higher for crispness)
        cvs.width = 120; 
        cvs.height = 120;
        
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        
        ctx.save();
        // Scale up to fill the icon box
        ctx.scale(1.4, 1.4); 
        
        // Draw using the shared Game Engine logic
        TowerFactory.drawPreview(ctx, { x: 42, y: 65 }, type, Math.PI); 
        
        ctx.restore();
        
    }, [type]);

    return <canvas ref={canvasRef} className="w-full h-full drop-shadow-md" />;
};

export const BuildMenu: React.FC<BuildMenuProps> = ({ selectedTool, money, debugMode, onSelectTool, onNextWave }) => {
    const [hoveredTool, setHoveredTool] = useState<EntityType | null>(null);

    const tools = [
        { 
            id: 1, 
            type: EntityType.TOWER_BASIC, 
            color: 'blue'
        },
        { 
            id: 2, 
            type: EntityType.TOWER_PULSE, 
            color: 'purple'
        },
        { 
            id: 3, 
            type: EntityType.TOWER_SNIPER, 
            color: 'emerald'
        },
        { 
            id: 4, 
            type: EntityType.TOWER_LASER, 
            color: 'cyan'
        }
    ];

    const handleSelect = (t: EntityType, cost: number) => {
        if (debugMode || money >= cost) {
            playClick();
            onSelectTool(t);
        } else {
            playError();
        }
    };

    return (
        <>
            {/* Build Bar Tooltip */}
            {hoveredTool && TOOLTIPS[hoveredTool] && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-500 p-5 rounded-xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] w-80 text-white relative overflow-hidden">
                        {/* Decorative gradient header */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
                        
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-xl text-white tracking-wide">{TOOLTIPS[hoveredTool].title}</h3>
                            <span className={`font-mono font-bold px-2 py-1 rounded border ${debugMode || money >= TOOLTIPS[hoveredTool].cost ? 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50' : 'text-rose-400 bg-rose-900/30 border-rose-700/50'}`}>
                                {debugMode ? 'FREE' : `$${TOOLTIPS[hoveredTool].cost}`}
                            </span>
                        </div>
                        <p className="text-sm text-slate-300 mb-4 leading-relaxed font-light">{TOOLTIPS[hoveredTool].desc}</p>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-xs bg-black/40 p-3 rounded-lg border border-white/5">
                            <div>
                                <div className="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Damage</div>
                                <div className="font-mono font-bold text-rose-400 text-sm">{TOOLTIPS[hoveredTool].stats.dmg}</div>
                            </div>
                            <div className="border-l border-white/10">
                                <div className="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Speed</div>
                                <div className="font-mono font-bold text-blue-400 text-sm">{TOOLTIPS[hoveredTool].stats.spd}</div>
                            </div>
                            <div className="border-l border-white/10">
                                <div className="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Range</div>
                                <div className="font-mono font-bold text-emerald-400 text-sm">{TOOLTIPS[hoveredTool].stats.rng}</div>
                            </div>
                        </div>
                    </div>
                    {/* Tail */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-r border-b border-slate-500 transform rotate-45"></div>
                </div>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-auto z-10 px-6 py-4 bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl">
                
                <div className="flex gap-3">
                    {tools.map((t) => {
                        const canAfford = debugMode || money >= TOOLTIPS[t.type].cost;
                        return (
                            <button
                                key={t.type}
                                onClick={() => handleSelect(t.type, TOOLTIPS[t.type].cost)}
                                onMouseEnter={() => { playHover(); setHoveredTool(t.type); }}
                                onMouseLeave={() => setHoveredTool(null)}
                                className={`group relative flex flex-col items-center gap-1 p-1 rounded-xl transition-all duration-150 ${
                                    selectedTool === t.type
                                    ? `bg-slate-800 -translate-y-4 scale-110 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] border border-slate-500`
                                    : 'hover:-translate-y-1 hover:bg-slate-800/50 border border-transparent'
                                } ${!canAfford && selectedTool !== t.type ? 'opacity-60 grayscale' : ''}`}
                            >
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 rounded-full border border-slate-600 flex items-center justify-center z-20">
                                    <span className="text-[10px] text-slate-300 font-mono">{t.id}</span>
                                </div>

                                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br from-${t.color}-500 to-${t.color}-700 shadow-inner flex items-center justify-center text-white font-bold text-xl border-2 ${selectedTool === t.type ? 'border-white' : `border-${t.color}-400/30`}`}>
                                    <TowerIcon type={t.type} />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
                                    selectedTool === t.type 
                                        ? 'text-white bg-slate-700' 
                                        : canAfford 
                                            ? 'text-slate-500 group-hover:text-slate-300' 
                                            : 'text-rose-500 bg-rose-950/30'
                                }`}>
                                    {debugMode ? 'FREE' : `$${TOOLTIPS[t.type].cost}`}
                                </span>
                                
                                {/* Selection Indicator Dot */}
                                {selectedTool === t.type && (
                                    <div className="absolute -bottom-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="w-px h-12 bg-slate-700/50"></div>

                <button
                    onClick={() => { playClick(); onNextWave(); }}
                    onMouseEnter={playHover}
                    className="group relative h-14 pl-6 pr-8 bg-gradient-to-r from-rose-700 to-orange-700 hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg border border-white/10 active:scale-95 transition-all flex items-center gap-3 overflow-hidden"
                >
                    <div className="absolute -top-2 -right-2 w-10 h-5 bg-black/40 rounded-bl-lg flex items-center justify-center z-20 pointer-events-none">
                        <span className="text-[10px] text-white/70 font-mono">SPC</span>
                    </div>

                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                    
                    <span className="text-2xl animate-pulse drop-shadow-md">⚠️</span>
                    <div className="text-left leading-none relative z-10">
                        <div className="text-[10px] uppercase tracking-widest text-orange-200 mb-0.5 group-hover:text-white transition-colors">Initialize</div>
                        <div className="text-xl font-black italic tracking-tighter drop-shadow-md">NEXT WAVE</div>
                    </div>
                </button>
            </div>
        </>
    );
};
