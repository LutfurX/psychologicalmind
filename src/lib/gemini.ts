import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateRecommendation = async (testHistory: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Based on the following test history, provide a personalized study tip or recommendation for the user. 
          History: ${JSON.stringify(testHistory)}
          Focus on identifying weak areas or providing encouragement.
          Return the response in JSON format with 'content' and 'type' (one of: study_tip, weak_area, encouragement).`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: "The recommendation text" },
            type: { type: Type.STRING, enum: ["study_tip", "weak_area", "encouragement"] }
          },
          required: ["content", "type"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return null;
  }
};
