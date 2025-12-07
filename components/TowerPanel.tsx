
import React, { useState } from 'react';
import { Tower } from '../classes/Entities';
import { EntityType, TargetingMode } from '../types';

interface TowerPanelProps {
    tower: Tower;
    money: number;
    debugMode: boolean;
    onUpgrade: () => void;
    onSell: () => void;
}

const StatBar: React.FC<{ label: string; value: number; max: number; colorClass: string }> = ({ label, value, max, colorClass }) => {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="mb-2">
            <div className="flex justify-between text-xs mb-1 uppercase tracking-wider text-slate-400">
                <span>{label}</span>
                <span className="text-white font-mono">{value.toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
};

export const TowerPanel: React.FC<TowerPanelProps> = ({ tower, money, debugMode, onUpgrade, onSell }) => {
    // Force re-render on mode switch
    const [, setTick] = useState(0);

    // Normalize stats for display bars based on tower type maximums
    // These max values are arbitrary "visual maximums" for the bars
    const getStats = () => {
        let dmg = tower.damage;
        let speed = (60 / Math.max(1, tower.maxCooldown)); // Shots per second approx
        if (tower.type === EntityType.TOWER_LASER) {
            dmg = tower.damage * 60; // DPS for laser
            speed = 10; // Continuous
        }
        
        return { dmg, speed, range: tower.range };
    };
    
    const stats = getStats();

    const cycleTargeting = () => {
        const modes = Object.values(TargetingMode);
        const currentIdx = modes.indexOf(tower.targetingMode);
        const nextIdx = (currentIdx + 1) % modes.length;
        tower.targetingMode = modes[nextIdx];
        setTick(prev => prev + 1);
    };

    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 p-6 rounded-xl shadow-2xl w-72 text-white animate-fade-in pointer-events-auto transition-all z-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-xl text-white">Tower System</h3>
                    <div className="text-xs text-yellow-500 font-mono">LEVEL {tower.level}</div>
                </div>
                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg 
                    ${tower.type === EntityType.TOWER_SNIPER ? 'bg-emerald-900 text-emerald-300 border border-emerald-500' : 
                      tower.type === EntityType.TOWER_PULSE ? 'bg-purple-900 text-purple-300 border border-purple-500' : 
                      tower.type === EntityType.TOWER_LASER ? 'bg-cyan-900 text-cyan-300 border border-cyan-500' : 
                      'bg-blue-900 text-blue-300 border border-blue-500'}`}>
                    {tower.type === EntityType.TOWER_SNIPER ? 'S' : 
                     tower.type === EntityType.TOWER_PULSE ? 'P' : 
                     tower.type === EntityType.TOWER_LASER ? 'L' : 'B'}
                </div>
            </div>
            
            <div className="space-y-4 mb-4 bg-black/20 p-4 rounded-lg border border-white/5">
                <StatBar label="Damage Output" value={stats.dmg} max={200} colorClass="bg-rose-500" />
                <StatBar label="Fire Rate" value={stats.speed} max={5} colorClass="bg-blue-400" />
                <StatBar label="Range" value={stats.range} max={10} colorClass="bg-emerald-400" />
                
                <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                    <span className="text-xs text-slate-500 uppercase">Eliminations</span>
                    <span className="font-mono text-yellow-400 font-bold text-lg">{tower.killCount}</span>
                </div>
            </div>

            {/* Targeting Toggle */}
            <div className="mb-4">
                <div className="text-xs text-slate-500 uppercase mb-1 font-bold">Targeting Priority</div>
                <button 
                    onClick={cycleTargeting}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded px-3 py-2 flex justify-between items-center transition-colors"
                >
                    <span className="text-sm font-bold text-emerald-400">{tower.targetingMode}</span>
                    <span className="text-xs text-slate-400">↻</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={onUpgrade}
                    disabled={!debugMode && money < tower.getUpgradeCost()}
                    className="col-span-2 group relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95 border border-white/10"
                >
                    <div className="relative z-10 flex justify-between items-center px-4">
                        <span className="text-sm">UPGRADE</span>
                        <span className="bg-black/30 px-2 py-0.5 rounded text-xs font-mono text-indigo-100 group-hover:text-white">
                            {debugMode ? 'FREE' : `$${tower.getUpgradeCost()}`}
                        </span>
                    </div>
                </button>
                
                <button 
                    onClick={onSell}
                    className="col-span-2 bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-white py-2 rounded-lg text-sm font-bold border border-slate-700 hover:border-rose-500/50 transition-colors flex justify-center items-center gap-2"
                >
                        <span>DISMANTLE</span>
                        <span className="text-xs opacity-70">
                        (+${tower.getSellValue()})
                        </span>
                </button>
            </div>
        </div>
    );
};
