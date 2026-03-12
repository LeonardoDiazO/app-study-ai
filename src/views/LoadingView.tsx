import type { LoadingStep } from '../services/ai/types';

interface Props {
  loadingSteps: LoadingStep[];
}

export function LoadingView({ loadingSteps }: Props) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <div className="text-6xl animate-pulse mb-6">🧠</div>
        <h2 className="text-2xl font-bold text-white mb-6">Creando tu curso</h2>
        <div className="space-y-3 text-left">
          {loadingSteps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.done ? 'bg-green-900/20 border-green-500/30' : 'bg-indigo-900/20 border-indigo-500/30 animate-pulse'}`}>
              <span>{s.done ? '✅' : '⏳'}</span>
              <p className={`text-sm ${s.done ? 'text-green-300' : 'text-indigo-300'}`}>{s.text}</p>
            </div>
          ))}
          {!loadingSteps.length && (
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
