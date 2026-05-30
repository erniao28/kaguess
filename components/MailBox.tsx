import React, { useState, useEffect } from 'react';

interface Notification {
  id: number;
  player_code: string;
  type: string;
  title: string;
  content: string;
  related_player_code: string | null;
  is_read: number;
  created_at: number;
}

interface MailBoxProps {
  socket: any;
  playerCode: string | null;
  isOpen: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  unreadCount?: number;
  onRequestUnreadCount?: () => void;
  onRequestNotifications?: () => void;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  'carrot_reward': '🥕',
  'system': '📢',
  'cheese': '🧀',
  'pet': '🐾',
};

const MailBox: React.FC<MailBoxProps> = ({
  socket,
  playerCode,
  isOpen,
  onOpen,
  onClose,
  unreadCount = 0,
  onRequestUnreadCount,
  onRequestNotifications,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleNotificationsList = (list: Notification[]) => {
      setNotifications(list);
    };

    socket.on('notifications_list', handleNotificationsList);

    // 初始请求
    if (playerCode && onRequestUnreadCount) {
      onRequestUnreadCount();
    }

    return () => {
      socket.off('notifications_list', handleNotificationsList);
    };
  }, [socket, playerCode, onRequestUnreadCount]);

  const handleOpen = () => {
    onOpen?.();
    if (socket && playerCode && onRequestNotifications) {
      onRequestNotifications();
    }
  };

  const handleClose = () => {
    onClose?.();
    // 全部标记已读
    if (socket && playerCode && unreadCount > 0) {
      socket.emit('mark_all_notifications_read');
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    const date = new Date(timestamp * 1000);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getNotificationIcon = (type: string) => {
    return NOTIFICATION_ICONS[type] || '📌';
  };

  return (
    <>
      {/* 信箱弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[40px] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-center relative flex-shrink-0">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white font-bold transition-all"
              >
                ✕
              </button>
              <div className="text-4xl mb-2">📬</div>
              <h2 className="text-2xl font-black text-white">我的信箱</h2>
              <p className="text-amber-100 text-sm mt-1">系统通知与消息</p>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {notifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-slate-400 font-bold">暂无消息</p>
                  <p className="text-slate-300 text-sm mt-1">获得胡萝卜奖励后会有通知</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        notification.is_read
                          ? 'bg-white/60 border-slate-100 opacity-70'
                          : 'bg-white border-amber-200 shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className={`text-sm truncate ${
                              notification.is_read ? 'text-slate-500' : 'text-slate-800 font-black'
                            }`}>
                              {notification.title}
                            </h3>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 leading-relaxed ${
                            notification.is_read ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {notification.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MailBox;
