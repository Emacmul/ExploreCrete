import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Info, Loader2, X, ArrowUp, ArrowDown,
  Upload, FileCheck, Save, Flag, Square, Circle,
} from 'lucide-react';
import { getRoleColour, getRoleLabel, buildSegmentId, WAYPOINT_ROLE_COLOURS } from '@/lib/routeExport';
import AudioTriggerFields from './AudioTriggerFields';

const ROLES = [
  { value: 'primary_start', label: 'Primary-Start', icon: Flag },
  { value: 'primary_stop', label: 'Primary-Stop', icon: Square },
  { value: 'secondary', label: 'Secondary', icon: Circle },
];

const EMPTY_WP = {
  lat: '',
  lng: '',
  waypoint_role: 'secondary',
  segment_number: '',
  segment_title: '',
  avg_segment_speed_kmh: '',
  description: '',
  narration_script: '',
  trigger_audio: false,
  audio_clip_url: '',
  trigger_radius_m: 150,
  trigger_once: true,
  use_bearing: false,
  bearing_direction: 0,
  bearing_tolerance: 30,
};

function autoColour(role) {
  return getRoleColour(role);
}

function parseGpxCoords(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const wpts = Array.from(doc.querySelectorAll('wpt'));
  return wpts.map(wpt => ({
    lat: parseFloat(wpt.getAttribute('lat')),
    lng: parseFloat(wpt.getAttribute('lon')),
    elevation: wpt.querySelector('ele') ? parseFloat(wpt.querySelector('ele').textContent) : null,
  })).filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));
}

export default function DrivingTourWaypointEditor({ waypoints, onChange, tourCode, onSave, saving }) {
  const [expanded, setExpanded] = useState(null);
  const [newWp, setNewWp] = useState(EMPTY_WP);
  const [showAddForm, setShowAddForm] = useState(true);
  const [addError, setAddError] = useState('');
  const [gpxImportResult, setGpxImportResult] = useState(null);

  const nextSegmentNumber = () => {
    const used = waypoints
      .map(wp => parseInt(wp.segment_number, 10))
      .filter(n => !isNaN(n));
    const max = used.length > 0 ? Math.max(...used) : 0;
    return String(max + 1).padStart(2, '0');
  };

  const addWaypoint = () => {
    setAddError('');
    const lat = parseFloat(String(newWp.lat).replace(',', '.'));
    const lng = parseFloat(String(newWp.lng).replace(',', '.'));

    if (isNaN(lat) || String(newWp.lat).trim() === '') {
      setAddError('Please enter a valid latitude.');
      return;
    }
    if (isNaN(lng) || String(newWp.lng).trim() === '') {
      setAddError('Please enter a valid longitude.');
      return;
    }
    if (!newWp.segment_title.trim()) {
      setAddError('Segment Title is required.');
      return;
    }
    if (newWp.waypoint_role === 'primary_start') {
      const speed = parseFloat(newWp.avg_segment_speed_kmh);
      if (isNaN(speed) || speed <= 0) {
        setAddError('Average Segment Speed is required for Primary-Start waypoints.');
        return;
      }
    }

    const segNum = newWp.segment_number || nextSegmentNumber();
    const segId = buildSegmentId(tourCode, segNum) || '';
    const role = newWp.waypoint_role;

    const wp = {
      lat,
      lng,
      waypoint_role: role,
      segment_number: segNum,
      segment_id: segId,
      segment_title: newWp.segment_title.trim(),
      avg_segment_speed_kmh: newWp.avg_segment_speed_kmh ? parseFloat(newWp.avg_segment_speed_kmh) : null,
      description: newWp.description.trim(),
      narration_script: newWp.narration_script || '',
      trigger_audio: newWp.trigger_audio || false,
      audio_clip_url: newWp.audio_clip_url || '',
      trigger_radius_m: newWp.trigger_radius_m != null ? Number(newWp.trigger_radius_m) : 150,
      trigger_once: newWp.trigger_once !== false,
      use_bearing: newWp.use_bearing || false,
      bearing_direction: Number(newWp.bearing_direction) || 0,
      bearing_tolerance: Number(newWp.bearing_tolerance) || 30,
      waypoint_colour: autoColour(role),
      name: segId ? `${segId} — ${newWp.segment_title.trim()}` : newWp.segment_title.trim(),
      type: role,
    };

    onChange([...waypoints, wp]);
    setNewWp({ ...EMPTY_WP, segment_number: nextSegmentNumber() });
    setShowAddForm(false);
    setExpanded(null);
  };

  const removeWaypoint = (index) => {
    onChange(waypoints.filter((_, i) => i !== index));
    if (expanded === index) setExpanded(null);
  };

  const updateWaypoint = (index, field, value) => {
    const updated = waypoints.map((wp, i) => {
      if (i !== index) return wp;
      const next = { ...wp, [field]: value };
      // Recompute derived fields when relevant inputs change
      if (field === 'waypoint_role') {
        next.waypoint_colour = autoColour(value);
        next.type = value;
      }
      if (field === 'segment_number' || field === 'waypoint_role') {
        next.segment_id = buildSegmentId(tourCode, next.segment_number) || '';
        next.name = next.segment_id
          ? `${next.segment_id} — ${next.segment_title || ''}`.trim()
          : (next.segment_title || next.name);
      }
      if (field === 'segment_title') {
        next.name = next.segment_id
          ? `${next.segment_id} — ${value || ''}`.trim()
          : value;
      }
      return next;
    });
    onChange(updated);
  };

  const moveWaypoint = (index, direction) => {
    const updated = [...waypoints];
    const target = index + direction;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text');
    const match = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) {
      e.preventDefault();
      setNewWp(prev => ({ ...prev, lat: match[1], lng: match[2] }));
    }
  };

  const handleGpxImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseGpxCoords(ev.target.result);
      if (parsed.length === 0) {
        setGpxImportResult({ error: 'No waypoints found in this GPX file.' });
        return;
      }
      const imported = parsed.map((pt, i) => {
        const segNum = String(waypoints.length + i + 1).padStart(2, '0').slice(-2);
        const segId = buildSegmentId(tourCode, segNum) || '';
        return {
          lat: pt.lat,
          lng: pt.lng,
          elevation: pt.elevation,
          waypoint_role: i === 0 ? 'primary_start' : 'secondary',
          segment_number: segNum,
          segment_id: segId,
          segment_title: `Segment ${segNum}`,
          avg_segment_speed_kmh: null,
          description: '',
          narration_script: '',
          trigger_audio: false,
          audio_clip_url: '',
          trigger_radius_m: 150,
          trigger_once: true,
          use_bearing: false,
          bearing_direction: 0,
          bearing_tolerance: 30,
          waypoint_colour: autoColour(i === 0 ? 'primary_start' : 'secondary'),
          name: segId ? `${segId} — Segment ${segNum}` : `Segment ${segNum}`,
          type: i === 0 ? 'primary_start' : 'secondary',
        };
      });
      onChange([...waypoints, ...imported]);
      setGpxImportResult({ count: imported.length });
      setTimeout(() => setGpxImportResult(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold mb-1">Tour Waypoints</h3>
        <div className="flex items-start gap-2 bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 text-sm text-purple-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Define Primary-Start, Primary-Stop and Secondary points. Segment IDs are built
            from the Tour Code ({tourCode || '—'}) + a 2-digit number. Marker colours are
            assigned automatically.
          </span>
        </div>
      </div>

      {/* GPX Import */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer bg-blue-700/30 hover:bg-blue-700/50 border border-blue-600/50 rounded-lg px-4 py-2 text-blue-300 hover:text-blue-100 transition-colors text-sm font-medium">
          <Upload className="w-4 h-4" />
          Import GPX Waypoints
          <input type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={handleGpxImport} />
        </label>
        {gpxImportResult && (
          gpxImportResult.error
            ? <span className="text-red-400 text-sm">{gpxImportResult.error}</span>
            : <span className="flex items-center gap-1 text-green-400 text-sm"><FileCheck className="w-4 h-4" /> {gpxImportResult.count} waypoint{gpxImportResult.count !== 1 ? 's' : ''} imported</span>
        )}
      </div>

      {/* Add new waypoint form */}
      <div className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAddForm(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" />
            Add New Waypoint
          </span>
          {showAddForm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAddForm && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-600 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs mb-1 block">Latitude *</Label>
                <Input
                  type="number" step="0.000001"
                  value={newWp.lat}
                  onChange={e => setNewWp(p => ({ ...p, lat: e.target.value }))}
                  onPaste={handlePaste}
                  placeholder="35.301900"
                  className="bg-slate-700 border-slate-500 text-white font-mono"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1 block">Longitude *</Label>
                <Input
                  type="number" step="0.000001"
                  value={newWp.lng}
                  onChange={e => setNewWp(p => ({ ...p, lng: e.target.value }))}
                  placeholder="23.963300"
                  className="bg-slate-700 border-slate-500 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs mb-1 block">Waypoint Role *</Label>
                <Select value={newWp.waypoint_role} onValueChange={v => setNewWp(p => ({ ...p, waypoint_role: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1 block">Segment Number (01–99)</Label>
                <Input
                  type="number" min="1" max="99"
                  value={newWp.segment_number}
                  onChange={e => setNewWp(p => ({ ...p, segment_number: e.target.value }))}
                  placeholder={nextSegmentNumber()}
                  className="bg-slate-700 border-slate-500 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-400 text-xs mb-1 block">Segment Title *</Label>
              <Input
                value={newWp.segment_title}
                onChange={e => setNewWp(p => ({ ...p, segment_title: e.target.value }))}
                placeholder="e.g. Leaving Chania Old Town"
                className="bg-slate-700 border-slate-500 text-white"
              />
            </div>

            {newWp.waypoint_role === 'primary_start' && (
              <div>
                <Label className="text-slate-400 text-xs mb-1 block">
                  Average Segment Speed (km/h) *
                  <span className="ml-1 text-purple-400">Required for Primary-Start</span>
                </Label>
                <Input
                  type="number" step="0.1"
                  value={newWp.avg_segment_speed_kmh}
                  onChange={e => setNewWp(p => ({ ...p, avg_segment_speed_kmh: e.target.value }))}
                  placeholder="e.g. 45"
                  className="bg-slate-700 border-slate-500 text-white"
                />
              </div>
            )}

            <div>
              <Label className="text-slate-400 text-xs mb-1 block">Description (optional)</Label>
              <Input
                value={newWp.description}
                onChange={e => setNewWp(p => ({ ...p, description: e.target.value }))}
                placeholder="Notes for this waypoint"
                className="bg-slate-700 border-slate-500 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-400 text-xs mb-1 block">
                Narration Script
                <span className="ml-1 text-blue-400">(SSML break tags supported)</span>
              </Label>
              <Textarea
                value={newWp.narration_script}
                onChange={e => setNewWp(p => ({ ...p, narration_script: e.target.value }))}
                placeholder={'Write the narration script for this location...\n\nSSML pauses: <break time="2s"/> or <break strength="medium"/>'}
                rows={5}
                className="bg-slate-700 border-slate-500 text-white text-sm font-mono resize-y"
              />
            </div>

            {/* GPS Audio Trigger fields */}
            <AudioTriggerFields
              wp={newWp}
              onChange={(field, value) => setNewWp(p => ({ ...p, [field]: value }))}
            />

            {/* Auto-generated Segment ID preview */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Segment ID:</span>
              <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-300 font-mono">
                {buildSegmentId(tourCode, newWp.segment_number || nextSegmentNumber()) || '—'}
              </code>
              <span className="ml-2">Colour:</span>
              <span
                className="inline-block w-4 h-4 rounded-full border border-slate-500"
                style={{ backgroundColor: autoColour(newWp.waypoint_role) }}
              />
              <span className="text-slate-500">auto-assigned</span>
            </div>

            {addError && (
              <div className="text-red-400 text-sm bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
                {addError}
              </div>
            )}
            <Button onClick={addWaypoint} className="bg-purple-600 hover:bg-purple-700 gap-2 w-full text-white font-semibold">
              <Plus className="w-4 h-4" /> Save Waypoint
            </Button>
          </div>
        )}
      </div>

      {/* Existing waypoints */}
      {waypoints.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-600 rounded-lg">
          No waypoints yet. Add tour points above.
        </div>
      ) : (
        <div className="space-y-2">
          {waypoints.map((wp, index) => {
            const roleInfo = ROLES.find(r => r.value === wp.waypoint_role) || ROLES[2];
            const colour = wp.waypoint_colour || autoColour(wp.waypoint_role);
            return (
              <div key={index} className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-700/80"
                  onClick={() => setExpanded(expanded === index ? null : index)}
                >
                  <div className="flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => moveWaypoint(index, -1)}
                      disabled={index === 0}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveWaypoint(index, 1)}
                      disabled={index === waypoints.length - 1}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-400"
                    style={{ backgroundColor: colour }}
                    title={getRoleLabel(wp.waypoint_role)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium">{wp.segment_id || '—'}</span>
                    <span className="ml-2 text-xs text-slate-400">{wp.segment_title}</span>
                    {wp.avg_segment_speed_kmh != null && (
                      <span className="ml-2 text-xs text-slate-500">{wp.avg_segment_speed_kmh} km/h</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{getRoleLabel(wp.waypoint_role)}</span>
                  {expanded === index ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <Button
                    variant="ghost" size="icon"
                    onClick={e => { e.stopPropagation(); removeWaypoint(index); }}
                    className="text-slate-500 hover:text-red-400 w-7 h-7"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {expanded === index && (
                  <div className="px-4 pb-4 border-t border-slate-600 pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs mb-1 block">Latitude</Label>
                        <Input
                          type="number" step="0.000001"
                          value={wp.lat}
                          onChange={e => updateWaypoint(index, 'lat', parseFloat(e.target.value))}
                          className="bg-slate-700 border-slate-500 text-white font-mono h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs mb-1 block">Longitude</Label>
                        <Input
                          type="number" step="0.000001"
                          value={wp.lng}
                          onChange={e => updateWaypoint(index, 'lng', parseFloat(e.target.value))}
                          className="bg-slate-700 border-slate-500 text-white font-mono h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs mb-1 block">Waypoint Role</Label>
                        <Select value={wp.waypoint_role} onValueChange={v => updateWaypoint(index, 'waypoint_role', v)}>
                          <SelectTrigger className="bg-slate-700 border-slate-500 text-white h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs mb-1 block">Segment Number</Label>
                        <Input
                          type="number" min="1" max="99"
                          value={wp.segment_number || ''}
                          onChange={e => updateWaypoint(index, 'segment_number', e.target.value)}
                          className="bg-slate-700 border-slate-500 text-white font-mono h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Segment ID (auto)</Label>
                      <Input
                        value={wp.segment_id || ''}
                        readOnly
                        className="bg-slate-800 border-slate-600 text-purple-300 font-mono h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Segment Title</Label>
                      <Input
                        value={wp.segment_title || ''}
                        onChange={e => updateWaypoint(index, 'segment_title', e.target.value)}
                        className="bg-slate-700 border-slate-500 text-white h-8 text-sm"
                      />
                    </div>
                    {wp.waypoint_role === 'primary_start' && (
                      <div>
                        <Label className="text-slate-400 text-xs mb-1 block">Average Segment Speed (km/h) *</Label>
                        <Input
                          type="number" step="0.1"
                          value={wp.avg_segment_speed_kmh ?? ''}
                          onChange={e => updateWaypoint(index, 'avg_segment_speed_kmh', e.target.value === '' ? null : parseFloat(e.target.value))}
                          className="bg-slate-700 border-slate-500 text-white h-8 text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Description</Label>
                      <Input
                        value={wp.description || ''}
                        onChange={e => updateWaypoint(index, 'description', e.target.value)}
                        className="bg-slate-700 border-slate-500 text-white h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">
                        Narration Script
                        <span className="ml-1 text-blue-400">(SSML break tags supported)</span>
                      </Label>
                      <Textarea
                        value={wp.narration_script || ''}
                        onChange={e => updateWaypoint(index, 'narration_script', e.target.value)}
                        placeholder={'Write the narration script for this location...\n\nSSML pauses: <break time="2s"/> or <break strength="medium"/>'}
                        rows={5}
                        className="bg-slate-700 border-slate-500 text-white text-sm font-mono resize-y"
                      />
                    </div>
                    <AudioTriggerFields
                      wp={wp}
                      onChange={(field, value) => updateWaypoint(index, field, value)}
                    />
                    {onSave && (
                      <div className="pt-2 border-t border-slate-600">
                        <Button
                          onClick={onSave}
                          disabled={saving}
                          className="w-full bg-amber-500 hover:bg-amber-600 gap-2"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Route
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}