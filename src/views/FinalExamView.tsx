import { useState } from 'react';
import type { CoursePlan } from '../types/course';

interface ExamState {
  answers: Record<number, number>;
  submitted: boolean;
  score: number;
}

interface Props {
  plan: CoursePlan;
  onBack: () => void;
}

export function FinalExamView({ plan, onBack }: Props) {
  const [exam, setExam] = useState<ExamState>({ answers: {}, submitted: false, score: 0 });
  const qs = plan.finalExam || [];

  const submitExam = () => {
    let s = 0;
    qs.forEach((q, i) => { if (exam.answers[i] === q.correct) s++; });
    setExam((e) => ({ ...e, submitted: true, score: s }));
  };

  if (exam.submitted) {
    const pct = Math.round((exam.score / qs.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-7xl mb-4">{passed ? '🏆' : '📚'}</div>
          <h2 className="text-2xl font-bold">{passed ? '¡Curso Completado!' : 'Sigue practicando'}</h2>
          <div className={`text-5xl font-bold my-4 ${passed ? 'text-yellow-400' : 'text-orange-400'}`}>{pct}%</div>
          <p className="text-gray-400 text-sm">{exam.score} de {qs.length} correctas</p>
          {passed && <p className="text-green-400 mt-2 text-sm">🎓 Dominaste "{plan.title}"</p>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button onClick={onBack} className="px-5 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium text-sm">← Volver</button>
            {!passed && (
              <button onClick={() => setExam({ answers: {}, submitted: false, score: 0 })} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium text-sm">🔄 Reintentar</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg text-xl leading-none">←</button>
          <div className="flex-1">
            <h2 className="font-bold text-white text-sm">🏆 Examen Final</h2>
            <p className="text-gray-500 text-xs">{plan.title}</p>
          </div>
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1.5 rounded-full">{Object.keys(exam.answers).length}/{qs.length}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {qs.map((q, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-800">
            <p className="text-white font-medium text-sm mb-4">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {(q.options || []).map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setExam((e) => ({ ...e, answers: { ...e.answers, [i]: oi } }))}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${exam.answers[i] === oi ? 'bg-yellow-600/40 border border-yellow-500/50 text-white' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'}`}
                >
                  <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][oi]}.</span>{opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={submitExam}
          disabled={Object.keys(exam.answers).length < qs.length}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-2xl text-white font-bold"
        >
          Enviar Examen ({Object.keys(exam.answers).length}/{qs.length})
        </button>
      </div>
    </div>
  );
}
