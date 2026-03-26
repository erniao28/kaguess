import React, { useState } from 'react';
import { Effect } from '../types';

interface EffectShopProps {
  isOpen: boolean;
  onClose: () => void;
  myCarrotCount: number;
  unlockedEffects: string[];
  onPurchase: (effectId: string, cost: number) => void;
  onSelectEffect: (effectId: string) => void;
  selectedEffectId: string | null;
}

const DEFAULT_EFFECTS: Effect[] = [
  {
    id: 'ticket-classic',
    name: '经典罚单',
    description: '传统的白色罚单，简洁大方',
    icon: '📄',
    cost: 0,
    type: 'SCORE',
    unlocked: true
  },
  {
    id: 'ice-classic',
    name: '经典冰糖',
    description: '传统的冰糖葫芦，酸甜可口',
    icon: '🍡',
    cost: 0,
    type: 'SCORE',
    unlocked: true
  },
  {
    id: 'ticket-golden',
    name: '黄金罚单',
    description: '闪耀的黄金罚单，尊贵无比',
    icon: '📜',
    cost: 5,
    type: 'SCORE',
    unlocked: false
  },
  {
    id: 'ice-rainbow',
    name: '彩虹糖葫芦',
    description: '七彩糖葫芦，梦幻甜美',
    icon: '🍭',
    cost: 5,
    type: 'SCORE',
    unlocked: false
  },
  {
    id: 'celebration-confetti',
    name: '缤纷彩带',
    description: '庆祝时的彩带飞舞',
    icon: '🎊',
    cost: 8,
    type: 'CELEBRATION',
    unlocked: false
  },
  {
    id: 'celebration-fireworks',
    name: '烟花绽放',
    description: '绚丽的烟花表演',
    icon: '🎆',
    cost: 10,
    type: 'CELEBRATION',
    unlocked: false
  },
  {
    id: 'penalty-lightning',
    name: '闪电惩罚',
    description: '被闪电击中的效果',
    icon: '⚡',
    cost: 8,
    type: 'PENALTY',
    unlocked: false
  },
  {
    id: 'penalty-skull',
    name: '骷髅头',
    description: '失败者的标志',
    icon: '💀',
    cost: 6,
    type: 'PENALTY',
    unlocked: false
  },
  {
    id: 'ticket-rose',
    name: '玫瑰罚单',
    description: '浪漫的玫瑰花瓣',
    icon: '🌹',
    cost: 7,
    type: 'SCORE',
    unlocked: false
  },
  {
    id: 'ice-star',
    name: '星星特效',
    description: '闪烁的星星',
    icon: '⭐',
    cost: 7,
    type: 'SCORE',
    unlocked: false
  },
  {
    id: 'celebration-trophy',
    name: '奖杯',
    description: '胜利的奖杯',
    icon: '🏆',
    cost: 15,
    type: 'CELEBRATION',
    unlocked: false
  },
  {
    id: 'penalty-tears',
    name: '流泪',
    description: '失败者的眼泪',
    icon: '😭',
    cost: 6,
    type: 'PENALTY',
    unlocked: false
  }
];

const EffectShop: React.FC<EffectShopProps> = ({
  isOpen,
  onClose,
  myCarrotCount,
  unlockedEffects,
  onPurchase,
  onSelectEffect,
  selectedEffectId
}) => {
  const [activeTab, setActiveTab] = useState<'SCORE' | 'CELEBRATION' | 'PENALTY'>('SCORE');

  if (!isOpen) return null;

  const filteredEffects = DEFAULT_EFFECTS.filter(e => {
    const isUnlocked = unlockedEffects.includes(e.id);
    return e.type === activeTab && (isUnlocked || e.cost > 0);
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-[40px] shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border-8 border-purple-400" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-400 to-pink-500 px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-black transition-all"
          >
            ✕
          </button>
          <div className="text-5xl mb-2">🏪</div>
          <h2 className="text-3xl font-black text-white">特效商店</h2>
          <p className="text-purple-100 text-sm mt-1">用胡萝卜兑换特效</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 胡萝卜余额 */}
          <div className="bg-white rounded-2xl p-4 mb-6 shadow-md border-4 border-yellow-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🥕</span>
              <div>
                <div className="text-sm text-slate-400 font-bold">我的胡萝卜</div>
                <div className="text-2xl font-black text-yellow-600">{myCarrotCount}</div>
              </div>
            </div>
          </div>

          {/* 分类标签 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('SCORE')}
              className={`flex-1 py-3 rounded-2xl font-black transition-all ${
                activeTab === 'SCORE'
                  ? 'bg-indigo-500 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              📄 计分特效
            </button>
            <button
              onClick={() => setActiveTab('CELEBRATION')}
              className={`flex-1 py-3 rounded-2xl font-black transition-all ${
                activeTab === 'CELEBRATION'
                  ? 'bg-yellow-500 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              🎉 庆祝特效
            </button>
            <button
              onClick={() => setActiveTab('PENALTY')}
              className={`flex-1 py-3 rounded-2xl font-black transition-all ${
                activeTab === 'PENALTY'
                  ? 'bg-rose-500 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              💀 惩罚特效
            </button>
          </div>

          {/* 特效列表 */}
          <div className="grid grid-cols-2 gap-4">
            {filteredEffects.map(effect => {
              const isUnlocked = unlockedEffects.includes(effect.id);
              const isSelected = selectedEffectId === effect.id;
              const canAfford = myCarrotCount >= effect.cost;

              return (
                <div
                  key={effect.id}
                  className={`relative p-4 rounded-3xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-green-500'
                      : isUnlocked
                      ? 'bg-white border-4 border-purple-200 hover:border-purple-400'
                      : 'bg-white border-4 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => {
                    if (isUnlocked) {
                      onSelectEffect(effect.id);
                    } else if (canAfford) {
                      onPurchase(effect.id, effect.cost);
                    }
                  }}
                >
                  {/* 未解锁标记 */}
                  {!isUnlocked && (
                    <div className="absolute top-2 right-2 bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                      🔒
                    </div>
                  )}

                  {/* 已解锁标记 */}
                  {isUnlocked && !isSelected && (
                    <div className="absolute top-2 right-2 bg-green-200 text-green-600 px-2 py-1 rounded-lg text-xs font-bold">
                      ✓ 已拥有
                    </div>
                  )}

                  {/* 选中确认 */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                      ✓ 已装备
                    </div>
                  )}

                  <div className="text-5xl mb-3">{effect.icon}</div>
                  <div className={`font-black mb-1 ${isSelected ? 'text-green-700' : 'text-slate-700'}`}>
                    {effect.name}
                  </div>
                  <div className="text-xs text-slate-400 mb-2 h-8">{effect.description}</div>

                  {isUnlocked ? (
                    <div className={`text-xs font-bold ${isSelected ? 'text-green-600' : 'text-slate-400'}`}>
                      {isSelected ? '已装备' : '点击装备'}
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1 text-sm font-black ${canAfford ? 'text-yellow-600' : 'text-slate-300'}`}>
                      <span>🥕</span>
                      <span>{effect.cost}</span>
                      {!canAfford && <span className="text-xs text-rose-400 ml-1">(胡萝卜不足)</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredEffects.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">🔒</div>
              <div>这个分类下没有更多特效了</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EffectShop;
