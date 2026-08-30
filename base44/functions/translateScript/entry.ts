import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Friendly language name -> ISO 639-1 code for Google Translate
const LANGUAGE_CODES = {
  english: 'en', german: 'de', french: 'fr', spanish: 'es', italian: 'it',
  greek: 'el', dutch: 'nl', russian: 'ru', arabic: 'ar', portuguese: 'pt',
  polish: 'pl', swedish: 'sv', norwegian: 'no', danish: 'da', finnish: 'fi',
  czech: 'cs', turkish: 'tr', japanese: 'ja', chinese: 'zh', korean: 'ko',
  hebrew: 'he', hungarian: 'hu', romanian: 'ro', bulgarian: 'bg', serbian: 'sr',
  croatian: 'hr', slovak: 'sk', slovenian: 'sl', lithuanian: 'lt', latvian: 'lv',
  estonian: 'et', ukrainian: 'uk', catalan: 'ca'
};

function toLangCode(name) {
  if (!name) return 'en';
  const key = name.toLowerCase().trim();
  return LANGUAGE_CODES[key] || key; // if a code was passed directly, use it
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { text, target_language } = body;

    if (!text || !text.trim()) {
      return Response.json({ error: 'Missing text to translate' }, { status: 400 });
    }
    if (!target_language) {
      return Response.json({ error: 'Missing target language' }, { status: 400 });
    }

    const apiKey = secrets.get('GOOGLE_TRANSLATE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Google Translate API key not configured' }, { status: 500 });
    }

    const target = toLangCode(target_language);

    // Tokenize: alternating text segments and <break .../> tags.
    // We translate only the text segments and preserve the break tags exactly.
    const tokens = text.split(/(<break[^>]*\/>)/);
    const textSegmentIndices = [];
    tokens.forEach((tok, i) => {
      if (i % 2 === 0 && tok.trim() !== '') textSegmentIndices.push(i);
    });

    const segments = textSegmentIndices.map(i => tokens[i]);
    let translatedSegments = [];

    if (segments.length > 0) {
      const googleRes = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: segments, target, format: 'text' })
      });

      if (!googleRes.ok) {
        let detail = `Google Translate returned ${googleRes.status}`;
        try {
          const errBody = await googleRes.json();
          detail = errBody?.error?.message || detail;
        } catch (_) { /* ignore parse failure */ }
        return Response.json({ error: detail }, { status: 502 });
      }

      const data = await googleRes.json();
      translatedSegments = (data?.data?.translations || []).map(t => t.translatedText);
    }

    // Reassemble: translated text segments + original break tags in order
    let segIdx = 0;
    const result = tokens.map((tok, i) => {
      if (i % 2 === 0) {
        if (tok.trim() === '') return tok;
        return translatedSegments[segIdx++] ?? tok;
      }
      return tok; // break tag preserved exactly
    }).join('');

    return Response.json({ translated_text: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}