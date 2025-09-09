"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react"; // Added useRef
import { useDebounce } from "@/lib/hooks/useDebouce";
import {
  addToPersonalCorpus,
  analyzeSentence,
  getSuggestions,
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
  BookPlus,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import type { WordAnalysis, SuggestionResult, Suggestions } from "@/lib/types";

// NEW: Helper to get the line number from cursor position
const getLineFromPos = (text: string, pos: number) => {
  return text.substring(0, pos).split("\n").length - 1;
};

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
  const [activeLineIndex, setActiveLineIndex] = useState(0); // NEW: State for active line in freestyle
  const [wordAnalyses, setWordAnalyses] = useState<WordAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAddingToCorpus, setIsAddingToCorpus] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // NEW: Ref for the textarea

  // Determine the currently active sentence for analysis, for either mode
  const activeLineForAnalysis =
    mode === "guided"
      ? sentences[guidedSentenceIndex] || ""
      : sentences[activeLineIndex] || "";

  useEffect(() => {
    setSentences(projectContent.split("\n"));
  }, [projectContent]);

  // Debounce the line that needs analysis to avoid excessive calls
  const debouncedActiveLine = useDebounce(activeLineForAnalysis, 500);

  const analyzeLine = useCallback(async (lineText: string) => {
    if (!lineText.trim()) {
      setWordAnalyses([]);
      setSuggestions(null);
      return;
    }
    startTransition(async () => {
      const result = await analyzeSentence(lineText);
      if (result && !("error" in result)) {
        setWordAnalyses(result.wordAnalyses);
      } else {
        toast.error("Analysis Failed", {
          description: (result as { error: string }).error,
        });
      }
    });
  }, []);

  useEffect(() => {
    // This effect now triggers analysis whenever the debounced active line changes
    analyzeLine(debouncedActiveLine);
  }, [debouncedActiveLine, analyzeLine]);

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

  // NEW: Handler to update the active line index based on cursor position in the textarea
  const handleCursorActivity = () => {
    if (textareaRef.current) {
      const currentLine = getLineFromPos(
        textareaRef.current.value,
        textareaRef.current.selectionStart
      );
      if (currentLine !== activeLineIndex) {
        setActiveLineIndex(currentLine);
      }
    }
  };

  const handleWordClick = (word: string) => {
    startTransition(async () => {
      const result = await getSuggestions({ words: [word], mode: "single" }); //
      if (result && "suggestions" in result) {
        setSuggestions(result);
      }
    });
  };

  const handleContextAnalysis = () => {
    const words = activeLineForAnalysis.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      startTransition(async () => {
        const result = await getSuggestions({ words: words, mode: "overlap" }); //
        if (result && "suggestions" in result) {
          setSuggestions(result);
        }
      });
    }
  };

  const handleAddToCorpus = async () => {
    if (!activeLineForAnalysis.trim()) {
      toast.warning("Cannot add an empty sentence to the corpus.");
      return;
    }
    setIsAddingToCorpus(true);
    const result = await addToPersonalCorpus([activeLineForAnalysis]);
    if (result && !("error" in result)) {
      toast.success("Sentence Added");
      analyzeLine(activeLineForAnalysis);
    } else {
      toast.error("Failed to Add Sentence", { description: result.error });
    }
    setIsAddingToCorpus(false);
  };

  // Guided mode navigation
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

  // --- UI Helpers (Highlighting, Icons, etc.) remain the same ---
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
                    ? `Editing line ${
                        activeLineIndex + 1
                      }. Your work saves automatically.`
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
                ref={textareaRef}
                value={projectContent}
                onChange={(e) => {
                  onContentChange(e.target.value);
                  // This is important to update the line index while typing.
                  handleCursorActivity();
                }}
                // onSelect is a more reliable event for cursor position changes via mouse.
                onSelect={handleCursorActivity}
                // onKeyUp handles cursor movement via arrow keys.
                onKeyUp={handleCursorActivity}
                placeholder="Barreessuu jalqabi..."
                className="flex-grow text-lg leading-relaxed"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={sentences[guidedSentenceIndex] || ""}
                    onChange={handleGuidedSentenceChange}
                    placeholder="Type one sentence here..."
                    className="text-lg h-12 flex-grow"
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      analyzeLine(sentences[guidedSentenceIndex] || "")
                    }
                    disabled={
                      isPending ||
                      !(sentences[guidedSentenceIndex] || "").trim()
                    }
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
            {/* Analysis card - no changes needed here */}
            {wordAnalyses.length > 0 && (
              <Card className="bg-muted/50 mt-auto">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-sm">
                    Current Sentence Analysis
                  </CardTitle>
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
                    {wordAnalyses.map((analysis, idx) => (
                      <Badge
                        key={idx}
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
        {/* Assistant card - no changes needed here */}
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
                    {(suggestions.suggestions as Suggestions).map(
                      (item, index) => {
                        let sentence: string;
                        let overlap: number | null = null;
                        if (
                          suggestions.type === "overlap" &&
                          typeof item === "object" &&
                          item !== null &&
                          "sentence" in item &&
                          "overlap" in item
                        ) {
                          sentence = item.sentence;
                          overlap = item.overlap;
                        } else {
                          sentence = item as string;
                        }
                        return (
                          <div
                            key={index}
                            className="p-3 bg-muted/50 rounded-lg text-sm italic"
                          >
                            {overlap !== null && (
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
                      }
                    )}
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
