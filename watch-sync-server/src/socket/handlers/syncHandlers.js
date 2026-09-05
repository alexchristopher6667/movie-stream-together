import { roomStore } from '../../models/RoomStore.js';

export const registerSyncHandlers = (io, socket) => {
  // Sync Play / Pause / Seek actions
  socket.on('SYNC_ACTION', ({ actionType, timestamp }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || !room.hasPermission(socket.id)) return;

    room.lastTimestamp = Math.max(0, timestamp);
    room.updatedAt = Date.now();

    // Immediate state synchronization on the server
    if (actionType === 'PLAY') {
      room.isPlaying = true;
    } else if (actionType === 'PAUSE') {
      room.isPlaying = false;
      room.bufferingUsers.clear();
      io.to(room.id).emit('BUFFER_STATUS_UPDATE', { isBuffering: false });
    }

    socket.to(room.id).emit('SYNC_BROADCAST', {
      actionType,
      timestamp: room.lastTimestamp,
      triggeredBy: socket.data.username
    });
  });

  // URL changes (YouTube, Google Drive, Dropbox, Disposable Cloud, Direct MP4/HLS)
  socket.on('CHANGE_VIDEO_URL', ({ newUrl, mediaMeta = null }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || !room.hasPermission(socket.id)) return;

    room.videoUrl = newUrl;
    room.mediaMeta = mediaMeta;
    room.lastTimestamp = 0;
    room.isPlaying = false;
    room.isProcessing = false;
    room.updatedAt = Date.now();
    room.bufferingUsers.clear();

    const title = mediaMeta?.title || (newUrl ? newUrl.split('/').pop().split('?')[0] : 'Video Stream');
    room.queue = [{ id: `queue-${Date.now()}`, title, url: newUrl, mediaMeta }];
    room.currentQueueIndex = 0;

    io.to(room.id).emit('VIDEO_URL_CHANGED', {
      newUrl,
      mediaMeta,
      queue: room.queue,
      currentQueueIndex: 0,
      triggeredBy: socket.data.username
    });
  });

  // Add items to Queue
  socket.on('ADD_TO_QUEUE', ({ item }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || !room.hasPermission(socket.id)) return;

    room.queue.push({
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: item.title || 'Untitled Stream',
      url: item.url,
      mediaMeta: item.mediaMeta || null
    });

    io.to(room.id).emit('PLAYLIST_UPDATED', {
      queue: room.queue,
      currentQueueIndex: room.currentQueueIndex
    });
  });

  // Play specific index from Queue
  socket.on('PLAY_QUEUE_INDEX', ({ index }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || !room.hasPermission(socket.id)) return;

    if (index >= 0 && index < room.queue.length) {
      room.currentQueueIndex = index;
      const target = room.queue[index];
      room.videoUrl = target.url;
      room.mediaMeta = target.mediaMeta;
      room.lastTimestamp = 0;
      room.isPlaying = true;
      room.updatedAt = Date.now();
      room.bufferingUsers.clear();

      io.to(room.id).emit('VIDEO_URL_CHANGED', {
        newUrl: target.url,
        mediaMeta: target.mediaMeta,
        queue: room.queue,
        currentQueueIndex: room.currentQueueIndex,
        triggeredBy: socket.data.username
      });
    }
  });

  // Remove from Queue
  socket.on('REMOVE_FROM_QUEUE', ({ index }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || !room.hasPermission(socket.id)) return;

    if (index >= 0 && index < room.queue.length) {
      room.queue.splice(index, 1);
      if (room.currentQueueIndex >= room.queue.length) {
        room.currentQueueIndex = Math.max(0, room.queue.length - 1);
      }
      io.to(room.id).emit('PLAYLIST_UPDATED', {
        queue: room.queue,
        currentQueueIndex: room.currentQueueIndex
      });
    }
  });

  // Autoplay next queue item
  socket.on('AUTO_PLAY_NEXT', () => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.queue.length === 0 || room.currentQueueIndex >= room.queue.length - 1) return;

    room.currentQueueIndex += 1;
    const nextItem = room.queue[room.currentQueueIndex];
    room.videoUrl = nextItem.url;
    room.mediaMeta = nextItem.mediaMeta;
    room.lastTimestamp = 0;
    room.isPlaying = true;
    room.updatedAt = Date.now();
    room.bufferingUsers.clear();

    io.to(room.id).emit('VIDEO_URL_CHANGED', {
      newUrl: nextItem.url,
      mediaMeta: nextItem.mediaMeta,
      queue: room.queue,
      currentQueueIndex: room.currentQueueIndex,
      triggeredBy: 'Autoplay'
    });
  });

  // Client Buffering States
  socket.on('CLIENT_BUFFERING', () => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.isProcessing || !room.isPlaying) return;
    room.bufferingUsers.add(socket.id);
    io.to(room.id).emit('BUFFER_STATUS_UPDATE', { isBuffering: true, username: socket.data.username });
  });

  socket.on('CLIENT_BUFFER_READY', () => {
    const room = roomStore.get(socket.data.roomId);
    if (!room) return;
    room.bufferingUsers.delete(socket.id);
    if (room.bufferingUsers.size === 0) {
      io.to(room.id).emit('BUFFER_STATUS_UPDATE', { isBuffering: false });
    }
  });
};