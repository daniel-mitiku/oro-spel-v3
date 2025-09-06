"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";
import { BookOpen, FileText, CheckCircle, TrendingUp } from "lucide-react";
// Import the new ProjectForDashboard type and alias it as Project
import type { ProjectForDashboard as Project } from "@/lib/types";
import { User } from "@prisma/client";

interface DashboardContentProps {
  user: Omit<User, "password">;
  initialProjects: Project[];
}

export function DashboardContent({
  user,
  initialProjects,
}: DashboardContentProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const refreshProjects = async () => {
    try {
      const response = await fetch("/api/protected/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Failed to refresh projects:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/protected/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Use project.id for filtering
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleExportProject = (project: Project) => {
    // Fixed: The function now correctly accesses project.sentences
    const text = project.sentences.map((s) => s.text).join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // This part should now work correctly with the ProjectForDashboard type
  const totalProjects = projects.length;
  const totalSentences = projects.reduce(
    (sum, p) => sum + p.stats.totalSentences,
    0
  );
  const completeSentences = projects.reduce(
    (sum, p) => sum + p.stats.completeSentences,
    0
  );
  const averageCompletion =
    totalProjects > 0
      ? projects.reduce((sum, p) => sum + p.stats.completionRate, 0) /
        totalProjects
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">
          Welcome back, {user.name}!
        </h1>
        <p className="text-muted-foreground text-pretty">
          Continue your Oromo language writing journey. Track your progress and
          improve your skills.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active writing projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sentences
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSentences}</div>
            <p className="text-xs text-muted-foreground">Sentences written</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Complete Sentences
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completeSentences}</div>
            <p className="text-xs text-muted-foreground">Perfectly written</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(averageCompletion)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Projects</h2>
            <p className="text-muted-foreground">
              Manage and continue your Oromo writing projects
            </p>
          </div>
          <CreateProjectDialog onProjectCreated={refreshProjects} />
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first Oromo writing project to start practicing
                  and improving your language skills.
                </p>
              </div>
              <CreateProjectDialog onProjectCreated={refreshProjects} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
                onExport={handleExportProject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
