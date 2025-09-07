"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import fs from "fs/promises";
import path from "path";
import type {
  WordAnalysis,
  SuggestionResult,
  PersonalCorpusIndexData,
} from "@/lib/types";
import { getBaseWord } from "@/lib/utils";
import { revalidatePath } from "next/cache";

// --- HELPER FUNCTIONS ---

/**
 * Helper to fetch data from a global index JSON file.
 * This is the logic from your pre-processing script's output.
 */
async function getGlobalIndexData(
  baseWord: string
): Promise<{ sentenceIds: number[] } | null> {
  let firstChar = baseWord[0] || "other";
  if (!/^[a-z]/.test(firstChar)) {
    firstChar = "other";
  }
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    `index_${firstChar}.json`
  );

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const indexData = JSON.parse(fileContent);
    return indexData[baseWord] ? { sentenceIds: indexData[baseWord] } : null;
  } catch (error) {
    // It's okay if a file doesn't exist, just means no data for that letter.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code !== "ENOENT"
    ) {
      console.error(`Failed to read global index for ${baseWord}:`, error);
    }
    return null;
  }
}

/**
 * Helper to fetch sentences from the chunked JSON files by their IDs.
 */
async function getSentencesByIds(sentenceIds: number[]): Promise<string[]> {
  if (sentenceIds.length === 0) return [];

  // This assumes you have metadata about the chunks
  const metaPath = path.join(process.cwd(), "public", "data", "metadata.json");
  const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
  const { sentenceChunkSize } = meta;

  const sentencesMap = new Map<number, string>();
  const requiredChunks = new Set<number>();
  sentenceIds.forEach((id) =>
    requiredChunks.add(Math.floor(id / sentenceChunkSize))
  );

  await Promise.all(
    Array.from(requiredChunks).map(async (chunkId) => {
      try {
        const chunkPath = path.join(
          process.cwd(),
          "public",
          "data",
          `sentences_${chunkId}.json`
        );
        const chunkContent = await fs.readFile(chunkPath, "utf-8");
        const sentencesInChunk: string[] = JSON.parse(chunkContent);

        // Add relevant sentences from this chunk to our map
        sentenceIds.forEach((id) => {
          if (Math.floor(id / sentenceChunkSize) === chunkId) {
            const indexInChunk = id % sentenceChunkSize;
            if (sentencesInChunk[indexInChunk]) {
              sentencesMap.set(id, sentencesInChunk[indexInChunk]);
            }
          }
        });
      } catch (error) {
        console.error(`Could not load sentence chunk ${chunkId}:`, error);
      }
    })
  );

  // Return sentences in the order of the original IDs
  return sentenceIds
    .map((id) => sentencesMap.get(id))
    .filter(Boolean) as string[];
}

// --- SERVER ACTIONS ---

/**
 * MODIFIED: Analyzes a sentence against BOTH the global and personal corpora.
 */
export async function analyzeSentence(sentence: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (!sentence) return { error: "Missing sentence" };

  try {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordAnalyses: WordAnalysis[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      if (!word) continue;

      const baseWord = getBaseWord(word);

      // 1. Query Global Corpus (JSON files)
      const globalIndex = await getGlobalIndexData(baseWord);

      // 2. Query Personal Corpus (Database)
      const personalIndex = await prisma.personalCorpusIndex.findFirst({
        where: { baseWord, userId: user.id },
      });

      let status: "correct" | "variant" | "unknown" = "unknown";

      // We need the actual sentences to check for exact variant matches
      const globalSentenceIds = globalIndex?.sentenceIds.slice(0, 20) || [];
      const globalSentences = await getSentencesByIds(globalSentenceIds);

      const personalSentenceIds = personalIndex?.sentenceIds.slice(0, 20) || [];
      const personalSentences = (
        await prisma.personalCorpus.findMany({
          where: { id: { in: personalSentenceIds } },
        })
      ).map((s) => s.sentence);

      const allSentences = [
        ...new Set([...globalSentences, ...personalSentences]),
      ];

      if (allSentences.length > 0) {
        // Check if the exact typed word exists in any of the found sentences
        const exactMatchFound = allSentences.some((s) =>
          s.split(/\s+/).includes(word)
        );

        if (exactMatchFound) {
          status = "correct"; // Green
        } else {
          status = "variant"; // Yellow
        }
      } else {
        status = "unknown"; // Red
      }

      wordAnalyses.push({
        word,
        baseWord,
        status,
        suggestions: [],
        position: i,
      });
    }

    return { wordAnalyses };
  } catch (error) {
    console.error("Analyze sentence error:", error);
    return { error: "Analysis failed" };
  }
}

/**
 * NEW: Gets suggestions based on single word or multi-word context (overlap).
 */
export async function getSuggestions({
  words,
  mode,
}: {
  words: string[];
  mode: "single" | "overlap";
}): Promise<SuggestionResult | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const baseWords = words.map(getBaseWord).filter(Boolean);
    if (baseWords.length === 0) return { type: mode, suggestions: [] };

    if (mode === "single") {
      const baseWord = baseWords[0];
      const globalIndex = await getGlobalIndexData(baseWord);
      const personalIndex = await prisma.personalCorpusIndex.findFirst({
        where: { baseWord, userId: user.id },
      });

      const globalIds = globalIndex?.sentenceIds.slice(0, 10) || [];
      const personalIds = personalIndex?.sentenceIds.slice(0, 10) || [];

      const globalSentences = await getSentencesByIds(globalIds);
      const personalSentences = (
        await prisma.personalCorpus.findMany({
          where: { id: { in: personalIds } },
        })
      ).map((s) => s.sentence);

      const suggestions = [
        ...new Set([...globalSentences, ...personalSentences]),
      ];
      return { type: "single", suggestions };
    }

    if (mode === "overlap") {
      const overlapMap = new Map<number, number>(); // Global sentences (ID -> count)

      // 1. Get all sentence IDs from global corpus for each base word
      for (const baseWord of baseWords) {
        const globalIndex = await getGlobalIndexData(baseWord);
        globalIndex?.sentenceIds.forEach((id) => {
          overlapMap.set(id, (overlapMap.get(id) || 0) + 1);
        });
      }

      // 2. Sort by overlap count and take top 10
      const sorted = Array.from(overlapMap.entries())
        .filter(([, count]) => count > 1) // Only show sentences with more than 1 word match
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const sentenceIds = sorted.map(([id]) => id);
      const sentences = await getSentencesByIds(sentenceIds);

      const suggestions = sorted
        .map(([id, overlap], index) => ({
          id, // include the id so it's used
          sentence: sentences[index],
          overlap,
        }))
        .filter((s) => s.sentence); // Filter out any that failed to fetch

      return { type: "overlap", suggestions };
    }

    return { type: mode, suggestions: [] };
  } catch (error) {
    console.error("Get suggestions error:", error);
    return { error: "Failed to get suggestions" };
  }
}

/**
 * Adds an array of sentences to the user's personal corpus.
 */
export async function addToPersonalCorpus(sentences: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).filter(Boolean);
      const baseWords = words.map(getBaseWord);

      // Create a new entry in the personal corpus for this sentence
      const newCorpusEntry = await prisma.personalCorpus.create({
        data: {
          sentence,
          words: JSON.stringify(words),
          baseWords: JSON.stringify(baseWords),
          source: "project", // Using the enum value
          userId: user.id,
        },
      });

      // Update the personal corpus index for each base word in the sentence
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const baseWord = baseWords[i];

        await prisma.personalCorpusIndex.upsert({
          where: {
            userId_baseWord: {
              userId: user.id,
              baseWord: baseWord,
            },
          },
          update: {
            // Add the new word variant if it doesn't already exist
            variants: { push: word },
            // Add the ID of the new corpus entry
            sentenceIds: { push: newCorpusEntry.id },
          },
          create: {
            baseWord,
            variants: [word],
            sentenceIds: [newCorpusEntry.id],
            userId: user.id,
          },
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Add to personal corpus error:", error);
    return { error: "Failed to update personal corpus" };
  }
}

/**
 * Enforces a completed project's sentences, adding them to the user's personal corpus.
 */
export async function enforceProjectSentences(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!projectId) {
    return { error: "Project ID is required" };
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    // Safely access the stats from the JSON field
    const stats = project.stats as { completionRate?: number };
    if ((stats.completionRate ?? 0) < 100) {
      return { error: "Project must be 100% complete to enforce" };
    }

    const projectSentences = await prisma.projectSentence.findMany({
      where: {
        projectId: project.id,
        status: "complete", // Using the enum value
      },
    });

    const sentences = projectSentences.map((s) => s.text);
    if (sentences.length === 0) {
      return { error: "No complete sentences to enforce" };
    }

    const result = await addToPersonalCorpus(sentences);
    if (result.error) {
      return result;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        isEnforced: true,
        enforcedAt: new Date(),
        status: "archived", // Using the enum value
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Project sentences enforced successfully!",
    };
  } catch (error) {
    console.error("Enforce project error:", error);
    return { error: "Failed to enforce project sentences" };
  }
}

/**
 * READ personal corpus data and stats for the Corpus Manager component.
 */
export async function getPersonalCorpusStatsAndData() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const corpusData: PersonalCorpusIndexData[] =
      await prisma.personalCorpusIndex.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

    // Calculate statistics based on the gotten data
    const stats = corpusData.reduce(
      (acc, entry) => {
        acc.totalVariants += entry.variants.length;
        acc.totalSentences += entry.sentenceIds.length;
        return acc;
      },
      {
        totalWords: corpusData.length, // Total unique base words
        totalSentences: 0,
        totalVariants: 0,
      }
    );

    return { corpusData, stats };
  } catch (error) {
    console.error("Get personal corpus error:", error);
    return { error: "Failed to Get personal corpus data" };
  }
}
