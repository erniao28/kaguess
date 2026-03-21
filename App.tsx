
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, ForbiddenWord, SyncMessage, PunishmentBanks } from './types';
import { FORBIDDEN_WORDS, TRUTH_PUNISHMENTS, DARE_PUNISHMENTS } from './constants';
import SetupRoom from './components/SetupRoom';
import SetupScreen from './components/SetupScreen';
import ForbiddenWordCard from './components/ForbiddenWordCard';
import ScoreBoard from './components/ScoreBoard';
import PunishmentModal from './components/PunishmentModal';
import TransitionOverlay from './components/TransitionOverlay';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.ROOM);
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: '', score: 0, type: 'FOX', isReady: false },
    { id: 2, name: '', score: 0, type: 'BUNNY', isReady: false },
  ]);
  const [sessionWord, setSessionWord] = useState<ForbiddenWord>(FORBIDDEN_WORDS[0]);
  const [punishmentBanks, setPunishmentBanks] = useState<PunishmentBanks>({
    truths: TRUTH_PUNISHMENTS,
    dares: DARE_PUNISHMENTS
  });
  const [showPunishment, setShowPunishment] = useState(false);
  const [effects, setEffects] = useState<{id: number, type: 'TICKET' | 'ICE'}[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerRole, setPlayerRole] = useState<'FOX' | 'BUNNY' | null>(null);
  const playerRoleRef = useRef<'FOX' | 'BUNNY' | null>(null);
  const punishmentBanksRef = useRef<PunishmentBanks>(punishmentBanks);

  useEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);

  useEffect(() => {
    punishmentBanksRef.current = punishmentBanks;
  }, [punishmentBanks]);

  const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

  // 初始化 socket 和所有事件监听器
  useEffect(() => {
    console.log('[SOCKET] 初始化连接');
    const newSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SOCKET] 已连接:', newSocket.id);
    });

    // 房间事件
    newSocket.on('room_created', (id: string) => {
      console.log('[ROOM] 创建成功:', id);
      setRoomId(id);
      setGameState(GameState.SETUP);
      setPlayerRole('FOX');
      const foxPlayer = { id: 1, name: '尼克', score: 0, type: 'FOX' as const, isReady: true };
      setPlayers(prev => prev.map(p => p.type === 'FOX' ? foxPlayer : p));
      newSocket.emit('select_role', { roomId: id, role: 'fox', player: foxPlayer });
    });

    newSocket.on('room_joined', (id: string) => {
      console.log('[ROOM] 加入成功:', id);
      setRoomId(id);
      setGameState(GameState.SETUP);
    });

    newSocket.on('room_error', (error: string) => {
      alert(error);
    });

    // 房间同步事件 - 这是双人模式的关键
    newSocket.on('sync_room', ({ fox, bunny, foxReady, bunnyReady }) => {
      console.log('[SYNC_ROOM] 收到数据:', { fox, bunny, foxReady, bunnyReady });

      const currentSocketId = newSocket.id;
      const isFox = fox?.socketId === currentSocketId;
      const isBunny = bunny?.socketId === currentSocketId;

      // 设置玩家角色
      if (isFox && isBunny) {
        setPlayerRole('FOX'); // 单机模式
      } else if (isFox && playerRoleRef.current !== 'FOX') {
        setPlayerRole('FOX');
      } else if (isBunny && playerRoleRef.current !== 'BUNNY') {
        setPlayerRole('BUNNY');
      } else if (fox && !bunny && fox.socketId !== currentSocketId) {
        setPlayerRole('BUNNY'); // 狐狸被占了，我只能是兔子
      } else if (bunny && !fox && bunny.socketId !== currentSocketId) {
        setPlayerRole('FOX'); // 兔子被占了，我只能是狐狸
      }

      // 同步玩家数据 - 关键：只要有数据就同步
      setPlayers(prev => prev.map(p => {
        if (p.type === 'FOX' && fox) {
          return { ...p, ...fox, type: 'FOX' as const, isReady: foxReady ?? p.isReady };
        }
        if (p.type === 'BUNNY' && bunny) {
          return { ...p, ...bunny, type: 'BUNNY' as const, isReady: bunnyReady ?? p.isReady };
        }
        return p;
      }));
    });

    newSocket.on('sync_ready', ({ foxReady, bunnyReady }) => {
      setPlayers(prev => prev.map(p => {
        if (p.type === 'FOX') return { ...p, isReady: foxReady };
        if (p.type === 'BUNNY') return { ...p, isReady: bunnyReady };
        return p;
      }));
    });

    newSocket.on('player_joined', ({ socketId }) => {
      console.log('新玩家加入:', socketId);
    });

    newSocket.on('player_left', ({ role }) => {
      alert(`${role === 'fox' ? '狐狸' : '兔子'} 已断开连接`);
      setPlayers(prev => prev.map(p =>
        p.type === role.toUpperCase() ? { ...p, name: '', isReady: false } : p
      ));
    });

    newSocket.on('role_error', (error: string) => {
      alert(error);
    });

    newSocket.on('both_ready', () => {
      console.log('双方已准备');
      if (playerRoleRef.current === 'FOX') {
        const randomWord = FORBIDDEN_WORDS[Math.floor(Math.random() * FORBIDDEN_WORDS.length)];
        newSocket.emit('start_game', { roomId, word: randomWord, punishments: punishmentBanksRef.current });
      }
    });

    newSocket.on('start_game', ({ word, punishments }) => {
      setSessionWord(word);
      setPunishmentBanks(punishments);
      setGameState(GameState.TRANSITION);
    });

    newSocket.on('game_message', (msg: SyncMessage) => {
      switch (msg.type) {
        case 'UPDATE_PLAYER':
          setPlayers(prev => prev.map(p => p.type === msg.player.type ? { ...p, ...msg.player } : p));
          break;
        case 'ADD_SCORE':
          setPlayers(prev => prev.map(p => p.id === msg.playerId ? { ...p, score: Math.max(0, p.score + msg.delta) } : p));
          break;
        case 'ATTACK_EFFECT':
          triggerLocalEffect(msg.from);
          break;
        case 'SETTLE_GAME':
          setShowPunishment(true);
          break;
        case 'RESET_GAME':
          setGameState(GameState.SETUP);
          setPlayers(prev => prev.map(item => ({...item, score: 0, isReady: false, name: ''})));
          setShowPunishment(false);
          break;
        case 'SYNC_BANKS':
          setPunishmentBanks(msg.punishments);
          break;
      }
    });

    newSocket.on('settle_game', () => setShowPunishment(true));

    newSocket.on('reset_game', () => {
      setGameState(GameState.SETUP);
      setPlayers(prev => prev.map(item => ({...item, score: 0, isReady: false, name: ''})));
      setShowPunishment(false);
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('room_created');
      newSocket.off('room_joined');
      newSocket.off('room_error');
      newSocket.off('sync_room');
      newSocket.off('sync_ready');
      newSocket.off('player_joined');
      newSocket.off('player_left');
      newSocket.off('role_error');
      newSocket.off('both_ready');
      newSocket.off('start_game');
      newSocket.off('game_message');
      newSocket.off('settle_game');
      newSocket.off('reset_game');
    };
  }, []);

  const triggerLocalEffect = (from: 'FOX' | 'BUNNY') => {
    const newEffect = { id: Date.now(), type: from === 'FOX' ? 'ICE' as const : 'TICKET' as const };
    setEffects(prev => [...prev, newEffect]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== newEffect.id)), 2000);
  };

  const handleCreateRoom = () => {
    const roomId = 'R' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    socket?.emit('create_room', roomId);
  };

  const handleJoinRoom = (id: string) => {
    if (!id) return;
    socket?.emit('join_room', id);
  };

  const handleStartGame = () => {
    const randomWord = FORBIDDEN_WORDS[Math.floor(Math.random() * FORBIDDEN_WORDS.length)];
    socket?.emit('start_game', { roomId, word: randomWord, punishments: punishmentBanks });
    setSessionWord(randomWord);
    setGameState(GameState.TRANSITION);
  };

  const handlePlayerReady = (player: Player, extraWords: ForbiddenWord[], customPunishments: PunishmentBanks) => {
    const newPlayers = players.map(p => p.type === player.type ? player : p);
    setPlayers(newPlayers);

    const mergedPunishments = {
      truths: Array.from(new Set([...TRUTH_PUNISHMENTS, ...customPunishments.truths])),
      dares: Array.from(new Set([...DARE_PUNISHMENTS, ...customPunishments.dares]))
    };
    setPunishmentBanks(mergedPunishments);

    const role = player.type === 'FOX' ? 'fox' : 'bunny';
    socket?.emit('select_role', { roomId, role, player });
    socket?.emit('player_ready', { roomId, role });
    socket?.emit('game_message', { roomId, message: { type: 'UPDATE_PLAYER', player } });
    socket?.emit('game_message', { roomId, message: { type: 'SYNC_BANKS', extraWords, punishments: mergedPunishments } });
  };

  const handleUpdateScore = (id: number, delta: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p));
    socket?.emit('game_message', { type: 'ADD_SCORE', playerId: id, delta });
    if (delta > 0) {
      const player = players.find(p => p.id === id);
      if (player) {
        socket?.emit('game_message', { type: 'ATTACK_EFFECT', from: player.type });
        triggerLocalEffect(player.type);
      }
    }
  };

  const handleSettle = () => {
    setShowPunishment(true);
    socket?.emit('settle_game', { roomId });
  };

  const loser = players[0].score > players[1].score ? players[0] : players[1].score > players[0].score ? players[1] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-indigo-100 overflow-hidden relative bg-[#f8fafc]">
      {effects.map(effect => (
        <div
          key={effect.id}
          className={`fixed z-[100] text-8xl pointer-events-none drop-shadow-2xl
            ${effect.type === 'TICKET' ? 'top-1/4 left-0 animate-[fly-right_2s_ease-in-out_forwards]' : 'bottom-1/4 right-0 animate-[fly-left_2s_ease-in-out_forwards]'}`}
        >
          {effect.type === 'TICKET' ? '📄' : '🍡'}
        </div>
      ))}

      <style>{`
        @keyframes fly-right {
          0% { transform: translateX(-200px) rotate(0deg) scale(0.5); opacity: 0; }
          20% { opacity: 1; scale: 1.3; }
          100% { transform: translateX(120vw) rotate(720deg) scale(0.8); opacity: 0; }
        }
        @keyframes fly-left {
          0% { transform: translateX(200px) rotate(0deg) scale(0.5); opacity: 0; }
          20% { opacity: 1; scale: 1.3; }
          100% { transform: translateX(-120vw) rotate(-720deg) scale(0.8); opacity: 0; }
        }
      `}</style>

      <div className="w-full max-w-6xl flex justify-between items-center mb-10 z-10 animate-in fade-in duration-700">
        <div className="flex items-center gap-4 group cursor-default">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[28px] flex items-center justify-center text-white font-black text-4xl shadow-xl border-4 border-white rotate-[-6deg] group-hover:rotate-0 transition-all duration-500">
            禁
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none mb-1">言灵特工队</h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                {roomId ? `作战频道：${roomId}` : 'ZPD STATION'}
              </span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
            </div>
          </div>
        </div>

        {gameState === GameState.PLAYING && (
          <button
            onClick={handleSettle}
            className="group relative px-10 py-5 rounded-[35px] bg-white text-rose-500 font-black hover:bg-rose-500 hover:text-white transition-all shadow-[0_10px_0_0_#fda4af] active:shadow-none active:translate-y-[10px] border-4 border-rose-50"
          >
            <span className="flex items-center gap-2 text-xl">🏁 申请结案</span>
          </button>
        )}
      </div>

      {gameState === GameState.ROOM && <SetupRoom onCreate={handleCreateRoom} onJoin={handleJoinRoom} />}

      {gameState === GameState.SETUP && (
        <SetupScreen
          players={players}
          onPlayerReady={handlePlayerReady}
          onStartGame={handleStartGame}
          canStart={players.every(p => p.isReady)}
          playerRole={playerRole}
        />
      )}

      {gameState === GameState.TRANSITION && (
        <TransitionOverlay
          word={sessionWord.char}
          onComplete={() => setGameState(GameState.PLAYING)}
        />
      )}

      {gameState === GameState.PLAYING && (
        <div className="w-full max-w-6xl space-y-12 z-10 animate-in zoom-in-95 duration-500">
          <div className="bg-white rounded-[50px] p-3 shadow-2xl border-4 border-slate-50 flex items-center relative h-28 overflow-hidden">
            <div
              className="h-full rounded-[40px] transition-all duration-1000 bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-start px-8 shadow-inner"
              style={{ width: `${50 + (players[1].score - players[0].score) * 5}%`, minWidth: '15%', maxWidth: '85%' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl drop-shadow-md">🦊</span>
                <span className="text-white font-black whitespace-nowrap hidden md:block text-xl">尼克</span>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900 text-white px-10 py-3 rounded-full font-black shadow-2xl text-4xl border-4 border-white rotate-[-3deg]">VS</div>
            </div>
            <div className="ml-auto px-10 flex items-center gap-3">
               <span className="text-blue-600 font-black whitespace-nowrap hidden md:block text-xl text-right">朱迪</span>
               <span className="text-4xl drop-shadow-md">🐰</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3 lg:sticky lg:top-8 order-2 lg:order-1">
              <ScoreBoard player={players[0]} onUpdateScore={handleUpdateScore} />
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2">
              <ForbiddenWordCard word={sessionWord} />
            </div>
            <div className="lg:col-span-3 lg:sticky lg:top-8 order-3">
              <ScoreBoard player={players[1]} onUpdateScore={handleUpdateScore} />
            </div>
          </div>
        </div>
      )}

      {showPunishment && (
        <PunishmentModal
          loser={loser}
          punishmentBanks={punishmentBanks}
          onClose={() => {
            socket?.emit('reset_game', { roomId });
            setGameState(GameState.SETUP);
            setPlayers(p => p.map(item => ({...item, score: 0, isReady: false, name: ''})));
            setShowPunishment(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
