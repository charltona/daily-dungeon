import React from 'react';
import { Trophy, Skull, RotateCcw, Sparkles } from 'lucide-react';
import { RoomState } from '@daily-dungeon/shared';

interface EndGameScreenProps {
  roomState: RoomState;
  onRetry: () => void;
  isHost: boolean;
  onClose?: () => void;
}

export const EndGameScreen: React.FC<EndGameScreenProps> = ({
  roomState,
  onRetry,
  isHost,
  onClose,
}) => {
  const isVictory = roomState.status === 'VICTORY';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div
        className={`max-w-md w-full rounded-2xl border p-6 shadow-2xl text-center relative overflow-hidden ${
          isVictory
            ? 'bg-dungeon-card border-amber-500/80'
            : 'bg-dungeon-card border-red-800/80'
        }`}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
          >
            ✕
          </button>
        )}
        <div
          className={`absolute top-0 right-0 left-0 h-1.5 ${
            isVictory
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
              : 'bg-gradient-to-r from-red-600 via-rose-700 to-red-600'
          }`}
        />

        {/* Big Icon */}
        <div
          className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border shadow-xl ${
            isVictory
              ? 'bg-amber-950/80 border-amber-500 text-amber-400'
              : 'bg-red-950/80 border-red-600 text-red-400'
          }`}
        >
          {isVictory ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        <h2 className="text-2xl font-black text-slate-100 tracking-tight mb-1">
          {isVictory ? 'DUNGEON CLEARED!' : 'PARTY WIPED'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {isVictory
            ? 'The Crypt Overseer has fallen. Your party emerges victorious!'
            : 'The darkness of the Sunken Crypt was too formidable today.'}
        </p>

        {/* Stats Card */}
        <div className="bg-dungeon-darker p-4 rounded-xl border border-dungeon-border mb-6 text-left space-y-2 font-mono text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Encounter Completed:</span>
            <span className="font-bold text-slate-100">
              {isVictory ? '2 / 2 (Full Clear)' : `Stage ${roomState.stage}`}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Rounds Taken:</span>
            <span className="font-bold text-slate-100">{roomState.roundNumber}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>XP Gained:</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {isVictory ? '+120 XP' : '+30 XP'}
            </span>
          </div>
          {isVictory && (
            <div className="flex justify-between text-emerald-400 font-bold border-t border-dungeon-border/80 pt-2">
              <span>Loot Card:</span>
              <span>Crypt Conqueror Ring</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {isHost ? (
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {isVictory ? 'Play Another Seed' : 'Quick Retry (Restart Room)'}
            </button>
          ) : (
            <div className="text-xs text-slate-400 italic mt-1">
              Waiting for host to initiate quick retry...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
