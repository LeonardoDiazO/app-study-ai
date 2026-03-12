export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface ConceptMapData {
  central: string;
  branches?: Array<{
    concept: string;
    children?: string[];
  }>;
}

export interface Module {
  id: number;
  title: string;
  summary: string;
  keyConcepts: string[];
  quiz: QuizQuestion[];

  // Visual learning
  markmapContent?: string;    // Markdown → Markmap interactive mind map
  mermaidDiagram?: string;    // Mermaid syntax → flow/concept diagram
  conceptMap?: ConceptMapData; // Legacy SVG format (backward compat with saved courses)

  // Visual elements extracted from the PDF (descriptions of images, charts, tables)
  visualContent?: VisualElement[];

  // Coding practice
  hasPractice?: boolean;
  practiceTitle?: string;
  practiceDescription?: string;
  practiceCode?: string;
  practiceSolution?: string;

  sourceFile?: string;
}

export interface VisualElement {
  type: 'table' | 'chart' | 'diagram' | 'image' | 'figure';
  description: string; // What the visual shows
  keyInfo: string;     // Key data/conclusion extracted from it
}

export interface CoursePlan {
  title: string;
  description: string;
  modules: Module[];
  finalExam?: QuizQuestion[];
}

export type AppView = 'upload' | 'loading' | 'plan' | 'module' | 'exam' | 'allnotes' | 'flashcards';

export interface CourseScores {
  [moduleId: number]: number;
}
