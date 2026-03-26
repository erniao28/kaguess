import React, { useState } from 'react';

interface PrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomId: string, password: string) => void;
  onJoinRoom: (roomId: string, password: string) => void;
}

const PrivateRoomModal: React.FC<PrivateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!roomId.trim()) {
      alert('请输入房间号');
      return;
    }

    if (!/^[a-zA-Z0-9-]{3,32}$/.test(roomId)) {
      alert('房间号格式不合法（3-32 位字母、数字、-）');
      return;
    }

    if (mode === 'create') {
      if (hasPassword && password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
      }
      onCreateRoom(roomId.trim(), hasPassword ? password : '');
    } else {
      onJoinRoom(roomId.trim(), password);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        {/* 标题 */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              🔐 私密房间
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setMode('create');
              setPassword('');
              setConfirmPassword('');
            }}
            className={`flex-1 py-4 font-bold transition-colors ${
              mode === 'create'
                ? 'bg-pink-50 text-pink-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            创建房间
          </button>
          <button
            onClick={() => {
              setMode('join');
              setPassword('');
            }}
            className={`flex-1 py-4 font-bold transition-colors ${
              mode === 'join'
                ? 'bg-pink-50 text-pink-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            加入房间
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-4">
          {/* 房间号输入 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              房间号
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="如：love-abc-123"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-500 transition-colors"
              maxLength={32}
            />
            <p className="text-xs text-slate-400 mt-1">
              3-32 位字母、数字或短横线
            </p>
          </div>

          {/* 密码选项 */}
          {mode === 'create' ? (
            <div>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPassword}
                  onChange={(e) => {
                    setHasPassword(e.target.checked);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
                />
                <span className="text-sm font-bold text-slate-700">设置密码保护</span>
              </label>

              {hasPassword && (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="设置密码"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-500 transition-colors"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="确认密码"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                房间密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入房间密码"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            {mode === 'create' ? '🔐 创建私密房间' : '🔓 加入私密房间'}
          </button>

          {/* 提示信息 */}
          <div className="bg-pink-50 rounded-xl p-4 text-sm text-pink-700">
            <p className="font-bold mb-1">💡 私密房间特点：</p>
            <ul className="space-y-1">
              <li>• 自定义房间号，永久保存</li>
              <li>• 聊天记录永久存储</li>
              <li>• 支持自定义背景图</li>
              <li>• 密码保护，仅限邀请的人加入</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateRoomModal;
