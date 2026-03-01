
import React, { useState } from 'react';
import { Player, PunishmentBanks } from '../types';

interface Props {
  loser: Player | null;
  punishmentBanks: PunishmentBanks;
  onClose: () => void;
}

const PunishmentModal: React.FC<Props> = ({ loser, punishmentBanks, onClose }) => {
  const [selected, setSelected] = useState<{ type: '真心话' | '大冒险'; content: string } | null>(null);

  const handlePick = (type: 'TRUTH' | 'DARE') => {
    const list = type === 'TRUTH' ? punishmentBanks.truths : punishmentBanks.dares;
    if (list.length === 0) {
      setSelected({
        type: type === 'TRUTH' ? '真心话' : '大冒险',
        content: "库里居然空空如也！恭喜你，逃过一劫！"
      });
      return;
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    setSelected({
      type: type === 'TRUTH' ? '真心话' : '大冒险',
      content: list[randomIndex]
    });
  };

  if (!loser) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200]">
        <div className="bg-white rounded-[60px] p-16 text-center max-w-lg border-[16px] border-indigo-50 shadow-2xl animate-in zoom-in-50 duration-500">
          <div className="text-9xl mb-8 animate-bounce">🤝</div>
          <h2 className="text-5xl font-black text-slate-800 mb-6">不分高下！</h2>
          <p className="text-slate-500 font-bold mb-10 text-xl">双方表现旗鼓相当，今日休战。</p>
          <button onClick={onClose} className="w-full py-7 rounded-[35px] bg-slate-900 text-white font-black text-2xl shadow-xl transition-transform active:scale-95">确定</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-4 z-[200] overflow-y-auto">
      {/* 警灯特效背景 */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20 bg-red-600 animate-[pulse_1s_infinite]" />
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20 bg-blue-600 animate-[pulse_1s_infinite_0.5s]" />

      <div className="bg-white rounded-[70px] w-full max-w-2xl p-12 shadow-[0_60px_150px_-30px_rgba(0,0,0,0.8)] border-[20px] border-slate-50 relative overflow-hidden my-auto animate-in zoom-in-95 duration-500">
        
        {!selected ? (
          <div className="text-center">
            <div className="relative inline-block mb-10">
               <div className="text-[12rem] animate-[shake_0.5s_infinite]">{loser.type === 'FOX' ? '🦊' : '🐰'}</div>
               <div className="absolute top-4 -right-10 bg-rose-600 text-white px-8 py-2 rounded-full text-2xl font-black rotate-12 shadow-2xl border-4 border-white animate-pulse">
                输家判定
               </div>
            </div>
            
            <h2 className="text-6xl font-black text-slate-900 mb-4 tracking-tighter">接受惩罚吧！</h2>
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] mb-12 text-sm">
              <span className="text-rose-600 underline underline-offset-8 decoration-rose-200">{loser.name}</span> 分值最高 ({loser.score})
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button
                onClick={() => handlePick('TRUTH')}
                className="group relative p-12 rounded-[55px] bg-indigo-50 border-4 border-indigo-200 hover:border-indigo-600 transition-all shadow-[0_20px_0_0_#e0e7ff] hover:shadow-none hover:translate-y-[20px] active:scale-95"
              >
                <div className="text-7xl mb-6 group-hover:scale-125 transition-transform duration-300">💬</div>
                <div className="font-black text-3xl text-indigo-700">真心话</div>
                <div className="text-[11px] font-black text-indigo-300 uppercase mt-3 tracking-widest">Truth Session</div>
              </button>
              
              <button
                onClick={() => handlePick('DARE')}
                className="group relative p-12 rounded-[55px] bg-rose-50 border-4 border-rose-200 hover:border-rose-600 transition-all shadow-[0_20px_0_0_#ffe4e6] hover:shadow-none hover:translate-y-[20px] active:scale-95"
              >
                <div className="text-7xl mb-6 group-hover:scale-125 transition-transform duration-300">🔥</div>
                <div className="font-black text-3xl text-rose-700">大冒险</div>
                <div className="text-[11px] font-black text-rose-300 uppercase mt-3 tracking-widest">Dare Challenge</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center animate-in fade-in slide-in-from-bottom-12 duration-600">
            <div className={`inline-flex items-center gap-4 px-10 py-4 rounded-full mb-12 font-black text-2xl tracking-[0.2em] uppercase shadow-2xl ${selected.type === '真心话' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
              {selected.type === '真心话' ? '💬 真心话环节' : '🔥 大冒险挑战'}
            </div>
            
            <div className="bg-[#f8fafc] p-12 rounded-[60px] mb-12 border-4 border-dashed border-slate-200 relative">
               <div className="absolute -top-6 -left-6 text-6xl opacity-10">“</div>
               <h3 className="text-4xl font-black text-slate-800 leading-[1.4] px-4 min-h-[160px] flex items-center justify-center">
                {selected.content}
              </h3>
               <div className="absolute -bottom-6 -right-6 text-6xl opacity-10">”</div>
            </div>

            <div className="space-y-5">
              <button
                onClick={onClose}
                className="w-full py-7 rounded-[40px] bg-slate-900 text-white font-black text-3xl hover:bg-black transition-all shadow-[0_12px_0_0_#000] active:shadow-none active:translate-y-[12px] flex items-center justify-center gap-5"
              >
                <span>🫡</span> 刑满释放，重新开始
              </button>
              <button 
                onClick={() => setSelected(null)}
                className="text-slate-400 font-black hover:text-rose-500 transition-colors text-sm uppercase tracking-widest"
              >
                换一个类型
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-5deg) scale(1.05); }
          75% { transform: rotate(5deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default PunishmentModal;
