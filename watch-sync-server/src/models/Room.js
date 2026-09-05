import fs from 'fs';
import { CONFIG } from '../config/server.config.js';

export class Room {
  constructor(roomId, hostSocketId, hostUsername, defaultVideoUrl, hostToken = null) {
    this.id = roomId;
    this.hostSocketId = hostSocketId;
    this.hostToken = hostToken || `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.allowedControllers = new Set();
    this.isPlaying = false;
    this.lastTimestamp = 0;
    this.updatedAt = Date.now();
    this.videoUrl = defaultVideoUrl || CONFIG.DEFAULT_VIDEO;
    this.mediaMeta = null;
    this.queue = [{ id: 'default-1', title: 'Default Demo Video', url: this.videoUrl, mediaMeta: null }];
    this.bookmarks = [];
    this.currentQueueIndex = 0;
    this.isProcessing = false;
    this.bufferingUsers = new Set();
    this.users = new Map(); // socketId -> { username, peerId }
    this.pendingLobby = new Map(); // username -> { socket, socketId, username, peerId }
    this.createdFiles = new Set();
  }

  hasPermission(socketId) {
    return this.hostSocketId === socketId || this.allowedControllers.has(socketId);
  }

  admit(socket, peerId = null) {
    const cleanUsername = socket.data.username;
    this.pendingLobby.delete(cleanUsername);
    socket.join(this.id);
    this.users.set(socket.id, { username: cleanUsername, peerId });

    if (!this.hostSocketId || !this.users.has(this.hostSocketId)) {
      this.hostSocketId = socket.id;
    }
  }

  remove(socketId) {
    this.bufferingUsers.delete(socketId);
    this.allowedControllers.delete(socketId);
    const user = this.users.get(socketId);
    if (user) {
      this.pendingLobby.delete(user.username);
    }
    this.users.delete(socketId);

    if (this.hostSocketId === socketId && this.users.size > 0) {
      this.hostSocketId = this.users.keys().next().value;
      this.allowedControllers.delete(this.hostSocketId);
    }
    return user;
  }

  trackMediaFiles(filePaths) {
    if (!Array.isArray(filePaths)) filePaths = [filePaths];
    filePaths.forEach((p) => {
      if (p) this.createdFiles.add(p);
    });
  }

  cleanupMedia() {
    this.createdFiles.forEach((targetPath) => {
      try {
        if (fs.existsSync(targetPath)) {
          const stat = fs.statSync(targetPath);
          if (stat.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(targetPath);
          }
        }
      } catch (err) {
        console.error(`Failed to delete media artifact: ${targetPath}`, err);
      }
    });
    this.createdFiles.clear();
  }

  getState() {
    let currentPos = this.lastTimestamp;
    if (this.isPlaying) {
      currentPos += (Date.now() - this.updatedAt) / 1000;
    }

    const participants = Array.from(this.users.entries()).map(([id, u]) => ({
      socketId: id,
      username: u.username,
      peerId: u.peerId
    }));

    return {
      hostSocketId: this.hostSocketId,
      allowedControllers: Array.from(this.allowedControllers),
      isPlaying: this.isPlaying,
      currentTimestamp: currentPos,
      videoUrl: this.videoUrl,
      mediaMeta: this.mediaMeta,
      queue: this.queue,
      bookmarks: this.bookmarks,
      currentQueueIndex: this.currentQueueIndex,
      isProcessing: this.isProcessing,
      users: participants
    };
  }
}