import type { CoursePlan } from '../../types/course';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface PdfInput {
  name: string;
  b64: string;
  pages?: number; // extracted from PDF binary; 0 = unknown
}

export interface LoadingStep {
  text: string;
  done: boolean;
}

export interface AIProvider {
  generateCourse(
    pdfs: PdfInput[],
    courseName: string,
    onStep: (step: LoadingStep) => void,
    initialModules?: unknown[],
    onPdfComplete?: (modules: unknown[]) => void
  ): Promise<CoursePlan>;

  chat(messages: ChatMessage[], systemContext: string): Promise<string>;
}
