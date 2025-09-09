"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCw,
  Trophy,
} from "lucide-react";
import { saveQuizSession } from "@/lib/actions/quiz";
import { toast } from "sonner";

interface QuizSentence {
  correct: string;
  hint: string;
}

interface QuizGameProps {
  sentences: QuizSentence[];
  onComplete?: () => void;
}

export function QuizGame({ sentences, onComplete }: QuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: "success" | "error";
  }>({ text: "", type: "success" });
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);

  // NEW: State for timing the quiz
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Start the timer when the component mounts
    setStartTime(Date.now());
  }, []);

  const isComplete = currentIndex >= sentences.length;
  const currentSentence = sentences[currentIndex];
  const progress =
    ((currentIndex + (isCorrect ? 1 : 0)) / sentences.length) * 100;

  useEffect(() => {
    if (!isComplete && currentSentence && inputRef.current) {
      setIsCorrect(false);
      setFeedback({ text: "", type: "success" });
      inputRef.current.innerHTML = currentSentence.hint;
      inputRef.current.focus();
    }
  }, [currentIndex, sentences, isComplete, currentSentence]);

  const checkAnswer = () => {
    if (!inputRef.current || !currentSentence) return;

    const userText = inputRef.current.innerText.trim();
    const userWords = userText.split(/\s+/).filter(Boolean);
    const correctWords = currentSentence.correct.split(/\s+/).filter(Boolean);

    let allCorrect = true;
    let resultHTML = "";
    const maxLength = Math.max(userWords.length, correctWords.length);

    for (let i = 0; i < maxLength; i++) {
      const userWord = userWords[i];
      const correctWord = correctWords[i];

      if (!userWord || !correctWord || userWord !== correctWord) {
        allCorrect = false;
        resultHTML += `<span class="text-destructive underline decoration-wavy">${
          userWord || ""
        }</span> `;
      } else {
        resultHTML += `<span class="text-green-600">${userWord}</span> `;
      }
    }

    inputRef.current.innerHTML = resultHTML.trim();
    const isPerfect = allCorrect && userWords.length === correctWords.length;

    setIsCorrect(isPerfect);
    setAttempts((prev) => prev + 1);

    if (isPerfect) {
      setScore((prev) => prev + 1);
      setFeedback({ text: "Baga Gammaddan! Sirrii dha!", type: "success" });
    } else {
      setFeedback({ text: "Ammas yaali. (Try again)", type: "error" });
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setAttempts(0);
    setIsCorrect(false);
    setFeedback({ text: "", type: "success" });
  };

  // REWRITTEN: handleComplete now saves the session
  const handleComplete = async () => {
    const endTime = Date.now();
    const timeSpent = startTime ? Math.round((endTime - startTime) / 1000) : 0;
    const finalScore = Math.round((score / sentences.length) * 100);

    const result = await saveQuizSession({
      score: finalScore,
      totalQuestions: sentences.length,
      correctAnswers: score,
      timeSpent: timeSpent,
    });

    if (result.success) {
      toast.success("Quiz results saved!");
    } else {
      toast.error("Could not save results", { description: result.error });
    }

    if (onComplete) {
      onComplete();
    } else {
      handleRestart(); // Default behavior if no onComplete is provided
    }
  };

  if (isComplete) {
    const finalScore = Math.round((score / sentences.length) * 100);

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Quiz Complete!</h2>
          <div className="space-y-4">
            <div className="text-6xl font-bold text-primary">{finalScore}%</div>
            <p className="text-muted-foreground">
              You got {score} out of {sentences.length} sentences correct
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleRestart} size="lg">
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleComplete} variant="outline" size="lg">
                Finish Quiz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">
              Shaakala Himoota Afaan Oromoo
            </CardTitle>
            <CardDescription>
              Correct the sentence by fixing the vowel duplications
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {currentIndex + 1} / {sentences.length}
          </Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">
            HINT:
          </label>
          <div className="bg-muted rounded-lg p-4 text-lg italic">
            {currentSentence?.hint}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">
            YOUR ANSWER:
          </label>
          <div
            ref={inputRef}
            contentEditable={!isCorrect}
            onInput={() => setFeedback({ text: "", type: "success" })}
            className="w-full min-h-[100px] bg-background border-2 border-input rounded-lg p-4 text-lg focus:border-ring outline-none"
            style={{ wordBreak: "break-word" }}
          />
        </div>

        {feedback.text && (
          <div
            className={`text-center font-semibold flex items-center justify-center gap-2 ${
              feedback.type === "success"
                ? "text-green-600"
                : "text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {feedback.text}
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={checkAnswer} disabled={isCorrect} className="flex-1">
            Check Answer
          </Button>
          <Button onClick={handleNext} disabled={!isCorrect} className="flex-1">
            Next Sentence <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Score: {score}/{currentIndex + (isCorrect ? 1 : 0)} • Attempts:{" "}
          {attempts}
        </div>
      </CardContent>
    </Card>
  );
}
