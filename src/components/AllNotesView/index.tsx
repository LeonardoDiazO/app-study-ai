import { useState } from 'react';
import type { CoursePlan } from '../../types/course';
import type { NotesStore, Note } from '../../types/notes';

interface Props {
  plan: CoursePlan;
  notes: NotesStore;
  onBack: () => void;
  onGoModule: (moduleId: number) => void;
}

const TAG_COLORS: Record<string, string> = {
  '💡 Idea': 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
  '⚠️ Importante': 'bg-red-900/40 text-red-300 border-red-500/30',
  '❓ Duda': 'bg-purple-900/40 text-purple-300 border-purple-500/30',
  '📌 Recordar': 'bg-blue-900/40 text-blue-300 border-blue-500/30',
};

type NoteWithMeta = Note & { moduleId: number; moduleName: string };

export function AllNotesView({ plan, notes, onBack, onGoModule }: Props) {
  const [search, setSearch] = useState('');

  const allNotes: NoteWithMeta[] = [];
  plan.modules?.forEach((mod) => {
    (notes[mod.id] || []).forEach((n) =>
      allNotes.push({ ...n, moduleId: mod.id, moduleName: mod.title })
    );
  });
  allNotes.sort((a, b) => b.id - a.id);

  const visible = search.trim()
    ? allNotes.filter(
        (n) =>
          n.text.toLowerCase().includes(search.toLowerCase()) ||
          n.moduleName.toLowerCase().includes(search.toLowerCase())
      )
    : allNotes;

  const modulesWithNotes = plan.modules?.filter((m) => (notes[m.id] || []).length > 0).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg text-xl leading-none">←</button>
          <div className="flex-1">
            <h2 className="font-bold text-white text-sm">📓 Todas mis Notas</h2>
            <p className="text-gray-500 text-xs">{allNotes.length} nota{allNotes.length !== 1 ? 's' : ''} en {modulesWithNotes} módulos</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar en mis notas…"
          className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none"
        />

        {visible.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <div className="text-5xl mb-3">📭</div>
            <p>{search ? 'Sin resultados.' : 'Aún no tienes notas. Ve a un módulo para agregar.'}</p>
          </div>
        )}

        {visible.map((note) => (
          <div key={`${note.moduleId}_${note.id}`} className={`bg-gray-900 rounded-xl border p-4 ${note.pinned ? 'border-indigo-500/40' : 'border-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${TAG_COLORS[note.tag] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>{note.tag}</span>
              <button
                onClick={() => onGoModule(note.moduleId)}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-500/20 transition-colors"
              >
                📚 {note.moduleName}
              </button>
              {note.pinned && <span className="text-xs text-indigo-400">📌</span>}
              <span className="ml-auto text-gray-600 text-xs">{note.date}</span>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
