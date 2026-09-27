import React from 'react';
import { Skull, AlertTriangle, Shield } from 'lucide-react';
import { EnemyUnit, CharacterSheet } from '@daily-dungeon/shared';

interface EnemyCardProps {
  enemy: EnemyUnit | null;
  players: Record<string, CharacterSheet>;
  isActive?: boolean;
}

export const EnemyCard: React.FC<EnemyCardProps> = ({ enemy, players, isActive }) => {
  if (!enemy) {
    return (
      <div className="bg-dungeon-card/60 border border-dungeon-border rounded-xl p-3 text-center text-slate-500 text-xs">
        No active encounter
      </div>
    );
  }

  const hpPercent = Math.max(0, Math.min(100, Math.round((enemy.currentHp / enemy.maxHp) * 100)));
  const telegraphed = enemy.telegraphedAction;

  let targetName = 'Party';
  if (telegraphed && telegraphed.targetId !== 'ALL_PLAYERS') {
    targetName = players[telegraphed.targetId]?.name || 'Ally';
  }

  return (
    <div
      className={`bg-dungeon-card rounded-xl p-2.5 shadow-md relative overflow-hidden transition-all ${
        isActive
          ? 'border-2 border-red-500 ring-2 ring-red-500/50 scale-[1.01]'
          : 'border border-red-900/60'
      }`}
    >
      {/* Top red glow line */}
      <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

      {/* Row 1: Name, Shield, HP numbers */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Skull className="w-4 h-4 text-red-400 flex-shrink-0" />
          <h2 className="text-sm font-extrabold text-slate-100 truncate flex items-center gap-1.5">
            {enemy.name}
            {enemy.shield ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900/80 text-blue-200 border border-blue-600 flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" /> +{enemy.shield}
              </span>
            ) : null}
          </h2>
        </div>

        <div className="font-mono text-xs font-black">
          <span className="text-red-400">{enemy.currentHp}</span>
          <span className="text-slate-500 text-[11px]"> / {enemy.maxHp} HP</span>
        </div>
      </div>

      {/* Row 2: Clean Health Bar */}
      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700/60 mb-2 p-[1px]">
        <div
          className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* Row 3: Compact Telegraph Intent Pill */}
      {telegraphed ? (
        <div className="bg-red-950/50 border border-red-800/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 truncate text-slate-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">
              <strong className="text-amber-300 font-bold">[{telegraphed.abilityName}]</strong>
              {' ➔ '}
              <span className="text-slate-100 font-semibold">{targetName}</span>
              {telegraphed.projectedDamage > 0 && (
                <span className="text-red-300 font-mono font-bold"> (~{telegraphed.projectedDamage} DMG)</span>
              )}
            </span>
          </div>

          <span className="text-[10px] font-mono text-amber-400 font-bold bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 flex-shrink-0">
            Spd {telegraphed.speed}
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 italic">Waiting for initiative...</div>
      )}
    </div>
  );
};
