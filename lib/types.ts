import type { Prisma } from "@prisma/client";

/**
 * ## Composite Types with Relations
 *
 * These are custom types that include related models, created using
 * Prisma's `...GetPayload` utility types. They are essential for ensuring
 * type safety between your server actions and client components.
 */

// A Project with its sentences included.
export type ProjectWithSentences = Prisma.ProjectGetPayload<{
  include: {
    sentences: true;
  };
}>;

// A type for the analysis results of a single word.
export type WordAnalysis = {
  word: string;
  baseWord: string;
  status: "correct" | "variant" | "unknown";
  suggestions: string[];
  position: number;
};

// The structure for a project's statistics.
export type ProjectStats = {
  totalSentences: number;
  completeSentences: number;
  partialSentences: number;
  unknownWords: number;
  completionRate: number;
};

// The definitive Project type for the dashboard, combining the base model,
// its sentences, and the calculated stats.
export type ProjectForDashboard = ProjectWithSentences & {
  stats: ProjectStats;
};

export type Suggestions = string[] | { sentence: string; overlap: number }[];
// The type for the result of a suggestion fetch.
export type SuggestionResult = {
  type: "single" | "overlap";
  suggestions: Suggestions;
  // error?: string;
};

// Define the type for the payload to ensure consistency
export type PersonalCorpusIndexData =
  Prisma.PersonalCorpusIndexGetPayload<object>;

// --- Analytics Dashboard Types ---

export interface AnalyticsData {
  overview: {
    totalProjects: number;
    completedProjects: number;
    totalSentences: number;
    completeSentences: number;
    partialSentences: number;
    unknownWords: number;
    personalCorpusWords: number;
    personalCorpusVariants: number;
    currentStreak: number;
    longestStreak: number;
    averageCompletion: number;
  };
  progressOverTime: Array<{
    date: string;
    completion: number;
    projects: number;
  }>;
  projectBreakdown: Array<{
    id: string;
    title: string;
    completionRate: number;
    totalSentences: number;
    completeSentences: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface WordAnalysisData {
  wordStats: Array<{
    word: string;
    correct: number;
    variant: number;
    unknown: number;
    total: number;
    accuracy: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  improvementAreas: string[];
  accuracyByProject: Array<{
    projectId: string;
    title: string;
    accuracy: number;
    totalWords: number;
    correctWords: number;
    createdAt: string;
  }>;
}

// The combined type for the server action response
export type FullAnalyticsData = AnalyticsData & WordAnalysisData; // & { error?: string };
