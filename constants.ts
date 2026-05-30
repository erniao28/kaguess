// Fix: Removed non-existent Punishment type from import to resolve module resolution error
import { ForbiddenWord } from './types';

// 奶酪央行荣誉董事档案码
export const CHEESE_BANK_HONORARY_DIRECTORS = {
  FOX: {
    code: 'KADEGOU',
    name: '尼克',
    role: 'FOX',
    title: '荣誉董事'
  },
  BUNNY: {
    code: 'JINNALUV',
    name: '新董事',
    role: 'BUNNY',
    title: '荣誉董事'
  }
};

// 胡萝卜兑换比例
export const CARROT_TO_CHEESE_RATE = 5;

// 存款年利率
export const DEPOSIT_APY = 1.0; // 100%

// 贷款年利率
export const LOAN_APY = 2.0; // 200%

// 高频常用汉字字库 - 越常用的字越难防守
export const FORBIDDEN_WORDS: ForbiddenWord[] = [
  { char: '我', frequency: '极高', difficulty: '极难', description: '第一人称代词，几乎无法回避。' },
  { char: '你', frequency: '极高', difficulty: '极难', description: '第二人称代词，对话必备。' },
  { char: '的', frequency: '极高', difficulty: '极难', description: '现代汉语中使用频率最高的字。' },
  { char: '是', frequency: '极高', difficulty: '极难', description: '判断动词，说话很难不带它。' },
  { char: '了', frequency: '极高', difficulty: '中等', description: '时态助词，注意说话结尾。' },
  { char: '不', frequency: '极高', difficulty: '中等', description: '否定词，表达意见时要小心。' },
  { char: '在', frequency: '极高', difficulty: '中等', description: '介词/动词，描述状态时常用。' },
  { char: '有', frequency: '极高', difficulty: '中等', description: '存现动词。' },
  { char: '这', frequency: '极高', difficulty: '中等', description: '指示代词。' },
  { char: '个', frequency: '极高', difficulty: '简单', description: '通用量词。' },
  { char: '说', frequency: '高', difficulty: '简单', description: '引述或表达时常用。' },
  { char: '好', frequency: '高', difficulty: '简单', description: '肯定性回复的常用字。' },
  { char: '就', frequency: '高', difficulty: '中等', description: '副词，口语中频繁出现。' },
  { char: '想', frequency: '高', difficulty: '简单', description: '表达意愿。' },
  { char: '真', frequency: '高', difficulty: '简单', description: '加强语气的常用字。' },
  { char: '看', frequency: '高', difficulty: '简单', description: '动作动词。' },
  { char: '都', frequency: '高', difficulty: '简单', description: '范围副词。' },
  { char: '去', frequency: '高', difficulty: '简单', description: '趋向动词。' },
];

export const TRUTH_PUNISHMENTS: string[] = [
  "你最近一次撒谎是什么时候？",
  "如果你能穿越回过去，你会改变哪件事？",
  "当众分享你最尴尬的一次经历。",
  "你手机里最后一条搜索记录是什么？",
  "如果不考虑金钱，你最想从事什么职业？",
  "你对在座的某位异性第一印象是什么？",
  "你收过最奇葩的礼物是什么？",
  "你谈过最长的一次恋爱是多久？"
];

export const DARE_PUNISHMENTS: string[] = [
  "向你微信置顶的人发一句'我想你了'。",
  "模仿一个你认识的搞笑角色，持续30秒。",
  "原地跳一段你觉得最傻的舞。",
  "大喊三声：'我是世界上最美/最帅的人！'",
  "让对方在你的脸上画一个小猫胡须。",
  "用屁股写出你的名字。",
  "闭上眼睛，让对方给你喂一样食物。",
  "对着窗外大喊一声'我爱这个世界'。"
];

// 聊天室家具目录
export const FURNITURE_CATALOG = [
  { id: 'cushion-cat', name: '猫咪坐垫', icon: '🐱', cost: 5, description: '软绵绵的猫咪坐垫，放在窗台上', type: 'floor' },
  { id: 'vase-flower', name: '花瓶', icon: '🌺', cost: 8, description: '精美的花瓶，插上鲜花点缀房间', type: 'floor' },
  { id: 'bookshelf', name: '书架', icon: '📚', cost: 15, description: '装满书籍的小书架', type: 'floor' },
  { id: 'lamp-star', name: '星星灯', icon: '⭐', cost: 10, description: '温暖的星星灯，营造氛围', type: 'wall' },
  { id: 'beanbag', name: '懒人沙发', icon: '🛋️', cost: 20, description: '超舒服的懒人沙发', type: 'floor' },
  { id: 'plant', name: '绿植盆栽', icon: '🪴', cost: 8, description: '清新的绿植，净化空气', type: 'floor' },
  { id: 'picture', name: '装饰画', icon: '🖼️', cost: 12, description: '精美的装饰画挂在墙上', type: 'wall' },
  { id: 'clock', name: '挂钟', icon: '🕐', cost: 10, description: '复古挂钟，记录美好时光', type: 'wall' },
  { id: 'rainbow', name: '彩虹', icon: '🌈', cost: 30, description: '架在房间上方的彩虹', type: 'ceiling' },
  { id: 'fireplace', name: '壁炉', icon: '🔥', cost: 50, description: '温暖的壁炉，冬日必备', type: 'floor' },
  { id: 'piano', name: '钢琴', icon: '🎹', cost: 40, description: '优雅的三角钢琴', type: 'floor' },
  { id: 'telescope', name: '望远镜', icon: '🔭', cost: 25, description: '探索星空的望远镜', type: 'floor' },
  // 魔法主题新增
  { id: 'candelabra', name: '漂浮烛台', icon: '🕯️', cost: 25, description: '悬在半空的魔法烛台，永不熄灭', type: 'ceiling' },
  { id: 'carpet', name: '魔法飞毯', icon: '🧶', cost: 35, description: '传说中的波斯飞毯，现在用来当地毯', type: 'floor' },
  { id: 'spinning-wheel', name: '纺车', icon: '🪀', cost: 30, description: '沉睡魔咒中的纺车，碰不得！', type: 'floor' },
  { id: 'crystal-table', name: '水晶球台', icon: '🔮', cost: 45, description: '能照见未来的水晶球', type: 'floor' },
  { id: 'magic-scroll', name: '魔法卷轴', icon: '📜', cost: 20, description: '古代巫师留下的预言卷轴', type: 'wall' },
  { id: 'castle-mini', name: '微型城堡', icon: '🏰', cost: 60, description: '缩小版魔法城堡，可以住进去', type: 'floor' },
  { id: 'broom', name: '飞天扫帚', icon: '🧹', cost: 28, description: '仙尘瑞拉的飞行工具', type: 'wall' },
  { id: 'hourglass', name: '沙漏', icon: '⏳', cost: 18, description: '美人鱼的魔法沙漏', type: 'floor' },
  { id: 'sword-stand', name: '石中剑', icon: '⚔️', cost: 55, description: '唯有纯洁之心才能拔出', type: 'floor' },
  { id: 'magic-carpet', name: '阿拉丁飞毯', icon: '🪈', cost: 40, description: 'I be your slave for the rest of my life~', type: 'floor' },
  { id: 'magic-mirror', name: '魔镜', icon: '🪞', cost: 48, description: '魔镜魔镜，谁是世界上最美的人？', type: 'wall' },
  { id: 'dragon-egg', name: '龙蛋', icon: '🥚', cost: 70, description: '传说中会孵出小龙的蛋', type: 'floor' },
  { id: 'lantern', name: '孔明灯', icon: '🏮', cost: 32, description: '魔发奇缘中的发光灯', type: 'ceiling' },
  { id: 'rose-glass', name: '魔法玫瑰', icon: '🌹', cost: 52, description: '被施了咒语的玫瑰，花瓣飘落时...', type: 'floor' },
  { id: 'music-box', name: '音乐盒', icon: '🎵', cost: 22, description: '播放永恒旋律的魔法音乐盒', type: 'floor' },
];