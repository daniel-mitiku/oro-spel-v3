"use client";

import { useState, useEffect } from "react";
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

interface AnalyticsData {
  overview: {
    totalProjects: number;
    completedProjects: number;
    totalSentences: number;
    completeSentences: number;
    partialSentences: number;
    unknownWords: number;
    personalCorpusWords: number;
    personalCorpusVariants: number;
    currentStreak: number;
    longestStreak: number;
    averageCompletion: number;
  };
  progressOverTime: Array<{
    date: string;
    completion: number;
    projects: number;
  }>;
  projectBreakdown: Array<{
    id: string;
    title: string;
    completionRate: number;
    totalSentences: number;
    completeSentences: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface WordAnalysisData {
  wordStats: Array<{
    word: string;
    correct: number;
    variant: number;
    unknown: number;
    total: number;
    accuracy: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  improvementAreas: string[];
  accuracyByProject: Array<{
    projectId: string;
    title: string;
    accuracy: number;
    totalWords: number;
    correctWords: number;
    createdAt: string;
  }>;
}

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [wordAnalysisData, setWordAnalysisData] =
    useState<WordAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [overviewResponse, wordAnalysisResponse] = await Promise.all([
        fetch("/api/protected/analytics/overview"),
        fetch("/api/protected/analytics/word-analysis"),
      ]);

      if (overviewResponse.ok && wordAnalysisResponse.ok) {
        const [overviewData, wordData] = await Promise.all([
          overviewResponse.json(),
          wordAnalysisResponse.json(),
        ]);

        setAnalyticsData(overviewData);
        setWordAnalysisData(wordData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analyticsData || !wordAnalysisData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load analytics data</p>
      </div>
    );
  }

  const { overview, progressOverTime, projectBreakdown } = analyticsData;
  const { wordStats, topErrors, improvementAreas, accuracyByProject } =
    wordAnalysisData;

  // Prepare chart data
  const sentenceStatusData = [
    { name: "Complete", value: overview.completeSentences, color: "#22c55e" },
    { name: "Partial", value: overview.partialSentences, color: "#eab308" },
    { name: "Unknown Words", value: overview.unknownWords, color: "#ef4444" },
  ];

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
                    (overview.completedProjects / overview.totalProjects) * 100
                  ) || 0}
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
                  {overview.completeSentences} of {overview.totalSentences}{" "}
                  sentences
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
                  {overview.currentStreak}
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

          {/* Sentence Status Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sentence Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of your sentence completion status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {sentenceStatusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your writing activity over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressOverTime.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString()
                      }
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(date) =>
                        new Date(date).toLocaleDateString()
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="completion"
                      stroke="#6366f1"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>
                Track your writing completion rate over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={progressOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) =>
                      new Date(date).toLocaleDateString()
                    }
                    formatter={(value, name) => [
                      name === "completion" ? `${value}%` : value,
                      name === "completion"
                        ? "Completion Rate"
                        : "Projects Updated",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="completion"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name="completion"
                  />
                  <Line
                    type="monotone"
                    dataKey="projects"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="projects"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Accuracy Trends</CardTitle>
              <CardDescription>
                Writing accuracy across your projects over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accuracyByProject.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                  <Bar dataKey="accuracy" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="words" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Word Challenges</CardTitle>
                <CardDescription>Words that need more practice</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {improvementAreas.map((word, index) => {
                      const stats = wordStats.find((w) => w.word === word);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{word}</div>
                            <div className="text-sm text-muted-foreground">
                              {stats?.accuracy}% accuracy • {stats?.total}{" "}
                              attempts
                            </div>
                          </div>
                          <Badge variant="outline" className="text-red-600">
                            Needs Practice
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Errors</CardTitle>
                <CardDescription>
                  Most frequent spelling mistakes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {topErrors.map((error, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="font-mono text-sm">{error.error}</div>
                        <Badge variant="outline">{error.count}x</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Word Accuracy Statistics</CardTitle>
              <CardDescription>
                Detailed breakdown of your word-level performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {wordStats
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 20)
                    .map((stat, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{stat.word}</span>
                          <Badge
                            variant={
                              stat.accuracy >= 80
                                ? "default"
                                : stat.accuracy >= 60
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {stat.accuracy}%
                          </Badge>
                        </div>
                        <Progress value={stat.accuracy} className="mb-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>
                            <CheckCircle className="inline h-3 w-3 mr-1" />
                            {stat.correct} correct
                          </span>
                          <span>
                            <AlertTriangle className="inline h-3 w-3 mr-1" />
                            {stat.variant} variants
                          </span>
                          <span>
                            <XCircle className="inline h-3 w-3 mr-1" />
                            {stat.unknown} unknown
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
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
                  {projectBreakdown.map((project, index) => (
                    <div key={index} className="p-4 border rounded-lg">
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
