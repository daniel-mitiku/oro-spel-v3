"use client";

import { useState, useEffect, useTransition, Key } from "react";
import {
  getPersonalCorpusStatsAndData,
  deletePersonalCorpusSentence,
} from "@/lib/actions/corpus";

import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  BookOpen,
  TrendingUp,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { EnhancedCorpusData } from "@/lib/types";

interface CorpusStats {
  totalWords: number;
  totalSentences: number;
  totalVariants: number;
}

interface PersonalCorpusEntry {
  id: string;
  sentence: string;
  baseWords: string[];
}

export function CorpusManager() {
  const [personalCorpus, setPersonalCorpus] = useState<PersonalCorpusEntry[]>(
    []
  );
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    startTransition(async () => {
      setError(null);
      const result = await getPersonalCorpusStatsAndData();
      if (result.error) {
        setError(result.error);
        toast.error("Failed to fetch corpus data", {
          description: result.error,
        });
      } else if (result.corpusData && result.stats) {
        // Since we only want to show sentences, we need to process the data differently.
        const allSentences: PersonalCorpusEntry[] = [];
        result.corpusData.forEach((entry) => {
          // This is a client-side calculation to create a new structure
          entry.sentences.forEach((sentence: string, index: number) => {
            const sentenceId = `${entry.id}-${index}`; // This is a temporary ID for the list
            allSentences.push({
              id: sentenceId,
              sentence: sentence,
              baseWords: [entry.baseWord],
            });
          });
        });
        setPersonalCorpus(allSentences);
        setStats(result.stats);
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteSentence = async (sentenceId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this sentence? This cannot be undone."
      )
    ) {
      const result = await deletePersonalCorpusSentence(sentenceId);
      if (result.success) {
        toast.success("Sentence deleted successfully.");
        fetchData(); // Refresh the data
      } else {
        toast.error("Deletion failed", { description: result.error });
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Corpus Manager</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Stat Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Words</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWords ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sentences
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalSentences ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Word Variants</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalVariants ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Corpus Browser</CardTitle>
          <CardDescription>
            View and manage the sentences you've added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex justify-center items-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="h-[500px] flex items-center justify-center">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {personalCorpus.length > 0 ? (
                  personalCorpus.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-3 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground italic">
                          {entry.sentence}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {entry.baseWords.map((word) => (
                            <Badge key={word} variant="outline">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSentence(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    No sentences found in your personal corpus.
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
