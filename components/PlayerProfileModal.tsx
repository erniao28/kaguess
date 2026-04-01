import React, { useState, useEffect } from 'react';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  onProfileLoaded: (playerData: any) => void;
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  socket,
  onProfileLoaded
}) => {
  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [playerCode, setPlayerCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');

  // 生成随机档案码
  const generatePlayerCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的字符
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  useEffect(() => {
    if (isOpen && mode === 'create' && !playerCode) {
      const newCode = generatePlayerCode();
      setGeneratedCode(newCode);
      setPlayerCode(newCode);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!socket) return;

    // 监听档案码检查结果
    socket.on('check_player_code_result', (result: { available: boolean; error?: string }) => {
      setCodeAvailable(result.available);
      if (result.error) {
        setError(result.error);
      }
    });

    // 监听创建结果
    socket.on('player_profile_result', (result: { success: boolean; error?: string; playerCode?: string }) => {
      setLoading(false);
      if (result.success) {
        // 创建成功后自动登录
        handleLogin(result.playerCode!, password);
      } else {
        setError(result.error || '创建失败');
      }
    });

    // 监听登录结果
    socket.on('login_result', (result: { success: boolean; error?: string; player?: any }) => {
      setLoading(false);
      if (result.success && result.player) {
        onProfileLoaded(result.player);
        onClose();
      } else {
        setError(result.error || '登录失败');
      }
    });

    return () => {
      socket.off('check_player_code_result');
      socket.off('player_profile_result');
      socket.off('login_result');
    };
  }, [socket, onClose, onProfileLoaded]);

  const handleCheckCode = (code: string) => {
    if (!/^[a-zA-Z0-9]{6,8}$/.test(code)) {
      setCodeAvailable(false);
      setError('档案码格式不正确（6-8 位字母或数字）');
      return;
    }
    setError('');
    socket.emit('check_player_code', code);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (playerCode.length >= 6) {
        handleCheckCode(playerCode);
      } else {
        setCodeAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [playerCode]);

  const handleCreate = () => {
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 4) {
      setError('密码长度至少 4 位');
      return;
    }
    if (!codeAvailable) {
      setError('档案码不可用');
      return;
    }
    setLoading(true);
    setError('');
    socket.emit('create_player_profile', {
      playerCode,
      password,
      nickname: nickname || '玩家'
    });
  };

  const handleLogin = (code: string, pass: string) => {
    setLoading(true);
    setError('');
    socket.emit('login_player', {
      playerCode: code,
      password: pass
    });
  };

  const handleSubmit = () => {
    if (mode === 'create') {
      handleCreate();
    } else {
      handleLogin(playerCode, password);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(playerCode);
    alert('档案码已复制到剪贴板');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>
          <div className="text-5xl mb-2">🆔</div>
          <h2 className="text-2xl font-black text-white">我的档案</h2>
          <p className="text-indigo-100 text-sm mt-1">记录你的游戏旅程</p>
        </div>

        {/* 模式切换 */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => {
              setMode('create');
              const newCode = generatePlayerCode();
              setPlayerCode(newCode);
              setGeneratedCode(newCode);
              setPassword('');
              setConfirmPassword('');
              setError('');
            }}
            className={`flex-1 py-4 font-bold transition-colors ${
              mode === 'create'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            创建档案
          </button>
          <button
            onClick={() => {
              setMode('login');
              setPlayerCode('');
              setPassword('');
              setError('');
            }}
            className={`flex-1 py-4 font-bold transition-colors ${
              mode === 'login'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            已有档案，登录
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
              ⚠️ {error}
            </div>
          )}

          {mode === 'create' && (
            <>
              {/* 档案码 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  档案码（6-8 位字母或数字）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerCode}
                    onChange={(e) => setPlayerCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 font-mono text-lg tracking-wider ${
                      codeAvailable === false
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : codeAvailable === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200'
                    }`}
                    maxLength={8}
                    placeholder="ABC123"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                    title="复制档案码"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => {
                      const newCode = generatePlayerCode();
                      setPlayerCode(newCode);
                      setGeneratedCode(newCode);
                    }}
                    className="px-4 py-3 bg-indigo-100 hover:bg-indigo-200 rounded-xl font-bold text-indigo-600 transition-colors"
                    title="换一个"
                  >
                    🔄
                  </button>
                </div>
                {codeAvailable === true && (
                  <p className="text-green-600 text-sm mt-1">✅ 档案码可用</p>
                )}
                {codeAvailable === false && playerCode.length >= 6 && (
                  <p className="text-rose-600 text-sm mt-1">❌ 档案码已被占用</p>
                )}
              </div>

              {/* 昵称 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  昵称（可选）
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="你想怎么被称呼？"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                  maxLength={20}
                />
              </div>
            </>
          )}

          {/* 密码 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              密码（换设备登录时用）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'create' ? "至少 4 位" : "输入密码"}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
              minLength={4}
            />
          </div>

          {mode === 'create' && (
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
                minLength={4}
              />
            </div>
          )}

          {/* 提示信息 */}
          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
            <p className="font-bold mb-2">💡 重要提示：</p>
            <ul className="space-y-1">
              <li>• 档案码是你的唯一身份标识，请妥善保存</li>
              <li>• 换设备时输入档案码和密码即可恢复所有数据</li>
              <li>• 建议截图保存档案码</li>
            </ul>
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : (mode === 'create' ? '🎉 创建档案' : '🔓 登录')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;
