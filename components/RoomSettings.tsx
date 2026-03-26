import React, { useState, useEffect } from 'react';
import { Background } from '../types';

interface RoomSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currentBg: string;
  onUpdateBg: (bgUrl: string) => void;
  onUpdatePassword: (password: string) => void;
}

const PRESET_BACKGROUNDS: Background[] = [
  { id: 0, name: '默认', url: '', isPreset: true },
  { id: 1, name: '樱花', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920', isPreset: true },
  { id: 2, name: '星空', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?w=1920', isPreset: true },
  { id: 3, name: '海滩', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920', isPreset: true },
  { id: 4, name: '森林', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920', isPreset: true },
  { id: 5, name: '雪山', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920', isPreset: true },
  { id: 6, name: '城市', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920', isPreset: true },
  { id: 7, name: '温馨', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1920', isPreset: true },
];

const RoomSettings: React.FC<RoomSettingsProps> = ({
  isOpen,
  onClose,
  roomId,
  currentBg,
  onUpdateBg,
  onUpdatePassword
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'password'>('background');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedBg, setSelectedBg] = useState(currentBg);

  useEffect(() => {
    if (isOpen) {
      setSelectedBg(currentBg);
    }
  }, [isOpen, currentBg]);

  if (!isOpen) return null;

  const handlePasswordUpdate = () => {
    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    onUpdatePassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    alert('密码已更新');
  };

  const handleBgSelect = (url: string) => {
    setSelectedBg(url);
    onUpdateBg(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[80vh] flex flex-col">
        {/* 标题 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              ⚙️ 房间设置
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* 房间号显示 */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">房间号：</span>
            <span className="font-bold text-indigo-600">{roomId}</span>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('background')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'background'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🖼️ 背景图
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-4 font-bold transition-colors ${
              activeTab === 'password'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🔐 密码管理
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'background' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-3">选择一个背景图作为房间的默认背景：</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => handleBgSelect(bg.url)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-4 transition-all ${
                      selectedBg === bg.url
                        ? 'border-indigo-500 scale-105 shadow-lg'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {bg.url ? (
                      <img
                        src={bg.url}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <span className="text-2xl">🎨</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2">
                      {bg.name}
                    </div>
                    {selectedBg === bg.url && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ 注意：</strong> 设置密码后，加入房间时需要输入密码。留空则取消密码保护。
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（留空取消密码）"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                onClick={handlePasswordUpdate}
                disabled={!newPassword}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔐 更新密码
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomSettings;
