import React from 'react';

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
}

const HonorHall: React.FC<HonorHallProps> = ({
  isOpen,
  onClose,
  myCarrotCount,
  mySocketId,
  leaderboard
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[40px] shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border-8 border-yellow-400" onClick={e => e.stopPropagation()}>
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 我的胡萝卜 */}
          <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg border-4 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400 font-bold mb-1">我的胡萝卜</div>
                <div className="text-5xl font-black text-yellow-600">{myCarrotCount}</div>
              </div>
              <div className="text-7xl">🥕</div>
            </div>
          </div>

          {/* 排行榜 */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-4 border-orange-200">
            <h3 className="text-xl font-black text-slate-700 mb-4 flex items-center gap-2">
              <span>📊</span> 英雄榜
            </h3>

            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">🌱</div>
                <div>暂无记录，快去玩游戏吧！</div>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => {
                  const isMe = entry.playerIdentifier === mySocketId;
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
                        <div className={`text-2xl font-black w-10 h-10 flex items-center justify-center rounded-full ${
                          rank === 1 ? 'bg-yellow-400 text-white' :
                          rank === 2 ? 'bg-slate-300 text-white' :
                          rank === 3 ? 'bg-orange-400 text-white' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {medal}
                        </div>
                        <div>
                          <div className={`font-bold ${isMe ? 'text-yellow-700' : 'text-slate-700'}`}>
                            {isMe ? '我' : (entry.nickname || `玩家 ${entry.playerIdentifier.slice(-4)}`)}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>🎮 {entry.totalGames}场</span>
                            <span>🏆 {entry.winGames}胜</span>
                            <span>📈 {entry.winRate}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 bg-yellow-100 rounded-xl flex items-center gap-1.5">
                          <span className="text-xl">🥕</span>
                          <span className={`text-lg font-black ${isMe ? 'text-yellow-700' : 'text-slate-700'}`}>
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
  );
};

export default HonorHall;
