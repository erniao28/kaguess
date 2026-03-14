import React, { useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Props {
  onJoin: (id: string) => void;
  onCreate: (id: string) => void;
}

const SetupRoom: React.FC<Props> = ({ onJoin, onCreate }) => {
  const [id, setId] = useState('');
  const [connecting, setConnecting] = useState(false);

  const SERVER_URL = window.location.origin;

  const handleCreateRoom = () => {
    const roomId = 'R' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setConnecting(true);

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('create_room', roomId);
    });

    socket.on('room_created', (createdId: string) => {
      setConnecting(false);
      onCreate(createdId);
    });

    socket.on('room_error', (error: string) => {
      setConnecting(false);
      alert(error);
    });
  };

  const handleJoinRoom = () => {
    if (!id) return;
    setConnecting(true);

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join_room', id);
    });

    socket.on('room_joined', () => {
      setConnecting(false);
      onJoin(id);
    });

    socket.on('room_error', (error: string) => {
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
