"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import fs from "fs/promises";
import path from "path";
import { PersonalCorpusIndexData, WordAnalysis } from "../types";
import { getBaseWord } from "../utils";

/**
 * Helper function to read the global corpus index from the pre-processed JSON files.
 */
async function getGlobalCorpusIndex(
  baseWord: string
): Promise<{ variants: string[]; sentenceIds: number[] } | null> {
  // Determine the correct JSON file to read based on the first character of the base word.
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
    // Return the entry for the base word, or null if not found.
    return indexData[baseWord] || null;
  } catch (error) {
    // Log an error if the file can't be read, but don't block the analysis.
    console.error(`Failed to read global corpus index for ${baseWord}:`, error);
    return null;
  }
}

/**
 * Analyzes a sentence word by word against the global and personal corpora.
 */
export async function analyzeSentence(sentence: string, projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!sentence || !projectId) {
    return { error: "Missing sentence or projectId" };
  }

  try {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordAnalyses: WordAnalysis[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const baseWord = getBaseWord(word);

      // 1. Find in global corpus (from JSON files)
      const globalIndex = await getGlobalCorpusIndex(baseWord);

      // 2. Find in personal corpus (from database)
      const personalIndex = await prisma.personalCorpusIndex.findFirst({
        where: {
          baseWord,
          userId: user.id,
        },
      });

      let status: "correct" | "variant" | "unknown" = "unknown";
      let suggestions: string[] = [];

      // Combine variants from both sources
      const allVariants = [
        ...(globalIndex?.variants || []),
        ...(personalIndex?.variants || []),
      ];

      if (allVariants.length > 0) {
        if (allVariants.includes(word)) {
          // The exact word is found in the combined variants
          status = "correct";
        } else {
          // The base word exists, but this specific form is not recorded
          status = "variant";
          // Provide suggestions from the combined list, removing duplicates
          suggestions = [...new Set(allVariants)].slice(0, 5);
        }
      }
      // If the base word is not in either corpus, status remains "unknown"

      wordAnalyses.push({
        word,
        baseWord,
        status,
        suggestions,
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

    // Calculate statistics based on the fetched data
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
    return { error: "Failed to fetch personal corpus data" };
  }
}
