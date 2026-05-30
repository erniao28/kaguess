import React, { useState, useEffect } from 'react';

interface PlayerProfile {
  playerCode: string;
  nickname: string;
}

interface FinancialSummary {
  cheeseBalance: number;
  cheeseDeposits: number;
  cheeseLoans: number;
  carrotCount: number;
  lastClaimDate: string | null;
}

interface CheeseBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile: PlayerProfile | null;
  socket: any;
}

const CheeseBankModal: React.FC<CheeseBankModalProps> = ({
  isOpen,
  onClose,
  playerProfile,
  socket
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'exchange' | 'deposit' | 'loan'>('overview');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [exchangeAmount, setExchangeAmount] = useState(1);
  const [depositAmount, setDepositAmount] = useState(10);
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [loanAmount, setLoanAmount] = useState(100);
  const [repayAmount, setRepayAmount] = useState(100);

  // 加载财务信息
  useEffect(() => {
    if (isOpen && playerProfile && socket) {
      socket.emit('get_cheese_summary', playerProfile.playerCode);

      const handleSummary = (data: FinancialSummary) => {
        setSummary(data);
      };

      socket.on('cheese_summary', handleSummary);

      return () => {
        socket.off('cheese_summary', handleSummary);
      };
    }
  }, [isOpen, playerProfile, socket]);

  // 监听各种事件
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      daily_cheese_claimed: (data: { amount: number; balance: number; date: string }) => {
        alert(`✅ 领取成功！获得 ${data.amount} 奶酪`);
        setSummary(prev => prev ? { ...prev, cheeseBalance: data.balance, lastClaimDate: data.date } : null);
      },
      carrot_exchanged: (data: { carrotAmount: number; cheeseAmount: number; newBalance: number }) => {
        alert(`✅ 兑换成功！${data.carrotAmount} 胡萝卜 → ${data.cheeseAmount} 奶酪`);
        setSummary(prev => prev ? { ...prev, cheeseBalance: data.newBalance, carrotCount: (prev.carrotCount - data.carrotAmount) } : null);
      },
      deposit_success: (data: { amount: number; summary: FinancialSummary }) => {
        alert(`✅ 存款成功！存入 ${data.amount} 奶酪`);
        setSummary(data.summary);
      },
      withdraw_success: (data: { amount: number; summary: FinancialSummary }) => {
        alert(`✅ 取款成功！取出 ${data.amount} 奶酪`);
        setSummary(data.summary);
      },
      loan_success: (data: { amount: number; dueDate: string; summary: FinancialSummary }) => {
        alert(`✅ 贷款成功！获得 ${data.amount} 奶酪，需在 ${data.dueDate} 前归还`);
        setSummary(data.summary);
      },
      repay_success: (data: { amount: number; summary: FinancialSummary }) => {
        alert(`✅ 还款成功！归还 ${data.amount} 奶酪`);
        setSummary(data.summary);
      },
      interest_settled: (data: { interest: number; summary: FinancialSummary }) => {
        alert(`✅ 利息结算成功！获得 ${data.interest} 奶酪利息`);
        setSummary(data.summary);
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

  const handleClaimDaily = () => {
    if (playerProfile && socket) {
      socket.emit('claim_daily_cheese', playerProfile.playerCode);
    }
  };

  const handleExchange = () => {
    if (playerProfile && socket && exchangeAmount > 0) {
      socket.emit('exchange_carrot_to_cheese', {
        playerCode: playerProfile.playerCode,
        carrotAmount: exchangeAmount
      });
    }
  };

  const handleDeposit = () => {
    if (playerProfile && socket && depositAmount > 0) {
      socket.emit('deposit_cheese', {
        playerCode: playerProfile.playerCode,
        amount: depositAmount
      });
    }
  };

  const handleWithdraw = () => {
    if (playerProfile && socket && withdrawAmount > 0) {
      socket.emit('withdraw_cheese', {
        playerCode: playerProfile.playerCode,
        amount: withdrawAmount
      });
    }
  };

  const handleTakeLoan = () => {
    if (playerProfile && socket && loanAmount > 0) {
      socket.emit('take_loan', {
        playerCode: playerProfile.playerCode,
        amount: loanAmount
      });
    }
  };

  const handleRepayLoan = () => {
    if (playerProfile && socket && repayAmount > 0) {
      socket.emit('repay_loan', {
        playerCode: playerProfile.playerCode,
        amount: repayAmount
      });
    }
  };

  const handleSettleInterest = () => {
    if (playerProfile && socket) {
      socket.emit('settle_interest', playerProfile.playerCode);
    }
  };

  if (!isOpen || !playerProfile) return null;

  const today = new Date().toISOString().split('T')[0];
  const hasClaimedToday = summary?.lastClaimDate === today;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-8 py-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
          >
            ✕
          </button>
          <div className="flex items-center gap-4">
            <div className="text-5xl">🧀</div>
            <div>
              <h2 className="text-3xl font-black text-white">奶酪央行</h2>
              <p className="text-yellow-100 text-sm font-bold">Cheese Central Bank</p>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b-4 border-amber-200 bg-white flex-shrink-0">
          {[
            { id: 'overview', label: '总览', icon: '📊' },
            { id: 'exchange', label: '兑换处', icon: '💱' },
            { id: 'deposit', label: '存款', icon: '💰' },
            { id: 'loan', label: '贷款', icon: '🏦' },
          ].map(tab => (
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 每日领取 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-[30px] p-6 border-4 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-green-800 mb-2">每日登录奖励</h3>
                    <p className="text-green-600 text-sm font-bold">每天登录可获得 1 奶酪</p>
                  </div>
                  <button
                    onClick={handleClaimDaily}
                    disabled={hasClaimedToday}
                    className={`px-6 py-3 rounded-full font-black transition-all ${
                      hasClaimedToday
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600 shadow-lg active:scale-95'
                    }`}
                  >
                    {hasClaimedToday ? '今日已领取' : '领取奶酪'}
                  </button>
                </div>
              </div>

              {/* 财务总览 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[25px] p-5 border-4 border-yellow-200 shadow-lg">
                  <div className="text-3xl mb-2">🧀</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">奶酪余额</div>
                  <div className="text-3xl font-black text-yellow-600">{summary?.cheeseBalance || 0}</div>
                </div>
                <div className="bg-white rounded-[25px] p-5 border-4 border-amber-200 shadow-lg">
                  <div className="text-3xl mb-2">🥕</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">胡萝卜</div>
                  <div className="text-3xl font-black text-orange-500">{summary?.carrotCount || 0}</div>
                </div>
                <div className="bg-white rounded-[25px] p-5 border-4 border-green-200 shadow-lg">
                  <div className="text-3xl mb-2">💎</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">银行存款</div>
                  <div className="text-3xl font-black text-green-600">{summary?.cheeseDeposits || 0}</div>
                  <div className="text-xs text-green-500 font-bold mt-1">年化 100%</div>
                </div>
                <div className="bg-white rounded-[25px] p-5 border-4 border-red-200 shadow-lg">
                  <div className="text-3xl mb-2">📉</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">贷款金额</div>
                  <div className="text-3xl font-black text-red-500">{summary?.cheeseLoans || 0}</div>
                  <div className="text-xs text-red-500 font-bold mt-1">年化 200%</div>
                </div>
              </div>

              {/* 结算利息按钮 */}
              {summary && summary.cheeseDeposits > 0 && (
                <button
                  onClick={handleSettleInterest}
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-[25px] font-black shadow-lg transition-all active:scale-95"
                >
                  💎 结算存款利息（日化 {(summary.cheeseDeposits / 365).toFixed(2)} 奶酪）
                </button>
              )}
            </div>
          )}

          {activeTab === 'exchange' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[30px] p-6 border-4 border-orange-200">
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-3xl">💱</span> 胡萝卜兑换奶酪
                </h3>
                <div className="text-center text-amber-600 font-black text-lg mb-4">
                  1 🥕 = 5 🧀
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="number"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-4 py-3 rounded-[20px] border-2 border-orange-200 font-bold text-center"
                    min="1"
                  />
                  <span className="text-2xl font-black text-orange-500">🥕</span>
                </div>
                <div className="text-center text-slate-500 font-bold mb-4">↓</div>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-3xl font-black text-yellow-600">{exchangeAmount * 5}</span>
                  <span className="text-3xl">🧀</span>
                </div>
                <button
                  onClick={handleExchange}
                  className="w-full mt-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[25px] font-black shadow-lg transition-all active:scale-95"
                >
                  立即兑换
                </button>
              </div>

              <div className="bg-amber-100 rounded-[20px] p-4 border-2 border-amber-300">
                <p className="text-amber-800 font-bold text-sm">
                  💡 提示：胡萝卜可以通过赢得游戏获得，每赢一局 +1 胡萝卜
                </p>
              </div>
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-[30px] p-6 border-4 border-green-200">
                <h3 className="text-xl font-black text-green-800 mb-2 flex items-center gap-2">
                  <span className="text-3xl">💰</span> 奶酪存款
                </h3>
                <p className="text-green-600 text-sm font-bold mb-4">
                  年化利率 100%，每日结算利息
                </p>

                {/* 存入 */}
                <div className="bg-white rounded-[20px] p-4 mb-4">
                  <label className="block text-sm font-bold text-slate-500 mb-2">存入金额</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-4 py-2 rounded-[15px] border-2 border-green-200 font-bold"
                      min="1"
                    />
                    <span className="text-2xl">🧀</span>
                  </div>
                  <button
                    onClick={handleDeposit}
                    className="w-full mt-3 py-3 bg-green-500 hover:bg-green-600 text-white rounded-[20px] font-black transition-all active:scale-95"
                  >
                    存入
                  </button>
                </div>

                {/* 取出 */}
                <div className="bg-white rounded-[20px] p-4">
                  <label className="block text-sm font-bold text-slate-500 mb-2">取出金额</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-4 py-2 rounded-[15px] border-2 border-emerald-200 font-bold"
                      min="1"
                      max={summary?.cheeseDeposits || 0}
                    />
                    <span className="text-2xl">🧀</span>
                  </div>
                  <button
                    onClick={handleWithdraw}
                    className="w-full mt-3 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[20px] font-black transition-all active:scale-95"
                  >
                    取出
                  </button>
                </div>
              </div>

              <div className="bg-green-50 rounded-[20px] p-4 border-2 border-green-200">
                <p className="text-green-800 font-bold text-sm">
                  💡 当前存款：{summary?.cheeseDeposits || 0} 奶酪<br/>
                  💡 日利息：{summary && summary.cheeseDeposits > 0 ? (summary.cheeseDeposits / 365).toFixed(2) : 0} 奶酪<br/>
                  💡 年利息：{summary?.cheeseDeposits || 0} 奶酪（100% 利率）
                </p>
              </div>
            </div>
          )}

          {activeTab === 'loan' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-[30px] p-6 border-4 border-red-200">
                <h3 className="text-xl font-black text-red-800 mb-2 flex items-center gap-2">
                  <span className="text-3xl">🏦</span> 奶酪贷款
                </h3>
                <p className="text-red-600 text-sm font-bold mb-4">
                  年化利率 200%，期限一年
                </p>

                {/* 贷款 */}
                <div className="bg-white rounded-[20px] p-4 mb-4">
                  <label className="block text-sm font-bold text-slate-500 mb-2">贷款金额</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Math.max(10, parseInt(e.target.value) || 10))}
                      className="flex-1 px-4 py-2 rounded-[15px] border-2 border-red-200 font-bold"
                      min="10"
                    />
                    <span className="text-2xl">🧀</span>
                  </div>
                  <p className="text-xs text-red-500 font-bold mt-2">
                    一年后需归还：{loanAmount * 3} 奶酪（本金 +200% 利息）
                  </p>
                  <button
                    onClick={handleTakeLoan}
                    className="w-full mt-3 py-3 bg-red-500 hover:bg-red-600 text-white rounded-[20px] font-black transition-all active:scale-95"
                  >
                    贷款
                  </button>
                </div>

                {/* 还款 */}
                <div className="bg-white rounded-[20px] p-4">
                  <label className="block text-sm font-bold text-slate-500 mb-2">还款金额</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-4 py-2 rounded-[15px] border-2 border-rose-200 font-bold"
                      min="1"
                    />
                    <span className="text-2xl">🧀</span>
                  </div>
                  <button
                    onClick={handleRepayLoan}
                    className="w-full mt-3 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-[20px] font-black transition-all active:scale-95"
                  >
                    还款
                  </button>
                </div>
              </div>

              <div className="bg-red-50 rounded-[20px] p-4 border-2 border-red-200">
                <p className="text-red-800 font-bold text-sm">
                  💡 当前贷款：{summary?.cheeseLoans || 0} 奶酪<br/>
                  ⚠️ 贷款需谨慎，到期请按时还款
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheeseBankModal;
