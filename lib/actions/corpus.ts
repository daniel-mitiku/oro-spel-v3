"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import type {
  WordAnalysis,
  SuggestionResult,
  EnhancedCorpusData,
} from "@/lib/types";
import { getBaseWord } from "@/lib/utils";
import { revalidatePath } from "next/cache";

// --- SERVER ACTIONS ---

/**
 * REWRITTEN: Analyzes a sentence against the unified CorpusIndex in the database.
 * This function's external behavior is identical to the old version.
 */
export async function analyzeSentence(sentence: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (!sentence || !sentence.trim()) return { wordAnalyses: [] };

  try {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordAnalyses: WordAnalysis[] = [];

    for (let i = 0; i < words.length; i++) {
      const originalWord = words[i];
      const word = originalWord.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");
      if (!word) continue;

      const baseWord = getBaseWord(word);

      // 1. Query the unified index for both global (userId: null) and personal entries
      const indexEntries = await prisma.corpusIndex.findMany({
        where: {
          baseWord,
          OR: [{ userId: null }, { userId: user.id }],
        },
      });

      if (indexEntries.length === 0) {
        wordAnalyses.push({
          word: originalWord,
          baseWord,
          status: "unknown",
          suggestions: [],
          position: i,
        });
        continue;
      }

      // 2. Collect sentence IDs, separating global from personal
      const globalSentenceIds: number[] = [];
      const personalSentenceIds: string[] = [];
      indexEntries.forEach((entry) => {
        if (entry.userId === null) {
          // It's a global entry
          globalSentenceIds.push(...entry.sentenceIds.map(Number));
        } else {
          // It's a personal entry
          personalSentenceIds.push(...entry.sentenceIds);
        }
      });

      const uniqueGlobalIds = [...new Set(globalSentenceIds)];
      const uniquePersonalIds = [...new Set(personalSentenceIds)];

      // 3. Fetch the actual sentences from their respective tables in parallel
      const [globalSentences, personalSentences] = await Promise.all([
        uniqueGlobalIds.length > 0
          ? prisma.globalSentence.findMany({
              where: { id: { in: uniqueGlobalIds } },
            })
          : Promise.resolve([]),
        uniquePersonalIds.length > 0
          ? prisma.personalCorpus.findMany({
              where: { id: { in: uniquePersonalIds } },
            })
          : Promise.resolve([]),
      ]);

      const allSentenceTexts = [
        ...globalSentences.map((s) => s.text),
        ...personalSentences.map((s) => s.sentence),
      ];

      // 4. Determine status: 'correct' if exact word is found, otherwise 'variant'
      const exactMatchFound = allSentenceTexts.some((s) =>
        new RegExp(`\\b${word}\\b`, "i").test(s)
      );

      wordAnalyses.push({
        word: originalWord,
        baseWord,
        status: exactMatchFound ? "correct" : "variant",
        suggestions: [],
        position: i,
      });
    }

    return { wordAnalyses };
  } catch (error) {
    console.error("Analyze sentence error:", error);
    return { error: "Analysis failed due to a server error." };
  }
}

/**
 * REWRITTEN: Gets suggestions from the database.
 * Preserves the original "single" and "overlap" modes.
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
      const indexEntries = await prisma.corpusIndex.findMany({
        where: {
          baseWord,
          OR: [{ userId: null }, { userId: user.id }],
        },
        take: 20, // Limit the number of index entries to check
      });

      const globalIds = [
        ...new Set(
          indexEntries
            .filter((e) => e.userId === null)
            .flatMap((e) => e.sentenceIds.map(Number))
        ),
      ].slice(0, 10);
      const personalIds = [
        ...new Set(
          indexEntries
            .filter((e) => e.userId !== null)
            .flatMap((e) => e.sentenceIds)
        ),
      ].slice(0, 10);

      const [globalSentences, personalSentences] = await Promise.all([
        globalIds.length > 0
          ? prisma.globalSentence.findMany({ where: { id: { in: globalIds } } })
          : [],
        personalIds.length > 0
          ? prisma.personalCorpus.findMany({
              where: { id: { in: personalIds } },
            })
          : [],
      ]);

      const suggestions = [
        ...new Set([
          ...globalSentences.map((s) => s.text),
          ...personalSentences.map((s) => s.sentence),
        ]),
      ];
      return { type: "single", suggestions };
    }

    if (mode === "overlap") {
      // 1. Fetch all index entries for all base words
      const indexEntries = await prisma.corpusIndex.findMany({
        where: {
          baseWord: { in: baseWords },
          OR: [{ userId: null }, { userId: user.id }],
        },
      });

      // 2. Count overlaps in memory
      const overlapMap = new Map<string, number>(); // sentenceId -> count
      indexEntries.forEach((entry) => {
        entry.sentenceIds.forEach((id) => {
          overlapMap.set(id, (overlapMap.get(id) || 0) + 1);
        });
      });

      // 3. Sort by overlap count and take the best matches
      const sorted = Array.from(overlapMap.entries())
        .filter(([, count]) => count > 1) // Only show sentences with more than one word match
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      // 4. Separate IDs and fetch sentences
      const globalIdsToFetch = sorted
        .map(([id]) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      const personalIdsToFetch = sorted
        .map(([id]) => id)
        .filter((id) => isNaN(parseInt(id, 10)));

      const [globalSentences, personalSentences] = await Promise.all([
        globalIdsToFetch.length > 0
          ? prisma.globalSentence.findMany({
              where: { id: { in: globalIdsToFetch } },
            })
          : [],
        personalIdsToFetch.length > 0
          ? prisma.personalCorpus.findMany({
              where: { id: { in: personalIdsToFetch } },
            })
          : [],
      ]);

      const sentenceMap = new Map<string, string>();
      globalSentences.forEach((s) => sentenceMap.set(s.id.toString(), s.text));
      personalSentences.forEach((s) => sentenceMap.set(s.id, s.sentence));

      const suggestions = sorted
        .map(([id, overlap]) => ({
          sentence: sentenceMap.get(id),
          overlap,
        }))
        .filter((s): s is { sentence: string; overlap: number } =>
          Boolean(s.sentence)
        );

      return { type: "overlap", suggestions };
    }

    return { type: mode, suggestions: [] };
  } catch (error) {
    console.error("Get suggestions error:", error);
    return { error: "Failed to get suggestions" };
  }
}

/**
 * UPDATED: Adds sentences to the user's personal corpus and updates the unified index.
 */
export async function addToPersonalCorpus(sentences: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    for (const sentence of sentences) {
      if (!sentence.trim()) continue;

      const words = sentence.split(/\s+/).filter(Boolean);
      const baseWords = words.map(getBaseWord);

      const newCorpusEntry = await prisma.personalCorpus.create({
        data: {
          sentence,
          words: JSON.stringify(words),
          baseWords: JSON.stringify(baseWords),
          source: "project",
          userId: user.id,
        },
      });

      // Update the unified corpus index
      for (const baseWord of new Set(baseWords)) {
        if (!baseWord) continue;
        await prisma.corpusIndex.upsert({
          where: {
            baseWord_userId: {
              // Use the compound unique key
              userId: user.id,
              baseWord: baseWord,
            },
          },
          update: {
            sentenceIds: { push: newCorpusEntry.id },
            // To avoid duplicate variants, you might fetch and merge in a real app
            variants: {
              push: words.find((w) => getBaseWord(w) === baseWord) || baseWord,
            },
          },
          create: {
            baseWord,
            variants: [
              ...new Set(words.filter((w) => getBaseWord(w) === baseWord)),
            ],
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
    const rawCorpusData = await prisma.corpusIndex.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Fetch sentences for each index entry and build EnhancedCorpusData[]
    const corpusData: EnhancedCorpusData[] = await Promise.all(
      rawCorpusData.map(async (entry) => {
        const personalSentences =
          entry.sentenceIds.length > 0
            ? await prisma.personalCorpus.findMany({
                where: { id: { in: entry.sentenceIds } },
              })
            : [];
        return {
          ...entry,
          sentences: personalSentences.map((s) => s.sentence),
        };
      })
    );

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

/**
 * Deletes a single personal corpus sentence by its ID for the current user.
 * Also updates the corresponding CorpusIndex entry to remove the sentenceId.
 */
export async function deletePersonalCorpusSentence(sentenceId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }
  if (!sentenceId) {
    return { error: "Sentence ID is required" };
  }

  try {
    // Find the sentence entry
    const sentence = await prisma.personalCorpus.findFirst({
      where: { id: sentenceId, userId: user.id },
    });
    if (!sentence) {
      return { error: "Sentence not found" };
    }

    // Remove the sentence from all relevant CorpusIndex entries
    const baseWords: string[] = JSON.parse(sentence.baseWords);
    for (const baseWord of baseWords) {
      await prisma.corpusIndex.updateMany({
        where: { baseWord, userId: user.id },
        data: {
          sentenceIds: {
            set: await prisma.corpusIndex
              .findFirst({ where: { baseWord, userId: user.id } })
              .then((entry) =>
                entry ? entry.sentenceIds.filter((id) => id !== sentenceId) : []
              ),
          },
        },
      });
    }

    // Delete the sentence itself
    await prisma.personalCorpus.delete({
      where: { id: sentenceId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete personal corpus sentence error:", error);
    return { error: "Failed to delete sentence" };
  }
}

/**
 * Deletes a personal corpus entry (by baseWord) and all associated sentences for the current user.
 */
export async function deletePersonalCorpusEntry(baseWord: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!baseWord) {
    return { error: "Base word is required" };
  }

  try {
    // Find the index entry for this baseWord and user
    const indexEntry = await prisma.corpusIndex.findFirst({
      where: {
        baseWord,
        userId: user.id,
      },
    });

    if (!indexEntry) {
      return { error: "Entry not found" };
    }

    // Delete all associated personal corpus sentences
    if (indexEntry.sentenceIds.length > 0) {
      await prisma.personalCorpus.deleteMany({
        where: {
          id: { in: indexEntry.sentenceIds },
          userId: user.id,
        },
      });
    }

    // Delete the index entry itself
    await prisma.corpusIndex.delete({
      where: {
        id: indexEntry.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete personal corpus entry error:", error);
    return { error: "Failed to delete corpus entry" };
  }
}
