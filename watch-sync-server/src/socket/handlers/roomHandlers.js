import { roomStore } from '../../models/RoomStore.js';
import { Room } from '../../models/Room.js';

export const registerRoomHandlers = (io, socket) => {
  // Client requests entry into a room
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
      socket.join(roomId);

      const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        peerId: u.peerId
      }));

      socket.emit('ROOM_ADMITTED', {
        roomId: room.id || roomId,
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
        username: socket.data.username,
        peerId
      });
    }
  });

  // Host clicks "Admit"
  socket.on('ADMIT_USER', ({ targetSocketId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      room.admit(targetSocket, targetSocket.data.peerId);
      targetSocket.join(roomId);

      const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        peerId: u.peerId
      }));

      // Calculate live timestamp for smooth sync entry
      let currentPos = room.lastTimestamp || 0;
      if (room.isPlaying && room.updatedAt) {
        currentPos += (Date.now() - room.updatedAt) / 1000;
      }

      // Send admission payload to the guest
      targetSocket.emit('ROOM_ADMITTED', {
        roomId: room.id || roomId,
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

      // Broadcast full user roster to the entire room
      io.to(roomId).emit('USER_JOINED', {
        socketId: targetSocket.id,
        username: targetSocket.data.username,
        peerId: targetSocket.data.peerId,
        users: currentUsers
      });

      // Clear the host knock notification toast
      socket.emit('KNOCK_RESOLVED', { targetSocketId });
    }
  });

  // Host clicks "Decline"
  socket.on('DECLINE_USER', ({ targetSocketId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    room.pendingLobby.delete(targetSocketId);
    io.to(targetSocketId).emit('LOBBY_DECLINED');
    socket.emit('KNOCK_RESOLVED', { targetSocketId });
  });

  // Toggle user playback permission
  socket.on('TOGGLE_USER_CONTROL', ({ targetSocketId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    if (room.allowedControllers.has(targetSocketId)) {
      room.allowedControllers.delete(targetSocketId);
    } else {
      room.allowedControllers.add(targetSocketId);
    }

    io.to(roomId).emit('CONTROLLER_PERMISSIONS_UPDATED', {
      allowedControllers: Array.from(room.allowedControllers)
    });
  });

  // Transfer host permissions
  socket.on('TRANSFER_HOST', ({ targetSocketId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    const targetUser = room.users.get(targetSocketId);
    if (targetUser) {
      room.hostSocketId = targetSocketId;
      room.allowedControllers.add(targetSocketId);

      io.to(roomId).emit('HOST_CHANGED', {
        newHostSocketId: targetSocketId,
        newHostUsername: targetUser.username,
        allowedControllers: Array.from(room.allowedControllers)
      });
    }
  });

  // Kick user from the room
  socket.on('KICK_USER', ({ targetSocketId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    const kickedUser = room.users.get(targetSocketId);
    io.to(targetSocketId).emit('KICKED_FROM_ROOM', { hostUsername: socket.data.username });

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) targetSocket.leave(roomId);

    room.remove(targetSocketId);

    const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
      socketId: id,
      username: u.username,
      peerId: u.peerId
    }));

    io.to(roomId).emit('USER_LEFT', {
      socketId: targetSocketId,
      username: kickedUser?.username || 'User',
      peerId: kickedUser?.peerId,
      users: currentUsers
    });
  });

  // Remote mic mute command from room host
  socket.on('MUTE_USER_MIC', ({ targetSocketId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    io.to(targetSocketId).emit('REMOTE_MIC_MUTED_BY_HOST');
  });

  // Speaking indicator equalizer pulse
  socket.on('VOICE_ACTIVITY', ({ isSpeaking, volume }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    socket.to(roomId).emit('VOICE_ACTIVITY_UPDATE', {
      socketId: socket.id,
      isSpeaking,
      volume
    });
  });

  // Bookmarks handlers
  socket.on('CREATE_BOOKMARK', ({ timestamp, label }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room) return;

    const bookmark = {
      id: `bm-${Date.now()}`,
      timestamp,
      label: label || `Scene @ ${Math.floor(timestamp)}s`
    };
    room.bookmarks.push(bookmark);
    io.to(roomId).emit('BOOKMARKS_UPDATED', { bookmarks: room.bookmarks });
  });

  socket.on('DELETE_BOOKMARK', ({ bookmarkId }) => {
    const roomId = socket.data.roomId;
    const room = roomStore.get(roomId);
    if (!room) return;

    room.bookmarks = room.bookmarks.filter((b) => b.id !== bookmarkId);
    io.to(roomId).emit('BOOKMARKS_UPDATED', { bookmarks: room.bookmarks });
  });

  // Handle client disconnection & host reassignment
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = roomStore.get(roomId);
    if (!room) return;

    const leavingUser = room.users.get(socket.id);
    room.remove(socket.id);
    room.pendingLobby.delete(socket.id);

    // If host left and peers remain, hand over the host crown
    if (room.hostSocketId === socket.id && room.users.size > 0) {
      const nextHostSocketId = room.users.keys().next().value;
      room.hostSocketId = nextHostSocketId;
      room.allowedControllers.add(nextHostSocketId);

      const nextHost = room.users.get(nextHostSocketId);
      io.to(roomId).emit('HOST_CHANGED', {
        newHostSocketId,
        newHostUsername: nextHost?.username || 'Member',
        allowedControllers: Array.from(room.allowedControllers)
      });
    }

    const currentUsers = Array.from(room.users.entries()).map(([id, u]) => ({
      socketId: id,
      username: u.username,
      peerId: u.peerId
    }));

    io.to(roomId).emit('USER_LEFT', {
      socketId: socket.id,
      username: leavingUser?.username || 'User',
      peerId: leavingUser?.peerId,
      users: currentUsers
    });

    if (room.users.size === 0) {
      roomStore.delete(roomId);
    }
  });
};