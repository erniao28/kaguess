import React, { useState, useEffect } from 'react';

interface Frame {
  id: string;
  theme: 'zootopia' | 'aries' | 'base' | 'nannan' | 'cinnamoroll' | 'f1' | 'transformers' | 'love';
  title: string;
  content: string;
  style: 'vintage' | 'warm' | 'romantic' | 'modern' | 'cute';
  duration: number; // 显示时长（秒）
  backgroundImage?: string;
  effects: string[];
}

const BIRTHDAY_FRAMES: Frame[] = [
  {
    id: '1',
    theme: 'zootopia',
    title: '🦊 疯狂动物城',
    content: '托腮 929 托腮',
    style: 'modern',
    duration: 3,
    effects: ['🦊', '🐰', '🚔']
  },
  {
    id: '2',
    theme: 'base',
    title: '📍 XX 基地',
    content: '给你过生日也过去一年了，自从认识你开始，发生了超级超级多的故事',
    style: 'vintage',
    duration: 5,
    effects: ['🏠', '✨', '📸']
  },
  {
    id: '3',
    theme: 'nannan',
    title: '👧 囡囡',
    content: '囡囡初长成',
    style: 'warm',
    duration: 3,
    effects: ['🌸', '💕', '✨']
  },
  {
    id: '4',
    theme: 'f1',
    title: '🏎️ F1 赛车手',
    content: '一个喜欢 F1、网球和高尔夫的少女，不知道小时候的囡囡是怎么学这些的，背着个大书包，去各种活动，托腮思，想听你说你以前的故事，想知道囡囡怎么长大',
    style: 'modern',
    duration: 8,
    effects: ['🏎️', '🎾', '⛳', '🎒']
  },
  {
    id: '5',
    theme: 'base',
    title: '💼 女精英',
    content: '女精英，上班风一样的女子',
    style: 'modern',
    duration: 3,
    effects: ['💼', '⚡', '👠']
  },
  {
    id: '6',
    theme: 'base',
    title: '👩‍🏫 肖老师',
    content: '严厉的肖老师，带我走进投资的大门，大脑 cpu 疯狂运转的投资大师，你在说你投资思路的时候，超级无敌有魅力，爱看',
    style: 'warm',
    duration: 6,
    effects: ['📊', '🧠', '💡', '❤️']
  },
  {
    id: '7',
    theme: 'nannan',
    title: '👨‍👧 肖妈妈',
    content: '肖妈妈超级粘你的，也不知道你哪里吸引人了，让人欲罢不能',
    style: 'romantic',
    duration: 5,
    effects: ['👨‍👧', '💕', '🥰']
  },
  {
    id: '8',
    theme: 'nannan',
    title: '👶 女儿',
    content: '总觉得你像我的女儿，囡囡，超级乖巧又让人无敌担心的一个人',
    style: 'warm',
    duration: 5,
    effects: ['👶', '💝', '🌟']
  },
  {
    id: '9',
    theme: 'cute',
    title: '🐽 臭猪猪',
    content: '🐽🐽，你是臭猪，爱吃臭东西',
    style: 'cute',
    duration: 3,
    effects: ['🐽', '🍜', '😋']
  },
  {
    id: '10',
    theme: 'base',
    title: '🎨 艺术家',
    content: '艺术细胞爬满星空，想听你唱歌',
    style: 'romantic',
    duration: 4,
    effects: ['🎨', '🎤', '🌟', '🎵']
  },
  {
    id: '11',
    theme: 'base',
    title: '🏗️ 包工头',
    content: '装修包工头，不知道为啥，觉得以后我们会开一个设计公司，你是审美总监',
    style: 'modern',
    duration: 5,
    effects: ['🏗️', '🎨', '🏢', '✨']
  },
  {
    id: '12',
    theme: 'love',
    title: '❤️ 生日快乐',
    content: '祝你生日快乐，肖临晋！！！你的修勾胡峰',
    style: 'romantic',
    duration: 8,
    effects: ['❤️', '🎂', '🎉', '🎁', '🦊', '🐶']
  }
];

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

const BirthdayGallery: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFrame, setShowFrame] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentData = BIRTHDAY_FRAMES[currentFrame];

  useEffect(() => {
    // 显示当前相框
    setShowFrame(true);
    setProgress(0);

    // 进度条动画
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / currentData.duration / 10);
      });
    }, 100);

    // 自动切换到下一个相框
    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setShowFrame(false);

      setTimeout(() => {
        if (currentFrame < BIRTHDAY_FRAMES.length - 1) {
          setCurrentFrame(prev => prev + 1);
          setIsTransitioning(false);
        } else {
          // 最后一个相框，完成
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        }
      }, 800);
    }, currentData.duration * 1000);

    // 如果外部触发跳过，立即完成
    if (onSkip) {
      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [currentFrame, currentData.duration, onComplete, onSkip]);

  const getFrameStyle = (style: string) => {
    switch (style) {
      case 'vintage':
        return 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100 border-amber-600 sepia';
      case 'warm':
        return 'bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 border-pink-400';
      case 'romantic':
        return 'bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 border-purple-400';
      case 'modern':
        return 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 border-slate-400';
      case 'cute':
        return 'bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 border-yellow-400';
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getFilmGrain = () => (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
      <div className="w-full h-full" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black z-[400] flex items-center justify-center overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-radial from-indigo-900/30 via-black/50 to-black" />

      {/* 漂浮的粒子效果 */}
      <div className="absolute inset-0 overflow-hidden">
        {currentData.effects.map((effect, i) => (
          <div
            key={i}
            className="absolute text-4xl animate-pulse"
            style={{
              left: `${10 + (i * 15) % 80}%`,
              top: `${20 + (i * 17) % 60}%`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.6
            }}
          >
            {effect}
          </div>
        ))}
      </div>

      {/* 电影上下黑边 */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-10" />

      {/* 相框容器 */}
      <div
        className={`relative max-w-4xl w-full mx-8 transition-all duration-700 ${
          isTransitioning ? 'opacity-0 scale-95 translate-y-8' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* 相框主体 */}
        <div className={`relative rounded-2xl border-8 shadow-2xl overflow-hidden ${getFrameStyle(currentData.style)}`}>
          {/* 胶片颗粒效果 */}
          {getFilmGrain()}

          {/* 相框内容 */}
          <div className="relative p-12 md:p-16">
            {/* 主题标题 */}
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 tracking-wide">
                {currentData.title}
              </h2>
              <div className="flex justify-center gap-2">
                {currentData.effects.slice(0, 4).map((effect, i) => (
                  <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                    {effect}
                  </span>
                ))}
              </div>
            </div>

            {/* 祝福语内容 */}
            <div className="relative">
              <p className={`text-xl md:text-2xl leading-relaxed text-center font-medium ${
                currentData.style === 'vintage' ? 'text-amber-800' :
                currentData.style === 'warm' ? 'text-rose-800' :
                currentData.style === 'romantic' ? 'text-purple-800' :
                currentData.style === 'cute' ? 'text-orange-800' :
                'text-slate-800'
              }`}>
                {currentData.content}
              </p>
            </div>

            {/* 装饰角标 */}
            <div className="absolute top-4 left-4 text-4xl opacity-20">✨</div>
            <div className="absolute top-4 right-4 text-4xl opacity-20">✨</div>
            <div className="absolute bottom-4 left-4 text-4xl opacity-20">💫</div>
            <div className="absolute bottom-4 right-4 text-4xl opacity-20">💫</div>
          </div>

          {/* 进度条 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 相框计数 */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full">
            <span className="text-white/80 text-sm font-medium">
              第 {currentFrame + 1} 帧
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/60 text-sm font-medium">
              共 {BIRTHDAY_FRAMES.length} 帧
            </span>
          </div>
        </div>
      </div>

      {/* 最后的生日快乐大字 */}
      {currentFrame === BIRTHDAY_FRAMES.length - 1 && progress >= 100 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 animate-in zoom-in duration-1000">
          <div className="text-center">
            <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 mb-4 animate-pulse">
              🎂 生日快乐！🎂
            </div>
            <div className="text-2xl md:text-3xl text-white/80 font-medium">
              肖临晋！！！
            </div>
            <div className="text-xl text-white/60 mt-4">
              —— 你的修勾胡峰
            </div>
          </div>
        </div>
      )}

      {/* 跳过按钮 */}
      <button
        onClick={() => onSkip?.()}
        className="absolute top-4 right-4 z-30 px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white font-bold transition-all border-2 border-white/50"
      >
        ⏭️ 跳过
      </button>

      {/* CSS 动画定义 */}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        .bg-gradient-radial {
          background-image: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};

export default BirthdayGallery;
