"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdvancedWritingAssistant } from "@/components/writing/advanced-writing-assistant";
import { QuizGame } from "@/components/writing/quiz-game";
import { ArrowLeft, Edit, BookOpen, BarChart3 } from "lucide-react";
import type { ProjectForDashboard } from "@/lib/types";
import { updateProject } from "@/lib/actions/projects";

interface ProjectEditorProps {
  project: ProjectForDashboard;
}

export function ProjectEditor({ project: initialProject }: ProjectEditorProps) {
  const [project, setProject] = useState(initialProject);
  const [mode, setMode] = useState<"textarea" | "guided">("textarea");
  const router = useRouter();

  const handleProjectUpdate = async (updates: Partial<ProjectForDashboard>) => {
    try {
      // Only send fields that are actually provided and changed
      const payload: { title?: string; description?: string } = {};
      if (
        typeof updates.title === "string" &&
        updates.title !== project.title
      ) {
        payload.title = updates.title.trim();
      }
      if (
        typeof updates.description === "string" &&
        updates.description !== project.description
      ) {
        payload.description =
          updates.description.trim() === ""
            ? undefined
            : updates.description.trim();
      }

      // If nothing to update, skip
      if (Object.keys(payload).length === 0) return;

      const result = await updateProject(project.id, payload);

      if (result && "project" in result && result.project) {
        setProject(result.project);
      } else if (result && "error" in result && result.error) {
        console.error("Failed to update project:", result.error);
      }
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  const getStatusColor = (completionRate: number) => {
    if (completionRate >= 100) return "bg-green-500";
    if (completionRate >= 70) return "bg-yellow-500";
    if (completionRate >= 30) return "bg-orange-500";
    return "bg-gray-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-balance">{project.title}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-2">
            <div
              className={`w-2 h-2 rounded-full ${getStatusColor(
                project.stats.completionRate
              )}`}
            />
            {Math.round(project.stats.completionRate)}% Complete
          </Badge>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {project.stats.totalSentences}
            </div>
            <p className="text-xs text-muted-foreground">Total Sentences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {project.stats.completeSentences}
            </div>
            <p className="text-xs text-muted-foreground">Complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {project.stats.partialSentences}
            </div>
            <p className="text-xs text-muted-foreground">Partial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {project.stats.unknownWords}
            </div>
            <p className="text-xs text-muted-foreground">Unknown Words</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="writing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="writing" className="gap-2">
            <Edit className="h-4 w-4" />
            Writing
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Practice Quiz
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writing" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Mode:</span>
              <Button
                variant={mode === "textarea" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("textarea")}
              >
                Freestyle
              </Button>
              <Button
                variant={mode === "guided" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("guided")}
              >
                Guided
              </Button>
            </div>
          </div>

          <AdvancedWritingAssistant
            project={project}
            //onProjectUpdate={handleProjectUpdate}
            //mode={mode}
          />
        </TabsContent>

        <TabsContent value="quiz">
          <Card>
            <CardHeader>
              <CardTitle>Practice Quiz</CardTitle>
              <CardDescription>
                Test your Oromo writing skills with interactive exercises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuizGame
                sentences={[
                  {
                    correct: "Ani barreessuu jaalladha",
                    hint: "Ani baresuu jaladha",
                  },
                  { correct: "Mana keessa jira", hint: "Mana kesa jira" },
                  {
                    correct: "Bishaan dhuguu barbaada",
                    hint: "Bishan dhugu barbaada",
                  },
                ]}
                onComplete={(score) => {
                  console.log("Quiz completed with score:", score);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Project Analytics</CardTitle>
              <CardDescription>
                Detailed insights into your writing progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
