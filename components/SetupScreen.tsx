
import React, { useState } from 'react';
import { Player, ForbiddenWord, PunishmentBanks } from '../types';
import ChatBox from './ChatBox';

interface Props {
  players: Player[];
  onPlayerReady: (player: Player, extraWords: ForbiddenWord[], punishments: PunishmentBanks, hasSpecificChars?: boolean) => void;
  onStartGame?: () => void;
  canStart?: boolean;
  playerRole?: 'FOX' | 'BUNNY' | null;
  playerProfile?: any | null;
  socket?: any;
  roomId?: string;
  isOwner?: boolean;
  onClearRoles?: () => void;
  onBackToNest?: () => void;
  chatMessages?: any[];
  onSendMessage?: (content: string, type: 'text' | 'emoji' | 'image') => void;
  mySocketId?: string | null;
  myPlayerCode?: string | null;
}

const SetupScreen: React.FC<Props> = ({
  players,
  onPlayerReady,
  onStartGame,
  canStart = false,
  playerRole = null,
  playerProfile = null,
  socket,
  roomId,
  isOwner = false,
  onClearRoles,
  onBackToNest,
  chatMessages = [],
  onSendMessage,
  mySocketId,
  myPlayerCode
}) => {
  const [customWordsText, setCustomWordsText] = useState('');
  const [customTruthsText, setCustomTruthsText] = useState('');
  const [customDaresText, setCustomDaresText] = useState('');
  const [targetCharsText, setTargetCharsText] = useState(''); // 特定字大作战
  const [showTargetChars, setShowTargetChars] = useState(false); // 是否启用特定字大作战
  const [targetCharsConfirmed, setTargetCharsConfirmed] = useState(false); // 特定字已确认
  const [wordModeMsg, setWordModeMsg] = useState(''); // 禁语词确认反馈
  const [customWordMode, setCustomWordMode] = useState<'single' | 'permanent' | null>(null); // 禁语词模式

  // 监听清空角色结果
  React.useEffect(() => {
    if (!socket) return;

    const handleClearResult = (result: { success: boolean; error?: string }) => {
      if (result.success) {
        console.log('[CLEAR_ROLES] 清空角色成功');
        // 成功清空后，本地状态已经被 sync_room 更新，无需额外操作
      } else {
        alert(result.error || '清空角色失败');
      }
    };

    socket.on('clear_room_roles_result', handleClearResult);

    return () => {
      socket.off('clear_room_roles_result', handleClearResult);
    };
  }, [socket]);

  const fox = players.find(p => p.type === 'FOX')!;
  const bunny = players.find(p => p.type === 'BUNNY')!;

  // 使用 playerCode 判断占用：只要有 playerCode 就表示角色已被选择
  const foxHasPlayer = fox.playerCode;
  const bunnyHasPlayer = bunny.playerCode;

  // isReady 表示是否已确认准备（用于游戏开始判断）
  const foxIsReady = fox.isReady;
  const bunnyIsReady = bunny.isReady;

  // 单机模式：狐狸已选择且当前玩家是狐狸，但兔子还没选择
  const canChooseBoth = foxHasPlayer && playerRole === 'FOX' && !bunnyHasPlayer;

  // 判断当前玩家是否已经选择了某个角色（用于重连/登录场景）- 使用 playerCode 判断更准确
  const currentplayerHasFox = playerProfile?.playerCode && fox.playerCode === playerProfile.playerCode;
  const currentplayerHasBunny = playerProfile?.playerCode && bunny.playerCode === playerProfile.playerCode;

  // 判断角色是否被当前玩家占用（用于显示"您已选择此角色"）
  const foxIsTakenByCurrentUser = currentplayerHasFox;
  const bunnyIsTakenByCurrentUser = currentplayerHasBunny;

  // 判断角色是否被其他玩家占用（用于显示"已被占用"）
  const foxIsTakenByOther = foxHasPlayer && !currentplayerHasFox;
  const bunnyIsTakenByOther = bunnyHasPlayer && !currentplayerHasBunny;

  const handleReady = (type: 'FOX' | 'BUNNY') => {
    const p = type === 'FOX' ? fox : bunny;

    // 使用档案昵称，如果没有档案则使用档案码，再没有则使用默认名称
    const name = playerProfile?.nickname || playerProfile?.playerCode || (type === 'FOX' ? '尼克' : '朱迪');

    // 提取所有可见字符（中文、字母、数字、符号）
    const extractChars = (text: string) => (text.match(/\S/g) || []);

    const extraWords = (customWordsText.match(/[\u4e00-\u9fa5]/g) || []).map(char => ({
      char, frequency: '自定义', difficulty: '未知' as const, description: '特工手动录入。',
      isSingleRound: customWordMode === 'single' ? true : undefined
    }));

    // 特定字大作战：将指定的字也加入到禁语词库
    const targetWords = showTargetChars && targetCharsText && targetCharsConfirmed ? extractChars(targetCharsText).map(char => ({
      char, frequency: '特定字', difficulty: '高' as const, description: '特定字大作战禁语。'
    })) : [];

    const allExtraWords = [...extraWords, ...targetWords];
    const hasSpecificChars = targetWords.length > 0;

    const punishments: PunishmentBanks = {
      truths: customTruthsText.split('\n').map(s => s.trim()).filter(s => s.length > 0),
      dares: customDaresText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    };

    onPlayerReady({ ...p, name, isReady: true }, allExtraWords, punishments, hasSpecificChars);
  };

  const handleClearRoles = () => {
    if (socket && roomId && playerProfile?.playerCode && playerProfile) {
      // 检查是否已经有角色被选择，没有则不需要清空
      const hasPlayersSelected = players.some(p => p.playerCode);
      if (!hasPlayersSelected) {
        alert('当前没有玩家选择角色，无需清空');
        return;
      }
      // 确认操作
      if (!confirm('确定要重置房间吗？这将清空所有角色选择，让所有玩家重新选择角色。')) {
        return;
      }
      console.log('[CLEAR_ROLES] 请求清空房间:', roomId, 'playerCode:', playerProfile.playerCode);
      socket.emit('clear_room_roles', { roomId, playerCode: playerProfile.playerCode });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* 返回小窝按钮 */}
      {onBackToNest && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onBackToNest}
            className="px-6 py-3 bg-white/90 backdrop-blur rounded-full font-black text-sm text-slate-600 hover:bg-white shadow-lg transition-all hover:scale-105 active:scale-95 border-2 border-slate-100"
          >
            🏰 返回小窝
          </button>
        </div>
      )}
    <div className="bg-white rounded-[60px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.1)] p-10 md:p-14 max-w-6xl w-full border-[12px] border-white animate-in slide-in-from-bottom-10 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Role Cards */}
        <div className="space-y-10">
          <div className="text-center md:text-left">
            <h2 className="text-5xl font-black text-slate-800 mb-2">角色认领处 🎭</h2>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">点击领取你的身份</p>
          </div>

          <div className="space-y-6">
            {/* Nick Card */}
            <div className={`p-8 rounded-[45px] border-4 transition-all duration-500 flex items-center gap-6 relative overflow-hidden ${
              fox.isReady ? 'bg-orange-500 border-orange-300 translate-x-4 shadow-2xl shadow-orange-100' :
              foxIsTakenByOther ? 'bg-slate-200 border-slate-300 opacity-60' :
              'bg-orange-50 border-orange-100 hover:scale-[1.02]'
            }`}>
              <div className="text-8xl select-none">🦊</div>
              <div className="flex-1">
                <h3 className={`text-3xl font-black mb-3 ${
                  fox.isReady ? 'text-white' :
                  foxIsTakenByOther ? 'text-slate-500' :
                  'text-orange-800'
                }`}>狐尼克 · Nick</h3>
                {fox.isReady ? (
                  <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-white/30 animate-pulse">
                    <p className="text-white font-black italic">已就位：{fox.name}</p>
                  </div>
                ) : foxIsTakenByOther ? (
                  <div className="bg-slate-400/30 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-slate-400/30">
                    <p className="text-slate-600 font-black italic">已被占用</p>
                  </div>
                ) : playerRole === 'BUNNY' && !canChooseBoth && !foxHasPlayer ? (
                  <div className="text-slate-400 font-black text-sm">请选择兔子角色</div>
                ) : foxIsTakenByCurrentUser ? (
                  // 用户已选择此角色但未准备，显示准备按钮
                  <button
                    onClick={() => handleReady('FOX')}
                    className="w-full bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-orange-700 transition-all active:scale-95"
                  >
                    ✅ 已认领，点击准备
                  </button>
                ) : (
                  <button
                    onClick={() => handleReady('FOX')}
                    disabled={foxHasPlayer && !canChooseBoth && !currentplayerHasFox}
                    className="w-full bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {foxHasPlayer && !canChooseBoth && !currentplayerHasFox ? '已被占用' : playerProfile ? `认领（${playerProfile.nickname}）` : '先登录档案'}
                  </button>
                )}
              </div>
            </div>

            {/* Judy Card */}
            <div className={`p-8 rounded-[45px] border-4 transition-all duration-500 flex items-center gap-6 relative overflow-hidden ${
              bunny.isReady ? 'bg-blue-600 border-blue-400 translate-x-4 shadow-2xl shadow-blue-100' :
              bunnyIsTakenByOther ? 'bg-slate-200 border-slate-300 opacity-60' :
              'bg-blue-50 border-blue-100 hover:scale-[1.02]'
            }`}>
              <div className="text-8xl select-none">🐰</div>
              <div className="flex-1">
                <h3 className={`text-3xl font-black mb-3 ${
                  bunny.isReady ? 'text-white' :
                  bunnyIsTakenByOther ? 'text-slate-500' :
                  'text-blue-800'
                }`}>朱迪 · Judy</h3>
                {bunny.isReady ? (
                  <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-white/30 animate-pulse">
                    <p className="text-white font-black italic">已出勤：{bunny.name}</p>
                  </div>
                ) : bunnyIsTakenByOther ? (
                  <div className="bg-slate-400/30 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-slate-400/30">
                    <p className="text-slate-600 font-black italic">已被占用</p>
                  </div>
                ) : playerRole === 'FOX' && !canChooseBoth && !bunnyHasPlayer ? (
                  <div className="text-slate-400 font-black text-sm">请选择狐狸角色</div>
                ) : bunnyIsTakenByCurrentUser ? (
                  // 用户已选择此角色但未准备，显示准备按钮
                  <button
                    onClick={() => handleReady('BUNNY')}
                    className="w-full bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-800 transition-all active:scale-95"
                  >
                    ✅ 已认领，点击准备
                  </button>
                ) : (
                  <button
                    onClick={() => handleReady('BUNNY')}
                    disabled={bunnyHasPlayer && !canChooseBoth && !currentplayerHasBunny}
                    className="w-full bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {bunnyHasPlayer && !canChooseBoth && !currentplayerHasBunny ? '已被占用' : playerProfile ? `出勤（${playerProfile.nickname}）` : '先登录档案'}
                  </button>
                )}
              </div>
            </div>

            {/* 重置房间按钮 - 已登录用户可见，KADEGOU 始终可用 */}
            {playerProfile && (
              <div className="pt-4 pb-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isOwner && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-black border border-amber-300">
                      👑 您是房主
                    </span>
                  )}
                  {playerProfile.playerCode === 'KADEGOU' && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-black border border-purple-300">
                      🛡️ 超级管理员
                    </span>
                  )}
                  {players.some(p => p.playerCode && p.playerCode !== playerProfile.playerCode) && (
                    <span className="text-xs text-slate-500 font-bold">
                      队友：{players.find(p => p.playerCode && p.playerCode !== playerProfile.playerCode)?.name || '等待中...'}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearRoles}
                  className={`w-full px-6 py-3 rounded-2xl font-black text-sm border-2 transition-all active:scale-95 ${
                    players.some(p => p.playerCode) || playerProfile.playerCode === 'KADEGOU'
                      ? 'bg-slate-200 text-slate-600 hover:bg-slate-300 border-slate-300'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title={playerProfile.playerCode === 'KADEGOU' ? "超级管理员清空房间" : (players.some(p => p.playerCode) ? "清空所有角色选择，让所有玩家重新选择角色" : "当前没有玩家选择角色")}
                  disabled={!players.some(p => p.playerCode) && playerProfile.playerCode !== 'KADEGOU'}
                >
                  🔄 重置房间 {playerProfile.playerCode === 'KADEGOU' ? "(超级管理员)" : (players.some(p => p.playerCode) ? "" : "（无角色可清空）")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Custom Input Section */}
        <div className="bg-slate-50 p-10 rounded-[60px] border-4 border-slate-100 space-y-8 flex flex-col shadow-inner">
           <div className="text-center">
            <h2 className="text-3xl font-black text-slate-800 mb-1">自定义情报库 📂</h2>
            <p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase">Security Clearance Level 1</p>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-indigo-50">
              <label className="block text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-2">追加禁语关键词 (提取汉字)</label>
              <textarea
                value={customWordsText}
                onChange={e => setCustomWordsText(e.target.value)}
                placeholder="例如：输入这段话，会增加其中的汉字到抽题库..."
                className="w-full h-24 outline-none text-sm leading-relaxed resize-none font-bold placeholder:text-slate-300"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400 font-bold">
                  {(customWordsText.match(/\S/g) || []).length} 个汉字可录入
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const count = (customWordsText.match(/\S/g) || []).length;
                      if (count > 0) {
                        setCustomWordMode('single');
                        setWordModeMsg(`✅ 已确认「单次」模式！${count} 个汉字本轮生效`);
                        setTimeout(() => setWordModeMsg(''), 3000);
                      } else {
                        alert('⚠️ 未检测到汉字，请输入包含汉字的内容。');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                      customWordMode === 'single'
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : 'bg-indigo-400 text-white hover:bg-indigo-500'
                    }`}
                  >
                    📋 本轮有效（单次）
                  </button>
                  <button
                    onClick={() => {
                      const count = (customWordsText.match(/\S/g) || []).length;
                      if (count > 0) {
                        setCustomWordMode('permanent');
                        setWordModeMsg(`✅ 已确认「永久」模式！${count} 个汉字已加入永久词库`);
                        setTimeout(() => setWordModeMsg(''), 3000);
                      } else {
                        alert('⚠️ 未检测到汉字，请输入包含汉字的内容。');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                      customWordMode === 'permanent'
                        ? 'bg-indigo-800 text-white ring-2 ring-indigo-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    💾 永久加入词库
                  </button>
                </div>
              </div>
              {wordModeMsg && (
                <div className="mt-2 px-3 py-1.5 bg-indigo-50 rounded-xl text-xs font-bold text-indigo-600 animate-in fade-in">
                  {wordModeMsg}
                </div>
              )}
            </div>

            {/* 特定字大作战 */}
            <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-amber-50">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[11px] font-black text-amber-600 uppercase tracking-widest ml-2">特定字大作战 🎯</label>
                <button
                  onClick={() => { setShowTargetChars(!showTargetChars); setTargetCharsConfirmed(false); }}
                  className={`px-4 py-1 rounded-full text-xs font-black transition-all ${
                    showTargetChars ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {showTargetChars ? '已启用' : '未启用'}
                </button>
              </div>
              {showTargetChars && (
                <div>
                  <textarea
                    value={targetCharsText}
                    onChange={e => { setTargetCharsText(e.target.value); setTargetCharsConfirmed(false); }}
                    placeholder="输入你想禁止的特定字，例如：你 我 他..."
                    className="w-full h-24 outline-none text-sm leading-relaxed resize-none font-bold placeholder:text-slate-300"
                  />
                  <div className="flex items-center justify-end mt-2 gap-2">
                    <span className="text-xs text-slate-400 font-bold">
                      {targetCharsText.replace(/\s/g, '').length} 个字
                    </span>
                    <button
                      onClick={() => {
                        if (!targetCharsText.trim()) {
                          alert('⚠️ 请输入要禁止的特定字');
                          return;
                        }
                        setTargetCharsConfirmed(true);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                        targetCharsConfirmed
                          ? 'bg-green-500 text-white'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {targetCharsConfirmed ? '✅ 已确认生效' : '确认生效'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-indigo-100">
                <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3 ml-2">私房真心话 (一行一条)</label>
                <textarea
                  value={customTruthsText}
                  onChange={e => setCustomTruthsText(e.target.value)}
                  placeholder="输入你想拷问的问题..."
                  className="w-full h-24 outline-none text-xs leading-relaxed resize-none font-bold"
                />
              </div>
              <div className="bg-white p-6 rounded-[40px] shadow-sm border-2 border-rose-100">
                <label className="block text-[11px] font-black text-rose-600 uppercase tracking-widest mb-3 ml-2">绝密大冒险 (一行一条)</label>
                <textarea
                  value={customDaresText}
                  onChange={e => setCustomDaresText(e.target.value)}
                  placeholder="输入你设计的疯狂挑战..."
                  className="w-full h-24 outline-none text-xs leading-relaxed resize-none font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-100 p-6 rounded-3xl border-2 border-amber-200 flex items-center gap-4">
             <span className="text-4xl animate-bounce">🚨</span>
             <p className="text-[12px] font-black text-amber-900 leading-tight uppercase">注意：双方都点击加入后，言灵咒将立即同步生效！</p>
          </div>
        </div>
      </div>

      {/* 选角阶段聊天窗口 - 上移到角色下方 */}
      <div className="mt-10 max-w-xl mx-auto">
        <ChatBox
          messages={chatMessages}
          onSendMessage={onSendMessage || (() => {})}
          isConnected={!!socket?.connected && !!roomId}
          mySocketId={mySocketId || null}
          myPlayerCode={myPlayerCode || null}
          chatFontSize={14}
          chatFontColor="#1e293b"
          canInteract={!!playerProfile}
        />
      </div>

      {/* 开始按钮 - 移到聊天窗口下方 */}
      <div className="mt-8 text-center">
        {canStart ? (
          <button
            onClick={onStartGame}
            className="inline-flex items-center gap-5 px-14 py-6 rounded-full font-black text-2xl shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-110 hover:scale-105 active:scale-95 transition-all animate-pulse"
          >
            <span className="w-4 h-4 rounded-full bg-green-400 shadow-[0_0_15px_#22c55e]" />
            🚀 开始行动！
          </button>
        ) : (
          <div className="inline-flex items-center gap-5 px-14 py-6 rounded-full font-black text-2xl shadow-2xl transition-all duration-1000 bg-slate-200 text-slate-400">
            <span className="w-4 h-4 rounded-full bg-slate-300" />
            {/* 根据准备状态显示不同提示 */}
            {players.some(p => p.isReady) && !players.every(p => p.isReady)
              ? '⏳ 等待队友准备...'
              : !players.some(p => p.isReady) && players.some(p => p.name)
                ? '📢 请双方点击角色卡片准备后开始'
                : '👥 等待队友加入...'
            }
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
};

export default SetupScreen;
