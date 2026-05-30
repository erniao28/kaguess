import React from 'react';

interface Theme {
  id: string;
  name: string;
  icon: string;
  headerBg: string;
  borderColor: string;
  bg: string;
  accent: string;
}

interface ChatRoomThemeProps {
  themes: Theme[];
  currentTheme: string;
  onSelect: (themeId: string) => void;
  onClose: () => void;
}

const ChatRoomTheme: React.FC<ChatRoomThemeProps> = ({
  themes,
  currentTheme,
  onSelect,
  onClose
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-50">
      <div className="bg-white rounded-[32px] shadow-2xl border-4 border-indigo-200 p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">🎨 选择主题</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold transition-all"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themes.map(theme => (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`relative rounded-2xl p-4 text-center transition-all ${
                currentTheme === theme.id
                  ? 'ring-4 ring-indigo-500 scale-105 shadow-lg'
                  : 'hover:scale-105'
              }`}
              style={{ background: theme.bg }}
            >
              <div className="text-3xl mb-2">{theme.icon}</div>
              <div className="font-bold text-sm" style={{ color: theme.accent }}>
                {theme.name}
              </div>
              {currentTheme === theme.id && (
                <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatRoomTheme;
