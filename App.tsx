
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, ForbiddenWord, SyncMessage, PunishmentBanks, ChatMessage, EMOJI_LIST, PrivateRoom, Background, Effect, LeaderboardEntry, CarrotAward } from './types';
import { FORBIDDEN_WORDS, TRUTH_PUNISHMENTS, DARE_PUNISHMENTS, FURNITURE_CATALOG } from './constants';
import SetupRoom from './components/SetupRoom';
import SetupScreen from './components/SetupScreen';
import ForbiddenWordCard from './components/ForbiddenWordCard';
import ScoreBoard from './components/ScoreBoard';
import PunishmentModal from './components/PunishmentModal';
import TransitionOverlay from './components/TransitionOverlay';
import ChatBox from './components/ChatBox';
import PrivateRoomModal from './components/PrivateRoomModal';
import RoomManagement from './components/RoomManagement';
import HonorHall from './components/HonorHall';
import EffectShop from './components/EffectShop';
import PlayerProfileModal from './components/PlayerProfileModal';
import ArchiveRoom from './components/ArchiveRoom';
import ArchiveRoomRanking from './components/ArchiveRoomRanking';
import BirthdayGallery from './components/BirthdayGallery';
import CheeseCentralBank from './components/CheeseCentralBank';
import DrawGuessGame from './components/DrawGuessGame';
import PetPanel from './components/PetPanel';
import PetDesktop from './components/PetDesktop';
import MailBox from './components/MailBox';
import ChatRoom from './components/ChatRoom';
import GamePanel from './components/GamePanel';
import FurnitureShop from './components/FurnitureShop';
import GlobalNavBar from './components/GlobalNavBar';

// 规范化服务器消息格式（SQLite 返回 snake_case + integer id）
function normalizeServerMessage(msg: any): ChatMessage {
  return {
    id: String(msg.id || msg.rowid || `srv-${Date.now()}-${Math.random()}`),
    senderId: msg.sender_id || msg.senderId || '',
    senderName: msg.sender_name || msg.senderName || '玩家',
    senderRole: msg.sender_role || msg.senderRole,
    content: msg.content || '',
    type: msg.type || 'text',
    timestamp: Number(msg.timestamp) || Date.now(),
    quote: msg.quote ? (typeof msg.quote === 'string' ? JSON.parse(msg.quote) : msg.quote) : undefined,
  };
}

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
  const [punishmentLoser, setPunishmentLoser] = useState<Player | null>(null);
  const [lastSelectedPunishment, setLastSelectedPunishment] = useState<{ type: '真心话' | '大冒险'; content: string } | null>(null);
  const [effects, setEffects] = useState<{id: number, type: 'TICKET' | 'ICE'}[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerRole, setPlayerRole] = useState<'FOX' | 'BUNNY' | null>(null);
  const playerRoleRef = useRef<'FOX' | 'BUNNY' | null>(null);
  const punishmentBanksRef = useRef<PunishmentBanks>(punishmentBanks);
  const playerProfileRef = useRef<any>(null); // 用于 socket 回调始终获取最新的 playerProfile
  const chatMessagesRef = useRef<ChatMessage[]>([]); // 用于 socket 回调始终获取最新的聊天消息
  const customWordsRef = useRef<ForbiddenWord[]>([]);
  const hasSpecificCharsRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('');

  // 私密房间相关状态
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [privateRoomPassword, setPrivateRoomPassword] = useState('');
  const [roomBgImage, setRoomBgImage] = useState('');
  const [showPrivateRoomModal, setShowPrivateRoomModal] = useState(false);

  // 加载版本号
  useEffect(() => {
    fetch('/VERSION?t=' + Date.now())
      .then(res => res.text())
      .then(version => setAppVersion(version.trim().split('\n')[0]))
      .catch(err => console.log('[VERSION] 加载失败:', err));
  }, []);
  const [showRoomManagement, setShowRoomManagement] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [myCarrotCount, setMyCarrotCount] = useState(0);
  const [myCheeseCount, setMyCheeseCount] = useState(0);
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
  const [showBirthdayGallery, setShowBirthdayGallery] = useState(false);

  // 玩家档案系统相关状态
  const [playerProfile, setPlayerProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showArchiveRoom, setShowArchiveRoom] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [showArchiveRanking, setShowArchiveRanking] = useState(false);
  const [archiveRankings, setArchiveRankings] = useState<any[]>([]);
  const [showCheeseBank, setShowCheeseBank] = useState(false);
  const [showPetPanel, setShowPetPanel] = useState(false);
  const [petStatusData, setPetStatusData] = useState<any>(null);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [dailyClaimMsg, setDailyClaimMsg] = useState('');
  const [hasAutoRejoined, setHasAutoRejoined] = useState(false); // 防止重复重连
  const [showSidebar, setShowSidebar] = useState(true); // 侧边栏开关 - 默认展开
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 是否已成功登录（服务器响应回来）
  const [showMailBox, setShowMailBox] = useState(false); // 信箱弹窗
  const [unreadMailCount, setUnreadMailCount] = useState(0); // 未读邮件数量

  // Chat Room 系统状态
  const [roomTheme, setRoomTheme] = useState('cozy'); // 聊天室主题
  const [decorationMode, setDecorationMode] = useState(false); // 装饰模式
  const [showRoomSelector, setShowRoomSelector] = useState(false); // 显示房间选择器
  const [chatRoomFontSize, setChatRoomFontSize] = useState(14); // 聊天室字体大小
  const [chatRoomFontColor, setChatRoomFontColor] = useState('#1e293b'); // 聊天室字体颜色
  const [chatRoomBgImage, setChatRoomBgImage] = useState(''); // 聊天室背景

  // 聊天室主题数据
  const chatRoomThemes = [
    { id: 'cozy', name: '温馨小屋', icon: '🏠', headerBg: 'bg-gradient-to-r from-amber-50 to-orange-50', borderColor: 'border-amber-200', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', accent: '#92400e' },
    { id: 'forest', name: '森林秘境', icon: '🌿', headerBg: 'bg-gradient-to-r from-green-50 to-emerald-50', borderColor: 'border-green-200', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', accent: '#065f46' },
    { id: 'ocean', name: '海洋之心', icon: '🌊', headerBg: 'bg-gradient-to-r from-blue-50 to-cyan-50', borderColor: 'border-blue-200', bg: 'linear-gradient(135deg, #dbeafe 0%, #bae6fd 100%)', accent: '#1e40af' },
    { id: 'sunset', name: '日落黄昏', icon: '🌅', headerBg: 'bg-gradient-to-r from-orange-50 to-rose-50', borderColor: 'border-orange-200', bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', accent: '#9a3412' },
    { id: 'galaxy', name: '星际漫游', icon: '🌌', headerBg: 'bg-gradient-to-r from-indigo-50 to-violet-50', borderColor: 'border-indigo-200', bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', accent: '#3730a3' },
    { id: 'sakura', name: '樱花烂漫', icon: '🌸', headerBg: 'bg-gradient-to-r from-pink-50 to-rose-50', borderColor: 'border-pink-200', bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', accent: '#9d174d' },
  ];

  // 聊天室家具系统状态
  const [ownedFurniture, setOwnedFurniture] = useState<string[]>([]); // 已拥有的家具 ID 列表
  const [placedFurniture, setPlacedFurniture] = useState<Array<{ id: string; itemId: string; x: number; y: number }>>([]); // 已放置的家具
  const [showFurnitureShop, setShowFurnitureShop] = useState(false); // 显示家具商城

  // 自定义禁语词库（通过 SYNC_BANKS 收集）
  const [customWords, setCustomWords] = useState<ForbiddenWord[]>([]);

  // 你画我猜模式
  const [gameMode, setGameMode] = useState<'forbidden' | 'draw-guess'>('forbidden');
  const [drawRound, setDrawRound] = useState<any>(null);
  const [drawGameNotify, setDrawGameNotify] = useState('');

  // 使用 ref 存储房间信息，用于重连时访问最新值
  const roomIdRef = React.useRef<string>('');
  const isPrivateRoomRef = React.useRef<boolean>(false);

  // 小窝流程：inSetup 控制是否显示选角/SetupScreen（不影响 gameState 状态机）
  // 进入房间 = ROOM 状态（小窝）；点击游戏 = inSetup=true（选角）；开始游戏 = PLAYING
  const [inSetup, setInSetup] = useState(false);

  // 游戏活跃标记：当游戏正在进行中时保持 true
  // 返回小窝时不会关闭游戏，玩家可以随时切回游戏界面
  const [gameActive, setGameActive] = useState(false);

  // 游客模式状态：未登录档案时为游客，只能观看不能操作
  const isGuest = !playerProfile;
  // 关键修复：以玩家档案(playerCode)作为唯一身份判断依据
  // 判断是否是房间成员：玩家档案 playerCode 匹配当前角色，或私密房间中已登录即视为成员
  const isRoomMember = playerProfile && (
    players.some(p => p.playerCode === playerProfile.playerCode) ||
    (roomId && isPrivateRoom)  // 私密房间中，已登录档案即视为房间成员
  );
  const isGamePlayer = playerProfile && players.some(p => p.playerCode === playerProfile?.playerCode);
  // 可以交互：房间成员（私密房间中已登录即可）
  const canInteract = !!isRoomMember;
  // 可以修改分数：必须是游戏玩家（角色占用者）
  const canUpdateScore = isGamePlayer;

  // 聊天框设置
  const [chatFontSize, setChatFontSize] = useState(14);
  const [chatFontColor, setChatFontColor] = useState('#1e293b');
  const [chatBgImage, setChatBgImage] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    // 优先使用 localStorage 保存的状态（刷新后保持）
    const saved = localStorage.getItem('notification_enabled');
    if (saved === 'false') return false;
    // 根据浏览器实际通知权限初始化
    return 'Notification' in window && Notification.permission === 'granted';
  });

  // 持久化通知开关状态到 localStorage
  useEffect(() => {
    localStorage.setItem('notification_enabled', String(notificationEnabled));
  }, [notificationEnabled]);

  // 房主系统相关状态
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 当 roomId 变化时，更新 ref
  React.useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // 当 isPrivateRoom 变化时，更新 ref
  React.useEffect(() => {
    isPrivateRoomRef.current = isPrivateRoom;
  }, [isPrivateRoom]);

  // 页面加载时检查是否有保存的档案（仅用于日志，实际登录在 socket connect 事件中处理）
  useEffect(() => {
    const savedProfile = localStorage.getItem('player_profile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        console.log('[PROFILE] 检测到已保存的登录档案:', profile.playerCode);
      } catch (e) {
        console.error('[PROFILE] 解析保存的档案失败:', e);
        localStorage.removeItem('player_profile');
      }
    }
  }, []);

  useEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);

  useEffect(() => {
    punishmentBanksRef.current = punishmentBanks;
  }, [punishmentBanks]);

  // 保持 ref 与 state 同步，确保 socket 回调中始终能访问最新值
  useEffect(() => {
    playerProfileRef.current = playerProfile;
  }, [playerProfile]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // 调试日志：记录 chatMessages 每次变化
  useEffect(() => {
    console.log('[CHAT] chatMessages 状态变化，当前长度:', chatMessages.length);
    if (chatMessages.length > 0) {
      console.log('[CHAT] 最新5条消息IDs:', chatMessages.slice(-5).map(m => m.id));
    }
  }, [chatMessages]);

  // 恢复机制：如果在私密房间但没有消息，尝试重新获取历史
  const hasRequestedRecovery = useRef(false);
  useEffect(() => {
    if (isPrivateRoom && roomId && chatMessages.length === 0 && !hasRequestedRecovery.current && socket?.connected) {
      hasRequestedRecovery.current = true;
      console.log('[CHAT] 检测到私密房间无消息，尝试恢复历史...');
      const savedRoom = localStorage.getItem('private_room_info');
      const savedProfile = localStorage.getItem('player_profile');
      if (savedRoom && savedProfile) {
        try {
          const { roomId: savedRoomId } = JSON.parse(savedRoom);
          const { playerCode } = JSON.parse(savedProfile);
          console.log('[CHAT] 重新发送 rejoin_private_room 请求恢复:', savedRoomId);
          setTimeout(() => {
            socket.emit('rejoin_private_room', { roomId: savedRoomId, playerCode });
          }, 200);
        } catch (e) {
          console.error('[CHAT] 恢复历史失败:', e);
        }
      }
    }
    if (!isPrivateRoom) {
      hasRequestedRecovery.current = false;
    }
  }, [isPrivateRoom, roomId, chatMessages.length, socket]);

  useEffect(() => {
    customWordsRef.current = customWords;
  }, [customWords]);

  // 当玩家档案加载后，重新检查房间中的角色占用情况
  // 这解决了登录后半道加入房间时角色判断失效的问题
  useEffect(() => {
    if (playerProfile?.playerCode && roomId && socket?.connected) {
      console.log('[PROFILE] 档案加载完成，检查房间角色占用:', { playerCode: playerProfile.playerCode, roomId });
      // 请求服务器重新同步房间状态
      socket.emit('get_room_info', roomId);
    }
  }, [playerProfile?.playerCode, roomId, socket]);

  const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

  // 初始化 socket 和所有事件监听器
  useEffect(() => {
    console.log('[SOCKET] 初始化连接');
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SOCKET] 已连接:', newSocket.id);
      setMySocketId(newSocket.id);

      // 连接成功后，检查是否有保存的档案，有则自动登录
      const savedProfile = localStorage.getItem('player_profile');
      const savedRoom = localStorage.getItem('private_room_info');

      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          console.log('[SOCKET] 连接成功，检测到已保存的档案，自动登录:', profile.playerCode);

          // 先设置玩家档案为加载中状态（这样刷新后会显示已登录）
          setPlayerProfile({
            playerCode: profile.playerCode,
            nickname: profile.nickname || profile.playerCode,
            loading: true
          });

          // 然后登录
          newSocket.emit('login_player', {
            playerCode: profile.playerCode,
            password: profile.passwordHash
          });

          // 如果有保存的房间，登录成功后自动重连房间
          if (savedRoom && !hasAutoRejoined) {
            const { roomId, password } = JSON.parse(savedRoom);
            console.log('[SOCKET] 检测到保存的房间，准备自动重连:', roomId);
            // 延迟一点，等登录完成后再重连房间
            setTimeout(() => {
              newSocket.emit('rejoin_private_room', { roomId, playerCode: profile.playerCode });
              setHasAutoRejoined(true);
            }, 500);
          }
        } catch (e) {
          console.error('[SOCKET] 解析保存的档案失败:', e);
          localStorage.removeItem('player_profile');
        }
      } else if (savedRoom && !hasAutoRejoined) {
        // 没有档案但有房间（理论上不应该发生），清除房间信息
        console.log('[SOCKET] 检测到房间信息但无档案，清除房间信息');
        localStorage.removeItem('private_room_info');
      }

      // 首次连接且没有保存的房间信息时，加载全局聊天
      // 有保存的房间时不加载，避免覆盖房间聊天记录
      if (!savedRoom) {
        newSocket.emit('get_global_chat');
      }
    });

    // 断线重连事件 - 使用 ref 访问最新的房间信息
    // 注意：socket.io v4 在重连时也会触发 connect 事件，connect 处理中已处理自动重连
    // 所以这里不再重复 emit rejoin_private_room，防止重复发送
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[SOCKET] 重连成功，尝试次数:', attemptNumber);
      // connect 事件处理中已包含自动重连逻辑（login_player + rejoin_private_room）
      // 不再重复 emit，避免重复状态恢复
    });

    // 监听离开房间事件，清除重连标志
    newSocket.on('left_room', () => {
      console.log('[SOCKET] 离开房间，清除重连标志');
      setHasAutoRejoined(false);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SOCKET] 重连尝试中...', attemptNumber);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET] 连接错误:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] 断开连接:', reason);
    });

    // 玩家离线通知（私密房间专用）
    newSocket.on('player_disconnected', ({ role, socketId, playerName }) => {
      console.log('[PLAYER] 玩家离线:', { role, socketId, playerName });
      // 私密房间中，不立即清除玩家数据，显示离线提示即可
      if (isPrivateRoomRef.current) {
        console.log(`私密房间玩家 ${playerName || role} 暂时离线，房间状态保留`);
      }
    });

    // 房间事件
    newSocket.on('room_created', (id: string) => {
      console.log('[ROOM] 创建成功:', id);
      setRoomId(id);
      setInSetup(false);
    });

    newSocket.on('room_joined', (data: { roomId: string; history?: ChatMessage[] }) => {
      const roomIdStr = typeof data === 'string' ? data : data.roomId;
      console.log('[ROOM] 加入成功:', roomIdStr);
      setRoomId(roomIdStr);
      setInSetup(false);
      // 加载房间聊天历史
      if (data && typeof data === 'object' && data.history) {
        const history = data.history;
        if (history.length > 0) {
          const myCode = playerProfileRef.current?.playerCode;
          const normalized = history.map((msg: any) => {
            const newMsg = normalizeServerMessage(msg);
            if (newMsg.senderId === myCode && playerProfileRef.current) {
              newMsg.senderName = playerProfileRef.current.nickname || newMsg.senderName;
            }
            return newMsg;
          });
          setChatMessages(prev => {
            const merged = [...prev];
            for (const msg of normalized) {
              if (!merged.some(m => m.id === msg.id)) {
                merged.push(msg);
              }
            }
            console.log('[CHAT] room_joined 合并历史:', prev.length, '+', normalized.length, '=', merged.length);
            return merged;
          });
        }
      }
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

      // 关键修复：如果双方角色都为空（clear_room_roles 后），清除 playerRole
      if (!fox && !bunny) {
        setPlayerRole(null);
      }

      // 设置玩家角色 - 优先使用 socketId 判断（实时连接）
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

      // 根据档案 playerCode 判断自己是否已经是某个角色（用于重连/登录场景）
      // 这个判断在 socketId 无效时（如页面刷新后）非常重要 - 使用 ref 避免 stale closure
      if (playerProfileRef.current?.playerCode) {
        if (fox?.playerCode && fox.playerCode === playerProfileRef.current.playerCode) {
          setPlayerRole('FOX');
          console.log('[SYNC_ROOM] 检测到已登录角色：FOX (playerCode 匹配)');
        } else if (bunny?.playerCode && bunny.playerCode === playerProfileRef.current.playerCode) {
          setPlayerRole('BUNNY');
          console.log('[SYNC_ROOM] 检测到已登录角色：BUNNY (playerCode 匹配)');
        }
      }

      // 同步玩家数据 - 关键：只要有数据就同步，null 也要清空旧状态
      setPlayers(prev => prev.map(p => {
        if (p.type === 'FOX') {
          if (fox) {
            return { ...p, ...fox, type: 'FOX' as const, isReady: foxReady ?? false };
          }
          // fox 为 null 时，清空角色信息（支持清空房间后重新认领）
          return { ...p, playerCode: undefined, nickname: undefined, isReady: false, name: '', score: 0 };
        }
        if (p.type === 'BUNNY') {
          if (bunny) {
            return { ...p, ...bunny, type: 'BUNNY' as const, isReady: bunnyReady ?? false };
          }
          // bunny 为 null 时，清空角色信息
          return { ...p, playerCode: undefined, nickname: undefined, isReady: false, name: '', score: 0 };
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
      console.log('[PLAYER_JOINED] 新玩家加入:', socketId);
      // 有新玩家加入时，请求房间状态同步
      // 服务器会在 join_private_room 时广播 sync_room，这里主要是确保本地状态更新
    });

    // 玩家重新加入通知
    newSocket.on('player_rejoined', ({ playerCode, socketId, role }) => {
      console.log('[PLAYER_REJOINED] 玩家重新加入:', { playerCode, socketId, role });
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
        let uniqueWords: ForbiddenWord[];
        if (hasSpecificCharsRef.current && (customWordsRef.current || []).length > 0) {
          // 特定字大作战模式：只使用特定字（不混合默认词库）
          uniqueWords = customWordsRef.current;
        } else {
          // 默认模式：混合默认词库和自定义词
          const seen = new Set<string>();
          uniqueWords = [];
          for (const w of (customWordsRef.current || [])) {
            if (!seen.has(w.char)) { seen.add(w.char); uniqueWords.push(w); }
          }
          for (const w of FORBIDDEN_WORDS) {
            if (!seen.has(w.char)) { seen.add(w.char); uniqueWords.push(w); }
          }
        }
        const randomWord = uniqueWords.length > 0
          ? uniqueWords[Math.floor(Math.random() * uniqueWords.length)]
          : FORBIDDEN_WORDS[0];
        newSocket.emit('start_game', { roomId, word: randomWord, punishments: punishmentBanksRef.current });
      }
    });

    newSocket.on('start_game', ({ word, punishments }) => {
      console.log('[START_GAME] 收到数据:', { word, punishments });
      setSessionWord(word);
      setPunishmentBanks(punishments);
      setInSetup(false);
      setGameActive(true);
      setGameState(GameState.TRANSITION);
    });

    newSocket.on('game_message', (msg: SyncMessage) => {
      switch (msg.type) {
        case 'UPDATE_PLAYER':
          setPlayers(prev => prev.map(p => p.type === msg.player.type ? { ...p, ...msg.player } : p));
          break;
        case 'ADD_SCORE':
          // 不再处理：分数更新由 sync_room 统一广播，避免双重更新导致分数回退/翻倍
          break;
        case 'ATTACK_EFFECT':
          triggerLocalEffect(msg.from);
          break;
        case 'USE_EFFECT':
          // 处理特效使用（如扔大便）
          console.log('[USE_EFFECT] 收到特效使用:', msg);
          // 添加特效动画
          const effectEmoji = msg.effectId === 'poop-classic' ? '💩' : '✨';
          const newEffect = { id: Date.now(), type: 'poop', emoji: effectEmoji };
          setTimedEffects(prev => [...prev, newEffect]);
          setTimeout(() => {
            setTimedEffects(prev => prev.filter(e => e.id !== newEffect.id));
          }, 2000);
          break;
        case 'SETTLE_GAME':
          setShowPunishment(true);
          break;
        case 'RESET_GAME':
          setInSetup(true);
          setPlayers(prev => prev.map(item => ({
            ...item,
            score: 0,
            isReady: false
            // 不清除 name，保留玩家信息
          })));
          setShowPunishment(false);
          break;
        case 'SYNC_BANKS':
          console.log('[SYNC_BANKS] 收到惩罚库和自定义词同步:', { truths: msg.punishments.truths.length, dares: msg.punishments.dares.length, extraWords: msg.extraWords?.length || 0 });
          // 合并惩罚库，而不是覆盖
          setPunishmentBanks(prev => ({
            truths: Array.from(new Set([...prev.truths, ...msg.punishments.truths])),
            dares: Array.from(new Set([...prev.dares, ...msg.punishments.dares]))
          }));
          // 合并自定义禁语词到 wordPool，供开始游戏时使用
          // isSingleRound=true 的词仅本轮有效，不加入永久词库
          if (msg.extraWords && msg.extraWords.length > 0) {
            const permanentWords = msg.extraWords.filter(w => !w.isSingleRound);
            if (permanentWords.length > 0) {
              setCustomWords(prev => {
                const combined = [...prev, ...permanentWords];
                // 去重（相同 char 只保留一个）
                const seen = new Set<string>();
                return combined.filter(w => {
                  if (seen.has(w.char)) return false;
                  seen.add(w.char);
                  return true;
                });
              });
            }
          }
          break;
      }
    });

    // 监听惩罚选择结果，同步显示给双方
    newSocket.on('punishment_selected', (data: { type: 'TRUTH' | 'DARE'; content: string }) => {
      console.log('[PUNISHMENT_SELECTED] 收到惩罚选择:', data);
      // 将惩罚内容添加到对应的惩罚库中，确保双方都能看到
      setPunishmentBanks(prev => {
        const listKey = data.type === 'TRUTH' ? 'truths' : 'dares';
        if (prev[listKey].includes(data.content)) {
          return prev; // 已存在，不重复添加
        }
        return {
          ...prev,
          [listKey]: [...prev[listKey], data.content]
        };
      });
      // 自动选中最后添加的惩罚
      setLastSelectedPunishment(data);
      // 确保惩罚窗口打开（双方都能看到）
      setShowPunishment(true);
    });

    newSocket.on('settle_game', (data: { loser: Player | null }) => {
      console.log('[SETTLE_GAME] 收到结算事件，输家:', data?.loser);
      setPunishmentLoser(data?.loser || null);
      setShowPunishment(true);
      setLastSelectedPunishment(null); // 重置惩罚选择
      // 游戏状态改为 settled，表示已结案，可以重新选角
      setInSetup(true);
      setGameActive(false);
      setGameState(GameState.ROOM); // 返回小窝状态，显示房间管理按钮
    });

    newSocket.on('reset_game', () => {
      console.log('[RESET_GAME] 收到重置事件');
      // 只重置分数和准备状态，保留玩家信息
      setInSetup(true);
      setPlayers(prev => prev.map(item => ({
        ...item,
        score: 0,
        isReady: false
        // 不清除 name，保留玩家信息
      })));
      // 确保惩罚窗口关闭，双方都进入选角界面
      setShowPunishment(false);
      setPunishmentLoser(null);
      setLastSelectedPunishment(null);
      // 关键修复：重置 playerRole，让用户重新选角
      setPlayerRole(null);
    });

    // 房主强制结束游戏 - 清空所有状态，需要重新登录
    newSocket.on('force_reset_game', () => {
      console.log('[FORCE_RESET] 房主强制结束游戏，清空所有状态');
      setGameState(GameState.ROOM);
      setInSetup(false);
      setPlayers([
        { id: 1, name: '', score: 0, type: 'FOX', isReady: false },
        { id: 2, name: '', score: 0, type: 'BUNNY', isReady: false },
      ]);
      setPlayerRole(null);
      setShowPunishment(false);
      setPunishmentLoser(null);
      setLastSelectedPunishment(null);
      alert('⚠️ 房主已强制结束游戏，所有玩家需要重新登录！');
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

    // 消息保存确认（服务器返回数据库 ID）
    newSocket.on('message_saved', ({ client_id, server_id }: { client_id: string; server_id: string }) => {
      console.log('[CHAT_MESSAGE] 消息保存确认, client_id=', client_id, 'server_id=', server_id);
      setChatMessages(prev => {
        // 先查找是否有匹配 client_id 的消息
        const hasClientId = prev.some(msg => msg.id === client_id);
        if (hasClientId) {
          // 有则更新 ID
          return prev.map(msg => msg.id === client_id ? { ...msg, id: server_id } : msg);
        }
        // 没有则忽略（可能是刷新后，历史消息已用 server_id 加载）
        return prev;
      });
    });

    // 私密房间事件
    newSocket.on('private_room_created', ({ roomId, bgImage }) => {
      console.log('[PRIVATE_ROOM] 创建成功:', roomId);
      setRoomId(roomId);
      setRoomBgImage(bgImage);
      setIsPrivateRoom(true);
      setShowPrivateRoomModal(false);
      setInSetup(false);
      localStorage.setItem('private_room_info', JSON.stringify({ roomId, password: privateRoomPassword }));
    });

    // 玩家重新加入房间（其他玩家收到通知）
    newSocket.on('player_rejoined', ({ playerIdentifier, socketId }) => {
      console.log('[PRIVATE_ROOM] 玩家重新加入:', { playerIdentifier, socketId });
    });

    // 聊天历史（重连时收到）- 客户端额外规范化确保消息归属正确
    newSocket.on('chat_history', (history) => {
      console.log('[CHAT] 收到历史消息:', history.length, '条');
      // 关键修复：三重检查，确保只在确需全局聊天时才加载
      // 1. 当前在房间内
      // 2. 有保存的私密房间（用户正在重连中）
      const currentRoomId = roomIdRef.current;
      if (currentRoomId) {
        console.log('[CHAT] 当前在房间', currentRoomId, '忽略 global chat 响应');
        return;
      }
      // 3. 有保存的房间信息，说明用户不是首次访问，应使用房间历史
      if (localStorage.getItem('private_room_info')) {
        console.log('[CHAT] 有保存的房间信息，忽略 global chat 响应');
        return;
      }
      const myCode = playerProfileRef.current?.playerCode;
      const normalizedHistory = history.map((msg: any) => {
        const newMsg = normalizeServerMessage(msg);
        if (newMsg.senderId === myCode) {
          newMsg.senderName = playerProfileRef.current?.nickname || newMsg.senderName;
        }
        return newMsg;
      });
      // 加载规范化后的历史消息，避免重复
      setChatMessages(prev => {
        const existing = [...prev];
        for (const msg of normalizedHistory) {
          if (!existing.some(m => m.id === msg.id)) {
            existing.push(msg);
          }
        }
        return existing;
      });
    });

    // 聊天室数据
    newSocket.on('chat_room_data', (data: { theme: string; furniture: Array<{ id: string; itemId: string; x: number; y: number }> }) => {
      console.log('[CHAT_ROOM] 收到聊天室数据:', data);
      setRoomTheme(data.theme || 'cozy');
      setPlacedFurniture(data.furniture || []);
    });

    // 家具购买结果
    newSocket.on('furniture_purchase_result', (result: { success: boolean; error?: string; cheeseBalance?: number }) => {
      if (result.success) {
        console.log('[FURNITURE] 购买成功');
        // 更新已拥有家具列表
        const itemId = result.cheeseBalance !== undefined ? '' : ''; // Will be fixed
        // 通知服务器获取更新后的家具列表
        socket?.emit('get_chat_room', { roomId: '' });
      } else {
        alert(result.error || '购买失败');
      }
    });

    // 聊天室主题更新通知
    newSocket.on('chat_room_theme_updated', (data: { theme: string }) => {
      setRoomTheme(data.theme);
    });

    // 聊天室家具更新通知
    newSocket.on('chat_room_furniture_updated', (data: { furniture: Array<{ id: string; itemId: string; x: number; y: number }> }) => {
      setPlacedFurniture(data.furniture);
    });

    // 玩家背包数据（用于加载已拥有家具）
    newSocket.on('inventory_data', (data: { playerCode: string; itemType: string; items: string[] }) => {
      if (data.itemType === 'FURNITURE') {
        console.log('[FURNITURE] 加载已拥有家具:', data.items);
        setOwnedFurniture(data.items);
      }
    });

    newSocket.on('private_room_joined', ({ roomId, bgImage, history, syncData, gameState, word }) => {
      console.log('[PRIVATE_ROOM] 加入成功:', roomId, '游戏状态:', gameState, '词汇:', word, '同步数据:', syncData, '历史消息:', history?.length || 0);
      if (history && history.length > 0) {
        console.log('[PRIVATE_ROOM] 历史消息样本（前3条）:', JSON.stringify(history.slice(0, 3)));
      }
      setRoomId(roomId);
      setRoomBgImage(bgImage);
      setIsPrivateRoom(true);
      // 修复聊天消失：使用 MERGE（去重）替代 REPLACE
      // 之前直接用 server history 覆盖所有消息，导致断开重连时丢失断连期间发送的消息
      if (history && history.length > 0) {
        const myCode = playerProfileRef.current?.playerCode;
        const normalized = history.map((msg: any) => {
          const newMsg = normalizeServerMessage(msg);
          if (newMsg.senderId === myCode) {
            newMsg.senderName = playerProfileRef.current?.nickname || newMsg.senderName;
          }
          return newMsg;
        });
        console.log('[PRIVATE_ROOM] 规范化后历史消息样本（前3条）:', JSON.stringify(normalized.slice(0, 3)));
        setChatMessages(prev => {
          const merged = [...prev];
          for (const msg of normalized) {
            if (!merged.some(m => m.id === msg.id)) {
              merged.push(msg);
            }
          }
          console.log('[CHAT] private_room_joined 合并:', prev.length, '+', normalized.length, '=', merged.length, '最终消息IDs:', merged.slice(0, 5).map(m => m.id));
          return merged;
        });
      } else {
        console.log('[CHAT] private_room_joined: 无历史消息，保留现有', chatMessagesRef.current?.length || 0, '条');
      }
      setShowPrivateRoomModal(false);

      // 先处理同步数据，确保玩家分数等信息被正确设置
      if (syncData) {
        console.log('[PRIVATE_ROOM] 处理房间同步数据:', JSON.stringify(syncData));
        const currentSocketId = newSocket.id;
        const isFox = syncData.fox?.socketId === currentSocketId;
        const isBunny = syncData.bunny?.socketId === currentSocketId;

        // 设置玩家角色 - 优先使用 socketId 判断（实时连接场景）
        if (isFox && isBunny) {
          setPlayerRole('FOX'); // 单机模式
        } else if (isFox && playerRoleRef.current !== 'FOX') {
          setPlayerRole('FOX');
        } else if (isBunny && playerRoleRef.current !== 'BUNNY') {
          setPlayerRole('BUNNY');
        }

        // 根据 playerCode 判断角色（页面刷新/重连场景）- 使用 ref 避免 stale closure
        const savedProfile = localStorage.getItem('player_profile');
        let myPlayerCode = playerProfileRef.current?.playerCode;
        if (!myPlayerCode && savedProfile) {
          try {
            myPlayerCode = JSON.parse(savedProfile).playerCode;
            console.log('[PRIVATE_ROOM] 从 localStorage 获取 playerCode:', myPlayerCode);
          } catch (e) {
            console.error('[PRIVATE_ROOM] 解析保存的档案失败:', e);
          }
        }

        if (myPlayerCode) {
          if (syncData.fox?.playerCode === myPlayerCode) {
            setPlayerRole('FOX');
            console.log('[PRIVATE_ROOM] 检测到已登录角色：FOX (playerCode 匹配)');
          } else if (syncData.bunny?.playerCode === myPlayerCode) {
            setPlayerRole('BUNNY');
            console.log('[PRIVATE_ROOM] 检测到已登录角色：BUNNY (playerCode 匹配)');
          }
        }

        // 同步玩家数据（包括分数）
        setPlayers(prev => prev.map(p => {
          if (p.type === 'FOX' && syncData.fox) {
            return { ...p, ...syncData.fox, type: 'FOX' as const, isReady: syncData.foxReady ?? p.isReady };
          }
          if (p.type === 'BUNNY' && syncData.bunny) {
            return { ...p, ...syncData.bunny, type: 'BUNNY' as const, isReady: syncData.bunnyReady ?? p.isReady };
          }
          return p;
        }));
      }

      // 新架构：始终保持在 ROOM 状态（小窝），不自动恢复游戏界面
      // 但恢复游戏活跃状态，让用户可以点击游戏面板返回游戏
      if (gameState === 'playing') {
        setGameActive(true);
        setGameMode('forbidden');
        console.log('[PRIVATE_ROOM] 检测到游戏进行中，恢复 gameActive 状态');
      }
      setInSetup(false);

      // 保存房间信息到 localStorage，便于刷新后恢复
      localStorage.setItem('private_room_info', JSON.stringify({ roomId, password: privateRoomPassword }));
    });

    newSocket.on('private_room_error', (error: string) => {
      console.error('[PRIVATE_ROOM] 加入房间失败:', error);

      // 如果是 rejoin 失败且有保存的房间信息，fallback 到 join_private_room
      // 场景：房间被清空后，rejoin 因为角色不存在而拒绝，join 可以正常进入
      if (error.includes('不在表中') || error.includes('不是该房间的玩家') || error.includes('房间已满')) {
        const savedRoomInfo = localStorage.getItem('private_room_info');
        const savedProfile = localStorage.getItem('player_profile');
        if (savedRoomInfo && savedProfile) {
          try {
            const { roomId: savedRoomId, password } = JSON.parse(savedRoomInfo);
            console.log('[PRIVATE_ROOM] rejoin 失败，fallback 到 join_private_room:', savedRoomId);
            socket?.emit('join_private_room', { roomId: savedRoomId, password: password || '' });
            return; // 不显示错误，等 join 结果
          } catch (e) {
            console.error('[PRIVATE_ROOM] fallback 失败:', e);
          }
        }
      }

      // 提供更友好的错误提示
      let friendlyMsg = error;
      if (error === '你不是该房间的玩家' || error.includes('不是该房间的玩家')) {
        friendlyMsg = '⚠️ 无法加入房间：身份验证失败。\n\n可能原因：\n1. 您之前未选择角色（请先选择狐狸或兔子）\n2. 房间已满\n\n解决方法：请房主点击「清空房间」按钮，然后重新选择角色。';
      } else if (error.includes('房间已满')) {
        friendlyMsg = `⚠️ ${error}\n\n请房主点击「清空房间」后重试。`;
      } else if (error === '房间不存在') {
        friendlyMsg = '⚠️ 房间不存在，可能已被房主删除。';
      }
      alert(friendlyMsg);
      // 如果加入失败，回到房间选择界面
      setIsPrivateRoom(false);
      setShowPrivateRoomModal(false);
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

    // 排行榜数据
    newSocket.on('leaderboard', (data: any[]) => {
      console.log('[LEADERBOARD] 收到排行榜数据:', data.length, '人');
      setLeaderboard(data);
      // 打开荣誉室
      setShowHonorHall(true);
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

    // 信箱未读数量
    newSocket.on('mail_unread_count', (count: number) => {
      setUnreadMailCount(count);
    });

    // 玩家档案系统事件
    newSocket.on('login_result', (result: { success: boolean; player?: any; error?: string }) => {
      if (result.success && result.player) {
        setPlayerProfile(result.player);
        setIsLoggedIn(true); // 标记为已登录
        console.log('[PROFILE] 登录成功:', result.player);

        // 更新奶酪余额
        if (result.player.cheeseBalance !== undefined) {
          setMyCheeseCount(result.player.cheeseBalance);
        }
        if (result.player.carrotCount !== undefined) {
          setMyCarrotCount(result.player.carrotCount);
        }

        // 保存登录状态到 localStorage（以便刷新后自动重连）
        // 注意：passwordHash 在发送登录请求时使用，这里保存的是哈希值
        localStorage.setItem('player_profile', JSON.stringify({
          playerCode: result.player.playerCode,
          nickname: result.player.nickname,
          passwordHash: result.player.passwordHash // 服务器返回的密码哈希
        }));

        // 登录成功后，检查是否有保存的房间信息，有则尝试重连（仅在无待处理加入操作时）
        // 修复：移除重复的 rejoin_private_room，因为 connect 处理程序已经处理了自动重连
        // 之前两个处理程序都发射 rejoin，导致客户端收到两次 private_room_joined 事件
        if (!pendingJoinRoomActionRef.current) {
          const savedRoom = localStorage.getItem('private_room_info');
          if (savedRoom) {
            console.log('[PROFILE] 登录成功，房间已由 connect 处理程序自动重连，跳过重复 rejoin');
          }
        }

        // 加载全局聊天历史（Bug fix）- 仅在不在房间且无保存房间信息时加载
        // 使用 localStorage 检查（而非 roomIdRef.current）来避免闭包时效性问题
        // 有保存房间的用户会在 rejoin_private_room 后加载房间历史，不需要全局聊天
        const savedRoomCheck = localStorage.getItem('private_room_info');
        if (!savedRoomCheck && !roomIdRef.current) {
          newSocket.emit('get_global_chat');
        }

        // 加载聊天室配置和家具
        newSocket.emit('get_chat_room', { roomId: '' });

        // 加载玩家背包（获取已拥有家具）
        newSocket.emit('get_inventory', { playerCode: result.player.playerCode, itemType: 'FURNITURE' });
      }
    });

    newSocket.on('update_player_profile_result', (result: { success: boolean; error?: string; profile?: any }) => {
      if (result.success) {
        console.log('[PROFILE] 更新成功');
        // 更新本地玩家档案
        if (result.profile) {
          setPlayerProfile(result.profile);
        }
      } else {
        console.error('[PROFILE] 更新失败:', result.error);
      }
    });

    // 玩家个人资料更新广播
    newSocket.on('player_profile_updated', ({ playerCode, profile }: { playerCode: string; profile: any }) => {
      console.log('[PROFILE] 其他玩家更新资料:', playerCode);
      // 这里可以更新其他玩家的资料缓存
    });

    // 改名结果
    newSocket.on('change_nickname_result', (result: { success: boolean; error?: string; newNickname?: string }) => {
      if (result.success) {
        console.log('[PROFILE] 改名成功:', result.newNickname);
        // 更新本地玩家档案昵称
        setPlayerProfile((prev: any) => prev ? { ...prev, nickname: result.newNickname } : null);
        // 刷新排行榜以显示新昵称
        socket?.emit('get_leaderboard');
      } else {
        console.error('[PROFILE] 改名失败:', result.error);
      }
    });

    // 房主系统事件
    newSocket.on('room_members', (data: { roomId: string; members: any[]; ownerPlayerCode: string }) => {
      // 关键修复：使用 ref 获取最新的 roomId，避免闭包捕获旧值
      if (data.roomId === roomIdRef.current) {
        setRoomMembers(data.members);
        // 关键修复：使用 localStorage 兜底，避免 playerProfile 未加载时 isOwner 判断失败
        let myCode = playerProfileRef.current?.playerCode;
        if (!myCode) {
          try {
            const saved = localStorage.getItem('player_profile');
            if (saved) myCode = JSON.parse(saved).playerCode;
          } catch (e) { /* ignore */ }
        }
        setIsOwner(data.ownerPlayerCode === myCode);
        setIsAdmin(myCode === 'KADEGOU');
      }
    });

    newSocket.on('kick_player_result', (result: { success: boolean; error?: string }) => {
      if (result.success) {
        console.log('[ROOM_OWNER] 踢人成功');
        // 刷新成员列表
        socket?.emit('get_room_members', roomIdRef.current);
      } else {
        alert(result.error || '踢人失败');
      }
    });

    newSocket.on('player_kicked', ({ playerCode }) => {
      console.log('[ROOM_OWNER] 玩家被踢出:', playerCode);
      alert('玩家已被房主踢出房间');
      // 刷新成员列表
      socket?.emit('get_room_members', roomIdRef.current);
    });

    newSocket.on('kicked_from_room', ({ roomId: kickedRoomId, reason }) => {
      console.log('[KICKED] 你被踢出房间:', kickedRoomId, reason);
      alert(`你被房主踢出房间：${reason}`);
      // 强制离开房间
      setRoomId('');
      setIsPrivateRoom(false);
      setGameState(GameState.ROOM);
      setInSetup(false);
      localStorage.removeItem('private_room_info');
    });

    newSocket.on('ownership_transferred', ({ roomId: transferRoomId, newOwnerPlayerCode }) => {
      console.log('[TRANSFER] 房主已转让:', newOwnerPlayerCode);
      alert('房主已转让给 ' + (playerProfileRef.current?.playerCode === newOwnerPlayerCode ? '你' : '其他玩家'));
      // 刷新成员列表
      socket?.emit('get_room_members', roomIdRef.current);
    });

    newSocket.on('transfer_ownership_result', (result: { success: boolean; error?: string }) => {
      if (!result.success) {
        alert(result.error || '转让失败');
      }
    });

    // 你画我猜事件
    newSocket.on('draw_mode_switched', (data: any) => {
      console.log('[DRAW_GUESS] 切换到画板模式', data);
      setGameMode('draw-guess');
      setDrawRound(data);
      // 显示通知提示双方
      const drawerName = data?.drawerName || '对方';
      setDrawGameNotify(`🎨 ${drawerName} 启动了「你画我猜」游戏！`);
      setTimeout(() => setDrawGameNotify(''), 4000);
    });
    newSocket.on('draw_word', (data: any) => {
      console.log('[DRAW_GUESS] 收到词（仅画画者）');
      setDrawRound(prev => ({ ...prev, myWord: data.word }));
    });
    newSocket.on('draw_correct', (data: any) => {
      console.log(`[DRAW_GUESS] 猜对了！${data.guessedBy}`);
    });
    newSocket.on('draw_next_round', (round: any) => {
      console.log('[DRAW_GUESS] 新回合', round);
      setDrawRound(round);
    });
    newSocket.on('draw_game_ended', () => {
      console.log('[DRAW_GUESS] 游戏结束，返回禁语模式');
      setGameMode('forbidden');
      setDrawRound(null);
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
      newSocket.off('message_saved');
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
      newSocket.off('leaderboard');
      newSocket.off('birthday_effect');
      newSocket.off('login_result');
      newSocket.off('mail_unread_count');
      newSocket.off('update_player_profile_result');
      newSocket.off('change_nickname_result');
      newSocket.off('leaderboard_ranking');
      newSocket.off('room_members');
      newSocket.off('kick_player_result');
      newSocket.off('player_kicked');
      newSocket.off('kicked_from_room');
      newSocket.off('ownership_transferred');
      newSocket.off('transfer_ownership_result');
      newSocket.off('draw_mode_switched');
      newSocket.off('draw_word');
      newSocket.off('draw_correct');
      newSocket.off('draw_next_round');
      newSocket.off('draw_game_ended');
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

  // 从默认词库+自定义词库中随机选一个词
  const pickWordWithCustom = () => {
    const allWords = [...FORBIDDEN_WORDS, ...customWords];
    // 去重（相同 char 只保留一个，优先保留自定义词）
    const seen = new Set<string>();
    const uniqueWords: ForbiddenWord[] = [];
    // 先把自定义词加进去
    for (const w of customWords) {
      if (!seen.has(w.char)) {
        seen.add(w.char);
        uniqueWords.push(w);
      }
    }
    // 再把默认词加进去（已出现在自定义中的跳过）
    for (const w of FORBIDDEN_WORDS) {
      if (!seen.has(w.char)) {
        seen.add(w.char);
        uniqueWords.push(w);
      }
    }
    return uniqueWords[Math.floor(Math.random() * uniqueWords.length)];
  };

  const handleCreateRoom = () => {
    const roomId = 'R' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    socket?.emit('create_room', roomId);
  };

  const handleJoinRoom = (id: string) => {
    if (!id) return;
    socket?.emit('join_room', id);
  };

  // 进入某个游戏（从聊天室）
  const handleEnterGame = (game: 'forbidden' | 'draw-guess') => {
    if (!roomId) {
      // 没有房间，先创建/加入房间
      setShowRoomSelector(true);
      return;
    }
    // 你画我猜：从小窝进入直接开始游戏（不显示选角界面）
    if (game === 'draw-guess') {
      setGameMode('draw-guess');
      setInSetup(false);
      setGameActive(true);
      setGameState(GameState.PLAYING);
      socket?.emit('draw_game_start', { roomId });
      return;
    }
    // 禁语：如果游戏正在进行中（gameActive），无论当前 gameMode 是什么，都恢复到游戏
    if (gameActive) {
      setInSetup(false);
      setGameMode('forbidden');
      setGameState(GameState.PLAYING);
      return;
    }
    // 禁语：显示选角界面
    setGameMode(game);
    // 如果已经在选角状态，直接返回
    if (inSetup) {
      return;
    }
    // 显示选角界面（不影响 gameState 状态机，小窝流程保持 ROOM）
    setInSetup(true);
  };

  // 从小窝进入游戏
  const handleEnterGameFromChatRoom = (game: 'forbidden' | 'draw-guess') => {
    handleEnterGame(game);
  };

  // 从小窝返回游戏界面
  const handleBackToGameFromChatRoom = () => {
    if (gameActive) {
      setGameState(GameState.PLAYING);
    }
  };

  // 家具系统处理
  const handlePurchaseFurniture = (itemId: string) => {
    const item = FURNITURE_CATALOG.find(f => f.id === itemId);
    if (!item) return;
    if (myCheeseCount < item.cost) {
      alert('奶酪不足！');
      return;
    }
    if (ownedFurniture.includes(itemId)) {
      alert('已经拥有该家具！');
      return;
    }
    // 通过服务器购买（扣奶酪 + 添加家具）
    socket?.emit('purchase_furniture', { itemId, cost: item.cost });
  };

  const handlePlaceFurniture = (itemId: string) => {
    // 随机位置放置（后续可支持拖拽）
    const newFurniture = {
      id: `furniture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemId,
      x: Math.floor(Math.random() * 80) + 10,
      y: Math.floor(Math.random() * 60) + 20
    };
    const updated = [...placedFurniture, newFurniture];
    setPlacedFurniture(updated);
    socket?.emit('update_chat_room_furniture', { roomId: '', furniture: updated });
  };

  const handleRemoveFurniture = (furnitureId: string) => {
    const updated = placedFurniture.filter(f => f.id !== furnitureId);
    setPlacedFurniture(updated);
    socket?.emit('update_chat_room_furniture', { roomId: '', furniture: updated });
  };

  const handleStartGame = () => {
    const randomWord = pickWordWithCustom();
    socket?.emit('start_game', { roomId, word: randomWord, punishments: punishmentBanks });
    setSessionWord(randomWord);
    setInSetup(false);
    setGameActive(true);
    setGameState(GameState.TRANSITION);
  };

  const handlePlayerReady = (player: Player, extraWords: ForbiddenWord[], customPunishments: PunishmentBanks, hasSpecificChars = false) => {
    hasSpecificCharsRef.current = hasSpecificChars;
    // 直接更新 customWordsRef，确保 both_ready 时能立即访问到
    if (hasSpecificChars) {
      // 特定字模式：只使用特定字
      customWordsRef.current = extraWords;
    } else {
      // 普通模式：合并到现有词库（去重）
      const combined = [...customWordsRef.current, ...extraWords];
      const seen = new Set<string>();
      customWordsRef.current = combined.filter(w => {
        if (seen.has(w.char)) return false;
        seen.add(w.char);
        return true;
      });
    }
    // 检查是否已登录档案
    if (!playerProfile) {
      console.log('[PROFILE] 未登录，先打开档案登录框');
      setShowProfileModal(true);
      // 保存待处理的角色选择，登录后继续
      setPendingReadyAction({ player, extraWords, customPunishments, hasSpecificChars });
      return;
    }

    const newPlayers = players.map(p => p.type === player.type ? player : p);
    setPlayers(newPlayers);

    const mergedPunishments = {
      truths: Array.from(new Set([...TRUTH_PUNISHMENTS, ...customPunishments.truths])),
      dares: Array.from(new Set([...DARE_PUNISHMENTS, ...customPunishments.dares]))
    };
    setPunishmentBanks(mergedPunishments);

    const role = player.type === 'FOX' ? 'fox' : 'bunny';

    // 使用完整的档案数据（已登录）
    const playerWithProfile = {
      ...player,
      playerCode: playerProfile.playerCode,
      nickname: playerProfile.nickname
    };

    socket?.emit('select_role', { roomId, role, player: playerWithProfile });
    socket?.emit('player_ready', { roomId, role });
    socket?.emit('game_message', { roomId, message: { type: 'UPDATE_PLAYER', player: playerWithProfile } });
    socket?.emit('game_message', { roomId, message: { type: 'SYNC_BANKS', extraWords, punishments: mergedPunishments } });
  };

  // 待处理的角色选择动作
  const [pendingReadyAction, setPendingReadyAction] = useState<{
    player: Player;
    extraWords: ForbiddenWord[];
    customPunishments: PunishmentBanks;
    hasSpecificChars?: boolean;
  } | null>(null);

  // 登录成功后执行待处理的操作
  const handleProfileLoaded = (profile: any) => {
    setPlayerProfile(profile);
    setShowProfileModal(false);
    setIsLoggedIn(true);
    console.log('[PROFILE] 档案已加载:', profile);

    // 如果有待处理的加入房间操作，登录后继续执行
    if (pendingJoinRoomAction) {
      console.log('[PROFILE] 执行待处理的加入房间操作');
      const { roomId, password } = pendingJoinRoomAction;
      setPendingJoinRoomAction(null);
      socket?.emit('join_private_room', { roomId, password });
      return;
    }

    // 如果有待处理的角色选择，登录后继续执行
    if (pendingReadyAction) {
      console.log('[PROFILE] 执行待处理的角色选择');
      const { player, extraWords, customPunishments, hasSpecificChars } = pendingReadyAction;
      hasSpecificCharsRef.current = hasSpecificChars || false;
      // 直接更新 customWordsRef（原理同上）
      if (hasSpecificChars) {
        customWordsRef.current = extraWords;
      } else {
        const combined = [...customWordsRef.current, ...extraWords];
        const seen = new Set<string>();
        customWordsRef.current = combined.filter(w => {
          if (seen.has(w.char)) return false;
          seen.add(w.char);
          return true;
        });
      }
      setPendingReadyAction(null);

      const newPlayers = players.map(p => p.type === player.type ? player : p);
      setPlayers(newPlayers);

      const mergedPunishments = {
        truths: Array.from(new Set([...TRUTH_PUNISHMENTS, ...customPunishments.truths])),
        dares: Array.from(new Set([...DARE_PUNISHMENTS, ...customPunishments.dares]))
      };
      setPunishmentBanks(mergedPunishments);

      const role = player.type === 'FOX' ? 'fox' : 'bunny';
      const playerWithProfile = {
        ...player,
        playerCode: profile.playerCode,
        nickname: profile.nickname
      };

      socket?.emit('select_role', { roomId, role, player: playerWithProfile });
      socket?.emit('player_ready', { roomId, role });
      socket?.emit('game_message', { roomId, message: { type: 'UPDATE_PLAYER', player: playerWithProfile } });
      socket?.emit('game_message', { roomId, message: { type: 'SYNC_BANKS', extraWords, punishments: mergedPunishments } });
      return;
    }

    // 页面刷新场景：检查是否有保存的房间信息，有则自动重新加入
    const savedRoomInfo = localStorage.getItem('private_room_info');
    if (savedRoomInfo && !roomId) {
      try {
        const { roomId: savedRoomId, password } = JSON.parse(savedRoomInfo);
        if (savedRoomId) {
          console.log('[PROFILE] 检测到已保存的房间信息，自动重新加入:', savedRoomId);
          socket?.emit('rejoin_private_room', { roomId: savedRoomId, playerCode: profile.playerCode });
          // 密码在 join_private_room 时使用，rejoin 不需要密码
          return;
        }
      } catch (e) {
        console.error('[PROFILE] 解析保存的房间信息失败:', e);
        localStorage.removeItem('private_room_info');
      }
    }
  };

  const handleUpdateScore = (id: number, delta: number) => {
    // 游客模式下禁止修改分数
    if (!canInteract) {
      alert('⚠️ 游客模式无法修改分数，请先登录档案！');
      setShowProfileModal(true);
      return;
    }
    // 非游戏用户禁止修改分数
    if (!isGamePlayer) {
      alert('⚠️ 您不是当前游戏的玩家，无法修改分数。请联系房主重新开始游戏。');
      return;
    }
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

  // 使用大便特效
  const handleUsePoop = () => {
    if (!socket || !roomId) return;
    if (!canInteract) {
      alert('⚠️ 游客模式无法使用特效，请先登录档案！');
      return;
    }
    // 发送 USE_EFFECT 消息
    socket?.emit('game_message', {
      roomId,
      message: {
        type: 'USE_EFFECT',
        effectId: 'poop-classic',
        targetType: 'OPPONENT'
      }
    });
    // 本地也触发效果
    const newEffect = { id: Date.now(), type: 'poop', emoji: '💩' };
    setTimedEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setTimedEffects(prev => prev.filter(e => e.id !== newEffect.id));
    }, 2000);
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
    if (!socket) return;

    // 游客模式下禁止聊天
    if (!isLoggedIn) {
      alert('⚠️ 请先登录档案再发送消息');
      setShowProfileModal(true);
      return;
    }

    // 处理引用消息
    let quoteData = undefined;
    let actualContent = content;

    try {
      const parsed = JSON.parse(content);
      if (parsed.text && parsed.quote) {
        actualContent = parsed.text;
        quoteData = {
          senderId: parsed.quote.senderId,
          senderName: parsed.quote.senderName,
          senderRole: parsed.quote.senderRole,
          content: parsed.quote.content,
          type: parsed.quote.type
        };
      }
    } catch (e) {
      // 不是引用消息，使用原始内容
    }

    const senderId = playerProfile?.playerCode || socket.id;
    const senderName = playerProfile?.nickname || '玩家';

    // 使用 player-scoped 的 roomId（绑定档案），不在房间时使用 "global"
    const targetRoomId = roomId || 'global';

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId,
      senderName,
      senderRole: playerRole || undefined,
      content: actualContent,
      type,
      timestamp: Date.now(),
      quote: quoteData
    };

    console.log('[CHAT] 发送消息:', message);

    // 先本地添加消息（立即显示）
    setChatMessages(prev => [...prev, message]);

    // 发送到服务器
    socket.emit('chat_message', { roomId: targetRoomId, message });
  };

  // 私密房间处理函数
  const handleCreatePrivateRoom = (roomId: string, password: string) => {
    socket?.emit('create_private_room', { roomId, password });
  };

  const handleJoinPrivateRoom = (roomId: string, password: string) => {
    console.log('[JOIN_PRIVATE_ROOM] 尝试加入房间:', roomId, 'playerProfile:', playerProfile);

    // 没有档案：显示登录框
    if (!playerProfile) {
      console.log('[PROFILE] 未登录，先打开档案登录框');
      setShowProfileModal(true);
      setPendingJoinRoomAction({ roomId, password });
      return;
    }

    // 自动登录进行中：不弹框，等登录完成后自动处理
    if (playerProfile.loading) {
      console.log('[PROFILE] 自动登录进行中，等待完成后加入房间');
      setPendingJoinRoomAction({ roomId, password });
      return;
    }

    // 已登录，直接加入房间
    console.log('[JOIN_PRIVATE_ROOM] 已登录，加入房间:', roomId);
    socket?.emit('join_private_room', { roomId, password });
  };

  // 待处理的加入房间操作
  const [pendingJoinRoomAction, setPendingJoinRoomAction] = useState<{
    roomId: string;
    password: string;
  } | null>(null);
  const pendingJoinRoomActionRef = useRef<{ roomId: string; password: string } | null>(null);
  useEffect(() => {
    pendingJoinRoomActionRef.current = pendingJoinRoomAction;
  }, [pendingJoinRoomAction]);

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

  // 房主系统处理函数
  const handleOpenRoomOwnerPanel = () => {
    if (roomId && isPrivateRoom) {
      socket?.emit('get_room_members', roomId);
      setShowRoomManagement(true);
    }
  };

  const handleKickPlayer = (playerCode: string) => {
    if (confirm(`确定要踢出玩家 ${playerCode} 吗？`)) {
      socket?.emit('kick_player', { roomId, playerCode });
    }
  };

  const handleTransferOwnership = (newOwnerPlayerCode: string) => {
    if (confirm(`确定要将房主转让给 ${newOwnerPlayerCode} 吗？转让后你将失去房主权限。`)) {
      socket?.emit('transfer_ownership', { roomId, newOwnerPlayerCode });
    }
  };

  // 生日动画处理
  const handleStartBirthdayAnimation = () => {
    if (birthdayAnimationStarted) return;
    setBirthdayAnimationStarted(true);
    console.log('[BIRTHDAY] 开始生日动画！');

    // 启动电影相框画廊
    setShowBirthdayGallery(true);
  };

  const handleBirthdayGalleryComplete = () => {
    console.log('[BIRTHDAY] 电影画廊完成！');
    setShowBirthdayGallery(false);
    setShowBirthdayEffect(false);
    setBirthdayAnimationStarted(false);
  };

  const handleSkipBirthdayGallery = () => {
    console.log('[BIRTHDAY] 跳过生日画廊！');
    setShowBirthdayGallery(false);
    setShowBirthdayEffect(false);
    setBirthdayAnimationStarted(false);
  };

  const handleOpenArchiveRoom = () => {
    if (playerProfile) {
      setShowArchiveRoom(true);
    } else {
      setShowProfileModal(true);
    }
  };

  // 登出处理
  const handleLogout = () => {
    // 清除本地保存的登录状态
    localStorage.removeItem('player_profile');
    // 清除保存的房间信息（因为已经退出了）
    localStorage.removeItem('private_room_info');
    // 清空本地状态
    setPlayerProfile(null);
    // 关闭档案室
    setShowArchiveRoom(false);
    // 重置游戏状态到初始房间选择界面
    setGameState(GameState.ROOM);
    setInSetup(false);
    setRoomId('');
    setIsPrivateRoom(false);
    setRoomBgImage('');
    setChatMessages([]);
    setPlayers([
      { id: 1, name: '', score: 0, type: 'FOX', isReady: false },
      { id: 2, name: '', score: 0, type: 'BUNNY', isReady: false },
    ]);
    setPlayerRole(null);
    console.log('[PROFILE] 已退出登录');
  };

  // 退出房间/返回主页（保持登录状态）
  // 新架构：退出后回到聊天室（ROOM 状态），保留房间信息
  const handleExitRoom = () => {
    // 私密房间，通知服务器
    if (isPrivateRoom && roomId) {
      socket?.emit('leave_private_room', { roomId });
      console.log('[EXIT_ROOM] 请求离开私密房间:', roomId);
    }

    // 回到聊天室（ROOM 状态），保留 roomId 以便聊天
    setGameState(GameState.ROOM);
    setInSetup(false);
    // 保留 roomId（聊天室仍然需要）
    setIsPrivateRoom(false);
    setRoomBgImage('');
    // 不清空聊天消息 - 新架构要求聊天内容在任何房间状态下都保留
    setPlayers([
      { id: 1, name: '', score: 0, type: 'FOX', isReady: false },
      { id: 2, name: '', score: 0, type: 'BUNNY', isReady: false },
    ]);
    setPlayerRole(null);
    localStorage.removeItem('private_room_info');
    console.log('[EXIT_ROOM] 已离开房间');
  };

  // 监听离开房间结果
  useEffect(() => {
    if (!socket) return;

    const handleLeaveResult = (result: { success: boolean; error?: string }) => {
      if (result.success) {
        console.log('[EXIT_ROOM] 已成功离开房间');
        // 回到聊天室（ROOM 状态），保留 roomId 以便聊天
        setGameState(GameState.ROOM);
        setInSetup(false);
        // 保留 roomId
        setIsPrivateRoom(false);
        setRoomBgImage('');
        // 不清空聊天消息 - 新架构要求聊天内容在任何房间状态下都保留
        setPlayers([
          { id: 1, name: '', score: 0, type: 'FOX', isReady: false },
          { id: 2, name: '', score: 0, type: 'BUNNY', isReady: false },
        ]);
        setPlayerRole(null);
        // 清除本地保存的房间信息
        localStorage.removeItem('private_room_info');
      } else {
        alert(result.error || '离开房间失败');
      }
    };

    socket.on('leave_private_room_result', handleLeaveResult);

    return () => {
      socket.off('leave_private_room_result', handleLeaveResult);
    };
  }, [socket]);

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

  const handleToggleDecoration = () => {
    setDecorationMode(!decorationMode);
  };

  const handleOpenFurnitureShop = () => {
    setShowFurnitureShop(true);
  };

  // 进入房间时获取胡萝卜数量
  useEffect(() => {
    if (roomId && socket?.connected && playerProfile?.playerCode) {
      socket.emit('get_my_carrots');
      // 同时获取奶酪余额
      socket.emit('get_cheese_summary', playerProfile.playerCode);
    }
  }, [roomId, socket, playerProfile]);

  // 加载全局聊天历史（不在房间时，已登录则加载）
  useEffect(() => {
    if (socket?.connected && playerProfile && !roomId) {
      socket.emit('get_global_chat');
    }
  }, [playerProfile, roomId, socket]);

  // 监听奶酪余额
  useEffect(() => {
    if (!socket) return;

    const handleCheeseSummary = (data: { cheeseBalance: number; cheeseDeposits: number; cheeseLoans: number; carrotCount: number }) => {
      setMyCheeseCount(data.cheeseBalance);
      setMyCarrotCount(data.carrotCount);
    };

    socket.on('cheese_summary', handleCheeseSummary);

    const handleDailyClaimed = (data: { amount: number; balance: number }) => {
      setMyCheeseCount(data.balance);
      setDailyClaimed(true);
      setDailyClaimMsg('✅ 签到成功！+1 🧀');
      setTimeout(() => setDailyClaimMsg(''), 3000);
    };
    const handleCheeseError = (err: any) => {
      const msg = typeof err === 'string' ? err : err?.error || '';
      if (msg.includes('已签到') || msg.includes('已领取')) {
        setDailyClaimed(true);
        setDailyClaimMsg('📅 今天已签到');
      } else {
        setDailyClaimMsg('⚠️ ' + msg);
      }
      setTimeout(() => setDailyClaimMsg(''), 3000);
    };

    socket.on('daily_cheese_claimed', handleDailyClaimed);
    socket.on('cheese_error', handleCheeseError);

    return () => {
      socket.off('cheese_summary', handleCheeseSummary);
      socket.off('daily_cheese_claimed', handleDailyClaimed);
      socket.off('cheese_error', handleCheeseError);
    };
  }, [socket]);

  // 当 gameState 变回 ROOM 时，清除私密房间游戏状态（但保留 roomId 用于聊天）
  useEffect(() => {
    if (gameState === GameState.ROOM && isPrivateRoom) {
      console.log('[PROFILE] 用户已退出私密房间游戏，清除游戏状态');
      localStorage.removeItem('private_room_info');
      setIsPrivateRoom(false);
      // 保留 roomId（聊天室仍然需要）
      setRoomBgImage('');
      // 不清空聊天消息 - 新架构要求聊天内容在任何房间状态下都保留
    }
  }, [gameState]);

  // 进入房间时清空聊天消息（仅公共房间）- 新架构：ROOM 状态是聊天室，不清空
  // useEffect(() => {
  //   if (gameState === GameState.ROOM && !isPrivateRoom) {
  //     setChatMessages([]);
  //   }
  // }, [gameState, isPrivateRoom]);

  const loser = players[0].score > players[1].score ? players[0] : players[1].score > players[0].score ? players[1] : null;

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-100 overflow-hidden relative bg-[#f8fafc]">
      {/* 全局顶部导航栏 */}
      <GlobalNavBar
        roomId={roomId}
        isPrivateRoom={isPrivateRoom}
        gameState={gameState}
        inSetup={inSetup}
        playerProfile={playerProfile}
        myCarrotCount={myCarrotCount}
        myCheeseCount={myCheeseCount}
        unreadMailCount={unreadMailCount}
        showSidebar={showSidebar}
        decorationMode={decorationMode}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleDecoration={handleToggleDecoration}
        onOpenRoomManagement={handleOpenRoomOwnerPanel}
        onOpenRoomSelector={() => setShowRoomSelector(true)}
        onOpenPrivateRoom={() => setShowPrivateRoomModal(true)}
        onExitRoom={handleExitRoom}
        onOpenMailBox={() => setShowMailBox(true)}
        onOpenHonorHall={handleOpenHonorHall}
        onOpenArchiveRoom={handleOpenArchiveRoom}
        onOpenFurnitureShop={handleOpenFurnitureShop}
        onSettle={handleSettle}
        onStartDrawGuess={() => socket?.emit('draw_game_start', { roomId })}
        onClearRoom={playerProfile?.playerCode === 'KADEGOU' ? () => {
          if (confirm('⚠️ KADEGOU 超级管理员：确认清空房间所有角色？')) {
            socket?.emit('clear_room_roles', { roomId, playerCode: playerProfile.playerCode });
          }
        } : undefined}
      />

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

      {/* 信箱弹窗 */}
      {playerProfile && showMailBox && (
        <MailBox
          socket={socket}
          playerCode={playerProfile.playerCode}
          isOpen={showMailBox}
          onOpen={() => {
            setShowMailBox(true);
            socket?.emit('get_notifications');
          }}
          onClose={() => setShowMailBox(false)}
          unreadCount={unreadMailCount}
          onRequestUnreadCount={() => socket?.emit('get_unread_notification_count')}
          onRequestNotifications={() => socket?.emit('get_notifications')}
        />
      )}

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

      {/* 生日祝福弹窗 - 初始点击开始 */}
      {showBirthdayEffect && !birthdayAnimationStarted && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => handleStartBirthdayAnimation()}>
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

      {/* 生日电影相框画廊 */}
      {showBirthdayGallery && (
        <BirthdayGallery onComplete={handleBirthdayGalleryComplete} onSkip={handleSkipBirthdayGallery} />
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

      {/* 小窝场景主内容区 */}
      <div className="flex-1 relative">
        <ChatRoom
          playerProfile={playerProfile}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          mySocketId={mySocketId}
          myPlayerCode={playerProfile?.playerCode || null}
          isConnected={socket?.connected || false}
          roomId={roomId}
          isPrivateRoom={isPrivateRoom}
          roomTheme={roomTheme}
          onThemeChange={setRoomTheme}
          themes={chatRoomThemes}
          onEnterGame={handleEnterGameFromChatRoom}
          isOwner={isOwner}
          isAdmin={playerProfile?.playerCode === 'KADEGOU'}
          decorationMode={decorationMode}
          onToggleDecoration={handleToggleDecoration}
          myCheeseCount={myCheeseCount}
          onOpenFurnitureShop={handleOpenFurnitureShop}
          playerRole={playerRole}
          gameActive={gameState === GameState.PLAYING}
          gameMode={gameMode}
          sessionWord={sessionWord}
          players={players}
          onBackToGame={handleBackToGameFromChatRoom}
          placedFurniture={placedFurniture}
          onPlaceFurniture={handlePlaceFurniture}
          onRemoveFurniture={handleRemoveFurniture}
          ownedFurniture={ownedFurniture}
          notificationEnabled={notificationEnabled}
          onToggleNotification={() => setNotificationEnabled(!notificationEnabled)}
        />
      </div>

      {/* 侧边栏 - 个人功能菜单（固定左侧，可收起） */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-[400] bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${
          showSidebar ? 'w-80 opacity-100' : 'w-0 opacity-0'
        } overflow-hidden pointer-events-auto`}
      >
        <div className="w-80 h-full flex flex-col pt-16">
          {/* 侧边栏头部 - 用户信息 */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 relative">
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowSidebar(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white font-bold transition-all"
              title="收起菜单"
            >
              ✕
            </button>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                {playerProfile ? '👤' : '🎭'}
              </div>
              <div>
                <div className="text-white font-black text-lg">
                  {playerProfile ? playerProfile.nickname : '游客模式'}
                </div>
                <div className="text-indigo-200 text-sm">
                  {playerProfile ? playerProfile.playerCode : '登录后享受完整功能'}
                </div>
              </div>
            </div>
          </div>

          {/* 奶酪余额显示 */}
          {playerProfile && (
            <div className="px-4 pt-3">
              <div className="bg-yellow-500/15 rounded-2xl px-4 py-3 flex items-center justify-between border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧀</span>
                  <span className="text-yellow-300 font-bold text-sm">奶酪</span>
                </div>
                <span className="text-yellow-300 font-black text-lg">{myCheeseCount}</span>
              </div>
            </div>
          )}

          {/* 侧边栏菜单项 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => {
                setShowSidebar(false);
                setTimeout(() => {
                  if (playerProfile) {
                    setShowArchiveRoom(true);
                  } else {
                    setShowProfileModal(true);
                  }
                }, 300);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left"
            >
              <span className="text-3xl">🆔</span>
              <div>
                <div className="text-white font-bold">我的档案</div>
                <div className="text-slate-400 text-xs">查看和编辑个人信息</div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowSidebar(false);
                setTimeout(() => setShowCheeseBank(true), 300);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left"
            >
              <span className="text-3xl">🏛️</span>
              <div>
                <div className="text-white font-bold">奶酪央行</div>
                <div className="text-slate-400 text-xs">存款、贷款、OMO 机制</div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowSidebar(false);
                if (playerProfile) {
                  setTimeout(() => {
                    socket?.emit('get_pet_status', playerProfile.playerCode);
                    setShowPetPanel(true);
                  }, 300);
                } else {
                  setTimeout(() => setShowProfileModal(true), 300);
                }
              }}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left"
            >
              <span className="text-3xl">🐾</span>
              <div>
                <div className="text-white font-bold">我的宠物</div>
                <div className="text-slate-400 text-xs">孵化、喂养电子宠物</div>
              </div>
            </button>

            <button
              onClick={() => {
                if (!playerProfile) {
                  setShowSidebar(false);
                  setTimeout(() => setShowProfileModal(true), 300);
                  return;
                }
                socket?.emit('claim_daily_cheese', { playerCode: playerProfile.playerCode });
              }}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left relative"
            >
              <span className="text-3xl">📅</span>
              <div>
                <div className="text-white font-bold">
                  每日签到
                  {dailyClaimed && <span className="ml-2 text-xs text-green-400">已签到</span>}
                </div>
                <div className="text-slate-400 text-xs">每日签到领取 1 🧀</div>
              </div>
              {dailyClaimMsg && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold whitespace-nowrap">
                  {dailyClaimMsg}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowSidebar(false);
                setTimeout(() => handleOpenEffectShop(), 300);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left"
            >
              <span className="text-3xl">🏪</span>
              <div>
                <div className="text-white font-bold">特效商店</div>
                <div className="text-slate-400 text-xs">购买和解锁特效</div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowSidebar(false);
                setTimeout(() => handleOpenHonorHall(), 300);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left"
            >
              <span className="text-3xl">🏆</span>
              <div>
                <div className="text-white font-bold">荣誉堂</div>
                <div className="text-slate-400 text-xs">查看排行榜和成就</div>
              </div>
            </button>

            {!playerProfile && (
              <button
                onClick={() => {
                  setShowSidebar(false);
                  setTimeout(() => setShowProfileModal(true), 300);
                }}
                className="w-full flex items-center gap-4 px-4 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl transition-all text-left shadow-lg"
              >
                <span className="text-3xl">🔓</span>
                <div>
                  <div className="text-white font-bold">登录档案</div>
                  <div className="text-indigo-200 text-xs">解锁完整功能</div>
                </div>
              </button>
            )}
          </div>

          {/* 侧边栏底部 - 退出登录 */}
          {playerProfile && (
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowSidebar(false);
                  setTimeout(() => handleLogout(), 300);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all text-left"
              >
                <span className="text-2xl">🚪</span>
                <span className="text-slate-300 font-bold">退出登录</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {gameState === GameState.ROOM && roomId && !inSetup && (
        <div className={`fixed inset-0 transition-all duration-300 ease-in-out ${
          showSidebar ? 'ml-80' : 'ml-0'
        }`}>
          <ChatRoom
          playerProfile={playerProfile}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          mySocketId={mySocketId}
          myPlayerCode={playerProfile?.playerCode || null}
          isConnected={!!socket?.connected}
          roomId={roomId}
          isPrivateRoom={isPrivateRoom}
          roomTheme={roomTheme}
          onThemeChange={setRoomTheme}
          themes={chatRoomThemes}
          onEnterGame={handleEnterGame}
          isOwner={isOwner}
          isAdmin={isAdmin}
          decorationMode={decorationMode}
          onToggleDecoration={() => setDecorationMode(!decorationMode)}
          myCheeseCount={myCheeseCount}
          onOpenFurnitureShop={() => setShowFurnitureShop(true)}
          playerRole={playerRole}
          gameActive={gameActive}
          gameMode={gameMode}
          sessionWord={sessionWord}
          players={players}
          onBackToGame={() => setGameState(GameState.PLAYING)}
          placedFurniture={placedFurniture}
          onPlaceFurniture={handlePlaceFurniture}
          onRemoveFurniture={handleRemoveFurniture}
          ownedFurniture={ownedFurniture}
          notificationEnabled={notificationEnabled}
          onToggleNotification={() => setNotificationEnabled(!notificationEnabled)}
        />
        </div>
      )}

      {/* 家具商城模态框 */}
      {showFurnitureShop && (
        <FurnitureShop
          catalog={FURNITURE_CATALOG}
          ownedItems={ownedFurniture}
          placedFurniture={placedFurniture}
          myCheeseCount={myCheeseCount}
          onPurchase={handlePurchaseFurniture}
          onPlace={handlePlaceFurniture}
          onRemove={handleRemoveFurniture}
          onClose={() => setShowFurnitureShop(false)}
        />
      )}

      {/* 房间选择器模态框 */}
      {showRoomSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRoomSelector(false)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6 text-center">
              <button
                onClick={() => setShowRoomSelector(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
              >
                ✕
              </button>
              <div className="text-5xl mb-2">🏠</div>
              <h2 className="text-2xl font-black text-white">创建或加入房间</h2>
              <p className="text-indigo-100 text-sm mt-1">输入房间号开始游戏对战</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={32}
                  placeholder="输入房间号（如：love-abc）"
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-lg font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (input.value.trim()) {
                        handleJoinRoom(input.value.trim());
                        setShowRoomSelector(false);
                      }
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="输入房间号（如：love-abc）"]') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleJoinRoom(input.value.trim());
                    setShowRoomSelector(false);
                  }
                }}
                className="w-full py-4 bg-slate-900 text-white font-black text-xl rounded-xl hover:bg-black transition-all shadow-xl"
              >
                加入房间
              </button>
              <button
                onClick={() => {
                  handleCreateRoom();
                  setShowRoomSelector(false);
                }}
                className="w-full py-4 bg-indigo-600 text-white font-black text-xl rounded-xl hover:bg-indigo-700 transition-all shadow-xl"
              >
                快速创建房间
              </button>
              <button
                onClick={() => {
                  setShowRoomSelector(false);
                  setShowPrivateRoomModal(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xl rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-xl"
              >
                🔐 私密房间
              </button>
            </div>
          </div>
        </div>
      )}

      {inSetup && (
        <SetupScreen
          players={players}
          onPlayerReady={handlePlayerReady}
          onStartGame={handleStartGame}
          canStart={players.every(p => p.isReady)}
          playerRole={playerRole}
          playerProfile={playerProfile}
          socket={socket}
          roomId={roomId}
          isOwner={isOwner}
          onBackToNest={() => { setInSetup(false); }}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          mySocketId={mySocketId}
          myPlayerCode={playerProfile?.playerCode || null}
          notificationEnabled={notificationEnabled}
          onToggleNotification={() => setNotificationEnabled(!notificationEnabled)}
        />
      )}

      {gameState === GameState.TRANSITION && (
        <TransitionOverlay
          word={sessionWord.char}
          onComplete={() => setGameState(GameState.PLAYING)}
        />
      )}

      {/* 你画我猜启动通知 */}
      {drawGameNotify && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-full shadow-2xl font-black text-lg">
            {drawGameNotify}
          </div>
        </div>
      )}

      {/* 桌面宠物 */}
      {playerProfile && (
        <PetDesktop playerCode={playerProfile.playerCode} socket={socket} />
      )}

      {/* 禁语游戏进行中 - 全屏覆盖 */}
      {gameState === GameState.PLAYING && !drawRound && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[400] bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
          {/* 顶部返回小窝按钮 - 统一唯一入口 */}
          <div className="sticky top-0 z-50 flex justify-center py-4 bg-gradient-to-b from-white to-transparent">
            <button
              onClick={() => setGameState(GameState.ROOM)}
              className="group relative px-8 py-4 rounded-[50px] overflow-hidden transition-all duration-500 hover:scale-110 active:scale-95 shadow-[0_8px_32px_rgba(138,43,226,0.4)] hover:shadow-[0_12px_48px_rgba(138,43,226,0.6)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-300 to-cyan-400 opacity-0 group-hover:opacity-30 transition-opacity animate-pulse" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                <div className="absolute top-3 right-4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              </div>
              <span className="relative z-10 flex items-center gap-3 text-white font-black text-lg drop-shadow-lg">
                <span className="text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🏰</span>
                <span className="tracking-wide">返回魔法小窝</span>
                <span className="text-xl">✨</span>
              </span>
              <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* 游戏内容区 */}
          <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
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

          {/* 分数板和禁语字 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-3 lg:sticky lg:top-8 order-2 lg:order-1">
              <ScoreBoard player={players[0]} onUpdateScore={handleUpdateScore} canInteract={canInteract} onUsePoop={handleUsePoop} />
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              {/* 聊天框 - 放在尼克和朱迪之间 */}
              <div className="max-w-xl mx-auto">
                <ChatBox
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isConnected={!!socket?.connected}
                  mySocketId={mySocketId}
                  myPlayerCode={playerProfile?.playerCode || null}
                  onClearHistory={isPrivateRoom ? handleClearChatHistory : undefined}
                  chatFontSize={chatFontSize}
                  chatFontColor={chatFontColor}
                  chatBgImage={chatBgImage}
                  onFontChange={setChatFontSize}
                  onFontColorChange={setChatFontColor}
                  onBgChange={setChatBgImage}
                  notificationEnabled={notificationEnabled}
                  canInteract={canInteract}
                  onToggleNotification={() => {
                    if (notificationEnabled) {
                      setNotificationEnabled(false);
                    } else {
                      if (!('Notification' in window)) {
                        alert('您的浏览器不支持桌面通知');
                        return;
                      }
                      if (Notification.permission === 'denied') {
                        alert('通知权限已被拒绝。\n\n请点击地址栏左侧的 🔒 图标 → 找到「通知」权限 → 选择「允许」→ 刷新页面');
                        return;
                      }
                      if (Notification.permission === 'granted') {
                        setNotificationEnabled(true);
                      } else {
                        Notification.requestPermission().then(perm => {
                          if (perm === 'granted') {
                            setNotificationEnabled(true);
                            alert('🔔 通知已开启！最小化浏览器后也能收到新消息弹窗。');
                          } else {
                            alert('通知权限被拒绝。请点击地址栏左侧的 🔒 图标，允许通知权限后重试。');
                          }
                        });
                      }
                    }
                  }}
                />
              </div>
              {/* 禁语字卡片 - 放在下方 */}
              <ForbiddenWordCard word={sessionWord} />
            </div>
            <div className="lg:col-span-3 lg:sticky lg:top-8 order-3">
              <ScoreBoard player={players[1]} onUpdateScore={handleUpdateScore} canInteract={canInteract} onUsePoop={handleUsePoop} />
            </div>
          </div>
          </div>
        </div>
      )}

      {/* 你画我猜游戏进行中 - 全屏覆盖 */}
      {gameState === GameState.PLAYING && drawRound && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[400] bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
          {/* 顶部返回小窝按钮 */}
          <div className="sticky top-0 z-50 flex justify-center py-4 bg-gradient-to-b from-white to-transparent">
            <button
              onClick={() => setGameState(GameState.ROOM)}
              className="group relative px-8 py-4 rounded-[50px] overflow-hidden transition-all duration-500 hover:scale-110 active:scale-95 shadow-[0_8px_32px_rgba(138,43,226,0.4)] hover:shadow-[0_12px_48px_rgba(138,43,226,0.6)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-300 to-cyan-400 opacity-0 group-hover:opacity-30 transition-opacity animate-pulse" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                <div className="absolute top-3 right-4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              </div>
              <span className="relative z-10 flex items-center gap-3 text-white font-black text-lg drop-shadow-lg">
                <span className="text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🏰</span>
                <span className="tracking-wide">返回魔法小窝</span>
                <span className="text-xl">✨</span>
              </span>
              <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* 游戏内容区 */}
          <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 画板区域 */}
            <div className="lg:col-span-2">
              <DrawGuessGame
                socket={socket}
                roomId={roomId}
                playerRole={playerRole}
                playerProfile={playerProfile}
                players={players}
                onBack={() => {
                  setGameMode('forbidden');
                  setDrawRound(null);
                }}
                drawRound={drawRound}
                onRoundUpdate={(round: any) => setDrawRound(round)}
              />
            </div>
            {/* 聊天框 */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <ChatBox
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isConnected={!!socket?.connected}
                  mySocketId={mySocketId}
                  myPlayerCode={playerProfile?.playerCode || null}
                  onClearHistory={isPrivateRoom ? handleClearChatHistory : undefined}
                  chatFontSize={chatFontSize}
                  chatFontColor={chatFontColor}
                  chatBgImage={chatBgImage}
                  onFontChange={setChatFontSize}
                  onFontColorChange={setChatFontColor}
                  onBgChange={setChatBgImage}
                  notificationEnabled={notificationEnabled}
                  canInteract={canInteract}
                  onToggleNotification={() => setNotificationEnabled(!notificationEnabled)}
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {showPunishment && (
        <PunishmentModal
          loser={punishmentLoser || loser}
          punishmentBanks={punishmentBanks}
          socket={socket}
          roomId={roomId}
          lastSelectedPunishment={lastSelectedPunishment}
          playerRole={playerRole}
          onClose={() => {
            console.log('[PUNISHMENT_MODAL] 惩罚完成，关闭_modal');
            // 先发送重置请求（服务器广播 reset_game 给所有玩家，确保双方同步关闭惩罚弹窗）
            socket?.emit('reset_game', { roomId });
            // 关闭惩罚窗口，本地状态重置
            setShowPunishment(false);
            setPunishmentLoser(null);
            setLastSelectedPunishment(null);
            setInSetup(true);
            setPlayers(p => p.map(item => ({
              ...item,
              score: 0,
              isReady: false
              // 保留玩家名字
            })));
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

      {/* 房间管理面板（合并成员管理、背景设置、密码管理） */}
      <RoomManagement
        isOpen={showRoomManagement}
        onClose={() => setShowRoomManagement(false)}
        roomId={roomId}
        members={roomMembers}
        currentPlayerCode={playerProfile?.playerCode || ''}
        isOwner={isOwner}
        isAdmin={isAdmin}
        onKick={handleKickPlayer}
        onTransferOwnership={handleTransferOwnership}
        onForceReset={() => { socket?.emit('force_reset_game', { roomId }); }}
        onClearRoom={() => { socket?.emit('clear_room_roles', { roomId }); }}
        currentBg={roomBgImage}
        onUpdateBg={handleUpdateRoomBg}
        onUpdatePassword={handleUpdateRoomPassword}
        onSwitchRoom={() => setShowRoomSelector(true)}
      />

      {/* 聊天框设置已移到上方得分条下方 */}
      {/* 荣誉室模态框 */}
      <HonorHall
        isOpen={showHonorHall}
        onClose={() => setShowHonorHall(false)}
        myCarrotCount={myCarrotCount}
        mySocketId={mySocketId}
        leaderboard={leaderboard}
        playerProfile={playerProfile}
      />

      {/* 特效商店模态框 */}
      <EffectShop
        isOpen={showEffectShop}
        onClose={() => setShowEffectShop(false)}
        myCarrotCount={myCarrotCount}
        myCheeseCount={myCheeseCount}
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
        onLogout={handleLogout}
        playerRole={playerRole || undefined}
        onOpenCheeseBank={() => setShowCheeseBank(true)}
      />

      {/* 档案室排行榜模态框 */}
      <ArchiveRoomRanking
        isOpen={showArchiveRanking}
        onClose={() => setShowArchiveRanking(false)}
        rankings={archiveRankings}
      />

      {/* 奶酪央行模态框 */}
      <CheeseCentralBank
        isOpen={showCheeseBank}
        onClose={() => setShowCheeseBank(false)}
        playerProfile={playerProfile}
        socket={socket}
      />

      {/* 宠物面板 */}
      {showPetPanel && playerProfile && (
        <PetPanel
          playerCode={playerProfile.playerCode}
          socket={socket}
          onClose={() => { setShowPetPanel(false); setPetStatusData(null); }}
        />
      )}

      {/* 版本号显示 */}
      {appVersion && (
        <div className="fixed bottom-2 right-2 text-[10px] text-slate-400 font-mono z-[9999]">
          v{appVersion}
        </div>
      )}
    </div>
  );
};

export default App;
