import React from 'react';

interface Character3DProps {
  character: 'FOX' | 'BUNNY';
  equippedClothesId?: string;
  equippedHeadwearId?: string;
  equippedAccessoryId?: string;
  equippedShoesId?: string;
  fullbodyImageUrl?: string;
  isAnimating?: boolean;
}

// 服装图标映射
const CLOTHING_ICONS: Record<string, string> = {
  'shirt_casual': '👕',
  'shirt_formal': '👔',
  'jacket': '🧥',
  'hoodie': '👚',
  'vest': '🦺',
  'dress': '👘',
  'hat_cap': '🧢',
  'hat_crown': '👑',
  'hat_top': '🎩',
  'hat_cowboy': '🤠',
  'hat_beret': '🎨',
  'hair_band': '🎀',
  'halo': '😇',
  'glasses': '👓',
  'sunglasses': '🕶️',
  'backpack': '🎒',
  'handbag': '👜',
  'purse': '👛',
  'scarf': '🧣',
  'tie': '👔',
  'necklace': '💎',
  'watch': '⌚',
  'shoes_sneakers': '👟',
  'shoes_boots': '🥾',
  'shoes_formal': '👞',
  'shoes_heels': '👠',
  'shoes_sandals': '👡',
};

const Character3D: React.FC<Character3DProps> = ({
  character = 'FOX',
  equippedClothesId,
  equippedHeadwearId,
  equippedAccessoryId,
  equippedShoesId,
  fullbodyImageUrl,
  isAnimating = false
}) => {
  // 如果有自定义全身像 URL，直接显示图片
  if (fullbodyImageUrl) {
    return (
      <div className="w-full h-full relative">
        <img
          src={fullbodyImageUrl}
          alt="Character"
          className="w-full h-full object-cover"
        />
        {equippedHeadwearId && CLOTHING_ICONS[equippedHeadwearId] && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-5xl drop-shadow-lg z-20">
            {CLOTHING_ICONS[equippedHeadwearId]}
          </div>
        )}
        {equippedAccessoryId && CLOTHING_ICONS[equippedAccessoryId] && (
          <div className="absolute top-1/2 left-1/2 translate-x-8 -translate-y-4 text-3xl drop-shadow-lg z-10">
            {CLOTHING_ICONS[equippedAccessoryId]}
          </div>
        )}
      </div>
    );
  }

  const isFox = character === 'FOX';
  const emoji = isFox ? '🦊' : '🐰';
  const charName = isFox ? '尼克' : '朱迪';
  const bgGradient = isFox
    ? 'from-orange-400 to-orange-600'
    : 'from-purple-400 to-purple-600';
  const glowColor = isFox ? 'rgba(249,115,22,0.3)' : 'rgba(168,85,247,0.3)';

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <div
        className={`relative w-48 h-64 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b ${bgGradient} shadow-xl`}
      >
        {/* 背景光晕 */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-40"
          style={{ backgroundColor: glowColor }}
        />

        {/* 头部装备（头饰叠在 emoji 上方） */}
        {equippedHeadwearId && CLOTHING_ICONS[equippedHeadwearId] && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-4xl z-20 drop-shadow-lg">
            {CLOTHING_ICONS[equippedHeadwearId]}
          </div>
        )}

        {/* 主角色 emoji */}
        <div className={`relative ${isAnimating ? 'animate-bounce' : ''}`}>
          <span className="text-7xl drop-shadow-2xl">{emoji}</span>
        </div>

        {/* 衣服 */}
        {equippedClothesId && CLOTHING_ICONS[equippedClothesId] && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-4xl z-10 drop-shadow-lg">
            {CLOTHING_ICONS[equippedClothesId]}
          </div>
        )}

        {/* 装饰 */}
        {equippedAccessoryId && CLOTHING_ICONS[equippedAccessoryId] && (
          <div className="absolute top-1/2 right-2 text-3xl z-10 drop-shadow-lg">
            {CLOTHING_ICONS[equippedAccessoryId]}
          </div>
        )}

        {/* 鞋子 */}
        {equippedShoesId && CLOTHING_ICONS[equippedShoesId] && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-2xl z-10 drop-shadow-lg">
            {CLOTHING_ICONS[equippedShoesId]}
          </div>
        )}

        {/* 角色名标签 */}
        <div className="absolute -bottom-2 px-3 py-0.5 bg-white/90 rounded-full text-xs font-black text-slate-700 shadow">
          {charName}
        </div>
      </div>
    </div>
  );
};

export default Character3D;
