export type NoteTag = string; // '💡 Idea' | '⚠️ Importante' | '❓ Duda' | '📌 Recordar'

export interface Note {
  id: number;
  text: string;
  tag: NoteTag;
  date: string;
  pinned: boolean;
}

export type NotesStore = Record<number, Note[]>;
