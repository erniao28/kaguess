import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomOps, messageOps, backgroundOps, carrotOps } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

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

io.on('connection', (socket) => {
  console.log(`玩家连接：${socket.id}`);

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

    console.log(`[SELECT_ROLE] 玩家 ${socket.id} 成功选择角色：${role}, 玩家名字：${player.name}, isReady: ${player.isReady}`);

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

    // 根据角色获取玩家标识（使用 socketId 作为唯一标识）
    let winnerSocketId = null;
    if (winnerRole === 'FOX' && room.state.fox) {
      winnerSocketId = room.state.fox.socketId;
    } else if (winnerRole === 'BUNNY' && room.state.bunny) {
      winnerSocketId = room.state.bunny.socketId;
    }

    if (winnerSocketId) {
      // 给胜利者加胡萝卜
      carrotOps.addCarrot(winnerSocketId, 1);
      const count = carrotOps.getCount(winnerSocketId);
      console.log(`[CARROT] 玩家 ${winnerSocketId} 获得胡萝卜，总数：${count}`);

      // 通知所有玩家
      io.to(roomId).emit('carrot_awarded', {
        winnerRole,
        winnerSocketId,
        carrotCount: count
      });
    }
  });

  // 获取玩家的胡萝卜数量
  socket.on('get_carrot_count', (playerIdentifier) => {
    const count = carrotOps.getCount(playerIdentifier);
    socket.emit('carrot_count', { playerIdentifier, count });
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

  // 断开连接
  socket.on('disconnect', () => {
    const { roomId, role } = socket.data;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // 释放角色
        if (role === 'fox') room.state.fox = null;
        if (role === 'bunny') room.state.bunny = null;

        // 通知房间内其他玩家
        socket.to(roomId).emit('player_left', { role });

        // 如果房间空了，删除房间
        if (!room.state.fox && !room.state.bunny) {
          rooms.delete(roomId);
          console.log(`房间 ${roomId} 已删除`);
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
    console.log(`玩家断开：${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

httpServer.listen(PORT, HOST, () => {
  console.log(`服务器运行在 http://${HOST}:${PORT}`);
});
