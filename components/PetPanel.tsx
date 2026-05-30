import React, { useState, useEffect } from 'react';

interface PetProps {
  playerCode: string;
  socket: any;
  onClose?: () => void;
}

interface Pet {
  player_code: string;
  pet_name: string;
  pet_type: string;
  level: number;
  experience: number;
  hunger: number;
  mood: number;
  cleanliness: number;
  energy: number;
  is_egg?: boolean; // 是否是蛋状态
  hatch_time?: number; // 孵化时间戳
}

interface PetItem {
  id: number;
  player_code: string;
  item_id: string;
  item_type: string;
  quantity: number;
}

const PET_LEVEL_CONFIG: Record<number, { maxExp: number; title: string }> = {
  1: { maxExp: 100, title: '小宠物' },
  2: { maxExp: 200, title: '学徒宠物' },
  3: { maxExp: 400, title: '普通宠物' },
  4: { maxExp: 800, title: '进阶宠物' },
  5: { maxExp: 1600, title: '高级宠物' },
  6: { maxExp: 3200, title: '专家宠物' },
  7: { maxExp: 6400, title: '大师宠物' },
  8: { maxExp: 12800, title: '传奇宠物' },
  9: { maxExp: 25600, title: '史诗宠物' },
  10: { maxExp: 51200, title: '神话宠物' },
};

// IP 宠物盲盒池 - 常用 IP 角色
const IP_PET_POOL = [
  // Hello Kitty 系列
  { id: 'hello_kitty', name: 'Hello Kitty', type: 'CAT', icon: '🐱', ip: 'Hello Kitty' },
  { id: 'my_melody', name: '美乐蒂', type: 'BUNNY', icon: '🐰', ip: 'Hello Kitty' },
  { id: 'kuromi', name: '库洛米', type: 'BUNNY', icon: '🐰', ip: 'Hello Kitty' },
  // 玉桂狗系列
  { id: 'cinnamoroll', name: '玉桂狗', type: 'DOG', icon: '🐶', ip: 'Sanrio' },
  { id: 'pompompurin', name: '布丁狗', type: 'DOG', icon: '🐶', ip: 'Sanrio' },
  { id: 'kerokerokeroppi', name: '可罗克', type: 'FROG', icon: '🐸', ip: 'Sanrio' },
  // Popmart 系列
  { id: 'molly', name: 'Molly', type: 'HUMAN', icon: '👧', ip: 'Popmart' },
  { id: 'dimoo', name: 'Dimoo', type: 'HUMAN', icon: '👦', ip: 'Popmart' },
  { id: 'pucky', name: 'Pucky', type: 'HUMAN', icon: '🧚', ip: 'Popmart' },
  // 多啦A梦系列
  { id: 'doraemon', name: '哆啦A梦', type: 'CAT', icon: '🐱', ip: 'Doraemon' },
  { id: 'nobita', name: '大雄', type: 'HUMAN', icon: '👦', ip: 'Doraemon' },
  { id: 'shizuka', name: '静香', type: 'HUMAN', icon: '👧', ip: 'Doraemon' },
  // Labubu 系列
  { id: 'labubu', name: 'Labubu', type: 'MONSTER', icon: '👾', ip: 'Labubu' },
  { id: 'labubu_heart', name: '心型 Labubu', type: 'MONSTER', icon: '💜', ip: 'Labubu' },
  // 迪士尼系列
  { id: 'mickey', name: '米奇', type: 'MOUSE', icon: '🐭', ip: 'Disney' },
  { id: 'minnie', name: '米妮', type: 'MOUSE', icon: '🐭', ip: 'Disney' },
  { id: 'donald', name: '唐老鸭', type: 'DUCK', icon: '🦆', ip: 'Disney' },
  { id: 'winnie', name: '小熊维尼', type: 'BEAR', icon: '🐻', ip: 'Disney' },
  // 经典宠物
  { id: 'fox_nick', name: '尼克', type: 'FOX', icon: '🦊', ip: 'Disney' },
  { id: 'bunny_judy', name: '朱迪', type: 'BUNNY', icon: '🐰', ip: 'Disney' },
];

const PET_FOODS = [
  { id: 'carrot_basic', name: '普通胡萝卜', icon: '🥕', effect: { hunger: 20 }, cost: 5 },
  { id: 'carrot_gold', name: '金色胡萝卜', icon: '✨', effect: { hunger: 50, mood: 10 }, cost: 15 },
  { id: 'apple', name: '苹果', icon: '🍎', effect: { hunger: 15, energy: 5 }, cost: 8 },
  { id: 'fish', name: '小鱼干', icon: '🐟', effect: { hunger: 25, mood: 5 }, cost: 10 },
  { id: 'cake', name: '小蛋糕', icon: '🍰', effect: { hunger: 30, mood: 20 }, cost: 20 },
];

const PET_TOYS = [
  { id: 'ball', name: '小球', icon: '⚽', effect: { mood: 15, energy: -5 }, cost: 10 },
  { id: 'teddy', name: '泰迪熊', icon: '🧸', effect: { mood: 20 }, cost: 25 },
  { id: 'yoyo', name: '悠悠球', icon: '🪀', effect: { mood: 10, energy: -3 }, cost: 8 },
  { id: 'puzzle', name: '拼图', icon: '🧩', effect: { mood: 25, energy: -10 }, cost: 30 },
];

const PetPanel: React.FC<PetProps> = ({ playerCode, socket, onClose }) => {
  const [pet, setPet] = useState<Pet | null>(null);
  const [items, setItems] = useState<PetItem[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'feed' | 'play' | 'shop'>('status');
  const [cheeseBalance, setCheeseBalance] = useState(0);
  const [message, setMessage] = useState('');
  const [hatchCountdown, setHatchCountdown] = useState(0); // 孵化倒计时（秒）
  const [loading, setLoading] = useState(true); // 初始加载中

  // 获取宠物状态
  useEffect(() => {
    if (!socket || !playerCode) return;

    socket.emit('get_pet_status', playerCode);

    const handlePetStatus = (petData: Pet) => {
      setLoading(false);
      if (!petData || !petData.player_code) {
        setPet(null);
        return;
      }
      setPet(petData);
      // 如果宠物是蛋状态，启动孵化倒计时
      if (petData.is_egg && petData.hatch_time) {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, petData.hatch_time - now);
        setHatchCountdown(remaining);
      }
    };

    const handlePetUpdated = (petData: Pet) => {
      setLoading(false);
      if (!petData || !petData.player_code) {
        setPet(null);
        return;
      }
      setPet(petData);
      setMessage('宠物状态已更新！');
      setTimeout(() => setMessage(''), 2000);
      // 更新孵化倒计时
      if (petData.is_egg && petData.hatch_time) {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, petData.hatch_time - now);
        setHatchCountdown(remaining);
      }
    };

    const handlePetItems = (itemsData: PetItem[]) => {
      setItems(itemsData);
    };

    const handlePlayerProfile = (profile: any) => {
      setCheeseBalance(profile.cheese_balance || 0);
    };

    const handleHatchComplete = () => {
      setMessage('🎉 宠物孵化成功！');
      setHatchCountdown(0);
      // 重新获取宠物状态
      socket.emit('get_pet_status', playerCode);
      setTimeout(() => setMessage(''), 3000);
    };

    socket.on('pet_status', handlePetStatus);
    socket.on('pet_updated', handlePetUpdated);
    socket.on('pet_items', handlePetItems);
    socket.on('player_profile', handlePlayerProfile);
    socket.on('pet_hatch_complete', handleHatchComplete);

    const handlePetCreated = () => {
      // 重新获取宠物状态来刷新 UI
      socket.emit('get_pet_status', playerCode);
    };
    socket.on('pet_created', handlePetCreated);

    // 获取物品列表
    socket.emit('get_pet_items', playerCode);
    // 获取玩家档案（奶酪余额）
    socket.emit('get_player_profile', playerCode);

    return () => {
      socket.off('pet_status', handlePetStatus);
      socket.off('pet_updated', handlePetUpdated);
      socket.off('pet_items', handlePetItems);
      socket.off('player_profile', handlePlayerProfile);
      socket.off('pet_hatch_complete', handleHatchComplete);
      socket.off('pet_created', handlePetCreated);
    };
  }, [socket, playerCode]);

  // 孵化倒计时
  useEffect(() => {
    if (hatchCountdown <= 0) return;

    const timer = setInterval(() => {
      setHatchCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hatchCountdown]);

  // 状态条组件
  const StatBar = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) => (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-slate-600">{icon} {label}</span>
        <span className="text-xs font-bold text-slate-400">{value}/100</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  // 获取宠物类型对应的表情
  const getPetTypeIcon = (type: string) => {
    // 先尝试从 IP_PET_POOL 中查找
    const ipPet = IP_PET_POOL.find(p => p.type === type || p.id === type);
    if (ipPet) return ipPet.icon;

    // 默认映射
    switch (type) {
      case 'FOX': return '🦊';
      case 'BUNNY': return '🐰';
      case 'CAT': return '🐱';
      case 'DOG': return '🐶';
      case 'EGG': return '🥚';
      default: return '🎭';
    }
  };

  // 获取宠物 IP 信息
  const getPetIpInfo = (petType: string, petName: string) => {
    const ipPet = IP_PET_POOL.find(p => p.name === petName || p.id === petType);
    if (ipPet) {
      return { ip: ipPet.ip, icon: ipPet.icon };
    }
    return { ip: null, icon: null };
  };

  // 获取宠物等级称号
  const getPetTitle = (level: number) => {
    return PET_LEVEL_CONFIG[level]?.title || '小宠物';
  };

  // 喂食
  const handleFeed = (foodId: string) => {
    socket.emit('feed_pet', { playerCode, foodId });
  };

  // 玩耍
  const handlePlay = (toyId: string) => {
    socket.emit('play_with_pet', { playerCode, toyId });
  };

  // 清洁
  const handleClean = () => {
    socket.emit('clean_pet', { playerCode });
  };

  // 购买物品
  const handleBuyItem = (itemId: string, itemType: string, cost: number) => {
    if (cheeseBalance < cost) {
      alert('奶酪不足！');
      return;
    }
    socket.emit('buy_pet_item', { playerCode, itemId, itemType, cost });
  };

  // 加载中：不显示任何内容，等待服务器响应
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold">正在加载宠物信息...</p>
          </div>
        </div>
      </div>
    );
  }

  // 没有宠物：显示领养界面
  if (!pet) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🥚</div>
            <h3 className="text-2xl font-black text-slate-700 mb-4">孵化你的宠物蛋！</h3>
            <p className="text-slate-500 mb-6">每个玩家都可以领养一只专属电子宠物</p>
            <p className="text-xs text-slate-400 mb-6">
              需要 50 🧀 孵化宠物蛋，10 分钟后孵化！
              <br />
              随机获得一个 IP 角色宠物（Hello Kitty、哆啦A梦、Labubu、玉桂狗、Popmart、迪士尼等）。
            </p>
            <button
              onClick={() => {
                socket.emit('incubate_pet', { playerCode });
              }}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black rounded-2xl hover:shadow-lg transition-all"
            >
              🐣 孵化宠物蛋（50 🧀）
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果宠物是蛋状态，显示孵化进度
  if (pet.is_egg && pet.hatch_time) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, pet.hatch_time - now);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const totalTime = pet.hatch_time - (pet.hatch_time - 30); // 假设总时间 30 秒
    const progress = Math.max(0, Math.min(100, ((totalTime - remaining) / totalTime) * 100));

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
            >
              ✕
            </button>
            <div className="text-5xl mb-2">🥚</div>
            <h2 className="text-2xl font-black text-white">宠物蛋孵化中</h2>
            <p className="text-green-100 text-sm">惊喜即将揭晓！</p>
          </div>

          {/* 孵化进度 */}
          <div className="p-8 text-center">
            <div className="text-8xl mb-6 animate-pulse">🥚</div>

            <div className="mb-6">
              <div className="text-sm font-bold text-slate-600 mb-2">孵化进度</div>
              <div className="h-6 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-2">
                剩余时间：{minutes > 0 ? `${minutes}分` : ''}{seconds}秒
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700">
              <p className="font-bold mb-2">🎁 孵化完成后，你将随机获得：</p>
              <div className="grid grid-cols-4 gap-2 text-2xl">
                <span title="Hello Kitty 系列">🐱</span>
                <span title="玉桂狗系列">🐶</span>
                <span title="Popmart 系列">👧</span>
                <span title="迪士尼系列">🦊</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{getPetTypeIcon(pet.pet_type)}</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">{pet.pet_name}</h2>
                {(() => {
                  const { ip, icon } = getPetIpInfo(pet.pet_type, pet.pet_name);
                  return ip ? (
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold text-white">
                      {icon} {ip}
                    </span>
                  ) : null;
                })()}
              </div>
              <p className="text-green-100 text-sm">
                LV.{pet.level} · {getPetTitle(pet.level)}
              </p>
            </div>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className="bg-green-100 border-b border-green-200 px-8 py-2 text-center">
            <span className="text-green-700 font-bold">{message}</span>
          </div>
        )}

        {/* 标签切换 */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'status'
                ? 'bg-green-50 text-green-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📊 状态
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'feed'
                ? 'bg-green-50 text-green-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍽️ 喂食
          </button>
          <button
            onClick={() => setActiveTab('play')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'play'
                ? 'bg-green-50 text-green-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🎮 玩耍
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'shop'
                ? 'bg-green-50 text-green-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🛒 商店
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 状态标签页 */}
          {activeTab === 'status' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 3D 宠物展示 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">🐾 我的宠物</h3>
                <div className="w-full h-64 bg-gradient-to-b from-green-100 to-emerald-100 rounded-3xl overflow-hidden border-4 border-white shadow-inner flex items-center justify-center relative">
                  {/* 背景光晕 */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-green-200/30 via-transparent to-emerald-200/30" />
                  <div className="text-center relative">
                    {/* IP 角色大图标 */}
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-to-tr from-green-300/20 to-emerald-300/20 rounded-full blur-xl scale-150" />
                      <div className="text-8xl mb-2 drop-shadow-2xl animate-float">
                        {getPetTypeIcon(pet.pet_type)}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-700">{pet.pet_name}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      {(() => {
                        const { ip, icon } = getPetIpInfo(pet.pet_type, pet.pet_name);
                        return ip ? `${icon} ${ip}` : '';
                      })()}
                    </div>
                    {pet.mood > 80 ? (
                      <div className="text-xs text-green-600 font-bold mt-2 animate-pulse">
                        ✨ 心情很好！
                      </div>
                    ) : pet.mood > 50 ? (
                      <div className="text-xs text-slate-500 mt-2">😊 心情不错</div>
                    ) : (
                      <div className="text-xs text-orange-500 mt-2">😔 需要陪伴</div>
                    )}
                  </div>
                  <style>{`
                    @keyframes float {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-8px); }
                    }
                    .animate-float {
                      animation: float 3s ease-in-out infinite;
                    }
                  `}</style>
                </div>
                {/* 操作按钮 */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleClean}
                    className="flex-1 py-3 bg-blue-100 hover:bg-blue-200 text-blue-600 font-bold rounded-xl transition-colors"
                  >
                    🛁 洗澡
                  </button>
                  <button
                    onClick={() => setActiveTab('feed')}
                    className="flex-1 py-3 bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold rounded-xl transition-colors"
                  >
                    🍽️ 喂食
                  </button>
                  <button
                    onClick={() => setActiveTab('play')}
                    className="flex-1 py-3 bg-pink-100 hover:bg-pink-200 text-pink-600 font-bold rounded-xl transition-colors"
                  >
                    🎮 玩耍
                  </button>
                </div>
              </div>

              {/* 状态数值 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">📈 宠物状态</h3>
                <StatBar
                  label="饥饿值"
                  value={pet.hunger}
                  color={pet.hunger < 30 ? 'bg-red-500' : pet.hunger > 80 ? 'bg-green-500' : 'bg-orange-500'}
                  icon="🍽️"
                />
                <StatBar
                  label="心情值"
                  value={pet.mood}
                  color={pet.mood < 30 ? 'bg-red-500' : pet.mood > 80 ? 'bg-green-500' : 'bg-pink-500'}
                  icon="😊"
                />
                <StatBar
                  label="清洁度"
                  value={pet.cleanliness}
                  color={pet.cleanliness < 30 ? 'bg-red-500' : pet.cleanliness > 80 ? 'bg-green-500' : 'bg-blue-500'}
                  icon="🛁"
                />
                <StatBar
                  label="能量值"
                  value={pet.energy}
                  color={pet.energy < 30 ? 'bg-red-500' : pet.energy > 80 ? 'bg-green-500' : 'bg-yellow-500'}
                  icon="⚡"
                />

                {/* 经验值 */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-600">🎯 经验值</span>
                    <span className="text-xs font-bold text-slate-400">
                      {pet.experience}/{PET_LEVEL_CONFIG[pet.level]?.maxExp || 100}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${(pet.experience / (PET_LEVEL_CONFIG[pet.level]?.maxExp || 100)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 状态提示 */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                  {pet.hunger < 30 && <p className="text-sm text-orange-600 font-bold">⚠️ 宠物饿了，快喂它吃东西吧！</p>}
                  {pet.cleanliness < 30 && <p className="text-sm text-blue-600 font-bold">⚠️ 宠物太脏了，给它洗个澡吧！</p>}
                  {pet.energy < 30 && <p className="text-sm text-yellow-600 font-bold">⚠️ 宠物累了，需要休息</p>}
                  {pet.mood < 30 && <p className="text-sm text-pink-600 font-bold">⚠️ 宠物不开心，和它玩耍吧！</p>}
                  {pet.hunger >= 80 && pet.cleanliness >= 80 && pet.energy >= 80 && pet.mood >= 80 && (
                    <p className="text-sm text-green-600 font-bold">✨ 宠物状态极佳！</p>
                  )}
                </div>

                {/* 重置宠物 */}
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 font-bold mb-2">🎲 想换一只宠物？</p>
                  <button
                    onClick={() => {
                      if (confirm('花费 50 🧀 重置宠物蛋，重新孵化一只新宠物？')) {
                        socket.emit('reroll_pet', { playerCode });
                      }
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    🐣 领养新宠物（50 🧀）
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 喂食标签页 */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">🍽️ 喂食宠物</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {PET_FOODS.map((food) => {
                    const owned = items.find(i => i.item_id === food.id && i.item_type === 'FOOD');
                    return (
                      <div
                        key={food.id}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          owned && owned.quantity > 0
                            ? 'border-green-300 bg-green-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="text-4xl text-center mb-2">{food.icon}</div>
                        <div className="text-sm font-bold text-slate-700 text-center mb-1">{food.name}</div>
                        <div className="text-xs text-slate-400 text-center mb-2">
                          饥饿 +{food.effect.hunger}
                          {food.effect.mood && ` 心情 +${food.effect.mood}`}
                        </div>
                        {owned && owned.quantity > 0 ? (
                          <button
                            onClick={() => handleFeed(food.id)}
                            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors text-sm"
                          >
                            喂食 (拥有：{owned.quantity})
                          </button>
                        ) : (
                          <div className="text-xs text-slate-400 text-center">未拥有</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 玩耍标签页 */}
          {activeTab === 'play' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">🎮 和宠物玩耍</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {PET_TOYS.map((toy) => {
                    const owned = items.find(i => i.item_id === toy.id && i.item_type === 'TOY');
                    return (
                      <div
                        key={toy.id}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          owned && owned.quantity > 0
                            ? 'border-pink-300 bg-pink-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="text-4xl text-center mb-2">{toy.icon}</div>
                        <div className="text-sm font-bold text-slate-700 text-center mb-1">{toy.name}</div>
                        <div className="text-xs text-slate-400 text-center mb-2">
                          心情 +{toy.effect.mood}
                          {toy.effect.energy && ` 能量 ${toy.effect.energy > 0 ? '+' : ''}${toy.effect.energy}`}
                        </div>
                        {owned && owned.quantity > 0 ? (
                          <button
                            onClick={() => handlePlay(toy.id)}
                            className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors text-sm"
                          >
                            玩耍 (拥有：{owned.quantity})
                          </button>
                        ) : (
                          <div className="text-xs text-slate-400 text-center">未拥有</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 商店标签页 */}
          {activeTab === 'shop' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-700">🛒 宠物商店</h3>
                  <div className="px-4 py-2 bg-yellow-100 rounded-full flex items-center gap-2">
                    <span className="text-xl">🧀</span>
                    <span className="font-black text-yellow-600">{cheeseBalance}</span>
                  </div>
                </div>

                {/* 食物商店 */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-500 mb-3">🍽️ 食物</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {PET_FOODS.map((food) => (
                      <div
                        key={food.id}
                        className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 transition-all hover:shadow-md"
                      >
                        <div className="text-4xl text-center mb-2">{food.icon}</div>
                        <div className="text-sm font-bold text-slate-700 text-center mb-1">{food.name}</div>
                        <div className="text-xs text-slate-400 text-center mb-2">
                          饥饿 +{food.effect.hunger}
                          {food.effect.mood && ` 心情 +${food.effect.mood}`}
                        </div>
                        <button
                          onClick={() => handleBuyItem(food.id, 'FOOD', food.cost)}
                          className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <span>🧀</span> {food.cost}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 玩具商店 */}
                <div>
                  <h4 className="text-sm font-bold text-slate-500 mb-3">🎮 玩具</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {PET_TOYS.map((toy) => (
                      <div
                        key={toy.id}
                        className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 transition-all hover:shadow-md"
                      >
                        <div className="text-4xl text-center mb-2">{toy.icon}</div>
                        <div className="text-sm font-bold text-slate-700 text-center mb-1">{toy.name}</div>
                        <div className="text-xs text-slate-400 text-center mb-2">
                          心情 +{toy.effect.mood}
                          {toy.effect.energy && ` 能量 ${toy.effect.energy > 0 ? '+' : ''}${toy.effect.energy}`}
                        </div>
                        <button
                          onClick={() => handleBuyItem(toy.id, 'TOY', toy.cost)}
                          className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <span>🧀</span> {toy.cost}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetPanel;
