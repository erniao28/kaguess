import React from 'react';

interface GamePanelProps {
  onEnterGame: (game: 'forbidden' | 'draw-guess') => void;
  decorationMode: boolean;
  myCheeseCount: number;
  playerRole: 'FOX' | 'BUNNY' | null;
  hasRoom: boolean;
  onOpenFurnitureShop?: () => void;
  gameActive?: boolean;
  gameMode?: 'forbidden' | 'draw-guess';
  onBackToGame?: () => void;
}

interface GameEntry {
  id: 'forbidden' | 'draw-guess';
  name: string;
  icon: string;
  description: string;
  color: string;
  hoverColor: string;
  textColor: string;
}

const games: GameEntry[] = [
  {
    id: 'forbidden',
    name: '每日禁语',
    icon: '🚫',
    description: '避开禁语词，说出你的故事！',
    color: 'from-indigo-500 to-indigo-700',
    hoverColor: 'hover:from-indigo-600 hover:to-indigo-800',
    textColor: 'text-indigo-600'
  },
  {
    id: 'draw-guess',
    name: '你画我猜',
    icon: '🎨',
    description: '用画笔表达，猜猜 TA 画了什么！',
    color: 'from-purple-500 to-purple-700',
    hoverColor: 'hover:from-purple-600 hover:to-purple-800',
    textColor: 'text-purple-600'
  }
];

const GamePanel: React.FC<GamePanelProps> = ({
  onEnterGame,
  decorationMode,
  myCheeseCount,
  playerRole,
  hasRoom,
  onOpenFurnitureShop,
  gameActive,
  gameMode,
  onBackToGame
}) => {
  if (decorationMode) {
    return (
      <div className="w-full flex-shrink-0">
        <div className="bg-white rounded-[32px] shadow-xl border-4 border-yellow-200 p-4">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🪑</div>
            <h3 className="text-xl font-black text-slate-800">装饰模式</h3>
            <p className="text-sm text-slate-500">用奶酪解锁家具，装扮你的小窝</p>
          </div>

          <div className="bg-yellow-50 rounded-2xl px-4 py-3 flex items-center justify-between mb-4 border border-yellow-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧀</span>
              <span className="text-yellow-700 font-bold">奶酪余额</span>
            </div>
            <span className="text-yellow-700 font-black text-lg">{myCheeseCount}</span>
          </div>

          {onOpenFurnitureShop && (
            <button
              onClick={onOpenFurnitureShop}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black text-lg rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              🛒 打开家具商城
            </button>
          )}

          <div className="mt-4 bg-yellow-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-yellow-700 font-bold">
              💡 在商城购买家具后，点击背包中的家具即可放置到聊天室
            </p>
          </div>
        </div>
      </div>
    );
  }

  const gameNames: Record<string, string> = { forbidden: '每日禁语', 'draw-guess': '你画我猜' };
  const gameIcons: Record<string, string> = { forbidden: '🚫', 'draw-guess': '🎨' };

  return (
    <div className="w-full flex-shrink-0">
      <div className="bg-white rounded-[32px] shadow-xl border-4 border-slate-100 p-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎮</div>
          <h3 className="text-xl font-black text-slate-800">游戏中心</h3>
          <p className="text-sm text-slate-500">选择游戏开始对战</p>
        </div>

        {/* 返回游戏按钮 - 游戏进行中时显示 */}
        {gameActive && gameMode && onBackToGame && (
          <button
            onClick={onBackToGame}
            className="w-full mb-4 rounded-2xl p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.97] relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1 left-3 text-xs animate-ping">✨</div>
              <div className="absolute top-2 right-4 text-xs animate-ping" style={{ animationDelay: '0.5s' }}>✨</div>
              <div className="absolute bottom-1 left-1/2 text-xs animate-ping" style={{ animationDelay: '1s' }}>✨</div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <span className="text-3xl">{gameIcons[gameMode]}</span>
              <div>
                <div className="font-black text-lg">返回游戏</div>
                <div className="text-white/80 text-xs">{gameNames[gameMode]} 进行中</div>
              </div>
            </div>
          </button>
        )}

        <div className="space-y-4">
          {games.map(game => (
            <button
              key={game.id}
              onClick={() => onEnterGame(game.id)}
              disabled={!hasRoom}
              className={`w-full text-left rounded-2xl p-4 bg-gradient-to-r ${game.color} ${game.hoverColor} text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{game.icon}</span>
                <div>
                  <div className="font-black text-lg">{game.name}</div>
                  <div className="text-white/80 text-xs">{game.description}</div>
                </div>
              </div>
              {!hasRoom && (
                <div className="mt-2 text-xs text-white/60">
                  请先创建或加入房间
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 bg-slate-50 rounded-2xl p-4">
          <p className="text-xs text-slate-500 font-bold">
            💡 提示：返回小窝后游戏继续进行，可随时返回
          </p>
        </div>
      </div>
    </div>
  );
};

export default GamePanel;
