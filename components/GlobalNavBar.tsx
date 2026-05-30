import React from 'react';

interface GlobalNavBarProps {
  // 房间相关
  roomId: string;
  isPrivateRoom: boolean;
  gameState: 'ROOM' | 'PLAYING' | 'SETUP';
  inSetup?: boolean;

  // 玩家相关
  playerProfile: any;
  myCarrotCount: number;
  myCheeseCount: number;
  unreadMailCount?: number;

  // 状态控制
  showSidebar: boolean;
  decorationMode: boolean;

  // 回调函数
  onToggleSidebar: () => void;
  onToggleDecoration: () => void;
  onOpenRoomManagement?: () => void;
  onOpenRoomSelector?: () => void;
  onOpenPrivateRoom?: () => void;
  onExitRoom?: () => void;
  onOpenMailBox?: () => void;
  onOpenHonorHall?: () => void;
  onOpenArchiveRoom?: () => void;
  onOpenFurnitureShop?: () => void;

  // 游戏相关回调
  onSettle?: () => void;
  onStartDrawGuess?: () => void;
  onClearRoom?: () => void;
}

const GlobalNavBar: React.FC<GlobalNavBarProps> = ({
  roomId,
  isPrivateRoom,
  gameState,
  inSetup = false,
  playerProfile,
  myCarrotCount,
  myCheeseCount,
  unreadMailCount = 0,
  showSidebar,
  decorationMode,
  onToggleSidebar,
  onToggleDecoration,
  onOpenRoomManagement,
  onOpenRoomSelector,
  onOpenPrivateRoom,
  onExitRoom,
  onOpenMailBox,
  onOpenHonorHall,
  onOpenArchiveRoom,
  onOpenFurnitureShop,
  onSettle,
  onStartDrawGuess,
  onClearRoom,
}) => {
  return (
    <>
      <style>{`
        @keyframes navFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        .nav-float {
          animation: navFloat 3s ease-in-out infinite;
        }
      `}</style>

      {/* 全局顶部导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-[500] h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">

          {/* 左侧：房间管理 */}
          <div className="flex items-center gap-2">
            {/* 菜单切换按钮 */}
            <button
              onClick={onToggleSidebar}
              className="w-10 h-10 bg-slate-700/50 hover:bg-slate-600 rounded-xl flex items-center justify-center text-slate-300 font-bold transition-all"
              title={showSidebar ? '收起菜单' : '展开菜单'}
            >
              {showSidebar ? '◀' : '▶'}
            </button>

            {/* 房间管理 / 切换房间 */}
            {gameState === 'ROOM' && (
              <>
                {isPrivateRoom && roomId ? (
                  <button
                    onClick={onOpenRoomManagement}
                    className="px-4 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-indigo-500/30"
                  >
                     房间管理
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onOpenRoomSelector}
                      className="px-4 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-indigo-500/30"
                    >
                      🏠 {roomId ? '切换房间' : '创建房间'}
                    </button>
                    {!roomId && (
                      <button
                        onClick={onOpenPrivateRoom}
                        className="px-4 h-10 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-black text-sm transition-all shadow-lg"
                      >
                        🔐 私密房间
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* 退出房间 */}
            {(gameState === 'PLAYING' || inSetup) && roomId && (
              <button
                onClick={onExitRoom}
                className="px-4 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black text-sm transition-all"
                title="返回小窝小憩"
              >
                🏰 回小窝小憩
              </button>
            )}
          </div>

          {/* 中间：状态显示 */}
          <div className="flex items-center gap-3">
            {/* 房间状态 */}
            {roomId && (
              <div className="px-4 py-2 bg-slate-700/50 rounded-xl border border-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-slate-300 text-sm font-bold">
                    {isPrivateRoom ? `私密：${roomId}` : `房间：${roomId}`}
                  </span>
                </div>
              </div>
            )}

            {/* 游戏状态 */}
            {gameState === 'PLAYING' && (
              <div className="px-4 py-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl border border-indigo-500/30">
                <span className="text-indigo-300 text-sm font-black">🎮 游戏中</span>
              </div>
            )}

            {/* 装饰模式 */}
            {decorationMode && (
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 rounded-xl border border-yellow-500/30">
                <span className="text-yellow-300 text-sm font-black">🪑 装饰模式</span>
              </div>
            )}
          </div>

          {/* 右侧：功能按钮 */}
          <div className="flex items-center gap-2">
            {/* 游戏操作按钮（仅游戏中显示） */}
            {gameState === 'PLAYING' && (
              <>
                {onSettle && (
                  <button
                    onClick={onSettle}
                    className="px-4 h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-sm transition-all shadow-lg"
                  >
                    🏁 结案
                  </button>
                )}
                {onStartDrawGuess && (
                  <button
                    onClick={onStartDrawGuess}
                    className="px-4 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-black text-sm transition-all shadow-lg"
                  >
                    🎨 你画我猜
                  </button>
                )}
                {onClearRoom && (
                  <button
                    onClick={onClearRoom}
                    className="px-4 h-10 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-sm transition-all shadow-lg"
                    title="清空房间所有角色"
                  >
                    ️ 清空
                  </button>
                )}
              </>
            )}

            {/* 装饰模式切换 */}
            <button
              onClick={onToggleDecoration}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black transition-all ${
                decorationMode
                  ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
              }`}
              title="装饰模式"
            >
              🪑
            </button>

            {/* 家具商城 */}
            {onOpenFurnitureShop && (
              <button
                onClick={onOpenFurnitureShop}
                className="w-10 h-10 bg-slate-700/50 hover:bg-slate-600 rounded-xl flex items-center justify-center text-lg font-black text-slate-300 transition-all"
                title="家具商城"
              >
                🛒
              </button>
            )}

            {/* 信箱 */}
            {playerProfile && onOpenMailBox && (
              <button
                onClick={onOpenMailBox}
                className="relative w-10 h-10 bg-amber-600/80 hover:bg-amber-500 rounded-xl flex items-center justify-center text-xl font-black text-white transition-all shadow-lg"
                title="信箱"
              >
                📬
                {unreadMailCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                    {unreadMailCount > 99 ? '99+' : unreadMailCount}
                  </span>
                )}
              </button>
            )}

            {/* 胡萝卜/荣誉堂 */}
            {playerProfile && onOpenHonorHall && (
              <button
                onClick={onOpenHonorHall}
                className="px-3 h-10 bg-yellow-600/80 hover:bg-yellow-500 rounded-xl flex items-center gap-2 font-black text-white transition-all shadow-lg"
                title="点击查看荣誉堂"
              >
                <span className="text-lg">🥕</span>
                <span className="text-sm">{myCarrotCount}</span>
              </button>
            )}

            {/* 档案 */}
            {playerProfile && onOpenArchiveRoom && (
              <button
                onClick={onOpenArchiveRoom}
                className="px-3 h-10 bg-indigo-600/80 hover:bg-indigo-500 rounded-xl flex items-center gap-2 font-black text-white transition-all shadow-lg"
                title="我的档案"
              >
                <span className="text-lg">🆔</span>
                <span className="text-sm truncate max-w-[80px]">{playerProfile.nickname}</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default GlobalNavBar;
