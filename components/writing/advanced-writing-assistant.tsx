"use client";

import { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  FileText,
  Eye,
} from "lucide-react";
import type { WordAnalysis, ProjectForDashboard } from "@/lib/types";

interface AdvancedWritingAssistantProps {
  project: ProjectForDashboard;
  onProjectUpdate: (updates: Partial<ProjectForDashboard>) => void;
  mode: "textarea" | "guided";
}

interface SuggestionResult {
  suggestions: string[] | { sentence: string; overlap: number }[];
  type: "single" | "overlap";
}

export function AdvancedWritingAssistant({
  project,
  onProjectUpdate,
  mode,
}: AdvancedWritingAssistantProps) {
  const [text, setText] = useState(
    project.sentences.map((s) => s.text).join("\n")
  );
  const [currentLine, setCurrentLine] = useState(0);
  const [wordAnalyses, setWordAnalyses] = useState<WordAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [activeWord, setActiveWord] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyzeCurrentLine = useCallback(
    async (lineText: string) => {
      if (!lineText.trim()) {
        setWordAnalyses([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/protected/corpus/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentence: lineText,
            projectId: project.id,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setWordAnalyses(data.wordAnalyses);
        }
      } catch (error) {
        console.error("Failed to analyze sentence:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [project.id]
  );

  const fetchSuggestions = useCallback(
    async (
      words: string[],
      suggestionMode: "single" | "overlap" = "single"
    ) => {
      if (!words.length) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/protected/corpus/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            words,
            mode: suggestionMode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleTextChange = (newText: string) => {
    setText(newText);

    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const lines = newText.substring(0, cursorPosition).split("\n");
      const currentLineIndex = lines.length - 1;
      const currentLineText = lines[currentLineIndex];

      setCurrentLine(currentLineIndex);

      // Debounce analysis
      const timeoutId = setTimeout(() => {
        analyzeCurrentLine(currentLineText);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  };

  const handleWordClick = (word: string) => {
    setActiveWord(word);
    fetchSuggestions([word], "single");
  };

  const handleContextAnalysis = () => {
    const lines = text.split("\n");
    const currentLineText = lines[currentLine];
    if (currentLineText) {
      const words = currentLineText.split(/\s+/).filter(Boolean);
      fetchSuggestions(words, "overlap");
    }
  };

  const handleExport = () => {
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

  const getWordStatusColor = (status: "correct" | "variant" | "unknown") => {
    switch (status) {
      case "correct":
        return "text-green-600 bg-green-50 border-green-200";
      case "variant":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "unknown":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: "correct" | "variant" | "unknown") => {
    switch (status) {
      case "correct":
        return <CheckCircle className="h-4 w-4" />;
      case "variant":
        return <AlertTriangle className="h-4 w-4" />;
      case "unknown":
        return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Main Writing Area */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {mode === "textarea" ? "Freestyle Writing" : "Guided Writing"}
                </CardTitle>
                <CardDescription>
                  {mode === "textarea"
                    ? "Write freely with real-time assistance"
                    : "Focus on one sentence at a time"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleContextAnalysis}
                  disabled={isLoading}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Analyze Context
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={!text.trim()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Barreessuu jalqabi... (Start writing...)"
              className="min-h-[400px] text-lg leading-relaxed"
            />

            {/* Current Line Analysis */}
            {wordAnalyses.length > 0 && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Current Line Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {wordAnalyses.map((analysis, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`cursor-pointer ${getWordStatusColor(
                          analysis.status
                        )}`}
                        onClick={() => handleWordClick(analysis.word)}
                      >
                        {getStatusIcon(analysis.status)}
                        <span className="ml-1">{analysis.word}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assistant Panel */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Writing Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="suggestions" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-muted-foreground">
                        Loading suggestions...
                      </p>
                    </div>
                  ) : suggestions ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">
                          {suggestions.type === "single"
                            ? `Examples for "${activeWord}"`
                            : "Similar Sentences"}
                        </span>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        {suggestions.type === "overlap"
                          ? (
                              suggestions.suggestions as {
                                sentence: string;
                                overlap: number;
                              }[]
                            ).map((item, index) => (
                              <div
                                key={index}
                                className="p-3 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary">
                                    {item.overlap} matches
                                  </Badge>
                                </div>
                                <p className="text-sm italic">
                                  {item.sentence}
                                </p>
                              </div>
                            ))
                          : (suggestions.suggestions as string[]).map(
                              (suggestion, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-muted/50 rounded-lg"
                                >
                                  <p className="text-sm italic">{suggestion}</p>
                                </div>
                              )
                            )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <Eye className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">
                        Click on a word or use "Analyze Context" to see
                        suggestions
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analysis" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {wordAnalyses.length > 0 ? (
                    <div className="space-y-3">
                      {wordAnalyses.map((analysis, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{analysis.word}</span>
                            <Badge
                              variant="outline"
                              className={getWordStatusColor(analysis.status)}
                            >
                              {analysis.status}
                            </Badge>
                          </div>
                          {analysis.suggestions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                Suggestions:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {analysis.suggestions.map((suggestion, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {suggestion}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">
                        Start typing to see word analysis
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
