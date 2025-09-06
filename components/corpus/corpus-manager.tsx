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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  BookOpen,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getPersonalCorpusStatsAndData } from "@/lib/actions/corpus"; // Import the new action and its type
import { PersonalCorpusIndexData } from "@/lib/types";

interface CorpusStats {
  totalWords: number;
  totalSentences: number;
  totalVariants: number;
}

export function CorpusManager() {
  // Use the specific types for state
  const [personalCorpus, setPersonalCorpus] = useState<
    PersonalCorpusIndexData[]
  >([]);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getPersonalCorpusStatsAndData();

      if (result.error) {
        setError(result.error);
        setPersonalCorpus([]);
        setStats(null);
      } else if (result.corpusData && result.stats) {
        setPersonalCorpus(result.corpusData);
        setStats(result.stats);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    return (
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Personal Corpus</CardTitle>
            <CardDescription>
              A summary of the words and sentences you have added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {personalCorpus.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{entry.baseWord}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.variants.length} variants •{" "}
                        {entry.sentenceIds.length} sentences
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    );
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
        {renderContent()}
      </Tabs>
    </div>
  );
}
