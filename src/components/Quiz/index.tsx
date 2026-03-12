import { useState } from 'react';
import type { QuizQuestion } from '../../types/course';

interface Props {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
}

export function Quiz({ questions, onComplete }: Props) {
  const [ans, setAns] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const submit = () => {
    let s = 0;
    questions.forEach((q, i) => { if (ans[i] === q.correct) s++; });
    setScore(s);
    setSubmitted(true);
    onComplete(s, questions.length);
  };

  if (submitted) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div>
        <div className={`text-center py-5 rounded-xl mb-5 ${pct >= 70 ? 'bg-green-900/30 border border-green-500/30' : 'bg-orange-900/30 border border-orange-500/30'}`}>
          <div className={`text-4xl font-bold ${pct >= 70 ? 'text-green-400' : 'text-orange-400'}`}>{pct}%</div>
          <p className="text-gray-300 text-sm mt-1">{score} de {questions.length} correctas</p>
          <p className="text-sm mt-1">{pct >= 70 ? '✅ ¡Módulo completado!' : '📚 Repasa y vuelve a intentarlo'}</p>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ok = ans[i] === q.correct;
            return (
              <div key={i} className={`p-4 rounded-xl border ${ok ? 'border-green-500/25 bg-green-900/10' : 'border-red-500/25 bg-red-900/10'}`}>
                <p className="text-sm text-gray-200 font-medium mb-1.5">{i + 1}. {q.question}</p>
                <p className="text-xs text-gray-400">Tu resp: <span className={ok ? 'text-green-400' : 'text-red-400'}>{q.options?.[ans[i]] ?? 'Sin resp'}</span></p>
                {!ok && <p className="text-xs text-gray-400">Correcta: <span className="text-green-400">{q.options?.[q.correct]}</span></p>}
                {q.explanation && <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="bg-gray-800/50 rounded-xl p-4">
          <p className="text-gray-200 font-medium text-sm mb-3">{i + 1}. {q.question}</p>
          <div className="space-y-2">
            {(q.options || []).map((opt, oi) => (
              <button
                key={oi}
                onClick={() => setAns((a) => ({ ...a, [i]: oi }))}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${ans[i] === oi ? 'bg-indigo-600 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'}`}
              >
                <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][oi]}.</span>{opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={submit}
        disabled={Object.keys(ans).length < questions.length}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-bold"
      >
        Enviar ({Object.keys(ans).length}/{questions.length})
      </button>
    </div>
  );
}
