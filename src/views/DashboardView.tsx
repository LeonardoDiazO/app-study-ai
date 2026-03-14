import { FloatingChat } from '../components/FloatingChat';
import type { CoursePlan, CourseScores } from '../types/course';
import type { FlashcardProgress } from '../types/flashcard';
import type { NotesStore } from '../types/notes';
import type { Flashcard } from '../types/flashcard';
import { calcModuleProgress, progressColor } from '../utils/moduleProgress';
import { useTheme } from '../context/ThemeContext';

interface Props {
  plan: CoursePlan;
  scores: CourseScores;
  notes: NotesStore;
  fcProgress: FlashcardProgress;
  allCards: Flashcard[];
  viewedModules: number[];
  onSelectModule: (index: number) => void;
  onStartFlashcards: (scope: number | 'all') => void;
  onOpenNotes: () => void;
  onOpenChat: () => void;
  onNewCourse: () => void;
  onStartExam: () => void;
}

const COLORS = ['indigo', 'cyan', 'purple', 'green', 'orange', 'pink'];
const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/20',
  cyan: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/20',
  purple: 'bg-purple-900/40 text-purple-300 border-purple-500/20',
  green: 'bg-green-900/40 text-green-300 border-green-500/20',
  orange: 'bg-orange-900/40 text-orange-300 border-orange-500/20',
  pink: 'bg-pink-900/40 text-pink-300 border-pink-500/20',
};

export function DashboardView({
  plan, scores, notes, fcProgress, allCards, viewedModules,
  onSelectModule, onStartFlashcards, onOpenNotes, onOpenChat, onNewCourse, onStartExam,
}: Props) {
  const total = plan.modules?.length || 0;
  const done = Object.keys(scores).length;
  const masteredTotal = allCards.filter((c) => (fcProgress[c.id] || 0) >= 3).length;
  const totalNotes = Object.values(notes).reduce((s, a) => s + (a?.length || 0), 0);
  const pct = total > 0 ? (done / total) * 100 : 0;
  const fcPct = allCards.length > 0 ? Math.round((masteredTotal / allCards.length) * 100) : 0;

  const { theme, toggleTheme } = useTheme();
  const files = (plan as CoursePlan & { sourceFiles?: string[] }).sourceFiles || [plan.title];
  const colorsByFile: Record<string, string> = {};
  files.forEach((f, i) => (colorsByFile[f] = COLORS[i % COLORS.length]));

  const ModuleCard = ({ mod, index }: { mod: CoursePlan['modules'][0]; index: number }) => {
    const isDone = scores[index] !== undefined;
    const quizScore = scores[index] as unknown as { correct: number; total: number } | undefined;
    const sp = quizScore ? Math.round((quizScore.correct / quizScore.total) * 100) : 0;
    const mC = allCards.filter((c) => c.moduleId === mod.id);
    const mM = mC.filter((c) => (fcProgress[c.id] || 0) >= 3).length;
    const mN = (notes[mod.id] || []).length;
    const isViewed = viewedModules.includes(mod.id);
    const pct = calcModuleProgress({ isViewed, quizScore, moduleCards: mC, fcProgress });
    const pCls = progressColor(pct);

    return (
      <div
        onClick={() => onSelectModule(index)}
        className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] group ${isDone ? 'bg-gray-900 border-green-500/30' : 'bg-gray-900 border-gray-800 hover:border-indigo-500/50'}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${isDone ? 'bg-green-500/20 text-green-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
            {isDone ? '✓' : mod.id}
          </div>
          <div className="text-right">
            {isDone && <span className={`text-sm font-bold ${sp >= 70 ? 'text-green-400' : 'text-orange-400'}`}>{sp}%</span>}
            {mC.length > 0 && <p className="text-xs text-yellow-500 mt-0.5">{mM}/{mC.length} 🃏</p>}
          </div>
        </div>
        <h3 className="font-semibold text-white mb-1.5 group-hover:text-indigo-300 text-sm">{mod.title}</h3>
        <p className="text-gray-500 text-xs line-clamp-2">{mod.summary}</p>
        <div className="flex gap-3 mt-3 text-xs text-gray-600">
          <span>📝 {(mod as { quiz?: unknown[] }).quiz?.length ?? 0}</span>
          {(mod as { hasPractice?: boolean }).hasPractice && <span>💻</span>}
          <span>🗺</span>
          <span>🃏 {mM}/{mC.length}</span>
          {mN > 0 && <span className="text-emerald-500">📓 {mN}</span>}
        </div>
        {/* Per-module progress bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pCls}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-right text-xs text-gray-600 mt-0.5">{pct}%</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white">{plan.title}</h1>
              {files.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {files.map((f, i) => {
                    const c = colorsByFile[f];
                    return <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${COLOR_MAP[c]}`}>📄 {f.replace('.pdf', '')}</span>;
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleTheme}
                className="text-lg w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button onClick={onNewCourse} className="text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg">+ Nuevo</button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Módulos</span><span>{done}/{total}</span></div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Flashcards</span><span>{masteredTotal}/{allCards.length}</span></div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-yellow-500 to-green-400 rounded-full transition-all" style={{ width: `${fcPct}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button onClick={() => onStartFlashcards('all')} className="py-3 sm:py-4 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1 px-4 sm:px-0 transition-all">
            <span className="text-2xl">🃏</span>
            <div className="flex-1 sm:flex-none text-left sm:text-center">
              <p className="text-yellow-300 font-bold text-xs">Flashcards</p>
              <p className="text-yellow-700 text-xs">{allCards.length - masteredTotal} pend.</p>
            </div>
          </button>
          <button onClick={onOpenNotes} className="py-3 sm:py-4 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1 px-4 sm:px-0 transition-all">
            <span className="text-2xl">📓</span>
            <div className="flex-1 sm:flex-none text-left sm:text-center">
              <p className="text-emerald-300 font-bold text-xs">Mis Notas</p>
              <p className="text-emerald-700 text-xs">{totalNotes} nota{totalNotes !== 1 ? 's' : ''}</p>
            </div>
          </button>
          <button onClick={onOpenChat} className="py-3 sm:py-4 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1 px-4 sm:px-0 transition-all">
            <span className="text-2xl">🤖</span>
            <div className="flex-1 sm:flex-none text-left sm:text-center">
              <p className="text-indigo-300 font-bold text-xs">Chatbot</p>
              <p className="text-indigo-700 text-xs">Pregunta</p>
            </div>
          </button>
        </div>

        {/* Modules */}
        {files.length > 1 ? (
          files.map((file) => {
            const fileMods = plan.modules?.filter((m) => (m as { sourceFile?: string }).sourceFile === file) || [];
            const c = colorsByFile[file];
            return (
              <div key={file} className="mb-6">
                <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${COLOR_MAP[c]} w-fit`}>
                  <span>📄</span><span className="text-xs font-bold">{file}</span><span className="text-xs opacity-60">· {fileMods.length} módulos</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {fileMods.map((mod) => {
                    const index = plan.modules?.findIndex((m) => m.id === mod.id) ?? 0;
                    return <ModuleCard key={mod.id} mod={mod} index={index} />;
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {plan.modules?.map((mod, i) => <ModuleCard key={mod.id} mod={mod} index={i} />)}
          </div>
        )}

        <div className="mt-8 text-center">
          {done === total && total > 0 ? (
            <button onClick={onStartExam} className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-2xl text-white font-bold text-lg shadow-lg">
              🏆 Examen Final
            </button>
          ) : (
            <p className="text-gray-600 text-sm">Completa todos los módulos ({done}/{total})</p>
          )}
        </div>
      </div>

      <FloatingChat onClick={onOpenChat} />
    </div>
  );
}
