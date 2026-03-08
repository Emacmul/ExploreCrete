import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Pencil, Check, X } from 'lucide-react';
import WaypointEditor from './WaypointEditor';
import TrailPathEditor from './TrailPathEditor';
import AdminPreviewMap from './AdminPreviewMap';

const DEFAULT_INTERESTS = ['Wild Flowers', 'History', 'Mythology', 'Archaeology', 'Photography'];

const EMPTY_WALK = {
  code: '',
  name: '',
  description: '',
  difficulty: 'moderate',
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

export default function WalkEditor({ walk, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_WALK, ...walk });
  const [saving, setSaving] = useState(false);
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
          </div>
        )}

        {activeTab === 'trail' && (
          <TrailPathEditor
            trailPath={form.trail_path}
            onChange={path => set('trail_path', path)}
          />
        )}

        {activeTab === 'waypoints' && (
          <WaypointEditor
            waypoints={form.waypoints}
            onChange={wps => set('waypoints', wps)}
          />
        )}

        {activeTab === 'preview' && (
          <AdminPreviewMap walk={form} />
        )}
      </div>
    </div>
  );
}