/**
 * Vercel Serverless Function — Gemini API proxy
 *
 * Purpose: keeps the API key out of browser URLs.
 *
 * Key resolution order:
 *   1. GEMINI_API_KEY env var (operator key — set in Vercel dashboard)
 *   2. Authorization: Bearer <key> header sent by the client (user-provided key)
 *
 * For production with user auth, replace option 2 with an OAuth token exchange.
 */

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Max allowed body size coming from the client (3 MB base64 PDF ≈ 4 MB JSON).
// Vercel Hobby plan allows 4.5 MB; this gives us comfortable headroom.
const MAX_BODY_BYTES = 4 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Only POST is allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- API key resolution ------------------------------------------------
  // Prefer operator key (set in Vercel env); fall back to user-provided key.
  const operatorKey: string = process.env.GEMINI_API_KEY ?? '';
  let apiKey = operatorKey;

  if (!apiKey) {
    const authHeader: string = req.headers['authorization'] ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    apiKey = authHeader.slice(7).trim();
    // Basic format guard — Gemini keys always start with "AIzaSy"
    if (!apiKey.startsWith('AIzaSy') || apiKey.length < 30) {
      return res.status(400).json({ error: 'Formato de API Key inválido.' });
    }
  }

  // --- Body size guard ---------------------------------------------------
  const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({
      error: 'El PDF es demasiado grande. Máximo 3 MB por archivo.',
    });
  }

  // --- Forward to Gemini ------------------------------------------------
  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch {
    return res.status(500).json({ error: 'Error al conectar con Gemini.' });
  }
}
