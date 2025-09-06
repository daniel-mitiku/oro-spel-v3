"use client";

import { useState, useRef, useCallback, useTransition } from "react";
// Import your server actions
import { analyzeSentence, getSuggestions } from "@/lib/actions/corpus";
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
  Loader2,
} from "lucide-react";
import type {
  WordAnalysis,
  ProjectForDashboard,
  SuggestionResult,
} from "@/lib/types";

interface AdvancedWritingAssistantProps {
  project: ProjectForDashboard;
}

export function AdvancedWritingAssistant({
  project,
}: AdvancedWritingAssistantProps) {
  const [text, setText] = useState(
    project.sentences.map((s) => s.text).join("\n")
  );
  const [currentLine, setCurrentLine] = useState(0);
  const [wordAnalyses, setWordAnalyses] = useState<WordAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [activeWord, setActiveWord] = useState<string>("");
  const [isPending, startTransition] = useTransition(); // Use transition for non-blocking UI updates
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyzeCurrentLine = useCallback(async (lineText: string) => {
    if (!lineText.trim()) {
      setWordAnalyses([]);
      return;
    }

    startTransition(async () => {
      const result = await analyzeSentence(lineText);
      if (result && !result.error && result.wordAnalyses) {
        setWordAnalyses(result.wordAnalyses);
      } else {
        console.error("Analysis failed:", result.error);
      }
    });
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Debounce analysis
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPosition = textareaRef.current.selectionStart;
        const textUpToCursor = newText.substring(0, cursorPosition);
        const lines = textUpToCursor.split("\n");
        const currentLineIndex = lines.length - 1;
        const currentLineText = newText.split("\n")[currentLineIndex];

        setCurrentLine(currentLineIndex);
        analyzeCurrentLine(currentLineText);
      }
    }, 500); // 500ms debounce
  };

  const handleWordClick = (word: string) => {
    setActiveWord(word);
    startTransition(async () => {
      const result = await getSuggestions({ words: [word], mode: "single" });
      if (result && "suggestions" in result) {
        setSuggestions(result);
      } else {
        // Handle the error case, for example, by setting suggestions to null
        // and maybe showing a user notification.
        setSuggestions(null);
        // Optional: Add logic to display an error message to the user.
        console.error("Failed to get suggestions:", result.error);
      }
    });
  };

  const handleContextAnalysis = () => {
    const lines = text.split("\n");
    const currentLineText = lines[currentLine];
    if (currentLineText) {
      const words = currentLineText.split(/\s+/).filter(Boolean);
      startTransition(async () => {
        const result = await getSuggestions({ words, mode: "overlap" });
        if (result && "suggestions" in result) {
          setSuggestions(result);
        }
      });
    }
  };

  const handleExport = () => {
    // This logic remains the same as it's client-side
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

  // The rest of your component (getWordStatusColor, getStatusIcon, JSX) remains largely the same.
  // Just update the loading state to use `isPending` from `useTransition`.

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
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Writing Pad</CardTitle>
                <CardDescription>
                  Write freely with real-time assistance on the current line.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleContextAnalysis}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
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
          <CardContent className="space-y-4 flex-grow flex flex-col">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onSelect={handleTextChange} // Re-analyze on selection change in a line
              placeholder="Barreessuu jalqabi... (Start writing...)"
              className="flex-grow text-lg leading-relaxed"
            />

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
                <TabsTrigger value="analysis">Analysis Details</TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {isPending ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : suggestions && suggestions.suggestions.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">
                          {suggestions.type === "single"
                            ? `Examples for "${activeWord}"`
                            : "Similar Sentences (High Overlap)"}
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
                                <Badge variant="secondary">
                                  {item.overlap} matches
                                </Badge>
                                <p className="text-sm italic mt-1">
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
                        Click on a colored word or use "Analyze Context" to see
                        suggestions.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analysis" className="mt-4">
                {/* This tab can show more detailed analysis if needed in the future */}
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Detailed word analysis will appear here.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
