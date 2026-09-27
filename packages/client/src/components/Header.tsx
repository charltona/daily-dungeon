import React from 'react';
import { Shield, Skull, CheckCircle2, Clock } from 'lucide-react';
import { RoomState } from '@daily-dungeon/shared';

interface HeaderProps {
  roomState: RoomState;
}

export const Header: React.FC<HeaderProps> = ({ roomState }) => {
  const isCombat = roomState.status === 'COMBAT_INPUT';
  const isResolving = roomState.status === 'COMBAT_RESOLUTION';
  const isTransition = roomState.status === 'STAGE_TRANSITION';

  const alivePlayers = Object.values(roomState.players).filter((p) => p.currentHp > 0);
  const totalAlive = alivePlayers.length;
  const lockedCount = alivePlayers.filter((p) => roomState.lockedPlayerIds.includes(p.id)).length;

  return (
    <header className="bg-dungeon-card/90 border-b border-dungeon-border px-3 py-2 flex items-center justify-between gap-2 shadow-sm text-xs">
      {/* Room & Stage */}
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-amber-400 bg-dungeon-darker px-2 py-0.5 rounded border border-dungeon-border">
          {roomState.roomId}
        </span>
        <span className="text-[11px] font-semibold text-slate-300">
          R{roomState.roundNumber} &bull; {roomState.stage === 1 ? 'Minions' : 'Boss'}
        </span>
      </div>

      {/* Lock status pill */}
      <div>
        {isCombat && (
          <span
            className={`flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              lockedCount === totalAlive
                ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                : 'bg-amber-950/70 text-amber-300 border-amber-800/80 animate-pulse'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {lockedCount}/{totalAlive} Ready
          </span>
        )}

        {isResolving && (
          <span className="flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-600 animate-pulse">
            <Shield className="w-3.5 h-3.5 animate-spin" />
            Resolving
          </span>
        )}

        {isTransition && (
          <span className="flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-300 border border-yellow-600 animate-pulse text-[11px]">
            <Skull className="w-3.5 h-3.5" />
            Boss Spawning
          </span>
        )}
      </div>
    </header>
  );
};
