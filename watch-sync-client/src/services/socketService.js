import { io } from 'socket.io-client';
import { SOCKET_SERVER_URL } from '../utils/helpers';

class SocketService {
  constructor() {
    this.socket = null;
  }

  getSocket() {
    if (!this.socket) {
      this.socket = io(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 10,
        autoConnect: false
      });
    }
    return this.socket;
  }

  connect() {
    const s = this.getSocket();
    if (!s.connected) {
      s.connect();
    }
    return s;
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();