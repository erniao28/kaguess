import React, { useState } from 'react';

interface PlayerRanking {
  playerCode: string;
  nickname: string;
  carrotCount: number;
  totalGames: number;
  winGames: number;
  vipLevel: number;
  title?: string;
}

interface ArchiveRoomRankingProps {
  isOpen: boolean;
  onClose: () => void;
  rankings: PlayerRanking[];
}

// 称号配置
const TITLES = [
  { name: '新手', minCarrots: 0, icon: '🌱' },
  { name: '胡萝卜猎人', minCarrots: 50, icon: '🥕' },
  { name: '胡萝卜收藏家', minCarrots: 200, icon: '🧺' },
  { name: '胡萝卜大师', minCarrots: 500, icon: '⭐' },
  { name: '胡萝卜传奇', minCarrots: 1000, icon: '👑' },
  { name: '言灵特工', minCarrots: 2000, icon: '🔮' },
  { name: '言灵王者', minCarrots: 5000, icon: '🌟' },
];

const getTitle = (carrotCount: number): { name: string; icon: string } => {
  for (let i = TITLES.length - 1; i >= 0; i--) {
    if (carrotCount >= TITLES[i].minCarrots) {
      return TITLES[i];
    }
  }
  return TITLES[0];
};

const ArchiveRoomRanking: React.FC<ArchiveRoomRankingProps> = ({
  isOpen,
  onClose,
  rankings
}) => {
  const [activeTab, setActiveTab] = useState<'carrot' | 'winrate' | 'vip'>('carrot');

  if (!isOpen) return null;

  // 根据标签排序
  const sortedRankings = [...rankings].sort((a, b) => {
    if (activeTab === 'carrot') {
      return b.carrotCount - a.carrotCount;
    } else if (activeTab === 'winrate') {
      const aWinRate = a.totalGames > 0 ? (a.winGames / a.totalGames) : 0;
      const bWinRate = b.totalGames > 0 ? (b.winGames / b.totalGames) : 0;
      return bWinRate - aWinRate;
    } else {
      return b.vipLevel - a.vipLevel;
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>
          <div className="text-center">
            <div className="text-5xl mb-2">🏆</div>
            <h2 className="text-2xl font-black text-white">档案室排行榜</h2>
            <p className="text-indigo-100 text-sm mt-1">看看谁是最强特工！</p>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          <button
            onClick={() => setActiveTab('carrot')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'carrot'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🥕 胡萝卜榜
          </button>
          <button
            onClick={() => setActiveTab('winrate')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'winrate'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🏆 胜率榜
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'vip'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            ⭐ VIP 榜
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 前三名 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* 第二名 */}
            {sortedRankings[1] && (
              <div className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-3xl p-4 text-center shadow-lg order-2">
                <div className="text-4xl mb-2">🥈</div>
                <div className="text-5xl mb-2">{getTitle(sortedRankings[1].carrotCount).icon}</div>
                <div className="font-black text-slate-700 truncate">{sortedRankings[1].nickname}</div>
                <div className="text-xs text-slate-500 mt-1">{getTitle(sortedRankings[1].carrotCount).name}</div>
                {activeTab === 'carrot' && <div className="text-lg font-black text-slate-600 mt-2">{sortedRankings[1].carrotCount} 🥕</div>}
                {activeTab === 'winrate' && (
                  <div className="text-lg font-black text-slate-600 mt-2">
                    {sortedRankings[1].totalGames > 0 ? ((sortedRankings[1].winGames / sortedRankings[1].totalGames) * 100).toFixed(1) : 0}%
                  </div>
                )}
                {activeTab === 'vip' && <div className="text-lg font-black text-slate-600 mt-2">LV.{sortedRankings[1].vipLevel}</div>}
              </div>
            )}

            {/* 第一名 */}
            {sortedRankings[0] && (
              <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-3xl p-6 text-center shadow-xl transform scale-105 order-1">
                <div className="text-6xl mb-2">🥇</div>
                <div className="text-6xl mb-2">{getTitle(sortedRankings[0].carrotCount).icon}</div>
                <div className="font-black text-white text-lg truncate">{sortedRankings[0].nickname}</div>
                <div className="text-xs text-white/80 mt-1">{getTitle(sortedRankings[0].carrotCount).name}</div>
                {activeTab === 'carrot' && <div className="text-2xl font-black text-white mt-2">{sortedRankings[0].carrotCount} 🥕</div>}
                {activeTab === 'winrate' && (
                  <div className="text-2xl font-black text-white mt-2">
                    {sortedRankings[0].totalGames > 0 ? ((sortedRankings[0].winGames / sortedRankings[0].totalGames) * 100).toFixed(1) : 0}%
                  </div>
                )}
                {activeTab === 'vip' && <div className="text-2xl font-black text-white mt-2">LV.{sortedRankings[0].vipLevel}</div>}
              </div>
            )}

            {/* 第三名 */}
            {sortedRankings[2] && (
              <div className="bg-gradient-to-br from-orange-200 to-orange-300 rounded-3xl p-4 text-center shadow-lg order-3">
                <div className="text-4xl mb-2">🥉</div>
                <div className="text-5xl mb-2">{getTitle(sortedRankings[2].carrotCount).icon}</div>
                <div className="font-black text-slate-700 truncate">{sortedRankings[2].nickname}</div>
                <div className="text-xs text-slate-500 mt-1">{getTitle(sortedRankings[2].carrotCount).name}</div>
                {activeTab === 'carrot' && <div className="text-lg font-black text-slate-600 mt-2">{sortedRankings[2].carrotCount} 🥕</div>}
                {activeTab === 'winrate' && (
                  <div className="text-lg font-black text-slate-600 mt-2">
                    {sortedRankings[2].totalGames > 0 ? ((sortedRankings[2].winGames / sortedRankings[2].totalGames) * 100).toFixed(1) : 0}%
                  </div>
                )}
                {activeTab === 'vip' && <div className="text-lg font-black text-slate-600 mt-2">LV.{sortedRankings[2].vipLevel}</div>}
              </div>
            )}
          </div>

          {/* 完整榜单 */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
              <span>📋</span> 完整榜单
            </h3>

            {sortedRankings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">🌱</div>
                <div>暂无数据，快去玩游戏吧！</div>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedRankings.map((player, index) => {
                  const rank = index + 1;
                  const playerTitle = getTitle(player.carrotCount);

                  return (
                    <div
                      key={player.playerCode}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        rank <= 3 ? 'bg-gradient-to-r from-indigo-50 to-purple-50' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                          rank === 1 ? 'bg-yellow-400 text-white' :
                          rank === 2 ? 'bg-slate-300 text-white' :
                          rank === 3 ? 'bg-orange-400 text-white' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {rank}
                        </div>
                        <div className="text-2xl">{playerTitle.icon}</div>
                        <div>
                          <div className="font-bold text-slate-700">{player.nickname}</div>
                          <div className="text-xs text-slate-400">{playerTitle.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {activeTab === 'carrot' && (
                          <div className="font-black text-indigo-600">{player.carrotCount} 🥕</div>
                        )}
                        {activeTab === 'winrate' && (
                          <div className="font-black text-indigo-600">
                            {player.totalGames > 0 ? ((player.winGames / player.totalGames) * 100).toFixed(1) : 0}%
                          </div>
                        )}
                        {activeTab === 'vip' && (
                          <div className="font-black text-indigo-600">LV.{player.vipLevel}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 称号说明 */}
          <div className="mt-4 bg-indigo-50 rounded-xl p-4">
            <h4 className="font-bold text-indigo-700 mb-2 text-sm">📖 称号系统</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TITLES.map((title) => (
                <div key={title.name} className="flex items-center gap-2 text-xs text-slate-600">
                  <span>{title.icon}</span>
                  <span>{title.name}</span>
                  <span className="text-slate-400">({title.minCarrots}+)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveRoomRanking;
