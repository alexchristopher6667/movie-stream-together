class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  get(roomId) {
    return this.rooms.get(roomId);
  }

  set(roomId, roomInstance) {
    this.rooms.set(roomId, roomInstance);
  }

  has(roomId) {
    return this.rooms.has(roomId);
  }

  delete(roomId) {
    this.rooms.delete(roomId);
  }

  getAll() {
    return this.rooms;
  }
}

export const roomStore = new RoomStore();