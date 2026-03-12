import { useCallback } from 'react';
import { storageSet } from '../services/storage';
import type { FlashcardProgress, BoxLevel } from '../types/flashcard';

export function useFlashcards(
  fcProgress: FlashcardProgress,
  setFcProgress: (p: FlashcardProgress) => void,
  storageKey: string,
) {
  const update = useCallback(
    async (cardId: string, box: BoxLevel) => {
      const next = { ...fcProgress, [cardId]: box };
      setFcProgress(next);
      await storageSet(storageKey, next);
    },
    [fcProgress, setFcProgress, storageKey]
  );

  const reset = useCallback(async () => {
    setFcProgress({});
    await storageSet(storageKey, {});
  }, [setFcProgress, storageKey]);

  return { update, reset };
}
