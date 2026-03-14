
import React, { useState } from 'react';
import { Player, ForbiddenWord, PunishmentBanks } from '../types';

interface Props {
  players: Player[];
  onPlayerReady: (player: Player, extraWords: ForbiddenWord[], punishments: PunishmentBanks) => void;
  onStartGame?: () => void;
  canStart?: boolean;
}

const SetupScreen: React.FC<Props> = ({ players, onPlayerReady, onStartGame, canStart = false }) => {
  const [nickName, setNickName] = useState('');
  const [judyName, setJudyName] = useState('');
  const [customWordsText, setCustomWordsText] = useState('');
  const [customTruthsText, setCustomTruthsText] = useState('');
  const [customDaresText, setCustomDaresText] = useState('');

  const fox = players.find(p => p.type === 'FOX')!;
  const bunny = players.find(p => p.type === 'BUNNY')!;

  const handleReady = (type: 'FOX' | 'BUNNY') => {
    const p = type === 'FOX' ? fox : bunny;
    const name = type === 'FOX' ? nickName : judyName;
    
    const extraWords = (customWordsText.match(/[\u4e00-\u9fa5]/g) || []).map(char => ({
      char, frequency: '自定义', difficulty: '未知' as const, description: '特工手动录入。'
    }));

    const punishments: PunishmentBanks = {
      truths: customTruthsText.split('\n').map(s => s.trim()).filter(s => s.length > 0),
      dares: customDaresText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    };

    onPlayerReady({ ...p, name, isReady: true }, extraWords, punishments);
  };

  return (
    <div className="bg-white rounded-[60px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.1)] p-10 md:p-14 max-w-6xl w-full border-[12px] border-white animate-in slide-in-from-bottom-10 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Role Cards */}
        <div className="space-y-10">
          <div className="text-center md:text-left">
            <h2 className="text-5xl font-black text-slate-800 mb-2">角色认领处 🎭</h2>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">请点击领取你的身份</p>
          </div>

          <div className="space-y-6">
            {/* Nick Card */}
            <div className={`p-8 rounded-[45px] border-4 transition-all duration-500 flex items-center gap-6 relative overflow-hidden ${fox.isReady ? 'bg-orange-500 border-orange-300 translate-x-4 shadow-2xl shadow-orange-100' : 'bg-orange-50 border-orange-100 hover:scale-[1.02]'}`}>
              <div className="text-8xl select-none group-hover:scale-110 transition-transform">🦊</div>
              <div className="flex-1">
                <h3 className={`text-3xl font-black mb-3 ${fox.isReady ? 'text-white' : 'text-orange-800'}`}>狐尼克 · Nick</h3>
                {fox.isReady ? (
                  <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-white/30 animate-pulse">
                    <p className="text-white font-black italic">已就位: {fox.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={nickName}
                      onChange={e => setNickName(e.target.value)}
                      placeholder="特工代号..."
                      className="bg-white px-6 py-3 rounded-2xl border-2 border-orange-200 outline-none font-black w-full focus:ring-4 focus:ring-orange-200"
                    />
                    <button 
                      onClick={() => handleReady('FOX')} 
                      disabled={!nickName} 
                      className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      认领
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Judy Card */}
            <div className={`p-8 rounded-[45px] border-4 transition-all duration-500 flex items-center gap-6 relative overflow-hidden ${bunny.isReady ? 'bg-blue-600 border-blue-400 translate-x-4 shadow-2xl shadow-blue-100' : 'bg-blue-50 border-blue-100 hover:scale-[1.02]'}`}>
              <div className="text-8xl select-none group-hover:scale-110 transition-transform">🐰</div>
              <div className="flex-1">
                <h3 className={`text-3xl font-black mb-3 ${bunny.isReady ? 'text-white' : 'text-blue-800'}`}>朱迪 · Judy</h3>
                {bunny.isReady ? (
                  <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-white/30 animate-pulse">
                    <p className="text-white font-black italic">已出勤: {bunny.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={judyName}
                      onChange={e => setJudyName(e.target.value)}
                      placeholder="勋章编号..."
                      className="bg-white px-6 py-3 rounded-2xl border-2 border-blue-200 outline-none font-black w-full focus:ring-4 focus:ring-blue-200"
                    />
                    <button 
                      onClick={() => handleReady('BUNNY')} 
                      disabled={!judyName} 
                      className="bg-blue-700 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                      出勤
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Input Section */}
        <div className="bg-slate-50 p-10 rounded-[60px] border-4 border-slate-100 space-y-8 flex flex-col shadow-inner">
           <div className="text-center">
            <h2 className="text-3xl font-black text-slate-800 mb-1">自定义情报库 📂</h2>
            <p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase">Security Clearance Level 1</p>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-indigo-50">
              <label className="block text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-2">追加禁语关键词 (提取汉字)</label>
              <textarea
                value={customWordsText}
                onChange={e => setCustomWordsText(e.target.value)}
                placeholder="例如：输入这段话，会增加其中的汉字到抽题库..."
                className="w-full h-24 outline-none text-sm leading-relaxed resize-none font-bold placeholder:text-slate-300"
              />
            </div>
            
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-indigo-100">
                <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3 ml-2">私房真心话 (一行一条)</label>
                <textarea
                  value={customTruthsText}
                  onChange={e => setCustomTruthsText(e.target.value)}
                  placeholder="输入你想拷问的问题..."
                  className="w-full h-24 outline-none text-xs leading-relaxed resize-none font-bold"
                />
              </div>
              <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-rose-100">
                <label className="block text-[11px] font-black text-rose-600 uppercase tracking-widest mb-3 ml-2">绝密大冒险 (一行一条)</label>
                <textarea
                  value={customDaresText}
                  onChange={e => setCustomDaresText(e.target.value)}
                  placeholder="输入你设计的疯狂挑战..."
                  className="w-full h-24 outline-none text-xs leading-relaxed resize-none font-bold"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-amber-100 p-6 rounded-3xl border-2 border-amber-200 flex items-center gap-4">
             <span className="text-4xl animate-bounce">🚨</span>
             <p className="text-[12px] font-black text-amber-900 leading-tight uppercase">注意：双方都点击加入后，言灵咒将立即同步生效！</p>
          </div>
        </div>
      </div>
      
      <div className="mt-14 text-center">
        {canStart ? (
          <button
            onClick={onStartGame}
            className="inline-flex items-center gap-5 px-14 py-6 rounded-full font-black text-2xl shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-110 hover:scale-105 active:scale-95 transition-all animate-pulse"
          >
            <span className="w-4 h-4 rounded-full bg-green-400 shadow-[0_0_15px_#22c55e]" />
            🚀 开始行动！
          </button>
        ) : (
          <div className="inline-flex items-center gap-5 px-14 py-6 rounded-full font-black text-2xl shadow-2xl transition-all duration-1000 bg-slate-200 text-slate-400">
            <span className="w-4 h-4 rounded-full bg-slate-300" />
            正在等待队友通过验证...
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
