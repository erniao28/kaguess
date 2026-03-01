
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  // Fix: Removed constructor-based initialization to comply with the requirement of instantiating right before the API call
  async getWordInsight(word: string) {
    try {
      // Fix: Always use named parameter for apiKey and obtain it exclusively from process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `作为一个游戏助手，请针对今天的禁语汉字“${word}”，提供一段有趣的挑战建议。内容包括：
        1. 为什么这个字很难避开。
        2. 给玩家一个建议，可以用什么词来代替它。
        3. 出一个包含这个字的脑筋急转弯。
        请用简洁幽默的中文回答。`,
      });
      // Fix: The response.text is a property, not a method
      return response.text;
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      return "今日建议：保持警惕，少说话，多微笑！";
    }
  }
}
