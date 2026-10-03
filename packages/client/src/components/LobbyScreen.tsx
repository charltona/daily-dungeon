import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, Sword, Users, Play, Copy, Check, ShieldCheck, Dices, UserCircle } from 'lucide-react';
import { RoomState, generateRoomCode, CLASS_BASE_STATS, ClassType } from '@daily-dungeon/shared';

interface LobbyScreenProps {
  roomState: RoomState | null;
  onJoinRoom: (roomId: string) => void;
  onStartGame: (roomId: string) => void;
  currentPlayerId: string;
  user: any;
  character: any;
  onLogout: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  onJoinRoom,
  onStartGame,
  currentPlayerId,
  user,
  character,
  onLogout,
}) => {
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && roomParam.trim()) return roomParam.toUpperCase().trim();
    }
    return roomState?.roomId || generateRoomCode();
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (roomState?.roomId) {
      setRoomId(roomState.roomId);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('room', roomState.roomId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [roomState?.roomId]);

  const handleCopyLink = async () => {
    const code = (roomState?.roomId || roomId || generateRoomCode()).trim().toUpperCase();
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('room', code);
    const inviteUrl = url.toString();

    let succeeded = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        succeeded = true;
      } catch (err) {
        console.warn('Clipboard fallback', err);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    onJoinRoom(roomId.toUpperCase().trim());
  };

  const isHost = roomState?.hostPlayerId === currentPlayerId;
  const playersList = roomState ? Object.values(roomState.players) : [];

  return (
    <div className="max-w-2xl mx-auto mt-8">
      
      {/* Player Identity Bar */}
      <div className="mb-4 flex items-center justify-between px-4 py-2 bg-dungeon-card border border-dungeon-border rounded-xl shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <UserCircle className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-slate-100">{user?.displayName}</span>
            <span className="text-slate-500 text-xs">({user?.email || 'Guest'})</span>
          </div>
          <button 
            onClick={onLogout}
            className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase font-bold tracking-wider self-start pl-7"
          >
            Sign Out
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-amber-400 font-bold">
            Lv. {character?.level || 1}
          </span>
          <span className="capitalize text-slate-300 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
            {character?.classType}
          </span>
        </div>
      </div>

      <div className="p-6 bg-dungeon-card border border-dungeon-border rounded-2xl shadow-2xl">
        <div className="text-center mb-6">
          {roomState?.status === 'LOBBY' ? (
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
              <Users className="w-8 h-8" />
            </div>
          ) : (
            <h1 className="text-3xl font-black text-amber-400 tracking-tight flex items-center justify-center gap-2">
              <span>CARPE DELVE</span>
            </h1>
          )}
          <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-2">
            {roomState?.status === 'LOBBY' ? 'Party Gathering' : 'Enter the Crypt'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {roomState?.status === 'LOBBY' 
              ? 'Share this room code with 1 to 3 friends to tackle the daily crypt together.'
              : 'Synchronous co-op tactical micro-RPG. 2 encounters, untimed coordination.'}
          </p>
        </div>

        {/* Room Input OR Room Link Box */}
        {roomState?.status === 'LOBBY' ? (
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
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="room-input" className="block text-xs font-bold uppercase text-slate-400">
                  Dungeon Room Code
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Randomised each load</span>
              </div>
              <div className="flex gap-2">
                <input
                  id="room-input"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. 7K2PM9"
                  className="flex-1 bg-dungeon-darker border border-dungeon-border rounded-xl px-3.5 py-2.5 font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500 uppercase text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setRoomId(generateRoomCode())}
                  title="Generate new random room code"
                  className="px-3.5 py-2.5 bg-dungeon-darker hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-dungeon-border hover:border-amber-500/50 rounded-xl transition-all cursor-pointer"
                >
                  <Dices className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-dungeon-darker/60 rounded-xl border border-dungeon-border mb-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase font-bold">Your Hero:</span>
                <span className="text-amber-300 font-bold">{character?.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono mt-2">
                <span className="text-slate-500">HP: {CLASS_BASE_STATS[character?.classType as ClassType]?.maxHp}</span>
                <span className="text-slate-500 capitalize">Resource: {CLASS_BASE_STATS[character?.classType as ClassType]?.resourceType}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-base tracking-wide shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              Join Dungeon Lobby
            </button>
          </form>
        )}

        {/* Party Roster (Only if in LOBBY) */}
        {roomState?.status === 'LOBBY' && (
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Party Roster ({playersList.length} / 4 Players)</span>
              <span className="text-amber-400 font-mono text-[11px]">Recommended: 2-4</span>
            </div>

            <div className="space-y-2">
              {playersList.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3.5 rounded-xl bg-dungeon-darker/80 border border-dungeon-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase ${
                      player.classType === 'warrior' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      player.classType === 'rogue' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {player.classType[0]}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                        {player.name}
                        {player.id === roomState.hostPlayerId && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">Host</span>
                        )}
                        {player.id === currentPlayerId && (
                          <span className="text-[11px] text-amber-400 font-semibold">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        HP: {player.maxHp} &bull; Spd: {player.baseSpeed}
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
        )}

        {/* Start Encounter Button (Only if in LOBBY) */}
        {roomState?.status === 'LOBBY' && (
          <div>
            {isHost ? (
              <button
                onClick={() => onStartGame(roomState.roomId)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-base tracking-wide shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Descend into Crypt
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm animate-pulse">
                Waiting for party host to initiate the dungeon descent...
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
