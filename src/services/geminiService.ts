/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Question, AssessmentResult, UserResponse } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY 
});
export const generateInitialQuestions = async (categoryName: string): Promise<Question[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 10-15 multiple-choice psychology assessment questions in Bengali for the category: "${categoryName}".
    Each question must have 4 options representing increasing intensity (low to high).
    The output must be a JSON array of objects with "id", "text", and "options" (array of {text, score}).
    Scores for options should be 0, 3, 7, 10.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  score: { type: Type.INTEGER }
                },
                required: ["text", "score"]
              }
            }
          },
          required: ["id", "text", "options"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateFollowUpQuestions = async (
  categoryName: string,
  initialResponses: UserResponse[],
  questions: Question[]
): Promise<Question[]> => {
  const context = initialResponses.map(r => {
    const q = questions.find(q => q.id === r.questionId);
    return `Q: ${q?.text} | Score: ${r.score}`;
  }).join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on the following psychological assessment responses in the category "${categoryName}", generate 3-5 deeper, more specific follow-up questions in Bengali.
    Focus on the strongest signals detected.
    Responses:
    ${context}
    
    The output must be a JSON array of objects with "id", "text", and "options" (array of {text, score}).
    Scores for options should be 0, 3, 7, 10.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  score: { type: Type.INTEGER }
                },
                required: ["text", "score"]
              }
            }
          },
          required: ["id", "text", "options"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateFinalReport = async (
  categoryName: string,
  allResponses: UserResponse[],
  allQuestions: Question[]
): Promise<AssessmentResult> => {
  const totalScore = allResponses.reduce((sum, r) => sum + r.score, 0);
  const maxScore = allResponses.length * 10;
  const normalizedScore = Math.round((totalScore / maxScore) * 100);

  const context = allResponses.map(r => {
    const q = allQuestions.find(q => q.id === r.questionId);
    return `Q: ${q?.text} | Score: ${r.score}`;
  }).join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a personalized psychological report in Bengali based on these responses for the category "${categoryName}".
    Total Normalized Score: ${normalizedScore}/100.
    Responses:
    ${context}
    
    The report must include:
    1. summary (সংক্ষিপ্ত বিশ্লেষণ)
    2. mentalCondition (মানসিক অবস্থা)
    3. behavioralInsights (আচরণগত বিশ্লেষণ)
    4. potentialConcerns (সম্ভাব্য সমস্যা)
    5. recommendations (করণীয় বা পরামর্শ - array of strings)
    6. suggestedTests (প্রস্তাবিত টেস্ট - array of exactly 5 strings)
    
    For suggestedTests, select exactly 5 most relevant psychology test categories from the following pool based on the user's condition:
    - মানসিক চাপ (Stress)
    - অতিরিক্ত চিন্তা (Overthinking)
    - ঘুমের সমস্যা (Sleep Pattern)
    - আত্মবিশ্বাস (Self Confidence)
    - আবেগ নিয়ন্ত্রণ (Emotional Control)
    - সামাজিক উদ্বেগ (Social Anxiety)
    - কাজের চাপ ও উৎপাদনশীলতা (Productivity)
    - সম্পর্ক ও সামাজিক আচরণ (Relationship & Social Behavior)
    
    Rule for suggestedTests: Do NOT repeat the category "${categoryName}".
    
    The tone should be supportive, human-like, and clear.
    IMPORTANT: Include the disclaimer "এটি কোনো চিকিৎসা নির্ণয় নয়, শুধুমাত্র একটি সাধারণ মানসিক মূল্যায়ন।" in the summary.
    
    Output must be a JSON object matching the AssessmentResult interface.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          mentalCondition: { type: Type.STRING },
          behavioralInsights: { type: Type.STRING },
          potentialConcerns: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          suggestedTests: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "mentalCondition", "behavioralInsights", "potentialConcerns", "recommendations", "suggestedTests"]
      }
    }
  });

  const reportData = JSON.parse(response.text);
  
  let level: "কম" | "মাঝারি" | "বেশি" = "কম";
  if (normalizedScore > 60) level = "বেশি";
  else if (normalizedScore > 30) level = "মাঝারি";

  return {
    ...reportData,
    score: normalizedScore,
    level
  };
};

export const generateCombinedReport = async (
  bundledData: { category: string; responses: UserResponse[]; questions: Question[] }[]
): Promise<AssessmentResult> => {
  let totalScore = 0;
  let maxScore = 0;
  
  const contextParts = bundledData.map(data => {
    const catScore = data.responses.reduce((sum, r) => sum + r.score, 0);
    const catMax = data.responses.length * 10;
    totalScore += catScore;
    maxScore += catMax;
    
    const catContext = data.responses.map(r => {
      const q = data.questions.find(q => q.id === r.questionId);
      return `Q: ${q?.text} | Score: ${r.score}`;
    }).join("\n");
    
    return `Category: ${data.category}\nScore: ${Math.round((catScore/catMax)*100)}/100\nResponses:\n${catContext}`;
  });

  const normalizedScore = Math.round((totalScore / maxScore) * 100);
  const fullContext = contextParts.join("\n\n");

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a comprehensive psychological report in Bengali based on these 5 tests.
    Total Normalized Score: ${normalizedScore}/100.
    
    Test Data:
    ${fullContext}
    
    The report must include:
    1. summary (সামগ্রিক মানসিক অবস্থা - Overall mental condition)
    2. mentalCondition (প্রধান সমস্যা চিহ্নিতকরণ - Identification of main problems)
    3. behavioralInsights (শক্তি ও দুর্বলতা বিশ্লেষণ - Strength and weakness analysis)
    4. potentialConcerns (ঝুঁকির মাত্রা সম্পর্কে বিস্তারিত - Details about risk level)
    5. recommendations (করণীয় ও পরামর্শ - array of strings)
    
    The tone should be supportive, human-like, and clear.
    IMPORTANT: Include the disclaimer "এটি কোনো চিকিৎসা নির্ণয় নয়, শুধুমাত্র একটি সাধারণ মানসিক মূল্যায়ন।" in the summary.
    
    Output must be a JSON object matching the AssessmentResult interface.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          mentalCondition: { type: Type.STRING },
          behavioralInsights: { type: Type.STRING },
          potentialConcerns: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          suggestedTests: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "mentalCondition", "behavioralInsights", "potentialConcerns", "recommendations"]
      }
    }
  });

  const reportData = JSON.parse(response.text);
  
  let level: "কম" | "মাঝারি" | "বেশি" = "কম";
  if (normalizedScore > 60) level = "বেশি";
  else if (normalizedScore > 30) level = "মাঝারি";

  return {
    ...reportData,
    score: normalizedScore,
    level,
    suggestedTests: reportData.suggestedTests || []
  };
};
