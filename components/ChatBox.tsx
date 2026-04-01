import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, EMOJI_LIST } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, type: 'text' | 'emoji' | 'image') => void;
  isConnected: boolean;
  mySocketId?: string | null;
  onClearHistory?: () => void;
  chatFontSize?: number;
  chatBgImage?: string;
  onFontChange?: (size: number) => void;
  onBgChange?: (image: string) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isConnected,
  mySocketId,
  onClearHistory,
  chatFontSize = 14,
  chatBgImage = '',
  onFontChange,
  onBgChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 请求桌面通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 新消息桌面通知
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const newMsg = messages[messages.length - 1];
      const isMe = mySocketId ? newMsg.senderId === mySocketId : false;

      // 只通知其他人的消息
      if (!isMe && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${newMsg.senderName} 发来新消息`, {
          body: newMsg.type === 'image' ? '[图片]' : newMsg.content.substring(0, 50),
          icon: '/favicon.ico'
        });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, mySocketId]);

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

    onSendMessage(trimmed, type);
    setInputValue('');
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  return (
    <div
      className={`rounded-[20px] shadow-xl border-4 border-slate-100 overflow-hidden flex flex-col h-[400px] transition-colors ${
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
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 flex items-center justify-between relative z-10">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          💬 聊天室
          {isConnected && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
        </h3>
        <div className="flex gap-2">
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
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            title="字体大小"
          >
            🔤
          </button>
          <button
            onClick={() => setShowBgPicker(!showBgPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            title="聊天背景"
          >
            🖼️
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            title="表情"
          >
            😀
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
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

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10" style={{ backgroundColor: chatBgImage ? 'transparent' : '#f1f5f9' }}>
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl mb-2 block">💬</span>
            开始聊天吧！
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = mySocketId ? msg.senderId === mySocketId : false;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isMe ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 shadow-md rounded-bl-sm'
                    }`}
                    style={{ fontSize: `${msg.type === 'emoji' ? chatFontSize * 2 : chatFontSize}px` }}
                  >
                    {/* 发送者名字 */}
                    {!isMe && (
                      <div className="text-xs font-bold mb-1 flex items-center gap-1" style={{ fontSize: `${chatFontSize - 2}px` }}>
                        {msg.senderRole === 'FOX' && <span>🦊</span>}
                        {msg.senderRole === 'BUNNY' && <span>🐰</span>}
                        {msg.senderName}
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
        <div ref={messagesEndRef} />
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
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "输入消息..." : "未连接"}
            disabled={!isConnected}
            className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-full focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
