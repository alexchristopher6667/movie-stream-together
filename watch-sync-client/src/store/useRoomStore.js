import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  joined: false,
  isHost: false,
  hostSocketId: null,
  allowedControllers: [],
  currentSocketId: null,
  roomParticipants: [],
  
  // Modals & UI status
  isWaitingInLobby: false,
  lobbyDeclined: false,
  kickedByHostName: null,
  roomNotFoundError: null,
  pendingKnocks: [],

  // Media
  videoUrl: '/media/hls-demo/index.m3u8',
  queue: [],
  currentQueueIndex: 0,
  bookmarks: [],
  isProcessing: false,
  processState: null,
  bufferStatus: null,

  setRoomAdmitted: (payload) => set({
    joined: true,
    isWaitingInLobby: false,
    kickedByHostName: null,
    lobbyDeclined: null,
    isHost: Boolean(payload.isHost),
    hostSocketId: payload.hostSocketId,
    allowedControllers: payload.allowedControllers || [],
    videoUrl: payload.videoUrl,
    queue: payload.queue || [],
    bookmarks: payload.bookmarks || [],
    currentQueueIndex: payload.currentQueueIndex || 0,
    roomParticipants: payload.users || []
  }),

  addParticipant: (newUser) => set((state) => {
    const filtered = state.roomParticipants.filter(
      (u) => u.socketId !== newUser.socketId && u.username !== newUser.username
    );
    return { roomParticipants: [...filtered, newUser] };
  }),

  removeParticipant: (socketId) => set((state) => ({
    roomParticipants: state.roomParticipants.filter((u) => u.socketId !== socketId)
  })),

  setHostChanged: ({ newHostSocketId, allowedControllers, currentSocketId }) => set({
    hostSocketId: newHostSocketId,
    isHost: newHostSocketId === currentSocketId,
    allowedControllers: allowedControllers || []
  }),

  setParticipants: (users) => set({ roomParticipants: users }),
  setControllers: (allowedControllers) => set({ allowedControllers }),
  setLobbyWaiting: (isWaiting) => set({ isWaitingInLobby: isWaiting }),
  setLobbyDeclined: (declined) => set({ lobbyDeclined: declined, isWaitingInLobby: false }),
  setKicked: (hostName) => set({ kickedByHostName: hostName, joined: false, isWaitingInLobby: false }),

  addKnock: (knockData) => set((state) => ({
    pendingKnocks: [
      ...state.pendingKnocks.filter(
        (k) => k.username !== knockData.username && k.socketId !== knockData.socketId
      ),
      knockData
    ]
  })),

  resolveKnock: ({ targetSocketId, targetUsername }) => set((state) => ({
    pendingKnocks: state.pendingKnocks.filter(
      (k) => k.socketId !== targetSocketId && k.username !== targetUsername
    )
  })),

  setVideoUrl: (videoUrl) => set({ videoUrl }),
  setQueue: (queue, currentQueueIndex) => set({ queue, currentQueueIndex }),
  setBookmarks: (bookmarks) => set({ bookmarks }),
  setProcessing: (isProcessing, processState = null) => set({ isProcessing, processState }),
  setBufferStatus: (bufferStatus) => set({ bufferStatus }),

  reset: () => set({
    joined: false,
    isHost: false,
    hostSocketId: null,
    allowedControllers: [],
    currentSocketId: null,
    roomParticipants: [],
    isWaitingInLobby: false,
    lobbyDeclined: false,
    kickedByHostName: null,
    roomNotFoundError: null,
    pendingKnocks: []
  })
}));