import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app = app.use(cors());

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

    console.log(`玩家 ${socket.id} 加入房间：${roomId}`);
    socket.emit('room_joined', roomId);

    // 通知房间内其他玩家
    socket.to(roomId).emit('player_joined', { socketId: socket.id });
  });

  // 选择角色
  socket.on('select_role', ({ roomId, role, player }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 检查角色是否已被占用
    if (room.state.fox && room.state.fox.socketId !== socket.id &&
        room.state.bunny && room.state.bunny.socketId !== socket.id) {
      // 检查当前玩家是否已经选择了角色
      if (socket.data.role) {
        // 可以切换角色，先释放原角色
        if (socket.data.role === 'fox') room.state.fox = null;
        if (socket.data.role === 'bunny') room.state.bunny = null;
      } else {
        socket.emit('role_error', '该角色已被选择');
        return;
      }
    }

    // 分配角色
    if (role === 'fox') {
      room.state.fox = { socketId: socket.id, player, isReady: false };
    } else if (role === 'bunny') {
      room.state.bunny = { socketId: socket.id, player, isReady: false };
    }

    socket.data.role = role;
    socket.data.player = player;

    console.log(`玩家 ${socket.id} 选择角色：${role}`);

    // 同步房间状态给所有玩家
    io.to(roomId).emit('sync_room', {
      fox: room.state.fox?.player,
      bunny: room.state.bunny?.player,
      foxReady: room.state.fox?.isReady,
      bunnyReady: room.state.bunny?.isReady
    });
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

    // 如果两人都准备好了，由服务器通知可以开始游戏
    if (room.state.fox?.isReady && room.state.bunny?.isReady) {
      io.to(roomId).emit('both_ready');
    }
  });

  // 游戏消息转发（玩家操作同步）
  socket.on('game_message', ({ roomId, message }) => {
    socket.to(roomId).emit('game_message', message);
  });

  // 开始游戏（由先准备好的一方触发，服务器统一分发）
  socket.on('start_game', ({ roomId, word, punishments }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.state.word = word;
    room.state.punishments = punishments;

    console.log(`房间 ${roomId} 游戏开始`);
    io.to(roomId).emit('start_game', { word, punishments });
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
            fox: room.state.fox?.player,
            bunny: room.state.bunny?.player,
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
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
