import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, Sword, HeartPulse } from 'lucide-react';
import { RoomState, CLASS_ABILITIES } from '@daily-dungeon/shared';

interface InitiativeBarProps {
  roomState: RoomState;
  activeActorId?: string;
}

export const InitiativeBar: React.FC<InitiativeBarProps> = ({ roomState, activeActorId }) => {
  // Compute initiative track preview
  const trackItems: {
    id: string;
    name: string;
    speed: number;
    isEnemy: boolean;
    classType?: string;
    hasLocked?: boolean;
    isAlive: boolean;
  }[] = [];

  // Players
  for (const player of Object.values(roomState.players)) {
    let speedMod = 0;
    const queued = roomState.queuedActions?.[player.id];
    if (queued) {
      const abilities = CLASS_ABILITIES[player.classType];
      const ab = abilities.find((a) => a.id === queued.abilityId);
      if (ab) speedMod = ab.speedModifier;
    }
    const totalSpeed = player.baseSpeed + speedMod + (player.speedModifier || 0);

    trackItems.push({
      id: player.id,
      name: player.name,
      speed: totalSpeed,
      isEnemy: false,
      classType: player.classType,
      hasLocked: roomState.lockedPlayerIds.includes(player.id),
      isAlive: player.currentHp > 0,
    });
  }

  // Enemy
  if (roomState.enemy && roomState.enemy.currentHp > 0) {
    const enemySpeed =
      (roomState.enemy.telegraphedAction?.speed ?? roomState.enemy.baseSpeed) +
      (roomState.enemy.speedModifier || 0);

    trackItems.push({
      id: roomState.enemy.id,
      name: roomState.enemy.name,
      speed: enemySpeed,
      isEnemy: true,
      isAlive: true,
    });
  }

  // Sort descending
  trackItems.sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (!a.isEnemy && b.isEnemy) return -1;
    if (a.isEnemy && !b.isEnemy) return 1;
    return 0;
  });

  return (
    <div className="bg-dungeon-card border border-dungeon-border rounded-xl p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Turn Order & Initiative Track
        </span>
        <span className="text-[11px] text-slate-400">High speed acts first (D&D Speed)</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {trackItems.map((item, index) => {
          const isActive = activeActorId === item.id;
          return (
            <React.Fragment key={item.id}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex-shrink-0 ${
                  !item.isAlive
                    ? 'opacity-40 line-through bg-slate-900 border-slate-800 text-slate-400'
                    : isActive
                    ? 'ring-2 ring-amber-400 bg-amber-950/80 border-amber-500 text-white scale-105 shadow-md'
                    : item.isEnemy
                    ? 'bg-red-950/40 border-red-900 text-red-300'
                    : item.classType === 'warrior'
                    ? 'bg-amber-950/30 border-amber-900/60 text-amber-200'
                    : item.classType === 'rogue'
                    ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-200'
                    : 'bg-blue-950/30 border-blue-900/60 text-blue-200'
                }`}
              >
                {/* Speed Badge */}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    item.isEnemy
                      ? 'bg-red-800 text-red-100'
                      : 'bg-slate-800 text-amber-400 border border-slate-700'
                  }`}
                >
                  {item.speed}
                </span>

                <span className="font-semibold truncate max-w-[100px]">{item.name}</span>

                {!item.isEnemy && item.isAlive && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      item.hasLocked
                        ? 'bg-emerald-900 text-emerald-200 border border-emerald-500 shadow-sm'
                        : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                    }`}
                  >
                    {item.hasLocked ? '✓ READY' : 'WAITING'}
                  </span>
                )}
              </div>

              {index < trackItems.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
