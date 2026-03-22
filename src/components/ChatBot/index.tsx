import { useState, useEffect, useRef } from 'react';
import { Bot, User, X, Send, BookOpen } from 'lucide-react';
import { buildCourseContext } from '../../utils/buildCourseContext';

const PROXY_URL = '/api/gemini';
import type { CoursePlan, Module } from '../../types/course';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  plan: CoursePlan;
  apiKey: string;
  contextModule?: Module | null;
  onClose: () => void;
}

/** Renders a markdown-like text block with support for bold, inline code,
 *  bullet lists, numbered lists, and paragraph/line breaks. */
function renderText(txt: string) {
  const paragraphs = txt.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n');
    // Detect bullet list block
    const isBulletList = lines.every((l) => /^[-*]\s/.test(l.trim()) || l.trim() === '');
    const isNumberedList = lines.every((l) => /^\d+\.\s/.test(l.trim()) || l.trim() === '');

    if (isBulletList && lines.some((l) => /^[-*]\s/.test(l.trim()))) {
      return (
        <ul key={pi} className="list-disc list-inside space-y-1 my-1">
          {lines.filter((l) => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^[-*]\s/, ''))}</li>
          ))}
        </ul>
      );
    }
    if (isNumberedList && lines.some((l) => /^\d+\.\s/.test(l.trim()))) {
      return (
        <ol key={pi} className="list-decimal list-inside space-y-1 my-1">
          {lines.filter((l) => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\d+\.\s/, ''))}</li>
          ))}
        </ol>
      );
    }
    // Regular paragraph — render each line separated by <br>
    return (
      <p key={pi} className={pi > 0 ? 'mt-2' : ''}>
        {lines.map((line, li) => (
          <span key={li}>
            {renderInline(line)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

function renderInline(txt: string) {
  return txt.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-gray-700 text-green-300 px-1 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    return p;
  });
}

export function ChatBot({ plan, apiKey, contextModule, onClose }: Props) {
  const courseCtx = buildCourseContext(plan);
  const initMsg = contextModule
    ? `Hola! Estás en el módulo **"${contextModule.title}"**. ¿Qué quieres saber sobre este tema?`
    : `Hola! Soy tu asistente de **"${plan.title}"**. ¿Qué quieres aprender hoy?`;

  const [msgs, setMsgs] = useState<Message[]>([{ role: 'ai', text: initMsg }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const suggestions = contextModule
    ? [`Explícame "${contextModule.keyConcepts?.[0] || contextModule.title}"`, 'Dame un ejemplo práctico', '¿Qué es lo más importante?', 'Hazme una pregunta de repaso']
    : ['¿De qué temas trata el curso?', 'Explícame el primer módulo', 'Dame un resumen general', '¿Qué conceptos son más difíciles?'];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async (txt?: string) => {
    const q = txt || input.trim();
    if (!q || loading) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const history = msgs
        .filter((_, i) => i > 0)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
      const sys = [
        'Eres un tutor experto y pedagógico.',
        `Material del curso:\n\n${courseCtx}`,
        contextModule ? `El estudiante está viendo el módulo: "${contextModule.title}". Prioriza ese contexto en tus respuestas.` : '',
        'Responde siempre en español.',
        'Sé claro, estructurado y completo. Usa listas cuando sea útil.',
        'No uses emojis. Usa negritas (**texto**) para destacar conceptos clave.',
        'Si no sabes algo con certeza, dilo claramente en lugar de inventar.',
      ].filter(Boolean).join('\n');

      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [...history, { role: 'user', parts: [{ text: q }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Error al conectar con el asistente.'); }
      const data = await res.json();
      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const reply =
        candidate?.content?.parts?.[0]?.text ||
        (finishReason === 'SAFETY' ? 'No puedo responder esa pregunta por políticas de seguridad.' :
         finishReason === 'RECITATION' ? 'No puedo reproducir ese contenido directamente.' :
         'No pude generar una respuesta. Intenta reformular la pregunta.');
      setMsgs((m) => [...m, { role: 'ai', text: reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', text: `Error: ${(e as Error).message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Bot size={20} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Asistente de Estudio</p>
          <p className="text-gray-500 text-xs truncate flex items-center gap-1">
            {contextModule ? <><BookOpen size={11} strokeWidth={2} />{contextModule.title}</> : plan.title}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'ai' && <div className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center shrink-0 mt-0.5"><Bot size={16} strokeWidth={1.5} /></div>}
            <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
              {m.role === 'ai' ? renderText(m.text) : m.text}
            </div>
            {m.role === 'user' && <div className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center shrink-0 mt-0.5"><User size={16} strokeWidth={1.5} /></div>}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center"><Bot size={16} strokeWidth={1.5} /></div>
            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {msgs.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => send(s)} className="shrink-0 text-xs sm:text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2.5 rounded-xl whitespace-nowrap">{s}</button>
          ))}
        </div>
      )}

      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Pregunta sobre el curso…"
            rows={1}
            style={{ resize: 'none' }}
            className="flex-1 bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-white shrink-0 transition-colors"
          ><Send size={18} strokeWidth={2} /></button>
        </div>
        <p className="text-gray-700 text-xs mt-1.5 text-center">Enter para enviar · Shift+Enter nueva línea</p>
      </div>
    </div>
  );
}
