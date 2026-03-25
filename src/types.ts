/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Question {
  id: string;
  text: string;
  options: {
    text: string;
    score: number;
  }[];
}

export interface AssessmentResult {
  score: number;
  level: "কম" | "মাঝারি" | "বেশি";
  summary: string;
  mentalCondition: string;
  behavioralInsights: string;
  potentialConcerns: string;
  recommendations: string[];
  suggestedTests?: string[];
}

export interface UserResponse {
  questionId: string;
  score: number;
}
