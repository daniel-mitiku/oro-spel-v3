"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import fs from "fs/promises";
import path from "path";
import { getBaseWord } from "@/lib/utils";

interface QuizSentence {
  correct: string;
  hint: string;
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Fetches a specified number of random sentences for the quiz game.
 * @param count The number of sentences to fetch.
 * @param source The source of the sentences ('global' or 'personal').
 */
export async function getQuizSentences(
  count: number,
  source: "global" | "personal"
): Promise<{ sentences?: QuizSentence[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    let selectedSentences: string[] = [];

    if (source === "personal") {
      const personalSentences = await prisma.personalCorpus.findMany({
        where: { userId: user.id },
      });
      if (personalSentences.length < count) {
        return {
          error:
            "Not enough sentences in your personal corpus. Add more sentences or use the global corpus.",
        };
      }
      selectedSentences = shuffleArray(
        personalSentences.map((s) => s.sentence)
      ).slice(0, count);
    } else {
      // 'global' source
      const metaPath = path.join(
        process.cwd(),
        "public",
        "data",
        "metadata.json"
      );
      const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
      const { numSentenceChunks } = meta; // sentenceChunkSize - never used

      // To get a truly random sample, we can pick sentences from random chunks.
      const allSentences: string[] = [];
      const chunkIds = Array.from({ length: numSentenceChunks }, (_, i) => i);
      const shuffledChunkIds = shuffleArray(chunkIds);

      for (const chunkId of shuffledChunkIds) {
        if (allSentences.length >= count) break;
        const chunkPath = path.join(
          process.cwd(),
          "public",
          "data",
          `sentences_${chunkId}.json`
        );
        const chunkContent = await fs.readFile(chunkPath, "utf-8");
        const sentencesInChunk: string[] = JSON.parse(chunkContent);
        allSentences.push(...sentencesInChunk);
      }

      if (allSentences.length < count) {
        return {
          error: "Not enough sentences in the global corpus to start the quiz.",
        };
      }

      selectedSentences = shuffleArray(allSentences).slice(0, count);
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
