// src/utils/api/surveyService.ts
import { apiClient } from "../../lib/apiClient";

// Survey Type
export type Survey = {
  id: string;
  name: string;
  type: 'SURVEY' | 'POLL' | 'FEEDBACK';
  targetAudience: string;
  responseCount: number;
  expectedCount: number;
  status: 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'ANALYZING';
  dueDate: string;
};

export type SurveySummary = {
  activeSurveys: number;
  avgResponseRate: string;
  totalResponses: number;
  upcomingDeadlines: number;
};

export const surveyService = {
  // Get Surveys (For Employees only active and published surveys)
  getSurveys: async () => {
    const { data } = await apiClient.get<Survey[]>("/surveys");
    return data;
  },

  // Get Survey Analysis (Admin only)
  getSurveyAnalysis: async (surveyId: string) => {
    const { data } = await apiClient.get(`/surveys/${surveyId}/analysis`);
    return data;
  },

  // Create Survey (Admin only)
  createSurvey: async (surveyData: {
    title: string;
    type: string;
    status: string;
    dueDate: string;
    questions: { text: string; type: string; options: string[] }[];
  }) => {
    console.log("Creating survey with data:", surveyData);
    const { data } = await apiClient.post("/surveys", surveyData);
    return data;
  },
};
