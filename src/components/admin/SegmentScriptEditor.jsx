import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Save, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import NarrationTtsEditor from './NarrationTtsEditor';

/**
 * Segment Script Editor — loaded inside the TourSimulator.
 *
 * Lets the admin/narrator select a segment whose scripts were combined in the
 * Segment Script Manager (Waypoints tab), then edit the break tags in the
 * full segment script to match speech/speed.
 *
 * Uses NarrationTtsEditor for all editing, TTS generation, and download
 * (.docx script + .mp3 audio). A "Save Final" button persists the edited
 * script and audio back to the walk's segment_scripts field.
 *
 * Workflow: Combine in Waypoints tab → Edit break tags here → Download final
 * script + audio → Send .docx to ElevenLabs for production voice → Upload
 * resulting audio back to the app via SimpleAudioUpload.
 */
export default function SegmentScriptEditor({ segmentScripts, onSegmentScriptsChange, tourCode }) {
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [editScript, setEditScript] = useState('');
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const availableSegments = (segmentScripts || []).filter((s) => s.combined_script);

  // Auto-select first segment
  useEffect(() => {
    if (!selectedSegment && availableSegments.length > 0) {
      setSelectedSegment(availableSegments[0].segment_number);
    }
  }, [availableSegments, selectedSegment]);

  // Load script when segment changes
  useEffect(() => {
    if (!selectedSegment) {
      setEditScript('');
      setEditAudioUrl('');
      return;
    }
    const seg = (segmentScripts || []).find((s) => s.segment_number === selectedSegment);
    if (seg) {
      setEditScript(seg.final_script || seg.combined_script || '');
      setEditAudioUrl(seg.final_audio_url || seg.combined_audio_url || '');
    }
  }, [selectedSegment, segmentScripts]);

  const handleSaveFinal = () => {
    setSaving(true);
    const updated = (segmentScripts || []).map((s) =>
      s.segment_number === selectedSegment
        ? { ...s, final_script: editScript, final_audio_url: editAudioUrl, status: 'finalized' }
        : s
    );
    onSegmentScriptsChange(updated);
    setTimeout(() => setSaving(false), 500);
  };

  if (availableSegments.length === 0) {
    return (
      <div className="bg-slate-800/60 rounded-lg border border-blue-700/40 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <Label className="text-slate-300 text-sm font-medium">Segment Script Editor</Label>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-slate-500">
          <Layers className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No combined segment scripts yet.</p>
          <p className="text-xs mt-1 text-center">
            Use the <strong className="text-slate-400">Segment Script Manager</strong> in the
            Waypoints tab to combine waypoint scripts into segment scripts first.
          </p>
        </div>
      </div>
    );
  }

  const currentSeg = (segmentScripts || []).find((s) => s.segment_number === selectedSegment);

  return (
    <div className="bg-slate-800/60 rounded-lg border border-blue-700/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-400" />
        <Label className="text-slate-300 text-sm font-medium">Segment Script Editor</Label>
        <span className="text-xs text-slate-500 ml-1">
          edit break tags → generate audio → download final
        </span>
      </div>

      <Select
        value={selectedSegment || undefined}
        onValueChange={setSelectedSegment}
      >
        <SelectTrigger className="bg-slate-700 border-slate-500 text-white h-9">
          <SelectValue placeholder="Select a segment…" />
        </SelectTrigger>
        <SelectContent>
          {availableSegments.map((seg) => (
            <SelectItem key={seg.segment_number} value={seg.segment_number}>
              {seg.segment_id || `Segment ${seg.segment_number}`}
              {seg.status === 'finalized' ? ' ✓ Finalized' : ' (draft)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentSeg && (
        <>
          <div className="flex items-center gap-2 text-xs">
            {currentSeg.status === 'finalized' ? (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Finalized — edit and re-save to update
              </span>
            ) : (
              <span className="flex items-center gap-1 text-blue-400">
                <FileText className="w-3 h-3" /> Draft — adjust break tags, then save as final
              </span>
            )}
          </div>

          {/* key={selectedSegment} forces remount when switching segments,
              resetting NarrationTtsEditor's internal segment/audio state */}
          <NarrationTtsEditor
            key={selectedSegment}
            script={editScript}
            audioUrl={editAudioUrl}
            onScriptChange={setEditScript}
            onAudioChange={setEditAudioUrl}
          />

          <Button
            onClick={handleSaveFinal}
            disabled={saving || !editScript?.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Final Script & Audio to Segment
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Download the .docx script above → send to ElevenLabs for production voice →
            upload the resulting MP3 via SimpleAudioUpload on the waypoint.
          </p>
        </>
      )}
    </div>
  );
}