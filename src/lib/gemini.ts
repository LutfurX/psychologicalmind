import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

export const generateRecommendation = async (testHistory: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `History: ${JSON.stringify(testHistory)}`
    });

    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};