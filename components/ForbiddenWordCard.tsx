
import React, { useEffect, useState } from 'react';
import { ForbiddenWord } from '../types';
import { GeminiService } from '../services/geminiService';

interface Props {
  word: ForbiddenWord;
}

const ForbiddenWordCard: React.FC<Props> = ({ word }) => {
  const [insight, setInsight] = useState<string>('正在向奥塔维亚寻求智慧...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      const gemini = new GeminiService();
      const result = await gemini.getWordInsight(word.char);
      setInsight(result || "挑战开始！请动物城的精英保持冷静。");
      setLoading(false);
    };
    fetchInsight();
  }, [word]);

  return (
    <div className="bg-white rounded-[60px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] p-12 w-full mx-auto border-[16px] border-slate-50 relative group transition-all hover:scale-[1.01]">
      {/* Background Seal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[25rem] opacity-[0.03] select-none pointer-events-none font-serif leading-none transition-all group-hover:scale-110 duration-1000">
        {word.char}
      </div>

      <div className="text-center relative">
        <div className="flex items-center justify-center gap-4 mb-8">
           <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
           <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">言灵禁区</div>
           <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
        </div>

        <h1 className="text-[12rem] font-black bg-gradient-to-b from-slate-900 via-indigo-950 to-indigo-800 bg-clip-text text-transparent mb-6 drop-shadow-2xl select-none leading-none animate-in fade-in zoom-in duration-1000">
          {word.char}
        </h1>

        <div className="flex justify-center gap-4 mb-10">
          <div className="px-6 py-2 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
            <div className="text-[9px] font-black text-rose-300 uppercase mb-0.5 tracking-widest">警报等级</div>
            <div className="text-rose-600 font-black text-lg">{word.difficulty}</div>
          </div>
          <div className="px-6 py-2 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
             <div className="text-[9px] font-black text-amber-300 uppercase mb-0.5 tracking-widest">隐匿深度</div>
            <div className="text-amber-600 font-black text-lg">{word.frequency}</div>
          </div>
        </div>

        <div className="p-10 rounded-[50px] bg-[#0A0F1E] text-left relative overflow-hidden shadow-2xl border-4 border-slate-800/20 group/insight">
          {/* Animated Glows */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 animate-pulse" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-10 animate-pulse [animation-delay:1.5s]" />
          
          <h3 className="text-indigo-400 font-black mb-6 flex items-center gap-3 text-sm tracking-[0.2em] uppercase">
            <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]">🦊🐰</span> 绝密行动指令
          </h3>
          
          <div className="text-indigo-50/90 text-sm leading-relaxed min-h-[120px] font-medium transition-all group-hover/insight:text-white">
            {loading ? (
              <div className="flex gap-2 items-center h-full justify-center">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" />
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{insight}</div>
            )}
          </div>
          
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <div className="border-t-2 border-r-2 border-indigo-400 w-8 h-8 rounded-tr-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenWordCard;
