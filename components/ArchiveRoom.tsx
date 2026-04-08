import React, { useState } from 'react';

interface PlayerProfile {
  playerCode: string;
  nickname: string;
  carrotCount: number;
  totalGames: number;
  winGames: number;
  vipLevel: number;
  heightCm?: number;
  weightKg?: number;
  birthday?: string;
  avatarUrl?: string;
  fullbodyImageUrl?: string;
  bio?: string;
  hobbies: string[];
  displayedEffectId?: string;
  displayedGunId?: string;
  equippedClothesId?: string;
  equippedHeadwearId?: string;
  equippedAccessoryId?: string;
  equippedShoesId?: string;
}

interface ArchiveRoomProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile: PlayerProfile | null;
  socket: any;
  onUpdateProfile: (updates: Partial<PlayerProfile>) => void;
  onChangeNickname?: (newNickname: string) => void;
  playerRole?: 'FOX' | 'BUNNY';
}

const HOBBY_OPTIONS = [
  { icon: '🎮', label: '游戏' },
  { icon: '🎵', label: '音乐' },
  { icon: '📖', label: '阅读' },
  { icon: '🎬', label: '电影' },
  { icon: '🍳', label: '烹饪' },
  { icon: '🎨', label: '绘画' },
  { icon: '📷', label: '摄影' },
  { icon: '✈️', label: '旅行' },
  { icon: '🏃', label: '运动' },
  { icon: '🎤', label: 'K 歌' },
];

const CLOTHING_ITEMS = [
  // 衣服类
  { id: 'shirt_casual', name: '休闲 T 恤', icon: '👕', type: 'clothes' },
  { id: 'shirt_formal', name: '正装衬衫', icon: '👔', type: 'clothes' },
  { id: 'jacket', name: '外套夹克', icon: '🧥', type: 'clothes' },
  { id: 'hoodie', name: '连帽卫衣', icon: '👚', type: 'clothes' },
  { id: 'vest', name: '背心马甲', icon: '🦺', type: 'clothes' },
  { id: 'dress', name: '优雅礼服', icon: '👘', type: 'clothes' },

  // 头饰类
  { id: 'hat_cap', name: '棒球帽', icon: '🧢', type: 'headwear' },
  { id: 'hat_crown', name: '皇冠', icon: '👑', type: 'headwear' },
  { id: 'hat_top', name: '高顶礼帽', icon: '🎩', type: 'headwear' },
  { id: 'hat_cowboy', name: '牛仔帽', icon: '🤠', type: 'headwear' },
  { id: 'hat_beret', name: '贝雷帽', icon: '🎨', type: 'headwear' },
  { id: 'hair_band', name: '发带', icon: '🎀', type: 'headwear' },
  { id: 'halo', name: '天使光环', icon: '😇', type: 'headwear' },

  // 装饰类
  { id: 'glasses', name: '眼镜', icon: '👓', type: 'accessory' },
  { id: 'sunglasses', name: '墨镜', icon: '🕶️', type: 'accessory' },
  { id: 'backpack', name: '背包', icon: '🎒', type: 'accessory' },
  { id: 'handbag', name: '手提包', icon: '👜', type: 'accessory' },
  { id: 'purse', name: '钱包', icon: '👛', type: 'accessory' },
  { id: 'scarf', name: '围巾', icon: '🧣', type: 'accessory' },
  { id: 'tie', name: '领带', icon: '👔', type: 'accessory' },
  { id: 'necklace', name: '项链', icon: '💎', type: 'accessory' },
  { id: 'watch', name: '手表', icon: '⌚', type: 'accessory' },

  // 鞋子类
  { id: 'shoes_sneakers', name: '运动鞋', icon: '👟', type: 'shoes' },
  { id: 'shoes_boots', name: '靴子', icon: '🥾', type: 'shoes' },
  { id: 'shoes_formal', name: '皮鞋', icon: '👞', type: 'shoes' },
  { id: 'shoes_heels', name: '高跟鞋', icon: '👠', type: 'shoes' },
  { id: 'shoes_sandals', name: '凉鞋', icon: '👡', type: 'shoes' },
];

const ArchiveRoom: React.FC<ArchiveRoomProps> = ({
  isOpen,
  onClose,
  playerProfile,
  socket,
  onUpdateProfile,
  onChangeNickname,
  playerRole = 'FOX'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'stats'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PlayerProfile>>({});
  const [isChangingNickname, setIsChangingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  if (!isOpen || !playerProfile) return null;

  const handleToggleHobby = (hobby: string) => {
    const newHobbies = editData.hobbies || playerProfile.hobbies;
    if (newHobbies.includes(hobby)) {
      setEditData({ ...editData, hobbies: newHobbies.filter(h => h !== hobby) });
    } else {
      setEditData({ ...editData, hobbies: [...newHobbies, hobby] });
    }
  };

  const handleSaveProfile = () => {
    if (socket && playerProfile.playerCode) {
      socket.emit('update_player_profile', {
        playerCode: playerProfile.playerCode,
        updates: editData
      });
      onUpdateProfile(editData);
      setIsEditing(false);
      setEditData({});
    }
  };

  const handleEquipItem = (itemId: string, itemType: string) => {
    const equipKey = `equipped${itemType.charAt(0).toUpperCase() + itemType.slice(1)}Id` as keyof PlayerProfile;
    const updates: Partial<PlayerProfile> = { [equipKey]: itemId };

    if (socket && playerProfile.playerCode) {
      socket.emit('update_player_profile', {
        playerCode: playerProfile.playerCode,
        updates
      });
      onUpdateProfile(updates);
    }
  };

  const handleChangeNickname = () => {
    if (!newNickname.trim()) {
      alert('昵称不能为空');
      return;
    }
    if (newNickname.length > 20) {
      alert('昵称长度不能超过 20 个字符');
      return;
    }
    if (onChangeNickname) {
      onChangeNickname(newNickname);
      setIsChangingNickname(false);
      setNewNickname('');
    }
  };

  const winRate = playerProfile.totalGames > 0
    ? ((playerProfile.winGames / playerProfile.totalGames) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 头像 */}
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl overflow-hidden">
                {playerProfile.avatarUrl ? (
                  <img src={playerProfile.avatarUrl} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  '👤'
                )}
              </div>
              <div className="flex items-center gap-3">
                {isChangingNickname ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleChangeNickname()}
                      placeholder="输入新昵称"
                      maxLength={20}
                      className="px-3 py-1 rounded-lg bg-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                      autoFocus
                    />
                    <button
                      onClick={handleChangeNickname}
                      className="px-3 py-1 bg-white/30 hover:bg-white/50 rounded-lg text-white font-bold text-sm transition-all"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setIsChangingNickname(false);
                        setNewNickname('');
                      }}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold text-sm transition-all"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-white">{playerProfile.nickname}</h2>
                    <p className="text-indigo-100 text-sm">档案码：{playerProfile.playerCode}</p>
                  </>
                )}
                {!isChangingNickname && (
                  <button
                    onClick={() => setIsChangingNickname(true)}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold text-sm transition-all"
                    title="修改昵称"
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
            {/* 排行榜按钮 */}
            <button
              onClick={() => {
                if (socket) {
                  socket.emit('get_leaderboard');
                }
              }}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white font-bold transition-all flex items-center gap-2"
              title="查看排行榜"
            >
              🏆 排行榜
            </button>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'profile'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📋 个人资料
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'appearance'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            👔 装扮展示
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'stats'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📊 战绩统计
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 个人资料 */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* 全身像预览 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-700">📸 个人形象</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-xl font-bold text-indigo-600 transition-colors"
                  >
                    {isEditing ? '💾 保存' : '✏️ 编辑'}
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  {/* 全身像 */}
                  <div className="w-48 h-64 bg-gradient-to-b from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center text-8xl overflow-hidden relative">
                    {playerProfile.fullbodyImageUrl ? (
                      <img src={playerProfile.fullbodyImageUrl} alt="全身像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-7xl mb-2">
                          {playerRole === 'FOX' ? '🦊' : playerRole === 'BUNNY' ? '🐰' : '🎭'}
                        </div>
                        <div className="text-xs text-slate-400 font-bold">
                          {playerRole === 'FOX' ? '尼克' : playerRole === 'BUNNY' ? '朱迪' : '未设置角色'}
                        </div>
                      </div>
                    )}
                    {/* 穿戴装备叠加显示 */}
                    {playerProfile.equippedHeadwearId && (
                      <div className="absolute top-3 right-1/4 text-4xl filter drop-shadow-lg">
                        {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedHeadwearId)?.icon}
                      </div>
                    )}
                    {playerProfile.equippedClothesId && (
                      <div className="absolute bottom-8 left-1/4 text-4xl filter drop-shadow-lg">
                        {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedClothesId)?.icon}
                      </div>
                    )}
                  </div>

                  {/* 身体数据 */}
                  <div className="flex-1 space-y-4">
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              身高 (cm)
                            </label>
                            <input
                              type="number"
                              value={editData.heightCm ?? playerProfile.heightCm ?? ''}
                              onChange={(e) => setEditData({ ...editData, heightCm: parseInt(e.target.value) })}
                              placeholder="170"
                              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              体重 (kg)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={editData.weightKg ?? playerProfile.weightKg ?? ''}
                              onChange={(e) => setEditData({ ...editData, weightKg: parseFloat(e.target.value) })}
                              placeholder="65.0"
                              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            生日
                          </label>
                          <input
                            type="date"
                            value={editData.birthday ?? playerProfile.birthday ?? ''}
                            onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            个人签名
                          </label>
                          <textarea
                            value={editData.bio ?? playerProfile.bio ?? ''}
                            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                            placeholder="介绍一下自己吧~"
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 rounded-xl p-4">
                            <div className="text-sm text-slate-400 font-bold">身高</div>
                            <div className="text-2xl font-black text-slate-700">
                              {playerProfile.heightCm ? `${playerProfile.heightCm} cm` : '-'}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4">
                            <div className="text-sm text-slate-400 font-bold">体重</div>
                            <div className="text-2xl font-black text-slate-700">
                              {playerProfile.weightKg ? `${playerProfile.weightKg} kg` : '-'}
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="text-sm text-slate-400 font-bold">生日</div>
                          <div className="text-xl font-black text-slate-700">
                            {playerProfile.birthday || '-'}
                          </div>
                        </div>
                        {playerProfile.bio && (
                          <div className="bg-slate-50 rounded-xl p-4">
                            <div className="text-sm text-slate-400 font-bold mb-1">个人签名</div>
                            <div className="text-slate-700">{playerProfile.bio}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 爱好标签 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">❤️ 我的爱好</h3>
                <div className="flex flex-wrap gap-3">
                  {HOBBY_OPTIONS.map((hobby) => {
                    const isSelected = (editData.hobbies ?? playerProfile.hobbies).includes(hobby.icon);
                    return (
                      <button
                        key={hobby.icon}
                        onClick={() => isEditing && handleToggleHobby(hobby.icon)}
                        disabled={!isEditing}
                        className={`px-4 py-2 rounded-full font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {hobby.icon} {hobby.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 装扮展示 */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* 角色形象预览 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 shadow-lg border-4 border-indigo-200">
                <h3 className="text-lg font-black text-slate-700 mb-4">🎭 角色形象</h3>
                <div className="flex items-center gap-6">
                  {/* 全身像预览 */}
                  <div className="w-40 h-56 bg-gradient-to-b from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center text-7xl overflow-hidden relative">
                    {playerProfile.fullbodyImageUrl ? (
                      <img src={playerProfile.fullbodyImageUrl} alt="全身像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-5xl mb-2">
                          {playerRole === 'FOX' ? '🦊' : '🐰'}
                        </div>
                        <div className="text-xs text-slate-400 font-bold">
                          {playerRole === 'FOX' ? '尼克' : '朱迪'}
                        </div>
                      </div>
                    )}
                    {/* 穿戴装备叠加显示 */}
                    {playerProfile.equippedHeadwearId && (
                      <div className="absolute top-2 right-2 text-2xl">
                        {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedHeadwearId)?.icon}
                      </div>
                    )}
                    {playerProfile.equippedClothesId && (
                      <div className="absolute bottom-2 left-2 text-2xl">
                        {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedClothesId)?.icon}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-4xl">{playerRole === 'FOX' ? '🦊' : '🐰'}</div>
                      <div>
                        <div className="font-black text-slate-700">{playerProfile.nickname}</div>
                        <div className="text-sm text-slate-500">档案码：{playerProfile.playerCode}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 text-center">
                        <div className="text-xs text-slate-400 font-bold mb-1">👕 衣服</div>
                        <div className="text-2xl">
                          {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedClothesId)?.icon || '—'}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center">
                        <div className="text-xs text-slate-400 font-bold mb-1">🎩 头饰</div>
                        <div className="text-2xl">
                          {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedHeadwearId)?.icon || '—'}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center">
                        <div className="text-xs text-slate-400 font-bold mb-1">🎒 装饰</div>
                        <div className="text-2xl">
                          {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedAccessoryId)?.icon || '—'}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center">
                        <div className="text-xs text-slate-400 font-bold mb-1">👟 鞋子</div>
                        <div className="text-2xl">
                          {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedShoesId)?.icon || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 当前装备 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">👔 当前装备</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">👕 衣服</div>
                    <div className="text-4xl mb-2">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedClothesId)?.icon || '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedClothesId)?.name || '未装备'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">🎩 头饰</div>
                    <div className="text-4xl mb-2">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedHeadwearId)?.icon || '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedHeadwearId)?.name || '未装备'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">🎒 装饰</div>
                    <div className="text-4xl mb-2">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedAccessoryId)?.icon || '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedAccessoryId)?.name || '未装备'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">👟 鞋子</div>
                    <div className="text-4xl mb-2">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedShoesId)?.icon || '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {CLOTHING_ITEMS.find(i => i.id === playerProfile.equippedShoesId)?.name || '未装备'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 可选装扮列表 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">🎮 可选装扮</h3>

                {/* 衣服类 */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-500 mb-3">👕 上装</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {CLOTHING_ITEMS.filter(i => i.type === 'clothes').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleEquipItem(item.id, item.type)}
                        className={`p-3 rounded-xl transition-all text-center ${
                          playerProfile.equippedClothesId === item.id
                            ? 'bg-indigo-100 border-2 border-indigo-500'
                            : 'bg-slate-50 hover:bg-indigo-50'
                        }`}
                      >
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 头饰类 */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-500 mb-3">🎩 头饰</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {CLOTHING_ITEMS.filter(i => i.type === 'headwear').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleEquipItem(item.id, item.type)}
                        className={`p-3 rounded-xl transition-all text-center ${
                          playerProfile.equippedHeadwearId === item.id
                            ? 'bg-indigo-100 border-2 border-indigo-500'
                            : 'bg-slate-50 hover:bg-indigo-50'
                        }`}
                      >
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 装饰类 */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-500 mb-3">🎒 装饰品</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {CLOTHING_ITEMS.filter(i => i.type === 'accessory').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleEquipItem(item.id, item.type)}
                        className={`p-3 rounded-xl transition-all text-center ${
                          playerProfile.equippedAccessoryId === item.id
                            ? 'bg-indigo-100 border-2 border-indigo-500'
                            : 'bg-slate-50 hover:bg-indigo-50'
                        }`}
                      >
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 鞋子类 */}
                <div>
                  <h4 className="text-sm font-bold text-slate-500 mb-3">👟 鞋子</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {CLOTHING_ITEMS.filter(i => i.type === 'shoes').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleEquipItem(item.id, item.type)}
                        className={`p-3 rounded-xl transition-all text-center ${
                          playerProfile.equippedShoesId === item.id
                            ? 'bg-indigo-100 border-2 border-indigo-500'
                            : 'bg-slate-50 hover:bg-indigo-50'
                        }`}
                      >
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                💡 装扮可通过胡萝卜购买或成就解锁获得
              </p>
            </div>
          )}

          {/* 战绩统计 */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* 核心数据 */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl p-6 text-white shadow-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🥕</div>
                    <div className="text-3xl font-black">{playerProfile.carrotCount}</div>
                    <div className="text-indigo-100 text-sm">胡萝卜</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎮</div>
                    <div className="text-3xl font-black">{playerProfile.totalGames}</div>
                    <div className="text-indigo-100 text-sm">总场次</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-3xl font-black">{playerProfile.winGames}</div>
                    <div className="text-indigo-100 text-sm">胜场</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-2">📈</div>
                    <div className="text-3xl font-black">{winRate}%</div>
                    <div className="text-indigo-100 text-sm">胜率</div>
                  </div>
                </div>
              </div>

              {/* VIP 等级 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">⭐ VIP 等级</h3>
                <div className="flex items-center gap-4">
                  <div className="text-5xl">
                    {playerProfile.vipLevel >= 5 ? '👑' : playerProfile.vipLevel >= 3 ? '💎' : playerProfile.vipLevel >= 1 ? '⭐' : '🌱'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700">LV.{playerProfile.vipLevel}</span>
                      <span className="text-sm text-slate-400">下一等级：{playerProfile.vipLevel * 100} 胡萝卜</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{ width: `${Math.min(100, (playerProfile.carrotCount / ((playerProfile.vipLevel + 1) * 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 展示的物品 */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-black text-slate-700 mb-4">🎁 收藏品</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">✨ 特效</div>
                    <div className="text-4xl">
                      {playerProfile.displayedEffectId ? '🎆' : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">🔫 枪械</div>
                    <div className="text-4xl">
                      {playerProfile.displayedGunId ? '🔫' : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">📜 成就</div>
                    <div className="text-4xl">🏅</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-400 font-bold mb-2">🎖️ 勋章</div>
                    <div className="text-4xl">🎖️</div>
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

export default ArchiveRoom;
