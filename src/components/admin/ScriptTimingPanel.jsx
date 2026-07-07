import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { LANGUAGES } from '@/lib/languages';
import { Type, Plus, Users, MessageSquare, Loader2, Globe, ChevronDown, ChevronUp } from 'lucide-react';

const R_EARTH = 6371000;

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

function nearestPathIndex(path, lat, lng) {
  let minDist = Infinity;
  let nearestIdx = 0;
  for (let i = 0; i < path.length; i++) {
    const d = haversine(lat, lng, path[i].lat, path[i].lng);
    if (d < minDist) { minDist = d; nearestIdx = i; }
  }
  return nearestIdx;
}

function pathDistanceBetween(path, startIdx, endIdx) {
  if (startIdx >= endIdx) return 0;
  let total = 0;
  for (let i = startIdx; i < endIdx && i < path.length - 1; i++) {
    total += haversine(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
  }
  return total;
}

function fmtTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

export default function ScriptTimingPanel({ trailPath, waypoints }) {
  const [narrators, setNarrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedNarratorId, setSelectedNarratorId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNarratorList, setShowNarratorList] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLanguage, setNewLanguage] = useState(LANGUAGES[0]);
  const [newWpm, setNewWpm] = useState(130);
  const [audioFile, setAudioFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadNarrators = async () => {
    setLoading(true);
    try {
      const result = await base44.entities.Narrator.list();
      setNarrators(result);
    } catch (e) {
      // entity may not be ready yet
    }
    setLoading(false);
  };

  useEffect(() => { loadNarrators(); }, []);

  useEffect(() => {
    const matching = narrators.filter(n => n.language === selectedLanguage);
    if (matching.length > 0) {
      if (!matching.find(n => n.id === selectedNarratorId)) {
        setSelectedNarratorId(matching[0].id);
      }
    } else {
      setSelectedNarratorId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage, narrators]);

  const allLanguages = useMemo(() => {
    const set = new Set(LANGUAGES);
    narrators.forEach(n => { if (n.language) set.add(n.language); });
    return Array.from(set);
  }, [narrators]);

  const filteredNarrators = narrators.filter(n => n.language === selectedLanguage);
  const activeNarrator = narrators.find(n => n.id === selectedNarratorId);
  const wpm = activeNarrator?.words_per_minute || 0;

  const segments = useMemo(() => {
    if (trailPath.length < 2 || waypoints.length === 0) return [];

    const starts = waypoints
      .map((wp, i) => ({ wp, i }))
      .filter(({ wp }) => wp.waypoint_role === 'primary_start');

    if (starts.length === 0) return [];

    return starts.map((startEntry, s) => {
      const startWp = startEntry.wp;
      const startIdx = startEntry.i;

      let endWp = null;
      for (let j = startIdx + 1; j < waypoints.length; j++) {
        const wp = waypoints[j];
        if (wp.waypoint_role === 'primary_stop' || wp.waypoint_role === 'primary_start') {
          endWp = wp;
          break;
        }
      }
      if (!endWp) endWp = trailPath[trailPath.length - 1];

      const pathStartIdx = nearestPathIndex(trailPath, startWp.lat, startWp.lng);
      const pathEndIdx = nearestPathIndex(trailPath, endWp.lat, endWp.lng);
      const distance = pathDistanceBetween(trailPath, pathStartIdx, pathEndIdx);

      const speed = Number(startWp.avg_segment_speed_kmh) || 50;
      const timeSeconds = speed > 0 ? (distance / 1000) / speed * 3600 : 0;
      const wordCount = wpm > 0 ? Math.floor((timeSeconds / 60) * wpm) : 0;

      return {
        name: startWp.segment_id || startWp.name || `Segment ${s + 1}`,
        title: startWp.segment_title,
        distance, speed, timeSeconds, wordCount,
      };
    });
  }, [waypoints, trailPath, wpm]);

  const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
  const totalTime = segments.reduce((sum, s) => sum + s.timeSeconds, 0);
  const totalWords = segments.reduce((sum, s) => sum + s.wordCount, 0);

  const handleAddNarrator = async () => {
    if (!newName || !newLanguage || !newWpm) return;
    setSaving(true);
    try {
      let audioUrl = '';
      if (audioFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
        audioUrl = file_url;
      }
      const created = await base44.entities.Narrator.create({
        name: newName,
        language: newLanguage,
        words_per_minute: Number(newWpm),
        sample_audio_url: audioUrl,
      });
      setNewName(''); setNewWpm(130); setAudioFile(null);
      setShowAddForm(false);
      setSelectedLanguage(newLanguage);
      await loadNarrators();
      if (created?.id) setSelectedNarratorId(created.id);
    } catch (e) {
      // ignore
    }
    setSaving(false);
  };

  const handleDeleteNarrator = async (id) => {
    try {
      await base44.entities.Narrator.delete(id);
      await loadNarrators();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="bg-slate-800/40 rounded-xl border border-blue-600/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Type className="w-5 h-5 text-blue-400" />
        <h3 className="text-white font-semibold">Script Timing</h3>
        <span className="text-xs text-slate-500 ml-1">recommended words per segment</span>
      </div>

      {/* Language + Narrator selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-400 text-xs mb-1.5 block">Language</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allLanguages.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-400 text-xs mb-1.5 block">Narrator</Label>
          {filteredNarrators.length > 0 ? (
            <Select value={selectedNarratorId} onValueChange={setSelectedNarratorId}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select narrator..." />
              </SelectTrigger>
              <SelectContent>
                {filteredNarrators.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name} ({n.words_per_minute} WPM)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 flex items-center px-3 rounded-md border border-slate-600 bg-slate-800 text-slate-500 text-sm">
              {loading ? 'Loading...' : `No narrators for ${selectedLanguage}`}
            </div>
          )}
        </div>
      </div>

      {/* WPM + sample audio */}
      {activeNarrator && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
            <MessageSquare className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm font-medium">{wpm} WPM</span>
          </div>
          {activeNarrator.sample_audio_url && (
            <audio controls src={activeNarrator.sample_audio_url} className="h-8 flex-1 min-w-[200px]" />
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => { setShowAddForm(!showAddForm); setShowNarratorList(false); }}
          className="border-slate-500 text-slate-300 gap-1">
          <Plus className="w-3.5 h-3.5" /> {showAddForm ? 'Cancel' : 'Add Narrator'}
        </Button>
        {narrators.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => { setShowNarratorList(!showNarratorList); setShowAddForm(false); }}
            className="border-slate-500 text-slate-300 gap-1">
            <Users className="w-3.5 h-3.5" /> {showNarratorList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} All ({narrators.length})
          </Button>
        )}
      </div>

      {/* Add narrator form */}
      {showAddForm && (
        <div className="bg-slate-900/60 rounded-lg border border-slate-600 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Narrator name" value={newName} onChange={e => setNewName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white" />
            <div className="relative">
              <Input list="narrator-lang-list" placeholder="Language" value={newLanguage}
                onChange={e => setNewLanguage(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white" />
              <datalist id="narrator-lang-list">
                {allLanguages.map(lang => <option key={lang} value={lang} />)}
              </datalist>
            </div>
            <Input type="number" placeholder="WPM" value={newWpm}
              onChange={e => setNewWpm(Number(e.target.value))}
              className="bg-slate-800 border-slate-600 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg"
              onChange={e => setAudioFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 flex-1" />
            <Button size="sm" onClick={handleAddNarrator} disabled={saving || !newName}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Type a new language name to add one not in the default list — it will appear in all dropdowns going forward.
          </p>
        </div>
      )}

      {/* Narrator list */}
      {showNarratorList && (
        <div className="bg-slate-900/60 rounded-lg border border-slate-600 p-3 space-y-1.5 max-h-60 overflow-y-auto">
          {narrators.map(n => (
            <div key={n.id} className="flex items-center gap-2 bg-slate-800/50 rounded px-3 py-1.5 text-sm">
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-200 font-medium flex-1 truncate">{n.name}</span>
              <span className="text-slate-500 text-xs">{n.language}</span>
              <span className="text-green-400 text-xs font-mono">{n.words_per_minute} WPM</span>
              <button onClick={() => handleDeleteNarrator(n.id)}
                className="text-slate-600 hover:text-red-400 transition-colors text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Segment timing table */}
      {segments.length > 0 ? (
        <div className="space-y-1.5">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-sm font-medium truncate">{seg.name}</div>
                {seg.title && <div className="text-slate-500 text-xs truncate">{seg.title}</div>}
              </div>
              <div className="text-center shrink-0 w-16">
                <div className="text-slate-300 text-sm">{fmtDist(seg.distance)}</div>
                <div className="text-slate-600 text-xs">dist</div>
              </div>
              <div className="text-center shrink-0 w-14 hidden sm:block">
                <div className="text-blue-300 text-sm">{seg.speed}</div>
                <div className="text-slate-600 text-xs">km/h</div>
              </div>
              <div className="text-center shrink-0 w-14">
                <div className="text-amber-300 text-sm">{fmtTime(seg.timeSeconds)}</div>
                <div className="text-slate-600 text-xs">time</div>
              </div>
              <div className="text-center shrink-0 w-16">
                <div className="text-green-400 font-bold text-base">
                  {wpm > 0 ? seg.wordCount : '—'}
                </div>
                <div className="text-slate-600 text-xs">words</div>
              </div>
            </div>
          ))}
          {/* Totals */}
          <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-2">
            <div className="flex-1 text-blue-200 text-sm font-semibold">Total</div>
            <div className="text-center shrink-0 w-16 text-blue-300 text-sm">{fmtDist(totalDistance)}</div>
            <div className="text-center shrink-0 w-14 hidden sm:block text-slate-500 text-sm">—</div>
            <div className="text-center shrink-0 w-14 text-amber-300 text-sm font-medium">{fmtTime(totalTime)}</div>
            <div className="text-center shrink-0 w-16 text-green-400 font-bold">
              {wpm > 0 ? totalWords : '—'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm py-3 text-center">
          {waypoints.filter(w => w.waypoint_role === 'primary_start').length === 0
            ? 'Add Primary-Start waypoints with segment speeds to see timing.'
            : 'Add a trail path to calculate segment distances.'}
        </div>
      )}
    </div>
  );
}