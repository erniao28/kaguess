import React, { useState, useEffect, useRef } from 'react';
import { Background } from '../types';

interface RoomMember {
  playerCode: string;
  nickname: string;
  role: 'FOX' | 'BUNNY';
  isReady: boolean;
  isOwner: boolean;
  vipLevel: number;
  carrotCount: number;
  isOnline: boolean;
  socketId: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  members: RoomMember[];
  currentPlayerCode: string;
  isOwner: boolean;
  isAdmin?: boolean;
  onKick: (playerCode: string) => void;
  onTransferOwnership: (playerCode: string) => void;
  onForceReset?: () => void;
  onClearRoom?: () => void;
  currentBg?: string;
  onUpdateBg?: (bgUrl: string) => void;
  onUpdatePassword?: (password: string) => void;
  onSwitchRoom?: () => void;
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

type TabKey = 'members' | 'background' | 'password';

const RoomManagement: React.FC<Props> = ({
  isOpen, onClose, roomId, members, currentPlayerCode, isOwner, isAdmin = false,
  onKick, onTransferOwnership, onForceReset, onClearRoom,
  currentBg = '', onUpdateBg, onUpdatePassword, onSwitchRoom
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('members');
  const [showTransferConfirm, setShowTransferConfirm] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedBg, setSelectedBg] = useState(currentBg);
  const [customBg, setCustomBg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedBg(currentBg);
      setActiveTab('members');
      setShowTransferConfirm(null);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, currentBg]);

  if (!isOpen) return null;

  const handlePasswordUpdate = () => {
    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    onUpdatePassword?.(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    alert('密码已更新');
  };

  const handleBgSelect = (url: string) => {
    setSelectedBg(url);
    onUpdateBg?.(url);
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomBg(base64);
      setSelectedBg(base64);
      onUpdateBg?.(base64);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'members', label: '成员管理', icon: '👥' },
    { key: 'background', label: '背景设置', icon: '🖼️' },
    { key: 'password', label: '密码管理', icon: '🔐' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-[40px] shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden border-8 border-indigo-400 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6 text-center relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-black transition-all"
          >
            ✕
          </button>
          <div className="text-4xl mb-2">🏠</div>
          <h2 className="text-2xl font-black text-white">房间管理</h2>
          <p className="text-indigo-100 text-xs mt-1">房间号：{roomId}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-indigo-100 flex-shrink-0 bg-white/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 font-bold text-sm transition-all border-b-3 ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50'
                  : 'text-slate-400 border-b-2 border-transparent hover:text-slate-600'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* ===== 成员管理 Tab ===== */}
          {activeTab === 'members' && (
            <div>
              {/* 权限提示 */}
              {isOwner || isAdmin ? (
                <div className={`rounded-2xl p-4 mb-4 border-2 ${
                  isAdmin && !isOwner
                    ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-400'
                    : 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{isAdmin && !isOwner ? '🛡️' : '👑'}</span>
                    <div>
                      <div className={`font-black ${isAdmin && !isOwner ? 'text-purple-800' : 'text-yellow-800'}`}>
                        {isAdmin && !isOwner ? '超级管理员 (KADEGOU)' : '你是房主'}
                      </div>
                      <div className={`text-xs ${isAdmin && !isOwner ? 'text-purple-600' : 'text-yellow-600'}`}>
                        {isAdmin && !isOwner ? '拥有最高权限，可以执行任何房间操作' : '可以踢人、转让房主或强制结束游戏'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 rounded-2xl p-4 mb-4 border-2 border-slate-300">
                  <div className="text-center text-slate-500 font-bold text-sm">
                    你不是房主，只能查看房间信息
                  </div>
                </div>
              )}

              {/* 房主操作按钮 */}
              {(isOwner || isAdmin) && (
                <div className="space-y-3 mb-4">
                  {onClearRoom && (
                    <button
                      onClick={() => {
                        if (confirm('⚠️ 确认清空房间所有角色？\n所有玩家需要重新选择角色！')) {
                          onClearRoom();
                        }
                      }}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                      🔄 清空房间（所有玩家重新选择角色）
                    </button>
                  )}
                  {isAdmin && onForceReset && (
                    <button
                      onClick={() => {
                        if (confirm('⚠️ 确认强制结束游戏？所有玩家需要重新登录！')) {
                          onForceReset();
                        }
                      }}
                      className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                      🚨 强制结束游戏（所有玩家重新登录）
                    </button>
                  )}
                </div>
              )}

              {/* 成员列表 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">房间成员</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400" /> 在线 {members.filter(m => m.isOnline).length}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> 离线 {members.filter(m => !m.isOnline).length}
                    </span>
                  </div>
                </div>

                {members.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">👻</div>
                    <div className="font-bold">暂无成员</div>
                    <div className="text-xs mt-2 text-slate-500">请先选择角色（狐狸/兔子），选择后会在列表中显示</div>
                  </div>
                ) : (
                  members.map(member => {
                    const isMe = member.playerCode === currentPlayerCode;
                    const isCurrentOwner = member.isOwner;

                    return (
                      <div
                        key={member.playerCode}
                        className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                          isMe
                            ? 'border-indigo-400 bg-indigo-50'
                            : isCurrentOwner
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`text-3xl ${
                              member.role === 'FOX' ? 'text-orange-500' : 'text-blue-500'
                            }`}>
                              {member.role === 'FOX' ? '🦊' : '🐰'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${member.isOnline ? 'bg-green-400' : 'bg-red-400'}`} title={member.isOnline ? '在线' : '离线'} />
                                <span className={`font-black ${
                                  isMe ? 'text-indigo-700' : isCurrentOwner ? 'text-yellow-700' : 'text-slate-700'
                                }`}>
                                  {member.nickname}
                                  {isMe && <span className="text-xs text-indigo-400 ml-1">(我)</span>}
                                  {isCurrentOwner && <span className="text-xs text-yellow-500 ml-1">(房主)</span>}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span className="flex items-center gap-1">🥕 {member.carrotCount}</span>
                                <span className="flex items-center gap-1">👑 VIP{member.vipLevel}</span>
                                {member.isReady && <span className="text-green-500 font-bold">✓ 已准备</span>}
                              </div>
                            </div>
                          </div>

                          {(isOwner || isAdmin) && !isCurrentOwner && !isMe && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onKick(member.playerCode)}
                                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-xl font-black text-xs transition-all"
                                title="踢出房间"
                              >
                                👢 踢出
                              </button>
                              <button
                                onClick={() => setShowTransferConfirm(member.playerCode)}
                                className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-xl font-black text-xs transition-all"
                                title="转让房主"
                              >
                                👑 转让
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 转让确认弹窗 */}
              {showTransferConfirm && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowTransferConfirm(null)}>
                  <div className="bg-white rounded-3xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                    <div className="text-center">
                      <div className="text-5xl mb-4">👑</div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">确认转让房主？</h3>
                      <p className="text-slate-500 text-sm mb-6">
                        转让给 <span className="font-bold text-indigo-600">
                          {members.find(m => m.playerCode === showTransferConfirm)?.nickname}
                        </span>
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowTransferConfirm(null)}
                          className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black transition-all"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => {
                            onTransferOwnership(showTransferConfirm);
                            setShowTransferConfirm(null);
                          }}
                          className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all"
                        >
                          确认
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 背景设置 Tab ===== */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              {/* 自定义背景 */}
              <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-200">
                <p className="text-sm font-bold text-indigo-700 mb-3">📁 上传自定义背景：</p>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    📷 选择图片
                  </button>
                  {customBg && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-10 rounded-lg overflow-hidden border-2 border-white shadow">
                        <img src={customBg} alt="自定义背景" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm text-indigo-600 font-bold">已选择自定义背景</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomBgUpload}
                  className="hidden"
                />
              </div>

              {/* 预设背景 */}
              <div>
                <p className="text-sm text-slate-500 mb-3">🎨 预设背景：</p>
                <div className="grid grid-cols-2 gap-3">
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
                        <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
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
            </div>
          )}

          {/* ===== 密码管理 Tab ===== */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ 注意：</strong> 设置密码后，加入房间时需要输入密码。留空则取消密码保护。
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（留空取消密码）"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">确认密码</label>
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

        {/* Footer - 切换房间 */}
        {onSwitchRoom && (
          <div className="px-5 pb-5">
            <button
              onClick={() => {
                onClose();
                setTimeout(onSwitchRoom, 300);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-black rounded-xl hover:shadow-lg transition-all text-sm"
            >
              🔄 切换房间
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManagement;
