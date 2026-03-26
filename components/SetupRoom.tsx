import React, { useState } from 'react';

interface Props {
  onCreate: () => void;
  onJoin: (id: string) => void;
  onOpenPrivateRoom: () => void;
}

const SetupRoom: React.FC<Props> = ({ onCreate, onJoin, onOpenPrivateRoom }) => {
  const [id, setId] = useState('');

  return (
    <div className="bg-white rounded-[60px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] p-12 max-w-lg w-full mt-10 border-8 border-slate-50 relative overflow-hidden text-center">
      <div className="absolute -top-20 -left-20 text-[20rem] opacity-[0.03] select-none pointer-events-none">🔐</div>

      <div className="mb-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-2xl shadow-indigo-200">
          🏠
        </div>
        <h2 className="text-4xl font-black text-slate-800 mb-2">进入对战大厅</h2>
        <p className="text-slate-400 font-medium">输入房间号以与同伴同步</p>
      </div>

      <div className="space-y-6">
        <input
          type="text"
          maxLength={32}
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="例如：R1234 或 love-abc"
          className="w-full px-8 py-6 rounded-[30px] bg-slate-50 border-4 border-slate-100 focus:border-indigo-500 outline-none text-center text-2xl font-black tracking-wide placeholder:tracking-normal placeholder:text-lg placeholder:font-bold transition-all"
        />

        <button
          onClick={() => onJoin(id)}
          disabled={!id}
          className="w-full py-6 rounded-[30px] bg-slate-900 text-white font-black text-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          连接作战频道
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
          onClick={onCreate}
          className="w-full py-6 rounded-[30px] bg-indigo-600 text-white font-black text-2xl hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
        >
          创建快速房间
        </button>

        <button
          onClick={onOpenPrivateRoom}
          className="w-full py-6 rounded-[30px] bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-2xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
        >
          🔐 私密房间
        </button>
      </div>

      <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
        Secure Multi-User Protocol • V2.1
      </p>
    </div>
  );
};

export default SetupRoom;
