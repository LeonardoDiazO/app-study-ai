import type { Flashcard, FlashcardProgress } from '../types/flashcard';

interface ProgressParams {
  isViewed: boolean;
  quizScore: { correct: number; total: number } | undefined;
  moduleCards: Flashcard[];
  fcProgress: FlashcardProgress;
}

/**
 * Calculates overall module completion as a 0-100 integer.
 *
 * Weight breakdown:
 *   Viewed content tab : 20 pts
 *   Quiz score         : up to 50 pts  (score% × 50)
 *   Flashcards mastered: up to 30 pts  (mastered/total × 30)
 *                        → 30 pts when module has no flashcards
 *
 * Total = 100 pts when all activities are completed perfectly.
 */
export function calcModuleProgress({
  isViewed,
  quizScore,
  moduleCards,
  fcProgress,
}: ProgressParams): number {
  const viewPts = isViewed ? 20 : 0;

  const quizPts = quizScore
    ? Math.round((quizScore.correct / quizScore.total) * 50)
    : 0;

  const fcPts =
    moduleCards.length > 0
      ? Math.round(
          (moduleCards.filter((c) => (fcProgress[c.id] || 0) >= 3).length /
            moduleCards.length) *
            30
        )
      : 30; // no flashcards → full weight

  return Math.min(100, viewPts + quizPts + fcPts);
}

/** Returns a Tailwind color class for the progress bar based on completion %. */
export function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 40) return 'bg-yellow-500';
  return 'bg-gray-600';
}
