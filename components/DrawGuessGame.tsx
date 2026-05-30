import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player } from '../types';

interface Props {
  socket: any;
  roomId: string;
  playerRole: 'FOX' | 'BUNNY' | null;
  playerProfile: any;
  players: Player[];
  onBack: () => void;
  drawRound: any;
  onRoundUpdate: (round: any) => void;
}

const COLORS = ['#1e293b', '#dc2626', '#ea580c', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const LINE_WIDTHS = [2, 4, 8, 12];

const DrawGuessGame: React.FC<Props> = ({
  socket, roomId, playerRole, playerProfile, players, onBack, drawRound, onRoundUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [showWord, setShowWord] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState('');
  const [correctMsg, setCorrectMsg] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [wrongGuesses, setWrongGuesses] = useState<{playerName: string, answer: string, isCorrect?: boolean}[]>([]);
  const strokesRef = useRef<any[]>([]);
  const timerRef = useRef<number | null>(null);

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 绘制笔画
  const drawStroke = useCallback((points: {x: number, y: number}[], color: string, width: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }, []);

  // 重绘所有笔画（用于清空恢复等）
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach(stroke => {
      drawStroke(stroke.points, stroke.color, stroke.lineWidth);
    });
  }, [drawStroke]);

  // 接收远程笔画
  useEffect(() => {
    if (!socket) return;
    const handleStroke = (data: { points: {x: number, y: number}[], color: string, lineWidth: number }) => {
      drawStroke(data.points, data.color, data.lineWidth);
      strokesRef.current.push(data);
    };
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#ffffff';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      strokesRef.current = [];
    };
    const handleCorrect = ({ guessedBy, word }: { guessedBy: string, word: string }) => {
      setCorrectMsg(`🎉 ${guessedBy} 猜对了！答案是「${word}」`);
      setTimeout(() => setCorrectMsg(''), 4000);
    };
    const handleRoundStart = (data: any) => {
      onRoundUpdate(data);
      // 清空画布
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx!.fillStyle = '#ffffff';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }
      strokesRef.current = [];
      // 清空猜测记录
      setWrongGuesses([]);
      // 检查自己是否是画画者
      if (data.drawerCode === playerProfile?.playerCode) {
        setShowWord(true);
      } else {
        setShowWord(false);
      }
      if (data.timerEnabled) {
        setTimerEnabled(true);
        setTimerSeconds(data.timerSeconds || 120);
      } else {
        setTimerEnabled(false);
        setTimerSeconds(0);
      }
      setCorrectMsg('');
    };
    const handleRoundEnd = (data: any) => {
      onRoundUpdate(data);
      setShowWord(false);
      // 清空画布
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx!.fillStyle = '#ffffff';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }
      strokesRef.current = [];
      setTimerSeconds(0);
      setTimerEnabled(false);
      if (data.drawerCode === playerProfile?.playerCode) {
        setShowWord(true);
      }
    };
    const handlePlayerLeft = ({ playerName }: { playerName: string }) => {
      setCorrectMsg(`⏸️ ${playerName} 暂时离开，等待重连...`);
    };

    socket.on('draw_stroke', handleStroke);
    socket.on('draw_clear', handleClear);
    socket.on('draw_correct', handleCorrect);
    socket.on('draw_next_round', handleRoundStart);
    socket.on('draw_round_start', handleRoundEnd);
    socket.on('draw_player_left', handlePlayerLeft);
    socket.on('draw_guess_update', (data: { playerName: string, answer: string, isCorrect?: boolean }) => {
      setWrongGuesses(prev => [...prev, data]);
    });

    return () => {
      socket.off('draw_stroke', handleStroke);
      socket.off('draw_clear', handleClear);
      socket.off('draw_correct', handleCorrect);
      socket.off('draw_next_round', handleRoundStart);
      socket.off('draw_round_start', handleRoundEnd);
      socket.off('draw_player_left', handlePlayerLeft);
      socket.off('draw_guess_update');
    };
  }, [socket, playerProfile, onRoundUpdate, drawStroke]);

  // 计时器
  useEffect(() => {
    if (timerEnabled && timerSeconds > 0) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            socket?.emit('draw_time_up', { roomId });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnabled, timerSeconds, socket, roomId]);

  // 更新计时器显示
  useEffect(() => {
    if (timerSeconds > 0) {
      const min = Math.floor(timerSeconds / 60);
      const sec = timerSeconds % 60;
      setTimerDisplay(`${min}:${sec.toString().padStart(2, '0')}`);
    } else if (timerEnabled) {
      setTimerDisplay('⏱️ 时间到');
    } else {
      setTimerDisplay('⏱️ 不计时');
    }
  }, [timerSeconds, timerEnabled]);

  // Canvas 鼠标事件
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isDrawer = drawRound?.drawerCode === playerProfile?.playerCode;
    if (!isDrawer) return;
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    drawStroke([pos, pos], isEraser ? '#ffffff' : currentColor, isEraser ? 20 : lineWidth);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const isDrawer = drawRound?.drawerCode === playerProfile?.playerCode;
    if (!isDrawer) return;
    const pos = getCanvasPos(e);
    drawStroke([pos, pos], isEraser ? '#ffffff' : currentColor, isEraser ? 20 : lineWidth);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  // 发送笔画到服务器
  const sendStroke = useCallback((points: {x: number, y: number}[]) => {
    if (points.length < 2) return;
    const strokeData = {
      points,
      color: isEraser ? '#ffffff' : currentColor,
      lineWidth: isEraser ? 20 : lineWidth
    };
    strokesRef.current.push(strokeData);
    socket?.emit('draw_stroke', { roomId, ...strokeData });
  }, [socket, roomId, currentColor, lineWidth, isEraser]);

  // 监听鼠标移动，收集笔画点
  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  const handleMouseDownWithSend = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isDrawer = drawRound?.drawerCode === playerProfile?.playerCode;
    if (!isDrawer) return;
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    drawStroke([pos, pos], isEraser ? '#ffffff' : currentColor, isEraser ? 20 : lineWidth);
  };

  const handleMouseMoveWithSend = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const isDrawer = drawRound?.drawerCode === playerProfile?.playerCode;
    if (!isDrawer) return;
    const pos = getCanvasPos(e);
    if (lastPosRef.current) {
      const points = [lastPosRef.current, pos];
      drawStroke(points, isEraser ? '#ffffff' : currentColor, isEraser ? 20 : lineWidth);
      sendStroke(points);
    }
    lastPosRef.current = pos;
  };

  const handleMouseUpWithSend = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  // 清空画布
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx!.fillStyle = '#ffffff';
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    socket?.emit('draw_clear', { roomId });
  };

  // 提交猜测
  const handleGuess = () => {
    if (!guessInput.trim()) return;
    socket?.emit('draw_guess', { roomId, answer: guessInput.trim(), playerCode: playerProfile?.playerCode, playerName: playerProfile?.nickname });
    setGuessInput('');
  };

  // 判断是否是画画者
  const isDrawer = drawRound?.drawerCode === playerProfile?.playerCode;

  // 获取对方昵称
  const otherPlayer = players.find(p => p.playerCode !== playerProfile?.playerCode);
  const otherName = otherPlayer?.name || '对方';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-in zoom-in-95 duration-300">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between bg-white rounded-[30px] p-4 shadow-xl border-4 border-slate-100">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🎨</span>
          <span className="text-xl font-black text-slate-800">你画我猜</span>
          {correctMsg && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-black text-sm animate-in fade-in">{correctMsg}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full font-black text-sm ${timerEnabled ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
            {timerDisplay}
          </span>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-full bg-slate-200 text-slate-700 font-black hover:bg-slate-300 transition-all"
            title="暂时隐藏画板（游戏仍在进行，可随时重新加入）"
          >
            ↩️ 收起画板
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 画布区域 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[30px] p-4 shadow-xl border-4 border-slate-100" ref={containerRef}>
            {/* 回合信息 */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-black text-slate-600">
                {isDrawer ? (
                  <span>🎨 你在画画！给对方猜「<span className="text-indigo-600">{drawRound?.myWord || drawRound?.word || '???'}</span>」</span>
                ) : (
                  <span>👀 看 {drawRound?.drawerName || otherName} 画画，猜词吧！</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs font-black">
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">🦊 {drawRound?.score?.[drawRound?.drawerCode] || 0}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">🐰 {drawRound?.score?.[drawRound?.guesserCode] || 0}</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="w-full rounded-2xl border-2 border-slate-200 cursor-crosshair touch-none"
              style={{ backgroundColor: '#fff' }}
              onMouseDown={handleMouseDownWithSend}
              onMouseMove={handleMouseMoveWithSend}
              onMouseUp={handleMouseUpWithSend}
              onMouseLeave={handleMouseUpWithSend}
            />

            {/* 猜词者输入框 */}
            {!isDrawer && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={e => setGuessInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGuess(); }}
                  placeholder="输入你的猜测..."
                  className="flex-1 px-4 py-3 rounded-full border-2 border-slate-200 font-bold text-sm outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleGuess}
                  disabled={!guessInput.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-black hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  提交
                </button>
              </div>
            )}

            {/* 画画者词提示 */}
            {isDrawer && showWord && (
              <div className="mt-3 p-4 bg-indigo-50 rounded-2xl border-2 border-indigo-200 text-center">
                <div className="text-xs font-black text-indigo-400 mb-1">你要画的词</div>
                <div className="text-3xl font-black text-indigo-700">{drawRound?.myWord || drawRound?.word || '???'}</div>
              </div>
            )}

            {/* 猜测记录（仅画画者可见，让玩家看到别人猜了什么） */}
            {isDrawer && wrongGuesses.length > 0 && (
              <div className="mt-2 p-3 bg-rose-50 rounded-2xl border-2 border-rose-200">
                <div className="text-xs font-black text-rose-400 mb-1">🤔 猜测记录</div>
                <div className="flex flex-wrap gap-2">
                  {wrongGuesses.map((g, i) => (
                    <span key={i} className={`px-3 py-1 bg-white rounded-full text-xs font-bold border ${
                      g.isCorrect ? 'text-green-700 border-green-300 bg-green-50' : 'text-rose-600 border-rose-200'
                    }`}>
                      {g.isCorrect ? '✓' : ''} {g.playerName} 猜：{g.answer}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 工具栏 */}
        <div className="space-y-3">
          {/* 颜色选择 */}
          <div className="bg-white rounded-[24px] p-4 shadow-xl border-4 border-slate-100">
            <div className="text-xs font-black text-slate-500 mb-2">🎨 颜色</div>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setCurrentColor(c); setIsEraser(false); }}
                  className={`w-full aspect-square rounded-xl transition-all ${currentColor === c && !isEraser ? 'ring-4 ring-indigo-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 画笔粗细 */}
          <div className="bg-white rounded-[24px] p-4 shadow-xl border-4 border-slate-100">
            <div className="text-xs font-black text-slate-500 mb-2">✏️ 粗细</div>
            <div className="flex gap-2">
              {LINE_WIDTHS.map(w => (
                <button
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${lineWidth === w ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-current" style={{ width: `${w * 2}px`, height: `${w * 2}px` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 橡皮擦 & 清空 */}
          <div className="bg-white rounded-[24px] p-4 shadow-xl border-4 border-slate-100 space-y-2">
            <button
              onClick={() => setIsEraser(!isEraser)}
              className={`w-full py-3 rounded-xl font-black text-sm transition-all ${isEraser ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              🧹 橡皮擦
            </button>
            <button
              onClick={handleClear}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 transition-all"
            >
              🗑️ 清空画布
            </button>
          </div>

          {/* 计时器开关 */}
          <div className="bg-white rounded-[24px] p-4 shadow-xl border-4 border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500">⏱️ 计时模式</span>
              <button
                onClick={() => {
                  setTimerEnabled(!timerEnabled);
                  socket?.emit('draw_toggle_timer', { roomId, enabled: !timerEnabled, seconds: 120 });
                }}
                className={`w-12 h-6 rounded-full transition-all ${timerEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all ${timerEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* 回合控制 */}
          <div className="bg-white rounded-[24px] p-4 shadow-xl border-4 border-slate-100 space-y-2">
            <button
              onClick={() => socket?.emit('draw_next_round', { roomId })}
              className="w-full py-3 rounded-xl bg-green-500 text-white font-black text-sm hover:bg-green-600 transition-all"
            >
              ⏭️ 下一轮（手动切换画手）
            </button>
            <div className="text-xs text-slate-400 font-bold text-center px-2">
              猜对答案后会自动进入下一轮，也可手动点击跳过
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2">
              <button
                onClick={() => socket?.emit('draw_game_end', { roomId })}
                className="w-full py-3 rounded-xl bg-slate-200 text-slate-600 font-black text-sm hover:bg-rose-500 hover:text-white transition-all"
              >
                🚪 结束你画我猜（返回禁语模式）
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawGuessGame;
