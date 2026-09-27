import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import {
  CharacterSheet,
  ClientJoinPayload,
  ClientLockActionPayload,
  ResolutionBatch,
  RoomState,
} from '@daily-dungeon/shared';
import { RoomManager } from './room-manager.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Daily Dungeon Seed (deterministic daily rotation)
function getDailyDungeonInfo() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today,
    dungeonName: 'The Sunken Crypt',
    description: 'A subterranean labyrinth guarded by restless skeletal vanguards and ruled by the Crypt Overseer.',
    minionName: 'Skeletal Vanguard',
    bossName: 'Crypt Overseer',
  };
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/daily', (req: Request, res: Response) => {
  res.json(getDailyDungeonInfo());
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager({
  broadcastRoomState: (roomId: string, state: RoomState) => {
    io.to(roomId).emit('room:state_update', state);
  },
  broadcastTimerTick: (roomId: string, remainingSeconds: number) => {
    io.to(roomId).emit('combat:timer_tick', { remainingSeconds });
  },
  broadcastResolutionBatch: (roomId: string, batch: ResolutionBatch) => {
    io.to(roomId).emit('combat:resolution_batch', batch);
  },
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('room:join', (payload: ClientJoinPayload) => {
    const { roomId, character } = payload;
    if (!roomId || !character) return;

    socket.join(roomId);
    console.log(`[Socket] ${character.name} (${character.classType}) joined room ${roomId}`);
    roomManager.joinRoom(roomId, character, socket.id);
  });

  socket.on('room:start', (payload: { roomId: string }) => {
    const { roomId } = payload;
    const playerInfo = roomManager.getPlayerBySocket(socket.id);
    if (!playerInfo || playerInfo.roomId !== roomId) return;

    const started = roomManager.startGame(roomId, playerInfo.playerId);
    if (started) {
      console.log(`[Socket] Room ${roomId} game started by host ${playerInfo.playerId}`);
    }
  });

  socket.on('combat:lock_action', (payload: ClientLockActionPayload) => {
    const { roomId, abilityId, targetId } = payload;
    const playerInfo = roomManager.getPlayerBySocket(socket.id);
    if (!playerInfo || playerInfo.roomId !== roomId) return;

    roomManager.lockPlayerAction(roomId, playerInfo.playerId, abilityId, targetId);
    console.log(`[Socket] Player ${playerInfo.playerId} locked action ${abilityId} in room ${roomId}`);
  });

  socket.on('combat:unlock_action', (payload: { roomId: string }) => {
    const { roomId } = payload;
    const playerInfo = roomManager.getPlayerBySocket(socket.id);
    if (!playerInfo || playerInfo.roomId !== roomId) return;

    roomManager.unlockPlayerAction(roomId, playerInfo.playerId);
    console.log(`[Socket] Player ${playerInfo.playerId} unlocked action in room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    roomManager.leaveRoom(socket.id);
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`⚔️ Daily Dungeon Authoritative Server listening on port ${PORT} (0.0.0.0)`);
});
