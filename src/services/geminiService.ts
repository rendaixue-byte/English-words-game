import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateDistractors(word: string, translation: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `为英语单词 "${word}" (中文意思: "${translation}") 生成3个具有迷惑性的中文词义选项。
      要求：
      1. 选项必须是中文。
      2. 选项应与原意在词性或语境上相似，具有挑战性。
      3. 只要返回一个JSON数组，包含这3个干扰项。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const distractors = JSON.parse(response.text || "[]");
    return distractors;
  } catch (error) {
    console.error("Error generating distractors:", error);
    return ["错误选项1", "错误选项2", "错误选项3"];
  }
}

export async function generateLevelWords(level: number): Promise<any[]> {
  // This is a helper to generate mock data if Google Sheets is not available
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `生成50个适合雅思第${level}关（难度1-10）的英语单词及其中文翻译。
    返回JSON格式：[{word: "word", translation: "translation"}]`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING }
          },
          required: ["word", "translation"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}
