import { roomStore } from '../../models/RoomStore.js';
import { Room } from '../../models/Room.js';

export const registerRoomHandlers = (io, socket) => {
  socket.on('REQUEST_JOIN_ROOM', ({ roomId: rawRoomId, username, peerId, hostToken, defaultVideoUrl }) => {
    const roomId = String(rawRoomId || '').trim().toLowerCase();
    if (!roomId) return;

    socket.data.roomId = roomId;
    socket.data.username = username || `User-${socket.id.substring(0, 4)}`;
    socket.data.peerId = peerId;

    let room = roomStore.get(roomId);

    // If room doesn't exist, this user is creating it as the Host
    if (!room) {
      room = new Room(roomId, socket.id, socket.data.username, defaultVideoUrl, hostToken);
      roomStore.set(roomId, room);
    }

    const isRoomHost = (hostToken && room.hostToken === hostToken) || room.hostSocketId === socket.id;

    if (isRoomHost) {
      room.hostSocketId = socket.id;
      room.allowedControllers.add(socket.id);
      if (defaultVideoUrl && (!room.videoUrl || room.videoUrl.includes('hls-demo'))) {
        room.videoUrl = defaultVideoUrl;
        if (room.queue.length > 0) room.queue[0].url = defaultVideoUrl;
      }

      room.admit(socket, peerId);

      const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        peerId: u.peerId
      }));

      socket.emit('ROOM_ADMITTED', {
        roomId: room.id,
        isHost: true,
        hostSocketId: room.hostSocketId,
        allowedControllers: Array.from(room.allowedControllers),
        users: currentUsers,
        videoUrl: room.videoUrl,
        mediaMeta: room.mediaMeta,
        currentTimestamp: room.lastTimestamp || 0,
        isPlaying: Boolean(room.isPlaying),
        queue: room.queue || [],
        currentQueueIndex: room.currentQueueIndex || 0,
        bookmarks: room.bookmarks || []
      });

      io.to(roomId).emit('USER_JOINED', {
        socketId: socket.id,
        username: socket.data.username,
        peerId,
        users: currentUsers
      });
      return;
    }

    // NON-HOST: Put in lobby and notify Host
    room.pendingLobby.set(socket.id, { socket, username: socket.data.username, peerId });
    socket.emit('LOBBY_WAITING');

    if (room.hostSocketId) {
      io.to(room.hostSocketId).emit('INCOMING_KNOCK', {
        socketId: socket.id,
        username: socket.data.username
      });
    }
  });

  // Host clicks "Admit"
  socket.on('ADMIT_USER', ({ targetSocketId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      room.admit(targetSocket, targetSocket.data.peerId);

      const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        peerId: u.peerId
      }));

      // Admit guest with synced position and play state
      let currentPos = room.lastTimestamp;
      if (room.isPlaying) {
        currentPos += (Date.now() - room.updatedAt) / 1000;
      }

      targetSocket.emit('ROOM_ADMITTED', {
        roomId: room.id,
        isHost: false,
        hostSocketId: room.hostSocketId,
        allowedControllers: Array.from(room.allowedControllers),
        users: currentUsers,
        videoUrl: room.videoUrl,
        mediaMeta: room.mediaMeta,
        currentTimestamp: currentPos,
        isPlaying: Boolean(room.isPlaying),
        queue: room.queue || [],
        currentQueueIndex: room.currentQueueIndex || 0,
        bookmarks: room.bookmarks || []
      });

      io.to(room.id).emit('USER_JOINED', {
        socketId: targetSocket.id,
        username: targetSocket.data.username,
        peerId: targetSocket.data.peerId,
        users: currentUsers
      });

      io.to(room.hostSocketId).emit('KNOCK_RESOLVED', { targetSocketId });
    }
  });

  // Host clicks "Decline"
  socket.on('DECLINE_USER', ({ targetSocketId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    room.pendingLobby.delete(targetSocketId);
    io.to(targetSocketId).emit('LOBBY_DECLINED');
    io.to(room.hostSocketId).emit('KNOCK_RESOLVED', { targetSocketId });
  });

  socket.on('TOGGLE_USER_CONTROL', ({ targetSocketId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.allowedControllers.has(targetSocketId)) {
      room.allowedControllers.delete(targetSocketId);
    } else {
      room.allowedControllers.add(targetSocketId);
    }
    io.to(room.id).emit('CONTROLLER_PERMISSIONS_UPDATED', {
      allowedControllers: Array.from(room.allowedControllers)
    });
  });

  socket.on('TRANSFER_HOST', ({ targetSocketId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    const targetUser = room.users.get(targetSocketId);
    if (targetUser) {
      room.hostSocketId = targetSocketId;
      room.allowedControllers.add(targetSocketId);
      io.to(room.id).emit('HOST_CHANGED', {
        newHostSocketId: targetSocketId,
        newHostUsername: targetUser.username,
        allowedControllers: Array.from(room.allowedControllers)
      });
    }
  });

  socket.on('KICK_USER', ({ targetSocketId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    io.to(targetSocketId).emit('KICKED_FROM_ROOM', { hostUsername: socket.data.username });
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) targetSocket.leave(room.id);
    room.remove(targetSocketId);
    const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
      socketId: id,
      username: u.username,
      peerId: u.peerId
    }));
    io.to(room.id).emit('USER_LEFT', {
      socketId: targetSocketId,
      username: targetSocket?.data?.username || 'User',
      users: currentUsers
    });
  });

  socket.on('CREATE_BOOKMARK', ({ timestamp, label }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room) return;
    const bookmark = {
      id: `bm-${Date.now()}`,
      timestamp,
      label: label || `Scene @ ${Math.floor(timestamp)}s`
    };
    room.bookmarks.push(bookmark);
    io.to(room.id).emit('BOOKMARKS_UPDATED', { bookmarks: room.bookmarks });
  });

  socket.on('DELETE_BOOKMARK', ({ bookmarkId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room) return;
    room.bookmarks = room.bookmarks.filter((b) => b.id !== bookmarkId);
    io.to(room.id).emit('BOOKMARKS_UPDATED', { bookmarks: room.bookmarks });
  });
};