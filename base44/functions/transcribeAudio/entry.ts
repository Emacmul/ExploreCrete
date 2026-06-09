import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return Response.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    // Step 1: Transcribe with Groq Whisper
    const whisperForm = new FormData();
    whisperForm.append('file', file);
    whisperForm.append('model', 'whisper-large-v3');
    whisperForm.append('response_format', 'json');

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}` },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return Response.json({ error: `Transcription failed: ${err}` }, { status: 500 });
    }

    const whisperData = await whisperRes.json();
    const transcript = whisperData.text || '';

    if (!transcript.trim()) {
      return Response.json({ transcript: '', translation: '', detected_language: '' });
    }

    // Step 2: Translate to English using Groq LLaMA
    const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given text to English accurately and naturally. Return ONLY the translation, nothing else.',
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!chatRes.ok) {
      const err = await chatRes.text();
      return Response.json({ error: `Translation failed: ${err}` }, { status: 500 });
    }

    const chatData = await chatRes.json();
    const translation = chatData.choices?.[0]?.message?.content || '';

    return Response.json({ transcript, translation });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});