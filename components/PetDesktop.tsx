import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PetDesktopProps {
  playerCode: string;
  socket: any;
}

interface PetData {
  pet_name: string;
  pet_type: string;
  is_egg?: boolean;
  level: number;
  mood?: number;
  hunger?: number;
}

const IP_PET_ICONS: Record<string, { icon: string; color: string }> = {
  hello_kitty: { icon: '🐱', color: '#FF69B4' },
  my_melody: { icon: '🐰', color: '#FFB6C1' },
  kuromi: { icon: '🐰', color: '#8B008B' },
  cinnamoroll: { icon: '🐶', color: '#87CEEB' },
  pompompurin: { icon: '🐶', color: '#FFD700' },
  kerokerokeroppi: { icon: '🐸', color: '#32CD32' },
  molly: { icon: '👧', color: '#FF6347' },
  dimoo: { icon: '👦', color: '#4169E1' },
  pucky: { icon: '🧚', color: '#DA70D6' },
  doraemon: { icon: '🐱', color: '#1E90FF' },
  nobita: { icon: '👦', color: '#FF8C00' },
  shizuka: { icon: '👧', color: '#FF69B4' },
  labubu: { icon: '👾', color: '#32CD32' },
  labubu_heart: { icon: '💜', color: '#FF1493' },
  mickey: { icon: '🐭', color: '#000000' },
  minnie: { icon: '🐭', color: '#FF1493' },
  donald: { icon: '🦆', color: '#1E90FF' },
  winnie: { icon: '🐻', color: '#D2691E' },
  fox_nick: { icon: '🦊', color: '#FF8C00' },
  bunny_judy: { icon: '🐰', color: '#9370DB' },
};

const PetDesktop: React.FC<PetDesktopProps> = ({ playerCode, socket }) => {
  const [pet, setPet] = useState<PetData | null>(null);
  const [pos, setPos] = useState({ x: 100, y: 80 });
  const [visible, setVisible] = useState(true);
  const [petInfo, setPetInfo] = useState<{ icon: string; color: string }>({ icon: '🐾', color: '#999' });
  const [showReaction, setShowReaction] = useState(false);
  const [reaction, setReaction] = useState('❤️');
  const [isInteracting, setIsInteracting] = useState(false);
  const posRef = useRef(pos);
  const dirRef = useRef(1);

  useEffect(() => {
    if (!socket || !playerCode) return;
    socket.emit('get_pet_status', playerCode);
    const handler = (data: PetData) => {
      setPet(data);
      if (!data.is_egg) {
        const info = IP_PET_ICONS[data.pet_type] || { icon: '🐾', color: '#999' };
        setPetInfo(info);
      }
    };
    socket.on('pet_status', handler);
    return () => { socket.off('pet_status', handler); };
  }, [socket, playerCode]);

  // 随机移动
  useEffect(() => {
    if (!pet || pet.is_egg) return;
    const move = () => {
      const current = posRef.current;
      const dx = (Math.random() - 0.5) * 250;
      const dy = (Math.random() - 0.5) * 120;
      const newX = Math.max(30, Math.min(window.innerWidth - 100, current.x + dx));
      const newY = Math.max(30, Math.min(window.innerHeight - 100, current.y + dy));
      dirRef.current = dx > 0 ? 1 : -1;
      setPos({ x: newX, y: newY });
      posRef.current = { x: newX, y: newY };
    };
    move();
    const timer = setInterval(move, 4000 + Math.random() * 5000);
    return () => clearInterval(timer);
  }, [pet]);

  // 点击互动
  const handleClick = useCallback(() => {
    if (isInteracting) return;
    setIsInteracting(true);

    const reactions = ['❤️', '✨', '💕', '🥰', '😊', '🎉', '⭐', '💖'];
    setReaction(reactions[Math.floor(Math.random() * reactions.length)]);
    setShowReaction(true);

    // 发送互动到服务器
    if (socket && playerCode) {
      socket.emit('pet_interact', { playerCode });
    }

    setTimeout(() => {
      setShowReaction(false);
      setIsInteracting(false);
    }, 1500);
  }, [isInteracting, socket, playerCode]);

  if (!pet || pet.is_egg) return null;

  return (
    <div
      className="fixed z-30 select-none"
      style={{
        left: pos.x,
        top: pos.y,
        transition: 'all 2000ms ease-in-out',
        opacity: visible ? 1 : 0,
      }}
    >
      {/* 互动反应 */}
      {showReaction && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap animate-in zoom-in fade-in duration-300 pointer-events-none"
          style={{ animation: 'float-up 1.5s ease-out forwards' }}
        >
          <span className="text-2xl">{reaction}</span>
        </div>
      )}

      {/* 宠物主体 */}
      <div
        className="relative cursor-pointer hover:scale-110 transition-transform duration-300 active:scale-95"
        onClick={handleClick}
        style={{ transform: `scaleX(${dirRef.current})` }}
      >
        {/* 背景光晕 */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse"
          style={{ backgroundColor: petInfo.color }}
        />

        {/* 彩色背景圈 */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50"
          style={{
            background: `linear-gradient(135deg, ${petInfo.color}22, ${petInfo.color}44)`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className="text-3xl drop-shadow-lg">{petInfo.icon}</span>
        </div>

        {/* 等级标签 */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white whitespace-nowrap shadow"
          style={{ backgroundColor: petInfo.color }}
        >
          Lv.{pet.level}
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -40px) scale(1.5); }
        }
      `}</style>
    </div>
  );
};

export default PetDesktop;
