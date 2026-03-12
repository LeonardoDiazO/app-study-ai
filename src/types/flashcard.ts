export type FlashcardType = 'quiz' | 'concept';

export type BoxLevel = 0 | 1 | 2 | 3; // 0: unseen, 1: Again, 2: Good, 3: Master

export interface Flashcard {
  id: string;
  moduleId: number;
  moduleName: string;
  sourceFile: string;
  type: FlashcardType;
  front: string;
  back: string;
}

export interface FlashcardProgress {
  [cardId: string]: BoxLevel;
}
