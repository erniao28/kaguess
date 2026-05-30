import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomOps, messageOps, backgroundOps, carrotOps, effectOps, playerOps, gameHistoryOps, vipRoomOps, inventoryOps, waitForDb, getDb, leaderboardOps, petOps, cheeseOps, notificationOps, chatRoomOps, setGetIo, walletOps } from './db.js';
import { createHash } from 'crypto';

// 初始化数据库
waitForDb().then(() => {
  console.log('[Server] 数据库已就绪');
}).catch(err => {
  console.error('[Server] 数据库初始化失败:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 密码哈希辅助函数（简单 SHA256，生产环境建议用 bcrypt）
const hashPassword = (password) => {
  return createHash('sha256').update(password).digest('hex');
};

// 宠物食物配置
const PET_FOODS = [
  { id: 'carrot_basic', name: '普通胡萝卜', icon: '🥕', effect: { hunger: 20 }, cost: 5 },
  { id: 'carrot_gold', name: '金色胡萝卜', icon: '✨', effect: { hunger: 50, mood: 10 }, cost: 15 },
  { id: 'apple', name: '苹果', icon: '🍎', effect: { hunger: 15, energy: 5 }, cost: 8 },
  { id: 'fish', name: '小鱼干', icon: '🐟', effect: { hunger: 25, mood: 5 }, cost: 10 },
  { id: 'cake', name: '小蛋糕', icon: '🍰', effect: { hunger: 30, mood: 20 }, cost: 20 },
];

// 宠物玩具配置
const PET_TOYS = [
  { id: 'ball', name: '小球', icon: '⚽', effect: { mood: 15, energy: -5 }, cost: 10 },
  { id: 'teddy', name: '泰迪熊', icon: '🧸', effect: { mood: 20 }, cost: 25 },
  { id: 'yoyo', name: '悠悠球', icon: '🪀', effect: { mood: 10, energy: -3 }, cost: 8 },
  { id: 'puzzle', name: '拼图', icon: '🧩', effect: { mood: 25, energy: -10 }, cost: 30 },
];

// IP 宠物盲盒池
const IP_PET_POOL = [
  // Hello Kitty 系列
  { id: 'hello_kitty', name: 'Hello Kitty', type: 'CAT', icon: '🐱', ip: 'Hello Kitty' },
  { id: 'my_melody', name: '美乐蒂', type: 'BUNNY', icon: '🐰', ip: 'Hello Kitty' },
  { id: 'kuromi', name: '库洛米', type: 'BUNNY', icon: '🐰', ip: 'Hello Kitty' },
  // 玉桂狗系列
  { id: 'cinnamoroll', name: '玉桂狗', type: 'DOG', icon: '🐶', ip: 'Sanrio' },
  { id: 'pompompurin', name: '布丁狗', type: 'DOG', icon: '🐶', ip: 'Sanrio' },
  { id: 'kerokerokeroppi', name: '可罗克', type: 'FROG', icon: '🐸', ip: 'Sanrio' },
  // Popmart 系列
  { id: 'molly', name: 'Molly', type: 'HUMAN', icon: '👧', ip: 'Popmart' },
  { id: 'dimoo', name: 'Dimoo', type: 'HUMAN', icon: '👦', ip: 'Popmart' },
  { id: 'pucky', name: 'Pucky', type: 'HUMAN', icon: '🧚', ip: 'Popmart' },
  // 多啦A梦系列
  { id: 'doraemon', name: '哆啦A梦', type: 'CAT', icon: '🐱', ip: 'Doraemon' },
  { id: 'nobita', name: '大雄', type: 'HUMAN', icon: '👦', ip: 'Doraemon' },
  { id: 'shizuka', name: '静香', type: 'HUMAN', icon: '👧', ip: 'Doraemon' },
  // Labubu 系列
  { id: 'labubu', name: 'Labubu', type: 'MONSTER', icon: '👾', ip: 'Labubu' },
  { id: 'labubu_heart', name: '心型 Labubu', type: 'MONSTER', icon: '💜', ip: 'Labubu' },
  // 迪士尼系列
  { id: 'mickey', name: '米奇', type: 'MOUSE', icon: '🐭', ip: 'Disney' },
  { id: 'minnie', name: '米妮', type: 'MOUSE', icon: '🐭', ip: 'Disney' },
  { id: 'donald', name: '唐老鸭', type: 'DUCK', icon: '🦆', ip: 'Disney' },
  { id: 'winnie', name: '小熊维尼', type: 'BEAR', icon: '🐻', ip: 'Disney' },
  { id: 'fox_nick', name: '尼克', type: 'FOX', icon: '🦊', ip: 'Disney' },
  { id: 'bunny_judy', name: '朱迪', type: 'BUNNY', icon: '🐰', ip: 'Disney' },
];

// 孵化时间（秒）
const EGG_HATCH_TIME = 600; // 10 分钟孵化
const INCUBATE_CHEESE_COST = 50; // 孵化费用

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 导出 io 实例供 db.js 使用
export const getIo = () => io;
setGetIo(getIo);

// 房间存储：roomId -> { players: [], state: {} }
const rooms = new Map();

// 玩家连接时，不立即创建档案，等选择角色时再创建
io.on('connection', (socket) => {
  console.log(`玩家连接：${socket.id}`);

  // 不再为 socket.id 创建档案，等 select_role 时使用 player.name 创建持久化档案

  // 创建房间
  socket.on('create_room', (roomId) => {
    if (rooms.has(roomId)) {
      socket.emit('room_error', '房间已存在');
      return;
    }

    rooms.set(roomId, {
      players: [],
      state: {
        fox: null,
        bunny: null,
        word: null,
        punishments: null,
        gameState: 'setup'
      }
    });

    // 同时将公共房间保存到数据库，确保 chat_message handler 能通过 roomOps.get() 找到房间
    roomOps.create(roomId);

    socket.join(roomId);
    socket.data = { roomId, role: null };

    console.log(`房间创建：${roomId} by ${socket.id}`);
    socket.emit('room_created', roomId);
  });

  // 加入房间
  socket.on('join_room', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room_error', '房间不存在');
      return;
    }

    socket.join(roomId);
    socket.data = { roomId, role: null };

    console.log(`[JOIN_ROOM] 玩家 ${socket.id} 加入房间：${roomId}`);
    console.log(`[JOIN_ROOM] 房间状态 - fox: ${room.state.fox ? `已选择 (socket: ${room.state.fox.socketId}, name: ${room.state.fox.player?.name})` : '未选择'}, bunny: ${room.state.bunny ? `已选择 (socket: ${room.state.bunny.socketId}, name: ${room.state.bunny.player?.name})` : '未选择'}`);

    // 先通知房间内其他玩家有新玩家加入
    socket.to(roomId).emit('player_joined', { socketId: socket.id });

    // 000 房间：每次进入时触发 生日特效
    if (roomId === '000') {
      console.log('[BIRTHDAY] 玩家进入 000 测试房间，触发 生日欢迎！');
      io.to(roomId).emit('birthday_effect', { type: 'birthday', message: '生日快乐！' });
    }

    // 再同步房间状态给新玩家（确保包含所有已选择的角色）
    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };
    console.log(`[JOIN_ROOM] 同步房间状态给新玩家:`, JSON.stringify(syncData));
    io.to(roomId).emit('sync_room', syncData);

    // 加载房间聊天历史（新架构：聊天室需要显示历史消息）
    const history = messageOps.getHistory(roomId, 100);
    socket.emit('room_joined', { roomId, history });
  });

  // 选择角色
  socket.on('select_role', ({ roomId, role, player }) => {
    let room = rooms.get(roomId);
    if (!room) {
      console.log(`[SELECT_ROLE] 房间 ${roomId} 不存在，尝试从数据库恢复`);
      // 尝试从数据库恢复 VIP 房间
      const roomDb = vipRoomOps.get(roomId);
      if (roomDb) {
        console.log(`[SELECT_ROLE] 从数据库恢复房间：${roomId}, game_state=${roomDb.game_state}`);

        // 从数据库恢复房间到内存
        // 注意：保留 isReady 状态，让用户刷新后可以直接开始游戏
        rooms.set(roomId, {
          players: [],
          state: {
            fox: roomDb.fox_player_code ? {
              socketId: null,
              playerCode: roomDb.fox_player_code,
              player: {
                name: roomDb.fox_nickname || roomDb.fox_player_code,
                nickname: roomDb.fox_nickname,
                type: 'FOX',
                playerCode: roomDb.fox_player_code,
                score: roomDb.fox_score || 0  // 从数据库读取分数
              },
              // 保留 isReady 状态，让用户刷新后可以直接开始
              isReady: !!roomDb.fox_ready
            } : null,
            bunny: roomDb.bunny_player_code ? {
              socketId: null,
              playerCode: roomDb.bunny_player_code,
              player: {
                name: roomDb.bunny_nickname || roomDb.bunny_player_code,
                nickname: roomDb.bunny_nickname,
                type: 'BUNNY',
                playerCode: roomDb.bunny_player_code,
                score: roomDb.bunny_score || 0  // 从数据库读取分数
              },
              // 保留 isReady 状态，让用户刷新后可以直接开始
              isReady: !!roomDb.bunny_ready
            } : null,
            word: roomDb.current_word ? JSON.parse(roomDb.current_word) : null,
            punishments: roomDb.punishment_banks ? JSON.parse(roomDb.punishment_banks) : null
          },
          isPrivate: true
        });
        room = rooms.get(roomId);
        console.log(`[SELECT_ROLE] 房间恢复完成:`, {
          fox: room.state.fox?.playerCode || '未选择',
          bunny: room.state.bunny?.playerCode || '未选择',
          gameState: room.state.gameState || 'setup',
          foxReady: room.state.fox?.isReady,
          bunnyReady: room.state.bunny?.isReady
        });
      } else {
        console.log(`[SELECT_ROLE] 房间 ${roomId} 不存在于数据库`);
        socket.emit('room_error', '房间不存在');
        return;
      }
    }

    console.log(`[SELECT_ROLE] 玩家 ${socket.id} 尝试选择角色：${role}, 房间状态：fox=${room.state.fox ? room.state.fox.playerCode || room.state.fox.socketId : 'null'}, bunny=${room.state.bunny ? room.state.bunny.playerCode || room.state.bunny.socketId : 'null'}`);

    // 验证：必须已登录（有 playerCode）
    if (!socket.data.playerCode) {
      socket.emit('role_error', '请先登录用户档案');
      return;
    }

    // 验证：档案码格式
    if (!/^[a-zA-Z0-9]{6,8}$/.test(socket.data.playerCode)) {
      socket.emit('role_error', '档案码格式不正确');
      return;
    }

    // 检查目标角色是否已被**其他**玩家占用（使用 playerCode 比较）
    if (role === 'fox' && room.state.fox && room.state.fox.playerCode !== socket.data.playerCode) {
      socket.emit('role_error', '狐狸角色已被选择');
      console.log(`[SELECT_ROLE] 角色 ${role} 已被其他玩家占用`);
      return;
    }
    if (role === 'bunny' && room.state.bunny && room.state.bunny.playerCode !== socket.data.playerCode) {
      socket.emit('role_error', '兔子角色已被选择');
      console.log(`[SELECT_ROLE] 角色 ${role} 已被其他玩家占用`);
      return;
    }

    // 分配角色（使用 playerCode 而非 socketId）
    // 保留玩家传来的 isReady 状态
    if (role === 'fox') {
      room.state.fox = {
        socketId: socket.id,
        playerCode: socket.data.playerCode,
        player: { ...player, playerCode: socket.data.playerCode },
        isReady: player.isReady || false
      };
      console.log(`[SELECT_ROLE] 分配狐狸角色，playerCode=${socket.data.playerCode}, isReady=${player.isReady}`);
    } else if (role === 'bunny') {
      room.state.bunny = {
        socketId: socket.id,
        playerCode: socket.data.playerCode,
        player: { ...player, playerCode: socket.data.playerCode },
        isReady: player.isReady || false
      };
      console.log(`[SELECT_ROLE] 分配兔子角色，playerCode=${socket.data.playerCode}, isReady=${player.isReady}`);
    }

    socket.data.role = role;
    socket.data.player = player;

    // 持久化到数据库（使用 vipRoomOps）
    const foxPlayerCode = room.state.fox?.playerCode;
    const bunnyPlayerCode = room.state.bunny?.playerCode;
    const foxNickname = room.state.fox?.player?.nickname || player?.nickname;
    const bunnyNickname = room.state.bunny?.player?.nickname || player?.nickname;

    vipRoomOps.updatePlayers(roomId, foxPlayerCode, bunnyPlayerCode, foxNickname, bunnyNickname);
    console.log(`[SELECT_ROLE] 房间状态已持久化到数据库`);

    // 同步房间状态给所有玩家（包括发送者）
    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };
    console.log(`[SELECT_ROLE] 广播 sync_room:`, JSON.stringify(syncData));
    io.to(roomId).emit('sync_room', syncData);
  });

  // 玩家准备
  socket.on('player_ready', ({ roomId, role }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (role === 'fox' && room.state.fox) {
      room.state.fox.isReady = true;
    } else if (role === 'bunny' && room.state.bunny) {
      room.state.bunny.isReady = true;
    }

    // 持久化准备状态到数据库
    vipRoomOps.updateReadyState(roomId, role, true);
    console.log(`[PLAYER_READY] 玩家 ${socket.id} (${role}) 已准备，状态已持久化`);

    // 同步准备状态
    io.to(roomId).emit('sync_ready', {
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    });

    // 同步房间状态给所有玩家（包含玩家信息）
    io.to(roomId).emit('sync_room', {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    });

    // 如果两人都准备好了，由服务器通知可以开始游戏
    if (room.state.fox?.isReady && room.state.bunny?.isReady) {
      io.to(roomId).emit('both_ready');
    }
  });

  // 游戏消息转发（玩家操作同步）
  socket.on('game_message', ({ roomId, message }) => {
    const room = rooms.get(roomId);

    if (!room) {
      console.log(`[GAME_MESSAGE] 房间 ${roomId} 不存在`);
      return;
    }

    console.log(`[GAME_MESSAGE] 收到消息：${message.type}`, message);

    // 如果是 UPDATE_PLAYER 消息，更新服务器上的玩家数据
    if (message.type === 'UPDATE_PLAYER') {
      const player = message.player;
      if (player.type === 'FOX' && room.state.fox) {
        room.state.fox.player = player;
        // 持久化分数到数据库
        vipRoomOps.updateGameState(roomId, { fox_score: player.score });
      } else if (player.type === 'BUNNY' && room.state.bunny) {
        room.state.bunny.player = player;
        // 持久化分数到数据库
        vipRoomOps.updateGameState(roomId, { bunny_score: player.score });
      }
      // 重新广播 sync_room，确保所有玩家看到最新数据
      io.to(roomId).emit('sync_room', {
        fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
        bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
        foxReady: room.state.fox?.isReady,
        bunnyReady: room.state.bunny?.isReady
      });
    }

    // 如果是 ADD_SCORE 消息，在服务器端也更新分数并保存
    if (message.type === 'ADD_SCORE') {
      const { playerId, delta } = message;
      // 根据 playerId 找到对应的玩家角色
      const playerIndex = playerId === 1 ? 0 : 1;
      const role = playerIndex === 0 ? 'fox' : 'bunny';

      if (role === 'fox' && room.state.fox) {
        room.state.fox.player.score = (room.state.fox.player.score || 0) + delta;
        console.log(`[ADD_SCORE] 狐狸分数更新：${room.state.fox.player.score - delta} -> ${room.state.fox.player.score}`);
        // 持久化分数到数据库
        vipRoomOps.updateGameState(roomId, { fox_score: room.state.fox.player.score });
      } else if (role === 'bunny' && room.state.bunny) {
        room.state.bunny.player.score = (room.state.bunny.player.score || 0) + delta;
        console.log(`[ADD_SCORE] 兔子分数更新：${room.state.bunny.player.score - delta} -> ${room.state.bunny.player.score}`);
        // 持久化分数到数据库
        vipRoomOps.updateGameState(roomId, { bunny_score: room.state.bunny.player.score });
      }

      // 只广播 sync_room（权威数据），不再转发 game_message
      // Bug 4 fix: 避免 game_message ADD_SCORE + sync_room 双重更新导致的分数回退/翻倍
      const syncData2 = {
        fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
        bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
        foxReady: room.state.fox?.isReady,
        bunnyReady: room.state.bunny?.isReady
      };
      io.to(roomId).emit('sync_room', syncData2);

      return; // 已经广播了 sync_room，不需要再转发
    }

    // 如果是 SYNC_BANKS 消息，合并存储到服务器并广播给所有玩家
    if (message.type === 'SYNC_BANKS') {
      const { extraWords, punishments } = message;

      // 合并惩罚库（去重）
      if (room.state.punishments) {
        room.state.punishments.truths = Array.from(new Set([
          ...room.state.punishments.truths,
          ...punishments.truths
        ]));
        room.state.punishments.dares = Array.from(new Set([
          ...room.state.punishments.dares,
          ...punishments.dares
        ]));
      } else {
        room.state.punishments = punishments;
      }

      // 如果有自定义禁语，也合并到词汇表
      if (extraWords && extraWords.length > 0) {
        // 将自定义词存储在房间状态中，供 start_game 时使用
        room.state.customWords = [...(room.state.customWords || []), ...extraWords];
      }

      console.log(`[SYNC_BANKS] 合并后的惩罚库：truths=${room.state.punishments.truths.length}, dares=${room.state.punishments.dares.length}, customWords=${room.state.customWords?.length || 0}`);

      // 广播合并后的惩罚库给所有玩家（包括发送者），确保双方同步
      io.to(roomId).emit('game_message', {
        type: 'SYNC_BANKS',
        punishments: room.state.punishments,
        extraWords: room.state.customWords || []
      });
      return; // 已经广播了，不需要再转发
    }

    // 使用特效（如扔大便）
    if (message.type === 'USE_EFFECT') {
      const { effectId, targetType } = message;
      console.log(`[USE_EFFECT] 玩家使用特效：${effectId}, 目标：${targetType}`);

      // 广播给所有玩家，包括发送者
      io.to(roomId).emit('game_message', {
        type: 'USE_EFFECT',
        effectId,
        targetType,
        from: socket.data.role === 'fox' ? 'FOX' : 'BUNNY'
      });
      return;
    }

    // 转发给其他玩家
    socket.to(roomId).emit('game_message', message);
  });

  // 聊天消息
  socket.on('chat_message', ({ roomId, message }) => {
    console.log(`[CHAT_MESSAGE] 收到聊天消息， roomId=${roomId}, type=${message?.type}, sender=${message?.senderName}, content=${message?.content?.slice(0, 50)}`);

    const room = rooms.get(roomId);

    // Bug 3 fix: 支持全局聊天（player-scoped），不在房间也可聊天
    const isGlobal = roomId === 'global';
    if (!room && !isGlobal) {
      console.log(`[CHAT_MESSAGE] ⚠️ 房间 ${roomId} 不存在，尝试从数据库查找并恢复`);
      // 尝试从数据库恢复房间（防止服务器重启后房间未恢复）
      const roomDb = vipRoomOps.get(roomId);
      if (roomDb) {
        console.log(`[CHAT_MESSAGE] 从数据库恢复房间 ${roomId}`);
        rooms.set(roomId, {
          players: [],
          state: {
            fox: roomDb.fox_player_code ? { socketId: null, playerCode: roomDb.fox_player_code, player: { name: roomDb.fox_nickname || roomDb.fox_player_code, nickname: roomDb.fox_nickname, type: 'FOX', playerCode: roomDb.fox_player_code, score: roomDb.fox_score || 0 }, isReady: !!roomDb.fox_ready } : null,
            bunny: roomDb.bunny_player_code ? { socketId: null, playerCode: roomDb.bunny_player_code, player: { name: roomDb.bunny_nickname || roomDb.bunny_player_code, nickname: roomDb.bunny_nickname, type: 'BUNNY', playerCode: roomDb.bunny_player_code, score: roomDb.bunny_score || 0 }, isReady: !!roomDb.bunny_ready } : null,
            word: roomDb.current_word ? JSON.parse(roomDb.current_word) : null,
            punishments: roomDb.punishment_banks ? JSON.parse(roomDb.punishment_banks) : null,
            gameState: roomDb.game_state || 'setup'
          },
          isPrivate: true
        });
      } else {
        // 无法从数据库恢复，检查是否有该房间的 socket 连接
        console.log(`[CHAT_MESSAGE] 无法恢复房间 ${roomId}，消息未保存`);
        return;
      }
    }

    const actualRoom = rooms.get(roomId);

    console.log(`[CHAT_MESSAGE] 处理消息：${message.type}`, {
      sender: message.senderName,
      role: message.senderRole,
      roomId,
      roomExists: !!actualRoom
    });

    // 强制使用 socket.data.playerCode 作为 senderId
    if (socket.data.playerCode) {
      message.senderId = socket.data.playerCode;
      const msgPlayer = actualRoom?.state?.fox?.playerCode === socket.data.playerCode ? actualRoom.state.fox.player :
                        actualRoom?.state?.bunny?.playerCode === socket.data.playerCode ? actualRoom.state.bunny.player : null;
      if (msgPlayer) {
        message.senderName = msgPlayer.nickname || msgPlayer.name;
      } else {
        const playerProfile = playerOps.getByCode(socket.data.playerCode);
        if (playerProfile) {
          message.senderName = playerProfile.nickname || socket.data.playerCode;
        }
      }
    }

    // 保存消息（任何房间或全局聊天）
    // 修复：所有房间消息都需要持久化，确保退出后重新进入不丢失
    let savedId = null;
    if (actualRoom || isGlobal) {
      try {
        savedId = messageOps.add(roomId, message.senderId, message.senderName, message.senderRole, message.content, message.type, message.quote);
        console.log(`[CHAT_MESSAGE] ✅ 消息已保存到 ${roomId}, id=${savedId}, senderId=${message.senderId}, 验证：该房间总消息数=${messageOps.getHistory(roomId, 99999).length}`);
      } catch (err) {
        console.error('[CHAT_MESSAGE] ❌ 保存失败:', err);
        socket.emit('chat_error', { error: '消息保存失败' });
      }
    } else {
      console.error(`[CHAT_MESSAGE] ❌ 无法保存：房间 ${roomId} 不存在且不是全局聊天`);
    }

    // 广播给房间内所有玩家（或仅发送给全局聊天的发送者）
    if (isGlobal) {
      socket.emit('chat_message', message);
    } else {
      io.to(roomId).emit('chat_message', message);
    }

    // 发送保存确认给发送者，包含数据库 ID（用于刷新后匹配历史消息）
    if (savedId !== null) {
      socket.emit('message_saved', { client_id: message.id, server_id: String(savedId) });
    }
  });

  // 私密房间事件
  // 创建私密房间（复用普通房间逻辑 + 持久化）
  socket.on('create_private_room', ({ roomId, password }) => {
    console.log(`[PRIVATE_ROOM] 尝试创建房间：${roomId}`);

    // 检查房间 ID 是否合法（字母、数字、-）
    if (!/^[a-zA-Z0-9-]{3,32}$/.test(roomId)) {
      socket.emit('private_room_error', '房间号格式不合法（3-32 位字母、数字、-）');
      return;
    }

    // 在内存中创建房间（复用普通房间逻辑）
    if (rooms.has(roomId)) {
      socket.emit('private_room_error', '房间已存在');
      return;
    }

    rooms.set(roomId, {
      players: [],
      state: {
        fox: null,
        bunny: null,
        word: null,
        punishments: null,
        gameState: 'setup'
      },
      isPrivate: true
    });

    // 保存到数据库
    try {
      roomOps.create(roomId, password || '');
      // 创建 VIP 房间记录（永久保存）
      vipRoomOps.create(roomId, socket.data.playerCode || socket.id, password || '');

      socket.join(roomId);
      socket.data = { ...socket.data, roomId, role: null, isPrivate: true };

      // 获取房间背景
      const room = roomOps.get(roomId);
      socket.emit('private_room_created', {
        roomId,
        bgImage: room.bg_image || ''
      });

      console.log(`[PRIVATE_ROOM] 房间创建成功：${roomId}`);
    } catch (err) {
      console.error('[PRIVATE_ROOM] 创建失败:', err);
      socket.emit('private_room_error', '房间创建失败（可能已存在）');
    }
  });

  // 加入私密房间（复用普通房间逻辑 + 持久化）
  socket.on('join_private_room', ({ roomId, password }) => {
    console.log(`[PRIVATE_ROOM] 尝试加入房间：${roomId}, 当前 playerCode: ${socket.data.playerCode || '未设置'}`);

    // 先检查 vip_rooms 数据库（主要）
    let roomDb = vipRoomOps.get(roomId);
    if (!roomDb) {
      // 兜底：检查 rooms 表
      const fallbackDb = roomOps.get(roomId);
      if (!fallbackDb) {
        socket.emit('private_room_error', '房间不存在');
        return;
      }
      // 从 rooms 表创建一个兜底的 roomDb
      roomDb = {
        id: roomId,
        owner_player_code: null,
        fox_player_code: null,
        bunny_player_code: null,
        fox_nickname: null,
        bunny_nickname: null,
        fox_score: 0,
        bunny_score: 0,
        fox_ready: 0,
        bunny_ready: 0,
        current_word: null,
        punishment_banks: null,
        game_state: 'setup',
        bg_image: fallbackDb.bg_image || '',
        password: fallbackDb.password
      };
    }

    // 验证密码（从 roomDb 或 vip_rooms 获取）
    const passwordToCheck = roomDb.password || roomDb.owner_player_code ? null : null;
    if (passwordToCheck && passwordToCheck !== password) {
      // 如果 vip_rooms 有密码记录，用它验证
    }
    // 如果 vip_rooms 中没密码记录，从 rooms 表验证
    if (!roomDb.password) {
      const roomsDb = roomOps.get(roomId);
      if (roomsDb && roomsDb.password && roomsDb.password !== password) {
        socket.emit('private_room_error', '密码错误');
        return;
      }
    }

    // 检查内存中是否有房间，没有则从数据库恢复
    if (!rooms.has(roomId)) {
      console.log(`[PRIVATE_ROOM] 内存中无房间，从数据库恢复：${roomId}, game_state=${roomDb.game_state}`);

      // 从数据库恢复房间到内存
      // 注意：保留 isReady 状态，让用户刷新后可以直接开始游戏
      rooms.set(roomId, {
        players: [],
        state: {
          fox: roomDb.fox_player_code ? {
            socketId: null,
            playerCode: roomDb.fox_player_code,
            player: {
              name: roomDb.fox_nickname || roomDb.fox_player_code,
              nickname: roomDb.fox_nickname,
              type: 'FOX',
              playerCode: roomDb.fox_player_code,
              score: roomDb.fox_score || 0  // 从数据库读取分数
            },
            // 保留 isReady 状态，让用户刷新后可以直接开始
            isReady: !!roomDb.fox_ready
          } : null,
          bunny: roomDb.bunny_player_code ? {
            socketId: null,
            playerCode: roomDb.bunny_player_code,
            player: {
              name: roomDb.bunny_nickname || roomDb.bunny_player_code,
              nickname: roomDb.bunny_nickname,
              type: 'BUNNY',
              playerCode: roomDb.bunny_player_code,
              score: roomDb.bunny_score || 0  // 从数据库读取分数
            },
            // 保留 isReady 状态，让用户刷新后可以直接开始
            isReady: !!roomDb.bunny_ready
          } : null,
          word: roomDb.current_word ? JSON.parse(roomDb.current_word) : null,
          punishments: roomDb.punishment_banks ? JSON.parse(roomDb.punishment_banks) : null,
          gameState: roomDb.game_state || 'setup'
        },
        isPrivate: true
      });
      console.log(`[PRIVATE_ROOM] 房间恢复完成:`, {
        fox: rooms.get(roomId).state.fox?.playerCode || '未选择',
        bunny: rooms.get(roomId).state.bunny?.playerCode || '未选择',
        gameState: rooms.get(roomId).state.gameState || 'setup',
        foxReady: rooms.get(roomId).state.fox?.isReady,
        bunnyReady: rooms.get(roomId).state.bunny?.isReady
      });
    }

    const room = rooms.get(roomId);

    socket.join(roomId);

    // 关键修复：检查当前登录的玩家是否是已保存角色的主人
    // 如果是，更新 socketId 让玩家能识别自己的角色
    const currentSocketId = socket.id;
    const currentRole = socket.data.role;

    // 如果玩家之前已经有角色，恢复角色的 socketId
    if (currentRole) {
      if (currentRole === 'fox' && room.state.fox && room.state.fox.playerCode === socket.data.playerCode) {
        room.state.fox.socketId = currentSocketId;
        console.log(`[PRIVATE_ROOM] 恢复狐狸角色 socketId: ${currentSocketId}`);
      } else if (currentRole === 'bunny' && room.state.bunny && room.state.bunny.playerCode === socket.data.playerCode) {
        room.state.bunny.socketId = currentSocketId;
        console.log(`[PRIVATE_ROOM] 恢复兔子角色 socketId: ${currentSocketId}`);
      }
    }

    // 如果玩家是通过 playerCode 识别的（不是通过 socket.data.role），也检查并恢复
    if (socket.data.playerCode) {
      if (room.state.fox && room.state.fox.playerCode === socket.data.playerCode && !room.state.fox.socketId) {
        room.state.fox.socketId = currentSocketId;
        socket.data.role = 'fox';
        console.log(`[PRIVATE_ROOM] 通过 playerCode 恢复狐狸角色：${socket.data.playerCode}`);
      } else if (room.state.bunny && room.state.bunny.playerCode === socket.data.playerCode && !room.state.bunny.socketId) {
        room.state.bunny.socketId = currentSocketId;
        socket.data.role = 'bunny';
        console.log(`[PRIVATE_ROOM] 通过 playerCode 恢复兔子角色：${socket.data.playerCode}`);
      }
    }

    socket.data = { ...socket.data, roomId, isPrivate: true };

    // 额外日志：记录加入后的 socket 状态
    console.log(`[PRIVATE_ROOM] 加入后 socket 状态：playerCode=${socket.data.playerCode}, role=${socket.data.role}`);

    // 000 私密房间：每次加入时触发 生日特效
    if (roomId === '000') {
      console.log('[BIRTHDAY] 玩家加入私密房间 000，触发 生日欢迎！');
      io.to(roomId).emit('birthday_effect', { type: 'birthday', message: '生日快乐！' });
    }

    // 获取历史消息
    const history = messageOps.getHistory(roomId, 100);

    // 通知房间内其他玩家有新玩家加入（以便更新状态）
    socket.to(roomId).emit('player_joined', { socketId: socket.id });

    // 同步房间状态给**所有**玩家（包括新玩家和已存在的玩家）
    // 这样两个用户都能看到对方的状态
    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };
    console.log(`[PRIVATE_ROOM] 加入成功，同步房间状态给所有玩家:`, JSON.stringify(syncData));
    io.to(roomId).emit('sync_room', syncData);

    // 关键修复：规范化历史消息，将 senderId 替换为当前 playerCode
    // 原因：刷新后 socket.id 会变，但 playerCode 不变
    // 修复：同时尝试 socketId 和 playerCode 两种匹配方式
    // 注意：sql.js getAsObject 返回 snake_case 字段名
    const normalizedHistory = history.map(msg => {
      let newMsg = { ...msg };
      // 同时支持 snake_case 和 camelCase
      const actualSenderId = msg.sender_id || msg.senderId;
      if (actualSenderId) {
        // 方式1：通过 socketId 匹配（旧 socket.id 格式）
        if (room.state.fox?.socketId === actualSenderId) {
          newMsg.sender_id = room.state.fox.playerCode;
          newMsg.sender_name = room.state.fox.player?.nickname || room.state.fox.player?.name || '';
        } else if (room.state.bunny?.socketId === actualSenderId) {
          newMsg.sender_id = room.state.bunny.playerCode;
          newMsg.sender_name = room.state.bunny.player?.nickname || room.state.bunny.player?.name || '';
        }
        // 方式2：通过 playerCode 匹配（确保消息归属正确）
        // 如果 senderId 匹配当前 fox/bunny 的 playerCode，强制更新 senderName
        else if (room.state.fox?.playerCode === actualSenderId) {
          newMsg.sender_name = room.state.fox.player?.nickname || room.state.fox.player?.name || newMsg.sender_name;
        } else if (room.state.bunny?.playerCode === actualSenderId) {
          newMsg.sender_name = room.state.bunny.player?.nickname || room.state.bunny.player?.name || newMsg.sender_name;
        }
      }
      return newMsg;
    });

    // 发送游戏恢复通知，包含游戏状态
    console.log(`[PRIVATE_ROOM] 发送 private_room_joined 事件，history 长度: ${normalizedHistory.length}`);
    socket.emit('private_room_joined', {
      roomId,
      bgImage: roomDb.bg_image || '',
      history: normalizedHistory,
      syncData,
      gameState: room.state.gameState || 'setup',
      word: room.state.word ? room.state.word.char : null
    });

    console.log(`[PRIVATE_ROOM] 加入成功：${roomId}, 游戏状态：${room.state.gameState}`);
  });

  // 获取房间信息
  socket.on('get_room_info', (roomId) => {
    const room = roomOps.get(roomId);
    if (room) {
      socket.emit('room_info', {
        roomId: room.id,
        bgImage: room.bg_image || '',
        isPrivate: true
      });
    }
  });

  // 更新房间背景
  socket.on('update_room_bg', ({ roomId, bgImage }) => {
    const room = roomOps.get(roomId);
    if (!room) {
      socket.emit('room_settings_error', '房间不存在');
      return;
    }

    roomOps.updateBackground(roomId, bgImage);
    io.to(roomId).emit('room_bg_updated', bgImage);
    console.log(`[ROOM_SETTINGS] 背景已更新：${roomId}`);
  });

  // 更新房间密码
  socket.on('update_room_password', ({ roomId, password }) => {
    const room = roomOps.get(roomId);
    if (!room) {
      socket.emit('room_settings_error', '房间不存在');
      return;
    }

    roomOps.updatePassword(roomId, password || '');
    socket.emit('room_password_updated', !!password);
    console.log(`[ROOM_SETTINGS] 密码已更新：${roomId}`);
  });

  // 获取背景列表
  socket.on('get_backgrounds', () => {
    const backgrounds = backgroundOps.getAll();
    socket.emit('backgrounds_list', backgrounds.map(bg => ({
      id: bg.id,
      name: bg.name,
      url: bg.url,
      isPreset: bg.is_preset === 1
    })));
  });

  // 聊天室主题和家具管理
  socket.on('get_chat_room', ({ roomId }) => {
    const playerCode = socket.data.playerCode;
    if (!playerCode) {
      socket.emit('chat_room_data', { theme: 'cozy', furniture: [] });
      return;
    }
    const roomData = chatRoomOps.get(playerCode, roomId || '');
    socket.emit('chat_room_data', {
      theme: roomData?.theme || 'cozy',
      furniture: roomData?.furniture || []
    });
  });

  socket.on('update_chat_room_theme', ({ roomId, theme }) => {
    const playerCode = socket.data.playerCode;
    if (!playerCode) return;
    chatRoomOps.updateTheme(playerCode, roomId || '', theme);
    console.log(`[CHAT_ROOM] 玩家 ${playerCode} 更新主题: ${theme}`);
    socket.emit('chat_room_theme_updated', { theme });
  });

  socket.on('update_chat_room_furniture', ({ roomId, furniture }) => {
    const playerCode = socket.data.playerCode;
    if (!playerCode) return;
    chatRoomOps.updateFurniture(playerCode, roomId || '', furniture);
    console.log(`[CHAT_ROOM] 玩家 ${playerCode} 更新家具: ${furniture.length} 件`);
    socket.emit('chat_room_furniture_updated', { furniture });
  });

  // 家具购买（消耗奶酪）
  socket.on('purchase_furniture', ({ itemId, cost }) => {
    const playerCode = socket.data.playerCode;
    if (!playerCode) {
      socket.emit('furniture_purchase_result', { success: false, error: '未登录' });
      return;
    }

    // 验证奶酪余额
    const cheese = cheeseOps.getBalance(playerCode);
    if (cheese < cost) {
      socket.emit('furniture_purchase_result', { success: false, error: '奶酪不足' });
      return;
    }

    // 检查是否已拥有
    const hasItem = inventoryOps.has(playerCode, itemId);
    if (hasItem) {
      socket.emit('furniture_purchase_result', { success: false, error: '已拥有该家具' });
      return;
    }

    // 扣奶酪
    cheeseOps.removeCheese(playerCode, cost);

    // 添加到背包
    inventoryOps.add(playerCode, itemId, 'FURNITURE');

    // 记录钱包交易
    walletOps.add(playerCode, 'CHEESE', 'FURNITURE_BUY', -cost, `购买家具: ${itemId} -${cost} 🧀`, `购买家具 ${itemId}`, itemId);

    console.log(`[FURNITURE] 玩家 ${playerCode} 购买家具: ${itemId}, 花费: ${cost} 🧀`);
    socket.emit('furniture_purchase_result', { success: true, cheeseBalance: cheeseOps.getBalance(playerCode) });
  });

  // 获取玩家背包
  socket.on('get_inventory', ({ playerCode, itemType }) => {
    const items = inventoryOps.getAll(playerCode).filter(item => item.item_type === itemType);
    socket.emit('inventory_data', {
      playerCode,
      itemType,
      items: items.map(item => item.item_id)
    });
  });

  // 胡萝卜相关事件
  // 结算游戏时给胜利方加胡萝卜
  socket.on('settle_game_with_carrot', ({ roomId, winnerRole }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    console.log(`[CARROT] 结算游戏，胜利者：${winnerRole}`);

    // 根据角色获取玩家档案码（现在应该已经有 playerCode 了）
    let winnerPlayerCode = null;
    let loserPlayerCode = null;

    if (winnerRole === 'FOX' && room.state.fox) {
      winnerPlayerCode = room.state.fox.playerCode;
      loserPlayerCode = room.state.bunny?.playerCode;
    } else if (winnerRole === 'BUNNY' && room.state.bunny) {
      winnerPlayerCode = room.state.bunny.playerCode;
      loserPlayerCode = room.state.fox?.playerCode;
    }

    if (winnerPlayerCode) {
      // 给胜利者加胡萝卜
      carrotOps.addCarrot(winnerPlayerCode, 1);
      const count = carrotOps.getCount(winnerPlayerCode);
      console.log(`[CARROT] 玩家 ${winnerPlayerCode} 获得胡萝卜，总数：${count}`);

      // 同步玩家档案中的胡萝卜数量
      playerOps.update(winnerPlayerCode, { carrot_count: count });

      // 记录游戏历史（使用档案码）
      const foxPlayer = room.state.fox?.player?.name || room.state.fox?.playerCode || room.state.fox?.socketId;
      const bunnyPlayer = room.state.bunny?.player?.name || room.state.bunny?.playerCode || room.state.bunny?.socketId;
      gameHistoryOps.add({
        roomId,
        foxPlayer,
        bunnyPlayer,
        winner: winnerRole,
        foxScore: room.state.fox?.player?.score || 0,
        bunnyScore: room.state.bunny?.player?.score || 0,
        wordUsed: room.state.word?.char,
        duration: 0
      });

      // 更新玩家统计（胜利者 +1 胜场，双方 +1 总场次）
      const winnerProfile = playerOps.get(winnerPlayerCode);
      if (winnerProfile) {
        playerOps.update(winnerPlayerCode, {
          total_games: (winnerProfile.total_games || 0) + 1,
          win_games: (winnerProfile.win_games || 0) + 1
        });
      }

      if (loserPlayerCode) {
        const loserProfile = playerOps.get(loserPlayerCode);
        if (loserProfile) {
          playerOps.update(loserPlayerCode, {
            total_games: (loserProfile.total_games || 0) + 1
          });
        }
      }

      // 给胜利者发送通知（信箱）
      if (winnerPlayerCode) {
        const roleName = winnerRole === 'FOX' ? '🦊 尼克' : '🐰 朱迪';
        notificationOps.add(winnerPlayerCode, 'carrot_reward', `🥕 获得胡萝卜！`, `你在游戏中获胜，获得 1 根胡萝卜！（当前共 ${count} 根）`);
        // 通知客户端有新的未读消息
        const winnerSocket = [...io.sockets.sockets.values()].find(s => s.data.playerCode === winnerPlayerCode);
        if (winnerSocket) {
          const unreadCount = notificationOps.getUnreadCount(winnerPlayerCode);
          winnerSocket.emit('mail_unread_count', unreadCount);
        }
      }

      // 通知所有玩家
      io.to(roomId).emit('carrot_awarded', {
        winnerRole,
        winnerPlayerName: winnerPlayerCode,
        carrotCount: count
      });
    }
  });

  // 获取玩家的胡萝卜数量
  socket.on('get_carrot_count', (playerIdentifier) => {
    const count = carrotOps.getCount(playerIdentifier);
    socket.emit('carrot_count', { playerIdentifier, count });
  });

  // 获取自己的胡萝卜数量（连接后主动获取，使用玩家名字）
  socket.on('get_my_carrots', () => {
    // 优先使用玩家名字，如果没有则回退到 socket.id
    const playerIdentifier = socket.data.player?.name || socket.id;
    const count = carrotOps.getCount(playerIdentifier);
    socket.emit('my_carrots', { playerIdentifier, count });
  });

  // 获取排行榜（包含战绩统计）
  socket.on('get_leaderboard', () => {
    // 从 player_profiles 获取完整的战绩数据
    const leaderboard = playerOps.getLeaderboard(10, 'carrot_count');
    socket.emit('leaderboard', leaderboard.map(profile => ({
      playerIdentifier: profile.player_identifier,
      nickname: profile.nickname,
      carrotCount: profile.carrot_count,
      totalGames: profile.total_games,
      winGames: profile.win_games,
      winRate: profile.total_games > 0 ? ((profile.win_games / profile.total_games) * 100).toFixed(1) : 0,
      vipLevel: profile.vip_level,
      lastLogin: profile.last_login
    })));
  });

  // 获取信箱通知列表
  socket.on('get_notifications', () => {
    const playerCode = socket.data.playerCode;
    if (!playerCode) {
      socket.emit('notifications_list', []);
      return;
    }
    const notifications = notificationOps.getByPlayer(playerCode, 100);
    socket.emit('notifications_list', notifications);
  });

  // 标记通知为已读
  socket.on('mark_notification_read', (notificationId) => {
    notificationOps.markRead(notificationId);
    // 发送更新后的未读数量
    const playerCode = socket.data.playerCode;
    if (playerCode) {
      const count = notificationOps.getUnreadCount(playerCode);
      socket.emit('mail_unread_count', count);
    }
  });

  // 标记所有通知为已读
  socket.on('mark_all_notifications_read', () => {
    const playerCode = socket.data.playerCode;
    if (playerCode) {
      notificationOps.markAllRead(playerCode);
      socket.emit('mail_unread_count', 0);
    }
  });

  // 获取未读通知数量
  socket.on('get_unread_notification_count', () => {
    const playerCode = socket.data.playerCode;
    if (playerCode) {
      const count = notificationOps.getUnreadCount(playerCode);
      socket.emit('mail_unread_count', count);
    }
  });

  // 加载全局聊天历史（Bug 3 fix: player-scoped chat）
  socket.on('get_global_chat', () => {
    const globalMessages = messageOps.getHistory('global', 50);
    // 规范化：将 senderId 映射为 playerCode 和当前昵称
    const normalized = globalMessages.map(msg => {
      const newMsg = { ...msg };
      if (msg.senderId) {
        const profile = playerOps.getByCode(msg.senderId);
        if (profile) {
          newMsg.senderName = profile.nickname || msg.senderName;
        }
      }
      return newMsg;
    });
    socket.emit('chat_history', normalized);
  });

  // 获取已解锁的特效
  socket.on('get_unlocked_effects', () => {
    const effects = effectOps.getUnlocked(socket.id);
    socket.emit('unlocked_effects', effects);
  });

  // 解锁特效（购买）
  socket.on('unlock_effect', ({ effectId, cost }) => {
    // 使用玩家名字作为持久化标识
    const playerIdentifier = socket.data.player?.name || socket.id;
    const currentCount = carrotOps.getCount(playerIdentifier);
    if (currentCount >= cost) {
      // 扣除胡萝卜
      const stmt = db.prepare(`
        UPDATE player_carrots SET carrot_count = carrot_count - ?, last_updated = strftime('%s', 'now')
        WHERE player_identifier = ?
      `);
      stmt.run(cost, playerIdentifier);

      // 解锁特效
      effectOps.unlock(playerIdentifier, effectId);

      // 通知客户端
      const newCount = carrotOps.getCount(playerIdentifier);
      socket.emit('effect_unlocked', { effectId, carrotCount: newCount });

      // 重新获取排行榜
      const leaderboard = carrotOps.getLeaderboard(10);
      socket.emit('leaderboard', leaderboard);

      console.log(`[EFFECT] 玩家 ${playerIdentifier} 解锁特效 ${effectId}, 花费 ${cost} 胡萝卜`);
    } else {
      socket.emit('effect_error', '胡萝卜不足');
    }
  });

  // 开始游戏（由先准备好的一方触发，服务器统一分发）
  socket.on('start_game', ({ roomId, word, punishments }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 存储词汇（以第一个触发者的为准）
    room.state.word = word;

    // 如果客户端传了惩罚库，也合并进去（确保包含默认库）
    if (punishments) {
      if (room.state.punishments) {
        room.state.punishments.truths = Array.from(new Set([
          ...room.state.punishments.truths,
          ...punishments.truths
        ]));
        room.state.punishments.dares = Array.from(new Set([
          ...room.state.punishments.dares,
          ...punishments.dares
        ]));
      } else {
        room.state.punishments = punishments;
      }
    }

    // 持久化游戏状态到数据库
    vipRoomOps.updateGameState(roomId, {
      word: word,
      punishments: room.state.punishments,
      game_state: 'playing'
    });

    // 同时更新内存中的游戏状态
    room.state.gameState = 'playing';

    const finalPunishments = room.state.punishments || { truths: [], dares: [] };
    console.log(`房间 ${roomId} 游戏开始，词汇：${word.char}, 惩罚库：truths=${finalPunishments.truths.length}, dares=${finalPunishments.dares.length}, 状态：${room.state.gameState}`);
    io.to(roomId).emit('start_game', { word, punishments: finalPunishments });
  });

  // 结算游戏
  socket.on('settle_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 更新游戏状态为 settled（结案）
    room.state.gameState = 'settled';
    console.log(`[SETTLE_GAME] 房间 ${roomId} 游戏状态更新为 settled`);

    // 计算输家（分数较低的一方）
    const foxScore = room.state.fox?.player.score || 0;
    const bunnyScore = room.state.bunny?.player.score || 0;
    let loser = null;
    if (foxScore < bunnyScore) {
      loser = room.state.bunny?.player || null;
    } else if (bunnyScore < foxScore) {
      loser = room.state.fox?.player || null;
    }
    // 如果分数相同，loser 为 null，显示平局弹窗

    // 持久化游戏状态到数据库
    vipRoomOps.updateGameState(roomId, {
      game_state: 'settled',
      fox_score: room.state.fox?.player.score || 0,
      bunny_score: room.state.bunny?.player.score || 0
    });

    // 广播给所有玩家，包含输家信息
    io.to(roomId).emit('settle_game', { loser });
    console.log(`[SETTLE_GAME] 房间 ${roomId} 结算，输家：`, loser ? loser.name : '平局');
  });

  // 重置游戏
  socket.on('reset_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 重置玩家准备状态
    if (room.state.fox) room.state.fox.isReady = false;
    if (room.state.bunny) room.state.bunny.isReady = false;

    // 重置分数
    if (room.state.fox) room.state.fox.player.score = 0;
    if (room.state.bunny) room.state.bunny.player.score = 0;

    // 重置内存中的游戏状态
    room.state.gameState = 'setup';
    room.state.word = null;
    // 保留角色信息和惩罚库，不清除
    console.log(`[RESET_GAME] 房间 ${roomId} 游戏已重置，分数清零，保留角色和惩罚库`);

    // 清除数据库中的游戏状态（保留惩罚库）
    vipRoomOps.clearGame(roomId);

    // 广播 reset_game 给所有玩家（包括发送者）
    io.to(roomId).emit('reset_game');

    // 广播同步房间状态，确保所有玩家看到彼此的角色选择
    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };
    io.to(roomId).emit('sync_room', syncData);
    console.log(`[RESET_GAME] 同步房间状态给所有玩家：`, JSON.stringify(syncData));
  });

  // 惩罚选择同步 - 广播给房间内所有玩家
  socket.on('punishment_selected', ({ roomId, type, content }) => {
    console.log(`[PUNISHMENT_SELECTED] 房间 ${roomId} 选择了惩罚：type=${type}`);
    // 存储惩罚选择到房间状态（可选，用于重连恢复）
    const room = rooms.get(roomId);
    if (room) {
      room.state.lastPunishment = { type, content };
    }
    // 广播给所有玩家（包括发送者）
    io.to(roomId).emit('punishment_selected', { type, content });
  });

  // 房主强制结束游戏 - 清空所有玩家状态，要求所有玩家重新登录
  socket.on('force_reset_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    console.log(`[FORCE_RESET] 房主强制结束房间 ${roomId} 的游戏`);

    // 清除内存中的房间状态
    room.state.fox = null;
    room.state.bunny = null;
    room.state.gameState = 'setup';
    room.state.word = null;

    // 清除数据库中的游戏状态
    vipRoomOps.clearGame(roomId);
    vipRoomOps.clearPlayers(roomId); // 清除房间玩家记录

    // 广播给所有玩家，要求重新登录
    io.to(roomId).emit('force_reset_game');
    console.log(`[FORCE_RESET] 房间 ${roomId} 已强制重置，所有玩家需要重新登录`);
  });

  // 清空房间角色选择（私密房间中双方玩家都可操作）- 改为重置房间功能
  socket.on('clear_room_roles', ({ roomId, playerCode }) => {
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`[CLEAR_ROLES] 房间 ${roomId} 不存在于内存中`);
      socket.emit('private_room_error', '房间不存在');
      return;
    }

    // 关键修复：使用服务器端存储的 socket.data.playerCode，而不是客户端传来的参数
    // 这样可以防止客户端伪造 playerCode，同时确保验证逻辑一致
    const serverPlayerCode = socket.data.playerCode;
    console.log(`[CLEAR_ROLES] 收到清空请求，roomId=${roomId}, 客户端 playerCode=${playerCode}, 服务器 socket.data.playerCode=${serverPlayerCode}`);

    if (!serverPlayerCode) {
      console.log(`[CLEAR_ROLES] 玩家未登录（socket.data.playerCode 为空）`);
      socket.emit('private_room_error', '请先登录用户档案');
      return;
    }

    // 验证玩家是否是房间成员 - 也检查数据库
    let isFoxPlayer = room.state.fox?.playerCode === serverPlayerCode;
    let isBunnyPlayer = room.state.bunny?.playerCode === serverPlayerCode;

    // 如果内存中没有玩家信息，尝试从数据库检查
    if (!isFoxPlayer && !isBunnyPlayer) {
      const roomDb = vipRoomOps.get(roomId);
      if (roomDb) {
        isFoxPlayer = roomDb.fox_player_code === serverPlayerCode;
        isBunnyPlayer = roomDb.bunny_player_code === serverPlayerCode;
        console.log(`[CLEAR_ROLES] 从数据库检查玩家身份：fox=${isFoxPlayer}, bunny=${isBunnyPlayer}`);
      }
    }

    // 如果数据库中也没有，检查是否是房主（owner）或管理员（KADEGOU）
    const isAdmin = serverPlayerCode === 'KADEGOU';
    let isOwner = false;
    if (!isFoxPlayer && !isBunnyPlayer) {
      isOwner = vipRoomOps.isOwner(roomId, serverPlayerCode);
      if (isOwner || isAdmin) {
        console.log(`[CLEAR_ROLES] 玩家 ${serverPlayerCode} 是房主或管理员，允许清空`);
      } else {
        console.log(`[CLEAR_ROLES] 玩家 ${serverPlayerCode} 不是房间成员也不是房主 (room.state.fox=${room.state.fox?.playerCode}, room.state.bunny=${room.state.bunny?.playerCode})`);
        socket.emit('private_room_error', '只有房间成员可以清空角色选择');
        return;
      }
    }

    console.log(`[CLEAR_ROLES] 玩家 ${serverPlayerCode} 清空房间 ${roomId} 的角色选择`);

    // 清空角色信息
    room.state.fox = null;
    room.state.bunny = null;
    // 同时将游戏状态改回 setup，允许重新选角
    room.state.gameState = 'setup';

    // 持久化到数据库
    vipRoomOps.clearPlayers(roomId);
    // 更新游戏状态为 setup
    vipRoomOps.updateGameState(roomId, { game_state: 'setup' });

    // 关键修复：清除房间内所有 socket 的角色数据（包括请求者和其他玩家）
    // 这样才能让所有玩家重新选角，避免身份混乱
    for (const [, s] of io.sockets.sockets) {
      if (s.data.roomId === roomId || s.rooms.has(roomId)) {
        s.data.role = null;
        s.data.player = null;
      }
    }

    // 广播 reset_game 给所有玩家，确保分数和准备状态重置
    io.to(roomId).emit('reset_game');

    // 同步给所有玩家 - 包括清空后的状态
    io.to(roomId).emit('sync_room', {
      fox: null,
      bunny: null,
      foxReady: false,
      bunnyReady: false
    });

    // 额外发送一个 clear_room_roles_result 事件给操作者
    socket.emit('clear_room_roles_result', { success: true });

    console.log(`[CLEAR_ROLES] 房间 ${roomId} 角色已清空，所有 socket 角色数据已重置`);
  });

  // ========== 玩家档案系统（档案码 + 密码）==========

  // 检查档案码是否可用
  socket.on('check_player_code', (playerCode) => {
    // 验证格式：6-8 位字母或数字
    if (!/^[a-zA-Z0-9]{6,8}$/.test(playerCode)) {
      socket.emit('check_player_code_result', {
        available: false,
        error: '档案码格式不正确（6-8 位字母或数字）'
      });
      return;
    }

    const available = playerOps.isCodeAvailable(playerCode);
    socket.emit('check_player_code_result', {
      available,
      error: available ? null : '该档案码已被占用'
    });
  });

  // 创建玩家档案
  socket.on('create_player_profile', ({ playerCode, password, nickname }) => {
    // 验证格式
    if (!/^[a-zA-Z0-9]{6,8}$/.test(playerCode)) {
      socket.emit('player_profile_result', {
        success: false,
        error: '档案码格式不正确（6-8 位字母或数字）'
      });
      return;
    }

    if (password.length < 4) {
      socket.emit('player_profile_result', {
        success: false,
        error: '密码长度至少 4 位'
      });
      return;
    }

    // 检查是否已被占用
    if (!playerOps.isCodeAvailable(playerCode)) {
      socket.emit('player_profile_result', {
        success: false,
        error: '该档案码已被占用'
      });
      return;
    }

    // 创建档案
    try {
      const passwordHash = hashPassword(password);
      // 如果没有昵称，使用档案码作为默认昵称
      playerOps.create(playerCode, passwordHash, nickname || playerCode);

      // 给新玩家赠送一些初始物品（测试用）
      inventoryOps.add(playerCode, 'default_gun_001', 'GUN');

      socket.emit('player_profile_result', {
        success: true,
        playerCode
      });
      console.log(`[PROFILE] 玩家档案创建成功：${playerCode} (${nickname || playerCode})`);
    } catch (err) {
      socket.emit('player_profile_result', {
        success: false,
        error: '创建失败，请稍后重试'
      });
      console.error('[PROFILE] 创建档案失败:', err);
    }
  });

  // 玩家登录
  socket.on('login_player', ({ playerCode, password }) => {
    // 支持两种登录方式：
    // 1. 正常登录：password 是原始密码，需要 hash 后比对
    // 2. 自动重连登录：password 已经是 SHA256 哈希，直接比对
    // 正常登录：password 是原始密码，需要 hash 后比对
    let passwordHash = hashPassword(password);
    let player = playerOps.getByCodeAndPassword(playerCode, passwordHash);
    if (!player) {
      // 自动重连场景：password 已经是哈希值，直接比对
      passwordHash = password;
      player = playerOps.getByCodeAndPassword(playerCode, password);
    }

    if (player) {
      // 更新登录天数和 VIP 等级（可能返回 undefined，需要兜底）
      let loginDays = player.login_days || 1;
      let vipLevel = player.vip_level || 0;
      try {
        const result = playerOps.updateLoginDays(playerCode);
        if (result) {
          loginDays = result.loginDays;
          vipLevel = result.vipLevel;
        }
      } catch (err) {
        console.error('[LOGIN] updateLoginDays 失败:', err);
      }

      socket.emit('login_result', {
        success: true,
        player: {
          playerCode: player.player_code,
          nickname: player.nickname,
          carrotCount: player.carrot_count,
          cheeseBalance: player.cheese_balance || 0,
          cheeseDeposits: player.cheese_deposits || 0,
          cheeseLoans: player.cheese_loans || 0,
          totalGames: player.total_games,
          winGames: player.win_games,
          vipLevel,
          loginDays,
          heightCm: player.height_cm,
          weightKg: player.weight_kg,
          birthday: player.birthday,
          avatarUrl: player.avatar_url,
          fullbodyImageUrl: player.fullbody_image_url,
          bio: player.bio,
          hobbies: JSON.parse(player.hobbies || '[]'),
          displayedEffectId: player.displayed_effect_id,
          displayedGunId: player.displayed_gun_id,
          equippedClothesId: player.equipped_clothes_id,
          equippedHeadwearId: player.equipped_headwear_id,
          equippedAccessoryId: player.equipped_accessory_id,
          equippedShoesId: player.equipped_shoes_id,
          passwordHash // 返回密码哈希，用于 localStorage 保存
        }
      });

      // 保存玩家档案码到 socket.data
      socket.data.playerCode = playerCode;

      // KADEGOU 超级管理员福利
      if (playerCode === 'KADEGOU') {
        const kadBalance = cheeseOps.getBalance(playerCode);
        if (kadBalance < 50) {
          cheeseOps.addCheese(playerCode, 50 - kadBalance);
        }
      }

      // 发送未读通知数量
      const unreadCount = notificationOps.getUnreadCount(playerCode);
      socket.emit('mail_unread_count', unreadCount);

      console.log(`[PROFILE] 玩家登录成功：${playerCode}, VIP: ${vipLevel}, 登录天数：${loginDays}`);
    } else {
      socket.emit('login_result', {
        success: false,
        error: '档案码或密码错误'
      });
      console.log(`[PROFILE] 玩家登录失败：${playerCode}`);
    }
  });

  // 获取玩家档案详情
  socket.on('get_player_profile', (playerCode) => {
    const player = playerOps.getByCode(playerCode);
    if (player) {
      socket.emit('player_profile', {
        playerCode: player.player_code,
        nickname: player.nickname,
        carrotCount: player.carrot_count,
        totalGames: player.total_games,
        winGames: player.win_games,
        vipLevel: player.vip_level,
        heightCm: player.height_cm,
        weightKg: player.weight_kg,
        birthday: player.birthday,
        avatarUrl: player.avatar_url,
        fullbodyImageUrl: player.fullbody_image_url,
        bio: player.bio,
        hobbies: JSON.parse(player.hobbies || '[]'),
        displayedEffectId: player.displayed_effect_id,
        displayedGunId: player.displayed_gun_id,
        equippedClothesId: player.equipped_clothes_id,
        equippedHeadwearId: player.equipped_headwear_id,
        equippedAccessoryId: player.equipped_accessory_id,
        equippedShoesId: player.equipped_shoes_id
      });
    }
  });

  // 更新玩家档案
  socket.on('update_player_profile', ({ playerCode, updates }) => {
    // 验证是本人操作（简单验证，生产环境需要 token）
    if (socket.data.playerCode !== playerCode) {
      socket.emit('update_player_profile_result', {
        success: false,
        error: '无权操作'
      });
      return;
    }

    playerOps.update(playerCode, updates);

    // 获取更新后的完整资料
    const updatedProfile = playerOps.getByCode(playerCode);

    // 返回给发送者
    socket.emit('update_player_profile_result', {
      success: true,
      profile: updatedProfile
    });

    // 广播给房间内其他玩家（如果有）
    const { roomId } = socket.data;
    if (roomId) {
      socket.to(roomId).emit('player_profile_updated', {
        playerCode,
        profile: updatedProfile
      });
    }
  });

  // 修改玩家昵称
  socket.on('change_nickname', ({ playerCode, newNickname }) => {
    // 验证是本人操作
    if (socket.data.playerCode !== playerCode) {
      socket.emit('change_nickname_result', {
        success: false,
        error: '无权操作'
      });
      return;
    }

    const result = playerOps.changeNickname(playerCode, newNickname);
    // 返回新昵称，让客户端更新本地状态
    if (result.success) {
      const updated = playerOps.getByCode(playerCode);
      result.newNickname = updated?.nickname;
    }
    socket.emit('change_nickname_result', result);
  });

  // 获取玩家物品背包
  socket.on('get_player_inventory', (playerCode) => {
    const inventory = inventoryOps.getAll(playerCode);
    socket.emit('player_inventory', inventory);
  });

  // ========== 电子宠物系统 ==========
  // 获取宠物状态
  socket.on('get_pet_status', (playerCode) => {
    const pet = petOps.getOrCreate(playerCode);
    if (pet) {
      socket.emit('pet_status', pet);
    } else {
      socket.emit('pet_error', { error: '获取宠物状态失败' });
    }
  });

  // 孵化宠物蛋（IP 盲盒）
  socket.on('incubate_pet', ({ playerCode }) => {
    const pet = petOps.get(playerCode);
    if (pet) {
      socket.emit('pet_error', { error: '已经拥有宠物，无法领取新的宠物蛋' });
      return;
    }

    // 检查奶酪余额
    const balance = cheeseOps.getBalance(playerCode);
    if (balance < INCUBATE_CHEESE_COST) {
      socket.emit('cheese_error', { error: `奶酪不足！孵化需要 ${INCUBATE_CHEESE_COST} 🧀，当前余额：${balance}` });
      return;
    }

    // 扣除奶酪
    cheeseOps.removeCheese(playerCode, INCUBATE_CHEESE_COST);

    const now = Math.floor(Date.now() / 1000);
    const hatchTime = now + EGG_HATCH_TIME;

    // 随机选择一个 IP 宠物
    const randomPet = IP_PET_POOL[Math.floor(Math.random() * IP_PET_POOL.length)];

    // 创建蛋状态的宠物
    petOps.update(playerCode, {
      pet_name: '宠物蛋',
      pet_type: 'EGG',
      is_egg: 1,
      hatch_time: hatchTime,
      selected_pet_id: randomPet.id, // 预先确定结果
      selected_pet_name: randomPet.name,
      selected_pet_type: randomPet.type,
      last_login_time: now
    });

    const newPet = petOps.get(playerCode);
    socket.emit('pet_created', newPet);
    console.log(`[PET] 玩家 ${playerCode} 花费 ${INCUBATE_CHEESE_COST}🧀 领取了宠物蛋，孵化时间：${hatchTime}`);
  });

  // 重置宠物（重新孵化，适用于已有宠物的玩家）
  socket.on('reroll_pet', ({ playerCode }) => {
    // 检查奶酪余额
    const balance = cheeseOps.getBalance(playerCode);
    if (balance < INCUBATE_CHEESE_COST) {
      socket.emit('cheese_error', { error: `奶酪不足！重置宠物需要 ${INCUBATE_CHEESE_COST} 🧀，当前余额：${balance}` });
      return;
    }

    // 扣除奶酪
    cheeseOps.removeCheese(playerCode, INCUBATE_CHEESE_COST);

    const now = Math.floor(Date.now() / 1000);
    const hatchTime = now + EGG_HATCH_TIME;

    // 随机选择一个 IP 宠物
    const randomPet = IP_PET_POOL[Math.floor(Math.random() * IP_PET_POOL.length)];

    // 重置为蛋状态
    petOps.update(playerCode, {
      pet_name: '宠物蛋',
      pet_type: 'EGG',
      is_egg: 1,
      hatch_time: hatchTime,
      selected_pet_id: randomPet.id,
      selected_pet_name: randomPet.name,
      selected_pet_type: randomPet.type,
      last_login_time: now,
      level: 1,
      experience: 0,
      hunger: 100,
      mood: 100,
      cleanliness: 100,
      energy: 100
    });

    const newPet = petOps.get(playerCode);
    socket.emit('pet_created', newPet);
    console.log(`[PET] 玩家 ${playerCode} 花费 ${INCUBATE_CHEESE_COST}🧀 重置宠物蛋，孵化时间：${hatchTime}`);
  });

  // 创建宠物（直接创建，无孵化）
  socket.on('create_pet', ({ playerCode, petName, petType }) => {
    const pet = petOps.get(playerCode);
    if (pet) {
      socket.emit('pet_error', { error: '已经拥有宠物，无法创建' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    petOps.update(playerCode, {
      pet_name: petName || '小宠物',
      pet_type: petType || 'FOX',
      last_login_time: now
    });

    const newPet = petOps.get(playerCode);
    socket.emit('pet_created', newPet);
  });

  // 喂食宠物
  socket.on('feed_pet', ({ playerCode, foodId }) => {
    const food = PET_FOODS.find(f => f.id === foodId);
    if (!food) {
      socket.emit('pet_error', { error: '无效的道具 ID' });
      return;
    }

    // 消耗物品
    const consumeResult = petOps.consumeItem(playerCode, foodId, 'FOOD');
    if (!consumeResult.success) {
      socket.emit('pet_error', { error: consumeResult.error || '道具不足' });
      return;
    }

    const result = petOps.feed(playerCode, foodId, food.effect);
    if (result.success) {
      socket.emit('pet_updated', result.pet);
      socket.emit('pet_item_consumed', { itemId: foodId, remaining: consumeResult.remaining });
    } else {
      socket.emit('pet_error', { error: result.error });
    }
  });

  // 玩耍
  socket.on('play_with_pet', ({ playerCode, toyId }) => {
    const toy = PET_TOYS.find(t => t.id === toyId);
    if (!toy) {
      socket.emit('pet_error', { error: '无效的道具 ID' });
      return;
    }

    const result = petOps.play(playerCode, toyId, toy.effect);
    if (result.success) {
      socket.emit('pet_updated', result.pet);
    } else {
      socket.emit('pet_error', { error: result.error });
    }
  });

  // 清洁宠物
  socket.on('clean_pet', ({ playerCode }) => {
    const result = petOps.clean(playerCode);
    if (result.success) {
      socket.emit('pet_updated', result.pet);
    } else {
      socket.emit('pet_error', { error: result.error });
    }
  });

  // 获取宠物物品
  socket.on('get_pet_items', (playerCode) => {
    const items = petOps.getItems(playerCode);
    socket.emit('pet_items', items);
  });

  // 购买宠物物品（使用奶酪货币）
  socket.on('buy_pet_item', ({ playerCode, itemId, itemType, cost }) => {
    const player = playerOps.get(playerCode);
    if (!player || player.cheese_balance < cost) {
      socket.emit('pet_error', { error: '奶酪不足' });
      return;
    }

    // 扣除奶酪
    const newCheeseBalance = player.cheese_balance - cost;
    playerOps.update(playerCode, { cheese_balance: newCheeseBalance });

    // 添加物品
    petOps.addItem(playerCode, itemId, itemType, 1);

    socket.emit('pet_item_purchased', {
      itemId,
      itemType,
      remainingCheese: newCheeseBalance
    });

    console.log(`[PET_SHOP] 玩家 ${playerCode} 购买了 ${itemId}, 花费 ${cost} 奶酪`);
  });

  // ========== 奶酪央行系统 ==========
  // 获取玩家财务总览
  socket.on('get_cheese_summary', (playerCode) => {
    // 验证：优先用 socket.data.playerCode，未设置时从数据库验证
    if (socket.data.playerCode) {
      if (socket.data.playerCode !== playerCode) {
        socket.emit('cheese_error', { error: '无权操作' });
        return;
      }
    } else {
      // 自动登录尚未同步完成，直接查 DB 验证玩家存在
      const player = playerOps.getByCode(playerCode);
      if (!player) {
        socket.emit('cheese_error', { error: '无权操作' });
        return;
      }
      socket.data.playerCode = playerCode;
    }

    const summary = cheeseOps.getFinancialSummary(playerCode);
    if (summary) {
      socket.emit('cheese_summary', summary);
    } else {
      socket.emit('cheese_error', { error: '获取财务信息失败' });
    }
  });

  // 每日登录领取奶酪（1 奶酪/天）
  socket.on('claim_daily_cheese', (data) => {
    const pc = typeof data === 'string' ? data : data?.playerCode;
    if (!pc) {
      socket.emit('cheese_error', { error: '参数错误' });
      return;
    }
    // 验证：优先用 socket.data.playerCode，未设置时从数据库验证
    if (socket.data.playerCode) {
      if (socket.data.playerCode !== pc) {
        socket.emit('cheese_error', { error: '无权操作' });
        return;
      }
    } else {
      const player = playerOps.getByCode(pc);
      if (!player) {
        socket.emit('cheese_error', { error: '无权操作' });
        return;
      }
      socket.data.playerCode = pc;
    }

    // 使用本地时间（中国时区 CST UTC+8）而非 UTC
    const now = new Date();
    const cstTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const today = cstTime.toISOString().split('T')[0];
    const lastClaimDate = cheeseOps.getLastClaimDate(pc);

    console.log(`[CHEESE] 玩家 ${pc} 请求签到，today=${today}, lastClaimDate=${lastClaimDate}`);

    if (lastClaimDate === today) {
      console.log(`[CHEESE] 玩家 ${pc} 今日已领取，跳过`);
      socket.emit('cheese_error', { error: '今日已领取过奶酪' });
      return;
    }

    // 增加 1 奶酪
    cheeseOps.addCheese(pc, 1);

    // 更新最后领取日期
    const stmt = getDb().prepare(`
      UPDATE player_profiles
      SET last_cheese_claim = ?
      WHERE player_code = ?
    `);
    stmt.run([today, pc]);

    const newBalance = cheeseOps.getBalance(pc);
    // 记录钱包交易
    walletOps.add(pc, 'CHEESE', 'DAILY_CLAIM', 1, '每日签到 +1 🧀', `每日登录领取奶酪奖励 (${today})`);
    socket.emit('daily_cheese_claimed', { amount: 1, balance: newBalance, date: today });
    console.log(`[CHEESE] 玩家 ${pc} 领取了每日奶酪奖励，当前余额：${newBalance}`);
  });

  // 获取钱包交易记录
  socket.on('get_wallet_transactions', ({ playerCode, currency }) => {
    if (socket.data.playerCode && socket.data.playerCode !== playerCode) {
      socket.emit('wallet_transactions', []);
      return;
    }
    const player = playerOps.get(playerCode);
    if (!player) {
      socket.emit('wallet_transactions', []);
      return;
    }
    let transactions;
    if (currency) {
      transactions = walletOps.getTransactionsByCurrency(playerCode, currency, 50);
    } else {
      transactions = walletOps.getTransactions(playerCode, 50);
    }
    socket.emit('wallet_transactions', transactions);
  });

  // 胡萝卜兑换奶酪（1 胡萝卜 = 5 奶酪）
  socket.on('exchange_carrot_to_cheese', ({ playerCode, carrotAmount }) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.exchangeCarrotToCheese(playerCode, carrotAmount);
    if (result.success) {
      const newBalance = cheeseOps.getBalance(playerCode);
      socket.emit('carrot_exchanged', {
        carrotAmount,
        cheeseAmount: result.cheeseAmount,
        newBalance
      });
      console.log(`[CHEESE] 玩家 ${playerCode} 兑换了 ${carrotAmount} 胡萝卜，获得 ${result.cheeseAmount} 奶酪`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 存款
  socket.on('deposit_cheese', ({ playerCode, amount }) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.deposit(playerCode, amount);
    if (result.success) {
      const summary = cheeseOps.getFinancialSummary(playerCode);
      socket.emit('deposit_success', { amount, summary });
      console.log(`[CHEESE] 玩家 ${playerCode} 存入 ${amount} 奶酪`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 取款
  socket.on('withdraw_cheese', ({ playerCode, amount }) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.withdraw(playerCode, amount);
    if (result.success) {
      const summary = cheeseOps.getFinancialSummary(playerCode);
      socket.emit('withdraw_success', { amount, summary });
      console.log(`[CHEESE] 玩家 ${playerCode} 取出 ${amount} 奶酪`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 贷款
  socket.on('take_loan', ({ playerCode, amount }) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.takeLoan(playerCode, amount);
    if (result.success) {
      const summary = cheeseOps.getFinancialSummary(playerCode);
      socket.emit('loan_success', { amount, dueDate: result.dueDate, summary });
      console.log(`[CHEESE] 玩家 ${playerCode} 贷款 ${amount} 奶酪，到期日：${result.dueDate}`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 还款
  socket.on('repay_loan', ({ playerCode, amount }) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.repayLoan(playerCode, amount);
    if (result.success) {
      const summary = cheeseOps.getFinancialSummary(playerCode);
      socket.emit('repay_success', { amount, summary });
      console.log(`[CHEESE] 玩家 ${playerCode} 还款 ${amount} 奶酪`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 结算利息
  socket.on('settle_interest', (playerCode) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.settleInterest(playerCode);
    if (result.success) {
      const summary = cheeseOps.getFinancialSummary(playerCode);
      socket.emit('interest_settled', { interest: result.interest, summary });
      console.log(`[CHEESE] 玩家 ${playerCode} 结算利息，获得 ${result.interest} 奶酪`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // ========== 你画我猜词库 ==========
  const DRAW_WORD_LIST = [
    // 动物 (20)
    '猫', '狗', '兔子', '鱼', '鸟', '蛇', '龙', '蝴蝶', '乌龟', '螃蟹',
    '大象', '长颈鹿', '企鹅', '熊猫', '猴子', '老虎', '狮子', '熊', '鸡', '鸭子',
    // 交通工具 (10)
    '汽车', '飞机', '火车', '轮船', '自行车', '摩托车', '火箭', '校车', '消防车', '救护车',
    // 自然 (10)
    '太阳', '月亮', '星星', '云朵', '彩虹', '山', '大海', '树', '花', '雪人',
    // 食物 (10)
    '苹果', '西瓜', '汉堡', '披萨', '蛋糕', '冰淇淋', '面条', '饺子', '棒棒糖', '葡萄',
    // 日常物品 (15)
    '房子', '椅子', '桌子', '电话', '手机', '雨伞', '帽子', '鞋子', '眼镜', '书',
    '电脑', '钥匙', '剪刀', '钟表', '灯泡',
    // 人物与运动 (10)
    '医生', '老师', '篮球', '足球', '游泳', '跳绳', '滑雪', '钓鱼', '画画', '弹琴',
    // 建筑与场所 (8)
    '学校', '医院', '超市', '图书馆', '电影院', '城堡', '监狱', '灯塔',
    // 其他 (8)
    '电话亭', '气球', '风筝', '炸弹', '骷髅', '魔鬼', '天使', '外星人'
  ];

  // 从词库随机选词（避免重复）
  function pickDrawWord(usedWords) {
    const available = DRAW_WORD_LIST.filter(w => !usedWords?.includes(w));
    if (available.length === 0) return DRAW_WORD_LIST[Math.floor(Math.random() * DRAW_WORD_LIST.length)];
    return available[Math.floor(Math.random() * available.length)];
  }

  // ========== 你画我猜事件 ==========

  // 启动或重新加入你画我猜
  socket.on('draw_game_start', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 如果已有活跃的 draw 游戏，直接重新加入
    if (room.drawState?.active) {
      console.log(`[DRAW_GUESS] 玩家 ${socket.data.playerCode} 重新加入已有画板游戏: ${roomId}`);
      socket.emit('draw_mode_switched', room.drawState.round);
      // 如果是画画者，重新发送词
      if (room.drawState.round.drawerCode === socket.data.playerCode) {
        socket.emit('draw_word', { word: room.drawState.round.word, drawerCode: socket.data.playerCode });
      }
      // 重发所有笔画（恢复画布）
      socket.emit('draw_clear');
      if (room.drawState.strokes) {
        for (const stroke of room.drawState.strokes) {
          socket.emit('draw_stroke', stroke);
        }
      }
      return;
    }

    console.log(`[DRAW_GUESS] 游戏启动: ${roomId}`);

    // 确定谁先画：先选角色的先画（fox先手）
    const fox = room.state.fox;
    const bunny = room.state.bunny;
    if (!fox || !bunny) {
      socket.emit('draw_error', '需要两名玩家才能开始你画我猜');
      return;
    }

    const drawer = fox;
    const guesser = bunny;
    const word = pickDrawWord();
    const usedWords = [word];

    // 初始化 drawState
    room.drawState = {
      active: true,
      round: {
        word,
        drawerCode: drawer.playerCode,
        drawerName: drawer.player?.nickname || drawer.player?.name || '',
        guesserCode: guesser.playerCode,
        guesserName: guesser.player?.nickname || guesser.player?.name || '',
        timerSeconds: 120,
        timerEnabled: false,
        score: {},
        usedWords
      },
      timerId: null,
      strokes: []  // 存储所有笔画用于重连恢复
    };

    // 广播切换到画板模式
    io.to(roomId).emit('draw_mode_switched', {
      word: null, // 不广播词（只有画画者知道）
      drawerCode: drawer.playerCode,
      drawerName: drawer.player?.nickname || drawer.player?.name || '',
      timerEnabled: false,
      timerSeconds: 120
    });

    // 私发词给画画者
    socket.emit('draw_word', { word, drawerCode: drawer.playerCode });
    if (drawer.socketId && drawer.socketId !== socket.id) {
      socket.to(drawer.socketId).emit('draw_word', { word, drawerCode: drawer.playerCode });
    }

    console.log(`[DRAW_GUESS] 画画者: ${drawer.player?.nickname}, 词: ${word}`);
  });

  // 笔画转发
  socket.on('draw_stroke', ({ roomId, points, color, lineWidth }) => {
    const room = rooms.get(roomId);
    if (!room?.drawState?.active) return;
    const stroke = { points, color, lineWidth };
    room.drawState.strokes.push(stroke);
    socket.to(roomId).emit('draw_stroke', stroke);
  });

  // 清空画布转发
  socket.on('draw_clear', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room?.drawState?.active) return;
    room.drawState.strokes = [];
    socket.to(roomId).emit('draw_clear');
  });

  // 提交猜测
  socket.on('draw_guess', ({ roomId, answer, playerCode, playerName }) => {
    const room = rooms.get(roomId);
    if (!room?.drawState?.active) return;

    const round = room.drawState.round;
    const normalized = (str) => str.trim().toLowerCase();

    if (normalized(answer) === normalized(round.word)) {
      console.log(`[DRAW_GUESS] ${playerName} 猜对了！答案：${round.word}`);

      // 计分：给猜对的人加分
      if (!round.score[playerCode]) round.score[playerCode] = 0;
      round.score[playerCode] = (round.score[playerCode] || 0) + 1;

      // 同步分数到主计分板（猜对+1分）
      const room = rooms.get(roomId);
      if (room) {
        if (room.state.fox?.playerCode === playerCode) {
          room.state.fox.player.score = (room.state.fox.player.score || 0) + 1;
          vipRoomOps.updateGameState(roomId, { fox_score: room.state.fox.player.score });
        } else if (room.state.bunny?.playerCode === playerCode) {
          room.state.bunny.player.score = (room.state.bunny.player.score || 0) + 1;
          vipRoomOps.updateGameState(roomId, { bunny_score: room.state.bunny.player.score });
        }
        // 广播分数更新
        const syncData = {
          fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
          bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
          foxReady: room.state.fox?.isReady,
          bunnyReady: room.state.bunny?.isReady
        };
        io.to(roomId).emit('sync_room', syncData);
      }

      // 广播猜对
      io.to(roomId).emit('draw_correct', { guessedBy: playerName, word: round.word, score: round.score });
      // 同时广播猜测内容（让画画者看到谁猜对了）
      io.to(roomId).emit('draw_wrong_guess', { playerName, answer: round.word, isCorrect: true });

      // 3秒后自动下一轮
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom?.drawState?.active) {
          // 轮换角色
          const currentDrawer = currentRoom.drawState.round.drawerCode;
          let drawer, guesser;
          if (currentRoom.state.fox?.playerCode === currentDrawer) {
            drawer = currentRoom.state.bunny;
            guesser = currentRoom.state.fox;
          } else {
            drawer = currentRoom.state.fox;
            guesser = currentRoom.state.bunny;
          }

          if (!drawer || !guesser) return;

          const newWord = pickDrawWord(currentRoom.drawState.round.usedWords);
          currentRoom.drawState.round.usedWords.push(newWord);
          currentRoom.drawState.round = {
            word: newWord,
            drawerCode: drawer.playerCode,
            drawerName: drawer.player?.nickname || drawer.player?.name || '',
            guesserCode: guesser.playerCode,
            guesserName: guesser.player?.nickname || guesser.player?.name || '',
            timerSeconds: currentRoom.drawState.round.timerSeconds,
            timerEnabled: currentRoom.drawState.round.timerEnabled,
            score: currentRoom.drawState.round.score,
            usedWords: currentRoom.drawState.round.usedWords
          };

          // 清空笔画
          currentRoom.drawState.strokes = [];

          io.to(roomId).emit('draw_next_round', currentRoom.drawState.round);

          // 私发词给新画画者
          const drawerSocket = [...io.sockets.sockets.values()].find(s => s.data.playerCode === drawer.playerCode);
          if (drawerSocket) {
            drawerSocket.emit('draw_word', { word: newWord, drawerCode: drawer.playerCode });
          }
        }
      }, 3000);
    } else {
      // 猜错：广播猜测内容给所有人（让画画者看到猜词者的答案）
      io.to(roomId).emit('draw_guess_update', { playerName, answer, isCorrect: false });
      console.log(`[DRAW_GUESS] ${playerName} 猜错了：${answer}`);
    }
  });

  // 跳过本回合
  socket.on('draw_next_round', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room?.drawState?.active) return;

    const round = room.drawState.round;
    const currentDrawer = round.drawerCode;
    let drawer, guesser;
    if (room.state.fox?.playerCode === currentDrawer) {
      drawer = room.state.bunny;
      guesser = room.state.fox;
    } else {
      drawer = room.state.fox;
      guesser = room.state.bunny;
    }

    if (!drawer || !guesser) return;

    const newWord = pickDrawWord(round.usedWords);
    round.usedWords.push(newWord);

    if (room.drawState.timerId) {
      clearTimeout(room.drawState.timerId);
      room.drawState.timerId = null;
    }

    room.drawState.round = {
      word: newWord,
      drawerCode: drawer.playerCode,
      drawerName: drawer.player?.nickname || drawer.player?.name || '',
      guesserCode: guesser.playerCode,
      guesserName: guesser.player?.nickname || guesser.player?.name || '',
      timerSeconds: round.timerSeconds,
      timerEnabled: round.timerEnabled,
      score: round.score,
      usedWords: round.usedWords
    };

    // 清空笔画并开始新回合
    room.drawState.strokes = [];

    io.to(roomId).emit('draw_next_round', room.drawState.round);

    // 私发词给新画画者
    const drawerSocket = [...io.sockets.sockets.values()].find(s => s.data.playerCode === drawer.playerCode);
    if (drawerSocket) {
      drawerSocket.emit('draw_word', { word: newWord, drawerCode: drawer.playerCode });
    }

    console.log(`[DRAW_GUESS] 跳过回合，新画画者：${drawer.player?.nickname}`);
  });

  // 计时器开关
  socket.on('draw_toggle_timer', ({ roomId, enabled, seconds }) => {
    const room = rooms.get(roomId);
    if (!room?.drawState?.active) return;
    room.drawState.round.timerEnabled = enabled;
    room.drawState.round.timerSeconds = seconds || 120;
    console.log(`[DRAW_GUESS] 计时器：${enabled ? '开启' : '关闭'}，${seconds}秒`);
  });

  // 计时结束
  socket.on('draw_time_up', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room?.drawState?.active) return;

    const round = room.drawState.round;
    console.log(`[DRAW_GUESS] 时间到！答案：${round.word}`);

    // 3秒后自动下一轮
    setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom?.drawState?.active) {
        const currentDrawer = currentRoom.drawState.round.drawerCode;
        let drawer, guesser;
        if (currentRoom.state.fox?.playerCode === currentDrawer) {
          drawer = currentRoom.state.bunny;
          guesser = currentRoom.state.fox;
        } else {
          drawer = currentRoom.state.fox;
          guesser = currentRoom.state.bunny;
        }
        if (!drawer || !guesser) return;

        const newWord = pickDrawWord(currentRoom.drawState.round.usedWords);
        currentRoom.drawState.round.usedWords.push(newWord);
        currentRoom.drawState.round = {
          word: newWord,
          drawerCode: drawer.playerCode,
          drawerName: drawer.player?.nickname || drawer.player?.name || '',
          guesserCode: guesser.playerCode,
          guesserName: guesser.player?.nickname || guesser.player?.name || '',
          timerSeconds: currentRoom.drawState.round.timerSeconds,
          timerEnabled: currentRoom.drawState.round.timerEnabled,
          score: currentRoom.drawState.round.score,
          usedWords: currentRoom.drawState.round.usedWords
        };
        // 清空笔画
        currentRoom.drawState.strokes = [];
        io.to(roomId).emit('draw_next_round', currentRoom.drawState.round);
        const drawerSocket = [...io.sockets.sockets.values()].find(s => s.data.playerCode === drawer.playerCode);
        if (drawerSocket) {
          drawerSocket.emit('draw_word', { word: newWord, drawerCode: drawer.playerCode });
        }
      }
    }, 3000);
  });

  // 退出你画我猜
  socket.on('draw_game_end', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    console.log(`[DRAW_GUESS] 退出游戏: ${roomId}`);

    if (room.drawState?.timerId) {
      clearTimeout(room.drawState.timerId);
    }
    room.drawState = null;

    // 只通知退出的人（如果是主动点击退出，广播给其他人）
    // 私密房间中，如果一方掉线另一方退出，不广播（掉线的人收不到会困惑）
    socket.to(roomId).emit('draw_game_ended');
  });

  // ========== OMO 机制相关 ==========
  // 获取待审批提案
  socket.on('get_pending_proposals', () => {
    const proposals = cheeseOps.getPendingProposals();
    socket.emit('pending_proposals', proposals);
  });

  // 获取转账历史
  socket.on('get_transfer_history', (playerCode) => {
    if (socket.data.playerCode !== playerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }
    const history = cheeseOps.getTransferHistory(playerCode);
    socket.emit('transfer_history', history);
  });

  // 创建 OMO 胡萝卜赠送提案
  socket.on('create_carrot_gift_proposal', ({ targetPlayerCode, carrotAmount, proposerCode, proposerRole }) => {
    if (socket.data.playerCode !== proposerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    // 验证提案人是否是荣誉董事
    const validDirectors = ['KADEGOU', 'JINNALUV'];
    if (!validDirectors.includes(proposerCode)) {
      socket.emit('cheese_error', { error: '只有荣誉董事才能创建 OMO 提案' });
      return;
    }

    const result = cheeseOps.createCarrotGiftProposal(targetPlayerCode, carrotAmount, proposerCode, proposerRole);
    if (result.success) {
      socket.emit('proposal_created', { proposalId: result.proposalId });
      console.log(`[OMO] 荣誉董事 ${proposerCode} 创建了 OMO 提案：赠送 ${carrotAmount} 胡萝卜给 ${targetPlayerCode}`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 审批 OMO 提案
  socket.on('approve_proposal', ({ proposalId, approverCode, approverRole }) => {
    if (socket.data.playerCode !== approverCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.approveProposal(proposalId, approverCode, approverRole);
    if (result.success) {
      socket.emit('proposal_approved', { proposalId, readyToExecute: result.readyToExecute });
      console.log(`[OMO] 荣誉董事 ${approverCode} 审批了提案 ${proposalId}, 可执行：${result.readyToExecute}`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 执行 OMO 提案
  socket.on('execute_proposal', (proposalId) => {
    const result = cheeseOps.executeProposal(proposalId);
    if (result.success) {
      const proposal = cheeseOps.getProposal(proposalId);
      // 记录接收方钱包交易
      walletOps.add(proposal.target_player_code, 'CARROT', 'OMO_RECEIVED', result.amount, `OMO 央行赠送 +${result.amount} 🥕`, `央行 OMO 机制赠送胡萝卜`);
      socket.emit('proposal_executed', { amount: result.amount, targetPlayerCode: proposal.target_player_code });
      console.log(`[OMO] 执行提案 ${proposalId}: 赠送 ${result.amount} 胡萝卜给 ${proposal.target_player_code}`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 手动赠送胡萝卜
  socket.on('gift_carrot', ({ fromPlayerCode, toPlayerCode, amount }) => {
    if (socket.data.playerCode !== fromPlayerCode) {
      socket.emit('cheese_error', { error: '无权操作' });
      return;
    }

    const result = cheeseOps.giftCarrot(fromPlayerCode, toPlayerCode, amount);
    if (result.success) {
      // 记录赠送方钱包交易
      walletOps.add(fromPlayerCode, 'CARROT', 'GIFT_SENT', -amount, `赠送胡萝卜给 ${toPlayerCode} -${amount} 🥕`, `手动赠送胡萝卜`);
      // 记录接收方钱包交易
      walletOps.add(toPlayerCode, 'CARROT', 'GIFT_RECEIVED', amount, `收到 ${fromPlayerCode} 赠送 +${amount} 🥕`, `收到手动赠送胡萝卜`, fromPlayerCode);
      socket.emit('carrot_gifted', { amount, toPlayer: toPlayerCode });
      console.log(`[GIFT] 玩家 ${fromPlayerCode} 赠送 ${amount} 胡萝卜给 ${toPlayerCode}`);
    } else {
      socket.emit('cheese_error', { error: result.error });
    }
  });

  // 获取所有玩家档案列表
  socket.on('get_player_list', () => {
    const players = playerOps.getAll();
    socket.emit('player_list', players);
  });

  // ========== 房主系统 ==========
  // 辅助函数：检查玩家是否在线
  function isPlayerOnline(playerCode) {
    const onlineSockets = [...io.sockets.sockets.values()].filter(s => s.data.playerCode === playerCode);
    if (onlineSockets.length === 0) return { online: false, socketId: null };
    // 返回任意一个活跃 socket
    return { online: true, socketId: onlineSockets[0].id };
  }

  // 获取房间成员列表（含在线状态）
  socket.on('get_room_members', (roomId) => {
    const room = vipRoomOps.get(roomId);
    if (!room) {
      socket.emit('room_members', { roomId, members: [], ownerPlayerCode: null });
      return;
    }

    const members = [];
    if (room.fox_player_code) {
      const foxProfile = playerOps.get(room.fox_player_code);
      const foxOnline = isPlayerOnline(room.fox_player_code);
      members.push({
        playerCode: room.fox_player_code,
        nickname: room.fox_nickname || room.fox_player_code,
        role: 'FOX',
        isReady: !!room.fox_ready,
        isOwner: room.owner_player_code === room.fox_player_code,
        vipLevel: foxProfile?.vip_level || 0,
        carrotCount: foxProfile?.carrot_count || 0,
        isOnline: foxOnline.online,
        socketId: foxOnline.socketId
      });
    }
    if (room.bunny_player_code) {
      const bunnyProfile = playerOps.get(room.bunny_player_code);
      const bunnyOnline = isPlayerOnline(room.bunny_player_code);
      members.push({
        playerCode: room.bunny_player_code,
        nickname: room.bunny_nickname || room.bunny_player_code,
        role: 'BUNNY',
        isReady: !!room.bunny_ready,
        isOwner: room.owner_player_code === room.bunny_player_code,
        vipLevel: bunnyProfile?.vip_level || 0,
        carrotCount: bunnyProfile?.carrot_count || 0,
        isOnline: bunnyOnline.online,
        socketId: bunnyOnline.socketId
      });
    }

    socket.emit('room_members', { roomId, members, ownerPlayerCode: room.owner_player_code });
  });

  // 踢人（仅房主或管理员可用）
  socket.on('kick_player', ({ roomId, playerCode }) => {
    const room = vipRoomOps.get(roomId);
    if (!room) {
      socket.emit('kick_player_result', { success: false, error: '房间不存在' });
      return;
    }

    // 验证操作者是房主或管理员（KADEGOU）
    const isAdmin = socket.data.playerCode === 'KADEGOU';
    if (!vipRoomOps.isOwner(roomId, socket.data.playerCode) && !isAdmin) {
      socket.emit('kick_player_result', { success: false, error: '只有房主可以踢人' });
      return;
    }

    // 不能踢房主自己（管理员也不能踢房主）
    if (playerCode === room.owner_player_code) {
      socket.emit('kick_player_result', { success: false, error: '不能踢房主' });
      return;
    }

    const success = vipRoomOps.kickPlayer(roomId, playerCode);
    if (success) {
      console.log(`[KICK] 房主 ${socket.data.playerCode} 将玩家 ${playerCode} 踢出房间 ${roomId}`);

      // 通知被踢的玩家
      const kickedSocket = Array.from(io.sockets.sockets.values()).find(s => s.data.playerCode === playerCode);
      if (kickedSocket) {
        kickedSocket.emit('kicked_from_room', { roomId, reason: '被房主踢出' });
        // 强制离开房间
        kickedSocket.leave(roomId);
      }

      // 通知房间内其他玩家
      io.to(roomId).emit('player_kicked', { playerCode });

      // 同步更新后的房间状态
      const syncData = {
        fox: room.fox_player_code && room.fox_player_code !== playerCode ? {
          playerCode: room.fox_player_code,
          nickname: room.fox_nickname,
          type: 'FOX',
          socketId: room.state?.fox?.socketId
        } : null,
        bunny: room.bunny_player_code && room.bunny_player_code !== playerCode ? {
          playerCode: room.bunny_player_code,
          nickname: room.bunny_nickname,
          type: 'BUNNY',
          socketId: room.state?.bunny?.socketId
        } : null,
        foxReady: room.fox_player_code && room.fox_player_code !== playerCode ? !!room.fox_ready : false,
        bunnyReady: room.bunny_player_code && room.bunny_player_code !== playerCode ? !!room.bunny_ready : false
      };
      io.to(roomId).emit('sync_room', syncData);

      socket.emit('kick_player_result', { success: true });
    } else {
      socket.emit('kick_player_result', { success: false, error: '踢人失败' });
    }
  });

  // 转让房主（仅房主或管理员可用）
  socket.on('transfer_ownership', ({ roomId, newOwnerPlayerCode }) => {
    const room = vipRoomOps.get(roomId);
    if (!room) {
      socket.emit('transfer_ownership_result', { success: false, error: '房间不存在' });
      return;
    }

    // 验证操作者是房主或管理员（KADEGOU）
    const isAdmin = socket.data.playerCode === 'KADEGOU';
    if (!vipRoomOps.isOwner(roomId, socket.data.playerCode) && !isAdmin) {
      socket.emit('transfer_ownership_result', { success: false, error: '只有房主可以转让' });
      return;
    }

    // 新房主必须是房间成员
    if (room.fox_player_code !== newOwnerPlayerCode && room.bunny_player_code !== newOwnerPlayerCode) {
      socket.emit('transfer_ownership_result', { success: false, error: '新房主必须是房间成员' });
      return;
    }

    const success = vipRoomOps.transferOwnership(roomId, newOwnerPlayerCode);
    if (success) {
      console.log(`[TRANSFER] 房主 ${socket.data.playerCode} 将房主转让给 ${newOwnerPlayerCode}`);

      // 通知房间内所有玩家
      io.to(roomId).emit('ownership_transferred', {
        roomId,
        newOwnerPlayerCode
      });

      socket.emit('transfer_ownership_result', { success: true, newOwnerPlayerCode });
    } else {
      socket.emit('transfer_ownership_result', { success: false, error: '转让失败' });
    }
  });

  // 主动离开私密房间（用户手动退出，但保留角色状态）
  socket.on('leave_private_room', ({ roomId }) => {
    const { playerCode } = socket.data;
    if (!roomId || !playerCode) {
      socket.emit('leave_private_room_result', { success: false, error: '房间或玩家信息不存在' });
      return;
    }

    const room = rooms.get(roomId);
    if (room) {
      // 保存游戏状态到数据库
      if (room.state.gameState === 'playing' || room.state.word) {
        vipRoomOps.updateGameState(roomId, {
          game_state: room.state.gameState || 'playing',
          word: room.state.word,
          punishments: room.state.punishments,
          fox_score: room.state.fox?.player?.score,
          bunny_score: room.state.bunny?.player?.score
        });
        console.log(`[LEAVE_ROOM] 玩家 ${playerCode} 主动离开私密房间 ${roomId}，游戏状态已保存到数据库`);
      }

      // 通知房间内其他玩家该玩家已离开（但不释放角色）
      socket.to(roomId).emit('player_left_temporarily', {
        role: socket.data.role,
        playerCode,
        playerName: socket.data.player?.name
      });
    }

    // 清除 socket 的房间数据，但不清除角色占用
    socket.data.roomId = null;
    socket.data.isPrivate = false;

    socket.emit('leave_private_room_result', { success: true });
    console.log(`[LEAVE_ROOM] 玩家 ${playerCode} 已离开私密房间 ${roomId}`);
  });

  // 断开连接
  socket.on('disconnect', (reason) => {
    const { roomId, role, isPrivate, playerCode } = socket.data;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // 私密房间：保留角色状态，不立即释放，只标记 socket 离线
        if (isPrivate) {
          // 记录玩家离线状态，但不释放角色
          console.log(`私密房间 ${roomId} 玩家 ${socket.id} 离线，保留角色状态 (原因：${reason})`);
          // 保存游戏状态到数据库（确保重连时能恢复）
          if (room.state.gameState === 'playing' || room.state.word) {
            vipRoomOps.updateGameState(roomId, {
              game_state: room.state.gameState || 'playing',
              word: room.state.word,
              punishments: room.state.punishments,
              fox_score: room.state.fox?.player?.score,
              bunny_score: room.state.bunny?.player?.score
            });
            console.log(`私密房间 ${roomId} 游戏状态已保存到数据库，分数：fox=${room.state.fox?.player?.score}, bunny=${room.state.bunny?.player?.score}`);
          }
          // 通知房间内其他玩家该玩家暂时离线（但不释放角色）
          socket.to(roomId).emit('player_disconnected', {
            role,
            socketId: socket.id,
            playerName: socket.data.player?.name
          });
          // 如果画板游戏进行中，通知剩余玩家暂停等待
          if (room.drawState?.active) {
            socket.to(roomId).emit('draw_player_left', { playerName: playerCode });
          }
        } else {
          // 普通房间：立即释放角色
          if (role === 'fox') room.state.fox = null;
          if (role === 'bunny') room.state.bunny = null;

          // 通知房间内其他玩家
          socket.to(roomId).emit('player_left', { role });

          // 如果房间空了，删除房间
          if (!room.state.fox && !room.state.bunny) {
            rooms.delete(roomId);
            console.log(`普通房间 ${roomId} 已删除`);
          } else {
            // 同步剩余玩家状态
            io.to(roomId).emit('sync_room', {
              fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
              bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
              foxReady: room.state.fox?.isReady,
              bunnyReady: room.state.bunny?.isReady
            });
          }
        }
      }
    }
    console.log(`玩家断开：${socket.id}, 原因：${reason}`);
  });

  // 重连处理由客户端通过 rejoin_private_room 完成
  // socket.io v4 的服务器端 reconnect 事件不可靠（socket.data 可能在断开时丢失）
  // 因此移除旧的服务器端 reconnect 处理

  // 重新加入私密房间（页面刷新后使用）
  socket.on('rejoin_private_room', ({ roomId, playerCode }) => {
    console.log(`[REJOIN] 玩家 ${playerCode} 尝试重新加入私密房间：${roomId}`);

    // 验证档案码格式
    if (!/^[a-zA-Z0-9]{6,8}$/.test(playerCode)) {
      socket.emit('private_room_error', '档案码格式不正确');
      return;
    }

    // 设置 socket.data.playerCode（确保后续操作能识别身份）
    socket.data.playerCode = playerCode;

    // 检查数据库是否有房间（先查 vip_rooms，再查 rooms 兜底）
    let roomDb = vipRoomOps.get(roomId);
    if (!roomDb) {
      const fallbackDb = roomOps.get(roomId);
      if (fallbackDb) {
        console.log(`[REJOIN] vip_rooms 无记录，但从 rooms 表找到房间 ${roomId}，降级处理`);
        // 创建一个兜底的 roomDb 对象
        roomDb = {
          id: roomId,
          owner_player_code: null,
          fox_player_code: fallbackDb.fox_player_code || null,
          bunny_player_code: fallbackDb.bunny_player_code || null,
          fox_nickname: null,
          bunny_nickname: null,
          fox_score: 0,
          bunny_score: 0,
          fox_ready: 0,
          bunny_ready: 0,
          current_word: fallbackDb.current_word || null,
          punishment_banks: null,
          game_state: fallbackDb.game_state || 'setup',
          bg_image: fallbackDb.bg_image || ''
        };
      }
    }

    if (!roomDb) {
      socket.emit('private_room_error', '房间不存在');
      return;
    }

    // 验证玩家是否是房间成员（支持更宽松的匹配）
    let isFoxPlayer = roomDb.fox_player_code === playerCode;
    let isBunnyPlayer = roomDb.bunny_player_code === playerCode;
    const isOwner = roomDb.owner_player_code === playerCode;

    // 宽松模式：如果玩家不在表中，但房间有空位，允许重新加入
    // 修复：宽松模式只做权限验证，不做角色分配。角色必须由玩家主动选择（select_role）。
    let canEnterWithoutRole = false;
    if (!isFoxPlayer && !isBunnyPlayer) {
      console.log(`[REJOIN] 玩家 ${playerCode} 不在 vip_rooms 表中，检查空位`);
      // 先检查内存中的 rooms Map 确认是否之前登录过
      const existingRoom = rooms.get(roomId);
      if (existingRoom) {
        if (existingRoom.state.fox?.playerCode === playerCode) {
          isFoxPlayer = true;
          console.log(`[REJOIN] 从内存匹配到玩家 ${playerCode} 是狐狸`);
        } else if (existingRoom.state.bunny?.playerCode === playerCode) {
          isBunnyPlayer = true;
          console.log(`[REJOIN] 从内存匹配到玩家 ${playerCode} 是兔子`);
        } else {
          // 玩家在内存中没有角色记录，检查是否有空位让玩家自由选择
          const hasFox = !!existingRoom.state.fox;
          const hasBunny = !!existingRoom.state.bunny;
          if (!hasFox || !hasBunny) {
            canEnterWithoutRole = true;
            console.log(`[REJOIN] 房间有空位（fox=${hasFox}, bunny=${hasBunny}），允许 ${playerCode} 进入`);
          } else {
            console.log(`[REJOIN] 房间已满，拒绝 ${playerCode}`);
          }
        }
      } else {
        // 内存中没有房间，检查数据库是否有空位
        const hasFox = !!roomDb.fox_player_code;
        const hasBunny = !!roomDb.bunny_player_code;
        if (!hasFox || !hasBunny) {
          canEnterWithoutRole = true;
          console.log(`[REJOIN] 数据库有空位（fox=${hasFox}, bunny=${hasBunny}），允许 ${playerCode} 进入`);
        } else {
          console.log(`[REJOIN] 房间已满，拒绝 ${playerCode}`);
        }
      }
    }

    // 玩家既不是狐狸也不是兔子（可能是房主/管理员/未选角色的玩家）
    if (!isFoxPlayer && !isBunnyPlayer) {
      // 房主/管理员允许进入
      if (isOwner || playerCode === 'KADEGOU') {
        console.log(`[REJOIN] 玩家 ${playerCode} 是房主/管理员，允许进入`);
      }
      // 房间有空位的玩家也允许进入（可以自由选择角色）
      else if (canEnterWithoutRole) {
        console.log(`[REJOIN] 玩家 ${playerCode} 未选角色但房间有空位，允许进入`);
      }
      // 两位已满且无角色 → 拒绝
      else {
        console.log(`[REJOIN] 玩家 ${playerCode} 无法加入房间 ${roomId}，两位已满且无匹配`);
        socket.emit('private_room_error', '房间已满或你不是该房间的玩家，请房主清空房间后重试');
        return;
      }
    }

    console.log(`[REJOIN] 玩家 ${playerCode} 通过验证，狐狸=${isFoxPlayer}, 兔子=${isBunnyPlayer}, 房主=${isOwner}`);

    // 检查内存中是否有房间，没有则从数据库恢复
    let room = rooms.get(roomId);
    if (!room) {
      // 从数据库恢复房间到内存
      // 注意：保留 isReady 状态，让用户刷新后可以直接开始游戏
      rooms.set(roomId, {
        players: [],
        state: {
          fox: roomDb.fox_player_code ? {
            socketId: null,  // 等待重连
            playerCode: roomDb.fox_player_code,
            player: {
              name: roomDb.fox_nickname || roomDb.fox_player_code,
              nickname: roomDb.fox_nickname,
              type: 'FOX',
              playerCode: roomDb.fox_player_code,
              score: roomDb.fox_score || 0  // 从数据库读取分数
            },
            // 保留 isReady 状态，让用户刷新后可以直接开始
            isReady: !!roomDb.fox_ready
          } : null,
          bunny: roomDb.bunny_player_code ? {
            socketId: null,
            playerCode: roomDb.bunny_player_code,
            player: {
              name: roomDb.bunny_nickname || roomDb.bunny_player_code,
              nickname: roomDb.bunny_nickname,
              type: 'BUNNY',
              playerCode: roomDb.bunny_player_code,
              score: roomDb.bunny_score || 0  // 从数据库读取分数
            },
            // 保留 isReady 状态，让用户刷新后可以直接开始
            isReady: !!roomDb.bunny_ready
          } : null,
          word: roomDb.current_word ? JSON.parse(roomDb.current_word) : null,
          punishments: roomDb.punishment_banks ? JSON.parse(roomDb.punishment_banks) : null,
          gameState: roomDb.game_state || 'setup'
        },
        isPrivate: true
      });
      room = rooms.get(roomId);
      console.log(`[REJOIN] 房间 ${roomId} 从数据库恢复`, {
        fox: room.state.fox?.playerCode,
        bunny: room.state.bunny?.playerCode,
        word: room.state.word?.char,
        gameState: room.state.gameState,
        foxReady: room.state.fox?.isReady,
        bunnyReady: room.state.bunny?.isReady
      });
    }

    // 恢复角色绑定（宽松模式：如果 DB 中没有记录但有空位，创建新记录）
    if (isFoxPlayer) {
      if (!room.state.fox) {
        // 宽松模式：fox 位为空，创建新记录并保存到 DB
        room.state.fox = {
          socketId: socket.id,
          playerCode: playerCode,
          player: { name: '玩家', nickname: '玩家', type: 'FOX', playerCode, score: 0 },
          isReady: false
        };
        vipRoomOps.updatePlayers(roomId, playerCode, room.state.bunny?.playerCode, playerCode, room.state.bunny?.player?.nickname);
        console.log(`[REJOIN] 宽松模式：创建狐狸位记录 playerCode=${playerCode}`);
      } else {
        room.state.fox.socketId = socket.id;
      }
      socket.data.role = 'fox';
      socket.data.playerCode = playerCode;
      socket.data.player = room.state.fox.player;
    } else if (isBunnyPlayer) {
      if (!room.state.bunny) {
        // 宽松模式：bunny 位为空，创建新记录并保存到 DB
        room.state.bunny = {
          socketId: socket.id,
          playerCode: playerCode,
          player: { name: '玩家', nickname: '玩家', type: 'BUNNY', playerCode, score: 0 },
          isReady: false
        };
        vipRoomOps.updatePlayers(roomId, room.state.fox?.playerCode, playerCode, room.state.fox?.player?.nickname, playerCode);
        console.log(`[REJOIN] 宽松模式：创建兔子位记录 playerCode=${playerCode}`);
      } else {
        room.state.bunny.socketId = socket.id;
      }
      socket.data.role = 'bunny';
      socket.data.playerCode = playerCode;
      socket.data.player = room.state.bunny.player;
    }

    // 同步房间状态
    socket.join(roomId);
    socket.data = { ...socket.data, roomId, isPrivate: true };

    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };

    // 广播给所有玩家（包括重连玩家和其他已在线玩家）
    io.to(roomId).emit('sync_room', syncData);

    // 获取历史消息
    const allCount = (() => {
      try {
        const db = getDb();
        const stmt = db.prepare('SELECT COUNT(*) as cnt FROM messages WHERE room_id = ?');
        stmt.bind([roomId]);
        let cnt = 0;
        if (stmt.step()) {
          cnt = stmt.getAsObject().cnt;
        }
        stmt.free();
        return cnt;
      } catch (e) { return -1; }
    })();
    const history = messageOps.getHistory(roomId, 500);
    console.log(`[REJOIN] 数据库 ${roomId} 总消息数: ${allCount}, 返回: ${history.length} 条`);
    if (history.length > 0) {
      console.log(`[REJOIN] 历史消息详情:`, history.map(m => ({ id: m.id, room_id: m.room_id, sender_id: m.sender_id, content: m.content?.slice(0, 30), type: m.type })));
    }

    // 规范化历史消息：将 senderId 替换为 playerCode
    // 修复：数据库返回的是 snake_case 字段名（来自 sql.js getAsObject），需要同时检查两种格式
    const normalizedHistory = history.map(msg => {
      let newMsg = { ...msg };
      // 修复：同时支持 snake_case 和 camelCase
      const actualSenderId = msg.sender_id || msg.senderId;
      if (actualSenderId) {
        if (room.state.fox?.socketId === actualSenderId) {
          newMsg.sender_id = room.state.fox.playerCode;
          newMsg.sender_name = room.state.fox.player?.nickname || room.state.fox.player?.name || '';
        } else if (room.state.bunny?.socketId === actualSenderId) {
          newMsg.sender_id = room.state.bunny.playerCode;
          newMsg.sender_name = room.state.bunny.player?.nickname || room.state.bunny.player?.name || '';
        }
        // 通过 playerCode 匹配更新昵称
        else if (room.state.fox?.playerCode === actualSenderId) {
          newMsg.sender_name = room.state.fox.player?.nickname || room.state.fox.player?.name || newMsg.sender_name;
        } else if (room.state.bunny?.playerCode === actualSenderId) {
          newMsg.sender_name = room.state.bunny.player?.nickname || room.state.bunny.player?.name || newMsg.sender_name;
        }
      }
      return newMsg;
    });

    console.log(`[REJOIN] 规范化后历史消息: ${normalizedHistory.length} 条`, normalizedHistory.map(m => ({ id: m.id, sender_id: m.sender_id || m.senderId, sender_name: m.sender_name || m.senderName, content: (m.content || m.sender_name || '')?.slice(0, 30) })));

    // 000 私密房间：重新加入时触发 生日特效
    if (roomId === '000') {
      console.log('[BIRTHDAY] 玩家重新加入私密房间 000，触发 生日欢迎！');
      io.to(roomId).emit('birthday_effect', { type: 'birthday', message: '生日快乐！' });
    }

    // 发送游戏恢复通知，包含游戏状态
    console.log(`[REJOIN] 发送 private_room_joined 事件，history 长度: ${normalizedHistory.length}`);
    socket.emit('private_room_joined', {
      roomId,
      bgImage: roomDb.bg_image || '',
      history: normalizedHistory,
      syncData,
      gameState: room.state.gameState || 'setup',
      word: room.state.word ? room.state.word.char : null
    });

    // 通知房间内其他玩家
    socket.to(roomId).emit('player_rejoined', {
      playerCode,
      socketId: socket.id,
      role: socket.data.role
    });

    console.log(`[REJOIN] 玩家 ${playerCode} 重新加入成功，角色：${socket.data.role}, 游戏状态：${room.state.gameState}`);

    // 如果游戏正在进行中，额外发送游戏状态同步
    if (room.state.gameState === 'playing' && room.state.word) {
      console.log(`[REJOIN] 游戏进行中，发送额外同步信息`);
      // 如果重连玩家是游戏玩家之一，发送额外信息帮助恢复状态
      if (socket.data.role) {
        // 发送当前禁语词
        socket.emit('game_message', {
          type: 'SYNC_WORD',
          word: room.state.word
        });
      }
    }

    // 如果画板游戏正在进行中，恢复画板状态
    if (room.drawState?.active) {
      console.log(`[REJOIN] 画板游戏进行中，恢复画板状态`);
      socket.emit('draw_mode_switched', room.drawState.round);
      // 如果是画画者，重新发送词
      if (room.drawState.round.drawerCode === playerCode) {
        socket.emit('draw_word', { word: room.drawState.round.word, drawerCode: playerCode });
      }
      // 重发所有笔画（让重连方恢复画布）
      socket.emit('draw_clear');
      if (room.drawState.strokes) {
        for (const stroke of room.drawState.strokes) {
          socket.emit('draw_stroke', stroke);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// 服务器启动时，从数据库恢复 VIP 房间
function restoreVipRooms() {
  try {
    const db = getDb();
    // 获取所有未过期的 VIP 房间
    const stmt = db.prepare("SELECT * FROM vip_rooms WHERE expires_at IS NULL OR expires_at > strftime('%s', 'now')");
    const activeVipRooms = [];
    stmt.bind();
    while (stmt.step()) {
      activeVipRooms.push(stmt.getAsObject());
    }
    stmt.free();

    activeVipRooms.forEach(room => {
      rooms.set(room.id, {
        players: [],
        state: {
          fox: room.fox_player_code ? {
            socketId: null,
            playerCode: room.fox_player_code,
            player: {
              name: room.fox_nickname || room.fox_player_code,
              nickname: room.fox_nickname,
              type: 'FOX',
              playerCode: room.fox_player_code,
              score: room.fox_score || 0  // 从数据库读取分数
            },
            isReady: !!room.fox_ready
          } : null,
          bunny: room.bunny_player_code ? {
            socketId: null,
            playerCode: room.bunny_player_code,
            player: {
              name: room.bunny_nickname || room.bunny_player_code,
              nickname: room.bunny_nickname,
              type: 'BUNNY',
              playerCode: room.bunny_player_code,
              score: room.bunny_score || 0  // 从数据库读取分数
            },
            isReady: !!room.bunny_ready
          } : null,
          word: room.current_word ? JSON.parse(room.current_word) : null,
          punishments: room.punishment_banks ? JSON.parse(room.punishment_banks) : null,
          gameState: room.game_state || 'setup'
        },
        isPrivate: true
      });
      console.log(`[RESTORE] 恢复 VIP 房间：${room.id}`);
    });

    // 迁移旧数据：将 owner_player_code 为 socket.id 的记录修正为 playerCode
    try {
      const migrateStmt = db.prepare("SELECT id, owner_player_code, fox_player_code, bunny_player_code FROM vip_rooms WHERE owner_player_code IS NOT NULL");
      migrateStmt.bind();
      let migrateCount = 0;
      while (migrateStmt.step()) {
        const r = migrateStmt.getAsObject();
        // socket.id 格式通常为 20 位随机字符串，而 playerCode 是 6-8 位字母数字
        if (r.owner_player_code && !/^[a-zA-Z0-9]{6,8}$/.test(r.owner_player_code)) {
          // 使用 fox_player_code 作为新 owner（房主通常是先选择角色的，即 fox）
          const newOwner = r.fox_player_code || r.bunny_player_code;
          if (newOwner) {
            const updateStmt = db.prepare("UPDATE vip_rooms SET owner_player_code = ? WHERE id = ?");
            updateStmt.bind(1, newOwner);
            updateStmt.bind(2, r.id);
            updateStmt.run();
            updateStmt.free();
            migrateCount++;
            console.log(`[MIGRATE] 房间 ${r.id} owner: ${r.owner_player_code} → ${newOwner}`);
          }
        }
      }
      migrateStmt.free();
      if (migrateCount > 0) {
        console.log(`[MIGRATE] 已迁移 ${migrateCount} 个房间的 owner 记录`);
      }
    } catch (migrateErr) {
      console.error('[MIGRATE] 迁移 owner 失败:', migrateErr);
    }

    console.log(`[RESTORE] 已恢复 ${activeVipRooms.length} 个 VIP 房间`);
  } catch (err) {
    console.error('[RESTORE] 恢复房间失败:', err);
  }
}

httpServer.listen(PORT, HOST, () => {
  console.log(`服务器运行在 http://${HOST}:${PORT}`);
  // 延迟恢复房间，确保数据库已初始化
  setTimeout(restoreVipRooms, 1000);

  // 启动测试房间定时动画（房间号 000）
  startTestRoomAnimations();

  // 初始化荣誉董事档案（如果不存在）
  setTimeout(() => {
    const nickFox = playerOps.getByCode('KADEGOU');
    const directorBunny = playerOps.getByCode('JINNALUV');

    if (!nickFox) {
      playerOps.create('KADEGOU', hashPassword('kadegou_director'), '尼克');
      console.log('[INIT] 创建荣誉董事档案：尼克 (KADEGOU)');
    }
    // JINNALUV 使用原有档案和密码，不修改
    if (directorBunny) {
      console.log('[INIT] 荣誉董事 JINNALUV 已存在，使用原有密码');
    }
  }, 1500);
});

// 测试房间定时动画配置
const TEST_ROOM_ID = '000';

// 动画效果列表 - 可以在这里自定义
const TEST_ANIMATIONS = [
  { type: 'celebration', emoji: '🎉', message: '庆祝！' },
  { type: 'celebration', emoji: '🌟', message: '明星！' },
];

// 定时任务配置 - 可以在这里自定义时间
const ANIMATION_SCHEDULE = [
  // { hour: 12, minute: 0, animationIndex: 0 }, // 每天 12:00 播放第 0 个动画
  // { hour: 20, minute: 0, animationIndex: 1 }, // 每天 20:00 播放第 1 个动画
];

function startTestRoomAnimations() {
  console.log('[TEST_ANIMATION] 测试房间定时动画已启动，房间号：000');
  console.log('[TEST_ANIMATION] 当前配置:', JSON.stringify(TEST_ANIMATIONS));

  // 每分钟检查一次是否需要播放动画
  setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    ANIMATION_SCHEDULE.forEach(schedule => {
      if (schedule.hour === currentHour && schedule.minute === currentMinute) {
        const room = rooms.get(TEST_ROOM_ID);
        if (room) {
          const anim = TEST_ANIMATIONS[schedule.animationIndex] || TEST_ANIMATIONS[0];
          console.log(`[TEST_ANIMATION] 定时触发：${schedule.hour}:${schedule.minute.toString().padStart(2, '0')} 播放 ${anim.emoji}`);
          io.to(TEST_ROOM_ID).emit('timed_animation', anim);
        }
      }
    });
  }, 60000); // 每分钟检查
}
