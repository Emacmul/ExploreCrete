import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Pencil, Check, X, Upload, FileCheck, Trash2, FileUp, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FitParser from 'fit-file-parser';
import WaypointEditor from './WaypointEditor';
import TrailPathEditor from './TrailPathEditor';
import AdminPreviewMap from './AdminPreviewMap';

const DEFAULT_INTERESTS = ['Wild Flowers', 'History', 'Mythology', 'Archaeology', 'Photography', 'Routes of Faith'];

const EMPTY_WALK = {
  code: '',
  parent_code: '',
  name: '',
  description: '',
  difficulty: 'moderate',
  walk_type: 'B',
  is_free_preview: false,
  distance_km: '',
  duration_hours: '',
  elevation_gain_m: '',
  start_lat: '',
  start_lng: '',
  region: '',
  main_interest: '',
  trail_path: [],
  waypoints: [],
};

function SaveButton({ onSave, saving }) {
  return (
    <div className="border-t border-slate-700 pt-4 flex justify-end">
      <Button onClick={onSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Walk
      </Button>
    </div>
  );
}

export default function WalkEditor({ walk, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_WALK, ...walk });
  const [saving, setSaving] = useState(false);
  const [gpxUploading, setGpxUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(walk?.id ? 'waypoints' : 'details');
  const [interests, setInterests] = useState(DEFAULT_INTERESTS);
  const [editingInterests, setEditingInterests] = useState(false);
  const [newInterest, setNewInterest] = useState('');

  // helpers for multi-select interests (stored as comma-separated string)
  const selectedInterests = form.main_interest
    ? form.main_interest.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const toggleInterest = (value) => {
    const current = selectedInterests;
    if (current.includes(value)) {
      set('main_interest', current.filter(i => i !== value).join(', '));
    } else if (current.length < 3) {
      set('main_interest', [...current, value].join(', '));
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const [gpxImporting, setGpxImporting] = useState(false);
  const [gpxImportDone, setGpxImportDone] = useState(false);

  // Shared helper: compute distance + elevation from a trailPath array + elevations array
  const computeStats = (trailPath, elevations) => {
    let distanceKm = 0;
    for (let i = 1; i < trailPath.length; i++) {
      const R = 6371;
      const dLat = (trailPath[i].lat - trailPath[i-1].lat) * Math.PI / 180;
      const dLon = (trailPath[i].lng - trailPath[i-1].lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(trailPath[i-1].lat * Math.PI/180) * Math.cos(trailPath[i].lat * Math.PI/180) * Math.sin(dLon/2)**2;
      distanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    let elevGain = 0;
    for (let i = 1; i < elevations.length; i++) {
      if (elevations[i] > elevations[i-1]) elevGain += elevations[i] - elevations[i-1];
    }
    return { distanceKm, elevGain };
  };

  const applyImportedData = (trailPath, waypoints, elevations) => {
    const startPt = trailPath[0] || waypoints[0];
    const { distanceKm, elevGain } = computeStats(trailPath, elevations);
    setForm(prev => ({
      ...prev,
      trail_path: trailPath,
      waypoints: waypoints.length > 0 ? waypoints : prev.waypoints,
      start_lat: startPt ? startPt.lat : prev.start_lat,
      start_lng: startPt ? startPt.lng : prev.start_lng,
      distance_km: distanceKm > 0 ? Math.round(distanceKm * 10) / 10 : prev.distance_km,
      elevation_gain_m: elevGain > 0 ? Math.round(elevGain) : prev.elevation_gain_m,
    }));
    setGpxImporting(false);
    setGpxImportDone(true);
    setTimeout(() => setGpxImportDone(false), 4000);
  };

  const handleGpxImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setGpxImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target.result, 'application/xml');

      const trkpts = Array.from(doc.querySelectorAll('trkpt'));
      const trailPath = trkpts.map(pt => ({
        lat: parseFloat(pt.getAttribute('lat')),
        lng: parseFloat(pt.getAttribute('lon')),
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));

      const wpts = Array.from(doc.querySelectorAll('wpt'));
      const waypoints = wpts.map((wpt, i) => ({
        lat: parseFloat(wpt.getAttribute('lat')),
        lng: parseFloat(wpt.getAttribute('lon')),
        name: `Waypoint ${i + 1}`,
        description: '',
        type: 'landmark',
        image_url: '',
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));

      const elevations = trkpts.map(pt => parseFloat(pt.querySelector('ele')?.textContent || 'NaN')).filter(e => !isNaN(e));
      applyImportedData(trailPath, waypoints, elevations);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFitImport = (e) => {
    console.log('handleFitImport called');
    const file = e.target.files[0];
    console.log('File selected:', file?.name);
    if (!file) return;
    setGpxImporting(true);
    console.log('Starting FIT import...');
    const reader = new FileReader();
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setGpxImporting(false);
      alert('Error reading file: ' + err.message);
    };
    reader.onload = (ev) => {
      try {
        const arrayBuffer = ev.target.result;
        console.log('File loaded, size:', arrayBuffer.byteLength);
        
        console.log('FitParser:', FitParser);
        const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km', elapsedRecordField: true });
        console.log('Parser created, about to parse...');
        fitParser.parse(arrayBuffer, (error, data) => {
          console.log('Parse callback fired!');
          if (error) { 
            console.error('FIT parse error:', error);
            setGpxImporting(false); 
            alert('Could not read FIT file: ' + error); 
            return; 
          }

          console.log('Full FIT data keys:', Object.keys(data || {}));
          console.log('Full data:', data);

        // Try multiple locations where records can live in FIT structure
        const records = (
          data?.activity?.sessions?.flatMap(s => s.laps?.flatMap(l => l.records || []) || []) ||
          data?.records ||
          []
        );

        const trailPath = records
          .filter(r => r.position_lat != null && r.position_long != null)
          .map(r => ({ lat: r.position_lat, lng: r.position_long }));

        const elevations = records
          .filter(r => r.altitude != null)
          .map(r => r.altitude);

        // FIT course points — Garmin saves named waypoints here
        // Try all possible locations
        let coursePoints = [];
        if (data?.course_points?.length > 0) coursePoints = data.course_points;
        else if (data?.course?.course_points?.length > 0) coursePoints = data.course.course_points;
        else if (data?.activity?.course_points?.length > 0) coursePoints = data.activity.course_points;
        else if (data?.activity?.sessions?.length > 0) {
          for (const session of data.activity.sessions) {
            if (session.course_points?.length > 0) {
              coursePoints = session.course_points;
              break;
            }
          }
        }

        console.log('Course points found:', coursePoints.length);
        if (coursePoints.length > 0) console.log('First course point:', coursePoints[0]);

        const waypoints = coursePoints.map((cp, i) => ({
          lat: cp.position_lat || cp.positionLat,
          lng: cp.position_long || cp.positionLong,
          name: cp.name || `Waypoint ${i + 1}`,
          description: cp.type ? `Type: ${cp.type}` : '',
          type: 'landmark',
          image_url: '',
        })).filter(p => p.lat != null && p.lng != null);

        applyImportedData(trailPath, waypoints, elevations);
        });
      } catch (err) {
        console.error('FIT import exception:', err);
        setGpxImporting(false);
        alert('Error parsing FIT file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleFileImport = (e) => {
    console.log('handleFileImport called, files:', e.target.files);
    const file = e.target.files[0];
    console.log('File:', file?.name);
    if (!file) return;
    console.log('File extension check:', file.name.toLowerCase());
    if (file.name.toLowerCase().endsWith('.fit')) {
      console.log('→ Routing to FIT handler');
      handleFitImport(e);
    } else {
      console.log('→ Routing to GPX handler');
      handleGpxImport(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      elevation_gain_m: form.elevation_gain_m ? Number(form.elevation_gain_m) : undefined,
      start_lat: Number(form.start_lat),
      start_lng: Number(form.start_lng),
    };
    await onSave(data);
    setSaving(false);
  };

  const tabs = [
    { id: 'details', label: 'Basic Details' },
    { id: 'trail', label: 'Trail Path (GPS)' },
    { id: 'waypoints', label: `Key Points${form.waypoints.length ? ` (${form.waypoints.length})` : ''}` },
    { id: 'preview', label: 'Preview' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 mt-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-300 hover:text-white gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h2 className="text-xl font-bold text-white">
            {walk?.id ? `Editing: ${walk.code || walk.name}` : 'New Walk'}
          </h2>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Walk
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-sm font-medium px-3 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        {activeTab === 'details' && (
          <div className="space-y-5">

            {/* GPX Import */}
            <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-3">
              <FileUp className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-blue-200 text-sm font-medium">Import from GPX or FIT</p>
                <p className="text-blue-400 text-xs">Pre-fills start point, trail path, waypoints, distance & elevation from your eTrex GPX or FIT file</p>
              </div>
              {gpxImportDone ? (
                <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Imported!
                </span>
              ) : (
                <label className={`flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${gpxImporting ? 'opacity-60 pointer-events-none' : ''}`}>
                  {gpxImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {gpxImporting ? 'Reading…' : 'Choose GPX / FIT'}
                  <input type="file" accept=".gpx,.fit,application/gpx+xml" className="hidden" onChange={(e) => { console.log('INPUT onChange fired'); handleFileImport(e); }} />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Walk Code *</Label>
                <Input
                  value={form.code}
                  onChange={e => set('code', e.target.value)}
                  placeholder="e.g. CRE-007"
                  className="bg-slate-700 border-slate-600 text-white font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Unique identifier shown to users</p>
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Walk Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Balos Lagoon Trail"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-1.5 block">About This Walk</Label>
              <Textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe the walk — landscape, experience, highlights, what to expect..."
                rows={5}
                className="bg-slate-700 border-slate-600 text-white resize-none"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-1.5 block">
                ⚠️ Safety Notes
                <span className="ml-2 text-xs text-slate-500 font-normal">Shown prominently to users before they set off</span>
              </Label>
              <Textarea
                value={form.safety_notes || ''}
                onChange={e => set('safety_notes', e.target.value)}
                placeholder={`e.g. This route passes through unmarked terrain and maquis. You must download the GPX file and load it into a navigation app before departure.\n\nEssential equipment: sun hat, sturdy walking shoes or boots, walking poles, and a minimum of 2 litres of water per person. Mobile signal is unreliable on this route.\n\nNote: Under Greek law, the cost of any search and rescue operation is charged to the individual. Do not attempt this walk unprepared.`}
                rows={6}
                className="bg-slate-700 border-slate-600 text-white resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Region</Label>
                <Select value={form.region} onValueChange={v => set('region', v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Chania', 'Rethymno', 'Heraklion', 'Lasithi'].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => set('difficulty', v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['easy', 'moderate', 'challenging', 'difficult'].map(d => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lego system type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  Walk Type
                  <span className="ml-2 text-xs text-slate-500 font-normal">Lego system tier</span>
                </Label>
                <Select value={form.walk_type || 'B'} onValueChange={v => { set('walk_type', v); if (v === 'B') set('parent_code', ''); }}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">B — Base (Explorer+)</SelectItem>
                    <SelectItem value="C1">C1 — Pathfinder+</SelectItem>
                    <SelectItem value="C2">C2 — Wayfinder+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  Free Preview
                  <span className="ml-2 text-xs text-slate-500 font-normal">Visible to Wanderers</span>
                </Label>
                <div className="flex items-center gap-3 h-9 bg-slate-700 border border-slate-600 rounded-md px-3">
                  <button
                    type="button"
                    onClick={() => set('is_free_preview', !form.is_free_preview)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.is_free_preview ? 'bg-amber-500' : 'bg-slate-500'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_free_preview ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-slate-300 text-sm">{form.is_free_preview ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Parent code — only for C1/C2 */}
            {(form.walk_type === 'C1' || form.walk_type === 'C2') && (
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  Parent B Walk Code *
                  <span className="ml-2 text-xs text-slate-500 font-normal">The B walk this bolt-on extends</span>
                </Label>
                <Input
                  value={form.parent_code || ''}
                  onChange={e => set('parent_code', e.target.value)}
                  placeholder="e.g. BCRE00000001"
                  className="bg-slate-700 border-slate-600 text-white font-mono"
                />
              </div>
            )}

            {/* Main Interests */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-slate-300">
                  Main Interests
                  <span className="ml-2 text-xs text-slate-500">(select up to 3)</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setEditingInterests(v => !v)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {editingInterests ? 'Done editing list' : 'Edit list'}
                </button>
              </div>

              {/* Selected tags */}
              {selectedInterests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedInterests.map(i => (
                    <span key={i} className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {i}
                      <button type="button" onClick={() => toggleInterest(i)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {!editingInterests ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map(i => {
                    const selected = selectedInterests.includes(i);
                    const disabled = !selected && selectedInterests.length >= 3;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleInterest(i)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                          selected
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : disabled
                              ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-amber-500/50 hover:text-white'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 space-y-2">
                  {interests.map((interest, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="text-white text-sm">{interest}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = interests.filter((_, i) => i !== idx);
                          setInterests(updated);
                          if (selectedInterests.includes(interest)) toggleInterest(interest);
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1 border-t border-slate-600">
                    <Input
                      value={newInterest}
                      onChange={e => setNewInterest(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newInterest.trim()) {
                          setInterests(prev => [...prev, newInterest.trim()]);
                          setNewInterest('');
                        }
                      }}
                      placeholder="Add new interest..."
                      className="bg-slate-600 border-slate-500 text-white h-8 text-sm"
                    />
                    <Button
                      type="button" size="sm"
                      onClick={() => {
                        if (newInterest.trim()) {
                          setInterests(prev => [...prev, newInterest.trim()]);
                          setNewInterest('');
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-600 h-8 px-3"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Distance (km)</Label>
                <Input type="number" value={form.distance_km} onChange={e => set('distance_km', e.target.value)}
                  placeholder="e.g. 12.5" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Duration (hours)</Label>
                <Input type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)}
                  placeholder="e.g. 5" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Elevation Gain (m)</Label>
                <Input type="number" value={form.elevation_gain_m} onChange={e => set('elevation_gain_m', e.target.value)}
                  placeholder="e.g. 450" className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </div>

            {/* GPX File — private upload */}
            <div>
              <Label className="text-slate-300 mb-1.5 block">GPX File</Label>
              {form.gpx_file_uri ? (
                <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/50 rounded-lg px-4 py-3">
                  <FileCheck className="w-5 h-5 text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-green-300 text-sm font-medium">{form.gpx_filename || 'GPX file uploaded'}</p>
                    <p className="text-green-600 text-xs">Stored securely — customers receive a temporary download link on redemption</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { set('gpx_file_uri', ''); set('gpx_filename', ''); }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 cursor-pointer bg-slate-700 border border-dashed border-slate-500 rounded-lg px-4 py-3 text-slate-400 hover:text-white hover:border-amber-500/50 transition-colors text-sm w-full ${gpxUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                  {gpxUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {gpxUploading ? 'Uploading securely…' : 'Upload GPX file (stored privately)'}
                  <input
                    type="file"
                    accept=".gpx,application/gpx+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setGpxUploading(true);
                      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
                      set('gpx_file_uri', file_uri);
                      set('gpx_filename', file.name);
                      setGpxUploading(false);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>

            <div className="border-t border-slate-700 pt-5">
              <Label className="text-slate-300 mb-3 block font-semibold">Starting Point (GPS)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Latitude *</Label>
                  <Input type="number" step="0.000001" value={form.start_lat}
                    onChange={e => set('start_lat', e.target.value)}
                    placeholder="e.g. 35.2019"
                    className="bg-slate-700 border-slate-600 text-white font-mono" />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Longitude *</Label>
                  <Input type="number" step="0.000001" value={form.start_lng}
                    onChange={e => set('start_lng', e.target.value)}
                    placeholder="e.g. 23.7619"
                    className="bg-slate-700 border-slate-600 text-white font-mono" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Tip: Right-click any location on Google Maps and click the coordinates to copy them.
              </p>
            </div>

            <SaveButton onSave={handleSave} saving={saving} />
          </div>
        )}

        {activeTab === 'trail' && (
          <div className="space-y-4">
            <TrailPathEditor
              trailPath={form.trail_path}
              onChange={path => set('trail_path', path)}
            />
            <SaveButton onSave={handleSave} saving={saving} />
          </div>
        )}

        {activeTab === 'waypoints' && (
          <div className="space-y-4">
            <WaypointEditor
              waypoints={form.waypoints}
              onChange={wps => set('waypoints', wps)}
            />
            <SaveButton onSave={handleSave} saving={saving} />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-4">
            <AdminPreviewMap walk={form} />
            <SaveButton onSave={handleSave} saving={saving} />
          </div>
        )}
      </div>
    </div>
  );
}