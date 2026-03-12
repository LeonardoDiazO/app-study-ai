import { useState } from 'react';

interface PracticeModule {
  hasPractice?: boolean;
  practiceTitle?: string;
  practiceDescription?: string;
  practiceCode?: string;
  practiceSolution?: string;
}

interface Props {
  mod: PracticeModule;
}

export function Practice({ mod }: Props) {
  const [code, setCode] = useState(mod.practiceCode || '# Tu código aquí\n');
  const [showSol, setShowSol] = useState(false);

  if (!mod.hasPractice)
    return <p className="text-center py-8 text-gray-500 text-sm">No hay ejercicio práctico.</p>;

  return (
    <div className="space-y-4">
      <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4">
        <h4 className="text-indigo-300 font-semibold text-sm mb-1">{mod.practiceTitle}</h4>
        <p className="text-gray-300 text-sm">{mod.practiceDescription}</p>
      </div>
      <div className="rounded-xl overflow-hidden border border-gray-700">
        <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
          <span className="text-gray-400 text-xs font-mono">editor.py</span>
          <button onClick={() => setCode(mod.practiceCode || '')} className="text-gray-500 hover:text-gray-300 text-xs">↺ Reset</button>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-gray-900 text-green-300 font-mono text-sm p-4 h-52 focus:outline-none resize-none"
          spellCheck={false}
        />
      </div>
      <a href="https://replit.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
        🚀 Probar en Replit →
      </a>
      <div>
        <button onClick={() => setShowSol(!showSol)} className="text-sm text-indigo-400 hover:text-indigo-300">
          {showSol ? '🙈 Ocultar' : '💡 Ver solución'}
        </button>
        {showSol && (
          <div className="mt-3 bg-gray-900 rounded-xl border border-green-500/20 p-4">
            <p className="text-xs text-green-400 font-bold mb-2 font-mono">// SOLUCIÓN</p>
            <pre className="text-green-300 font-mono text-sm whitespace-pre-wrap">{mod.practiceSolution || 'No disponible'}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
