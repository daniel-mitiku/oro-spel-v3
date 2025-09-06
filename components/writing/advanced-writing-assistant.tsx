"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useDebounce } from "@/lib/hooks/useDebouce";
// MODIFIED: Import `addToPersonalCorpus`
import {
  analyzeSentence,
  getSuggestions,
  addToPersonalCorpus,
} from "@/lib/actions/corpus";
import { getBaseWord } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  BookPlus, // ADDED
  ScanLine, // ADDED
} from "lucide-react";
import { toast } from "sonner"; // ADDED
import type { WordAnalysis, SuggestionResult } from "@/lib/types";

interface AdvancedWritingAssistantProps {
  projectContent: string;
  onContentChange: (newContent: string) => void;
  mode: "textarea" | "guided";
}

export function AdvancedWritingAssistant({
  projectContent,
  onContentChange,
  mode,
}: AdvancedWritingAssistantProps) {
  const [sentences, setSentences] = useState<string[]>(
    projectContent.split("\n")
  );
  const [guidedSentenceIndex, setGuidedSentenceIndex] = useState(0);
  const [wordAnalyses, setWordAnalyses] = useState<WordAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAddingToCorpus, setIsAddingToCorpus] = useState(false); // ADDED

  const currentGuidedSentence = sentences[guidedSentenceIndex] || "";
  const activeLineForAnalysis =
    mode === "guided"
      ? currentGuidedSentence
      : projectContent.split("\n").pop() || "";

  useEffect(() => {
    setSentences(projectContent.split("\n"));
  }, [projectContent]);

  // MODIFIED: Debounce is now only for freestyle text analysis
  const debouncedFreestyleText = useDebounce(projectContent, 1000);

  const analyzeLine = useCallback(async (lineText: string) => {
    if (!lineText.trim()) {
      setWordAnalyses([]);
      return;
    }
    startTransition(async () => {
      const result = await analyzeSentence(lineText);
      if (result && !("error" in result)) {
        setWordAnalyses(result.wordAnalyses);
      } else {
        toast.error("Analysis Failed", { description: result.error });
      }
    });
  }, []);

  useEffect(() => {
    // MODIFIED: This effect now ONLY handles auto-analysis for freestyle mode.
    if (mode === "textarea") {
      const lines = debouncedFreestyleText.split("\n");
      // Analyze the last line as the user types.
      analyzeLine(lines[lines.length - 1] || "");
    } else {
      // In guided mode, clear analysis when sentence changes, user must manually re-analyze.
      setWordAnalyses([]);
      setSuggestions(null);
    }
  }, [debouncedFreestyleText, mode, analyzeLine, guidedSentenceIndex]); // MODIFIED: Added guidedSentenceIndex

  // --- HANDLERS ---
  const handleGuidedSentenceChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newSentence = e.target.value;
    const updatedSentences = [...sentences];
    updatedSentences[guidedSentenceIndex] = newSentence;
    setSentences(updatedSentences);
    onContentChange(updatedSentences.join("\n"));
  };

  const handleWordClick = (word: string) => {
    startTransition(async () => {
      const result = await getSuggestions({ words: [word], mode: "single" });
      if (result && "suggestions" in result) {
        setSuggestions(result);
      }
    });
  };

  const handleContextAnalysis = () => {
    const words = activeLineForAnalysis.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      startTransition(async () => {
        const result = await getSuggestions({ words, mode: "overlap" });
        if (result && "suggestions" in result) {
          setSuggestions(result);
        }
      });
    }
  };

  // NEW: Handler to add the current sentence to the personal corpus
  const handleAddToCorpus = async () => {
    if (!activeLineForAnalysis.trim()) {
      toast.warning("Cannot add an empty sentence to the corpus.");
      return;
    }
    setIsAddingToCorpus(true);
    const result = await addToPersonalCorpus([activeLineForAnalysis]);
    if (result.success) {
      toast.success("Sentence Added", {
        description: `"${activeLineForAnalysis.substring(
          0,
          30
        )}..." added to your personal corpus.`,
      });
      // Optionally re-analyze the line to reflect the new "correct" status
      analyzeLine(activeLineForAnalysis);
    } else {
      toast.error("Failed to Add Sentence", {
        description: result.error,
      });
    }
    setIsAddingToCorpus(false);
  };

  const goToPrevSentence = () =>
    setGuidedSentenceIndex((prev) => Math.max(0, prev - 1));
  const goToNextSentence = () =>
    setGuidedSentenceIndex((prev) => Math.min(sentences.length - 1, prev + 1));
  const addNewSentence = () => {
    const newSentences = [...sentences, ""];
    setSentences(newSentences);
    setGuidedSentenceIndex(newSentences.length - 1);
    onContentChange(newSentences.join("\n"));
  };

  // --- HIGHLIGHTING LOGIC ---
  const highlightSentence = (
    sentence: string,
    baseWordsToHighlight: Set<string>
  ) => {
    if (!baseWordsToHighlight || baseWordsToHighlight.size === 0)
      return sentence;
    const textBaseWords = new Set(
      activeLineForAnalysis.split(/\s+/).map(getBaseWord).filter(Boolean)
    );
    return sentence
      .split(/(\s+)/)
      .map((part) => {
        if (part.trim() === "") return part;
        const partBase = getBaseWord(part);
        if (textBaseWords.has(partBase)) {
          return `<strong class="text-blue-500 not-italic">${part}</strong>`;
        }
        return part;
      })
      .join("");
  };

  const baseWordsForHighlighting = new Set(
    activeLineForAnalysis.split(/\s+/).map(getBaseWord).filter(Boolean)
  );

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
      <div className="lg:col-span-2 space-y-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {mode === "textarea"
                    ? "Freestyle Editor"
                    : "Guided Sentence Writer"}
                </CardTitle>
                <CardDescription>
                  {mode === "textarea"
                    ? "Write freely. Changes auto-save."
                    : `Editing sentence ${guidedSentenceIndex + 1} of ${
                        sentences.length
                      }.`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleContextAnalysis}
                disabled={isPending || !activeLineForAnalysis.trim()}
              >
                <Search className="mr-2 h-4 w-4" /> Deeper Context Analysis
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow flex flex-col">
            {mode === "textarea" ? (
              <Textarea
                value={projectContent}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Barreessuu jalqabi..."
                className="flex-grow text-lg leading-relaxed"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={currentGuidedSentence}
                    onChange={handleGuidedSentenceChange}
                    placeholder="Type one sentence here..."
                    className="text-lg h-12 flex-grow"
                  />
                  {/* ADDED: Manual analysis button for guided mode */}
                  <Button
                    variant="secondary"
                    onClick={() => analyzeLine(currentGuidedSentence)}
                    disabled={isPending || !currentGuidedSentence.trim()}
                  >
                    <ScanLine className="h-4 w-4 mr-2" /> Analyze
                  </Button>
                </div>
                <div className="flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={goToPrevSentence}
                    disabled={guidedSentenceIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {guidedSentenceIndex + 1} / {sentences.length}
                  </span>
                  {guidedSentenceIndex === sentences.length - 1 ? (
                    <Button variant="default" onClick={addNewSentence}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add New
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={goToNextSentence}>
                      Next <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            {wordAnalyses.length > 0 && (
              <Card className="bg-muted/50 mt-auto">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-sm">
                    Current Sentence Analysis
                  </CardTitle>
                  {/* ADDED: "Add to Corpus" Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddToCorpus}
                    disabled={isAddingToCorpus || !activeLineForAnalysis.trim()}
                  >
                    {isAddingToCorpus ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BookPlus className="h-4 w-4 mr-2" />
                    )}
                    Add to Personal Corpus
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {wordAnalyses.map((analysis) => (
                      <Badge
                        key={analysis.position}
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
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" /> Writing Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions && suggestions.suggestions.length > 0 ? (
                <div className="space-y-4">
                  <Separator />
                  <div className="space-y-3">
                    {(suggestions.suggestions as any[]).map((item, index) => {
                      const sentence =
                        suggestions.type === "overlap" ? item.sentence : item;
                      const overlap =
                        suggestions.type === "overlap" ? item.overlap : null;
                      return (
                        <div
                          key={index}
                          className="p-3 bg-muted/50 rounded-lg text-sm italic"
                        >
                          {overlap && (
                            <Badge variant="secondary" className="mb-2">
                              {overlap} matches
                            </Badge>
                          )}
                          <p
                            dangerouslySetInnerHTML={{
                              __html: highlightSentence(
                                sentence,
                                baseWordsForHighlighting
                              ),
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Eye className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Click a word or use analysis tools to see examples.
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
