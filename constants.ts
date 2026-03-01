// Fix: Removed non-existent Punishment type from import to resolve module resolution error
import { ForbiddenWord } from './types';

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