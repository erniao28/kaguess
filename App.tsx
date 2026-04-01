
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, ForbiddenWord, SyncMessage, PunishmentBanks, ChatMessage, EMOJI_LIST, PrivateRoom, Background, Effect, LeaderboardEntry } from './types';
import { FORBIDDEN_WORDS, TRUTH_PUNISHMENTS, DARE_PUNISHMENTS } from './constants';
import SetupRoom from './components/SetupRoom';
import SetupScreen from './components/SetupScreen';
import ForbiddenWordCard from './components/ForbiddenWordCard';
import ScoreBoard from './components/ScoreBoard';
import PunishmentModal from './components/PunishmentModal';
import TransitionOverlay from './components/TransitionOverlay';
import ChatBox from './components/ChatBox';
import PrivateRoomModal from './components/PrivateRoomModal';
import RoomSettings from './components/RoomSettings';
import HonorHall from './components/HonorHall';
import EffectShop from './components/EffectShop';
import PlayerProfileModal from './components/PlayerProfileModal';
import ArchiveRoom from './components/ArchiveRoom';
import ArchiveRoomRanking from './components/ArchiveRoomRanking';

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mySocketId, setMySocketId] = useState<string | null>(null);

  // 私密房间相关状态
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [privateRoomPassword, setPrivateRoomPassword] = useState('');
  const [roomBgImage, setRoomBgImage] = useState('');
  const [showPrivateRoomModal, setShowPrivateRoomModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [myCarrotCount, setMyCarrotCount] = useState(0);
  const [showCarrotAward, setShowCarrotAward] = useState(false);
  const [carrotAwardData, setCarrotAwardData] = useState<CarrotAward | null>(null);

  // 荣誉室和特效商店相关状态
  const [showHonorHall, setShowHonorHall] = useState(false);
  const [showEffectShop, setShowEffectShop] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [unlockedEffects, setUnlockedEffects] = useState<string[]>([]);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);

  // 测试房间定时动画状态
  const [timedEffects, setTimedEffects] = useState<{id: number, type: string, emoji: string}[]>([]);

  // 生日动画状态
  const [showBirthdayEffect, setShowBirthdayEffect] = useState(false);
  const [birthdayAnimationStarted, setBirthdayAnimationStarted] = useState(false);
  const [showBackgroundElements, setShowBackgroundElements] = useState(false);

  // 玩家档案系统相关状态
  const [playerProfile, setPlayerProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showArchiveRoom, setShowArchiveRoom] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [showArchiveRanking, setShowArchiveRanking] = useState(false);
  const [archiveRankings, setArchiveRankings] = useState<any[]>([]);

  // 聊天框设置
  const [chatFontSize, setChatFontSize] = useState(14);
  const [chatBgImage, setChatBgImage] = useState('');

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
      setMySocketId(newSocket.id);
    });

    // 房间事件
    newSocket.on('room_created', (id: string) => {
      console.log('[ROOM] 创建成功:', id);
      setRoomId(id);
      setGameState(GameState.SETUP);
      // 创建房间时不自动选择角色，等待用户在 SetupScreen 中手动选择
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
        // 测试房间 000，朱迪进入时显示生日祝福
        if (roomId === '000') {
          console.log('[BIRTHDAY] 朱迪进入测试房间，触发欢迎！');
          setShowBirthdayEffect(true);
        }
      } else if (fox && !bunny && fox.socketId !== currentSocketId) {
        setPlayerRole('BUNNY'); // 狐狸被占了，我只能是兔子
        if (roomId === '000') {
          console.log('[BIRTHDAY] 朱迪进入测试房间，触发欢迎！');
          setShowBirthdayEffect(true);
        }
      } else if (bunny && !fox && bunny.socketId !== currentSocketId) {
        setPlayerRole('FOX'); // 兔子被占了，我只能是狐狸
      } else if (!fox && !bunny && playerRoleRef.current === null) {
        // 两个角色都没被选择，当前用户也没有角色，可以自由选择（默认显示两个选项）
        // 不设置 playerRole，让 SetupScreen 显示两个角色供选择
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
      console.log('[START_GAME] 收到数据:', { word, punishments });
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
          console.log('[SYNC_BANKS] 收到惩罚库同步:', { truths: msg.punishments.truths.length, dares: msg.punishments.dares.length });
          // 合并惩罚库，而不是覆盖
          setPunishmentBanks(prev => ({
            truths: Array.from(new Set([...prev.truths, ...msg.punishments.truths])),
            dares: Array.from(new Set([...prev.dares, ...msg.punishments.dares]))
          }));
          break;
      }
    });

    newSocket.on('settle_game', () => setShowPunishment(true));

    newSocket.on('reset_game', () => {
      setGameState(GameState.SETUP);
      setPlayers(prev => prev.map(item => ({...item, score: 0, isReady: false, name: ''})));
      setShowPunishment(false);
    });

    // 聊天消息
    newSocket.on('chat_message', (message: ChatMessage) => {
      console.log('[CHAT_MESSAGE] 收到聊天消息:', message);
      setChatMessages(prev => {
        // 避免重复添加
        if (prev.some(msg => msg.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    // 私密房间事件
    newSocket.on('private_room_created', ({ roomId, bgImage }) => {
      console.log('[PRIVATE_ROOM] 创建成功:', roomId);
      setRoomId(roomId);
      setRoomBgImage(bgImage);
      setIsPrivateRoom(true);
      setShowPrivateRoomModal(false);
      setGameState(GameState.SETUP);
    });

    newSocket.on('private_room_joined', ({ roomId, bgImage, history }) => {
      console.log('[PRIVATE_ROOM] 加入成功:', roomId);
      setRoomId(roomId);
      setRoomBgImage(bgImage);
      setIsPrivateRoom(true);
      setChatMessages(history);
      setShowPrivateRoomModal(false);
      setGameState(GameState.SETUP);
    });

    newSocket.on('private_room_error', (error: string) => {
      alert(error);
    });

    newSocket.on('room_bg_updated', (bgImage) => {
      console.log('[ROOM_SETTINGS] 背景已更新');
      setRoomBgImage(bgImage);
    });

    newSocket.on('room_password_updated', (hasPassword) => {
      console.log('[ROOM_SETTINGS] 密码已更新');
      if (!hasPassword) {
        setPrivateRoomPassword('');
      }
    });

    newSocket.on('backgrounds_list', (list: Background[]) => {
      setBackgrounds(list);
    });

    // 胡萝卜事件
    newSocket.on('carrot_awarded', (data: CarrotAward) => {
      console.log('[CARROT] 胡萝卜奖励:', data);
      setCarrotAwardData(data);
      setShowCarrotAward(true);

      // 如果是自己获得胡萝卜，更新计数
      if (data.winnerSocketId === mySocketId) {
        setMyCarrotCount(data.carrotCount);
      }

      // 3 秒后自动关闭
      setTimeout(() => setShowCarrotAward(false), 3000);
    });

    // 我的胡萝卜数量
    newSocket.on('my_carrots', (data: { playerIdentifier: string; count: number }) => {
      console.log('[CARROT] 我的胡萝卜:', data);
      setMyCarrotCount(data.count);
    });

    // 排行榜
    newSocket.on('leaderboard', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    // 已解锁特效
    newSocket.on('unlocked_effects', (effects: string[]) => {
      setUnlockedEffects(effects);
    });

    // 特效解锁成功
    newSocket.on('effect_unlocked', ({ effectId, carrotCount }) => {
      console.log('[EFFECT] 特效解锁成功:', effectId);
      setUnlockedEffects(prev => [...prev, effectId]);
      setMyCarrotCount(carrotCount);
      // 默认选中新解锁的特效
      setSelectedEffectId(effectId);
    });

    // 特效错误
    newSocket.on('effect_error', (error: string) => {
      alert(error);
    });

    // 测试房间定时动画
    newSocket.on('timed_animation', ({ type, emoji, message }) => {
      console.log('[TIMED_ANIMATION] 收到动画:', { type, emoji, message });
      const newEffect = { id: Date.now(), type, emoji };
      setTimedEffects(prev => [...prev, newEffect]);
      // 2 秒后移除
      setTimeout(() => {
        setTimedEffects(prev => prev.filter(e => e.id !== newEffect.id));
      }, 2000);
    });

    // 生日特效 - 测试房间 000 专用
    newSocket.on('birthday_effect', (data) => {
      console.log('[BIRTHDAY] 收到生日特效:', data);
      setShowBirthdayEffect(true);
    });

    // 玩家档案系统事件
    newSocket.on('login_result', (result: { success: boolean; player?: any; error?: string }) => {
      if (result.success && result.player) {
        setPlayerProfile(result.player);
        console.log('[PROFILE] 登录成功:', result.player);
      }
    });

    newSocket.on('update_player_profile_result', (result: { success: boolean; error?: string }) => {
      if (result.success) {
        console.log('[PROFILE] 更新成功');
      } else {
        console.error('[PROFILE] 更新失败:', result.error);
      }
    });

    // 改名结果
    newSocket.on('change_nickname_result', (result: { success: boolean; error?: string }) => {
      if (result.success) {
        console.log('[PROFILE] 改名成功');
        // 更新本地玩家档案
        setPlayerProfile((prev: any) => prev ? { ...prev, nickname: result.newNickname } : null);
      } else {
        console.error('[PROFILE] 改名失败:', result.error);
      }
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
      newSocket.off('chat_message');
      newSocket.off('private_room_created');
      newSocket.off('private_room_joined');
      newSocket.off('private_room_error');
      newSocket.off('room_bg_updated');
      newSocket.off('room_password_updated');
      newSocket.off('backgrounds_list');
      newSocket.off('carrot_awarded');
      newSocket.off('my_carrots');
      newSocket.off('leaderboard');
      newSocket.off('unlocked_effects');
      newSocket.off('effect_unlocked');
      newSocket.off('effect_error');
      newSocket.off('timed_animation');
      newSocket.off('birthday_effect');
      newSocket.off('login_result');
      newSocket.off('update_player_profile_result');
      newSocket.off('change_nickname_result');
      newSocket.off('leaderboard_ranking');
    };
  }, []);

  // 监听排行榜数据
  useEffect(() => {
    if (!socket) return;

    socket.on('leaderboard_ranking', (players: any[]) => {
      setArchiveRankings(players);
      setShowArchiveRanking(true);
    });

    return () => {
      socket.off('leaderboard_ranking');
    };
  }, [socket]);

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
    socket?.emit('game_message', { roomId, message: { type: 'ADD_SCORE', playerId: id, delta } });
    if (delta > 0) {
      const player = players.find(p => p.id === id);
      if (player) {
        socket?.emit('game_message', { roomId, message: { type: 'ATTACK_EFFECT', from: player.type } });
        triggerLocalEffect(player.type);
      }
    }
  };

  const handleSettle = () => {
    setShowPunishment(true);

    // 计算胜利者（分数低的赢）
    const foxScore = players.find(p => p.type === 'FOX')?.score || 0;
    const bunnyScore = players.find(p => p.type === 'BUNNY')?.score || 0;

    let winnerRole: 'FOX' | 'BUNNY' | null = null;
    if (foxScore < bunnyScore) {
      winnerRole = 'FOX';
    } else if (bunnyScore < foxScore) {
      winnerRole = 'BUNNY';
    }

    // 发送结算事件（包括胡萝卜奖励）
    socket?.emit('settle_game', { roomId });
    if (winnerRole) {
      socket?.emit('settle_game_with_carrot', { roomId, winnerRole });
    }
  };

  const handleSendMessage = (content: string, type: 'text' | 'emoji' | 'image') => {
    if (!socket || !roomId || !socket.connected) return;

    const player = players.find(p => p.type === playerRole);
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId: socket.id,
      senderName: player?.name || '玩家',
      senderRole: playerRole || undefined,
      content,
      type,
      timestamp: Date.now()
    };

    // 发送到服务器（不本地添加，等服务器广播回来）
    socket.emit('chat_message', { roomId, message });
  };

  // 私密房间处理函数
  const handleCreatePrivateRoom = (roomId: string, password: string) => {
    socket?.emit('create_private_room', { roomId, password });
  };

  const handleJoinPrivateRoom = (roomId: string, password: string) => {
    socket?.emit('join_private_room', { roomId, password });
  };

  const handleUpdateRoomBg = (bgUrl: string) => {
    if (!roomId) return;
    socket?.emit('update_room_bg', { roomId, bgImage: bgUrl });
  };

  const handleUpdateRoomPassword = (password: string) => {
    if (!roomId) return;
    socket?.emit('update_room_password', { roomId, password });
  };

  const handleClearChatHistory = () => {
    if (confirm('确定要清空聊天记录吗？此操作不可恢复！')) {
      setChatMessages([]);
    }
  };

  // 荣誉室和特效商店处理函数
  const handleOpenHonorHall = () => {
    socket?.emit('get_leaderboard');
    setShowHonorHall(true);
  };

  const handleOpenEffectShop = () => {
    socket?.emit('get_unlocked_effects');
    setShowEffectShop(true);
  };

  const handlePurchaseEffect = (effectId: string, cost: number) => {
    socket?.emit('unlock_effect', { effectId, cost });
  };

  const handleSelectEffect = (effectId: string) => {
    setSelectedEffectId(effectId);
    // 这里可以保存选中的特效到服务器，用于游戏结算时使用
    console.log('[EFFECT] 选中特效:', effectId);
  };

  // 生日动画处理
  const handleStartBirthdayAnimation = () => {
    if (birthdayAnimationStarted) return;
    setBirthdayAnimationStarted(true);
    console.log('[BIRTHDAY] 开始生日动画！');

    // 3 秒后显示背景元素
    setTimeout(() => {
      setShowBackgroundElements(true);
      console.log('[BIRTHDAY] 显示背景装饰！');
    }, 3000);

    // 5 秒后关闭弹窗，进入正式游戏
    setTimeout(() => {
      setShowBirthdayEffect(false);
      console.log('[BIRTHDAY] 动画结束，进入正式游戏！');
    }, 5000);
  };

  // 玩家档案系统处理函数
  const handleProfileLoaded = (profile: any) => {
    setPlayerProfile(profile);
    setShowProfileModal(false);
    console.log('[PROFILE] 档案已加载:', profile);
  };

  const handleOpenArchiveRoom = () => {
    if (playerProfile) {
      setShowArchiveRoom(true);
    } else {
      setShowProfileModal(true);
    }
  };

  const handleUpdatePlayerProfile = (updates: any) => {
    setPlayerProfile((prev: any) => ({ ...prev, ...updates }));
  };

  const handleChangeNickname = (newNickname: string) => {
    if (socket && playerProfile?.playerCode) {
      socket.emit('change_nickname', {
        playerCode: playerProfile.playerCode,
        newNickname
      });
    }
  };

  const handleOpenArchiveRanking = () => {
    socket?.emit('get_leaderboard');
  };

  // 进入房间时获取胡萝卜数量
  useEffect(() => {
    if (roomId && socket?.connected) {
      socket.emit('get_my_carrots');
    }
  }, [roomId, socket]);

  // 进入房间时清空聊天消息（仅公共房间）
  useEffect(() => {
    if (gameState === GameState.ROOM && !isPrivateRoom) {
      setChatMessages([]);
    }
  }, [gameState, isPrivateRoom]);

  const loser = players[0].score > players[1].score ? players[0] : players[1].score > players[0].score ? players[1] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-indigo-100 overflow-hidden relative bg-[#f8fafc]">
      {/* 背景图 */}
      {roomBgImage && (
        <div
          className="fixed inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: `url(${roomBgImage})` }}
        />
      )}

      {/* 胡萝卜奖励动画 */}
      {showCarrotAward && carrotAwardData && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-95 duration-500">
          <div className="bg-white rounded-[40px] shadow-2xl border-8 border-yellow-400 px-12 py-8 text-center">
            <div className="text-8xl mb-4 animate-bounce">🥕</div>
            <div className="text-3xl font-black text-slate-800 mb-2">
              {carrotAwardData.winnerSocketId === mySocketId ? '你赢了！' : `${carrotAwardData.winnerRole === 'FOX' ? '狐狸' : '兔子'} 获胜！`}
            </div>
            <div className="text-xl font-bold text-yellow-600">
              +1 胡萝卜（累计 {carrotAwardData.carrotCount} 根）
            </div>
          </div>
        </div>
      )}

      {/* 个人胡萝卜数量显示 - 始终显示，点击打开荣誉室 */}
      <div
        className="fixed top-6 right-6 z-40 animate-in fade-in slide-in-from-right-8 duration-700 cursor-pointer hover:scale-105 transition-transform"
        onClick={handleOpenHonorHall}
        title="点击查看荣誉室"
      >
        <div className="bg-white rounded-full shadow-xl border-4 border-yellow-400 px-6 py-3 flex items-center gap-3">
          <span className="text-4xl">🥕</span>
          <div>
            <div className="text-xs font-bold text-slate-400">我的胡萝卜</div>
            <div className="text-2xl font-black text-yellow-600 leading-none">{myCarrotCount}</div>
          </div>
        </div>
      </div>

      {/* 档案室入口 - 左上角 */}
      <div
        className="fixed top-6 left-6 z-40 animate-in fade-in slide-in-from-left-8 duration-700 cursor-pointer hover:scale-105 transition-transform"
        onClick={handleOpenArchiveRoom}
        title="点击打开档案室"
      >
        <div className="bg-white rounded-full shadow-xl border-4 border-indigo-400 px-6 py-3 flex items-center gap-3">
          <span className="text-4xl">🆔</span>
          <div>
            <div className="text-xs font-bold text-slate-400">我的档案</div>
            <div className="text-sm font-black text-indigo-600 leading-none">
              {playerProfile ? playerProfile.nickname : '未登录'}
            </div>
          </div>
        </div>
      </div>

      {effects.map(effect => (
        <div
          key={effect.id}
          className={`fixed z-[100] text-8xl pointer-events-none drop-shadow-2xl
            ${effect.type === 'TICKET' ? 'top-1/4 left-0 animate-[fly-right_2s_ease-in-out_forwards]' : 'bottom-1/4 right-0 animate-[fly-left_2s_ease-in-out_forwards]'}`}
        >
          {effect.type === 'TICKET' ? '📄' : '🍡'}
        </div>
      ))}

      {/* 测试房间定时动画效果 */}
      {timedEffects.map(effect => (
        <div
          key={effect.id}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-[200]"
        >
          <div className="text-center animate-in zoom-in-95 fade-in duration-500">
            <div className="text-9xl mb-4 drop-shadow-2xl">{effect.emoji}</div>
            {effect.type === 'celebration' && (
              <div className="text-4xl font-black text-yellow-500 drop-shadow-lg">测试房间特效！</div>
            )}
          </div>
        </div>
      ))}

      {/* 生日祝福弹窗 */}
      {showBirthdayEffect && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => !birthdayAnimationStarted && handleStartBirthdayAnimation()}>
          <div
            className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-[40px] shadow-2xl max-w-lg w-full p-8 text-center cursor-pointer transform hover:scale-105 transition-all"
            onClick={() => handleStartBirthdayAnimation()}
          >
            <div className="text-8xl mb-4 animate-bounce">🎂</div>
            <h2 className="text-4xl font-black text-white mb-2">生日快乐！</h2>
            <p className="text-pink-100 text-xl mb-6">🍾 点击开始庆祝！</p>
            <div className="flex justify-center gap-4 text-4xl">
              <span className="animate-pulse">🎉</span>
              <span className="animate-pulse delay-100">🎊</span>
              <span className="animate-pulse delay-200">✨</span>
              <span className="animate-pulse delay-300">🎁</span>
              <span className="animate-pulse delay-400">🦄</span>
            </div>
          </div>
        </div>
      )}

      {/* 生日动画效果 */}
      {birthdayAnimationStarted && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[299]">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute text-5xl animate-in fade-in zoom-in duration-700"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`,
                  animation: `float-up 3s ease-out ${i * 0.2}s infinite`
                }}
              >
                {['🎉', '🎊', '✨', '🎈', '🎁', '🦄', '🌟', '💝'][i % 8]}
              </div>
            ))}
          </div>
          <style>{`
            @keyframes float-up {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </>
      )}

      {/* 背景装饰元素 - 测试房间限定 */}
      {showBackgroundElements && roomId === '000' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* 玉桂狗 */}
          <div className="absolute top-10 left-10 text-6xl animate-pulse">🐶</div>
          {/* 可爱的羊 */}
          <div className="absolute top-10 right-10 text-6xl animate-pulse delay-100">🐑</div>
          {/* 米妮 */}
          <div className="absolute bottom-10 left-10 text-6xl animate-pulse delay-200">🎀</div>
          {/* 可爱的猪 */}
          <div className="absolute bottom-10 right-10 text-6xl animate-pulse delay-300">🐷</div>
          {/* 田园猫呱呱 */}
          <div className="absolute top-1/2 left-4 text-5xl animate-bounce">🐱</div>
          {/* 马尔济斯狗 Poke */}
          <div className="absolute top-1/2 right-4 text-5xl animate-bounce delay-100">🐩</div>
          {/* xx 基地小屋 */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-8xl">🏠</div>
          {/* 七里岗海 */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-blue-400/30 to-transparent" />
          <div className="absolute bottom-0 left-1/4 text-4xl animate-pulse">🌊</div>
          <div className="absolute bottom-0 right-1/4 text-4xl animate-pulse delay-100">🌊</div>
          <div className="absolute bottom-0 left-1/2 text-3xl font-black text-blue-600/50">七里岗</div>
        </div>
      )}

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
          <div className="flex items-center gap-4">
            {isPrivateRoom && (
              <button
                onClick={() => setShowRoomSettings(true)}
                className="group relative px-6 py-5 rounded-[35px] bg-white text-indigo-500 font-black hover:bg-indigo-500 hover:text-white transition-all shadow-[0_10px_0_0_#e0e7ff] active:shadow-none active:translate-y-[10px] border-4 border-indigo-50"
              >
                <span className="flex items-center gap-2 text-xl">⚙️ 房间设置</span>
              </button>
            )}
            <button
              onClick={handleOpenEffectShop}
              className="group relative px-6 py-5 rounded-[35px] bg-white text-purple-500 font-black hover:bg-purple-500 hover:text-white transition-all shadow-[0_10px_0_0_#e9d5ff] active:shadow-none active:translate-y-[10px] border-4 border-purple-50"
            >
              <span className="flex items-center gap-2 text-xl">🏪 特效商店</span>
            </button>
            <button
              onClick={handleSettle}
              className="group relative px-10 py-5 rounded-[35px] bg-white text-rose-500 font-black hover:bg-rose-500 hover:text-white transition-all shadow-[0_10px_0_0_#fda4af] active:shadow-none active:translate-y-[10px] border-4 border-rose-50"
            >
              <span className="flex items-center gap-2 text-xl">🏁 申请结案</span>
            </button>
          </div>
        )}
      </div>

      {gameState === GameState.ROOM && (
        <SetupRoom
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
          onOpenPrivateRoom={() => setShowPrivateRoomModal(true)}
        />
      )}

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
        <div className="w-full max-w-6xl space-y-8 z-10 animate-in zoom-in-95 duration-500">
          {/* 得分条 */}
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

          {/* 聊天框 - 移到中间位置 */}
          <div className="max-w-2xl mx-auto">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isConnected={!!socket?.connected && !!roomId}
              mySocketId={mySocketId}
              onClearHistory={isPrivateRoom ? handleClearChatHistory : undefined}
              chatFontSize={chatFontSize}
              chatBgImage={chatBgImage}
              onFontChange={setChatFontSize}
              onBgChange={setChatBgImage}
            />
          </div>

          {/* 分数板和禁语字 */}
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

      {/* 私密房间模态框 */}
      <PrivateRoomModal
        isOpen={showPrivateRoomModal}
        onClose={() => setShowPrivateRoomModal(false)}
        onCreateRoom={handleCreatePrivateRoom}
        onJoinRoom={handleJoinPrivateRoom}
      />

      {/* 房间设置模态框 */}
      <RoomSettings
        isOpen={showRoomSettings}
        onClose={() => setShowRoomSettings(false)}
        roomId={roomId}
        currentBg={roomBgImage}
        onUpdateBg={handleUpdateRoomBg}
        onUpdatePassword={handleUpdateRoomPassword}
      />

      {/* 聊天框设置已移到上方得分条下方 */}
      {/* 荣誉室模态框 */}
      <HonorHall
        isOpen={showHonorHall}
        onClose={() => setShowHonorHall(false)}
        myCarrotCount={myCarrotCount}
        mySocketId={mySocketId}
        leaderboard={leaderboard}
      />

      {/* 特效商店模态框 */}
      <EffectShop
        isOpen={showEffectShop}
        onClose={() => setShowEffectShop(false)}
        myCarrotCount={myCarrotCount}
        unlockedEffects={unlockedEffects}
        onPurchase={handlePurchaseEffect}
        onSelectEffect={handleSelectEffect}
        selectedEffectId={selectedEffectId}
      />

      {/* 玩家档案创建/登录模态框 */}
      <PlayerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        socket={socket}
        onProfileLoaded={handleProfileLoaded}
      />

      {/* 档案室模态框 */}
      <ArchiveRoom
        isOpen={showArchiveRoom}
        onClose={() => setShowArchiveRoom(false)}
        playerProfile={playerProfile}
        socket={socket}
        onUpdateProfile={handleUpdatePlayerProfile}
        onChangeNickname={handleChangeNickname}
      />

      {/* 档案室排行榜模态框 */}
      <ArchiveRoomRanking
        isOpen={showArchiveRanking}
        onClose={() => setShowArchiveRanking(false)}
        rankings={archiveRankings}
      />
    </div>
  );
};

export default App;
