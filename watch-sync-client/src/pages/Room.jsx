import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, Users, UserX, Check } from 'lucide-react';
import Hls from 'hls.js';
import Peer from 'peerjs';
import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/useRoomStore';
import { DEFAULT_VIDEO, SOCKET_SERVER_URL, EMOJI_REACTIONS } from '../utils/helpers';

// Subcomponents
import Header from '../components/Header';
import VideoPlayer from '../components/VideoPlayer';
import MediaUploadDeck from '../components/MediaUploadDeck';
import KnockToast from '../components/KnockToast';
import FloatingReactions from '../components/FloatingReactions';
import BookmarksDrawer from '../components/drawers/BookmarksDrawer';
import ChatDrawer from '../components/drawers/ChatDrawer';
import PlaylistDrawer from '../components/drawers/PlaylistDrawer';

// Modals
import KickModal from '../components/modals/KickModal';
import LeaveModal from '../components/modals/LeaveModal';
import TransferHostModal from '../components/modals/TransferHostModal';

export default function Room() {
  const { roomId: rawRoomId } = useParams();
  const roomId = String(rawRoomId || '').toLowerCase().trim();
  const navigate = useNavigate();

  const {
    joined,
    isHost,
    hostSocketId,
    allowedControllers,
    roomParticipants,
    isWaitingInLobby,
    lobbyDeclined,
    kickedByHostName,
    pendingKnocks,
    videoUrl,
    queue,
    currentQueueIndex,
    bookmarks,
    isProcessing,
    processState,
    bufferStatus,
    setRoomAdmitted,
    addParticipant,
    removeParticipant,
    setHostChanged,
    setParticipants,
    setControllers,
    setLobbyWaiting,
    setLobbyDeclined,
    setKicked,
    addKnock,
    resolveKnock,
    setVideoUrl,
    setQueue,
    setBookmarks,
    setProcessing,
    setBufferStatus,
    reset
  } = useRoomStore();

  const isCreator = Boolean(sessionStorage.getItem(`cinema_host_token_${roomId}`));

  const [hasPromptedToJoin, setHasPromptedToJoin] = useState(() => isCreator);
  const [candidateName, setCandidateName] = useState(() => {
    if (isCreator) {
      return sessionStorage.getItem(`cinema_username_${roomId}`) || localStorage.getItem('cinema_username') || 'Host';
    }
    return 'Guest-' + Math.floor(100 + Math.random() * 900);
  });

  const [username, setUsername] = useState(candidateName);
  const [currentSocketId, setCurrentSocketId] = useState(null);

  // In-App Toast Feedback
  const [toastMessage, setToastMessage] = useState('');

  // Player and Sync State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [userVolume, setUserVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Subtitles & Audio
  const [availableAudioTracks, setAvailableAudioTracks] = useState([]);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState(0);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState('off');
  const [settingsView, setSettingsView] = useState(null);

  // Drawers and Overlays
  const [activeSideDrawer, setActiveSideDrawer] = useState(null);
  const [inputUrl, setInputUrl] = useState('');
  const [activeReactions, setActiveReactions] = useState([]);

  // Chat
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInput, setChatInput] = useState('');

  // Voice WebRTC Audio Streams & Activity State
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState({});
  const [speakingPeers, setSpeakingPeers] = useState(new Set());
  const [mutedPeers, setMutedPeers] = useState(new Set());
  const [peerVolumes, setPeerVolumes] = useState({});
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Modals
  const [activeDropdownSocketId, setActiveDropdownSocketId] = useState(null);
  const [pendingHostTransferUser, setPendingHostTransferUser] = useState(null);
  const [pendingKickUser, setPendingKickUser] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const engineRef = useRef(null);
  const hlsRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeCallsRef = useRef(new Map());
  const bufferDebounceTimer = useRef(null);
  const isInternalAction = useRef(false);
  const isScrubbing = useRef(false);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const hasControlAccess = isHost || (allowedControllers && allowedControllers.includes(currentSocketId));

  const showInAppToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  // 1. PeerJS & Voice Setup
  useEffect(() => {
    if (!hasPromptedToJoin) return;

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      const socket = socketService.connect();
      socketRef.current = socket;
      setCurrentSocketId(socket.id);

      const hostToken = sessionStorage.getItem(`cinema_host_token_${roomId}`);

      socket.emit('REQUEST_JOIN_ROOM', {
        roomId,
        username,
        peerId: id,
        hostToken,
        defaultVideoUrl: DEFAULT_VIDEO
      });
    });

    peer.on('call', (call) => {
      const answerCall = (stream) => {
        call.answer(stream);
        call.on('stream', (incomingStream) => {
          setRemoteAudioStreams((prev) => ({ ...prev, [call.peer]: incomingStream }));
        });
        activeCallsRef.current.set(call.peer, call);
      };

      if (localStreamRef.current) {
        answerCall(localStreamRef.current);
      } else {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then((stream) => {
            localStreamRef.current = stream;
            stream.getAudioTracks().forEach((t) => (t.enabled = false));
            setIsMicMuted(true);
            setupAudioAnalyser(stream);
            answerCall(stream);
          })
          .catch(() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            osc.connect(dst);
            answerCall(dst.stream);
          });
      }
    });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
      peer.destroy();
    };
  }, [roomId, username, hasPromptedToJoin]);

  const callPeer = (targetPeerId) => {
    if (!peerRef.current || !targetPeerId || targetPeerId === peerRef.current.id) return;
    if (activeCallsRef.current.has(targetPeerId)) return;

    const initiate = (stream) => {
      const call = peerRef.current.call(targetPeerId, stream);
      if (call) {
        call.on('stream', (incomingStream) => {
          setRemoteAudioStreams((prev) => ({ ...prev, [targetPeerId]: incomingStream }));
        });
        activeCallsRef.current.set(targetPeerId, call);
      }
    };

    if (localStreamRef.current) {
      initiate(localStreamRef.current);
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          localStreamRef.current = stream;
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
          setIsMicMuted(true);
          setupAudioAnalyser(stream);
          initiate(stream);
        })
        .catch(() => {});
    }
  };

  // 2. Audio Metering & Equalizer Pipeline
  const setupAudioAnalyser = (stream) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!localStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        const trackEnabled = localStreamRef.current.getAudioTracks()[0]?.enabled;
        const speaking = average > 14 && trackEnabled;

        setIsLocalSpeaking(speaking);
        socketRef.current?.emit('VOICE_ACTIVITY', { isSpeaking: speaking, volume: average });
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch {}
  };

  // Toggle Microphone Mute State
  const toggleMic = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setupAudioAnalyser(stream);

        roomParticipants.forEach((p) => {
          if (p.peerId && p.peerId !== peerRef.current?.id) {
            callPeer(p.peerId);
          }
        });

        setIsMicMuted(false);
        showInAppToast('Microphone connected & live');
      } catch {
        showInAppToast('Microphone access denied');
      }
    } else {
      const nextState = !isMicMuted;
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextState));
      setIsMicMuted(nextState);
      if (nextState) {
        setIsLocalSpeaking(false);
        socketRef.current?.emit('VOICE_ACTIVITY', { isSpeaking: false, volume: 0 });
        showInAppToast('Microphone muted');
      } else {
        showInAppToast('Microphone live');
      }
    }
  };

  // 3. Socket Event Handlers
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('connect', () => {
      setCurrentSocketId(socket.id);
    });

    socket.on('LOBBY_WAITING', () => {
      setLobbyWaiting(true);
    });

    socket.on('LOBBY_DECLINED', () => {
      setLobbyDeclined(true);
    });

    socket.on('INCOMING_KNOCK', (knockData) => {
      addKnock(knockData);
    });

    socket.on('KNOCK_RESOLVED', ({ targetSocketId }) => {
      resolveKnock({ targetSocketId });
    });

    socket.on('ROOM_ADMITTED', (state) => {
      setRoomAdmitted(state);
      setVideoUrl(state.videoUrl);
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTimestamp || 0);

      if (state.users) {
        setParticipants(state.users);
        state.users.forEach((u) => {
          if (u.peerId) callPeer(u.peerId);
        });
      }

      const engine = engineRef.current;
      if (engine && state.currentTimestamp > 0) {
        engine.seek(state.currentTimestamp);
      }
    });

    socket.on('USER_JOINED', ({ users, peerId: newPeerId }) => {
      if (users) {
        setParticipants(users);
      }
      if (newPeerId) {
        callPeer(newPeerId);
      }
    });

    socket.on('USER_LEFT', ({ users, peerId: leftPeerId }) => {
      if (users) {
        setParticipants(users);
      }
      if (leftPeerId) {
        const call = activeCallsRef.current.get(leftPeerId);
        if (call) {
          try { call.close(); } catch {}
          activeCallsRef.current.delete(leftPeerId);
        }
        setRemoteAudioStreams((prev) => {
          const next = { ...prev };
          delete next[leftPeerId];
          return next;
        });
      }
    });

    socket.on('HOST_CHANGED', ({ newHostSocketId, allowedControllers: controllers }) => {
      setHostChanged({ newHostSocketId, allowedControllers: controllers, currentSocketId: socket.id });
    });

    socket.on('CONTROLLER_PERMISSIONS_UPDATED', ({ allowedControllers: controllers }) => {
      setControllers(controllers);
    });

    socket.on('KICKED_FROM_ROOM', ({ hostUsername }) => {
      if (engineRef.current) {
        try { engineRef.current.pause(); } catch {}
      }
      setKicked(hostUsername || 'Host');
      socketService.disconnect();
    });

    socket.on('SYNC_BROADCAST', ({ actionType, timestamp, speed }) => {
      const engine = engineRef.current;
      if (!engine) return;

      isInternalAction.current = true;

      if (actionType === 'PLAY') {
        setIsPlaying(true);
        const currentPos = engine.getCurrentTime();
        if (Math.abs(currentPos - timestamp) > 1.2) {
          engine.seek(timestamp);
        }
        engine.play();
      } else if (actionType === 'PAUSE') {
        setIsPlaying(false);
        engine.pause();
        if (Math.abs(engine.getCurrentTime() - timestamp) > 1.2) {
          engine.seek(timestamp);
        }
      } else if (actionType === 'SEEK') {
        engine.seek(timestamp);
        setCurrentTime(timestamp);
      } else if (actionType === 'SPEED') {
        const newSpeed = Number(speed) || 1;
        setPlaybackSpeed(newSpeed);
        if (engine.setSpeed) {
          engine.setSpeed(newSpeed);
        }
      }

      setTimeout(() => {
        isInternalAction.current = false;
      }, 600);
    });

    socket.on('ROOM_HEARTBEAT_SYNC', ({ timestamp: serverTime, isPlaying: serverPlaying }) => {
      if (isInternalAction.current || isScrubbing.current || isProcessing) return;

      const engine = engineRef.current;
      if (!engine) return;

      if (serverPlaying !== isPlayingRef.current) {
        setIsPlaying(serverPlaying);
        if (serverPlaying) {
          engine.play();
        } else {
          engine.pause();
        }
      }

      const localTime = engine.getCurrentTime();
      const drift = Math.abs(localTime - serverTime);

      if (drift > 2.5) {
        isInternalAction.current = true;
        engine.seek(serverTime);
        setCurrentTime(serverTime);
        setTimeout(() => {
          isInternalAction.current = false;
        }, 600);
      }
    });

    socket.on('VOICE_ACTIVITY_UPDATE', ({ socketId, isSpeaking }) => {
      setSpeakingPeers((prev) => {
        const next = new Set(prev);
        if (isSpeaking) next.add(socketId);
        else next.delete(socketId);
        return next;
      });
    });

    socket.on('VIDEO_URL_CHANGED', ({ newUrl, queue: updatedQueue, currentQueueIndex: newIdx }) => {
      setVideoUrl(newUrl);
      if (updatedQueue) setQueue(updatedQueue, newIdx);
      setIsPlaying(false);
      setCurrentTime(0);
      const engine = engineRef.current;
      if (engine) {
        engine.seek(0);
        engine.pause();
      }
    });

    socket.on('PLAYLIST_UPDATED', ({ queue: updatedQueue, currentQueueIndex: newIdx }) => {
      setQueue(updatedQueue, newIdx);
    });

    socket.on('BOOKMARKS_UPDATED', ({ bookmarks: updatedBookmarks }) => {
      setBookmarks(updatedBookmarks);
    });

    socket.on('CONVERSION_PROGRESS', (progress) => {
      if (progress.stage === 'done') setProcessing(false, null);
      else if (progress.stage === 'error') setProcessing(false, null);
      else setProcessing(true, { label: `Transcoding: ${progress.percent}%` });
    });

    socket.on('BUFFER_STATUS_UPDATE', ({ isBuffering, username: bufferUser }) => {
      setBufferStatus(isBuffering ? `${bufferUser || 'A peer'} is buffering...` : null);
    });

    socket.on('RECEIVE_CHAT_MESSAGE', (message) => {
      setMessages((prev) => [...prev, message]);
      if (activeSideDrawer !== 'chat') {
        setUnreadCount((c) => c + 1);
      }
    });

    socket.on('RECEIVE_REACTION', (reaction) => {
      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2200);
    });

    socket.on('REMOTE_MIC_MUTED_BY_HOST', () => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsMicMuted(true);
      setIsLocalSpeaking(false);
      showInAppToast('Your microphone was muted by the host');
    });

    return () => {
      socket.off('LOBBY_WAITING');
      socket.off('LOBBY_DECLINED');
      socket.off('INCOMING_KNOCK');
      socket.off('KNOCK_RESOLVED');
      socket.off('ROOM_ADMITTED');
      socket.off('USER_JOINED');
      socket.off('USER_LEFT');
      socket.off('HOST_CHANGED');
      socket.off('CONTROLLER_PERMISSIONS_UPDATED');
      socket.off('KICKED_FROM_ROOM');
      socket.off('SYNC_BROADCAST');
      socket.off('ROOM_HEARTBEAT_SYNC');
      socket.off('VOICE_ACTIVITY_UPDATE');
      socket.off('VIDEO_URL_CHANGED');
      socket.off('PLAYLIST_UPDATED');
      socket.off('BOOKMARKS_UPDATED');
      socket.off('CONVERSION_PROGRESS');
      socket.off('BUFFER_STATUS_UPDATE');
      socket.off('RECEIVE_CHAT_MESSAGE');
      socket.off('RECEIVE_REACTION');
      socket.off('REMOTE_MIC_MUTED_BY_HOST');
    };
  }, [roomId, activeSideDrawer, isProcessing]);

  // 4. Native Video Source Loader
  useEffect(() => {
    if (!joined) return;
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const isYt = Boolean(videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
    if (isYt) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const resolvedUrl = videoUrl.startsWith('/') ? `${SOCKET_SERVER_URL}${videoUrl}` : videoUrl;

    if (resolvedUrl.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ maxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(resolvedUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolvedUrl;
      }
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video.src !== resolvedUrl) {
        video.src = resolvedUrl;
        video.load();
      }
    }

    const onMeta = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      if (currentTimeRef.current > 0) {
        video.currentTime = currentTimeRef.current;
      }
      if (isPlayingRef.current && video.paused) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    };

    const onTime = () => {
      if (!isScrubbing.current) {
        setCurrentTime(video.currentTime);
      }
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('timeupdate', onTime);

    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate', onTime);
    };
  }, [videoUrl, joined]);

  // Playback Handlers
  const togglePlay = () => {
    if (!hasControlAccess) return;
    const engine = engineRef.current;
    if (!engine) return;

    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);

    isInternalAction.current = true;
    const ct = engine.getCurrentTime();
    if (nextPlay) {
      engine.play();
      socketRef.current?.emit('SYNC_ACTION', { actionType: 'PLAY', timestamp: ct });
    } else {
      engine.pause();
      socketRef.current?.emit('SYNC_ACTION', { actionType: 'PAUSE', timestamp: ct });
    }

    setTimeout(() => {
      isInternalAction.current = false;
    }, 400);
  };

  const skipSeconds = (seconds) => {
    if (!hasControlAccess) return;
    const engine = engineRef.current;
    if (!engine) return;

    const targetTime = Math.max(0, Math.min(duration, engine.getCurrentTime() + seconds));
    engine.seek(targetTime);
    setCurrentTime(targetTime);

    isInternalAction.current = true;
    socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: targetTime });
    setTimeout(() => {
      isInternalAction.current = false;
    }, 600);
  };

  const handleSeekStart = () => {
    isScrubbing.current = true;
    isInternalAction.current = true;
  };

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const handleSeekEnd = (e) => {
    const val = parseFloat(e.target.value);
    isScrubbing.current = false;
    if (!hasControlAccess) {
      isInternalAction.current = false;
      return;
    }

    const engine = engineRef.current;
    if (engine) {
      engine.seek(val);
    }

    socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: val });

    setTimeout(() => {
      isInternalAction.current = false;
    }, 800);
  };

  const handleNativePlay = () => {
    if (isInternalAction.current) return;
    if (!hasControlAccess) {
      isInternalAction.current = true;
      videoRef.current?.pause();
      setTimeout(() => {
        isInternalAction.current = false;
      }, 150);
      return;
    }
    setIsPlaying(true);
    socketRef.current?.emit('SYNC_ACTION', { actionType: 'PLAY', timestamp: videoRef.current?.currentTime || 0 });
  };

  const handleNativePause = () => {
    if (isInternalAction.current) return;
    if (!hasControlAccess) return;
    setIsPlaying(false);
    socketRef.current?.emit('SYNC_ACTION', { actionType: 'PAUSE', timestamp: videoRef.current?.currentTime || 0 });
  };

  const handleNativeSeeked = () => {
    if (isInternalAction.current || isScrubbing.current) return;
    if (!hasControlAccess) return;
    socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: videoRef.current?.currentTime || 0 });
  };

  const handleVideoEnded = () => {
    if (hasControlAccess) {
      socketRef.current?.emit('AUTO_PLAY_NEXT');
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) videoRef.current.muted = nextMuted;
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setUserVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch {}
  };

  const createBookmarkAtCurrentTime = () => {
    socketRef.current?.emit('CREATE_BOOKMARK', {
      timestamp: currentTime,
      label: `Scene @ ${formatTime(currentTime)}`
    });
    showInAppToast('Scene pinned to bookmarks');
  };

  const deleteBookmark = (bookmarkId) => {
    socketRef.current?.emit('DELETE_BOOKMARK', { bookmarkId });
  };

  const jumpToBookmark = (time) => {
    const engine = engineRef.current;
    if (engine) engine.seek(time);
    setCurrentTime(time);
    if (hasControlAccess) {
      socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: time });
    }
  };

  const playQueueIndex = (index) => {
    socketRef.current?.emit('PLAY_QUEUE_INDEX', { index });
  };

  const removeFromQueue = (index) => {
    socketRef.current?.emit('REMOVE_FROM_QUEUE', { index });
  };

  const playNextVideo = () => {
    socketRef.current?.emit('AUTO_PLAY_NEXT');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('SEND_CHAT_MESSAGE', { text: chatInput.trim() });
    setChatInput('');
  };

  const handleSendReaction = (emoji) => {
    socketRef.current?.emit('SEND_REACTION', { emoji });
  };

  const handleAdmitKnock = (targetSocketId) => {
    socketRef.current?.emit('ADMIT_USER', { targetSocketId });
    resolveKnock({ targetSocketId });
  };

  const handleDeclineKnock = (targetSocketId) => {
    socketRef.current?.emit('DECLINE_USER', { targetSocketId });
    resolveKnock({ targetSocketId });
  };

  const toggleUserControl = (targetSocketId) => {
    socketRef.current?.emit('TOGGLE_USER_CONTROL', { targetSocketId });
  };

  const muteUserMic = (targetSocketId) => {
    socketRef.current?.emit('MUTE_USER_MIC', { targetSocketId });
  };

  const confirmTransferHost = () => {
    if (pendingHostTransferUser) {
      socketRef.current?.emit('TRANSFER_HOST', { targetSocketId: pendingHostTransferUser.socketId });
      setPendingHostTransferUser(null);
      showInAppToast('Room host crown transferred');
    }
  };

  const confirmKickUser = () => {
    if (pendingKickUser) {
      socketRef.current?.emit('KICK_USER', { targetSocketId: pendingKickUser.socketId });
      setPendingKickUser(null);
    }
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    reset();
    navigate('/');
  };

  const handlePlayResolvedSource = (resolved, addToQueueOnly = false) => {
    if (addToQueueOnly) {
      socketRef.current?.emit('ADD_TO_QUEUE', {
        item: { title: resolved.title, url: resolved.url, mediaMeta: resolved }
      });
      showInAppToast('Added to queue');
    } else {
      socketRef.current?.emit('CHANGE_VIDEO_URL', {
        newUrl: resolved.url,
        mediaMeta: resolved
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showInAppToast('Room link copied to clipboard!');
  };

  // 1. Kicked Screen
  if (kickedByHostName) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top, #450a0a 0%, #030712 70%)', color: '#fff', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 24, padding: 32, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
            <UserX size={26} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc' }}>Removed from Room</h2>
          <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            You have been removed from <strong style={{ color: '#fff' }}>{roomId}</strong> by host <strong style={{ color: '#ef4444' }}>{kickedByHostName}</strong>.
          </p>
          <button
            onClick={handleLeaveRoom}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 14,
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // 2. Pre-join: Prompt user for Display Name
  if (!hasPromptedToJoin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top, #1e1b4b 0%, #030712 70%)', color: '#fff', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 24, padding: 28, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
          <div style={{ background: '#38bdf8', width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <Users size={22} color="#030712" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px 0' }}>Join Cinema Room</h2>
          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>
            Room ID: <strong style={{ color: '#38bdf8' }}>{roomId}</strong>
          </p>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!candidateName.trim()) return;
            const chosen = candidateName.trim();
            setUsername(chosen);
            sessionStorage.setItem(`cinema_username_${roomId}`, chosen);
            setHasPromptedToJoin(true);
          }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#d1d5db', marginBottom: 6 }}>
                Your Name / Nickname
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter your name..."
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '12px',
                borderRadius: 14,
                border: 'none',
                background: '#38bdf8',
                color: '#030712',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4
              }}
            >
              <LogIn size={16} /> Ask to Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Lobby Waiting Screen
  if (isWaitingInLobby || (!joined && !isHost)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712', color: '#fff' }}>
        <div style={{ padding: '30px 40px', borderRadius: 20, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', maxWidth: 420 }}>
          <Loader2 className="animate-spin" size={38} color="#38bdf8" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Waiting for Host to Admit...</h2>
          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>
            You have knocked to enter room <strong>{roomId}</strong> as <strong>{username}</strong>. The host will admit you shortly.
          </p>
          <button onClick={() => navigate('/')} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '8px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 4. Lobby Declined Screen
  if (lobbyDeclined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712', color: '#fff' }}>
        <div style={{ padding: '30px 40px', borderRadius: 20, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', maxWidth: 420 }}>
          <h2 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>Access Declined</h2>
          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>The room host has declined your request to join.</p>
          <button onClick={() => navigate('/')} style={{ background: '#38bdf8', border: 'none', color: '#030712', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#030712',
        color: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 16px'
      }}
      onClick={() => {
        setActiveDropdownSocketId(null);
        setSettingsView(null);
      }}
    >
      {/* Hidden Peer Audio Elements: Plays incoming WebRTC audio tracks */}
      <div style={{ display: 'none' }}>
        {Object.entries(remoteAudioStreams).map(([peerId, stream]) => (
          <audio
            key={peerId}
            autoPlay
            playsInline
            muted={mutedPeers.has(peerId)}
            ref={(audioEl) => {
              if (audioEl && audioEl.srcObject !== stream) {
                audioEl.srcObject = stream;
              }
            }}
          />
        ))}
      </div>

      {/* In-App Toast Pill Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#f8fafc',
            padding: '8px 16px',
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)'
          }}
        >
          <Check size={14} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Knock Admission Notifications */}
      {isHost && (
        <KnockToast
          knocks={pendingKnocks}
          onAdmit={handleAdmitKnock}
          onDecline={handleDeclineKnock}
        />
      )}

      {/* Floating Reactions Layer */}
      <FloatingReactions activeReactions={activeReactions} />

      {/* Fixed Reaction Dock: Always accessible to all room users */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: activeSideDrawer ? 360 : 24,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 9999,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 45,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          transition: 'right 0.25s ease'
        }}
      >
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendReaction(emoji)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 8,
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Top Header */}
      <Header
        roomId={roomId}
        username={username}
        isHost={isHost}
        hasControlAccess={hasControlAccess}
        hostSocketId={hostSocketId}
        allowedControllers={allowedControllers}
        roomParticipants={roomParticipants}
        speakingPeers={speakingPeers}
        peerVolumes={peerVolumes}
        isLocalSpeaking={isLocalSpeaking}
        mutedPeers={mutedPeers}
        isMicMuted={isMicMuted}
        toggleMic={toggleMic}
        togglePeerAudio={(peerId) => {
          setMutedPeers((prev) => {
            const next = new Set(prev);
            if (next.has(peerId)) next.delete(peerId);
            else next.add(peerId);
            return next;
          });
        }}
        toggleUserControl={toggleUserControl}
        muteUserMic={muteUserMic}
        activeSideDrawer={activeSideDrawer}
        setActiveSideDrawer={(drawer) => {
          setActiveSideDrawer(drawer);
          if (drawer === 'chat') setUnreadCount(0);
        }}
        unreadCount={unreadCount}
        queueLength={queue.length}
        bookmarksLength={bookmarks.length}
        onLeaveClick={() => setShowLeaveModal(true)}
        onShareClick={handleCopyLink}
        activeDropdownSocketId={activeDropdownSocketId}
        setActiveDropdownSocketId={setActiveDropdownSocketId}
        setPendingHostTransferUser={setPendingHostTransferUser}
        setPendingKickUser={setPendingKickUser}
      />

      {/* Main Responsive Viewport */}
      <div className="room-viewport-container">
        <div className="room-player-wrapper">
          <VideoPlayer
            videoRef={videoRef}
            engineRef={engineRef}
            videoUrl={videoUrl}
            playerContainerRef={playerContainerRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            userVolume={userVolume}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            isPiP={isPiP}
            showControls={showControls}
            playbackSpeed={playbackSpeed}
            currentMediaTitle={queue[currentQueueIndex]?.title || 'Video Stream'}
            hasControlAccess={hasControlAccess}
            isProcessing={isProcessing}
            processState={processState}
            bufferStatus={bufferStatus}
            activeReactions={activeReactions}
            settingsView={settingsView}
            setSettingsView={setSettingsView}
            availableAudioTracks={availableAudioTracks}
            selectedAudioTrackIndex={selectedAudioTrackIndex}
            availableSubtitles={availableSubtitles}
            selectedSubtitleId={selectedSubtitleId}
            currentAudioLabel={availableAudioTracks[selectedAudioTrackIndex]?.label || 'Default'}
            currentSubLabel={selectedSubtitleId === 'off' ? 'Off' : 'Active'}
            handleAudioTrackChange={setSelectedAudioTrackIndex}
            handleSubtitleChange={(sub) => setSelectedSubtitleId(sub === 'off' ? 'off' : sub.id)}
            queue={queue}
            currentQueueIndex={currentQueueIndex}
            togglePlay={togglePlay}
            skipSeconds={skipSeconds}
            toggleMute={toggleMute}
            toggleFullscreen={toggleFullscreen}
            togglePiP={togglePiP}
            playNextVideo={playNextVideo}
            createBookmarkAtCurrentTime={createBookmarkAtCurrentTime}
            handleSeekStart={handleSeekStart}
            handleSeekChange={handleSeekChange}
            handleSeekEnd={handleSeekEnd}
            handleVolumeChange={handleVolumeChange}
            setPlaybackSpeed={setPlaybackSpeed}
            handleNativePlay={handleNativePlay}
            handleNativePause={handleNativePause}
            handleNativeSeeked={handleNativeSeeked}
            handleVideoEnded={handleVideoEnded}
            bufferDebounceTimer={bufferDebounceTimer}
            socketRef={socketRef}
            setCurrentTime={setCurrentTime}
            setDuration={setDuration}
            setIsPlaying={setIsPlaying}
            isMicMuted={isMicMuted}
            toggleMic={toggleMic}
            speakingPeers={speakingPeers}
            roomParticipants={roomParticipants}
            currentUsername={username}
            currentSocketId={currentSocketId}
            messages={messages}
            unreadCount={unreadCount}
            onResetUnread={() => setUnreadCount(0)}
            onSendMessage={(txt) => socketRef.current?.emit('SEND_CHAT_MESSAGE', { text: txt })}
            onSendReaction={handleSendReaction}
          />
        </div>

        {/* Side Drawer Container */}
        {activeSideDrawer && (
          <aside className="room-drawer-container">
            {activeSideDrawer === 'chat' && (
              <ChatDrawer
                messages={messages}
                currentSocketId={currentSocketId}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendMessage={handleSendMessage}
              />
            )}
            {activeSideDrawer === 'playlist' && (
              <PlaylistDrawer
                queue={queue}
                currentQueueIndex={currentQueueIndex}
                hasControlAccess={hasControlAccess}
                playQueueIndex={playQueueIndex}
                removeFromQueue={removeFromQueue}
                handleFileSelect={() => {}}
              />
            )}
            {activeSideDrawer === 'bookmarks' && (
              <BookmarksDrawer
                bookmarks={bookmarks}
                hasControlAccess={hasControlAccess}
                jumpToBookmark={jumpToBookmark}
                deleteBookmark={deleteBookmark}
                createBookmarkAtCurrentTime={createBookmarkAtCurrentTime}
              />
            )}
          </aside>
        )}
      </div>

      {/* Media Upload & URL Injection Deck */}
      <MediaUploadDeck
        hasControlAccess={hasControlAccess}
        isProcessing={isProcessing}
        inputUrl={inputUrl}
        setInputUrl={setInputUrl}
        handleCustomSubtitleFile={() => {}}
        onPlayResolvedSource={handlePlayResolvedSource}
      />

      {/* Interactive Modals */}
      <LeaveModal
        show={showLeaveModal}
        roomId={roomId}
        onCancel={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveRoom}
      />

      <TransferHostModal
        targetUser={pendingHostTransferUser}
        onCancel={() => setPendingHostTransferUser(null)}
        onConfirm={confirmTransferHost}
      />

      <KickModal
        targetUser={pendingKickUser}
        onCancel={() => setPendingKickUser(null)}
        onConfirm={confirmKickUser}
      />
    </div>
  );
}