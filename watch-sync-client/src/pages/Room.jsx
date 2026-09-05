import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import Hls from 'hls.js';
import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/useRoomStore';
import Header from '../components/Header';
import KnockToast from '../components/KnockToast';
import VideoPlayer from '../components/VideoPlayer';
import MediaUploadDeck from '../components/MediaUploadDeck';
import EventLog from '../components/EventLog';
import ChatDrawer from '../components/drawers/ChatDrawer';
import PlaylistDrawer from '../components/drawers/PlaylistDrawer';
import BookmarksDrawer from '../components/drawers/BookmarksDrawer';
import LeaveModal from '../components/modals/LeaveModal';
import TransferHostModal from '../components/modals/TransferHostModal';
import KickModal from '../components/modals/KickModal';
import {
  SOCKET_SERVER_URL,
  DEFAULT_VIDEO,
  EMOJI_REACTIONS
} from '../utils/helpers';
import {
  Film,
  Clock,
  UserX,
  X,
  MessageSquare,
  ListVideo,
  BookmarkCheck,
  LogIn,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const isCreatorTokenPresent = Boolean(sessionStorage.getItem(`cinema_host_token_${roomId}`));

  const {
    joined,
    isHost,
    hostSocketId,
    allowedControllers,
    roomParticipants,
    isWaitingInLobby,
    lobbyDeclined,
    kickedByHostName,
    roomNotFoundError,
    pendingKnocks,
    videoUrl,
    queue,
    currentQueueIndex,
    bookmarks,
    isProcessing,
    processState,
    bufferStatus,
    setRoomAdmitted,
    setParticipants,
    setHostChanged,
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

  const [currentUsername, setCurrentUsername] = useState(() => {
    return sessionStorage.getItem(`cinema_username_${roomId}`) ||
           localStorage.getItem('cinema_username') ||
           '';
  });

  const [hasPromptedName, setHasPromptedName] = useState(() => {
    return isCreatorTokenPresent || Boolean(sessionStorage.getItem(`cinema_username_${roomId}`));
  });

  const [guestInputName, setGuestInputName] = useState(() => {
    return sessionStorage.getItem(`cinema_username_${roomId}`) ||
           localStorage.getItem('cinema_username') ||
           '';
  });

  const [currentSocketId, setCurrentSocketId] = useState(null);
  const [activeDropdownSocketId, setActiveDropdownSocketId] = useState(null);
  const [activeSideDrawer, setActiveSideDrawer] = useState(null);
  const [inputUrl, setInputUrl] = useState('');

  // Modals
  const [pendingHostTransferUser, setPendingHostTransferUser] = useState(null);
  const [pendingKickUser, setPendingKickUser] = useState(null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  // Video Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [userVolume, setUserVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [settingsView, setSettingsView] = useState(null);

  // Audio Tracks & Subtitles States
  const [availableAudioTracks, setAvailableAudioTracks] = useState([]);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState(0);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState('off');

  // Voice Chat
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [speakingPeers, setSpeakingPeers] = useState(new Set());
  const [peerVolumes, setPeerVolumes] = useState({});
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);
  const [mutedPeers, setMutedPeers] = useState(new Set());

  // Chat & Reactions
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeReactions, setActiveReactions] = useState([]);
  const [logs, setLogs] = useState([]);

  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const playerContainerRef = useRef(null);
  const drawerContainerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const bufferDebounceTimer = useRef(null);
  const isScrubbing = useRef(false);
  const prevActiveDrawerRef = useRef(null);
  const isInternalAction = useRef(false);
  const targetSyncTimestamp = useRef(0);

  // Voice Refs
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerCallsRef = useRef(new Map());
  const peerAudioElementsRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const localAudioIntervalRef = useRef(null);

  const hasControlAccess = isHost || isCreatorTokenPresent || Boolean(currentSocketId && allowedControllers.includes(currentSocketId));

  const hasControlAccessRef = useRef(hasControlAccess);
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const userVolumeRef = useRef(userVolume);
  const activeSideDrawerRef = useRef(activeSideDrawer);
  const currentSocketIdRef = useRef(currentSocketId);
  const currentUsernameRef = useRef(currentUsername);

  useEffect(() => { hasControlAccessRef.current = hasControlAccess; }, [hasControlAccess]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { userVolumeRef.current = userVolume; }, [userVolume]);
  useEffect(() => { activeSideDrawerRef.current = activeSideDrawer; }, [activeSideDrawer]);
  useEffect(() => { currentSocketIdRef.current = currentSocketId; }, [currentSocketId]);
  useEffect(() => { currentUsernameRef.current = currentUsername; }, [currentUsername]);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const promise = video.play();
    if (promise !== undefined) {
      promise.catch((err) => {
        if (err.name === 'AbortError') return;
        console.warn('Playback interrupted:', err);
      });
    }
  }, []);

  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
    }
  }, []);

  const addLog = (msg) => setLogs((prev) => [msg, ...prev.slice(0, 15)]);

  const handleSafeReturnHome = () => {
    sessionStorage.removeItem(`cinema_username_${roomId}`);
    sessionStorage.removeItem(`cinema_host_token_${roomId}`);
    if (localAudioIntervalRef.current) clearInterval(localAudioIntervalRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerCallsRef.current) {
      peerCallsRef.current.forEach((c) => c.close());
      peerCallsRef.current.clear();
    }
    if (peerAudioElementsRef.current) peerAudioElementsRef.current.clear();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    socketService.disconnect();
    reset();
    navigate('/', { replace: true });
  };

  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (isPlaying && !settingsView && !isScrubbing.current && !activeDropdownSocketId && !pendingHostTransferUser && !pendingKickUser && !showLeaveConfirmation) {
      inactivityTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, settingsView, activeDropdownSocketId, pendingHostTransferUser, pendingKickUser, showLeaveConfirmation]);

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [handleUserActivity]);

  useEffect(() => {
    if (activeSideDrawer && drawerContainerRef.current) {
      const rect = drawerContainerRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        window.scrollBy({ top: rect.bottom - window.innerHeight + 16, behavior: 'smooth' });
      }
    } else if (!activeSideDrawer && prevActiveDrawerRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevActiveDrawerRef.current = activeSideDrawer;
  }, [activeSideDrawer]);

  const handleCloseDrawer = () => {
    setActiveSideDrawer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Video Source Loader for Native streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !joined) return;

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return;
    }

    const resolvedUrl = videoUrl.startsWith('/') ? `${SOCKET_SERVER_URL}${videoUrl}` : videoUrl;

    const onMediaReady = () => {
      if (targetSyncTimestamp.current > 0) {
        video.currentTime = targetSyncTimestamp.current;
      }
      setDuration(video.duration || 0);
      if (isPlayingRef.current) {
        safePlay();
      }
    };

    const onTimeUpdate = () => {
      if (!isScrubbing.current) {
        setCurrentTime(video.currentTime);
      }
    };

    const onLoadedMeta = () => {
      setDuration(video.duration || 0);
      if (targetSyncTimestamp.current > 0) {
        video.currentTime = targetSyncTimestamp.current;
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('canplay', onMediaReady);
    video.addEventListener('timeupdate', onTimeUpdate);

    if (resolvedUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        if (hlsInstanceRef.current) hlsInstanceRef.current.destroy();
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(resolvedUrl);
        hls.attachMedia(video);
        hlsInstanceRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, onMediaReady);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolvedUrl;
      }
    } else {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      video.src = resolvedUrl;
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta);
      video.removeEventListener('canplay', onMediaReady);
      video.removeEventListener('timeupdate', onTimeUpdate);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [videoUrl, joined, safePlay]);

  // Voice setup
  const setupLocalVolumeMonitor = (stream) => {
    try {
      if (localAudioIntervalRef.current) clearInterval(localAudioIntervalRef.current);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      localAudioIntervalRef.current = setInterval(() => {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled) {
          if (isLocalSpeaking) {
            setIsLocalSpeaking(false);
            setLocalVolume(0);
            socketRef.current?.emit('VOICE_ACTIVITY', { isSpeaking: false, volume: 0 });
          }
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        const speaking = avg > 22;

        setLocalVolume(avg);
        setIsLocalSpeaking(speaking);
        socketRef.current?.emit('VOICE_ACTIVITY', { isSpeaking: speaking, volume: Math.round(avg) });
      }, 100);
    } catch (e) {
      console.error('Local volume error:', e);
    }
  };

  const callPeerUser = (targetPeerId, localStream) => {
    if (!peerRef.current || !targetPeerId || targetPeerId === peerRef.current.id) return;
    if (peerCallsRef.current.has(targetPeerId)) return;

    const call = peerRef.current.call(targetPeerId, localStream);
    if (call) {
      call.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch(() => {});
        peerAudioElementsRef.current.set(targetPeerId, audio);
      });
      peerCallsRef.current.set(targetPeerId, call);
    }
  };

  // Socket Connection Lifecycle
  useEffect(() => {
    if (!roomId || !hasPromptedName || kickedByHostName || lobbyDeclined) return;

    const activeName = currentUsername || 'User-' + Math.floor(100 + Math.random() * 900);
    const hostToken = sessionStorage.getItem(`cinema_host_token_${roomId}`);

    let localStream = null;

    const socket = socketService.connect();
    socketRef.current = socket;

    const emitJoin = () => {
      setCurrentSocketId(socket.id);
      socket.emit('REQUEST_JOIN_ROOM', {
        roomId: (roomId || '').trim().toLowerCase(),
        username: activeName,
        peerId: peerRef.current?.id || null,
        hostToken,
        defaultVideoUrl: DEFAULT_VIDEO
      });
    };

    // Clean specific handlers to prevent race conditions
    socket.off('LOBBY_WAITING');
    socket.off('LOBBY_DECLINED');
    socket.off('INCOMING_KNOCK');
    socket.off('KNOCK_RESOLVED');
    socket.off('VOICE_ACTIVITY_UPDATE');
    socket.off('REMOTE_MIC_MUTED_BY_HOST');
    socket.off('KICKED_FROM_ROOM');
    socket.off('PLAYLIST_UPDATED');
    socket.off('BOOKMARKS_UPDATED');
    socket.off('ROOM_ADMITTED');
    socket.off('ROOM_HEARTBEAT_SYNC');
    socket.off('HOST_CHANGED');
    socket.off('CONTROLLER_PERMISSIONS_UPDATED');
    socket.off('USER_JOINED');
    socket.off('USER_LEFT');
    socket.off('RECEIVE_CHAT_MESSAGE');
    socket.off('RECEIVE_REACTION');
    socket.off('VIDEO_URL_CHANGED');
    socket.off('SYNC_BROADCAST');
    socket.off('BUFFER_STATUS_UPDATE');

    socket.on('connect', emitJoin);

    if (socket.connected) {
      emitJoin();
    }

    socket.on('LOBBY_WAITING', () => setLobbyWaiting(true));
    socket.on('LOBBY_DECLINED', () => {
      setLobbyDeclined(true);
      sessionStorage.removeItem(`cinema_username_${roomId}`);
      socketService.disconnect();
    });

    socket.on('INCOMING_KNOCK', (knockData) => {
      addKnock(knockData);
      addLog(`🚪 ${knockData.username} requested to join.`);
    });

    socket.on('KNOCK_RESOLVED', (resolvedData) => {
      resolveKnock(resolvedData);
    });

    socket.on('VOICE_ACTIVITY_UPDATE', ({ socketId: senderSocketId, isSpeaking: remoteSpeaking, volume: remoteVol }) => {
      setPeerVolumes((prev) => ({ ...prev, [senderSocketId]: remoteVol }));
      setSpeakingPeers((prev) => {
        const next = new Set(prev);
        if (remoteSpeaking) next.add(senderSocketId);
        else next.delete(senderSocketId);
        return next;
      });
    });

    socket.on('REMOTE_MIC_MUTED_BY_HOST', ({ hostUsername: muteHost }) => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
        setIsMicMuted(true);
        setIsLocalSpeaking(false);
        setLocalVolume(0);
        socket.emit('VOICE_ACTIVITY', { isSpeaking: false, volume: 0 });
      }
      addLog(`🔇 Muted by Host (${muteHost}).`);
    });

    socket.on('KICKED_FROM_ROOM', ({ hostUsername: kicker }) => {
      setKicked(kicker);
      sessionStorage.removeItem(`cinema_username_${roomId}`);
      sessionStorage.removeItem(`cinema_host_token_${roomId}`);
      socketService.disconnect();
    });

    socket.on('PLAYLIST_UPDATED', ({ queue: updatedQueue, currentQueueIndex: idx }) => {
      setQueue(updatedQueue, idx);
    });

    socket.on('BOOKMARKS_UPDATED', ({ bookmarks: updatedBookmarks }) => {
      setBookmarks(updatedBookmarks);
    });

    socket.on('ROOM_ADMITTED', (state) => {
      setRoomAdmitted(state);
      addLog(`Joined Room: "${roomId}"`);

      if (state.videoUrl) {
        setVideoUrl(state.videoUrl);
      }
      if (state.queue) {
        setQueue(state.queue, state.currentQueueIndex || 0);
      }

      targetSyncTimestamp.current = state.currentTimestamp || 0;
      setCurrentTime(state.currentTimestamp || 0);
      setIsPlaying(state.isPlaying || false);

      if (videoRef.current && !state.videoUrl?.includes('youtu')) {
        videoRef.current.currentTime = state.currentTimestamp || 0;
        if (state.isPlaying) {
          safePlay();
        }
      }

      if (localStream && state.users) {
        state.users.forEach((u) => {
          if (u.peerId && peerRef.current && u.peerId !== peerRef.current.id) {
            callPeerUser(u.peerId, localStream);
          }
        });
      }
    });

    // Heartbeat Sync
    socket.on('ROOM_HEARTBEAT_SYNC', ({ timestamp: serverTime, isPlaying: serverPlaying }) => {
      if (isInternalAction.current || isScrubbing.current || isProcessing) return;

      const video = videoRef.current;
      const isYt = Boolean(videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')));

      if (serverPlaying !== isPlayingRef.current) {
        setIsPlaying(serverPlaying);
      }

      if (!isYt && video) {
        const localTime = video.currentTime;
        const drift = Math.abs(localTime - serverTime);

        if (serverPlaying && video.paused) {
          safePlay();
        } else if (!serverPlaying && !video.paused) {
          safePause();
        }

        if (drift > 1.5) {
          isInternalAction.current = true;
          video.currentTime = serverTime;
          setCurrentTime(serverTime);
          setTimeout(() => { isInternalAction.current = false; }, 200);
        }
      } else {
        const drift = Math.abs(currentTimeRef.current - serverTime);
        if (drift > 2.0) {
          setCurrentTime(serverTime);
        }
      }
    });

    socket.on('HOST_CHANGED', (payload) => {
      setHostChanged({ ...payload, currentSocketId: socket.id });
      addLog(`👑 Host transferred to ${payload.newHostUsername}`);
    });

    socket.on('CONTROLLER_PERMISSIONS_UPDATED', ({ allowedControllers: newControllers }) => {
      setControllers(newControllers || []);
      addLog('🎮 Permissions updated');
    });

    socket.on('USER_JOINED', ({ users, username: joinedName, peerId: joinedPeerId }) => {
      addLog(`🟢 ${joinedName} joined.`);
      if (users && Array.isArray(users)) {
        setParticipants(users);
      }
      if (localStream && joinedPeerId && peerRef.current && joinedPeerId !== peerRef.current.id) {
        callPeerUser(joinedPeerId, localStream);
      }
    });

    socket.on('USER_LEFT', ({ socketId: leftSocketId, username: leftName, peerId: leftPeerId, users: remainingUsers }) => {
      addLog(`🔴 ${leftName} left.`);
      if (remainingUsers && Array.isArray(remainingUsers)) {
        setParticipants(remainingUsers);
      } else {
        setParticipants(useRoomStore.getState().roomParticipants.filter(u => u.socketId !== leftSocketId));
      }
      if (leftPeerId && peerCallsRef.current.has(leftPeerId)) {
        peerCallsRef.current.get(leftPeerId).close();
        peerCallsRef.current.delete(leftPeerId);
      }
    });

    socket.on('RECEIVE_CHAT_MESSAGE', (msg) => {
      setMessages((prev) => [...prev, msg]);
      const isSenderSelf = (currentSocketIdRef.current && msg.senderSocketId === currentSocketIdRef.current) ||
                           (msg.username === currentUsernameRef.current);
      if (!isSenderSelf && activeSideDrawerRef.current !== 'chat') {
        setUnreadCount((prev) => prev + 1);
      }
    });

    socket.on('RECEIVE_REACTION', (reaction) => {
      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2300);
    });

    socket.on('VIDEO_URL_CHANGED', ({ newUrl, mediaMeta, queue: newQ, currentQueueIndex: newIdx }) => {
      addLog(`🎬 Playing: "${mediaMeta?.title || 'Stream'}"`);
      targetSyncTimestamp.current = 0;
      setVideoUrl(newUrl);
      if (newQ) setQueue(newQ, newIdx);
      setIsPlaying(false);
      safePause();
      setCurrentTime(0);
    });

    socket.on('SYNC_BROADCAST', ({ actionType, timestamp }) => {
      isInternalAction.current = true;
      setCurrentTime(timestamp);

      const isYt = Boolean(videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')));
      const video = videoRef.current;

      if (!isYt && video) {
        video.currentTime = timestamp;
        if (actionType === 'PLAY') {
          safePlay();
        } else if (actionType === 'PAUSE') {
          safePause();
        }
      }

      if (actionType === 'PLAY') {
        setIsPlaying(true);
      } else if (actionType === 'PAUSE') {
        setIsPlaying(false);
      }

      setTimeout(() => { isInternalAction.current = false; }, 250);
    });

    socket.on('BUFFER_STATUS_UPDATE', ({ isBuffering, username: bufUser }) => {
      if (isBuffering && !isProcessing) setBufferStatus(`Waiting for ${bufUser || 'peer'}...`);
      else setBufferStatus(null);
    });

    const initPeer = async () => {
      if (peerRef.current) return;
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
          localStreamRef.current = localStream;
          setIsMicMuted(true);
        }
      } catch {
        addLog('⚠️ Microphone permission unavailable.');
      }

      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (peerId) => {
        socket.emit('REGISTER_PEER_ID', { peerId });
      });

      peer.on('call', (call) => {
        call.answer(localStream);
        call.on('stream', (remoteStream) => {
          const audio = new Audio();
          audio.srcObject = remoteStream;
          audio.play().catch(() => {});
          peerAudioElementsRef.current.set(call.peer, audio);
        });
        peerCallsRef.current.set(call.peer, call);
      });
    };

    initPeer();

    return () => {
      if (localAudioIntervalRef.current) clearInterval(localAudioIntervalRef.current);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [roomId, hasPromptedName, kickedByHostName, lobbyDeclined, safePlay, safePause, videoUrl]);

  const toggleMic = async () => {
    if (!localStreamRef.current) {
      try {
        const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = rawStream;
        rawStream.getAudioTracks().forEach((t) => { t.enabled = true; });
        setIsMicMuted(false);
        setupLocalVolumeMonitor(rawStream);
        addLog('🎙️ Microphone live');
      } catch {
        addLog('⚠️ Microphone access denied.');
      }
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setIsMicMuted(!nextState);

      if (!nextState) {
        setIsLocalSpeaking(false);
        setLocalVolume(0);
        socketRef.current?.emit('VOICE_ACTIVITY', { isSpeaking: false, volume: 0 });
      } else {
        setupLocalVolumeMonitor(localStreamRef.current);
      }

      addLog(nextState ? '🎙️ Microphone live' : '🔇 Microphone muted');
    }
  };

  const togglePlay = useCallback(() => {
    if (isProcessing) return;
    if (!hasControlAccessRef.current) {
      addLog('🔒 Control locked by Host.');
      return;
    }

    const nextPlay = !isPlayingRef.current;
    setIsPlaying(nextPlay);

    const isYt = Boolean(videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')));
    const video = videoRef.current;

    if (!isYt && video) {
      if (nextPlay) safePlay();
      else safePause();
    }

    socketRef.current?.emit('SYNC_ACTION', {
      actionType: nextPlay ? 'PLAY' : 'PAUSE',
      timestamp: currentTimeRef.current
    });
  }, [isProcessing, safePlay, safePause, videoUrl]);

  const handleNativePlay = () => {
    if (isInternalAction.current) return;
    if (!hasControlAccessRef.current) {
      isInternalAction.current = true;
      safePause();
      setTimeout(() => { isInternalAction.current = false; }, 200);
      return;
    }
    if (!isPlayingRef.current && socketRef.current && videoRef.current) {
      setIsPlaying(true);
      socketRef.current.emit('SYNC_ACTION', { actionType: 'PLAY', timestamp: videoRef.current.currentTime });
    }
  };

  const handleNativePause = () => {
    if (isInternalAction.current) return;
    if (!hasControlAccessRef.current) {
      isInternalAction.current = true;
      safePlay();
      setTimeout(() => { isInternalAction.current = false; }, 200);
      return;
    }
    if (isPlayingRef.current && socketRef.current && videoRef.current) {
      setIsPlaying(false);
      socketRef.current.emit('SYNC_ACTION', { actionType: 'PAUSE', timestamp: videoRef.current.currentTime });
    }
  };

  const handleNativeSeeked = () => {
    if (isInternalAction.current || isScrubbing.current) return;
    if (socketRef.current && videoRef.current) {
      socketRef.current.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: videoRef.current.currentTime });
    }
  };

  const skipSeconds = useCallback((seconds) => {
    if (isProcessing) return;
    if (!hasControlAccessRef.current) {
      addLog('🔒 Control locked by Host.');
      return;
    }
    const nextTime = Math.min(Math.max(currentTimeRef.current + seconds, 0), durationRef.current || 0);
    setCurrentTime(nextTime);

    if (videoRef.current && !videoUrl?.includes('youtu')) {
      videoRef.current.currentTime = nextTime;
    }
    socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: nextTime });
  }, [isProcessing, videoUrl]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    const nextMute = !isMuted;
    if (video) video.muted = nextMute;
    setIsMuted(nextMute);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (e) {
      console.warn('PiP failed:', e);
    }
  }, []);

  const createBookmarkAtCurrentTime = () => {
    const time = currentTimeRef.current;
    if (!socketRef.current) return;
    socketRef.current.emit('CREATE_BOOKMARK', { timestamp: time, label: `Scene @ ${Math.floor(time)}s` });
    addLog(`🔖 Bookmark saved at ${Math.floor(time)}s`);
  };

  const jumpToBookmark = (time) => {
    const isYt = Boolean(videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')));
    const video = videoRef.current;
    if (!isYt && video) {
      video.currentTime = time;
    }
    setCurrentTime(time);
    if (hasControlAccess) {
      socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: time });
    }
  };

  const deleteBookmark = (id) => {
    if (!hasControlAccess || !socketRef.current) return;
    socketRef.current.emit('DELETE_BOOKMARK', { bookmarkId: id });
  };

  const playQueueIndex = (index) => {
    if (!hasControlAccess || !socketRef.current) return;
    socketRef.current.emit('PLAY_QUEUE_INDEX', { index });
  };

  const removeFromQueue = (index) => {
    if (!hasControlAccess || !socketRef.current) return;
    socketRef.current.emit('REMOVE_FROM_QUEUE', { index });
  };

  const playNextVideo = () => {
    if (!hasControlAccess || !socketRef.current) return;
    if (currentQueueIndex < queue.length - 1) playQueueIndex(currentQueueIndex + 1);
  };

  const handleVideoEnded = () => {
    if (isHost && socketRef.current) socketRef.current.emit('AUTO_PLAY_NEXT');
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setUserVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) videoRef.current.volume = val;
  };

  const handleSeekChange = (e) => {
    if (!hasControlAccessRef.current) return;
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current && !videoUrl?.includes('youtu')) {
      videoRef.current.currentTime = target;
    }
  };

  const handleSeekStart = () => {
    if (hasControlAccessRef.current) isScrubbing.current = true;
  };

  const handleSeekEnd = () => {
    if (!hasControlAccessRef.current) return;
    isScrubbing.current = false;
    socketRef.current?.emit('SYNC_ACTION', { actionType: 'SEEK', timestamp: currentTimeRef.current });
    handleUserActivity();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (!joined || isProcessing) return;

      const key = e.key.toLowerCase();
      if ([' ', 'f', 'm', 'p', 'n', 'b', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        e.preventDefault();
      }

      switch (key) {
        case ' ': togglePlay(); break;
        case 'f': toggleFullscreen(); break;
        case 'p': togglePiP(); break;
        case 'n': playNextVideo(); break;
        case 'b': createBookmarkAtCurrentTime(); break;
        case 'm': toggleMute(); break;
        case 'arrowleft': skipSeconds(-10); break;
        case 'arrowright': skipSeconds(10); break;
        case 'arrowup': handleVolumeChange({ target: { value: Math.min(userVolumeRef.current + 0.05, 1) } }); break;
        case 'arrowdown': handleVolumeChange({ target: { value: Math.max(userVolumeRef.current - 0.05, 0) } }); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [joined, isProcessing, togglePlay, toggleFullscreen, togglePiP, toggleMute, skipSeconds]);

  const admitKnock = (targetSocketId, targetUsername) => socketRef.current?.emit('ADMIT_USER', { targetSocketId, targetUsername });
  const declineKnock = (targetSocketId, targetUsername) => socketRef.current?.emit('DECLINE_USER', { targetSocketId, targetUsername });
  const toggleUserControl = (targetSocketId) => socketRef.current?.emit('TOGGLE_USER_CONTROL', { targetSocketId });
  const muteUserMic = (targetSocketId) => {
    socketRef.current?.emit('MUTE_USER_MIC', { targetSocketId });
    setActiveDropdownSocketId(null);
  };
  const confirmKick = () => {
    if (pendingKickUser) socketRef.current?.emit('KICK_USER', { targetSocketId: pendingKickUser.socketId });
    setPendingKickUser(null);
    setActiveDropdownSocketId(null);
  };
  const confirmHostTransfer = () => {
    if (pendingHostTransferUser) socketRef.current?.emit('TRANSFER_HOST', { targetSocketId: pendingHostTransferUser.socketId });
    setPendingHostTransferUser(null);
    setActiveDropdownSocketId(null);
  };

  const sendReaction = (emoji) => socketRef.current?.emit('SEND_REACTION', { emoji });

  const handleSendMessage = (text) => {
    if (!text?.trim() || !socketRef.current) return;
    socketRef.current.emit('SEND_CHAT_MESSAGE', { text: text.trim() });
  };

  const handleChatDrawerFormSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    handleSendMessage(chatInput);
    setChatInput('');
  };

  const togglePeerAudio = (peerId) => {
    const audioEl = peerAudioElementsRef.current.get(peerId);
    setMutedPeers((prev) => {
      const next = new Set(prev);
      if (next.has(peerId)) {
        next.delete(peerId);
        if (audioEl) audioEl.muted = false;
      } else {
        next.add(peerId);
        if (audioEl) audioEl.muted = true;
      }
      return next;
    });
  };

  const handlePlayResolvedSource = (resolved, addToQueueOnly = false) => {
    if (!resolved?.url || !socketRef.current) return;
    if (!hasControlAccessRef.current) {
      addLog('🔒 Stream controls locked by Host.');
      return;
    }

    if (addToQueueOnly) {
      socketRef.current.emit('ADD_TO_QUEUE', {
        item: {
          title: resolved.title,
          url: resolved.url
        }
      });
      addLog(`➕ Added to Playlist: "${resolved.title}"`);
    } else {
      socketRef.current.emit('CHANGE_VIDEO_URL', {
        newUrl: resolved.url,
        mediaMeta: { title: resolved.title }
      });
      addLog(`🎬 Playing: "${resolved.title}"`);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/room/${roomId}`);
    addLog('📋 Room link copied to clipboard!');
  };

  // Pre-join prompt
  if (!hasPromptedName && !isHost && !isCreatorTokenPresent && !kickedByHostName && !lobbyDeclined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1e1b4b 0%, #030712 70%)',
        padding: 16
      }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          padding: 'clamp(20px, 5vw, 32px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ background: '#38bdf8', padding: 8, borderRadius: 14, display: 'flex' }}>
              <Film size={22} color="#030712" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Join Room</h2>
          </div>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>
            You've been invited to room <strong style={{ color: '#fff' }}>{roomId}</strong>
          </p>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!guestInputName.trim()) return;
            sessionStorage.setItem(`cinema_username_${roomId}`, guestInputName.trim());
            setCurrentUsername(guestInputName.trim());
            setHasPromptedName(true);
          }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#d1d5db', marginBottom: 6 }}>
                Your Display Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={guestInputName}
                onChange={(e) => setGuestInputName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none'
                }}
                required
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
                gap: 8
              }}
            >
              <LogIn size={16} /> Ask to Join
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Connecting / Status Screens
  if (!joined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1e1b4b 0%, #030712 70%)',
        padding: 16
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          padding: 'clamp(20px, 5vw, 32px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          textAlign: 'center'
        }}>
          {roomNotFoundError ? (
            <div>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
                <AlertCircle size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>Room Not Found</h3>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: 13, lineHeight: 1.5 }}>{roomNotFoundError}</p>
              <button onClick={handleSafeReturnHome} style={{ width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: '#ffffff', color: '#000000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Back to Home</button>
            </div>
          ) : kickedByHostName ? (
            <div>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
                <UserX size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>Removed from Room</h3>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>You were removed by <strong style={{ color: '#fff' }}>{kickedByHostName}</strong>.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  socketService.disconnect();
                  setKicked(null);
                  setHasPromptedName(false);
                }} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Ask to Re-join</button>
                <button onClick={handleSafeReturnHome} style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: '#ffffff', color: '#000000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Back to Home</button>
              </div>
            </div>
          ) : lobbyDeclined ? (
            <div>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
                <UserX size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#ef4444' }}>Join Request Declined</h3>
              <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>The host did not admit you to room <strong style={{ color: '#fff' }}>{roomId}</strong>.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  socketService.disconnect();
                  setLobbyDeclined(false);
                  setHasPromptedName(false);
                }} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Try Again</button>
                <button onClick={handleSafeReturnHome} style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: '#ffffff', color: '#000000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Back to Home</button>
              </div>
            </div>
          ) : (isHost || isCreatorTokenPresent) ? (
            <div>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#38bdf8' }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 17, color: '#fff' }}>Entering Cinema Room...</h3>
              <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontSize: 13 }}>Setting up room <strong style={{ color: '#fff' }}>{roomId}</strong></p>
            </div>
          ) : (
            <div>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#38bdf8' }}>
                <Clock size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 17, color: '#fff' }}>Waiting for Host to Admit</h3>
              <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontSize: 13, lineHeight: 1.4 }}>Asking host to enter room <strong style={{ color: '#fff' }}>{roomId}</strong>...</p>
              <div style={{ width: 140, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: '#38bdf8', borderRadius: 9999 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentMediaTitle = queue[currentQueueIndex]?.title || 'Cinematic Stream';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #111827 0%, #030712 80%)',
      padding: 'clamp(10px, 3vw, 24px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        {isHost && pendingKnocks.length > 0 && (
          <KnockToast
            knocks={pendingKnocks}
            onAdmit={(sockId, uname) => admitKnock(sockId, uname)}
            onDecline={(sockId, uname) => declineKnock(sockId, uname)}
          />
        )}

        <Header
          roomId={roomId}
          username={currentUsername}
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
          togglePeerAudio={togglePeerAudio}
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
          onLeaveClick={() => setShowLeaveConfirmation(true)}
          onShareClick={copyShareLink}
          activeDropdownSocketId={activeDropdownSocketId}
          setActiveDropdownSocketId={setActiveDropdownSocketId}
          setPendingHostTransferUser={setPendingHostTransferUser}
          setPendingKickUser={setPendingKickUser}
        />

        <div className="room-viewport-container">
          <div className="room-player-wrapper">
            <VideoPlayer
              videoRef={videoRef}
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
              currentMediaTitle={currentMediaTitle}
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
              currentSubLabel={selectedSubtitleId === 'off' ? 'Off' : (availableSubtitles.find(s => s.id === selectedSubtitleId)?.label || 'On')}
              handleAudioTrackChange={(idx) => {
                setSelectedAudioTrackIndex(idx);
                setSettingsView(null);
              }}
              handleSubtitleChange={(sub) => {
                const video = videoRef.current;
                if (!video) return;
                video.querySelectorAll('track').forEach(t => t.remove());

                if (sub === 'off') {
                  setSelectedSubtitleId('off');
                } else {
                  setSelectedSubtitleId(sub.id);
                  const trackEl = document.createElement('track');
                  trackEl.kind = 'subtitles';
                  trackEl.label = sub.label;
                  trackEl.srclang = 'en';
                  trackEl.src = sub.url;
                  trackEl.default = true;
                  video.appendChild(trackEl);
                }
                setSettingsView(null);
              }}
              handleCustomSubtitleFile={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                const customSub = { id: `custom-${Date.now()}`, label: file.name, url };
                setAvailableSubtitles(prev => [...prev, customSub]);
                setSelectedSubtitleId(customSub.id);
                const video = videoRef.current;
                if (video) {
                  video.querySelectorAll('track').forEach(t => t.remove());
                  const trackEl = document.createElement('track');
                  trackEl.kind = 'subtitles';
                  trackEl.label = file.name;
                  trackEl.srclang = 'en';
                  trackEl.src = url;
                  trackEl.default = true;
                  video.appendChild(trackEl);
                }
                setSettingsView(null);
                addLog(`Loaded Subtitle: "${file.name}"`);
              }}
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
              peerVolumes={peerVolumes}
              isLocalSpeaking={isLocalSpeaking}
              localVolume={localVolume}
              roomParticipants={roomParticipants}
              currentUsername={currentUsername}
              currentSocketId={currentSocketId}
              messages={messages}
              unreadCount={unreadCount}
              onResetUnread={() => setUnreadCount(0)}
              onSendMessage={handleSendMessage}
              onSendReaction={sendReaction}
            />
          </div>

          {activeSideDrawer && (
            <div ref={drawerContainerRef} className="room-drawer-container">
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {activeSideDrawer === 'chat' && <MessageSquare size={15} color="#38bdf8" />}
                  {activeSideDrawer === 'playlist' && <ListVideo size={15} color="#38bdf8" />}
                  {activeSideDrawer === 'bookmarks' && <BookmarkCheck size={15} color="#38bdf8" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6' }}>
                    {activeSideDrawer === 'chat' && 'Room Chat'}
                    {activeSideDrawer === 'playlist' && `Playlist (${queue.length})`}
                    {activeSideDrawer === 'bookmarks' && `Bookmarks (${bookmarks.length})`}
                  </span>
                </div>
                <button onClick={handleCloseDrawer} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {activeSideDrawer === 'chat' && (
                  <ChatDrawer
                    messages={messages}
                    currentSocketId={currentSocketId}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    handleSendMessage={handleChatDrawerFormSubmit}
                  />
                )}

                {activeSideDrawer === 'playlist' && (
                  <PlaylistDrawer
                    queue={queue}
                    currentQueueIndex={currentQueueIndex}
                    hasControlAccess={hasControlAccess}
                    playQueueIndex={playQueueIndex}
                    removeFromQueue={removeFromQueue}
                    handleFileSelect={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const blobUrl = URL.createObjectURL(file);
                        handlePlayResolvedSource({ type: 'local', url: blobUrl, title: file.name }, true);
                      }
                    }}
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
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: '6px 14px',
          flexWrap: 'wrap',
          gap: 6
        }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Reactions:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  padding: '5px 10px',
                  fontSize: 'clamp(14px, 3vw, 17px)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.85)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <MediaUploadDeck
          hasControlAccess={hasControlAccess}
          isProcessing={isProcessing}
          inputUrl={inputUrl}
          setInputUrl={setInputUrl}
          onPlayResolvedSource={handlePlayResolvedSource}
        />

        <EventLog logs={logs} />
      </div>

      <LeaveModal
        show={showLeaveConfirmation}
        roomId={roomId}
        onCancel={() => setShowLeaveConfirmation(false)}
        onConfirm={handleSafeReturnHome}
      />

      <TransferHostModal
        targetUser={pendingHostTransferUser}
        onCancel={() => setPendingHostTransferUser(null)}
        onConfirm={confirmHostTransfer}
      />

      <KickModal
        targetUser={pendingKickUser}
        onCancel={() => setPendingKickUser(null)}
        onConfirm={confirmKick}
      />
    </div>
  );
}