import type { Exercise } from "@lernen/shared";
import { checkAnswer } from "@lernen/shared";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExerciseRenderer } from "../components/ExerciseRenderer";
import { AppLayout } from "../components/layout/AppLayout";
import { ProgressBar } from "../components/ProgressBar";
import {
  useCompleteLesson,
  useLesson,
  useStartLesson,
} from "../hooks/use-lesson";
import { cn } from "../lib/utils";

interface AnswerRecord {
  exerciseId: string;
  answer: string;
  timeSpentMs: number;
  isCorrect: boolean;
  isTypo: boolean;
  correctAnswer: string;
  explanation?: string;
}

export function LearnPage() {
  const { lessonId } = useParams({ from: "/learn/$lessonId" });
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { mutate: startLesson } = useStartLesson();
  const { mutate: completeLesson, isPending: isCompleting } =
    useCompleteLesson();

  const [phase, setPhase] = useState<"explanation" | "exercises" | "results">(
    "explanation",
  );
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{
    isCorrect: boolean;
    isTypo: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null>(null);
  const [finalResult, setFinalResult] = useState<{
    score: number;
    xpEarned: number;
    correctAnswers: number;
    totalExercises: number;
  } | null>(null);

  useEffect(() => {
    if (lesson) {
      startLesson(lessonId);
      if (!lesson.content.explanation) {
        setPhase("exercises");
      }
    }
  }, [lesson, lessonId, startLesson]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="animate-spin text-amber-400" />
        </div>
      </AppLayout>
    );
  }

  if (!lesson) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-slate-400 mb-4">Lesson not found.</p>
            <Link
              to="/dashboard"
              className="text-amber-400 hover:text-amber-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const exercises = lesson.content.exercises;
  const currentExercise = exercises[currentExIndex] as Exercise | undefined;
  const progress =
    exercises.length > 0 ? (currentExIndex / exercises.length) * 100 : 0;

  const handleAnswer = (answer: string, timeSpentMs: number) => {
    if (!currentExercise) return;

    const { isCorrect, isTypo } = checkAnswer(
      currentExercise.type,
      answer,
      currentExercise.answer,
    );

    setCurrentResult({
      isCorrect,
      isTypo,
      correctAnswer: currentExercise.answer,
      explanation: currentExercise.explanation,
    });

    setAnswers((prev) => [
      ...prev,
      {
        exerciseId: currentExercise.id,
        answer,
        timeSpentMs,
        isCorrect,
        isTypo,
        correctAnswer: currentExercise.answer,
        explanation: currentExercise.explanation,
      },
    ]);
  };

  const handleNext = () => {
    setCurrentResult(null);
    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex((i) => i + 1);
    } else {
      // All exercises done — submit
      const allAnswers = answers.map((a) => ({
        exerciseId: a.exerciseId,
        answer: a.answer,
        timeSpentMs: a.timeSpentMs,
      }));
      completeLesson(
        { lessonId, answers: allAnswers },
        {
          onSuccess: (result) => {
            setFinalResult(result);
            setPhase("results");
          },
        },
      );
    }
  };

  if (phase === "explanation" && lesson.content.explanation) {
    return (
      <AppLayout>
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link
              to="/dashboard"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                {lesson.type}
              </p>
              <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-amber-400" />
              <h2 className="font-semibold text-white">Lesson Overview</h2>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {lesson.content.explanation.markdown}
                </Markdown>
              </pre>
            </div>
          </div>

          {/* Examples */}
          {lesson.content.explanation.examples.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold text-white mb-4">Examples</h3>
              <div className="space-y-3">
                {lesson.content.explanation.examples.map((example, i) => (
                  <div key={i} className="p-3 bg-slate-800 rounded-xl">
                    <p className="text-amber-300 font-medium">
                      {example.german}
                    </p>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {example.english}
                    </p>
                    {example.annotation && (
                      <p className="text-slate-500 text-xs mt-1 italic">
                        {example.annotation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPhase("exercises")}
            className="w-full py-4 bg-amber-400 text-slate-950 rounded-xl font-semibold text-lg hover:bg-amber-500 transition-colors flex items-center justify-center gap-2"
          >
            Start Exercises
            <ArrowRight size={20} />
          </button>
        </div>
      </AppLayout>
    );
  }

  if (phase === "exercises" && currentExercise) {
    return (
      <AppLayout>
        <div className="px-6 py-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Exit
            </Link>
            <p className="text-sm text-slate-400">
              {currentExIndex + 1} / {exercises.length}
            </p>
          </div>

          <ProgressBar value={progress} max={100} className="mb-8" />

          {/* Exercise type badge */}
          <div className="mb-6">
            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs rounded-full font-medium uppercase tracking-wide">
              {currentExercise.type.replace(/_/g, " ")}
            </span>
          </div>

          <ExerciseRenderer
            key={currentExercise.id}
            exercise={currentExercise}
            onAnswer={handleAnswer}
            showResult={!!currentResult}
            isCorrect={currentResult?.isCorrect}
            isTypo={currentResult?.isTypo}
            correctAnswer={currentResult?.correctAnswer}
            wrongFeedback={
              currentResult && !currentResult.isCorrect
                ? currentExercise.wrongFeedback
                : undefined
            }
            correctFeedback={
              currentResult?.isCorrect
                ? currentExercise.correctFeedback
                : undefined
            }
          />

          {/* Next button */}
          {currentResult && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isCompleting}
              className={cn(
                "w-full mt-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2",
                currentResult.isCorrect
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-slate-700 text-white hover:bg-slate-600",
              )}
            >
              {isCompleting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : currentExIndex < exercises.length - 1 ? (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              ) : (
                <>
                  Finish Lesson
                  <CheckCircle size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </AppLayout>
    );
  }

  if (phase === "results" && finalResult) {
    const scoreColor =
      finalResult.score >= 80
        ? "text-emerald-400"
        : finalResult.score >= 60
          ? "text-amber-400"
          : "text-red-400";

    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="text-center max-w-md w-full">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4",
                finalResult.score >= 80
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : finalResult.score >= 60
                    ? "bg-amber-400/10 border-amber-400/30"
                    : "bg-red-500/10 border-red-500/30",
              )}
            >
              <span className={cn("text-3xl font-bold", scoreColor)}>
                {finalResult.score}%
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Lesson Complete!
            </h2>
            <p className="text-slate-400 mb-8">
              {finalResult.correctAnswers} of {finalResult.totalExercises}{" "}
              correct
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className={cn("text-3xl font-bold", scoreColor)}>
                    {finalResult.score}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-400">
                    +{finalResult.xpEarned}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">XP earned</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to="/dashboard"
                className="flex-1 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors text-center"
              >
                Dashboard
              </Link>
              <Link
                to="/review"
                className="flex-1 py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors text-center"
              >
                Review Cards
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return null;
}
