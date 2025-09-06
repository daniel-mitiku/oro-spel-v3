"use client";

import { useState, useEffect, useTransition } from "react";
import { getUserAnalytics } from "@/lib/actions/analytics";
import type {
  FullAnalyticsData,
  AnalyticsData,
  WordAnalysisData,
} from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Target,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Award,
  Loader2,
} from "lucide-react";

export function AnalyticsDashboard() {
  const [data, setData] = useState<FullAnalyticsData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getUserAnalytics();
      if (result && !("error" in result)) {
        setData(result);
      } else {
        console.error("Failed to get analytics:", result.error);
        setData(null);
      }
    });
  }, []);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4 text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Could not load analytics data. Please try again later.
        </p>
      </div>
    );
  }

  const {
    overview,
    progressOverTime,
    projectBreakdown,
    wordStats,
    topErrors,
    improvementAreas,
    accuracyByProject,
  } = data;

  const sentenceStatusData = [
    { name: "Complete", value: overview.completeSentences, color: "#22c55e" },
    { name: "Partial", value: overview.partialSentences, color: "#eab308" },
    // A project's unknown words are an aggregate, not a direct sentence status.
    // This provides a good visual representation of overall quality.
    {
      name: "Words Marked Unknown",
      value: overview.unknownWords,
      color: "#ef4444",
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Insights into your Oromo writing progress and performance
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="words">Word Analysis</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Projects
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.totalProjects}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview.completedProjects} completed (
                  {Math.round(
                    (overview.completedProjects /
                      (overview.totalProjects || 1)) *
                      100
                  )}
                  %)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Writing Accuracy
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.averageCompletion}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg. project completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Streak
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.currentStreak} days
                </div>
                <p className="text-xs text-muted-foreground">
                  Longest: {overview.longestStreak} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Personal Corpus
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.personalCorpusWords}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview.personalCorpusVariants} word variants
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sentence Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {sentenceStatusData.length > 0 ? (
                    <PieChart>
                      <Pie
                        data={sentenceStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentenceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No sentence data yet.
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {progressOverTime.length > 0 ? (
                    <BarChart data={progressOverTime.slice(-14)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar
                        dataKey="completion"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Start writing to see your activity.
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* Other Tabs can be built out similarly */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
              <CardDescription>
                Completion rates and progress across all your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {projectBreakdown.map((project) => (
                    <div key={project.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{project.title}</h4>
                        <Badge
                          variant={
                            project.completionRate === 100
                              ? "default"
                              : "secondary"
                          }
                        >
                          {Math.round(project.completionRate)}% Complete
                        </Badge>
                      </div>
                      <Progress
                        value={project.completionRate}
                        className="mb-3"
                      />
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>Total Sentences: {project.totalSentences}</div>
                        <div>Complete: {project.completeSentences}</div>
                        <div>
                          Created:{" "}
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          Updated:{" "}
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
