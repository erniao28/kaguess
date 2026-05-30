import React from 'react';
import VipBadge from './VipBadge';

interface LeaderboardEntry {
  playerIdentifier: string;
  nickname: string;
  carrotCount: number;
  totalGames: number;
  winGames: number;
  winRate: string;
  vipLevel: number;
  lastLogin: number;
}

interface HonorHallProps {
  isOpen: boolean;
  onClose: () => void;
  myCarrotCount: number;
  mySocketId: string | null;
  leaderboard: LeaderboardEntry[];
  playerProfile?: any | null;
}

const HonorHall: React.FC<HonorHallProps> = ({
  isOpen,
  onClose,
  myCarrotCount,
  mySocketId,
  leaderboard,
  playerProfile = null
}) => {
  if (!isOpen) return null;

  // 计算胜率
  const winRate = playerProfile?.totalGames && playerProfile.totalGames > 0
    ? ((playerProfile.winGames / playerProfile.totalGames) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border-8 border-yellow-400" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-black transition-all"
          >
            ✕
          </button>
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-3xl font-black text-white">荣誉室</h2>
          <p className="text-yellow-100 text-sm mt-1">胡萝卜排行榜</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：个人荣誉 */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-lg border-4 border-yellow-200">
                <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
                  <span>👤</span> 我的荣誉
                </h3>

                {/* VIP 徽章 */}
                {playerProfile && (
                  <div className="mb-4 flex justify-center">
                    <VipBadge vipLevel={playerProfile.vipLevel || 0} size="lg" />
                  </div>
                )}

                {/* 统计 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                    <span className="text-sm text-slate-500 font-bold">胡萝卜</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥕</span>
                      <span className="text-xl font-black text-yellow-600">{myCarrotCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                    <span className="text-sm text-slate-500 font-bold">总场次</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎮</span>
                      <span className="text-xl font-black text-indigo-600">{playerProfile?.totalGames || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <span className="text-sm text-slate-500 font-bold">胜利</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏆</span>
                      <span className="text-xl font-black text-green-600">{playerProfile?.winGames || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                    <span className="text-sm text-slate-500 font-bold">胜率</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📈</span>
                      <span className="text-xl font-black text-purple-600">{winRate}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                    <span className="text-sm text-slate-500 font-bold">登录天数</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <span className="text-xl font-black text-amber-600">{playerProfile?.loginDays || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：排行榜 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-6 shadow-lg border-4 border-orange-200 h-full">
                <h3 className="text-xl font-black text-slate-700 mb-4 flex items-center gap-2">
                  <span>📊</span> 英雄榜
                </h3>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">🌱</div>
                    <div>暂无记录，快去玩游戏吧！</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {leaderboard.map((entry, index) => {
                      const isMe = entry.playerIdentifier === playerProfile?.playerCode;
                      const rank = index + 1;
                      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

                      return (
                        <div
                          key={entry.playerIdentifier}
                          className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                            isMe
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400'
                              : 'bg-slate-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`text-xl font-black w-8 h-8 flex items-center justify-center rounded-full ${
                              rank === 1 ? 'bg-yellow-400 text-white' :
                              rank === 2 ? 'bg-slate-300 text-white' :
                              rank === 3 ? 'bg-orange-400 text-white' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {medal}
                            </div>
                            <div>
                              <div className={`font-bold ${isMe ? 'text-yellow-700' : 'text-slate-700'}`}>
                                {entry.nickname || `玩家 ${entry.playerIdentifier.slice(-4)}`}
                                {isMe && <span className="text-xs text-yellow-500 ml-1">(我)</span>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span>🎮 {entry.totalGames}场</span>
                                <span>🏆 {entry.winGames}胜</span>
                                <span>📈 {entry.winRate}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <VipBadge vipLevel={entry.vipLevel || 0} size="sm" showLabel={false} />
                            <div className="px-3 py-1.5 bg-yellow-100 rounded-xl flex items-center gap-1">
                              <span className="text-lg">🥕</span>
                              <span className={`text-sm font-black ${isMe ? 'text-yellow-700' : 'text-slate-700'}`}>
                                {entry.carrotCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HonorHall;
