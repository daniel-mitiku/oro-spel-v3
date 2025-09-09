"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { getBaseWord } from "@/lib/utils";

interface QuizSentence {
  correct: string;
  hint: string;
}

/**
 * REWRITTEN: Fetches random sentences for the quiz game from the database.
 */
export async function getQuizSentences(
  count: number,
  source: "global" | "personal"
): Promise<{ sentences?: QuizSentence[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    let selectedSentences: string[] = [];

    if (source === "personal") {
      const personalCount = await prisma.personalCorpus.count({
        where: { userId: user.id },
      });
      if (personalCount < count) {
        return {
          error: `Not enough sentences in your personal corpus (found ${personalCount}). You need at least ${count}.`,
        };
      }
      // Fetch random sentences
      const personalSentences = await prisma.personalCorpus.findMany({
        where: { userId: user.id },
        take: count,
        // This is a way to get random documents in Prisma with MongoDB
        // It's not perfectly performant but fine for this use case.
        skip: Math.max(0, Math.floor(Math.random() * (personalCount - count))),
      });
      selectedSentences = personalSentences.map((s) => s.sentence);
    } else {
      // 'global' source
      const globalCount = await prisma.globalSentence.count();
      if (globalCount < count) {
        return { error: "Not enough sentences in the global corpus." };
      }
      const globalSentences = await prisma.globalSentence.findMany({
        take: count,
        skip: Math.max(0, Math.floor(Math.random() * (globalCount - count))),
      });
      selectedSentences = globalSentences.map((s) => s.text);
    }

    // If we got fewer sentences than requested (edge case with skip), fill the rest
    if (selectedSentences.length < count) {
      const remainingCount = count - selectedSentences.length;
      const moreSentences =
        source === "global"
          ? await prisma.globalSentence.findMany({ take: remainingCount })
          : await prisma.personalCorpus.findMany({
              where: { userId: user.id },
              take: remainingCount,
            });

      if (source === "global") {
        selectedSentences.push(
          ...(moreSentences as { id: number; text: string }[]).map(
            (s) => s.text
          )
        );
      } else {
        selectedSentences.push(
          ...(
            moreSentences as {
              id: string;
              sentence: string;
              words: string;
              baseWords: string;
              source: unknown;
              createdAt: Date;
              userId: string;
            }[]
          ).map((s) => s.sentence)
        );
      }
    }

    const quizSentences: QuizSentence[] = selectedSentences.map((sentence) => ({
      correct: sentence,
      hint: sentence
        .split(/\s+/)
        .map((word) => getBaseWord(word))
        .join(" "),
    }));

    return { sentences: quizSentences };
  } catch (error) {
    console.error("Failed to get quiz sentences:", error);
    return { error: "Could not load sentences for the quiz." };
  }
}

/**
 * NEW: Saves the results of a completed quiz session to the database.
 */
export async function saveQuizSession(data: {
  score: number; // Percentage score (e.g., 80)
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
}) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    await prisma.quizSession.create({
      data: {
        userId: user.id,
        score: data.score,
        totalQuestions: data.totalQuestions,
        correctAnswers: data.correctAnswers,
        timeSpent: data.timeSpent,
        // difficulty can be added as a parameter if you implement it
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save quiz session:", error);
    return { error: "Could not save your quiz results." };
  }
}
