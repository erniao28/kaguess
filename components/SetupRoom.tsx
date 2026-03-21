import React, { useState } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket | null;
  onJoin: (id: string) => void;
  onCreate: (id: string) => void;
}

const SetupRoom: React.FC<Props> = ({ socket, onJoin, onCreate }) => {
  const [id, setId] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleCreateRoom = () => {
    const roomId = 'R' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setConnecting(true);
    console.log('[SETUP_ROOM] 尝试创建房间:', roomId);

    socket?.emit('create_room', roomId);
    console.log('[SETUP_ROOM] 发送 create_room:', roomId);

    socket?.once('room_created', (createdId: string) => {
      console.log('[SETUP_ROOM] 房间创建成功:', createdId);
      setConnecting(false);
      onCreate(createdId);
    });

    socket?.once('room_error', (error: string) => {
      console.error('[SETUP_ROOM] 房间创建错误:', error);
      setConnecting(false);
      alert(error);
    });
  };

  const handleJoinRoom = () => {
    if (!id) return;
    setConnecting(true);
    console.log('[SETUP_ROOM] 尝试加入房间:', id);

    socket?.emit('join_room', id);
    console.log('[SETUP_ROOM] 发送 join_room:', id);

    socket?.once('room_joined', () => {
      console.log('[SETUP_ROOM] 房间加入成功:', id);
      setConnecting(false);
      onJoin(id);
    });

    socket?.once('room_error', (error: string) => {
      console.error('[SETUP_ROOM] 房间加入错误:', error);
      setConnecting(false);
      alert(error);
    });
  };

  return (
    <div className="bg-white rounded-[60px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] p-12 max-w-lg w-full mt-10 border-8 border-slate-50 relative overflow-hidden text-center">
      <div className="absolute -top-20 -left-20 text-[20rem] opacity-[0.03] select-none pointer-events-none">🔐</div>

      <div className="mb-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-2xl shadow-indigo-200">
          🏢
        </div>
        <h2 className="text-4xl font-black text-slate-800 mb-2">进入对战大厅</h2>
        <p className="text-slate-400 font-medium">输入房间号以与同伴同步</p>
      </div>

      <div className="space-y-6">
        <input
          type="text"
          maxLength={6}
          value={id}
          onChange={(e) => setId(e.target.value.toUpperCase())}
          placeholder="例如：R1234"
          className="w-full px-8 py-6 rounded-[30px] bg-slate-50 border-4 border-slate-100 focus:border-indigo-500 outline-none text-center text-3xl font-black tracking-[0.2em] placeholder:tracking-normal placeholder:text-lg placeholder:font-bold transition-all"
        />

        <button
          onClick={handleJoinRoom}
          disabled={!id || connecting}
          className="w-full py-6 rounded-[30px] bg-slate-900 text-white font-black text-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          {connecting ? '连接中...' : '连接作战频道'}
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-400 font-bold">或</span>
          </div>
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={connecting}
          className="w-full py-6 rounded-[30px] bg-indigo-600 text-white font-black text-2xl hover:bg-indigo-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          {connecting ? '创建中...' : '创建新房间'}
        </button>
      </div>

      <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
        Secure Multi-User Protocol • V2.0
      </p>
    </div>
  );
};

export default SetupRoom;
