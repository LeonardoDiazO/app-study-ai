import { useState } from 'react';
import { useCourse } from './hooks/useCourse';
import { GeminiProvider } from './services/ai/gemini';
import { UploadView } from './views/UploadView';
import { LoadingView } from './views/LoadingView';
import { DashboardView } from './views/DashboardView';
import { ModuleView } from './views/ModuleView';
import { FinalExamView } from './views/FinalExamView';
import { FlashcardDeck } from './components/FlashcardDeck';
import { ChatBot } from './components/ChatBot';
import { AllNotesView } from './components/AllNotesView';
import type { Module } from './types/course';
import type { PdfInput, LoadingStep } from './services/ai/types';
import type { BoxLevel } from './types/flashcard';

interface CourseDraft {
  partialModules: unknown[];
  remainingPdfs: PdfInput[];
  courseName: string;
  doneCount: number;
  totalCount: number;
}

export default function App() {
  const {
    courseSlots, activeCourseId, switchCourse, deleteCourse, setActiveCourseId,
    plan, setPlan,
    scores, setScores,
    notes, saveNotes,
    fcProgress,
    view, setView,
    currentModuleIndex, setCurrentModuleIndex,
    apiKey, setApiKey,
    allCards,
    updateFc,
    viewedModules,
    markModuleViewed,
    resetCourse,
  } = useCourse();

  const [courseName, setCourseName] = useState('');
  const [pdfList, setPdfList] = useState<PdfInput[]>([]);
  const [err, setErr] = useState('');
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
  const [draft, setDraft] = useState<CourseDraft | null>(null);

  const [fcScope, setFcScope] = useState<number | 'all'>('all');
  const [fcBackTarget, setFcBackTarget] = useState<'plan' | 'module'>('plan');

  const [showChat, setShowChat] = useState(false);
  const [chatCtxMod, setChatCtxMod] = useState<Module | null>(null);

  const runGeneration = async (
    pdfsToProcess: PdfInput[],
    name: string,
    startModules: unknown[] = []
  ) => {
    const operatorMode = import.meta.env.VITE_USE_OPERATOR_KEY === 'true';
    if (!operatorMode && !apiKey.trim()) { setErr('Ingresa tu API Key de Gemini'); return; }
    if (!pdfsToProcess.length) { setErr('Agrega al menos un PDF'); return; }

    setDraft(null);
    setView('loading');
    setErr('');
    setLoadingSteps([]);

    try {
      const provider = new GeminiProvider(apiKey);
      const steps: LoadingStep[] = [];

      const newPlan = await provider.generateCourse(
        pdfsToProcess,
        name,
        (step) => {
          const idx = steps.findIndex((s) => s.text === step.text);
          if (idx >= 0) steps[idx] = step;
          else steps.push(step);
          setLoadingSteps([...steps]);
        },
        startModules,
        (partialModules) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const processedNames = new Set((partialModules as any[]).map((m) => m.sourceFile));
          const remaining = pdfsToProcess.filter((p) => !processedNames.has(p.name));
          if (remaining.length > 0) {
            setDraft({
              partialModules,
              remainingPdfs: remaining,
              courseName: name,
              doneCount: processedNames.size,
              totalCount: pdfsToProcess.length,
            });
          }
        }
      );

      setDraft(null);
      setPlan(newPlan);
      setScores({});
      await resetCourse();
      setPdfList([]);
      setView('plan');
    } catch (e) {
      setErr((e as Error).message);
      setView('upload');
    }
  };

  const generate = () => runGeneration(pdfList, courseName);

  const resumeDraft = () => {
    if (!draft) return;
    runGeneration(draft.remainingPdfs, draft.courseName, draft.partialModules);
  };

  const openChat = (mod: Module | null = null) => {
    setChatCtxMod(mod);
    setShowChat(true);
  };

  const goToModule = (moduleId: number) => {
    const i = plan?.modules?.findIndex((m) => m.id === moduleId) ?? -1;
    if (i >= 0) { setCurrentModuleIndex(i); setView('module'); }
  };

  const handleNewCourse = () => {
    setActiveCourseId(null);
    setPdfList([]);
    setCourseName('');
    setView('upload');
  };

  if (view === 'flashcards' && plan) {
    const cards = fcScope === 'all' ? allCards : allCards.filter((c) => c.moduleId === fcScope);
    const title = fcScope === 'all' ? 'Todo el curso' : plan.modules?.find((m) => m.id === fcScope)?.title || '';
    return (
      <FlashcardDeck
        allCards={cards}
        fcProgress={fcProgress}
        onUpdate={async (cardId, box) => { await updateFc(cardId, box as BoxLevel); }}
        onBack={() => setView(fcBackTarget === 'module' ? 'module' : 'plan')}
        title={title}
      />
    );
  }

  if (showChat && plan)
    return <ChatBot plan={plan} apiKey={apiKey} contextModule={chatCtxMod} onClose={() => setShowChat(false)} />;

  if (view === 'allnotes' && plan)
    return <AllNotesView plan={plan} notes={notes} onBack={() => setView('plan')} onGoModule={goToModule} />;

  if (view === 'upload')
    return (
      <UploadView
        apiKey={apiKey} setApiKey={setApiKey}
        courseName={courseName} setCourseName={setCourseName}
        pdfList={pdfList} setPdfList={setPdfList}
        courseSlots={courseSlots}
        activeCourseId={activeCourseId}
        onOpenCourse={(id) => switchCourse(id)}
        onDeleteCourse={(id) => deleteCourse(id)}
        err={err} setErr={setErr}
        onGenerate={generate}
        draft={draft}
        onResumeDraft={resumeDraft}
        onDiscardDraft={() => setDraft(null)}
      />
    );

  if (view === 'loading') return <LoadingView loadingSteps={loadingSteps} />;

  if (view === 'plan' && plan)
    return (
      <DashboardView
        plan={plan} scores={scores} notes={notes}
        fcProgress={fcProgress} allCards={allCards}
        viewedModules={viewedModules}
        onSelectModule={(i) => { setCurrentModuleIndex(i); setView('module'); }}
        onStartFlashcards={(scope) => { setFcScope(scope); setFcBackTarget('plan'); setView('flashcards'); }}
        onOpenNotes={() => setView('allnotes')}
        onOpenChat={() => openChat(null)}
        onNewCourse={handleNewCourse}
        onStartExam={() => setView('exam')}
      />
    );

  if (view === 'module' && plan)
    return (
      <ModuleView
        plan={plan}
        moduleIndex={currentModuleIndex}
        scores={scores} notes={notes}
        fcProgress={fcProgress} allCards={allCards}
        viewedModules={viewedModules}
        onBack={() => setView('plan')}
        onOpenChat={openChat}
        onMarkViewed={markModuleViewed}
        onStartFlashcards={(scope) => { setFcScope(scope); setFcBackTarget('module'); setView('flashcards'); }}
        onSaveNotes={saveNotes}
        onCompleteQuiz={(index, score) => setScores({ ...scores, [index]: score as unknown as number })}
        onRetryQuiz={(index) => { const next = { ...scores }; delete next[index]; setScores(next); }}
        onNavigate={(newIndex) => { setCurrentModuleIndex(newIndex); }}
      />
    );

  if (view === 'exam' && plan)
    return <FinalExamView plan={plan} onBack={() => setView('plan')} />;

  return null;
}
