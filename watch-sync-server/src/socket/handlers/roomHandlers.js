import { roomStore } from '../../models/RoomStore.js';
import { Room } from '../../models/Room.js';

// Safe getter & setter helper across different RoomStore implementations
const getRoom = (id) => {
  if (!id) return null;
  if (typeof roomStore.get === 'function') return roomStore.get(id);
  if (roomStore.rooms instanceof Map) return roomStore.rooms.get(id);
  return roomStore[id] || null;
};

const saveRoom = (id, roomInstance) => {
  if (typeof roomStore.set === 'function') {
    roomStore.set(id, roomInstance);
  } else if (roomStore.rooms instanceof Map) {
    roomStore.rooms.set(id, roomInstance);
  } else {
    roomStore[id] = roomInstance;
  }
};

const deleteRoom = (id) => {
  if (typeof roomStore.delete === 'function') {
    roomStore.delete(id);
  } else if (roomStore.rooms instanceof Map) {
    roomStore.rooms.delete(id);
  } else {
    delete roomStore[id];
  }
};

export const registerRoomHandlers = (io, socket) => {
  socket.on('REQUEST_JOIN_ROOM', ({ roomId: rawRoomId, username, peerId, hostToken, defaultVideoUrl }) => {
    const roomId = String(rawRoomId || '').trim().toLowerCase();
    if (!roomId) return;

    socket.data.roomId = roomId;
    socket.data.username = username;
    socket.data.peerId = peerId;

    let room = getRoom(roomId);

    // Create room if it doesn't exist
    if (!room) {
      if (typeof roomStore.createRoom === 'function') {
        room = roomStore.createRoom(roomId, socket.id, username, hostToken, defaultVideoUrl);
      } else if (typeof roomStore.create === 'function') {
        room = roomStore.create(roomId, socket.id, username, hostToken, defaultVideoUrl);
      } else {
        room = new Room(roomId, socket.id, username, hostToken, defaultVideoUrl);
        saveRoom(roomId, room);
      }
    }

    // Join the socket.io room channel
    socket.join(roomId);

    const isRoomHost = room.hostToken === hostToken || room.hostSocketId === socket.id;

    if (isRoomHost) {
      room.hostSocketId = socket.id;
      if (typeof room.addUser === 'function') {
        room.addUser({ socketId: socket.id, username, peerId, isHost: true, canControl: true });
      }
      if (room.allowedControllers?.add) {
        room.allowedControllers.add(socket.id);
      }
      if (!room.videoUrl) {
        room.videoUrl = defaultVideoUrl || '/default-video.mp4';
      }
    } else {
      if (typeof room.addUser === 'function') {
        room.addUser({
          socketId: socket.id,
          username,
          peerId,
          isHost: false,
          canControl: Boolean(room.allowedControllers?.has?.(socket.id))
        });
      }
    }

    const currentUsers = typeof room.getUsersList === 'function'
      ? room.getUsersList()
      : Array.from(room.users?.values ? room.users.values() : []);

    // 1. Admit user with existing room state
    socket.emit('ROOM_ADMITTED', {
      roomId: room.id,
      isHost: isRoomHost,
      hostSocketId: room.hostSocketId,
      allowedControllers: room.allowedControllers ? Array.from(room.allowedControllers) : [room.hostSocketId],
      users: currentUsers,
      videoUrl: room.videoUrl,
      mediaMeta: room.mediaMeta,
      currentTimestamp: room.lastTimestamp || 0,
      isPlaying: Boolean(room.isPlaying),
      queue: room.queue || [],
      currentQueueIndex: room.currentQueueIndex || 0,
      bookmarks: room.bookmarks || []
    });

    // 2. Broadcast updated user list to everyone in this room
    io.to(roomId).emit('USER_JOINED', {
      socketId: socket.id,
      username,
      peerId,
      users: currentUsers
    });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = getRoom(roomId);
    if (!room) return;

    if (typeof room.removeUser === 'function') {
      room.removeUser(socket.id);
    }
    if (room.allowedControllers?.delete) {
      room.allowedControllers.delete(socket.id);
    }

    if (room.hostSocketId === socket.id && room.users && (room.users.size > 0 || Object.keys(room.users).length > 0)) {
      const remainingList = Array.from(room.users.values ? room.users.values() : []);
      if (remainingList.length > 0) {
        const nextUser = remainingList[0];
        room.hostSocketId = nextUser.socketId;
        nextUser.isHost = true;
        if (room.allowedControllers?.add) {
          room.allowedControllers.add(nextUser.socketId);
        }

        io.to(roomId).emit('HOST_CHANGED', {
          newHostSocketId: nextUser.socketId,
          newHostUsername: nextUser.username
        });
      }
    }

    const currentUsers = typeof room.getUsersList === 'function'
      ? room.getUsersList()
      : Array.from(room.users?.values ? room.users.values() : []);

    io.to(roomId).emit('USER_LEFT', {
      socketId: socket.id,
      username: socket.data.username,
      peerId: socket.data.peerId,
      users: currentUsers
    });

    if (currentUsers.length === 0) {
      deleteRoom(roomId);
    }
  });
};