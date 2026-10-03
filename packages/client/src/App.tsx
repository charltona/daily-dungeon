import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClassType,
  createCharacter,
  ResolutionBatch,
  RoomState,
} from '@daily-dungeon/shared';
import { useFlagsmith } from '@flagsmith/flagsmith/react';
import { Trophy, Skull, Sparkles } from 'lucide-react';
import { Header } from './components/Header.js';
import { EnemyCard } from './components/EnemyCard.js';
import { PartyCard } from './components/PartyCard.js';
import { ActionBar } from './components/ActionBar.js';
import { CombatFeed } from './components/CombatFeed.js';
import { LobbyScreen } from './components/LobbyScreen.js';
import { LandingScreen } from './components/LandingScreen.js';
import { CharacterSelectScreen } from './components/CharacterSelectScreen.js';
import { EndGameScreen } from './components/EndGameScreen.js';
import { useCombatVisuals } from './hooks/useCombatVisuals.js';

export function App() {
  const flagsmith = useFlagsmith();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const roomStateRef = useRef<RoomState | null>(null);
  
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dd_token'));
  const [user, setUser] = useState<any | null>(() => {
    const u = localStorage.getItem('dd_user');
    return u && u !== 'undefined' ? JSON.parse(u) : null;
  });
  const [character, setCharacter] = useState<any | null>(() => {
    const c = localStorage.getItem('dd_character');
    return c && c !== 'undefined' ? JSON.parse(c) : null;
  });

  const currentPlayerId = user?.id || '';

  const handleLoginSuccess = (newToken: string, newUser: any, newCharacter?: any) => {
    setToken(newToken);
    setUser(newUser);
    if (newCharacter) setCharacter(newCharacter);
    localStorage.setItem('dd_token', newToken);
    localStorage.setItem('dd_user', JSON.stringify(newUser));
    if (newCharacter) localStorage.setItem('dd_character', JSON.stringify(newCharacter));
  };

  const handleCharacterCreated = (newChar: any) => {
    setCharacter(newChar);
    localStorage.setItem('dd_character', JSON.stringify(newChar));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCharacter(null);
    localStorage.removeItem('dd_token');
    localStorage.removeItem('dd_user');
    localStorage.removeItem('dd_character');
    if (socket) socket.disconnect();
  };

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  const [activeActorId, setActiveActorId] = useState<string | undefined>(undefined);
  const [activePlaybackLog, setActivePlaybackLog] = useState<string[]>([]);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  const {
    floatingTexts,
    impactEffects,
    triggerEventVisual,
    getTextsForTarget,
    clearAllVisuals,
  } = useCombatVisuals();

  // Identify player in Flagsmith
  useEffect(() => {
    if (flagsmith && currentPlayerId) {
      flagsmith.identify(currentPlayerId).catch((err) => {
        console.warn('[Flagsmith] Failed to identify user:', err);
      });
    }
  }, [currentPlayerId, flagsmith]);

  // Socket initialization
  useEffect(() => {
    if (!token || !currentPlayerId) return;

    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to authoritative game server');
    });

    s.on('room:state_update', (state: RoomState) => {
      setRoomState(state);
      setActivePlaybackLog(state.combatLog);
    });

    s.on('combat:resolution_batch', (batch: ResolutionBatch) => {
      handleSequentialPlayback(batch);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [currentPlayerId, token]);

  // Sequential playback for turn resolution
  const handleSequentialPlayback = async (batch: ResolutionBatch) => {
    const events = batch.orderedEvents;
    const playbackBatchId = `batch-${Date.now()}`;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      setActiveActorId(event.actorId);
      setActivePlaybackLog((prev) => [...prev, event.message]);

      // Spawn floating numbers and unit impact visual effects OUTSIDE setState updater
      triggerEventVisual(
        event,
        roomStateRef.current?.players || {},
        `${playbackBatchId}-${i}-${event.actorId}-${event.targetId}`
      );

      // Apply incremental visual HP / Shield adjustments during playback
      setRoomState((current) => {
        if (!current) return current;

        // Apply incremental visual HP / Shield adjustments during playback
        const nextState = JSON.parse(JSON.stringify(current)) as RoomState;
        if (typeof event.damageDealt === 'number' && event.damageDealt > 0) {
          if (nextState.enemy && event.targetId === nextState.enemy.id) {
            nextState.enemy.currentHp = Math.max(0, nextState.enemy.currentHp - event.damageDealt);
          } else if (event.targetId === 'ALL_PLAYERS') {
            Object.values(nextState.players).forEach((p) => {
              p.currentHp = Math.max(0, p.currentHp - (event.damageDealt || 0));
            });
          } else if (nextState.players[event.targetId]) {
            const p = nextState.players[event.targetId];
            p.currentHp = Math.max(0, p.currentHp - event.damageDealt);
          }
        }
        if (
          typeof event.healingDone === 'number' &&
          event.healingDone > 0 &&
          nextState.players[event.targetId]
        ) {
          const p = nextState.players[event.targetId];
          p.currentHp = Math.min(p.maxHp, p.currentHp + event.healingDone);
        }
        if (typeof event.shieldGained === 'number' && event.shieldGained > 0) {
          if (nextState.enemy && event.targetId === nextState.enemy.id) {
            nextState.enemy.shield = (nextState.enemy.shield || 0) + event.shieldGained;
          } else if (nextState.players[event.targetId]) {
            const p = nextState.players[event.targetId];
            p.shield = (p.shield || 0) + event.shieldGained;
          }
        }

        return nextState;
      });

      await new Promise((res) => setTimeout(res, 600));
    }
    setActiveActorId(undefined);

    // Only update if current state hasn't already advanced past this batch
    setRoomState((current) => {
      if (
        current &&
        current.status === 'COMBAT_INPUT' &&
        (batch.finalRoomState.status === 'STAGE_TRANSITION' ||
          batch.finalRoomState.status === 'COMBAT_RESOLUTION')
      ) {
        return current;
      }
      return batch.finalRoomState;
    });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket || !character) return;
    const combatCharacter = createCharacter(currentPlayerId, character.name, character.classType);
    socket.emit('room:join', { roomId, character: combatCharacter });
  };

  const handleStartGame = (roomId: string) => {
    if (!socket) return;
    socket.emit('room:start', { roomId });
  };

  const handleLockIn = (abilityId: string, targetId: string) => {
    if (!socket || !roomState) return;
    socket.emit('combat:lock_action', {
      roomId: roomState.roomId,
      abilityId,
      targetId,
    });
  };

  const handleUnlock = () => {
    if (!socket || !roomState) return;
    socket.emit('combat:unlock_action', {
      roomId: roomState.roomId,
    });
  };

  const handleRetry = () => {
    if (!socket || !roomState) return;
    handleStartGame(roomState.roomId);
  };

  const currentPlayer = roomState?.players[currentPlayerId];
  const isLocked = roomState?.lockedPlayerIds.includes(currentPlayerId) ?? false;
  const showEndGame = roomState?.status === 'VICTORY' || roomState?.status === 'DEFEAT';
  const isHost = roomState?.hostPlayerId === currentPlayerId;

  // If not authenticated, show landing screen
  if (!token || !user) {
    return <LandingScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // If authenticated but no character, show character creation
  if (!character) {
    return (
      <CharacterSelectScreen
        user={user}
        token={token}
        onCharacterCreated={handleCharacterCreated}
        onLogout={handleLogout}
      />
    );
  }

  // If not joined to any room yet or currently in Lobby:
  if (!roomState || roomState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-dungeon-darkest text-slate-100 p-4">
        <LobbyScreen
          roomState={roomState}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleStartGame}
          currentPlayerId={currentPlayerId}
          user={user}
          character={character}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-dungeon-darkest text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Slim Header */}
      <Header roomState={roomState} />

      {/* Main Single-Screen Battle Deck */}
      <main className="max-w-md mx-auto w-full px-2.5 py-1.5 flex-1 flex flex-col justify-between gap-1.5 overflow-hidden">
        {/* 2. Boss / Enemy Health & Telegraphed Intent */}
        <EnemyCard
          key={roomState.enemy?.id || 'no-enemy'}
          enemy={roomState.enemy}
          players={roomState.players}
          isActive={activeActorId === roomState.enemy?.id}
          floatingTexts={roomState.enemy ? getTextsForTarget(roomState.enemy.id) : []}
          impactEffect={roomState.enemy ? impactEffects[roomState.enemy.id] : undefined}
        />

        {/* 3. Teammate Status & Your Hero Health / Resource */}
        <PartyCard
          players={roomState.players}
          currentPlayerId={currentPlayerId}
          lockedPlayerIds={roomState.lockedPlayerIds}
          queuedActions={roomState.queuedActions}
          enemyName={roomState.enemy?.name}
          activeActorId={activeActorId}
          floatingTexts={floatingTexts}
          impactEffects={impactEffects}
        />

        {/* 4. Action Section & Combat Log Ticker */}
        <div className="space-y-1.5">
          {roomState.status === 'VICTORY' ? (
            <div className="bg-gradient-to-r from-amber-950/80 via-yellow-950/80 to-amber-950/80 border-2 border-amber-500 rounded-xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-amber-300 truncate">
                    DUNGEON CONQUERED!
                  </h3>
                  <p className="text-[10px] text-slate-300 truncate">
                    The Crypt Overseer has fallen!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEndModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                Collect Loot
              </button>
            </div>
          ) : roomState.status === 'DEFEAT' ? (
            <div className="bg-gradient-to-r from-red-950/80 via-slate-950 to-red-950/80 border-2 border-red-700 rounded-xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-900 border border-red-500 text-red-200 flex items-center justify-center font-black flex-shrink-0">
                  <Skull className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-red-300 truncate">
                    PARTY WIPED
                  </h3>
                  <p className="text-[10px] text-slate-300 truncate">
                    All heroes have fallen in the crypt.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEndModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-xs tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
              >
                <Skull className="w-3.5 h-3.5" />
                Summary
              </button>
            </div>
          ) : currentPlayer ? (
            <ActionBar
              player={currentPlayer}
              roomState={roomState}
              isLocked={isLocked}
              onLockIn={handleLockIn}
              onUnlock={handleUnlock}
            />
          ) : null}

          {/* 1-Line Combat Log Ticker */}
          <CombatFeed combatLog={activePlaybackLog} />
        </div>
      </main>

      {/* 5. Victory / Defeat Modal */}
      {showEndGame && isEndModalOpen && (
        <EndGameScreen
          roomState={roomState}
          onRetry={() => {
            setIsEndModalOpen(false);
            handleRetry();
          }}
          isHost={isHost}
          onClose={() => setIsEndModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
