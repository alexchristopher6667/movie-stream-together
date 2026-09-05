import { Server } from 'socket.io';
import { CONFIG } from '../config/server.config.js';
import { roomStore } from '../models/RoomStore.js';
import { registerRoomHandlers } from './handlers/roomHandlers.js';
import { registerSyncHandlers } from './handlers/syncHandlers.js';
import { registerVoiceHandlers } from './handlers/voiceHandlers.js';

export const initSocketManager = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: CONFIG.CORS_ORIGIN, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  });

  // Heartbeat synchronization loop
  setInterval(() => {
    roomStore.getAll().forEach((room) => {
      if (!room || room.users.size === 0 || room.isProcessing) return;

      let currentPos = room.lastTimestamp;
      if (room.isPlaying) currentPos += (Date.now() - room.updatedAt) / 1000;

      io.to(room.id).emit('ROOM_HEARTBEAT_SYNC', { timestamp: currentPos, isPlaying: room.isPlaying });
    });
  }, CONFIG.HEARTBEAT_INTERVAL_MS);

  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
    registerSyncHandlers(io, socket);
    registerVoiceHandlers(io, socket);

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const room = roomStore.get(roomId);
      if (room) {
        const removedUser = room.remove(socket.id);
        if (room.hostSocketId) io.to(room.hostSocketId).emit('KNOCK_RESOLVED', { targetSocketId: socket.id });
        if (room.bufferingUsers.size === 0) io.to(room.id).emit('BUFFER_STATUS_UPDATE', { isBuffering: false });

        // Auto-cleanup: If room is empty, purge disk files and delete room instance
        if (room.users.size === 0) {
          room.cleanupMedia();
          roomStore.delete(roomId);
          return;
        }

        const nextHost = room.users.get(room.hostSocketId);
        io.to(room.id).emit('HOST_CHANGED', {
          newHostSocketId: room.hostSocketId,
          newHostUsername: nextHost?.username || 'Host',
          allowedControllers: Array.from(room.allowedControllers)
        });

        io.to(room.id).emit('USER_LEFT', {
          socketId: socket.id,
          username: socket.data.username || removedUser?.username,
          peerId: socket.data.peerId
        });
      }
    });
  });

  return io;
};