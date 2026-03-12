import type { CoursePlan } from '../../types/course';
import type { AIProvider, ChatMessage, LoadingStep, PdfInput } from './types';
import { getModuleRange } from '../../utils/extractPageCount';

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

// All requests go through our Vercel serverless proxy (/api/gemini).
const PROXY_URL = '/api/gemini';

// When VITE_USE_OPERATOR_KEY=true the proxy uses its own env-var key.
// The frontend sends no Authorization header in that mode.
const OPERATOR_KEY_MODE = import.meta.env.VITE_USE_OPERATOR_KEY === 'true';

// Gap between consecutive API calls — Gemini 2.5 Flash free tier: 10 RPM (= 6 s minimum).
// 7 s gives a safe 1-second buffer.
const REQUEST_GAP_MS = 7_000;

// Maximum output tokens — Gemini 2.5 Flash supports up to 65 536.
const MAX_OUTPUT_TOKENS = 32_768;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses the suggested retry delay from a Gemini 429 error message.
 * Returns a conservative 15 s default when no explicit delay is found.
 */
function parseRetryDelay(message: string): number {
  const match = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(parseFloat(match[1])) * 1000 + 1_500 : 15_000;
}

function translateGeminiError(status: number, rawMessage: string): string {
  const msg = rawMessage.toLowerCase();

  if (status === 429 || msg.includes('quota') || msg.includes('rate')) {
    if (msg.includes('daily') || msg.includes('per day') || msg.includes('per_day')) {
      return 'Cuota diaria de Gemini agotada. Vuelve mañana o usa una API Key diferente.';
    }
    return 'Límite de velocidad de Gemini alcanzado. La app reintentará automáticamente.';
  }
  if (status === 403 || msg.includes('api key') || msg.includes('permission denied')) {
    return 'API Key inválida o sin permisos. Verifica que la copiaste correctamente desde aistudio.google.com/apikey.';
  }
  if (status === 401 || msg.includes('unauthenticated')) {
    return 'No se pudo autenticar. Verifica que tu API Key sea correcta.';
  }
  if (status === 404 || msg.includes('not found')) {
    return 'El modelo de IA no está disponible. Intenta recargar la página.';
  }
  if (status >= 500) {
    return 'Error en los servidores de Google. Espera unos segundos e intenta de nuevo.';
  }
  return rawMessage;
}

/**
 * Calls the Gemini API through the proxy with true exponential backoff.
 * Retries up to 5 times on 429; each wait = min(baseDelay × 2^(attempt-1), 3 min).
 */
async function callGemini(
  parts: GeminiPart[],
  apiKey: string,
  generationConfig: object,
  attempt = 1,
  onRetry?: (attempt: number, waitSec: number) => void
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!OPERATOR_KEY_MODE && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contents: [{ parts }], generationConfig }),
  });

  if (!res.ok) {
    const e = await res.json();
    const rawMessage = e.error?.message ?? `Error ${res.status}`;

    if (res.status === 429 && attempt < 6) {
      const baseDelay = parseRetryDelay(rawMessage);
      const waitMs = Math.min(baseDelay * Math.pow(2, attempt - 1), 180_000);
      onRetry?.(attempt, Math.ceil(waitMs / 1000));
      await sleep(waitMs);
      return callGemini(parts, apiKey, generationConfig, attempt + 1, onRetry);
    }

    throw new Error(translateGeminiError(res.status, rawMessage));
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) throw new Error('Sin respuesta. Verifica tu API Key.');
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

// ---------------------------------------------------------------------------
// Public key validation helper
// ---------------------------------------------------------------------------

/**
 * Sends a minimal text request to verify that an API key is accepted by Gemini.
 * Uses maxOutputTokens=1 to minimize quota usage.
 * Throws a translated error string on failure.
 */
export async function testApiKey(apiKey: string): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!OPERATOR_KEY_MODE && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 1 },
    }),
  });

  if (!res.ok) {
    const e = await res.json();
    throw new Error(translateGeminiError(res.status, e.error?.message ?? `Error ${res.status}`));
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildModulePrompt(pages: number): string {
  const range = getModuleRange(pages);
  return (
    `Analiza este documento y genera módulos de estudio. JSON sin markdown:\n` +
    `{"modules":[` +
    `{"title":"str","summary":"str 3-4 oraciones","keyConcepts":["c1","c2","c3","c4"],` +
    `"markmapContent":"# Título\\n## Concepto\\n### Sub",` +
    `"mermaidDiagram":"flowchart TD\\n  A[\\"Central\\"] --> B[\\"Sub A\\"]",` +
    `"visualContent":[{"type":"chart","description":"str","keyInfo":"str"}],` +
    `"quiz":[` +
    `{"question":"str","options":["A","B","C","D"],"correct":0,"explanation":"str"},` +
    `{"question":"str","options":["A","B","C","D"],"correct":1,"explanation":"str"},` +
    `{"question":"str","options":["A","B","C","D"],"correct":2,"explanation":"str"},` +
    `{"question":"str","options":["A","B","C","D"],"correct":0,"explanation":"str"},` +
    `{"question":"str","options":["A","B","C","D"],"correct":3,"explanation":"str"}` +
    `],"hasPractice":false,"practiceTitle":"","practiceDescription":"","practiceCode":"","practiceSolution":""}` +
    `]}\n` +
    `Reglas:\n` +
    `- Genera entre ${range} módulos según la densidad del contenido\n` +
    `- 5 preguntas de quiz reales del contenido (correct=0-3)\n` +
    `- markmapContent: Markdown jerárquico con conceptos reales del documento\n` +
    `- mermaidDiagram: flowchart TD con 5-8 nodos reales, texto entre comillas dobles si tiene caracteres especiales\n` +
    `- visualContent: hasta 5 elementos visuales importantes del PDF (imágenes, gráficas, tablas, diagramas, figuras). ` +
    `type debe ser "table"|"chart"|"diagram"|"image"|"figure". ` +
    `description explica qué muestra la visual. keyInfo extrae el dato o conclusión más importante. ` +
    `Si no hay elementos visuales relevantes, usar array vacío []\n` +
    `- hasPractice=true solo si el contenido es programación, con ejercicio real\n` +
    `- Responde en el mismo idioma del documento`
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async generateCourse(
    pdfs: PdfInput[],
    courseName: string,
    onStep: (step: LoadingStep) => void,
    initialModules: unknown[] = [],
    onPdfComplete?: (modules: unknown[]) => void
  ): Promise<CoursePlan> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allMods: any[] = [...(initialModules as any[])];
    let gid = allMods.length + 1;

    const retryStep = (attempt: number, waitSec: number) => {
      onStep({ text: `⚠️ Límite alcanzado — reintentando en ${waitSec}s (intento ${attempt}/5)…`, done: false });
    };

    for (let i = 0; i < pdfs.length; i++) {
      const pdf = pdfs[i];

      if (i > 0) {
        onStep({ text: '⏳ Esperando límite de API…', done: false });
        await sleep(REQUEST_GAP_MS);
        onStep({ text: '⏳ Esperando límite de API…', done: true });
      }

      onStep({ text: `📄 Procesando: ${pdf.name}`, done: false });

      const r = await callGemini(
        [
          { inline_data: { mime_type: 'application/pdf', data: pdf.b64 } },
          { text: buildModulePrompt(pdf.pages ?? 0) },
        ],
        this.apiKey,
        { responseMimeType: 'application/json', maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 },
        1,
        retryStep
      ) as { modules: unknown[] };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mods = (r.modules || []).map((m: any) => ({ ...m, id: gid++, sourceFile: pdf.name }));
      allMods.push(...mods);
      onStep({ text: `📄 Procesando: ${pdf.name}`, done: true });

      onPdfComplete?.(allMods);
    }

    // Final exam
    onStep({ text: '⏳ Esperando límite de API…', done: false });
    await sleep(REQUEST_GAP_MS);
    onStep({ text: '⏳ Esperando límite de API…', done: true });

    onStep({ text: '🏆 Generando examen final…', done: false });

    const summary = allMods
      .map((m) => `Módulo ${m.id}: ${m.title} — ${m.summary}`)
      .join('\n');

    const er = await callGemini(
      [
        {
          text:
            `Genera examen final de 12 preguntas. JSON:\n` +
            `{"finalExam":[{"question":"str","options":["A","B","C","D"],"correct":0,"moduleId":1,"explanation":"str"}]}\n\n` +
            `Módulos:\n${summary}\n\n` +
            `Reglas: 12 preguntas, al menos 1 por módulo, correct=0-3. Responde en el idioma de los módulos.`,
        },
      ],
      this.apiKey,
      { responseMimeType: 'application/json', maxOutputTokens: 4_096, temperature: 0.2 },
      1,
      retryStep
    ) as { finalExam: unknown[] };

    onStep({ text: '🏆 Generando examen final…', done: true });

    const title =
      courseName.trim() || pdfs.map((p) => p.name.replace('.pdf', '')).join(' + ');

    return {
      title,
      description: `Curso con ${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''}: ${pdfs.map((p) => p.name).join(', ')}`,
      modules: allMods,
      finalExam: (er.finalExam || []) as CoursePlan['finalExam'],
    };
  }

  async chat(messages: ChatMessage[], systemContext: string, attempt = 1): Promise<string> {
    const parts: GeminiPart[] = [
      { text: `Eres un tutor de estudio experto. Responde en el mismo idioma del usuario de forma clara y concisa.\n\n${systemContext}` },
      ...messages.map((m) => ({ text: `${m.role === 'user' ? 'Usuario' : 'Tutor'}: ${m.text}` })),
    ];

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 1_024, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const e = await res.json();
      const rawMessage = e.error?.message ?? `Error ${res.status}`;

      if (res.status === 429 && attempt < 4) {
        const baseDelay = parseRetryDelay(rawMessage);
        await sleep(Math.min(baseDelay * Math.pow(2, attempt - 1), 60_000));
        return this.chat(messages, systemContext, attempt + 1);
      }

      throw new Error(translateGeminiError(res.status, rawMessage));
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
  }
}
