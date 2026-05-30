import React, { useState } from 'react';

interface FurnitureItem {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
}

interface FurnitureShopProps {
  catalog: FurnitureItem[];
  ownedItems: string[]; // 已拥有的家具 ID 列表
  placedFurniture: Array<{ id: string; itemId: string; x: number; y: number }>;
  myCheeseCount: number;
  onPurchase: (itemId: string) => void;
  onPlace: (itemId: string) => void;
  onRemove: (furnitureId: string) => void;
  onClose: () => void;
}

const FurnitureShop: React.FC<FurnitureShopProps> = ({
  catalog,
  ownedItems,
  placedFurniture,
  myCheeseCount,
  onPurchase,
  onPlace,
  onRemove,
  onClose
}) => {
  const [tab, setTab] = useState<'shop' | 'inventory' | 'placed'>('shop');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        {/* 标题 */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>
          <div className="text-5xl mb-2">🪑</div>
          <h2 className="text-2xl font-black text-white">家具商城</h2>
          <p className="text-yellow-100 text-sm mt-1">用奶酪解锁家具，装扮你的小窝</p>
        </div>

        {/* 奶酪余额 */}
        <div className="bg-yellow-50 px-6 py-3 flex items-center justify-between border-b border-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧀</span>
            <span className="text-yellow-700 font-bold">奶酪余额</span>
          </div>
          <span className="text-yellow-700 font-black text-lg">{myCheeseCount}</span>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-slate-200">
          {(['shop', 'inventory', 'placed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 font-bold text-sm transition-colors ${
                tab === t
                  ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t === 'shop' ? '🛒 商城' : t === 'inventory' ? '📦 背包' : '🏠 已放置'}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {tab === 'shop' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {catalog.map(item => {
                const owned = ownedItems.includes(item.id);
                const canBuy = myCheeseCount >= item.cost && !owned;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 text-center border-2 transition-all ${
                      owned
                        ? 'border-green-300 bg-green-50'
                        : canBuy
                        ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-500 hover:shadow-md cursor-pointer'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                    onClick={() => {
                      if (owned) {
                        onPlace(item.id);
                      } else if (canBuy) {
                        onPurchase(item.id);
                      }
                    }}
                  >
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="font-bold text-sm text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                    {owned ? (
                      <div className="mt-2 text-xs font-bold text-green-600">已拥有 ✓</div>
                    ) : (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <span className="text-sm">🧀</span>
                        <span className={`font-black text-sm ${canBuy ? 'text-yellow-600' : 'text-slate-400'}`}>{item.cost}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'inventory' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {ownedItems.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-slate-400">
                  <div className="text-6xl mb-4">📦</div>
                  <p>背包空空如也，快去商城逛逛吧！</p>
                </div>
              ) : (
                catalog.filter(item => ownedItems.includes(item.id)).map(item => (
                  <div
                    key={item.id}
                    className="rounded-2xl p-4 text-center border-2 border-green-300 bg-green-50 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => onPlace(item.id)}
                  >
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="font-bold text-sm text-slate-800">{item.name}</div>
                    <div className="mt-2 text-xs font-bold text-green-600">点击放置</div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'placed' && (
            <div className="space-y-3">
              {placedFurniture.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-6xl mb-4">🏠</div>
                  <p>还没有放置任何家具，快去背包里选一个吧！</p>
                </div>
              ) : (
                placedFurniture.map(f => {
                  const item = catalog.find(c => c.id === f.itemId);
                  if (!item) return null;
                  return (
                    <div key={f.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-3xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">位置: ({f.x}, {f.y})</div>
                      </div>
                      <button
                        onClick={() => onRemove(f.id)}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-bold transition-all"
                      >
                        移除
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FurnitureShop;
