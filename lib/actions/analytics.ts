"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import type { FullAnalyticsData, ProjectStats } from "@/lib/types";

/**
 * NEW: Upserts a user's analytics for the current day.
 * This is called by `updateProject` to log writing activity.
 */
export async function updateUserAnalytics(data: {
  wordsWritten: number;
  unknownWords: number;
}) {
  const user = await getCurrentUser();
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.userAnalytics.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
      update: {
        wordsWritten: {
          increment: data.wordsWritten,
        },
        unknownWords: {
          increment: data.unknownWords,
        },
      },
      create: {
        userId: user.id,
        date: today,
        wordsWritten: data.wordsWritten,
        unknownWords: data.unknownWords,
      },
    });
  } catch (error) {
    console.error("Failed to update user analytics:", error);
  }
}

/**
 * Calculates the current and longest streaks from a sorted list of dates.
 */
function calculateStreaks(dates: Date[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let longestStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateSet = new Set(
    dates.map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  if (dateSet.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const sortedUniqueDates = Array.from(dateSet)
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  let currentLongest = 1;
  longestStreak = 1;
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const diff =
      (sortedUniqueDates[i].getTime() - sortedUniqueDates[i - 1].getTime()) /
      (1000 * 3600 * 24);
    if (diff === 1) {
      currentLongest++;
    } else {
      longestStreak = Math.max(longestStreak, currentLongest);
      currentLongest = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentLongest);

  const tempDate = new Date(today);
  if (dateSet.has(tempDate.getTime())) {
    currentStreak = 1;
    tempDate.setDate(tempDate.getDate() - 1);
    while (dateSet.has(tempDate.getTime())) {
      currentStreak++;
      tempDate.setDate(tempDate.getDate() - 1);
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Gathers and computes all analytics data for the user dashboard.
 * This should now work correctly as project stats are pre-calculated.
 */
export async function getUserAnalytics(): Promise<
  FullAnalyticsData | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const [projects, personalCorpusIndices, userAnalyticsEntries] =
      await Promise.all([
        prisma.project.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.personalCorpusIndex.findMany({ where: { userId: user.id } }),
        prisma.userAnalytics.findMany({
          where: { userId: user.id },
          orderBy: { date: "asc" },
        }),
      ]);

    const overview = projects.reduce(
      (acc, project) => {
        const stats = project.stats as ProjectStats;
        acc.totalSentences += stats.totalSentences || 0;
        acc.completeSentences += stats.completeSentences || 0;
        acc.partialSentences += stats.partialSentences || 0;
        acc.unknownWords += stats.unknownWords || 0;
        return acc;
      },
      {
        totalSentences: 0,
        completeSentences: 0,
        partialSentences: 0,
        unknownWords: 0,
      }
    );

    const averageCompletion =
      overview.totalSentences > 0
        ? Math.round(
            (overview.completeSentences / overview.totalSentences) * 100
          )
        : 0;

    const personalCorpusStats = personalCorpusIndices.reduce(
      (acc, item) => {
        acc.variants += item.variants.length;
        return acc;
      },
      { words: personalCorpusIndices.length, variants: 0 }
    );

    const streaks = calculateStreaks(userAnalyticsEntries.map((e) => e.date));

    // This logic remains the same and will now work with accurate data.
    const progressOverTimeMap = new Map<
      string,
      { completion: number[]; projects: Set<string> }
    >();
    projects.forEach((p) => {
      const date = new Date(p.updatedAt).toISOString().split("T")[0];
      if (!progressOverTimeMap.has(date)) {
        progressOverTimeMap.set(date, { completion: [], projects: new Set() });
      }
      const entry = progressOverTimeMap.get(date)!;
      entry.completion.push((p.stats as ProjectStats).completionRate || 0);
      entry.projects.add(p.id);
    });

    const progressOverTime = Array.from(progressOverTimeMap.entries())
      .map(([date, data]) => ({
        date,
        completion: Math.round(
          data.completion.reduce((a, b) => a + b, 0) / data.completion.length
        ),
        projects: data.projects.size,
      }))
      .slice(-30);

    const projectBreakdown = projects.map((p) => ({
      id: p.id,
      title: p.title,
      completionRate: (p.stats as ProjectStats).completionRate || 0,
      totalSentences: (p.stats as ProjectStats).totalSentences || 0,
      completeSentences: (p.stats as ProjectStats).completeSentences || 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return {
      overview: {
        totalProjects: projects.length,
        completedProjects: projects.filter((p) => p.status === "completed")
          .length,
        totalSentences: overview.totalSentences,
        completeSentences: overview.completeSentences,
        partialSentences: overview.partialSentences,
        unknownWords: overview.unknownWords,
        personalCorpusWords: personalCorpusStats.words,
        personalCorpusVariants: personalCorpusStats.variants,
        averageCompletion,
        ...streaks,
      },
      progressOverTime,
      projectBreakdown,
      wordStats: [],
      topErrors: [],
      improvementAreas: [],
      accuracyByProject: [],
    };
  } catch (error) {
    console.error("Failed to get user analytics:", error);
    return { error: "Failed to load analytics data" };
  }
}
