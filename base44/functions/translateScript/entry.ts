import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
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

    const prompt = `Translate the following narration script into ${target_language}.

CRITICAL RULES:
1. Preserve ALL <break> tags EXACTLY as they are — same tag, same duration. Do not modify, move, translate, or remove them.
2. Only translate the spoken narration text between the break tags.
3. Keep the translation natural and conversational, suitable for spoken audio narration.
4. If the script starts with a title line, translate the title too.
5. Return ONLY the translated text with break tags preserved. No explanations, no markdown, no commentary — just the translated script.

Script:
${text}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          translated_text: { type: 'string', description: 'The translated narration script with all <break> tags preserved' },
        },
        required: ['translated_text'],
      },
    });

    const translatedText = result.translated_text;

    if (!translatedText) {
      return Response.json({ error: 'No translation returned' }, { status: 500 });
    }

    return Response.json({ translated_text: translatedText.trim() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});