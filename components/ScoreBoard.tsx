
import React from 'react';
import { Player } from '../types';

interface Props {
  player: Player;
  onUpdateScore: (id: number, delta: number) => void;
}

const ScoreBoard: React.FC<Props> = ({ player, onUpdateScore }) => {
  const isFox = player.type === 'FOX';
  
  return (
    <div className={`flex-1 p-8 rounded-[50px] shadow-xl border-8 transition-all duration-500 ${isFox ? 'bg-[#FFF6E9] border-orange-200 hover:border-orange-400' : 'bg-[#EBF2FF] border-blue-200 hover:border-blue-400'} relative overflow-hidden group`}>
      {/* Dynamic Background Icon */}
      <div className="absolute -bottom-10 -right-10 text-[12rem] opacity-[0.07] group-hover:scale-125 transition-transform duration-1000 select-none">
        {isFox ? '🐾' : '🚔'}
      </div>

      <div className="flex flex-col items-center relative z-10">
        {/* Character Title Header */}
        <div className="mb-6 text-center">
           <div className={`text-4xl mb-1 filter drop-shadow-sm group-hover:rotate-12 transition-transform`}>
            {isFox ? '🦊' : '🐰'}
          </div>
          <h2 className={`text-2xl font-black ${isFox ? 'text-orange-800' : 'text-blue-800'} tracking-tight`}>
            {player.name}
          </h2>
        </div>
        
        {/* Score Display */}
        <div className="relative mb-10 group/score">
           <div className={`absolute -inset-8 rounded-full blur-3xl opacity-30 transition-all group-hover/score:opacity-50 ${isFox ? 'bg-orange-400' : 'bg-blue-400'}`} />
           <div className={`text-9xl font-black tabular-nums drop-shadow-[0_4px_0px_rgba(0,0,0,0.1)] ${isFox ? 'text-orange-600' : 'text-blue-600'}`}>
            {player.score}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => onUpdateScore(player.id, 1)}
            className={`w-full py-5 rounded-[25px] flex items-center justify-center gap-3 text-lg font-black text-white transition-all active:scale-90 shadow-xl
              ${isFox ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'}`}
          >
            {isFox ? (
              <><span>🍡</span> 尼克的陷阱!</>
            ) : (
              <><span>📄</span> 朱迪的罚单!</>
            )}
          </button>
          
          <button
            onClick={() => onUpdateScore(player.id, -1)}
            className="w-full py-3 rounded-2xl bg-white/60 text-slate-400 hover:text-slate-600 hover:bg-white transition-all text-xs font-bold uppercase tracking-widest border border-slate-200"
          >
            撤回误触
          </button>
        </div>
        
        {/* Footnote */}
        <div className="mt-8 px-4 py-2 rounded-full bg-white/40 border border-white/50 backdrop-blur-sm">
           <p className={`text-[10px] font-black uppercase tracking-tighter ${isFox ? 'text-orange-400' : 'text-blue-400'}`}>
             {isFox ? 'PAWPSICLE TRAP COUNT' : 'CARROT CITATION LOG'}
           </p>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;
