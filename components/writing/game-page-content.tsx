"use client";

import { useState, useTransition } from "react";
import { getQuizSentences } from "@/lib/actions/quiz";
import { QuizGame } from "./quiz-game";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Gamepad2, Book, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuizSentence {
  correct: string;
  hint: string;
}

export function GamePageContent() {
  const [sentences, setSentences] = useState<QuizSentence[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Quiz options
  const [sentenceCount, setSentenceCount] = useState("10");
  const [sentenceSource, setSentenceSource] = useState<"global" | "personal">(
    "global"
  );

  const handleStartQuiz = () => {
    setError(null);
    startTransition(async () => {
      const result = await getQuizSentences(
        parseInt(sentenceCount, 10),
        sentenceSource
      );
      if (result.error) {
        setError(result.error);
      } else if (result.sentences) {
        setSentences(result.sentences);
        setIsStarted(true);
      }
    });
  };

  const handleQuizComplete = () => {
    setIsStarted(false);
    setSentences([]);
  };

  if (isStarted) {
    return <QuizGame sentences={sentences} onComplete={handleQuizComplete} />;
  }

  return (
    <div className="flex justify-center items-start pt-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Gamepad2 className="h-6 w-6" /> Oromo Writing Quiz
          </CardTitle>
          <CardDescription>
            Test your knowledge of Oromo vowel duplication and sentence
            structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="sentence-count">Number of Sentences</Label>
            <Select value={sentenceCount} onValueChange={setSentenceCount}>
              <SelectTrigger id="sentence-count">
                <SelectValue placeholder="Select number of sentences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Sentences</SelectItem>
                <SelectItem value="10">10 Sentences</SelectItem>
                <SelectItem value="20">20 Sentences</SelectItem>
                <SelectItem value="30">30 Sentences</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Sentence Source</Label>
            <RadioGroup
              value={sentenceSource}
              onValueChange={(value) =>
                setSentenceSource(value as "global" | "personal")
              }
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="global"
                  id="global"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="global"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Book className="mb-3 h-6 w-6" />
                  Global Corpus
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="personal"
                  id="personal"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="personal"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Book className="mb-3 h-6 w-6" />
                  Personal Corpus
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleStartQuiz}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
