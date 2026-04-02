import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomOps, messageOps, backgroundOps, carrotOps, effectOps, playerOps, gameHistoryOps, vipRoomOps, inventoryOps, waitForDb, getDb, leaderboardOps } from './db.js';
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

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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
        punishments: null
      }
    });

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

    // 再同步房间状态给新玩家（确保包含所有已选择的角色）
    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };
    console.log(`[JOIN_ROOM] 同步房间状态给新玩家:`, JSON.stringify(syncData));
    io.to(roomId).emit('sync_room', syncData);

    socket.emit('room_joined', roomId);
  });

  // 选择角色
  socket.on('select_role', ({ roomId, role, player }) => {
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`[SELECT_ROLE] 房间 ${roomId} 不存在`);
      return;
    }

    console.log(`[SELECT_ROLE] 玩家 ${socket.id} 尝试选择角色：${role}, 房间状态：fox=${room.state.fox ? room.state.fox.socketId : 'null'}, bunny=${room.state.bunny ? room.state.bunny.socketId : 'null'}`);

    // 检查目标角色是否已被**其他**玩家占用
    if (role === 'fox' && room.state.fox && room.state.fox.socketId !== socket.id) {
      socket.emit('role_error', '狐狸角色已被选择');
      console.log(`[SELECT_ROLE] 角色 ${role} 已被其他玩家占用`);
      return;
    }
    if (role === 'bunny' && room.state.bunny && room.state.bunny.socketId !== socket.id) {
      socket.emit('role_error', '兔子角色已被选择');
      console.log(`[SELECT_ROLE] 角色 ${role} 已被其他玩家占用`);
      return;
    }

    // 分配角色（允许同一玩家选择两个角色 - 单机模式）
    // 保留玩家传来的 isReady 状态
    if (role === 'fox') {
      room.state.fox = { socketId: socket.id, player, isReady: player.isReady || false };
      console.log(`[SELECT_ROLE] 分配狐狸角色，isReady=${player.isReady}`);
    } else if (role === 'bunny') {
      room.state.bunny = { socketId: socket.id, player, isReady: player.isReady || false };
      console.log(`[SELECT_ROLE] 分配兔子角色，isReady=${player.isReady}`);
    }

    socket.data.role = role;
    socket.data.player = player;

    // 重要：使用玩家名字更新档案标识符（从 socket.id 切换到 player.name）
    if (player.name) {
      // 将旧 socket.id 的胡萝卜数量转移到玩家名字
      const oldCarrotCount = carrotOps.getCount(socket.id);
      if (oldCarrotCount > 0) {
        // 转移胡萝卜
        const stmt = db.prepare(`
          INSERT INTO player_carrots (player_identifier, carrot_count, last_updated)
          VALUES (?, ?, strftime('%s', 'now'))
          ON CONFLICT(player_identifier) DO UPDATE SET
            carrot_count = player_carrots.carrot_count + excluded.carrot_count,
            last_updated = strftime('%s', 'now')
        `);
        stmt.run(player.name, oldCarrotCount);
        // 清除旧标识的胡萝卜（避免重复）
        db.prepare(`DELETE FROM player_carrots WHERE player_identifier = ?`).run(socket.id);
      }
      // 更新玩家档案
      playerOps.upsert(player.name, { nickname: player.name });
      console.log(`[SELECT_ROLE] 玩家档案已更新为：${player.name}`);
    }

    console.log(`[SELECT_ROLE] 玩家 ${socket.id} 成功选择角色：${role}, 玩家名字：${player.name}, isReady: ${player.isReady}`);

    // 测试房间 000，朱迪选择时触发欢迎
    if (roomId === '000' && role === 'bunny') {
      console.log('[BIRTHDAY] 朱迪选择了兔子角色，准备发送生日欢迎！');
      // 发送生日特效给客户端
      io.to(roomId).emit('birthday_effect', { type: 'birthday', message: '生日快乐！' });
    }

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

    console.log(`玩家 ${socket.id} 已准备`);

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
      } else if (player.type === 'BUNNY' && room.state.bunny) {
        room.state.bunny.player = player;
      }
      // 重新广播 sync_room，确保所有玩家看到最新数据
      io.to(roomId).emit('sync_room', {
        fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
        bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
        foxReady: room.state.fox?.isReady,
        bunnyReady: room.state.bunny?.isReady
      });
    }

    // 如果是 SYNC_BANKS 消息，合并存储到服务器
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

      console.log(`[SYNC_BANKS] 合并后的惩罚库：truths=${room.state.punishments.truths.length}, dares=${room.state.punishments.dares.length}`);
    }

    // 转发给其他玩家
    socket.to(roomId).emit('game_message', message);
  });

  // 聊天消息
  socket.on('chat_message', ({ roomId, message }) => {
    const room = rooms.get(roomId);

    if (!room) {
      console.log(`[CHAT_MESSAGE] 房间 ${roomId} 不存在`);
      return;
    }

    console.log(`[CHAT_MESSAGE] 收到聊天消息：${message.type}`, {
      sender: message.senderName,
      role: message.senderRole
    });

    // 保存到数据库（仅私密房间，普通房间跳过）
    if (room.isPrivate) {
      try {
        messageOps.add(roomId, message);
      } catch (err) {
        console.error('[CHAT_MESSAGE] 保存失败:', err);
      }
    }

    // 广播给房间内所有玩家（包括发送者）
    io.to(roomId).emit('chat_message', message);
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
        punishments: null
      },
      isPrivate: true
    });

    // 保存到数据库
    try {
      roomOps.create(roomId, password || '');
      // 创建 VIP 房间记录（永久保存）
      vipRoomOps.create(roomId, socket.id, { name: roomId, bgImage: '' });

      socket.join(roomId);
      socket.data = { roomId, role: null, isPrivate: true };

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
    console.log(`[PRIVATE_ROOM] 尝试加入房间：${roomId}`);

    // 先检查数据库
    const roomDb = roomOps.get(roomId);
    if (!roomDb) {
      socket.emit('private_room_error', '房间不存在');
      return;
    }

    // 验证密码
    const result = roomOps.verifyPassword(roomId, password);
    if (!result.exists) {
      socket.emit('private_room_error', '房间不存在');
      return;
    }
    if (!result.valid) {
      socket.emit('private_room_error', '密码错误');
      return;
    }

    // 检查内存中是否有房间，没有则创建
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: [],
        state: {
          fox: null,
          bunny: null,
          word: null,
          punishments: null
        },
        isPrivate: true
      });
    }

    const room = rooms.get(roomId);

    socket.join(roomId);
    socket.data = { roomId, role: null, isPrivate: true };

    // 同步房间状态给新玩家
    const syncData = {
      fox: room.state.fox ? { ...room.state.fox.player, socketId: room.state.fox.socketId } : null,
      bunny: room.state.bunny ? { ...room.state.bunny.player, socketId: room.state.bunny.socketId } : null,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    };
    io.to(roomId).emit('sync_room', syncData);

    // 获取历史消息
    const history = messageOps.getHistory(roomId, 100);

    socket.emit('private_room_joined', {
      roomId,
      bgImage: roomDb.bg_image || '',
      history
    });

    console.log(`[PRIVATE_ROOM] 加入成功：${roomId}`);
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

  // 胡萝卜相关事件
  // 结算游戏时给胜利方加胡萝卜
  socket.on('settle_game_with_carrot', ({ roomId, winnerRole }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    console.log(`[CARROT] 结算游戏，胜利者：${winnerRole}`);

    // 根据角色获取玩家标识（使用玩家名字作为持久化标识）
    let winnerPlayerName = null;
    let loserPlayerName = null;
    if (winnerRole === 'FOX' && room.state.fox) {
      winnerPlayerName = room.state.fox.player?.name || room.state.fox.socketId;
      loserPlayerName = room.state.bunny?.player?.name || room.state.bunny?.socketId;
    } else if (winnerRole === 'BUNNY' && room.state.bunny) {
      winnerPlayerName = room.state.bunny.player?.name || room.state.bunny.socketId;
      loserPlayerName = room.state.fox?.player?.name || room.state.fox?.socketId;
    }

    if (winnerPlayerName) {
      // 给胜利者加胡萝卜
      carrotOps.addCarrot(winnerPlayerName, 1);
      const count = carrotOps.getCount(winnerPlayerName);
      console.log(`[CARROT] 玩家 ${winnerPlayerName} 获得胡萝卜，总数：${count}`);

      // 同步玩家档案中的胡萝卜数量
      playerOps.update(winnerPlayerName, { carrot_count: count });

      // 记录游戏历史
      const foxScore = room.state.fox?.player?.score || 0;
      const bunnyScore = room.state.bunny?.player?.score || 0;
      gameHistoryOps.add({
        roomId,
        foxPlayer: room.state.fox?.player?.name || room.state.fox?.socketId,
        bunnyPlayer: room.state.bunny?.player?.name || room.state.bunny?.socketId,
        winner: winnerRole,
        foxScore,
        bunnyScore,
        wordUsed: room.state.word?.char,
        duration: 0 // TODO: 记录游戏时长
      });

      // 更新玩家统计（胜利者 +1 胜场，双方 +1 总场次）
      if (winnerPlayerName) {
        const winnerProfile = playerOps.get(winnerPlayerName);
        playerOps.update(winnerPlayerName, {
          total_games: (winnerProfile?.total_games || 0) + 1,
          win_games: (winnerProfile?.win_games || 0) + 1
        });
      }
      if (loserPlayerName) {
        const loserProfile = playerOps.get(loserPlayerName);
        playerOps.update(loserPlayerName, {
          total_games: (loserProfile?.total_games || 0) + 1
        });
      }

      // 通知所有玩家
      io.to(roomId).emit('carrot_awarded', {
        winnerRole,
        winnerPlayerName,
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

    const finalPunishments = room.state.punishments || { truths: [], dares: [] };
    console.log(`房间 ${roomId} 游戏开始，词汇：${word.char}, 惩罚库：truths=${finalPunishments.truths.length}, dares=${finalPunishments.dares.length}`);
    io.to(roomId).emit('start_game', { word, punishments: finalPunishments });
  });

  // 结算游戏
  socket.on('settle_game', ({ roomId }) => {
    socket.to(roomId).emit('settle_game');
  });

  // 重置游戏
  socket.on('reset_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 重置玩家准备状态
    if (room.state.fox) room.state.fox.isReady = false;
    if (room.state.bunny) room.state.bunny.isReady = false;

    io.to(roomId).emit('reset_game');
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
      playerOps.create(playerCode, passwordHash, nickname || '玩家');

      // 给新玩家赠送一些初始物品（测试用）
      inventoryOps.add(playerCode, 'default_gun_001', 'GUN');

      socket.emit('player_profile_result', {
        success: true,
        playerCode
      });
      console.log(`[PROFILE] 玩家档案创建成功：${playerCode}`);
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
    const passwordHash = hashPassword(password);
    const player = playerOps.getByCodeAndPassword(playerCode, passwordHash);

    if (player) {
      // 更新最后登录时间
      playerOps.update(playerCode, { last_login: Math.floor(Date.now() / 1000) });

      socket.emit('login_result', {
        success: true,
        player: {
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
        }
      });

      // 保存玩家档案码到 socket.data
      socket.data.playerCode = playerCode;

      console.log(`[PROFILE] 玩家登录成功：${playerCode}`);
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
    socket.emit('update_player_profile_result', { success: true });
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
    socket.emit('change_nickname_result', result);
  });

  // 获取玩家物品背包
  socket.on('get_player_inventory', (playerCode) => {
    const inventory = inventoryOps.getAll(playerCode);
    socket.emit('player_inventory', inventory);
  });

  // 获取排行榜
  socket.on('get_leaderboard', () => {
    const players = leaderboardOps.getAllPlayers();
    socket.emit('leaderboard_ranking', players);
  });

  // 断开连接
  socket.on('disconnect', () => {
    const { roomId, role, isPrivate } = socket.data;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // 释放角色
        if (role === 'fox') room.state.fox = null;
        if (role === 'bunny') room.state.bunny = null;

        // 通知房间内其他玩家
        socket.to(roomId).emit('player_left', { role });

        // 私密房间不删除，保留在内存中供下次登录
        // 普通房间在空了才删除
        if (!isPrivate) {
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
        } else {
          // 私密房间：即使空了也保留，但需要同步状态（可能还有另一个玩家在）
          console.log(`私密房间 ${roomId} 保留中...`);
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
    console.log(`玩家断开：${socket.id}`);
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
          fox: null,
          bunny: null,
          word: null,
          punishments: null
        },
        isPrivate: true
      });
      console.log(`[RESTORE] 恢复 VIP 房间：${room.id}`);
    });

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
