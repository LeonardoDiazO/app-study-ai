import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ConceptMap } from '../components/ConceptMap';
import { FlowDiagram } from '../components/FlowDiagram';
import { NotesPanel } from '../components/NotesPanel';
import { Quiz } from '../components/Quiz';
import { Practice } from '../components/Practice';
import { FloatingChat } from '../components/FloatingChat';
import type { CoursePlan, CourseScores, Module } from '../types/course';
import type { FlashcardProgress } from '../types/flashcard';
import type { NotesStore } from '../types/notes';
import type { Flashcard } from '../types/flashcard';
import { calcModuleProgress, progressColor } from '../utils/moduleProgress';

interface Props {
  plan: CoursePlan;
  moduleIndex: number;
  scores: CourseScores;
  notes: NotesStore;
  fcProgress: FlashcardProgress;
  allCards: Flashcard[];
  viewedModules: number[];
  onBack: () => void;
  onOpenChat: (mod: Module) => void;
  onMarkViewed: (moduleId: number) => void;
  onStartFlashcards: (scope: number | 'all') => void;
  onSaveNotes: (moduleId: number, items: NotesStore[number]) => void;
  onCompleteQuiz: (index: number, score: { correct: number; total: number }) => void;
  onRetryQuiz: (index: number) => void;
  onNavigate: (newIndex: number) => void;
}

export function ModuleView({
  plan, moduleIndex, scores, notes, fcProgress, allCards,
  viewedModules, onBack, onOpenChat, onMarkViewed, onStartFlashcards,
  onSaveNotes, onCompleteQuiz, onRetryQuiz, onNavigate,
}: Props) {
  const [tab, setTab] = useState('content');
  const mod = plan.modules[moduleIndex];
  const total = plan.modules?.length || 0;
  const isDone = scores[moduleIndex] !== undefined;
  const modCards = allCards.filter((c) => c.moduleId === mod.id);
  const modMastered = modCards.filter((c) => (fcProgress[c.id] || 0) >= 3).length;
  const modNotes = (notes[mod.id] || []).length;

  // Mark module as viewed when navigating to it
  useEffect(() => { onMarkViewed(mod.id); }, [mod.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isViewed = viewedModules.includes(mod.id);
  const quizScore = scores[moduleIndex] as unknown as { correct: number; total: number } | undefined;
  const progressPct = calcModuleProgress({ isViewed, quizScore, moduleCards: modCards, fcProgress });
  const progressCls = progressColor(progressPct);

  const { theme, toggleTheme } = useTheme();
  const planWithFiles = plan as CoursePlan & { sourceFiles?: string[] };

  const tabs = [
    { id: 'content', icon: '📖', label: 'Contenido' },
    { id: 'map', icon: '🗺', label: 'Mapa' },
    ...(mod.mermaidDiagram ? [{ id: 'diagram', icon: '📊', label: 'Diagrama' }] : []),
    { id: 'notes', icon: '📝', label: `Notas${modNotes > 0 ? ` (${modNotes})` : ''}` },
    { id: 'flashcards', icon: '🃏', label: `Cards ${modMastered}/${modCards.length}` },
    { id: 'quiz', icon: '❓', label: 'Quiz' },
    ...(mod.hasPractice ? [{ id: 'practice', icon: '💻', label: 'Práctica' }] : []),
  ];

  const scoreEntry = scores[moduleIndex] as unknown as { correct: number; total: number } | undefined;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg text-xl leading-none">←</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {(planWithFiles.sourceFiles?.length ?? 0) > 1 && mod.sourceFile && (
                <span className="text-xs text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded-full truncate max-w-[100px]">📄 {mod.sourceFile}</span>
              )}
              <p className="text-gray-500 text-xs">Módulo {moduleIndex + 1}/{total}</p>
            </div>
            <h2 className="text-sm font-bold text-white truncate">{mod.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isDone && <span className="text-green-400 text-xs bg-green-900/30 border border-green-500/30 px-2 py-1 rounded-full">✓</span>}
            <button
              onClick={toggleTheme}
              className="text-base w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={() => onOpenChat(mod)} className="text-xs bg-indigo-700/40 hover:bg-indigo-600/60 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg transition-all">🤖</button>
          </div>
        </div>
        {/* Module progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso del módulo</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressCls}`} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex border-b border-gray-800 bg-gray-900 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {tab === 'content' && (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h3 className="text-white font-semibold mb-2 text-sm">📝 Resumen</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{mod.summary}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h3 className="text-white font-semibold mb-3 text-sm">🎯 Conceptos Clave</h3>
                <div className="flex flex-wrap gap-2">
                  {mod.keyConcepts?.map((c, i) => (
                    <span key={i} className="bg-indigo-900/40 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-full text-sm">{c}</span>
                  ))}
                </div>
              </div>
              {mod.visualContent && mod.visualContent.length > 0 && (
                <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                  <h3 className="text-white font-semibold mb-3 text-sm">🖼 Elementos Visuales del Documento</h3>
                  <div className="space-y-3">
                    {mod.visualContent.map((v, i) => (
                      <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/20 capitalize">{v.type}</span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{v.description}</p>
                        {v.keyInfo && (
                          <p className="text-yellow-300 text-xs bg-yellow-900/20 border border-yellow-500/20 rounded-lg px-3 py-2">
                            💡 {v.keyInfo}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setTab('notes')} className="py-3 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium transition-all">📝 Agregar nota</button>
                <button onClick={() => onOpenChat(mod)} className="py-3 bg-indigo-900/20 hover:bg-indigo-900/40 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm font-medium transition-all">🤖 Preguntar</button>
              </div>
            </div>
          )}

          {tab === 'map' && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-4 text-sm">🗺 Mapa Mental</h3>
              <ConceptMap markmapContent={mod.markmapContent} data={mod.conceptMap} />
            </div>
          )}

          {tab === 'diagram' && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-4 text-sm">📊 Diagrama de Flujo</h3>
              <FlowDiagram diagram={mod.mermaidDiagram} />
            </div>
          )}

          {tab === 'notes' && (
            <NotesPanel
              moduleId={mod.id}
              moduleName={mod.title}
              notes={notes[mod.id] || []}
              onSave={async (moduleId, items) => { onSaveNotes(moduleId, items); }}
            />
          )}

          {tab === 'flashcards' && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-sm">🃏 Flashcards</h3>
                <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-full">{modMastered}/{modCards.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  ['🆕', 'Nuevas', modCards.filter((c) => !fcProgress[c.id]).length, 'text-blue-400', 'bg-blue-900/20'],
                  ['📚', 'Aprend.', modCards.filter((c) => fcProgress[c.id] === 1 || fcProgress[c.id] === 2).length, 'text-yellow-400', 'bg-yellow-900/20'],
                  ['⭐', 'Dominadas', modMastered, 'text-green-400', 'bg-green-900/20'],
                ].map(([ic, lb, n, tc, bg]) => (
                  <div key={String(lb)} className={`${bg} rounded-xl p-3 text-center`}>
                    <div className="text-xl mb-1">{ic}</div>
                    <div className={`text-lg font-bold ${tc}`}>{n}</div>
                    <div className="text-gray-500 text-xs">{lb}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onStartFlashcards(mod.id)}
                className="w-full py-3 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/30 rounded-xl text-yellow-300 font-bold"
              >
                🃏 Estudiar {modCards.length} tarjetas →
              </button>
            </div>
          )}

          {tab === 'quiz' && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-4 text-sm">❓ Quiz</h3>
              {isDone && scoreEntry ? (
                <div className="text-center py-6">
                  <p className="text-green-400 text-lg mb-2">✅ Completado</p>
                  <p className="text-gray-400 text-sm">{scoreEntry.correct}/{scoreEntry.total} · {Math.round((scoreEntry.correct / scoreEntry.total) * 100)}%</p>
                  <button onClick={() => onRetryQuiz(moduleIndex)} className="mt-4 text-xs text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-lg">🔄 Reintentar</button>
                </div>
              ) : (
                <Quiz questions={mod.quiz || []} onComplete={(c, t) => onCompleteQuiz(moduleIndex, { correct: c, total: t })} />
              )}
            </div>
          )}

          {tab === 'practice' && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-4 text-sm">💻 Ejercicio Práctico</h3>
              <Practice mod={mod} />
            </div>
          )}
        </div>

        <div className="flex justify-between px-4 pb-6">
          <button onClick={() => onNavigate(Math.max(0, moduleIndex - 1))} disabled={moduleIndex === 0} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed rounded-xl text-sm text-gray-300">← Anterior</button>
          <button onClick={() => onNavigate(Math.min(total - 1, moduleIndex + 1))} disabled={moduleIndex === total - 1} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed rounded-xl text-sm text-gray-300">Siguiente →</button>
        </div>
      </div>

      <FloatingChat onClick={() => onOpenChat(mod)} />
    </div>
  );
}
