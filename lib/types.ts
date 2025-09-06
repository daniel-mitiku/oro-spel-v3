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

// Define the type for the payload to ensure consistency
export type PersonalCorpusIndexData = Prisma.PersonalCorpusIndexGetPayload<{}>;
