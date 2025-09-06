"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import type { ProjectForDashboard, ProjectStats } from "@/lib/types";

/**
 * Calculates the statistics for a given project based on its sentences.
 * @param projectId The ID of the project to analyze.
 * @returns A ProjectStats object.
 */
async function calculateProjectStats(projectId: string): Promise<ProjectStats> {
  const sentences = await prisma.projectSentence.findMany({
    where: { projectId },
  });

  const totalSentences = sentences.length;
  const completeSentences = sentences.filter(
    (s) => s.status === "complete"
  ).length;
  const partialSentences = sentences.filter(
    (s) => s.status === "partial"
  ).length;

  // Calculate unknown words by summing them up from the analysis JSON of each sentence
  const unknownWords = sentences.reduce((count, sentence) => {
    const analysis = sentence.analysis as {
      wordAnalyses?: { status: string }[];
    } | null;
    if (analysis?.wordAnalyses) {
      const unknownInSentence = analysis.wordAnalyses.filter(
        (wa) => wa.status === "unknown"
      ).length;
      return count + unknownInSentence;
    }
    return count;
  }, 0);

  const completionRate =
    totalSentences > 0 ? (completeSentences / totalSentences) * 100 : 0;

  // Update the stats on the project model asynchronously.
  // This is "fire-and-forget" so it doesn't slow down the request.
  prisma.project
    .update({
      where: { id: projectId },
      data: {
        stats: {
          totalSentences,
          completeSentences,
          partialSentences,
          unknownWords,
          completionRate,
        },
      },
    })
    .catch(console.error);

  return {
    totalSentences,
    completeSentences,
    partialSentences,
    unknownWords,
    completionRate,
  };
}

/**
 * CREATE a new project for the current user.
 */
export async function createProject(title: string, description?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const newProject = await prisma.project.create({
      data: {
        title,
        description: description || "",
        userId: user.id,
      },
    });
    revalidatePath("/dashboard");
    return { project: newProject };
  } catch (error) {
    console.error("Create project error:", error);
    return { error: "Failed to create project" };
  }
}

/**
 * READ all projects for the dashboard, including calculated stats.
 */
export async function getProjectsForDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: { sentences: true },
      orderBy: { updatedAt: "desc" },
    });

    // Augment each project with its calculated stats
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => ({
        ...project,
        stats: await calculateProjectStats(project.id),
      }))
    );

    return { projects: projectsWithStats };
  } catch (error) {
    console.error("Get projects error:", error);
    return { error: "Failed to fetch projects" };
  }
}

/**
 * READ a single project by its ID, ensuring it belongs to the current user.
 */
export async function getProjectById(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: { sentences: true },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    const projectWithStats = {
      ...project,
      stats: await calculateProjectStats(project.id),
    };

    return { project: projectWithStats };
  } catch (error) {
    console.error("Get project error:", error);
    return { error: "Failed to fetch project" };
  }
}

/**
 * UPDATE an existing project's details.
 */
export async function updateProject(
  projectId: string,
  data: { title?: string; description?: string }
) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const updatedProject = await prisma.project.update({
      where: { id: projectId, userId: user.id }, // Ensures user owns the project
      data: {
        title: data.title,
        description: data.description,
      },
    });
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${projectId}`);
    return { project: updatedProject };
  } catch (error) {
    console.error("Update project error:", error);
    return { error: "Failed to update project" };
  }
}

/**
 * DELETE a project by its ID.
 */
export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.project.delete({
      where: { id: projectId, userId: user.id }, // Ensures user owns the project
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete project error:", error);
    return { error: "Failed to delete project" };
  }
}

/**
 * READ all projects for the current user, including sentences and stats.
 */
export async function getUserProjects(): Promise<{
  error?: string;
  projects: ProjectForDashboard[];
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { projects: [], error: "Unauthorized" };
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      // Include the related 'sentences' data as required by the ProjectForDashboard type
      include: {
        sentences: true,
      },
    });

    // Map over the projects to add the 'stats' property to each one
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await calculateProjectStats(project.id);
        return {
          ...project,
          stats,
        };
      })
    );

    return { projects: projectsWithStats as ProjectForDashboard[] };
  } catch (error) {
    console.error("Get user projects error:", error);
    return { projects: [], error: "Failed to fetch projects" };
  }
}
