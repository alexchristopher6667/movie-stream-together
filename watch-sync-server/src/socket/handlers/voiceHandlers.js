import { roomStore } from '../../models/RoomStore.js';

export const registerVoiceHandlers = (io, socket) => {
  socket.on('VOICE_ACTIVITY', ({ isSpeaking, volume }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('VOICE_ACTIVITY_UPDATE', {
      socketId: socket.id,
      username: socket.data.username,
      isSpeaking: Boolean(isSpeaking),
      volume: Number(volume) || 0
    });
  });

  socket.on('MUTE_USER_MIC', ({ targetSocketId }) => {
    const room = roomStore.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    io.to(targetSocketId).emit('REMOTE_MIC_MUTED_BY_HOST', { hostUsername: socket.data.username });
  });

  socket.on('SEND_CHAT_MESSAGE', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !text?.trim()) return;

    io.to(roomId).emit('RECEIVE_CHAT_MESSAGE', {
      id: `${Date.now()}-${Math.random()}`,
      senderSocketId: socket.id,
      username: socket.data.username,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('SEND_REACTION', ({ emoji }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !emoji) return;

    io.to(roomId).emit('RECEIVE_REACTION', {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      username: socket.data.username,
      leftOffset: Math.floor(Math.random() * 70) + 15
    });
  });
};