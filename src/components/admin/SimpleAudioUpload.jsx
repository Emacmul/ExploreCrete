import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, FileCheck, Loader2, Trash2, Volume2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Simple audio file upload for admins.
 * Shows upload + preview only — no trigger configuration, no narration script.
 */
export default function SimpleAudioUpload({ audioUrl, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange('audio_clip_url', file_url);
    } catch (err) {
      console.warn('Audio upload failed:', err);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-blue-600/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-blue-400" />
        <Label className="text-slate-300 text-sm font-medium">Finished Audio Clip</Label>
      </div>
      {audioUrl ? (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/50 rounded-lg px-3 py-2">
          <FileCheck className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-green-300 text-sm flex-1 truncate">Audio clip uploaded</span>
          <audio controls src={audioUrl} className="h-7" />
          <button
            type="button"
            onClick={() => onChange('audio_clip_url', '')}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Remove audio"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className={`flex items-center gap-2 cursor-pointer bg-slate-700 border border-dashed border-slate-500 rounded-lg px-3 py-2 text-slate-400 hover:text-white hover:border-blue-500/50 transition-colors text-sm w-full ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload finished audio (mp3, wav, m4a)'}
          <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" className="hidden" onChange={handleUpload} />
        </label>
      )}
    </div>
  );
}