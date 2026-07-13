import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { LANGUAGES } from '@/lib/languages';
import { Upload, Loader2, Volume2, RefreshCw, FileText, Sparkles, Pause } from 'lucide-react';
import AudioPlayer from '@/components/ui/AudioPlayer';

const VOICES = [
  { value: 'NEUTRAL', label: 'Default voice (auto)' },
  { value: 'FEMALE', label: 'Female voice' },
  { value: 'MALE', label: 'Male voice' },
];

const LANG_TO_CODE = {
  English: 'en-US', Dutch: 'nl-NL', Czech: 'cs-CZ', German: 'de-DE',
  French: 'fr-FR', Italian: 'it-IT', Arabic: 'ar-XA', Hebrew: 'he-IL',
  Polish: 'pl-PL', Spanish: 'es-ES', Portuguese: 'pt-PT', Turkish: 'tr-TR',
  Russian: 'ru-RU', Hungarian: 'hu-HU',
};

const MAX_CHARS = 5000;

/**
 * NarrationTtsEditor — import, edit, and TTS-generate narration audio.
 *
 * Workflow:
 *   1. Import a .txt script file (SSML break tags preserved)
 *   2. Edit text and break tags freely in the textarea
 *   3. Generate TTS audio from the current script
 *   4. Preview, edit again, regenerate — repeatable
 *
 * Props:
 *   script        – current narration_script string
 *   audioUrl      – current audio_clip_url
 *   onScriptChange(val)
 *   onAudioChange(val)
 */
export default function NarrationTtsEditor({ script, audioUrl, onScriptChange, onAudioChange }) {
  const [importing, setImporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('NEUTRAL');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const charCount = (script || '').length;
  const overLimit = charCount > MAX_CHARS;

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (script && script.trim().length > 0) {
      if (!window.confirm('This will replace the existing script. Continue?')) {
        e.target.value = '';
        return;
      }
    }
    setImporting(true);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      onScriptChange(ev.target.result);
      setImporting(false);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateAudio = async () => {
    if (!script || !script.trim()) {
      setError('Please import or write a script first.');
      return;
    }
    if (overLimit) {
      setError(`Script exceeds the ${MAX_CHARS} character limit. Please shorten it.`);
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateTts', {
        text: script,
        gender: selectedVoice,
        language_code: LANG_TO_CODE[selectedLanguage] || 'en-US',
      });
      const result = response.data;
      if (result?.url) {
        onAudioChange(result.url);
      } else {
        setError('TTS generation returned no audio URL.');
      }
    } catch (err) {
      setError(err.message || 'TTS generation failed.');
    }
    setGenerating(false);
  };

  const insertBreakTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onScriptChange((script || '') + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newScript = (script || '').slice(0, start) + tag + (script || '').slice(end);
    onScriptChange(newScript);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 0);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-blue-600/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <Label className="text-slate-300 text-sm font-medium">Narration Script & TTS</Label>
        <span className="text-xs text-slate-500 ml-1">import, edit, generate audio</span>
      </div>

      {/* Import + break tag insert buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleImport} />
        <Button
          type="button" size="sm" variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing || generating}
          className="border-slate-500 text-slate-300 gap-1.5"
        >
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Import Script
        </Button>
        <div className="flex items-center gap-1 ml-1">
          <span className="text-xs text-slate-500">Insert pause:</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertBreakTag('<break time="1s"/>')}
            className="text-slate-400 hover:text-slate-200 h-7 px-2 text-xs gap-1">
            <Pause className="w-3 h-3" /> 1s
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertBreakTag('<break time="2s"/>')}
            className="text-slate-400 hover:text-slate-200 h-7 px-2 text-xs gap-1">
            <Pause className="w-3 h-3" /> 2s
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertBreakTag('<break time="3s"/>')}
            className="text-slate-400 hover:text-slate-200 h-7 px-2 text-xs gap-1">
            <Pause className="w-3 h-3" /> 3s
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertBreakTag('<break strength="medium"/>')}
            className="text-slate-400 hover:text-slate-200 h-7 px-2 text-xs">
            medium
          </Button>
        </div>
      </div>

      {/* Editable script textarea */}
      <div>
        <Textarea
          ref={textareaRef}
          value={script || ''}
          onChange={e => onScriptChange(e.target.value)}
          placeholder={'Import a script file or write here...\n\nSSML pauses are preserved: <break time="2s"/> or <break strength="medium"/>'}
          rows={6}
          className="bg-slate-700 border-slate-500 text-white text-sm font-mono resize-y"
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${overLimit ? 'text-red-400' : 'text-slate-500'}`}>
            {charCount} / {MAX_CHARS} characters
          </span>
          {charCount > 0 && (
            <span className="text-xs text-green-500">
              Free via Google TTS (1M chars/month)
            </span>
          )}
        </div>
      </div>

      {/* TTS voice + language */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Voice (Google)</Label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="bg-slate-700 border-slate-500 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map(v => (
                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Language</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="bg-slate-700 border-slate-500 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate / Regenerate button */}
      <Button
        type="button"
        onClick={handleGenerateAudio}
        disabled={generating || overLimit || !script?.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 gap-2 text-white"
      >
        {generating
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : audioUrl
            ? <RefreshCw className="w-4 h-4" />
            : <Volume2 className="w-4 h-4" />}
        {generating ? 'Generating…' : audioUrl ? 'Regenerate Audio' : 'Generate Audio'}
      </Button>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Audio preview */}
      {audioUrl && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-green-300 text-sm font-medium">
              {generating ? 'Updating audio…' : 'Current audio'}
            </span>
          </div>
          <AudioPlayer src={audioUrl} className="w-full" />
          <p className="text-xs text-slate-500">
            Edit the script above and click "Regenerate Audio" to update this clip.
          </p>
        </div>
      )}
    </div>
  );
}