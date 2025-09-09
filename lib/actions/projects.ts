"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { analyzeSentence } from "./corpus"; // Import the analyzer
import { updateUserAnalytics } from "./analytics"; // Import the analytics logger
import type {
  ProjectForDashboard,
  ProjectStats,
  WordAnalysis,
} from "@/lib/types";

// No changes are needed in this file's logic. It was already well-designed
// to call `analyzeSentence` and save the results. By updating `corpus.ts`, this
// file now correctly uses the database instead of local files without any
// modification to its own code.

async function syncAndAnalyzeSentences(projectId: string, content: string) {
  const sentencesText = content.split("\n");
  const existingSentences = await prisma.projectSentence.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });

  const operations = [];
  const maxPosition = Math.max(sentencesText.length, existingSentences.length);

  for (let i = 0; i < maxPosition; i++) {
    const newText = sentencesText[i];
    const oldSentence = existingSentences.find((s) => s.position === i);

    if (newText !== undefined && oldSentence === undefined) {
      // CREATE
      const analysisResult = await analyzeSentence(newText);
      const wordAnalyses =
        (analysisResult as { wordAnalyses: WordAnalysis[] }).wordAnalyses || [];
      const isComplete = !wordAnalyses.some((w) => w.status !== "correct");
      operations.push(
        prisma.projectSentence.create({
          data: {
            projectId,
            text: newText,
            position: i,
            status: isComplete ? "complete" : "partial",
            analysis: { wordAnalyses },
          },
        })
      );
    } else if (
      newText !== undefined &&
      oldSentence !== undefined &&
      newText !== oldSentence.text
    ) {
      // UPDATE
      const analysisResult = await analyzeSentence(newText);
      const wordAnalyses =
        (analysisResult as { wordAnalyses: WordAnalysis[] }).wordAnalyses || [];
      const isComplete = !wordAnalyses.some((w) => w.status !== "correct");
      operations.push(
        prisma.projectSentence.update({
          where: { id: oldSentence.id },
          data: {
            text: newText,
            status: isComplete ? "complete" : "partial",
            analysis: { wordAnalyses },
          },
        })
      );
    } else if (newText === undefined && oldSentence !== undefined) {
      // DELETE
      operations.push(
        prisma.projectSentence.delete({ where: { id: oldSentence.id } })
      );
    }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}

async function calculateProjectStats(projectId: string): Promise<ProjectStats> {
  const sentences = await prisma.projectSentence.findMany({
    where: { projectId },
  });

  if (sentences.length === 0) {
    return {
      totalSentences: 0,
      completeSentences: 0,
      partialSentences: 0,
      unknownWords: 0,
      completionRate: 0,
    };
  }

  const totalSentences = sentences.length;
  const completeSentences = sentences.filter(
    (s) => s.status === "complete"
  ).length;

  const unknownWords = sentences.reduce((count, sentence) => {
    const analysis = sentence.analysis as {
      wordAnalyses?: WordAnalysis[];
    } | null;
    if (analysis?.wordAnalyses) {
      return (
        count +
        analysis.wordAnalyses.filter((wa) => wa.status === "unknown").length
      );
    }
    return count;
  }, 0);

  return {
    totalSentences,
    completeSentences,
    partialSentences: totalSentences - completeSentences,
    unknownWords,
    completionRate:
      totalSentences > 0
        ? Math.round((completeSentences / totalSentences) * 100)
        : 0,
  };
}

export async function updateProject(
  projectId: string,
  data: { title?: string; description?: string; content?: string }
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const projectBeforeUpdate = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (
      typeof data.content === "string" &&
      data.content !== projectBeforeUpdate?.content
    ) {
      await syncAndAnalyzeSentences(projectId, data.content);
    }

    const newStats = await calculateProjectStats(projectId);

    const updatedProject = await prisma.project.update({
      where: { id: projectId, userId: user.id },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        stats: newStats as any,
      },
      include: { sentences: true },
    });

    if (data.content) {
      const words = data.content.split(/\s+/).filter(Boolean);
      await updateUserAnalytics({
        wordsWritten: words.length,
        unknownWords: newStats.unknownWords,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/projects/${projectId}`);

    return { project: { ...updatedProject, stats: newStats } };
  } catch (error) {
    console.error("Update project error:", error);
    return { error: "Failed to update project" };
  }
}

export async function createProject(title: string, description?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const newProject = await prisma.project.create({
      data: {
        title,
        description: description || "",
        userId: user.id,
        content: "",
        stats: {
          totalSentences: 0,
          completeSentences: 0,
          partialSentences: 0,
          unknownWords: 0,
          completionRate: 0,
        } as any,
      },
    });
    revalidatePath("/dashboard");
    return { project: newProject };
  } catch (error) {
    console.error("Create project error:", error);
    return { error: "Failed to create project" };
  }
}

export async function getUserProjects(): Promise<{
  error?: string;
  projects: ProjectForDashboard[];
}> {
  const user = await getCurrentUser();
  if (!user) return { projects: [], error: "Unauthorized" };

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: { sentences: true },
      orderBy: { updatedAt: "desc" },
    });

    // The stats are already on the project model, so we just need to cast the type.
    const projectsForDashboard: ProjectForDashboard[] = projects.map((p) => ({
      ...p,
      stats: p.stats as any as ProjectStats,
    }));

    return { projects: projectsForDashboard };
  } catch (error) {
    console.error("Get user projects error:", error);
    return { projects: [], error: "Failed to get projects" };
  }
}
// Other functions like getProjectById, deleteProject, etc., remain the same
// and do not need changes.

/**
 * READ a single project by its ID.
 */
export async function getProjectById(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: { sentences: true },
    });

    if (!project) return { error: "Project not found" };

    return { project: project as ProjectForDashboard };
  } catch (error) {
    console.error("Get project error:", error);
    return { error: "Failed to Get project" };
  }
}

/**
 * DELETE a project by its ID.
 */
export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    // Transaction to delete sentences and project together
    await prisma.$transaction([
      prisma.projectSentence.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId, userId: user.id } }),
    ]);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete project error:", error);
    return { error: "Failed to delete project" };
  }
}

export async function exportProjectData(projectId: string, format: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: { sentences: true },
    });
    if (!project) return { error: "Project not found" };

    let content: string;
    let mime = "text/plain";
    let ext = "txt";

    if (format === "json") {
      content = JSON.stringify(project, null, 2);
      mime = "application/json";
      ext = "json";
    } else if (format === "csv") {
      // Simple CSV export: id,text,status
      const header = "id,text,status";
      const rows = project.sentences
        .map((s) => `${s.id},"${s.text.replace(/"/g, '""')}",${s.status ?? ""}`)
        .join("\n");
      content = `${header}\n${rows}`;
      mime = "text/csv";
      ext = "csv";
    } else {
      // Plain text: just sentences
      content = project.sentences.map((s) => s.text).join("\n");
      mime = "text/plain";
      ext = "txt";
    }

    return {
      content,
      mime,
      filename: `${project.title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}.${ext}`,
    };
  } catch (error) {
    console.error("Export project error:", error);
    return { error: "Failed to export project" };
  }
}
