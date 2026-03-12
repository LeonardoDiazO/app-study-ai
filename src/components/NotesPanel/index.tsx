import { useState, useRef } from 'react';
import type { Note } from '../../types/notes';

interface Props {
  moduleId: number;
  moduleName: string;
  notes: Note[];
  onSave: (moduleId: number, notes: Note[]) => Promise<void>;
}

type NoteItem = Note;

const TAG_COLORS: Record<string, string> = {
  '💡 Idea': 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
  '⚠️ Importante': 'bg-red-900/40 text-red-300 border-red-500/30',
  '❓ Duda': 'bg-purple-900/40 text-purple-300 border-purple-500/30',
  '📌 Recordar': 'bg-blue-900/40 text-blue-300 border-blue-500/30',
};

const TAGS = Object.keys(TAG_COLORS);

export function NotesPanel({ moduleId, notes: initialNotes, onSave }: Props) {
  const [items, setItems] = useState<NoteItem[]>(initialNotes || []);
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [selTag, setSelTag] = useState(TAGS[0]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const save = async (newItems: NoteItem[]) => {
    setSaving(true);
    await onSave(moduleId, newItems);
    setTimeout(() => setSaving(false), 600);
  };

  const addNote = async () => {
    if (!input.trim()) return;
    const note: NoteItem = {
      id: Date.now(),
      text: input.trim(),
      tag: selTag,
      date: new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      pinned: false,
    };
    const next = [note, ...items];
    setItems(next);
    setInput('');
    await save(next);
  };

  const deleteNote = async (id: number) => {
    const next = items.filter((n) => n.id !== id);
    setItems(next);
    await save(next);
  };

  const togglePin = async (id: number) => {
    const next = items
      .map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    setItems(next);
    await save(next);
  };

  const startEdit = (note: NoteItem) => { setEditId(note.id); setEditText(note.text); };
  const saveEdit = async () => {
    if (!editText.trim()) return;
    const next = items.map((n) => (n.id === editId ? { ...n, text: editText.trim() } : n));
    setItems(next);
    setEditId(null);
    setEditText('');
    await save(next);
  };

  const visible = filter === 'all' ? items : items.filter((n) => n.tag === filter);
  const pinned = visible.filter((n) => n.pinned);
  const unpinned = visible.filter((n) => !n.pinned);
  const ordered = [...pinned, ...unpinned];

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-gray-800">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setSelTag(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${selTag === t ? TAG_COLORS[t] + ' scale-105' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) addNote(); }}
            placeholder="Escribe una nota… (Ctrl+Enter para guardar)"
            rows={3}
            className="w-full bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="flex justify-between items-center px-4 py-2">
          <span className="text-gray-700 text-xs">{input.length} caracteres</span>
          <button
            onClick={addNote}
            disabled={!input.trim()}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-all font-medium"
          >
            + Guardar nota
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filter === 'all' ? 'bg-gray-700 text-white border-gray-600' : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}
          >
            Todas ({items.length})
          </button>
          {TAGS.filter((t) => items.some((n) => n.tag === t)).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t === filter ? 'all' : t)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filter === t ? TAG_COLORS[t] : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}
            >
              {t.split(' ')[0]} {items.filter((n) => n.tag === t).length}
            </button>
          ))}
          <span className={`ml-auto text-xs transition-opacity ${saving ? 'text-green-400 opacity-100' : 'opacity-0'}`}>✓ Guardado</span>
        </div>
      )}

      {ordered.length === 0 && (
        <div className="text-center py-10 text-gray-600">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm">{items.length === 0 ? '¡Agrega tu primera nota!' : 'Sin notas con este filtro.'}</p>
        </div>
      )}

      <div className="space-y-3">
        {ordered.map((note) => (
          <div key={note.id} className={`bg-gray-900 rounded-xl border transition-all ${note.pinned ? 'border-indigo-500/40' : 'border-gray-800'}`}>
            {editId === note.id ? (
              <div className="p-4">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg focus:outline-none resize-none border border-gray-700 focus:border-indigo-500 transition-colors"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveEdit} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg">✓ Guardar</button>
                  <button onClick={() => setEditId(null)} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${TAG_COLORS[note.tag] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>{note.tag}</span>
                  {note.pinned && <span className="text-xs text-indigo-400">📌 Fijada</span>}
                  <span className="ml-auto text-gray-600 text-xs">{note.date}</span>
                </div>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                <div className="flex gap-3 mt-3 pt-2 border-t border-gray-800">
                  <button onClick={() => togglePin(note.id)} className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">{note.pinned ? '📌 Desfijar' : '📌 Fijar'}</button>
                  <button onClick={() => startEdit(note)} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">✏️ Editar</button>
                  <button onClick={() => deleteNote(note.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">🗑 Borrar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
