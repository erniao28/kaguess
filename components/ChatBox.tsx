import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, EMOJI_LIST } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, type: 'text' | 'emoji' | 'image') => void;
  isConnected: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isConnected }) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected) return;

    // 判断消息类型
    let type: 'text' | 'emoji' | 'image' = 'text';
    if (EMOJI_LIST.includes(inputValue.trim())) {
      type = 'emoji';
    }

    onSendMessage(inputValue.trim(), type);
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
    <div className="bg-white rounded-[20px] shadow-xl border-4 border-slate-100 overflow-hidden flex flex-col h-[400px]">
      {/* 聊天标题 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          💬 聊天室
          {isConnected && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
        </h3>
        <div className="flex gap-2">
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
            title="图片"
          >
            🖼️
          </button>
        </div>
      </div>

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

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl mb-2 block">💬</span>
            开始聊天吧！
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === 'me';
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
                  >
                    {/* 发送者名字 */}
                    {!isMe && (
                      <div className="text-xs font-bold mb-1 flex items-center gap-1">
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
                      <div className={`break-words ${msg.type === 'emoji' ? 'text-3xl' : ''}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                  <div className={`text-xs text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
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
