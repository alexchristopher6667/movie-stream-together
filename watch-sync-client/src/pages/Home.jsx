import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus, LogIn, AlertCircle } from 'lucide-react';
import { SOCKET_SERVER_URL } from '../utils/helpers';

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cinema_username');
    if (saved) {
      setUsername(saved);
    } else {
      const defaultName = 'User-' + Math.floor(100 + Math.random() * 900);
      setUsername(defaultName);
      localStorage.setItem('cinema_username', defaultName);
    }
  }, []);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    const cleanName = username.trim();
    localStorage.setItem('cinema_username', cleanName);
    const newRoom = generateRoomId();

    // Lock unique Host Token into session storage for this specific room
    const hostToken = `host_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(`cinema_host_token_${newRoom}`, hostToken);
    sessionStorage.setItem(`cinema_username_${newRoom}`, cleanName);

    navigate(`/room/${newRoom}`);
  };

  const handleJoinExistingRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanRoom = joinRoomId.trim().toLowerCase();
    if (!username.trim()) return;
    if (!cleanRoom) {
      setErrorMsg('Please enter a room ID.');
      return;
    }

    localStorage.setItem('cinema_username', username.trim());
    setIsChecking(true);

    try {
      const res = await fetch(`${SOCKET_SERVER_URL}/api/room-check/${cleanRoom}`);
      const data = await res.json();
      if (data.exists) {
        navigate(`/room/${cleanRoom}`);
      } else {
        setErrorMsg(`Room "${cleanRoom}" was not found or has expired. Please check the code.`);
      }
    } catch {
      navigate(`/room/${cleanRoom}`);
    } finally {
      setIsChecking(false);
    }
  };

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
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        padding: 'clamp(20px, 5vw, 32px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ background: '#38bdf8', padding: 8, borderRadius: 14, display: 'flex' }}>
            <Film size={22} color="#030712" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>StreamTogether</h2>
        </div>
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>
          Synchronized Cinema Rooms with Voice & Chat
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 12,
            padding: '10px 14px',
            color: '#ef4444',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#d1d5db', marginBottom: 6 }}>
              Your Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            type="button"
            onClick={handleCreateRoom}
            style={{
              padding: '12px',
              borderRadius: 14,
              border: 'none',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Plus size={16} /> Create New Cinema Room
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>OR JOIN EXISTING</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          <form onSubmit={handleJoinExistingRoom} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Enter Room Code"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: 14,
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isChecking}
              style={{
                padding: '10px 16px',
                borderRadius: 14,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 600,
                fontSize: 13,
                cursor: isChecking ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <LogIn size={15} /> {isChecking ? 'Checking...' : 'Join'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}