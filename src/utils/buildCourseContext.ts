import type { CoursePlan } from '../types/course';

export function buildCourseContext(plan: CoursePlan | null): string {
  if (!plan) return '';

  let ctx = `CURSO: ${plan.title}\n${plan.description}\n\n`;

  plan.modules?.forEach((m) => {
    ctx += `## MÓDULO ${m.id}: ${m.title}${m.sourceFile ? ` [${m.sourceFile}]` : ''}\n`;
    ctx += `Resumen: ${m.summary}\nConceptos: ${m.keyConcepts?.join(', ')}\n`;
    m.quiz?.forEach((q) => {
      ctx += `P: ${q.question} → R: ${q.options?.[q.correct] || ''}. ${q.explanation || ''}\n`;
    });
    ctx += '\n';
  });

  return ctx;
}
