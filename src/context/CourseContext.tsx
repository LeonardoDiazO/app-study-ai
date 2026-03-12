import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../constants';
import { storageGet, storageSet } from '../services/storage';
import { buildCards } from '../utils/buildCards';
import { useFlashcards } from '../hooks/useFlashcards';
import type { CoursePlan, AppView, CourseScores } from '../types/course';
import type { FlashcardProgress, BoxLevel } from '../types/flashcard';
import type { NotesStore } from '../types/notes';
import type { Flashcard } from '../types/flashcard';
import type { CourseSlot } from '../types/courseSlot';

interface CourseContextValue {
  // Multi-course state
  courseSlots: CourseSlot[];
  activeCourseId: string | null;
  switchCourse: (id: string) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  // Active course data
  plan: CoursePlan | null;
  scores: CourseScores;
  notes: NotesStore;
  fcProgress: FlashcardProgress;
  allCards: Flashcard[];
  viewedModules: number[];

  // Navigation
  view: AppView;
  currentModuleIndex: number;

  // Auth
  apiKey: string;

  // Setters
  setPlan: (plan: CoursePlan | null) => void;
  setScores: (scores: CourseScores) => void;
  setView: (view: AppView) => void;
  setCurrentModuleIndex: (i: number) => void;
  setApiKey: (key: string) => void;
  setActiveCourseId: (id: string | null) => void;

  // Actions
  updateFc: (cardId: string, box: BoxLevel) => void;
  saveNotes: (moduleId: number, updatedNotes: NotesStore[number]) => void;
  markModuleViewed: (moduleId: number) => void;
  resetCourse: () => Promise<void>;
}

export const CourseContext = createContext<CourseContextValue | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────

function newSlotId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatSlot(plan: CoursePlan, id: string, existing?: CourseSlot): CourseSlot {
  return {
    id,
    title: plan.title,
    moduleCount: plan.modules?.length ?? 0,
    createdAt: existing?.createdAt ?? Date.now(),
    lastOpenedAt: Date.now(),
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function CourseProvider({ children }: { children: ReactNode }) {
  const [courseSlots, setCourseSlotsState] = useState<CourseSlot[]>([]);
  const [activeCourseId, setActiveCourseIdState] = useState<string | null>(null);

  const [plan, setPlanState] = useState<CoursePlan | null>(null);
  const [scores, setScoresState] = useState<CourseScores>({});
  const [notes, setNotesState] = useState<NotesStore>({});
  const [fcProgress, setFcProgressState] = useState<FlashcardProgress>({});
  const [viewedModules, setViewedModulesState] = useState<number[]>([]);

  const [view, setView] = useState<AppView>('upload');
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  // Track active ID in a ref so callbacks always see the latest value
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeCourseId;

  // API key lives only in sessionStorage — cleared when the browser session ends
  const [apiKey, setApiKeyState] = useState<string>(() => {
    try { return sessionStorage.getItem('sai:apikey') ?? ''; } catch { return ''; }
  });

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    try {
      if (key) sessionStorage.setItem('sai:apikey', key);
      else sessionStorage.removeItem('sai:apikey');
    } catch { /* silently fail */ }
  }, []);

  const setActiveCourseId = useCallback((id: string | null) => {
    setActiveCourseIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEYS.ACTIVE_COURSE, id);
      else localStorage.removeItem(STORAGE_KEYS.ACTIVE_COURSE);
    } catch { /* silently fail */ }
  }, []);

  // ── Persist slots index ────────────────────────────────────────────────────

  const persistSlots = useCallback(async (slots: CourseSlot[]) => {
    await storageSet(STORAGE_KEYS.COURSES_INDEX, slots);
  }, []);

  // ── Load a slot's data into React state ───────────────────────────────────

  const loadCourseData = useCallback(async (id: string) => {
    const [state, fc, savedNotes, viewed] = await Promise.all([
      storageGet<{ plan: CoursePlan; scores: CourseScores }>(STORAGE_KEYS.courseState(id)),
      storageGet<FlashcardProgress>(STORAGE_KEYS.courseFC(id)),
      storageGet<NotesStore>(STORAGE_KEYS.courseNotes(id)),
      storageGet<number[]>(STORAGE_KEYS.courseViewed(id)),
    ]);
    setPlanState(state?.plan ?? null);
    setScoresState(state?.scores ?? {});
    setFcProgressState(fc ?? {});
    setNotesState(savedNotes ?? {});
    setViewedModulesState(viewed ?? []);
  }, []);

  // ── Mount: migrate legacy data + load slots ────────────────────────────────

  useEffect(() => {
    (async () => {
      let slots = await storageGet<CourseSlot[]>(STORAGE_KEYS.COURSES_INDEX);

      // One-time migration from legacy single-course storage
      if (!slots) {
        const legacy = await storageGet<{ plan: CoursePlan; scores: CourseScores }>(
          STORAGE_KEYS.LEGACY_STATE
        );
        if (legacy?.plan) {
          const id = newSlotId();
          const [legacyFc, legacyNotes, legacyViewed] = await Promise.all([
            storageGet<FlashcardProgress>(STORAGE_KEYS.LEGACY_FLASHCARDS),
            storageGet<NotesStore>(STORAGE_KEYS.LEGACY_NOTES),
            storageGet<number[]>(STORAGE_KEYS.LEGACY_VIEWED),
          ]);
          await Promise.all([
            storageSet(STORAGE_KEYS.courseState(id), legacy),
            storageSet(STORAGE_KEYS.courseFC(id), legacyFc ?? {}),
            storageSet(STORAGE_KEYS.courseNotes(id), legacyNotes ?? {}),
            storageSet(STORAGE_KEYS.courseViewed(id), legacyViewed ?? []),
          ]);
          slots = [formatSlot(legacy.plan, id)];
          await persistSlots(slots);
          // Clean up legacy keys
          localStorage.removeItem(STORAGE_KEYS.LEGACY_STATE);
          localStorage.removeItem(STORAGE_KEYS.LEGACY_FLASHCARDS);
          localStorage.removeItem(STORAGE_KEYS.LEGACY_NOTES);
          localStorage.removeItem(STORAGE_KEYS.LEGACY_VIEWED);
        } else {
          slots = [];
          await persistSlots(slots);
        }
      }

      setCourseSlotsState(slots);

      // Restore last active course
      const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_COURSE);
      const activeSlot = slots.find((s) => s.id === savedActiveId);
      if (activeSlot) {
        setActiveCourseIdState(activeSlot.id);
        await loadCourseData(activeSlot.id);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FC hook — uses dynamic storage key per slot ───────────────────────────

  const fcStorageKey = activeCourseId
    ? STORAGE_KEYS.courseFC(activeCourseId)
    : 'sai:course:none:fc';

  const { update: updateFc } = useFlashcards(fcProgress, setFcProgressState, fcStorageKey);

  // ── setPlan: create or update the active slot ─────────────────────────────

  const setPlan = useCallback(
    (newPlan: CoursePlan | null) => {
      setPlanState(newPlan);

      if (!newPlan) {
        if (activeIdRef.current) {
          storageSet(STORAGE_KEYS.courseState(activeIdRef.current), { plan: null, scores: {} });
        }
        return;
      }

      setCourseSlotsState((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === activeIdRef.current);

        if (existingIndex >= 0) {
          // Update existing slot metadata
          const updated = prev.map((s, i) =>
            i === existingIndex ? formatSlot(newPlan, s.id, s) : s
          );
          persistSlots(updated);
          storageSet(STORAGE_KEYS.courseState(activeIdRef.current!), { plan: newPlan, scores: {} });
          return updated;
        }

        // Create new slot (activeCourseId was null — new course)
        const id = newSlotId();
        const newSlot = formatSlot(newPlan, id);
        const updated = [...prev, newSlot];

        setActiveCourseIdState(id);
        activeIdRef.current = id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_COURSE, id);
        persistSlots(updated);
        storageSet(STORAGE_KEYS.courseState(id), { plan: newPlan, scores: {} });
        return updated;
      });
    },
    [persistSlots]
  );

  const setScores = useCallback(
    (newScores: CourseScores) => {
      setScoresState(newScores);
      if (activeIdRef.current) {
        storageSet(STORAGE_KEYS.courseState(activeIdRef.current), {
          plan,
          scores: newScores,
        });
      }
    },
    [plan]
  );

  const setNotes = useCallback(
    (newNotes: NotesStore) => {
      setNotesState(newNotes);
      if (activeIdRef.current) {
        storageSet(STORAGE_KEYS.courseNotes(activeIdRef.current), newNotes);
      }
    },
    []
  );

  const saveNotes = useCallback(
    (moduleId: number, updatedNotes: NotesStore[number]) => {
      setNotes({ ...notes, [moduleId]: updatedNotes });
    },
    [notes, setNotes]
  );

  const markModuleViewed = useCallback((moduleId: number) => {
    setViewedModulesState((prev) => {
      if (prev.includes(moduleId)) return prev;
      const next = [...prev, moduleId];
      if (activeIdRef.current) {
        storageSet(STORAGE_KEYS.courseViewed(activeIdRef.current), next);
      }
      return next;
    });
  }, []);

  const resetCourse = useCallback(async () => {
    setFcProgressState({});
    setNotesState({});
    setViewedModulesState([]);
    if (activeIdRef.current) {
      await Promise.all([
        storageSet(STORAGE_KEYS.courseFC(activeIdRef.current), {}),
        storageSet(STORAGE_KEYS.courseNotes(activeIdRef.current), {}),
        storageSet(STORAGE_KEYS.courseViewed(activeIdRef.current), []),
      ]);
    }
  }, []);

  // ── switchCourse: load a different slot ───────────────────────────────────

  const switchCourse = useCallback(
    async (id: string) => {
      setActiveCourseId(id);
      await loadCourseData(id);

      // Update lastOpenedAt
      setCourseSlotsState((prev) => {
        const updated = prev.map((s) =>
          s.id === id ? { ...s, lastOpenedAt: Date.now() } : s
        );
        persistSlots(updated);
        return updated;
      });

      setView('plan');
      setCurrentModuleIndex(0);
    },
    [loadCourseData, persistSlots, setActiveCourseId]
  );

  // ── deleteCourse: remove slot and all its data ────────────────────────────

  const deleteCourse = useCallback(
    async (id: string) => {
      // Remove all storage for this slot
      localStorage.removeItem(STORAGE_KEYS.courseState(id));
      localStorage.removeItem(STORAGE_KEYS.courseFC(id));
      localStorage.removeItem(STORAGE_KEYS.courseNotes(id));
      localStorage.removeItem(STORAGE_KEYS.courseViewed(id));

      setCourseSlotsState((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        persistSlots(updated);
        return updated;
      });

      if (activeIdRef.current === id) {
        setActiveCourseId(null);
        setPlanState(null);
        setScoresState({});
        setNotesState({});
        setFcProgressState({});
        setViewedModulesState([]);
        setView('upload');
      }
    },
    [persistSlots, setActiveCourseId]
  );

  const allCards = plan ? buildCards(plan) : [];

  return (
    <CourseContext.Provider
      value={{
        courseSlots,
        activeCourseId,
        switchCourse,
        deleteCourse,
        plan,
        scores,
        notes,
        fcProgress,
        allCards,
        viewedModules,
        view,
        currentModuleIndex,
        apiKey,
        setPlan,
        setScores,
        setView,
        setCurrentModuleIndex,
        setApiKey,
        setActiveCourseId,
        updateFc,
        saveNotes,
        markModuleViewed,
        resetCourse,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}
