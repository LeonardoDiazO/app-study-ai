import type { CoursePlan } from '../types/course';
import type { Flashcard } from '../types/flashcard';

export function buildCards(plan: CoursePlan): Flashcard[] {
  const cards: Flashcard[] = [];

  plan.modules?.forEach((mod) => {
    mod.quiz?.forEach((q, qi) => {
      if (!q.question) return;
      cards.push({
        id: `m${mod.id}_q${qi}`,
        moduleId: mod.id,
        moduleName: mod.title,
        sourceFile: mod.sourceFile || '',
        type: 'quiz',
        front: q.question,
        back: `✅ ${q.options?.[q.correct] || ''}${q.explanation ? `\n\n📖 ${q.explanation}` : ''}`,
      });
    });

    mod.keyConcepts?.forEach((kc, ki) => {
      cards.push({
        id: `m${mod.id}_kc${ki}`,
        moduleId: mod.id,
        moduleName: mod.title,
        sourceFile: mod.sourceFile || '',
        type: 'concept',
        front: `¿Qué es "${kc}"?`,
        back: `Módulo: "${mod.title}"\n\n${mod.summary?.slice(0, 200) || ''}…`,
      });
    });
  });

  return cards;
}
