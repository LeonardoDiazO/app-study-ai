import { useRef, useState, useEffect, useCallback } from 'react';
import type { PdfInput } from '../services/ai/types';
import { extractPageCount } from '../utils/extractPageCount';
import { testApiKey } from '../services/ai/gemini';
import type { CourseSlot } from '../types/courseSlot';
import { MAX_COURSE_SLOTS } from '../constants';

const SAVED_KEY_STORAGE = 'sai:apikey_saved';
const HINT_SEEN_STORAGE = 'sai:key_hint_seen';

const SLOT_COLORS = [
  { bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', text: 'text-indigo-300', dot: 'bg-indigo-500' },
  { bg: 'bg-cyan-900/30',   border: 'border-cyan-500/40',   text: 'text-cyan-300',   dot: 'bg-cyan-500'   },
  { bg: 'bg-purple-900/30', border: 'border-purple-500/40', text: 'text-purple-300', dot: 'bg-purple-500' },
];

function relativeDate(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

interface CourseDraft {
  doneCount: number;
  totalCount: number;
}

interface Props {
  apiKey: string;
  setApiKey: (k: string) => void;
  courseName: string;
  setCourseName: (n: string) => void;
  pdfList: PdfInput[];
  setPdfList: (list: PdfInput[] | ((prev: PdfInput[]) => PdfInput[])) => void;
  courseSlots: CourseSlot[];
  activeCourseId: string | null;
  onOpenCourse: (id: string) => void;
  onDeleteCourse: (id: string) => void;
  err: string;
  setErr: (e: string) => void;
  onGenerate: () => void;
  draft: CourseDraft | null;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
}

// Maximum PDF size accepted (3 MB). Larger files would exceed the Vercel
// serverless function body limit when base64-encoded (~4 MB JSON payload).
const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const MAX_PDFS = 3;

// When true, the proxy uses an operator API key — no key entry needed in UI.
const OPERATOR_KEY_MODE = import.meta.env.VITE_USE_OPERATOR_KEY === 'true';

export function UploadView({
  apiKey, setApiKey, courseName, setCourseName,
  pdfList, setPdfList, courseSlots, activeCourseId, onOpenCourse, onDeleteCourse,
  err, setErr, onGenerate, draft, onResumeDraft, onDiscardDraft,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [clipboardKey, setClipboardKey] = useState<string | null>(null);
  const [rememberKey, setRememberKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
  const [keyError, setKeyError] = useState('');

  const keyFormatOk = apiKey.startsWith('AIzaSy') && apiKey.length >= 35;

  // Load saved key and open help modal on first visit
  useEffect(() => {
    if (OPERATOR_KEY_MODE) return;
    const saved = localStorage.getItem(SAVED_KEY_STORAGE);
    if (saved) { setApiKey(saved); setRememberKey(true); return; }
    const hintSeen = localStorage.getItem(HINT_SEEN_STORAGE);
    if (!hintSeen) { setShowHelp(true); localStorage.setItem(HINT_SEEN_STORAGE, '1'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect API key copied to clipboard when user returns to tab
  const checkClipboard = useCallback(async () => {
    if (apiKey.trim()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('AIzaSy') && text.length > 20) setClipboardKey(text.trim());
    } catch { /* permission denied — silently ignore */ }
  }, [apiKey]);

  useEffect(() => {
    window.addEventListener('focus', checkClipboard);
    return () => window.removeEventListener('focus', checkClipboard);
  }, [checkClipboard]);

  const handleSetKey = (value: string) => {
    setApiKey(value);
    setKeyStatus('idle');
    setKeyError('');
    setClipboardKey(null);
    if (rememberKey) {
      if (value.trim()) localStorage.setItem(SAVED_KEY_STORAGE, value.trim());
      else localStorage.removeItem(SAVED_KEY_STORAGE);
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberKey(checked);
    if (checked && apiKey.trim()) localStorage.setItem(SAVED_KEY_STORAGE, apiKey.trim());
    else localStorage.removeItem(SAVED_KEY_STORAGE);
  };

  const handleVerifyKey = async () => {
    setKeyStatus('checking');
    setKeyError('');
    try {
      await testApiKey(apiKey);
      setKeyStatus('verified');
    } catch (e) {
      setKeyStatus('error');
      setKeyError((e as Error).message);
    }
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type === 'application/pdf');
    if (!files.length) { setErr('Solo PDFs.'); return; }

    const oversized = files.filter((f) => f.size > MAX_PDF_BYTES);
    if (oversized.length) {
      setErr(`El archivo "${oversized[0].name}" supera el límite de 3 MB. Reduce su tamaño e inténtalo de nuevo.`);
      e.target.value = '';
      return;
    }

    // Check total PDF count after adding
    if (pdfList.length + files.length > MAX_PDFS) {
      setErr(`Máximo ${MAX_PDFS} PDFs por curso. Ya tienes ${pdfList.length}.`);
      e.target.value = '';
      return;
    }

    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) => {
        const b64 = (ev.target?.result as string).split(',')[1];
        const pages = extractPageCount(b64);
        if (pages > MAX_PDF_PAGES) {
          setErr(`"${f.name}" tiene ${pages} páginas. El máximo permitido es ${MAX_PDF_PAGES}.`);
          return;
        }
        setPdfList((p) => [...p, { name: f.name, b64, pages: pages || undefined }]);
      };
      r.readAsDataURL(f);
    });
    setErr('');
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl text-3xl mb-4">🎓</div>
          <h1 className="text-3xl font-bold text-white">StudyAI</h1>
          <p className="text-gray-400 mt-2 text-sm">Convierte tus PDFs en un curso inteligente</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-5 border border-gray-800">
          {courseSlots.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 font-medium">📚 Mis cursos ({courseSlots.length}/{MAX_COURSE_SLOTS})</p>
                {courseSlots.length >= MAX_COURSE_SLOTS && (
                  <p className="text-xs text-orange-400">Elimina uno para crear otro</p>
                )}
              </div>
              <div className="space-y-2">
                {courseSlots.map((slot, i) => {
                  const c = SLOT_COLORS[i % SLOT_COLORS.length];
                  const isActive = slot.id === activeCourseId;
                  return (
                    <div key={slot.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${c.bg} ${c.border}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot} ${isActive ? 'ring-2 ring-white/30' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{slot.title}</p>
                        <p className={`text-xs ${c.text}`}>{slot.moduleCount} módulos · {relativeDate(slot.lastOpenedAt)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onOpenCourse(slot.id)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 rounded-lg text-white transition-colors"
                        >
                          Abrir →
                        </button>
                        <button
                          onClick={() => onDeleteCourse(slot.id)}
                          className="text-gray-600 hover:text-red-400 text-lg leading-none px-1 transition-colors"
                          title="Eliminar curso"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {draft && (
            <div className="bg-orange-900/30 border border-orange-500/40 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-orange-300 text-sm font-bold">Generación interrumpida</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Se procesaron {draft.doneCount} de {draft.totalCount} PDFs antes del error.
                    Puedes continuar desde donde quedó sin repetir el trabajo ya hecho.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onResumeDraft}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white text-xs font-bold transition-colors"
                >
                  ▶ Continuar generación ({draft.totalCount - draft.doneCount} PDF{draft.totalCount - draft.doneCount !== 1 ? 's' : ''} restante{draft.totalCount - draft.doneCount !== 1 ? 's' : ''})
                </button>
                <button
                  onClick={onDiscardDraft}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 text-xs transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {!OPERATOR_KEY_MODE && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400">🔑 API Key de Gemini</label>
                  <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="w-5 h-5 rounded-full bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white text-xs font-bold leading-none flex items-center justify-center transition-colors"
                    title="¿Cómo obtener una API Key?"
                  >
                    ?
                  </button>
                </div>
                {keyStatus === 'verified' && (
                  <span className="text-xs text-green-400 font-medium">✓ Clave verificada</span>
                )}
              </div>

              {/* Input con indicador de estado */}
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { handleSetKey(e.target.value); setErr(''); }}
                  placeholder="AIzaSy..."
                  className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors ${
                    keyStatus === 'verified' ? 'border-green-500' :
                    keyStatus === 'error' ? 'border-red-500' :
                    keyFormatOk ? 'border-indigo-500' :
                    'border-gray-700 focus:border-indigo-500'
                  }`}
                />
                {apiKey && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
                    {keyStatus === 'verified' ? '✅' : keyStatus === 'error' ? '❌' : keyFormatOk ? '🟡' : ''}
                  </span>
                )}
              </div>

              {/* Botón verificar — aparece cuando el formato es válido y no está verificado */}
              {keyFormatOk && keyStatus !== 'verified' && (
                <button
                  type="button"
                  onClick={handleVerifyKey}
                  disabled={keyStatus === 'checking'}
                  className="w-full py-2 bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-500/40 rounded-xl text-indigo-300 text-xs font-bold transition-colors disabled:opacity-60"
                >
                  {keyStatus === 'checking' ? '⏳ Verificando...' : '⚡ Verificar clave antes de generar'}
                </button>
              )}

              {/* Error de verificación */}
              {keyStatus === 'error' && keyError && (
                <p className="text-red-400 text-xs px-1">{keyError}</p>
              )}

              {/* Clipboard banner */}
              {clipboardKey && !apiKey.trim() && (
                <div className="flex items-center justify-between bg-indigo-900/30 border border-indigo-500/40 rounded-xl px-3 py-2">
                  <p className="text-indigo-300 text-xs">📋 Key detectada en portapapeles</p>
                  <div className="flex gap-2 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { handleSetKey(clipboardKey); setErr(''); }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded-lg text-white font-bold transition-colors"
                    >
                      Usar
                    </button>
                    <button type="button" onClick={() => setClipboardKey(null)} className="text-xs text-gray-500 hover:text-gray-300 px-1">✕</button>
                  </div>
                </div>
              )}

              {/* Recordar clave */}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => handleRememberToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-500 flex-shrink-0"
                />
                <span className="text-gray-500 text-xs">Recordar en este navegador</span>
              </label>
            </div>
          )}

          {showHelp && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-white font-bold text-base">Obtén tu API Key gratis</h2>
                    <p className="text-gray-500 text-xs mt-0.5">Solo necesitas una cuenta de Google</p>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-white text-xl leading-none ml-4">×</button>
                </div>

                {/* 3-step visual flow */}
                <div className="space-y-3 mb-5">
                  {[
                    { n: '1', icon: '🌐', text: 'Abre Google AI Studio', sub: 'Haz clic en el botón de abajo →', done: false },
                    { n: '2', icon: '🔑', text: 'Crea una API Key', sub: 'Clic en "Create API key in new project"', done: false },
                    { n: '3', icon: '📋', text: 'Copia y pégala aquí', sub: clipboardKey ? '¡Key detectada! Cierra este modal y úsala' : 'La clave empieza con AIzaSy...', done: !!clipboardKey },
                  ].map(({ n, icon, text, sub, done }) => (
                    <div key={n} className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${done ? 'bg-green-900/20 border-green-500/30' : n === '1' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-gray-800/40 border-gray-700/50'}`}>
                      <div className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-600' : 'bg-indigo-600'}`}>
                        {done ? '✓' : n}
                      </div>
                      <span className="text-xl flex-shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">{text}</p>
                        <p className={`text-xs truncate ${done ? 'text-green-400' : 'text-gray-500'}`}>{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-center bg-green-900/20 border border-green-500/20 rounded-xl px-3 py-2 mb-4">
                  <span className="text-green-400 text-base">✓</span>
                  <p className="text-gray-400 text-xs">Gratis · 10 req/min · 500/día · tu key no se guarda en nuestros servidores</p>
                </div>

                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-bold text-center transition-colors"
                  onClick={() => setShowHelp(false)}
                >
                  <span>Ir a Google AI Studio</span>
                  <span>→</span>
                </a>
                <p className="text-center text-gray-600 text-xs mt-2">Al volver a esta pestaña, detectamos la key automáticamente</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">📚 Nombre del curso <span className="text-gray-600">(opcional)</span></label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="ej. Python desde Cero"
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400">📄 PDFs del curso</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">{pdfList.length}/{MAX_PDFS} · máx. 100 págs. · 3 MB</span>
                {pdfList.length < MAX_PDFS && (
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg">+ Agregar PDF</button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" multiple onChange={onFiles} className="hidden" />

            {pdfList.length === 0 ? (
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-700 hover:border-indigo-500/60 rounded-xl p-8 text-center cursor-pointer">
                <div className="text-3xl mb-2">📂</div>
                <p className="text-gray-400 text-sm">Clic para subir PDFs</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pdfList.map((pdf, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                    <span className="text-xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{pdf.name}</p>
                      <p className="text-green-400 text-xs">{pdf.pages ? `${pdf.pages} págs.` : 'Listo'}</p>
                    </div>
                    <button onClick={() => setPdfList((p) => p.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                  </div>
                ))}
                {pdfList.length < MAX_PDFS && (
                  <button onClick={() => fileRef.current?.click()} className="w-full py-2.5 border border-dashed border-gray-700 hover:border-indigo-500/50 rounded-xl text-gray-500 text-sm">+ Agregar otro PDF ({MAX_PDFS - pdfList.length} restante{MAX_PDFS - pdfList.length !== 1 ? 's' : ''})</button>
                )}
              </div>
            )}
          </div>

          {err && <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">⚠ {err}</div>}

          {/* Privacy notice — required before generating */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              <span className="text-gray-300 font-medium">Aviso de privacidad:</span>{' '}
              Tu API Key y el contenido de tus PDFs viajan desde tu navegador a un proxy
              intermediario en Vercel y de ahí a la API de Google Gemini. StudyAI no almacena
              tu key ni tus archivos en ningún servidor propio; el proxy solo reenvía las
              solicitudes y no guarda datos. Consulta la{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 underline hover:text-indigo-300"
              >
                política de privacidad de Google
              </a>
              {' '}para más información.
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-500 flex-shrink-0"
              />
              <span className="text-gray-300 text-xs">
                Entendí que mi API Key y el contenido de mis PDFs pasarán por un proxy en Vercel antes de llegar a Google Gemini.
              </span>
            </label>
          </div>

          <button
            onClick={onGenerate}
            disabled={
              !pdfList.length ||
              (!OPERATOR_KEY_MODE && !apiKey.trim()) ||
              !privacyAccepted ||
              (courseSlots.length >= MAX_COURSE_SLOTS && activeCourseId === null)
            }
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold"
          >
            🚀 Generar Curso ({pdfList.length} PDF{pdfList.length !== 1 ? 's' : ''})
          </button>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
            {[['🗺', 'Mapas'], ['📊', 'Visuales'], ['🃏', 'Cards'], ['🤖', 'Chat'], ['🏆', 'Examen']].map(([ic, t]) => (
              <div key={t} className="bg-gray-800/50 rounded-xl p-2">
                <div className="text-base mb-1">{ic}</div>
                <p className="text-white text-xs font-medium">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
