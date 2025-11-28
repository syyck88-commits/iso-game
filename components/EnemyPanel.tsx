
import React from 'react';
import { BaseEnemy } from '../classes/enemies/BaseEnemy';
import { DamageType } from '../types';

interface EnemyPanelProps {
    enemy: BaseEnemy;
}

export const EnemyPanel: React.FC<EnemyPanelProps> = ({ enemy }) => {
    if (enemy.health <= 0) return null;

    const info = enemy.getEnemyInfo();
    const hpPct = Math.max(0, (enemy.health / enemy.maxHealth) * 100);

    const renderDamageType = (type: DamageType, label: string) => {
        let status = 'NEUTRAL';
        if (info.weakness.includes(type)) status = 'WEAK';
        if (info.resistance.includes(type)) status = 'RESIST';

        let color = 'text-slate-500';
        let bg = 'bg-slate-800/50';
        let icon = '•';

        if (status === 'WEAK') {
            color = 'text-green-400';
            bg = 'bg-green-900/30 border border-green-700/50';
            icon = '▲'; // Up arrow for bonus dmg
        } else if (status === 'RESIST') {
            color = 'text-red-400';
            bg = 'bg-red-900/30 border border-red-700/50';
            icon = '▼'; // Down arrow for reduced dmg
        }

        return (
            <div className={`flex justify-between items-center p-2 rounded ${bg} mb-1 text-xs`}>
                <span className="text-slate-300 font-bold">{label}</span>
                <span className={`font-mono font-bold ${color} flex items-center gap-1`}>
                    {status} {status !== 'NEUTRAL' && <span>{icon}</span>}
                </span>
            </div>
        );
    };

    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur border border-red-900/50 p-6 rounded-xl shadow-2xl w-72 text-white animate-fade-in pointer-events-auto z-20">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="text-xs text-red-500 font-bold tracking-widest uppercase mb-1">TARGET LOCKED</div>
                    <h3 className="font-black text-2xl text-white uppercase leading-none">{enemy.variant}</h3>
                </div>
                <div className="w-10 h-10 bg-red-950 rounded border border-red-800 flex items-center justify-center text-xl">
                    👾
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1 uppercase tracking-wider text-slate-400">
                    <span>Integrity</span>
                    <span className="text-white font-mono">{Math.ceil(enemy.health)}/{enemy.maxHealth}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${hpPct}%` }}></div>
                </div>
            </div>

            <div className="bg-black/30 p-3 rounded-lg border border-white/5 mb-4">
                <p className="text-xs text-slate-300 italic leading-relaxed">
                    "{info.description}"
                </p>
            </div>

            <div className="space-y-1">
                <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 border-b border-slate-700 pb-1">Combat Analysis</div>
                {renderDamageType(DamageType.KINETIC, 'KINETIC (Gatling)')}
                {renderDamageType(DamageType.PIERCING, 'PIERCING (Sniper)')}
                {renderDamageType(DamageType.EXPLOSIVE, 'EXPLOSIVE (Pulse)')}
                {renderDamageType(DamageType.ENERGY, 'ENERGY (Laser)')}
            </div>
        </div>
    );
};
