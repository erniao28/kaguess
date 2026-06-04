import React, { useState, useEffect, useRef, useMemo } from 'react';
import ChatBox from './ChatBox';
import GamePanel from './GamePanel';
import ChatRoomTheme from './ChatRoomTheme';
import { FURNITURE_CATALOG } from '../constants';

interface ChatRoomProps {
  playerProfile: any;
  chatMessages: any[];
  onSendMessage: (content: string, type: 'text' | 'emoji' | 'image') => void;
  mySocketId: string | null;
  myPlayerCode: string | null;
  isConnected: boolean;
  roomId: string;
  isPrivateRoom: boolean;
  roomTheme: string;
  onThemeChange: (theme: string) => void;
  themes: Array<{ id: string; name: string; bg: string; accent: string }>;
  onEnterGame: (game: 'forbidden' | 'draw-guess') => void;
  isOwner: boolean;
  isAdmin: boolean;
  decorationMode: boolean;
  onToggleDecoration: () => void;
  myCheeseCount: number;
  onOpenRoomManagement: () => void;
  onOpenPrivateRoom: () => void;
  onOpenFurnitureShop?: () => void;
  playerRole: 'FOX' | 'BUNNY' | null;
  gameActive?: boolean;
  gameMode?: 'forbidden' | 'draw-guess';
  sessionWord?: { char: string; punishments?: any };
  players?: any[];
  onBackToGame?: () => void;
  placedFurniture?: Array<{ id: string; itemId: string; x: number; y: number }>;
  onPlaceFurniture?: (itemId: string) => void;
  onRemoveFurniture?: (furnitureId: string) => void;
  ownedFurniture?: string[];
  notificationEnabled?: boolean;
  onToggleNotification?: () => void;
}

const SCENE_CHARS = [
  { emoji: '🏰', label: '城堡', x: '50%', y: '4%', scale: 2.0, anim: 'castleFloat' },
  { emoji: '🧚', label: '仙子', x: '8%', y: '32%', scale: 1.2, anim: 'fairyDance' },
  { emoji: '🦁', label: '辛巴', x: '87%', y: '56%', scale: 1.4, anim: 'prideRock' },
  { emoji: '👸', label: '公主', x: '73%', y: '15%', scale: 1.1, anim: 'royalFloat' },
  { emoji: '🗡️', label: '石中剑', x: '5%', y: '54%', scale: 1.0, anim: 'swordGlow' },
  { emoji: '🎠', label: '木马', x: '37%', y: '60%', scale: 1.4, anim: 'carousel' },
  { emoji: '🐉', label: '小龙', x: '92%', y: '36%', scale: 1.2, anim: 'dragonFly' },
  { emoji: '🌹', label: '玫瑰', x: '14%', y: '44%', scale: 1.1, anim: 'roseBloom' },
  { emoji: '💎', label: '宝石', x: '55%', y: '28%', scale: 0.9, anim: 'gemSparkle' },
  { emoji: '🦄', label: '独角兽', x: '26%', y: '48%', scale: 1.2, anim: 'unicornGlide' },
  { emoji: '🔮', label: '水晶球', x: '7%', y: '28%', scale: 1.0, anim: 'crystalGlow' },
  { emoji: '🐲', label: '木须龙', x: '66%', y: '19%', scale: 0.9, anim: 'mushuFly' },
];

const CHAR_DIALOGUES: Record<string, string[]> = {
  '🏰': ['欢迎来到魔法城堡！✨', '每个梦想都值得被实现 🌟', '奇迹总在不经意间出现~'],
  '🧚': ['洒下仙尘，魔法降临！✨', '相信自己，你拥有无限力量 💫', '快乐是最好的魔法！'],
  '🦁': ['Hakuna Matata! 🌴', '记住你是谁，辛巴 🌅', '勇敢面对每一天！'],
  '👸': ['勇敢追求你的梦想 👗', '真正的美在于内心 💖', '善良是最强大的力量'],
  '🗡️': ['唯有纯洁之心才能拔出此剑 ⚔️', '英雄就在你心中！'],
  '🎠': ['转圈圈~ 快乐无限！🎪', '音乐响起来！ 🎵'],
  '🐉': ['火焰与勇气！🔥', '真正的力量来自内心'],
  '🌹': ['每一片花瓣都是时间的倒计时 🕐', '珍惜当下，爱在每一刻 💕'],
  '💎': ['宝石闪耀，智慧永存 💎', '内在的光芒最耀眼'],
  '🦄': ['独角兽的角能实现愿望 🌈', '相信奇迹，奇迹就会发生'],
  '🔮': ['我看到了你的未来...充满无限可能 🔮', '命运掌握在自己手中'],
  '🐲': ['快点快点！木须龙来了！🐉', '小身材大能量！'],
};

const PARTICLE_GROUPS = [
  { emoji: '✨', count: 10, speed: 3, sizeRange: [10, 18] },
  { emoji: '🌸', count: 8, speed: 4.5, sizeRange: [10, 16] },
  { emoji: '🦋', count: 5, speed: 3.5, sizeRange: [10, 18] },
  { emoji: '🎵', count: 6, speed: 3, sizeRange: [8, 14] },
  { emoji: '💫', count: 4, speed: 5, sizeRange: [10, 20] },
];

const ChatRoom: React.FC<ChatRoomProps> = ({
  playerProfile,
  chatMessages,
  onSendMessage,
  mySocketId,
  myPlayerCode,
  isConnected,
  roomId,
  isPrivateRoom,
  roomTheme,
  onThemeChange,
  themes,
  onEnterGame,
  isOwner,
  isAdmin,
  decorationMode,
  onToggleDecoration,
  myCheeseCount,
  onOpenFurnitureShop,
  playerRole,
  gameActive,
  gameMode,
  sessionWord,
  players,
  onBackToGame,
  placedFurniture = [],
  onRemoveFurniture,
  ownedFurniture = [],
}) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeChar, setActiveChar] = useState<string | null>(null);
  const [charMsg, setCharMsg] = useState('');
  const [sparkleBursts, setSparkleBursts] = useState<Array<{id: number, x: number, y: number}>>([]);
  const [dayMode, setDayMode] = useState(false);
  const [discovered, setDiscovered] = useState(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sparkIdRef = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  const particles = useMemo(() => {
    const result: Array<{emoji: string, left: string, bottom: string, duration: string, delay: string, size: string, animation: string}> = [];
    let idx = 0;
    for (const group of PARTICLE_GROUPS) {
      for (let i = 0; i < group.count; i++) {
        const anims = ['floatMagic', 'floatSway', 'floatRise', 'floatOrbit'] as const;
        result.push({
          emoji: group.emoji,
          left: `${(idx * 7.3 + i * 3.1) % 100}%`,
          bottom: `${(i * 17 + idx * 11) % 75}%`,
          duration: `${group.speed + (i % 3) * 0.5}s`,
          delay: `${(idx * 0.4 + i * 0.25) % 5}s`,
          size: `${group.sizeRange[0] + (i % 3) * ((group.sizeRange[1] - group.sizeRange[0]) / 2)}px`,
          animation: anims[(idx + i) % anims.length],
        });
        idx++;
      }
    }
    return result;
  }, []);

  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    left: `${(i * 3.47 + 1) % 100}%`,
    top: `${(i * 5.31 + 2) % 60}%`,
    size: `${2 + (i % 4) * 1.5}px`,
    delay: `${(i * 0.25) % 4}s`,
    duration: `${1 + (i % 3) * 0.5}s`,
    color: i % 5 === 0 ? '#FFD700' : i % 3 === 0 ? '#FFB6C1' : '#ffffff',
  })), []);

  const handleCharClick = (emoji: string) => {
    setActiveChar(emoji);
    const msgs = CHAR_DIALOGUES[emoji] || ['...'];
    setCharMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => setActiveChar(null), 3000);
    setDiscovered(prev => Math.min(prev + 1, 20));
    sparkIdRef.current++;
    const id = sparkIdRef.current;
    setSparkleBursts(prev => [...prev, { id, x: Math.random() * 70 + 15, y: Math.random() * 50 + 10 }]);
    setTimeout(() => setSparkleBursts(prev => prev.filter(s => s.id !== id)), 1500);
  };

  useEffect(() => () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); }, []);

  const floorF = placedFurniture.filter(f => FURNITURE_CATALOG.find(c => c.id === f.itemId)?.type === 'floor');
  const wallF = placedFurniture.filter(f => FURNITURE_CATALOG.find(c => c.id === f.itemId)?.type === 'wall');
  const ceilF = placedFurniture.filter(f => FURNITURE_CATALOG.find(c => c.id === f.itemId)?.type === 'ceiling');

  return (
    <div ref={sceneRef} className="absolute inset-0 overflow-hidden" data-disney-world>
      {/* ===== 魔法小窝标题 ===== */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[45] pointer-events-none select-none">
        <div className="text-center">
          <div className="text-2xl font-black disney-rainbow tracking-wider" style={{
            textShadow: '0 0 20px rgba(255,215,0,.5), 0 2px 4px rgba(0,0,0,.2)',
            animation: 'floatGentle 4s ease-in-out infinite',
          }}>
            ✨ 魔法小窝 ✨
          </div>
          <div className="text-[10px] text-purple-300/60 mt-0.5 tracking-[0.3em] font-bold">
            MAGICAL NEST
          </div>
        </div>
      </div>

      <style>{`
        /* ===== 角色动画 ===== */
        @keyframes castleFloat {
          0%,100% { transform: translateY(0) scale(1); filter: drop-shadow(0 4px 15px rgba(255,215,0,.5)); }
          50% { transform: translateY(-12px) scale(1.05); filter: drop-shadow(0 12px 35px rgba(255,215,0,.8)); }
        }
        @keyframes fairyDance {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          25% { transform: translate(20px,-15px) rotate(10deg); }
          50% { transform: translate(0,-25px) rotate(0deg); }
          75% { transform: translate(-20px,-15px) rotate(-10deg); }
        }
        @keyframes prideRock {
          0%,100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(3deg); }
        }
        @keyframes royalFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes swordGlow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(255,255,255,.4)); }
          50% { filter: drop-shadow(0 0 30px rgba(255,255,255,1)) brightness(1.5); }
        }
        @keyframes carousel { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes dragonFly {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(-25px,-20px) scale(1.08); }
          66% { transform: translate(15px,-30px) scale(0.92); }
        }
        @keyframes roseBloom {
          0%,100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.2) rotate(5deg); filter: brightness(1.3) hue-rotate(15deg); }
        }
        @keyframes gemSparkle {
          0%,100% { transform: rotate(0deg) scale(1); opacity:.8; }
          50% { transform: rotate(180deg) scale(1.4); opacity:1; filter: brightness(1.5); }
        }
        @keyframes unicornGlide {
          0%,100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(15px) translateY(-12px); }
          50% { transform: translateX(30px) translateY(0); }
          75% { transform: translateX(15px) translateY(10px); }
        }
        @keyframes crystalGlow {
          0%,100% { filter: drop-shadow(0 0 12px rgba(138,43,226,.6)); }
          50% { filter: drop-shadow(0 0 35px rgba(138,43,226,1)) drop-shadow(0 0 55px rgba(255,105,180,.5)); }
        }
        @keyframes mushuFly {
          0%,100% { transform: translate(0,0) scaleX(1); }
          25% { transform: translate(20px,-15px) scaleX(1); }
          50% { transform: translate(35px,8px) scaleX(-1); }
          75% { transform: translate(15px,-8px) scaleX(-1); }
        }

        /* ===== 粒子动画 ===== */
        @keyframes floatMagic {
          0%,100% { transform: translateY(0) rotate(0deg); opacity:.6; }
          50% { transform: translateY(-25px) rotate(15deg); opacity:1; }
        }
        @keyframes floatSway {
          0%,100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(12px) rotate(8deg); }
          75% { transform: translateX(-12px) rotate(-8deg); }
        }
        @keyframes floatRise {
          0% { transform: translateY(0) scale(.8); opacity:0; }
          20% { opacity:1; } 80% { opacity:.6; }
          100% { transform: translateY(-80px) scale(1.3); opacity:0; }
        }
        @keyframes floatOrbit {
          0% { transform: rotate(0deg) translateX(18px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(18px) rotate(-360deg); }
        }
        @keyframes starTwinkle {
          0%,100% { opacity:.15; transform:scale(.5); }
          50% { opacity:1; transform:scale(1.8); }
        }
        @keyframes sparkleBurst {
          0% { transform:scale(0); opacity:1; }
          50% { transform:scale(2.5); opacity:.7; }
          100% { transform:scale(4); opacity:0; }
        }
        @keyframes fairyFade {
          0% { opacity:1; transform:scale(1) translateY(0); }
          100% { opacity:0; transform:scale(.3) translateY(-30px); }
        }
        @keyframes floatGentle {
          0%,100% { transform:translateY(0); }
          50% { transform:translateY(-5px); }
        }

        /* ===== UI 动画 ===== */
        @keyframes rainbowText {
          0% { background-position:0% 50%; } 50% { background-position:100% 50%; } 100% { background-position:0% 50%; }
        }
        @keyframes bounceIn {
          0% { transform:scale(0) translateY(20px); }
          50% { transform:scale(1.1) translateY(-5px); }
          70% { transform:scale(.95) translateY(2px); }
          100% { transform:scale(1) translateY(0); }
        }
        @keyframes magicWandSpin {
          0% { transform:rotate(0deg); }
          25% { transform:rotate(20deg) scale(1.2); }
          50% { transform:rotate(-15deg) scale(1.1); }
          75% { transform:rotate(8deg); }
          100% { transform:rotate(0deg); }
        }
        @keyframes fireFlicker {
          0%,100% { transform:scaleY(1) scaleX(1); opacity:.9; }
          25% { transform:scaleY(1.15) scaleX(.9); opacity:1; }
          50% { transform:scaleY(.9) scaleX(1.1); opacity:.85; }
          75% { transform:scaleY(1.1) scaleX(.95); opacity:.95; }
        }
        @keyframes moonGlow {
          0%,100% { filter:drop-shadow(0 0 20px rgba(255,255,200,.6)); }
          50% { filter:drop-shadow(0 0 40px rgba(255,255,200,1)); }
        }
        @keyframes furnitureAppear {
          0% { transform:scale(0) rotate(-10deg); opacity:0; }
          60% { transform:scale(1.1) rotate(2deg); }
          100% { transform:scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes carpetPulse { 0%,100% { opacity:.7; } 50% { opacity:.9; } }
        @keyframes windowLightIn { 0%,100% { opacity:.15; } 50% { opacity:.25; } }
        @keyframes tickerScroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes frameShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* ===== 通用类 ===== */
        .disney-rainbow {
          background: linear-gradient(90deg,#FFD700,#FF69B4,#8A2BE2,#4169E1,#00CED1,#FF6347,#FFD700);
          background-size:300% 100%; animation:rainbowText 8s linear infinite;
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .disney-btn {
          border: 2px solid rgba(255,215,0,.4); background:rgba(255,215,0,.08);
          transition: all .25s ease; cursor: pointer;
        }
        .disney-btn:hover {
          background:linear-gradient(135deg,rgba(255,215,0,.25),rgba(255,165,0,.2));
          border-color:rgba(255,215,0,.7);
          box-shadow:0 0 20px rgba(255,215,0,.3),0 4px 15px rgba(139,90,43,.2);
          transform:translateY(-1px);
        }
        .disney-btn:active {
          transform:translateY(0) scale(.97);
          box-shadow:inset 0 2px 5px rgba(0,0,0,.2);
        }
        .disney-btn.active {
          background:linear-gradient(135deg,rgba(255,215,0,.5),rgba(255,165,0,.4));
          border-color:rgba(255,215,0,.9);
          box-shadow:0 0 25px rgba(255,215,0,.4);
          color:#4a148c;
        }

        /* 故事书面板 - 聊天 */
        .storybook-chat {
          background: linear-gradient(170deg, #fdf6e3 0%, #faf0d8 40%, #f5e6c8 100%);
          border: 3px solid #8B6914;
          border-radius: 18px 18px 4px 18px;
          box-shadow:
            0 8px 30px rgba(101,67,33,.25),
            0 2px 8px rgba(101,67,33,.15),
            inset 0 0 40px rgba(139,105,20,.06);
          position: relative;
        }
        .storybook-chat::before {
          content: '';
          position: absolute; inset: 6px;
          border: 1px solid rgba(139,105,20,.2);
          border-radius: 14px 14px 2px 14px;
          pointer-events: none;
        }
        /* 故事书面板 - 右侧 */
        .storybook-panel {
          background: linear-gradient(180deg, #fdf6e3 0%, #f5e6c8 50%, #ecdcb0 100%);
          border: 3px solid #8B6914;
          border-radius: 18px;
          box-shadow:
            0 6px 25px rgba(101,67,33,.2),
            0 2px 6px rgba(101,67,33,.12),
            inset 0 0 30px rgba(139,105,20,.05);
          position: relative;
        }
        .storybook-panel::before {
          content: '';
          position: absolute; inset: 5px;
          border: 1px solid rgba(139,105,20,.18);
          border-radius: 14px;
          pointer-events: none;
        }

        /* 覆盖 ChatBox 的 indigo header */
      `}</style>

      {showThemePicker && (
        <div className="relative z-[50] flex-shrink-0" style={{
          background: 'rgba(15,5,30,.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(138,43,226,.3)',
        }}>
          <ChatRoomTheme themes={themes} currentTheme={roomTheme}
            onSelect={(t) => { onThemeChange(t); setShowThemePicker(false); }}
            onClose={() => setShowThemePicker(false)} />
        </div>
      )}

      {/* ===== 主内容区：全屏场景 ===== */}
      <div className="absolute inset-0">
        {/* 场景层：天空/墙壁/地板/角色/粒子/家具 */}
        <div className="absolute inset-0 z-[10]">
          {/* 天穹 */}
          <div className="absolute" style={{
            top: 0, left: 0, right: 0, height: '65%',
            background: dayMode
              ? 'linear-gradient(180deg, #87CEEB 0%, #B0E0E6 25%, #E0F0FF 50%, #FFF8DC 80%, #F5DEB3 100%)'
              : 'linear-gradient(180deg, #050010 0%, #0a0025 20%, #1a0540 45%, #2d1b69 70%, #1a0533 100%)',
            transition: 'background 2s ease',
          }} />

          {!dayMode && stars.map((s, i) => (
            <div key={`s${i}`} className="absolute rounded-full" style={{
              left: s.left, top: s.top, width: s.size, height: s.size,
              backgroundColor: s.color,
              animation: `starTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
              boxShadow: `0 0 ${parseInt(s.size) * 2}px ${s.color}`,
            }} />
          ))}

          {/* 月亮/太阳 */}
          <div className="absolute cursor-pointer" style={{
            right: '18%', top: '3%', fontSize: '40px',
            animation: dayMode ? 'floatGentle 4s ease-in-out infinite' : 'moonGlow 4s ease-in-out infinite',
            zIndex: 12, transition: 'all 1s ease', userSelect: 'none',
          }} onClick={() => setDayMode(!dayMode)}>
            {dayMode ? '☀️' : '🌙'}
          </div>

          {particles.map((p, i) => (
            <div key={`p${i}`} className="absolute pointer-events-none" style={{
              left: p.left, bottom: p.bottom, fontSize: p.size,
              animation: `${p.animation} ${p.duration} ease-in-out ${p.delay} infinite`,
            }}>{p.emoji}</div>
          ))}

          {SCENE_CHARS.map((c, i) => (
            <div key={`dc${i}`}
              className="absolute cursor-pointer transition-transform duration-300 hover:scale-130 select-none"
              style={{
                left: c.x, top: c.y, fontSize: `${c.scale * 20}px`,
                animation: `${c.anim} ${4 + (i % 3) * 1.5}s ease-in-out infinite`,
                zIndex: 15, filter: 'drop-shadow(0 2px 10px rgba(255,215,0,.4))',
              }}
              onClick={() => handleCharClick(c.emoji)}
              title={c.label}
            >{c.emoji}</div>
          ))}

          {sparkleBursts.map(s => (
            <div key={s.id} className="absolute pointer-events-none z-[25]" style={{
              left: `${s.x}%`, top: `${s.y}%`, width: '40px', height: '40px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,215,0,.9), rgba(255,105,180,.5), transparent)',
              animation: 'sparkleBurst 1s ease-out forwards',
            }} />
          ))}

          {activeChar && charMsg && (
            <div className="absolute left-1/2 -translate-x-1/2 z-[30] pointer-events-none" style={{
              top: '12%', animation: 'bounceIn .5s ease-out',
            }}>
              <div className="bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-xl border-2 border-yellow-400 max-w-[220px]">
                <div className="text-center">
                  <span className="text-2xl mr-2">{activeChar}</span>
                  <span className="text-sm font-bold text-purple-700">{charMsg}</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== 房间骨架 ===== */}
          {/* 天花板 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '7%',
            background: 'linear-gradient(180deg, #1a0a2e, #2a1545)',
            borderRadius: '0 0 35% 35% / 0 0 18% 18%',
            borderBottom: '2px solid rgba(255,215,0,.15)',
            zIndex: 13,
          }}>
            <div className="absolute left-1/2 -translate-x-1/2" style={{
              top: '100%', fontSize: '20px', textAlign: 'center',
              animation: 'floatGentle 3s ease-in-out infinite',
            }}>💡</div>
          </div>

          {/* 墙 */}
          <div style={{
            position: 'absolute', top: '7%', left: 0, right: 0, bottom: '32%',
            background: `
              repeating-linear-gradient(90deg,
                rgba(100,50,150,.12) 0px, rgba(100,50,150,.12) 20px,
                rgba(80,40,130,.1) 20px, rgba(80,40,130,.1) 40px
              ),
              linear-gradient(180deg, #1a0533 0%, #2d1b69 50%, #1a0533 100%)
            `,
            zIndex: 13,
          }} />

          {/* ===== 固定装饰 ===== */}
          {/* 拱窗 */}
          <div style={{
            position: 'absolute', left: '5%', top: '18%', width: '80px', height: '110px', zIndex: 14,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: dayMode
                ? 'linear-gradient(180deg, #87CEEB, #B0E0E6 50%, #90EE90)'
                : 'linear-gradient(180deg, #0a0025, #1a0540 50%, #2d1b69)',
              borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
              border: '5px solid #4a2810',
              boxShadow: dayMode
                ? 'inset 0 0 25px rgba(255,255,255,.15)'
                : 'inset 0 0 25px rgba(100,100,200,.2), 0 0 20px rgba(100,100,200,.15)',
              animation: 'windowLightIn 4s ease-in-out infinite',
            }}>
              <div style={{ position: 'absolute', left: '50%', top: '30%', bottom: 0, width: '3px', backgroundColor: '#4a2810', transform: 'translateX(-50%)' }} />
              <div style={{ position: 'absolute', top: '55%', left: 0, right: 0, height: '3px', backgroundColor: '#4a2810' }} />
              {!dayMode && (
                <div style={{
                  position: 'absolute', width: '12px', height: '12px',
                  backgroundColor: '#FFF8DC', borderRadius: '50%',
                  top: '12%', right: '18%',
                  boxShadow: '0 0 15px rgba(255,255,200,.9)',
                  animation: 'moonGlow 3s ease-in-out infinite',
                }} />
              )}
            </div>
          </div>

          {/* 壁炉 */}
          <div style={{
            position: 'absolute', right: '7%', top: '32%', width: '70px', height: '90px', zIndex: 14,
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '20%', width: '60%', height: '28%',
              background: 'linear-gradient(180deg, #3e2723, #5d4037)',
              borderTop: '2px solid #4a2810',
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '72%',
              background: '#2d1b00', borderRadius: '6px 6px 0 0',
              border: '2px solid #4a2810', borderTop: 'none',
            }}>
              <div style={{
                position: 'absolute', bottom: '5%', left: '15%', width: '70%', height: '60%',
                fontSize: '24px', textAlign: 'center',
                animation: 'fireFlicker .8s ease-in-out infinite',
                filter: 'drop-shadow(0 0 15px rgba(255,100,0,.8))',
              }}>🔥</div>
            </div>
            <div style={{
              position: 'absolute', bottom: '70%', left: '-8%', right: '-8%', height: '6px',
              background: 'linear-gradient(90deg, #5d4037, #6d4c41, #5d4037)',
              borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,.4)',
            }} />
          </div>

          {/* 地毯 */}
          <div style={{
            position: 'absolute', left: '22%', bottom: '4%', width: '56%', height: '22%',
            background: 'radial-gradient(ellipse, rgba(139,0,0,.4) 0%, rgba(139,69,19,.3) 40%, rgba(255,215,0,.12) 70%, transparent 100%)',
            borderRadius: '50%', border: '2px solid rgba(255,215,0,.2)',
            animation: 'carpetPulse 4s ease-in-out infinite', zIndex: 13,
          }}>
            <div style={{ position: 'absolute', inset: '15%', borderRadius: '50%', border: '1px solid rgba(255,215,0,.12)' }} />
            <div style={{ position: 'absolute', inset: '25%', borderRadius: '50%', border: '1px solid rgba(255,215,0,.08)' }} />
          </div>

          {/* ===== 玩家家具 ===== */}
          {wallF.map(f => {
            const item = FURNITURE_CATALOG.find(c => c.id === f.itemId);
            if (!item) return null;
            return (
              <div key={f.id}
                className={`absolute cursor-pointer transition-transform duration-200 ${decorationMode ? 'hover:scale-125' : ''}`}
                style={{
                  left: `${8 + f.x * 0.7}%`, top: `${12 + f.y * 0.35}%`,
                  fontSize: `${22 + Math.min(item.cost / 3, 12)}px`,
                  zIndex: 16,
                  animation: `furnitureAppear .5s ease-out, floatGentle ${3 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.4))',
                }}
                onClick={() => { if (decorationMode && onRemoveFurniture) { if (confirm(`移除「${item.name}」？`)) onRemoveFurniture(f.id); } }}
                title={`${item.name}${decorationMode ? ' (点击移除)' : ''}`}
              >{item.icon}</div>
            );
          })}
          {ceilF.map(f => {
            const item = FURNITURE_CATALOG.find(c => c.id === f.itemId);
            if (!item) return null;
            return (
              <div key={f.id}
                className="absolute cursor-pointer hover:scale-110 transition-transform duration-200"
                style={{
                  left: `${8 + f.x * 0.7}%`, top: `${4 + f.y * 0.12}%`,
                  fontSize: `${22 + Math.min(item.cost / 3, 12)}px`,
                  zIndex: 16,
                  animation: `furnitureAppear .5s ease-out, floatGentle ${2.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                  filter: 'drop-shadow(0 2px 8px rgba(255,215,0,.3))',
                }}
                onClick={() => { if (decorationMode && onRemoveFurniture) onRemoveFurniture(f.id); }}
                title={`${item.name}${decorationMode ? ' (点击移除)' : ''}`}
              >{item.icon}</div>
            );
          })}
          {floorF.map(f => {
            const item = FURNITURE_CATALOG.find(c => c.id === f.itemId);
            if (!item) return null;
            return (
              <div key={f.id}
                className={`absolute cursor-pointer transition-transform duration-200 ${decorationMode ? 'hover:scale-125' : ''}`}
                style={{
                  left: `${4 + f.x * 0.8}%`, bottom: `${f.y * 0.5}%`,
                  fontSize: `${26 + Math.min(item.cost / 3, 14)}px`,
                  zIndex: Math.max(16, Math.floor(f.y)),
                  animation: `furnitureAppear .5s ease-out, floatGentle ${3 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.5))',
                }}
                onClick={() => { if (decorationMode && onRemoveFurniture) onRemoveFurniture(f.id); }}
                title={`${item.name}${decorationMode ? ' (点击移除)' : ''}`}
              >{item.icon}</div>
            );
          })}

          {/* 地板 */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%',
            background: `
              repeating-linear-gradient(0deg,
                rgba(62,39,35,.3) 0px, rgba(62,39,35,.3) 1px,
                transparent 1px, transparent 22px
              ),
              linear-gradient(180deg, #5d4037 0%, #4e342e 30%, #3e2723 100%)
            `,
            borderTop: '3px solid #4a2810',
            zIndex: 13,
          }} />
        </div>

        {/* 游戏中心 - 右侧嵌入场景 */}
        <div className="absolute right-4 top-20 z-[30]" style={{ width: '240px' }}>
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-5 border-2 border-white/50">
            <GamePanel
              onEnterGame={onEnterGame}
              decorationMode={decorationMode}
              myCheeseCount={myCheeseCount}
              playerRole={playerRole}
              hasRoom={!!roomId}
              onOpenFurnitureShop={onOpenFurnitureShop}
              gameActive={gameActive}
              gameMode={gameMode}
              onBackToGame={onBackToGame}
            />
          </div>
        </div>

        {/* 聊天窗口 - 场景中间底部悬浮 */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-[30]" style={{ width: '42%', minWidth: '450px', maxWidth: '600px' }}>
          <div className="storybook-chat flex flex-col overflow-hidden shadow-2xl">
            <div style={{ height: '520px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <ChatBox
                messages={chatMessages}
                onSendMessage={onSendMessage}
                isConnected={isConnected}
                mySocketId={mySocketId}
                myPlayerCode={myPlayerCode}
                chatFontSize={14}
                chatFontColor="#3e2723"
                notificationEnabled={notificationEnabled ?? false}
                onToggleNotification={onToggleNotification}
                canInteract={true}
                warmTheme={true}
              />
            </div>
          </div>
        </div>

        {/* 状态栏 - 右侧悬浮 */}
        <div className="absolute right-4 bottom-24 z-[30] flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl border-2 border-white/50">
            <div className="flex items-center gap-3" style={{ fontSize: '12px' }}>
              <span className="flex items-center gap-1" style={{ color: '#8B6914' }}>
                🧀 <span className="font-black">{myCheeseCount}</span>
              </span>
              <span className="flex items-center gap-1" style={{ color: '#6B4423' }}>
                ✨ <span className="font-bold">{discovered}/20</span>
              </span>
            </div>
          </div>
          <button onClick={() => setDayMode(!dayMode)}
            className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl border-2 border-white/50 hover:scale-105 transition-all"
            style={{ fontSize: '20px' }}>
            {dayMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
