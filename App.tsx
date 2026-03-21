
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

  // 更新 ref 以保持最新值
  useEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);

  useEffect(() => {
    punishmentBanksRef.current = punishmentBanks;
  }, [punishmentBanks]);

  // 连接 Socket.io 服务器
  // 开发环境使用 localhost，生产环境使用当前域名（通过 Nginx 代理）
  const SERVER_URL = import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3001';

  useEffect(() => {
    if (!roomId) return;

    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('已连接服务器:', newSocket.id);
    });

    newSocket.on('room_created', (id: string) => {
      console.log('[ROOM_CREATED] 房间创建成功:', id);
      setPlayerRole('FOX');
      // 自动占用狐狸角色，设置默认名字
      const foxPlayer = { id: 1, name: '尼克', score: 0, type: 'FOX' as const, isReady: true };
      setPlayers(prev => prev.map(p =>
        p.type === 'FOX' ? foxPlayer : p
      ));
      console.log('[ROOM_CREATED] 发送 select_role:', { roomId: id, role: 'fox', player: foxPlayer });
      // 通知服务器占用狐狸角色
      newSocket.emit('select_role', { roomId: id, role: 'fox', player: foxPlayer });
    });

    newSocket.on('room_joined', (id: string) => {
      console.log('加入房间成功:', id);
      // 角色将由 sync_room 事件根据服务器返回的数据设置
      // 这里只需要重置 players 状态，等待 sync_room 同步
      setPlayers(prev => prev.map(p =>
        p.type === 'BUNNY' ? { ...p, isReady: false } : p
      ));
    });

    newSocket.on('room_error', (error: string) => {
      alert(error);
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

    newSocket.on('sync_room', ({ fox, bunny, foxReady, bunnyReady }) => {
      console.log('[SYNC_ROOM] 收到房间同步:', {
        fox: JSON.stringify(fox),
        bunny: JSON.stringify(bunny),
        foxReady,
        bunnyReady
      });

      // 判断当前玩家的角色：如果 fox 的 socketId 是当前 socket，则当前玩家是 FOX；否则是 BUNNY
      const currentSocketId = newSocket.id;
      const isFox = fox?.socketId === currentSocketId;
      const isBunny = bunny?.socketId === currentSocketId;

      // 单机模式：两个角色都是当前玩家的
      if (isFox && isBunny) {
        console.log('单机模式：两个角色都是当前玩家的');
        setPlayerRole('FOX');  // 保持 FOX 即可
      } else if (isFox && playerRoleRef.current !== 'FOX') {
        console.log('同步角色：当前玩家是 FOX');
        setPlayerRole('FOX');
      } else if (isBunny && playerRoleRef.current !== 'BUNNY') {
        console.log('同步角色：当前玩家是 BUNNY');
        setPlayerRole('BUNNY');
      } else if (!fox && !bunny) {
        // 边缘情况：如果两个角色都没有被选择，且当前玩家还没有角色
        // 这通常不会发生，但为了完整性，保持 playerRole 不变
        console.log('房间中没有已选择的角色');
      } else if (fox && !bunny && fox.socketId !== currentSocketId) {
        // 狐狸已选择但不是当前玩家，当前玩家应该是兔子
        if (playerRoleRef.current !== 'BUNNY') {
          console.log('同步角色：当前玩家是 BUNNY（狐狸已被占用）');
          setPlayerRole('BUNNY');
        }
      } else if (bunny && !fox && bunny.socketId !== currentSocketId) {
        // 兔子已选择但不是当前玩家，当前玩家应该是狐狸
        if (playerRoleRef.current !== 'FOX') {
          console.log('同步角色：当前玩家是 FOX（兔子已被占用）');
          setPlayerRole('FOX');
        }
      }

      // 关键修复：只要有服务器数据，就同步到本地状态
      setPlayers(prev => {
        const updated = prev.map(p => {
          // 狐狸角色：如果服务器有 fox 数据，同步过来（包括 name, socketId 等）
          if (p.type === 'FOX' && fox) {
            const synced = {
              ...p,
              ...fox,
              type: 'FOX' as const,
              isReady: foxReady !== undefined ? foxReady : p.isReady
            };
            console.log('[SYNC_ROOM] 同步 FOX 数据:', synced);
            return synced;
          }
          // 兔子角色：如果服务器有 bunny 数据，同步过来
          if (p.type === 'BUNNY' && bunny) {
            const synced = {
              ...p,
              ...bunny,
              type: 'BUNNY' as const,
              isReady: bunnyReady !== undefined ? bunnyReady : p.isReady
            };
            console.log('[SYNC_ROOM] 同步 BUNNY 数据:', synced);
            return synced;
          }
          return p;
        });
        console.log('[SYNC_ROOM] Players 更新后:', updated);
        return updated;
      });
    });

    newSocket.on('sync_ready', ({ foxReady, bunnyReady }) => {
      setPlayers(prev => prev.map(p => {
        if (p.type === 'FOX') return { ...p, isReady: foxReady };
        if (p.type === 'BUNNY') return { ...p, isReady: bunnyReady };
        return p;
      }));
    });

    newSocket.on('both_ready', () => {
      console.log('双方都已准备，可以开始游戏');
      // 狐狸方自动开始游戏
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
      // 处理来自服务器的游戏消息
      switch (msg.type) {
        case 'UPDATE_PLAYER':
          // 同步对方玩家的数据
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

    newSocket.on('settle_game', () => {
      setShowPunishment(true);
    });

    newSocket.on('reset_game', () => {
      setGameState(GameState.SETUP);
      setPlayers(prev => prev.map(item => ({...item, score: 0, isReady: false, name: ''})));
      setShowPunishment(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [roomId]);

  // 监听玩家是否全部准备就绪（服务器会发送 both_ready 事件）

  const triggerLocalEffect = (from: 'FOX' | 'BUNNY') => {
    const newEffect = { id: Date.now(), type: from === 'FOX' ? 'ICE' as const : 'TICKET' as const };
    setEffects(prev => [...prev, newEffect]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== newEffect.id)), 2000);
  };

  const handleJoinRoom = (id: string) => {
    setRoomId(id);
    setGameState(GameState.SETUP);
    setTimeout(() => {
      socket?.emit('join_room', id);
    }, 500);
  };

  const handleCreateRoom = (id: string) => {
    setRoomId(id);
    setGameState(GameState.SETUP);
  };

  const handleStartGame = () => {
    const randomWord = FORBIDDEN_WORDS[Math.floor(Math.random() * FORBIDDEN_WORDS.length)];
    socket?.emit('start_game', { roomId, word: randomWord, punishments: punishmentBanks });
    setSessionWord(randomWord);
    setGameState(GameState.TRANSITION);
  };

  const handlePlayerReady = (player: Player, extraWords: ForbiddenWord[], customPunishments: PunishmentBanks) => {
    console.log('[HANDLE_PLAYER_READY] 玩家准备:', player);
    // 玩家点击”加入”或”领取角色”
    const newPlayers = players.map(p => p.type === player.type ? player : p);
    console.log('[HANDLE_PLAYER_READY] 本地 players 更新为:', newPlayers);
    setPlayers(newPlayers);

    // 合并本地库
    const mergedPunishments = {
      truths: Array.from(new Set([...TRUTH_PUNISHMENTS, ...customPunishments.truths])),
      dares: Array.from(new Set([...DARE_PUNISHMENTS, ...customPunishments.dares]))
    };
    setPunishmentBanks(mergedPunishments);

    // 发送角色选择和准备状态到服务器
    const role = player.type === 'FOX' ? 'fox' : 'bunny';
    console.log('[HANDLE_PLAYER_READY] 发送 select_role:', { roomId, role, player });
    socket?.emit('select_role', { roomId, role, player });
    socket?.emit('player_ready', { roomId, role });

    // 发送同步消息
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

  // 判定输家：分高者输
  const loser = players[0].score > players[1].score ? players[0] : players[1].score > players[0].score ? players[1] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-indigo-100 overflow-hidden relative bg-[#f8fafc]">
      {/* 飞行特效容器 */}
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

      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-10 z-10 animate-in fade-in duration-700">
        <div className="flex items-center gap-4 group cursor-default">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[28px] flex items-center justify-center text-white font-black text-4xl shadow-xl border-4 border-white rotate-[-6deg] group-hover:rotate-0 transition-all duration-500">
            禁
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none mb-1">言灵特工队</h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                {roomId ? `作战频道: ${roomId}` : 'ZPD STATION'}
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
            <span className="flex items-center gap-2 text-xl">
              🏁 申请结案
            </span>
          </button>
        )}
      </div>

      {gameState === GameState.ROOM && <SetupRoom onJoin={handleJoinRoom} onCreate={handleCreateRoom} />}

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
          {/* 实时战况条 */}
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
