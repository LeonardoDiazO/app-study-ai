export const MAX_COURSE_SLOTS = 3;

export const STORAGE_KEYS = {
  // Multi-course index (array of CourseSlot metadata)
  COURSES_INDEX: 'sai:courses',
  ACTIVE_COURSE: 'sai:active_course',

  // Per-course data — parameterised by slot id
  courseState:  (id: string) => `sai:course:${id}:state`,
  courseFC:     (id: string) => `sai:course:${id}:fc`,
  courseNotes:  (id: string) => `sai:course:${id}:notes`,
  courseViewed: (id: string) => `sai:course:${id}:viewed`,

  // Legacy single-course keys — used only for one-time migration
  LEGACY_STATE:      'sai:state',
  LEGACY_FLASHCARDS: 'sai:fc',
  LEGACY_NOTES:      'sai:notes',
  LEGACY_VIEWED:     'sai:viewed',
} as const;
