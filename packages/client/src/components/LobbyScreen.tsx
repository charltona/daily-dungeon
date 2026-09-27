import React, { useState } from 'react';
import { Shield, Sparkles, Sword, Users, Play, Copy, Check, ShieldCheck } from 'lucide-react';
import { ClassType, CharacterSheet, CLASS_ABILITIES, CLASS_BASE_STATS, RoomState } from '@daily-dungeon/shared';

interface LobbyScreenProps {
  roomState: RoomState | null;
  onJoinRoom: (roomId: string, name: string, classType: ClassType) => void;
  onStartGame: (roomId: string) => void;
  currentPlayerId: string;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  onJoinRoom,
  onStartGame,
  currentPlayerId,
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassType>('warrior');
  const [roomId, setRoomId] = useState('CRYPT-42');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    const className = selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1);
    onJoinRoom(roomId.toUpperCase().trim(), className, selectedClass);
  };

  // If already in a room and room is in LOBBY status:
  if (roomState && roomState.status === 'LOBBY') {
    const isHost = roomState.hostPlayerId === currentPlayerId;
    const playersList = Object.values(roomState.players);

    return (
      <div className="max-w-2xl mx-auto p-6 bg-dungeon-card border border-dungeon-border rounded-2xl shadow-2xl mt-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Party Gathering</h2>
          <p className="text-sm text-slate-400 mt-1">
            Share this room code with 1 to 3 friends to tackle the daily crypt together.
          </p>
        </div>

        {/* Room Link Box */}
        <div className="bg-dungeon-darker p-4 rounded-xl border border-dungeon-border flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Room Code</div>
            <div className="text-xl font-mono font-black text-amber-400 tracking-widest">
              {roomState.roomId}
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Link!' : 'Copy Invite'}
          </button>
        </div>

        {/* Party Members List */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Party Roster ({playersList.length} / 4 Players)</span>
            <span className="text-amber-400 font-mono text-[11px]">Recommended: 2-4 Players</span>
          </div>

          <div className="space-y-2">
            {playersList.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-dungeon-darker/80 border border-dungeon-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase ${
                      player.classType === 'warrior'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : player.classType === 'rogue'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {player.classType[0]}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                      {player.name}
                      {player.id === roomState.hostPlayerId && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Host
                        </span>
                      )}
                      {player.id === currentPlayerId && (
                        <span className="text-[11px] text-amber-400 font-semibold">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      HP: {player.maxHp} &bull; Speed: {player.baseSpeed} &bull; Resource: {player.resourceType}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <Check className="w-4 h-4" /> Ready
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div>
          {isHost ? (
            <button
              onClick={() => onStartGame(roomState.roomId)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-base tracking-wide shadow-xl hover:shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              Descend into Crypt (Start Encounter)
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm animate-pulse">
              Waiting for party host to initiate the dungeon descent...
            </div>
          )}
        </div>
      </div>
    );
  }

  const classCards: { type: ClassType; label: string; desc: string }[] = [
    {
      type: 'warrior',
      label: 'Warrior',
      desc: 'High durability protector. Builds Rage on strikes and taking damage. Intercepts hits for allies.',
    },
    {
      type: 'rogue',
      label: 'Rogue',
      desc: 'Lightning fast (Speed 15). Builds Combo Points for vulnerable debuffs (+30% dmg) and smoke screens.',
    },
    {
      type: 'priest',
      label: 'Priest',
      desc: 'Tactical backline healer and shielder. Uses Mana to cast Flash Heal, Sanctuary shields, and speed smites.',
    },
  ];

  const selectedClassLabel = selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-dungeon-card border border-dungeon-border rounded-2xl shadow-2xl mt-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-amber-400 tracking-tight flex items-center justify-center gap-2">
          <span>DAILY DUNGEON</span>
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Synchronous co-op tactical micro-RPG. 2 encounters, untimed coordination, universal daily seed.
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-5">
        {/* Room Input */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
            Dungeon Room Code
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="CRYPT-42"
            className="w-full bg-dungeon-darker border border-dungeon-border rounded-xl px-3.5 py-2.5 font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500 uppercase text-base"
            required
          />
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
            Select Your Hero Class
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {classCards.map((c) => {
              const isSelected = selectedClass === c.type;
              const stats = CLASS_BASE_STATS[c.type];
              return (
                <div
                  key={c.type}
                  onClick={() => setSelectedClass(c.type)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-500/50 shadow-lg scale-102'
                      : 'border-dungeon-border bg-dungeon-darker/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-base text-slate-100">{c.label}</span>
                    <span className="text-[11px] font-mono text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      Spd {stats.baseSpeed}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-snug mb-3">{c.desc}</p>

                  <div className="text-[11px] font-mono text-slate-300 border-t border-dungeon-border/60 pt-1.5 flex justify-between">
                    <span>HP: {stats.maxHp}</span>
                    <span className="capitalize">{stats.resourceType}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Class Abilities Preview */}
        <div className="bg-dungeon-darker/60 p-3.5 rounded-xl border border-dungeon-border">
          <div className="text-xs font-bold uppercase text-slate-400 mb-2">
            {selectedClassLabel} Abilities:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            {CLASS_ABILITIES[selectedClass].map((ab) => (
              <div key={ab.id} className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <div className="font-bold text-amber-300 truncate">{ab.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{ab.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-base tracking-wide shadow-xl hover:shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          Join Dungeon as {selectedClassLabel}
        </button>
      </form>
    </div>
  );
};
