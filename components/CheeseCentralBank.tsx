import React, { useState, useEffect } from 'react';
import { CHEESE_BANK_HONORARY_DIRECTORS } from '../constants';

interface PlayerProfile {
  playerCode: string;
  nickname: string;
}

interface Proposal {
  id: number;
  target_player_code: string;
  target_nickname?: string;
  carrot_amount: number;
  proposer_code: string;
  proposer_role: 'FOX' | 'BUNNY';
  fox_approved: number;
  bunny_approved: number;
  is_executed: number;
  created_at: number;
}

interface CheeseCentralBankProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile: PlayerProfile | null;
  socket: any;
}

const CheeseCentralBank: React.FC<CheeseCentralBankProps> = ({
  isOpen,
  onClose,
  playerProfile,
  socket
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'omo' | 'gift' | 'history' | 'wallet'>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);

  // OMO 提案状态
  const [targetPlayerCode, setTargetPlayerCode] = useState('');
  const [omoCarrotAmount, setOmoCarrotAmount] = useState(10);

  // 手动赠送状态
  const [giftTargetCode, setGiftTargetCode] = useState('');
  const [giftAmount, setGiftAmount] = useState(1);

  // 转账历史
  const [transferHistory, setTransferHistory] = useState<any[]>([]);

  // 钱包交易记录
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [walletFilter, setWalletFilter] = useState<'ALL' | 'CARROT' | 'CHEESE'>('ALL');

  // 加载财务信息和提案
  useEffect(() => {
    if (isOpen && playerProfile && socket) {
      socket.emit('get_cheese_summary', playerProfile.playerCode);
      socket.emit('get_pending_proposals');

      const handleSummary = (data: any) => {
        setSummary(data);
      };

      const handleProposals = (proposals: Proposal[]) => {
        setPendingProposals(proposals);
      };

      const handleTransferHistory = (history: any[]) => {
        setTransferHistory(history);
      };

      const handleWalletTransactions = (transactions: any[]) => {
        setWalletTransactions(transactions);
      };

      socket.on('cheese_summary', handleSummary);
      socket.on('pending_proposals', handleProposals);
      socket.on('transfer_history', handleTransferHistory);
      socket.on('wallet_transactions', handleWalletTransactions);

      return () => {
        socket.off('cheese_summary', handleSummary);
        socket.off('pending_proposals', handleProposals);
        socket.off('transfer_history', handleTransferHistory);
        socket.off('wallet_transactions', handleWalletTransactions);
      };
    }
  }, [isOpen, playerProfile, socket]);

  // 当切换到钱包标签时加载交易记录
  useEffect(() => {
    if (activeTab === 'wallet' && playerProfile && socket) {
      socket.emit('get_wallet_transactions', {
        playerCode: playerProfile.playerCode,
        currency: walletFilter === 'ALL' ? null : walletFilter,
      });
    }
  }, [activeTab, walletFilter, playerProfile, socket]);

  // 监听各种事件
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      proposal_created: (data: { proposalId: number }) => {
        alert(`✅ 提案已创建！等待另一位荣誉董事审批`);
        socket.emit('get_pending_proposals');
      },
      proposal_approved: (data: { proposalId: number; readyToExecute: boolean }) => {
        if (data.readyToExecute) {
          alert(`✅ 审批成功！两位荣誉董事已达成一致，可以执行提案`);
        } else {
          alert(`✅ 审批成功！等待另一位荣誉董事审批`);
        }
        socket.emit('get_pending_proposals');
      },
      proposal_executed: (data: { amount: number; targetPlayerCode: string }) => {
        alert(`✅ 执行成功！${data.targetPlayerCode} 获得了 ${data.amount} 胡萝卜`);
        socket.emit('get_pending_proposals');
      },
      carrot_gifted: (data: { amount: number; toPlayer: string }) => {
        alert(`✅ 赠送成功！${data.toPlayer} 获得了 ${data.amount} 胡萝卜`);
      },
      cheese_error: (data: { error: string }) => {
        alert(`❌ 操作失败：${data.error}`);
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket]);

  // 创建 OMO 提案
  const handleCreateProposal = () => {
    if (playerProfile && socket && targetPlayerCode) {
      const proposerRole = isFoxDirector ? 'FOX' : 'BUNNY';
      socket.emit('create_carrot_gift_proposal', {
        targetPlayerCode,
        carrotAmount: omoCarrotAmount,
        proposerCode: playerProfile.playerCode,
        proposerRole
      });
    }
  };

  // 审批提案
  const handleApproveProposal = (proposalId: number) => {
    if (playerProfile && socket) {
      const approverRole = isFoxDirector ? 'FOX' : 'BUNNY';
      socket.emit('approve_proposal', {
        proposalId,
        approverCode: playerProfile.playerCode,
        approverRole
      });
    }
  };

  // 执行提案
  const handleExecuteProposal = (proposalId: number) => {
    if (socket) {
      socket.emit('execute_proposal', proposalId);
    }
  };

  // 手动赠送胡萝卜
  const handleGiftCarrot = () => {
    if (playerProfile && socket && giftTargetCode) {
      socket.emit('gift_carrot', {
        fromPlayerCode: playerProfile.playerCode,
        toPlayerCode: giftTargetCode,
        amount: giftAmount
      });
    }
  };

  if (!isOpen || !playerProfile) return null;

  // 交易类型名称映射
  const transactionTypeNames: Record<string, string> = {
    DAILY_CLAIM: '每日签到',
    FURNITURE_BUY: '家具购买',
    FURNITURE_PLACE: '家具放置',
    CARROT_EXCHANGE: '胡萝卜兑换',
    GIFT_RECEIVED: '收到赠送',
    GIFT_SENT: '送出赠送',
    OMO_RECEIVED: 'OMO 央行赠送',
    GAME_REWARD: '游戏奖励',
    SCORE_EXCHANGE: '分数兑换',
  };
  const getTransactionTypeName = (type: string) => transactionTypeNames[type] || type;

  // 检查是否是荣誉董事（使用 constants 中的配置）
  const isFoxDirector = playerProfile.playerCode === CHEESE_BANK_HONORARY_DIRECTORS.FOX.code;
  const isBunnyDirector = playerProfile.playerCode === CHEESE_BANK_HONORARY_DIRECTORS.BUNNY.code;
  const isHonoraryDirector = isFoxDirector || isBunnyDirector;
  const directorName = isFoxDirector ? CHEESE_BANK_HONORARY_DIRECTORS.FOX.name : isBunnyDirector ? CHEESE_BANK_HONORARY_DIRECTORS.BUNNY.name : '';
  const directorRole = isFoxDirector ? 'FOX' : 'BUNNY';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-50 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 - 金灿灿的铭牌 */}
        <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 px-8 py-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>

          {/* 荣誉董事铭牌 */}
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🏛️</div>
            <h2 className="text-3xl font-black text-white drop-shadow-lg">奶酪央行</h2>
            <p className="text-yellow-100 text-sm font-bold">Cheese Central Bank</p>
          </div>

          {/* 荣誉董事展示 - 使用 constants 中的配置 */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-[20px] px-6 py-3 border-4 border-yellow-300 shadow-lg">
              <div className="text-center">
                <div className="text-3xl mb-1">🦊</div>
                <div className="text-white font-black text-sm">{CHEESE_BANK_HONORARY_DIRECTORS.FOX.name}</div>
                <div className="text-yellow-200 text-xs font-bold">{CHEESE_BANK_HONORARY_DIRECTORS.FOX.code}</div>
                <div className="text-yellow-200 text-xs font-bold">{CHEESE_BANK_HONORARY_DIRECTORS.FOX.title}</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-[20px] px-6 py-3 border-4 border-yellow-300 shadow-lg">
              <div className="text-center">
                <div className="text-3xl mb-1">🐰</div>
                <div className="text-white font-black text-sm">{CHEESE_BANK_HONORARY_DIRECTORS.BUNNY.name}</div>
                <div className="text-yellow-200 text-xs font-bold">{CHEESE_BANK_HONORARY_DIRECTORS.BUNNY.code}</div>
                <div className="text-yellow-200 text-xs font-bold">{CHEESE_BANK_HONORARY_DIRECTORS.BUNNY.title}</div>
              </div>
            </div>
          </div>

          {/* 当前用户身份提示 */}
          {isHonoraryDirector && (
            <div className="mt-4 bg-white/20 rounded-full px-4 py-2 text-center">
              <span className="text-white font-bold text-sm">
                👑 您正在以 <span className="font-black">{directorName}</span> ({isFoxDirector ? CHEESE_BANK_HONORARY_DIRECTORS.FOX.code : CHEESE_BANK_HONORARY_DIRECTORS.BUNNY.code}) 的身份操作
              </span>
            </div>
          )}
        </div>

        {/* 标签页 */}
        <div className="flex border-b-4 border-amber-200 bg-white flex-shrink-0">
          {[
            { id: 'overview', label: '总览', icon: '📊' },
            { id: 'wallet', label: '我的钱包', icon: '💰' },
            { id: 'omo', label: 'OMO 机制', icon: '🤝', adminOnly: true },
            { id: 'gift', label: '赠送胡萝卜', icon: '🎁' },
            { id: 'history', label: '转账记录', icon: '📝' },
          ].filter(tab => !tab.adminOnly || isHonoraryDirector).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 font-black transition-all ${
                activeTab === tab.id
                  ? 'text-amber-600 border-b-4 border-amber-600 bg-amber-50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <div className="text-xs mt-1">{tab.label}</div>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 总览页面 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 告示牌 */}
              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-[30px] p-6 border-4 border-amber-300">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">📋</div>
                  <div>
                    <h3 className="text-xl font-black text-amber-800 mb-2">央行告示</h3>
                    <p className="text-amber-700 font-bold text-sm leading-relaxed">
                      1. 胡萝卜兑换奶酪：<span className="font-black">1 🥕 = 5 🧀</span><br/>
                      2. OMO 机制：由尼克和朱迪两位荣誉董事共同审批，可向指定玩家赠送胡萝卜<br/>
                      3. 手动赠送：玩家之间可以互相赠送胡萝卜
                    </p>
                  </div>
                </div>
              </div>

              {/* 财务总览 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[25px] p-5 border-4 border-yellow-200 shadow-lg">
                  <div className="text-3xl mb-2">🧀</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">奶酪余额</div>
                  <div className="text-3xl font-black text-yellow-600">{summary?.cheeseBalance || 0}</div>
                </div>
                <div className="bg-white rounded-[25px] p-5 border-4 border-orange-200 shadow-lg">
                  <div className="text-3xl mb-2">🥕</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">胡萝卜</div>
                  <div className="text-3xl font-black text-orange-500">{summary?.carrotCount || 0}</div>
                </div>
              </div>

              {/* 荣誉董事专属提示 */}
              {!isHonoraryDirector && (
                <div className="bg-slate-100 rounded-[20px] p-4 border-2 border-slate-300">
                  <p className="text-slate-600 font-bold text-sm text-center">
                    💡 OMO 机制仅限荣誉董事（尼克/朱迪）使用
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 我的钱包页面 */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              {/* 余额总览 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-[25px] p-5 border-4 border-yellow-200 shadow-lg">
                  <div className="text-3xl mb-2">🧀</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">奶酪余额</div>
                  <div className="text-3xl font-black text-yellow-600">{summary?.cheeseBalance || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-[25px] p-5 border-4 border-orange-200 shadow-lg">
                  <div className="text-3xl mb-2">🥕</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">胡萝卜</div>
                  <div className="text-3xl font-black text-orange-500">{summary?.carrotCount || 0}</div>
                </div>
              </div>

              {/* 筛选按钮 */}
              <div className="flex gap-2">
                {[
                  { id: 'ALL' as const, label: '全部', icon: '📋' },
                  { id: 'CARROT' as const, label: '胡萝卜', icon: '🥕' },
                  { id: 'CHEESE' as const, label: '奶酪', icon: '🧀' },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setWalletFilter(filter.id)}
                    className={`flex-1 py-3 rounded-[20px] font-bold text-sm transition-all ${
                      walletFilter === filter.id
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}
              </div>

              {/* 交易记录列表 */}
              <div className="bg-white rounded-[30px] p-6 border-4 border-slate-200">
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">📜</span> 交易明细
                </h3>

                {walletTransactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">📭</div>
                    <div>暂无交易记录</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {walletTransactions.map((tx, index) => (
                      <div
                        key={tx.id || index}
                        className={`rounded-[20px] p-4 border-2 ${
                          tx.currency === 'CHEESE'
                            ? tx.amount > 0
                              ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                              : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                            : tx.amount > 0
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                              : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {tx.currency === 'CHEESE' ? (tx.amount > 0 ? '🧀' : '💸') : tx.amount > 0 ? '🥕' : '📤'}
                            </span>
                            <div>
                              <div className="font-black text-slate-800 text-sm">{tx.title}</div>
                              <div className="text-xs text-slate-500">
                                {tx.description || getTransactionTypeName(tx.type)}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {new Date(tx.created_at * 1000).toLocaleString('zh-CN')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-black ${
                              tx.amount > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount} {tx.currency === 'CHEESE' ? '🧀' : '🥕'}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              余额：{tx.balance_after}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OMO 机制页面 */}
          {activeTab === 'omo' && isHonoraryDirector && (
            <div className="space-y-6">
              {/* 创建新提案 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[30px] p-6 border-4 border-purple-200">
                <h3 className="text-xl font-black text-purple-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">📝</span> 创建 OMO 提案
                </h3>
                <p className="text-purple-600 text-sm font-bold mb-4">
                  需要尼克和朱迪两位荣誉董事共同同意才能执行
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">目标玩家档案码</label>
                    <input
                      type="text"
                      value={targetPlayerCode}
                      onChange={(e) => setTargetPlayerCode(e.target.value.toUpperCase())}
                      placeholder="输入 6-8 位档案码"
                      className="w-full px-4 py-3 rounded-[20px] border-2 border-purple-200 font-bold uppercase"
                      maxLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">赠送胡萝卜数量</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={omoCarrotAmount}
                        onChange={(e) => setOmoCarrotAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 px-4 py-3 rounded-[20px] border-2 border-purple-200 font-bold"
                        min="1"
                      />
                      <span className="text-3xl">🥕</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateProposal}
                    disabled={!targetPlayerCode}
                    className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-[25px] font-black shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                  >
                    创建提案
                  </button>
                </div>
              </div>

              {/* 待审批提案列表 */}
              <div className="bg-white rounded-[30px] p-6 border-4 border-amber-200">
                <h3 className="text-xl font-black text-amber-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">⏳</span> 待审批提案
                </h3>

                {pendingProposals.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">📭</div>
                    <div>暂无待审批提案</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingProposals.map(proposal => {
                      const canApprove = !proposal.fox_approved && directorRole === 'FOX' ||
                                        !proposal.bunny_approved && directorRole === 'BUNNY';
                      const canExecute = proposal.fox_approved && proposal.bunny_approved && !proposal.is_executed;

                      return (
                        <div key={proposal.id} className="bg-amber-50 rounded-[20px] p-4 border-2 border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-black text-amber-800">
                              赠送 {proposal.carrot_amount} 🥕 给 {proposal.target_player_code}
                            </div>
                            <div className="text-xs text-slate-500">
                              提案人：{proposal.proposer_code}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                              proposal.fox_approved ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <span>🦊</span> 尼克：{proposal.fox_approved ? '✓ 已同意' : '待审批'}
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                              proposal.bunny_approved ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <span>🐰</span> 朱迪：{proposal.bunny_approved ? '✓ 已同意' : '待审批'}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {canApprove && (
                              <button
                                onClick={() => handleApproveProposal(proposal.id)}
                                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-[15px] font-bold transition-all"
                              >
                                ✓ 审批同意
                              </button>
                            )}
                            {canExecute && (
                              <button
                                onClick={() => handleExecuteProposal(proposal.id)}
                                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-[15px] font-bold transition-all"
                              >
                                ▶ 执行提案
                              </button>
                            )}
                            {(!canApprove && !canExecute) && (
                              <div className="flex-1 py-2 text-center text-slate-400 text-sm font-bold">
                                {proposal.is_executed ? '已执行' : '等待审批'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 赠送胡萝卜页面 */}
          {activeTab === 'gift' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-[30px] p-6 border-4 border-pink-200">
                <h3 className="text-xl font-black text-pink-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">🎁</span> 手动赠送胡萝卜
                </h3>
                <p className="text-pink-600 text-sm font-bold mb-4">
                  直接将自己的胡萝卜赠送给其他玩家
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">接收方档案码</label>
                    <input
                      type="text"
                      value={giftTargetCode}
                      onChange={(e) => setGiftTargetCode(e.target.value.toUpperCase())}
                      placeholder="输入 6-8 位档案码"
                      className="w-full px-4 py-3 rounded-[20px] border-2 border-pink-200 font-bold uppercase"
                      maxLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">赠送数量</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={giftAmount}
                        onChange={(e) => setGiftAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 px-4 py-3 rounded-[20px] border-2 border-pink-200 font-bold"
                        min="1"
                        max={summary?.carrotCount || 1}
                      />
                      <span className="text-3xl">🥕</span>
                    </div>
                    <div className="text-xs text-pink-500 font-bold mt-2">
                      我的胡萝卜：{summary?.carrotCount || 0}
                    </div>
                  </div>

                  <button
                    onClick={handleGiftCarrot}
                    disabled={!giftTargetCode || (summary?.carrotCount || 0) < giftAmount}
                    className="w-full py-4 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 text-white rounded-[25px] font-black shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                  >
                    赠送胡萝卜
                  </button>
                </div>
              </div>

              <div className="bg-pink-50 rounded-[20px] p-4 border-2 border-pink-200">
                <p className="text-pink-800 font-bold text-sm">
                  💡 提示：赠送后无法撤销，请确认对方档案码正确
                </p>
              </div>
            </div>
          )}

          {/* 转账记录页面 */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-[30px] p-6 border-4 border-slate-200">
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">📝</span> 转账记录
                </h3>

                {transferHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">📭</div>
                    <div>暂无转账记录</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transferHistory.map((transfer, index) => (
                      <div key={index} className={`rounded-[20px] p-4 border-2 ${
                        transfer.transfer_type === 'OMO'
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                          : transfer.transfer_type === 'GIFT'
                          ? 'bg-pink-50 border-pink-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {transfer.transfer_type === 'OMO' ? '🏦' : transfer.transfer_type === 'GIFT' ? '🎁' : '💰'}
                            </span>
                            <div>
                              <div className="font-black text-slate-800">
                                {transfer.transfer_type === 'OMO' ? 'OMO 赠送' : transfer.transfer_type === 'GIFT' ? '手动赠送' : '其他'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {transfer.from_player_code ? `${transfer.from_player_code} →` : '央行 OMO →'} {transfer.to_player_code}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-orange-500">+{transfer.carrot_amount} 🥕</div>
                            <div className="text-xs text-slate-400">
                              {new Date(transfer.created_at * 1000).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheeseCentralBank;
