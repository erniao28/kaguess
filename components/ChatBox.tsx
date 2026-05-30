import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, EMOJI_LIST } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, type: 'text' | 'emoji' | 'image') => void;
  isConnected: boolean;
  mySocketId?: string | null;
  myPlayerCode?: string | null;
  onClearHistory?: () => void;
  chatFontSize?: number;
  chatFontColor?: string;
  chatBgImage?: string;
  onFontChange?: (size: number) => void;
  onFontColorChange?: (color: string) => void;
  onBgChange?: (image: string) => void;
  onToggleNotification?: () => void;
  notificationEnabled?: boolean;
  canInteract?: boolean;
  warmTheme?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isConnected,
  mySocketId,
  myPlayerCode,
  onClearHistory,
  chatFontSize = 14,
  chatFontColor = '#1e293b',
  chatBgImage = '',
  onFontChange,
  onFontColorChange,
  onBgChange,
  onToggleNotification,
  notificationEnabled = false,
  canInteract = true,
  warmTheme = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showQuoteTarget, setShowQuoteTarget] = useState<ChatMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 加载用户偏好设置和草稿箱
  useEffect(() => {
    const saved = localStorage.getItem('chat_preferences');
    if (saved) {
      try {
        const { fontSize, fontColor } = JSON.parse(saved);
        if (fontSize && onFontChange) onFontChange(fontSize);
        if (fontColor && onFontColorChange) onFontColorChange(fontColor);
      } catch (e) {
        console.error('[CHAT] 加载偏好设置失败:', e);
      }
    }
    // 恢复草稿
    const draft = localStorage.getItem('chat_draft');
    if (draft) {
      setInputValue(draft);
    }
  }, []);

  const scrollToBottom = () => {
    // 使用容器内部滚动，而不是 scrollIntoView（会滚动整个页面）
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 不再自动请求通知权限，改为由用户点击铃铛按钮时主动触发
  // 自动请求在某些浏览器上会被静默拒绝（尤其移动端）

  // 新消息通知 - HTTPS 启用后使用桌面通知（最小化时也弹窗）
  const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
  const [newMessageSender, setNewMessageSender] = useState('');
  const [pendingNotifs, setPendingNotifs] = useState(0);
  const originalTitleRef = useRef(document.title);

  // 检测页面可见性
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  useEffect(() => {
    const handleVisibility = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      if (isVisible && pendingNotifs > 0) {
        setPendingNotifs(0);
        document.title = originalTitleRef.current;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pendingNotifs]);

  // 标题闪烁动画（备用方案）
  useEffect(() => {
    if (pendingNotifs <= 0 || isPageVisible) return;
    let blinkOn = false;
    const interval = setInterval(() => {
      blinkOn = !blinkOn;
      document.title = blinkOn ? `🔔 新消息 - ${originalTitleRef.current}` : originalTitleRef.current;
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingNotifs, isPageVisible]);

  // 新消息检测
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const newMsg = messages[messages.length - 1];
      // 关键修复：使用 playerCode 判断是否是自己
      const isMe = myPlayerCode ? newMsg.senderId === myPlayerCode : (mySocketId ? newMsg.senderId === mySocketId : false);

      // 只通知其他人的消息
      if (!isMe && notificationEnabled) {
        // 桌面通知（最小化时也弹窗）- 仅提示有新消息，不显示内容
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notif = new Notification('🔔 你有新消息', {
              body: '点击查看',
              tag: newMsg.id
            });
            notif.onclick = () => { window.focus(); notif.close(); };
          } catch (e) { /* ignore */ }
        }
        // 备用：标题闪烁（无论 Notification 是否可用都触发）
        if (document.hidden) {
          setPendingNotifs(prev => prev + 1);
        }
        // 应用内横幅
        setNewMessageSender(newMsg.senderName);
        setShowNewMessageBanner(true);
        setTimeout(() => setShowNewMessageBanner(false), 3000);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, myPlayerCode, mySocketId, notificationEnabled]);

  // 拖曳上传处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('只能拖曳图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onSendMessage(base64, 'image');
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected) return;

    // 判断消息类型
    let type: 'text' | 'emoji' | 'image' = 'text';
    const trimmed = inputValue.trim();

    // 如果是 base64 图片
    if (trimmed.startsWith('data:image/')) {
      type = 'image';
    }
    // 如果全是表情符号（可以多个）
    else if (/^[\p{Emoji}]+$/u.test(trimmed)) {
      type = 'emoji';
    }

    // 如果有引用目标，发送引用消息
    if (showQuoteTarget) {
      onSendMessage(JSON.stringify({ text: trimmed, quote: showQuoteTarget }), type);
      setShowQuoteTarget(null);
    } else {
      onSendMessage(trimmed, type);
    }
    setInputValue('');
    localStorage.removeItem('chat_draft');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    onSendMessage(emoji, 'emoji');
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onSendMessage(base64, 'image');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onBgChange?.(base64);
    };
    reader.readAsDataURL(file);

    if (bgInputRef.current) {
      bgInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleQuoteMessage = (msg: ChatMessage) => {
    setShowQuoteTarget(msg);
    setShowEmojiPicker(false);
  };

  const cancelQuote = () => {
    setShowQuoteTarget(null);
  };

  return (
    <div
      className={`rounded-[24px] shadow-xl border-4 border-slate-100 overflow-hidden flex flex-col h-[360px] transition-colors ${
        isDragging ? 'ring-4 ring-indigo-400 ring-dashed scale-[1.02]' : ''
      }`}
      style={{
        backgroundColor: chatBgImage ? 'transparent' : '#fff',
        backgroundImage: chatBgImage ? `url(${chatBgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 聊天标题 */}
      <div className={`${warmTheme ? 'bg-gradient-to-r from-yellow-700 to-amber-800' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} px-4 py-2.5 flex items-center justify-between relative z-10`}>
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          💬 聊天室
          {isConnected && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
        </h3>
        <div className="flex gap-1.5">
          {onClearHistory && (
            <button
              onClick={onClearHistory}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-xs"
              title="清空历史记录"
            >
              🗑️
            </button>
          )}
          <button
            onClick={onToggleNotification}
            className={`text-white hover:bg-white/20 rounded-full p-2 transition-colors text-sm ${
              notificationEnabled ? 'bg-green-500/30' : ''
            }`}
            title={notificationEnabled ? '已开启通知' : '点击开启通知'}
          >
            🔔
          </button>
          <button
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-sm"
            title="字体大小"
          >
            🔤
          </button>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-sm"
            title="字体颜色"
          >
            🎨
          </button>
          <button
            onClick={() => setShowBgPicker(!showBgPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-sm"
            title="聊天背景"
          >
            🖼️
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-sm"
            title="表情"
          >
            😀
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-sm"
            title="发送图片"
          >
            📷
          </button>
        </div>
      </div>

      {/* 字体大小选择器 */}
      {showFontPicker && (
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-2 z-10">
          <span className="text-xs text-slate-500 font-bold">字体：</span>
          {[12, 14, 16, 18, 20].map((size) => (
            <button
              key={size}
              onClick={() => {
                onFontChange?.(size);
                setShowFontPicker(false);
                // 保存偏好设置
                localStorage.setItem('chat_preferences', JSON.stringify({
                  fontSize: size,
                  fontColor: chatFontColor
                }));
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                chatFontSize === size
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-indigo-100'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}

      {/* 字体颜色选择器 */}
      {showColorPicker && (
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-2 z-10">
          <span className="text-xs text-slate-500 font-bold">颜色：</span>
          {['#1e293b', '#334155', '#475569', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#db2777'].map((color) => (
            <button
              key={color}
              onClick={() => {
                onFontColorChange?.(color);
                setShowColorPicker(false);
                // 保存偏好设置
                localStorage.setItem('chat_preferences', JSON.stringify({
                  fontSize: chatFontSize,
                  fontColor: color
                }));
              }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                chatFontColor === color
                  ? 'border-indigo-500 scale-110'
                  : 'border-slate-300 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* 背景选择器 */}
      {showBgPicker && (
        <div className="bg-slate-50 border-b border-slate-200 p-3 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold">聊天背景：</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onBgChange?.('');
                setShowBgPicker(false);
              }}
              className="px-3 py-1 bg-white border-2 border-slate-200 rounded-full text-xs font-bold hover:bg-indigo-50"
            >
              默认
            </button>
            <button
              onClick={() => bgInputRef.current?.click()}
              className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-200"
            >
              📁 上传图片
            </button>
          </div>
        </div>
      )}

      {/* 表情选择器 */}
      {showEmojiPicker && (
        <div className="bg-slate-50 border-b border-slate-200 p-3 grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className="text-2xl hover:bg-white rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* 隐藏的背景图片输入 */}
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        onChange={handleBgImageUpload}
        className="hidden"
      />

      {/* 拖曳提示 */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-3xl px-8 py-4 shadow-2xl font-black text-indigo-600 text-lg">
            📷 松开上传图片
          </div>
        </div>
      )}

      {/* 新消息横幅通知 */}
      {showNewMessageBanner && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 ${warmTheme ? 'bg-gradient-to-r from-yellow-700 to-amber-800' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-top-4 fade-in duration-300`}>
          <span className="font-black text-sm">📬 {newMessageSender} 发来新消息</span>
        </div>
      )}

      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10"
        style={{ backgroundColor: chatBgImage ? 'transparent' : (warmTheme ? '#fdf6e3' : '#f1f5f9') }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl mb-2 block">💬</span>
            开始聊天吧！
          </div>
        ) : (
          messages.map((msg) => {
            // 关键修复：使用 playerCode 判断是否是自己
            const isMe = myPlayerCode ? msg.senderId === myPlayerCode : (mySocketId ? msg.senderId === mySocketId : false);
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isMe ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? `${warmTheme ? 'bg-gradient-to-r from-yellow-700 to-amber-800' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} text-white rounded-br-sm`
                        : 'bg-white text-slate-800 shadow-md rounded-bl-sm'
                    }`}
                    style={{ fontSize: `${msg.type === 'emoji' ? chatFontSize * 2 : chatFontSize}px`, color: !isMe && msg.type !== 'emoji' ? chatFontColor : undefined }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!isMe) handleQuoteMessage(msg);
                    }}
                  >
                    {/* 发送者名字 - 双方都显示 */}
                    <div className="text-xs font-bold mb-1 flex items-center gap-1" style={{ fontSize: `${chatFontSize - 2}px` }}>
                      {msg.senderRole === 'FOX' && <span>🦊</span>}
                      {msg.senderRole === 'BUNNY' && <span>🐰</span>}
                      <span style={{ color: isMe ? 'inherit' : undefined }}>
                        {msg.senderName}{isMe ? ' (你)' : ''}
                      </span>
                    </div>

                    {/* 引用显示 */}
                    {msg.quote && (
                      <div className="mb-2 p-2 bg-white/20 rounded-lg border-l-2 border-white/50 text-xs opacity-80">
                        <div className="font-bold truncate">
                          {msg.quote.senderRole === 'FOX' ? '🦊' : '🐰'} {msg.quote.senderName}
                        </div>
                        <div className="truncate text-xs opacity-70">
                          {msg.quote.type === 'image' ? '[图片]' : msg.quote.content.substring(0, 30)}
                        </div>
                      </div>
                    )}

                    {/* 消息内容 */}
                    {msg.type === 'image' ? (
                      <div className="space-y-1">
                        <img
                          src={msg.content}
                          alt="聊天图片"
                          className="max-w-full rounded-lg cursor-pointer"
                          onClick={() => setShowImagePreview(msg.content)}
                        />
                      </div>
                    ) : (
                      <div className={`break-words ${msg.type === 'emoji' ? '' : ''}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                  <div className={`text-xs text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`} style={{ fontSize: `${chatFontSize - 2}px` }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 图片预览模态框 */}
      {showImagePreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImagePreview(null)}
        >
          <img
            src={showImagePreview}
            alt="预览"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setShowImagePreview(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:scale-110 transition-transform"
          >
            ×
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <form
        className="border-t border-slate-200 p-2.5 bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
        {/* 游客模式提示 */}
        {!canInteract && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
            <span className="text-amber-600 font-bold text-xs">🔒 游客模式，无法发送消息</span>
          </div>
        )}
        {/* 引用回复提示 */}
        {showQuoteTarget && (
          <div className="mb-2 p-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <span className="text-indigo-600 font-bold text-xs">回复</span>
              <span className="text-xs text-slate-500 truncate">
                {showQuoteTarget.senderName}: {showQuoteTarget.type === 'image' ? '[图片]' : showQuoteTarget.content.substring(0, 30)}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelQuote}
              className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              localStorage.setItem('chat_draft', e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSend();
                return false;
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            placeholder={canInteract ? (isConnected ? "输入消息..." : "未连接") : "游客模式，请先登录"}
            disabled={!canInteract || !isConnected}
            className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-full focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSend();
            }}
            disabled={!inputValue.trim() || !isConnected || !canInteract}
            className={`px-5 py-2 ${warmTheme ? 'bg-gradient-to-r from-yellow-700 to-amber-800' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} text-white rounded-full font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
