
import React, { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
  word: string;
}

const TransitionOverlay: React.FC<Props> = ({ onComplete, word }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Analyzing Case...
      setTimeout(() => setPhase(2), 2500), // Reveal Scroll
      setTimeout(() => setPhase(3), 4000), // The Word Appears
      setTimeout(() => onComplete(), 6500) // Finish
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0c1425] flex items-center justify-center overflow-hidden">
      {/* Mystic Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/oriental-tiles.png')]" />
      
      {/* Floating Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-amber-400/40 animate-pulse"
            style={{
              width: Math.random() * 8 + 2 + 'px',
              height: Math.random() * 8 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 3 + 2 + 's'
            }}
          />
        ))}
      </div>

      <div className="relative text-center z-10 p-10 max-w-2xl">
        {phase === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="text-7xl mb-6">🔍🚔</div>
            <h2 className="text-3xl font-black text-indigo-300 tracking-[0.5em] uppercase drop-shadow-[0_0_10px_rgba(165,180,252,0.4)]">
              同步侦查中
            </h2>
          </div>
        )}

        {phase === 2 && (
          <div className="animate-in zoom-in spin-in-1 duration-1000">
             <div className="text-8xl mb-6 scale-150">📜</div>
             <h2 className="text-4xl font-black text-amber-500 tracking-[0.2em] mb-4">
               东方言灵·禁锢咒
             </h2>
             <p className="text-amber-200/60 font-serif italic">"字如玄铁，出口伤分"</p>
          </div>
        )}

        {phase >= 3 && (
          <div className="animate-in fade-in zoom-in-150 duration-1000">
            <div className="relative inline-block">
               {/* Glowing Halo */}
               <div className="absolute -inset-12 bg-white/20 blur-[100px] rounded-full animate-pulse" />
               <div className="absolute -inset-4 border-4 border-amber-500/50 rounded-full animate-ping opacity-20" />
               
               <h1 className="text-[14rem] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.9)] relative font-serif">
                {word}
              </h1>
            </div>
            <div className="mt-12 space-y-2">
              <p className="text-rose-400 font-black text-xl tracking-[0.3em] uppercase animate-pulse">此字已被 ZPD 封印</p>
              <p className="text-slate-400 text-sm italic">谁先开口，谁便输了这场博弈</p>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Border Corners */}
      <div className="absolute top-10 left-10 w-24 h-24 border-t-4 border-l-4 border-amber-500/30 rounded-tl-3xl" />
      <div className="absolute top-10 right-10 w-24 h-24 border-t-4 border-r-4 border-amber-500/30 rounded-tr-3xl" />
      <div className="absolute bottom-10 left-10 w-24 h-24 border-b-4 border-l-4 border-amber-500/30 rounded-bl-3xl" />
      <div className="absolute bottom-10 right-10 w-24 h-24 border-b-4 border-r-4 border-amber-500/30 rounded-br-3xl" />
    </div>
  );
};

export default TransitionOverlay;
