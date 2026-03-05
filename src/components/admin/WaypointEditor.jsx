import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp, Info, ImagePlus, Loader2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const WAYPOINT_TYPES = [
  { value: 'start', label: '🚩 Start Point', color: 'text-green-400' },
  { value: 'end', label: '🏁 End Point', color: 'text-red-400' },
  { value: 'turnoff', label: '↪️ Turnoff / Junction', color: 'text-amber-400' },
  { value: 'danger', label: '⚠️ Danger Spot', color: 'text-red-400' },
  { value: 'viewpoint', label: '👁️ Viewpoint', color: 'text-purple-400' },
  { value: 'water', label: '💧 Water Source', color: 'text-blue-400' },
  { value: 'rest_area', label: '🪑 Rest Area', color: 'text-emerald-400' },
  { value: 'landmark', label: '📍 Landmark', color: 'text-indigo-400' },
];

const EMPTY_WAYPOINT = { lat: '', lng: '', type: 'landmark', name: '', description: '', image_url: '' };

export default function WaypointEditor({ waypoints, onChange }) {
  const [expanded, setExpanded] = useState(null);
  const [newWp, setNewWp] = useState(EMPTY_WAYPOINT);
  const [showAddForm, setShowAddForm] = useState(true);

  const addWaypoint = () => {
    const lat = parseFloat(newWp.lat);
    const lng = parseFloat(newWp.lng);
    if (isNaN(lat) || isNaN(lng) || !newWp.name.trim()) {
      alert('Please fill in Latitude, Longitude, and Name before adding.');
      return;
    }
    if (lat < 34 || lat > 36 || lng < 23 || lng > 27) {
      alert('Coordinates appear to be outside Crete. Please check your values.');
      return;
    }
    const updated = [...waypoints, { ...newWp, lat, lng }];
    onChange(updated);
    setNewWp(EMPTY_WAYPOINT);
    setShowAddForm(false);
    setExpanded(null);
  };

  const removeWaypoint = (index) => {
    onChange(waypoints.filter((_, i) => i !== index));
    if (expanded === index) setExpanded(null);
  };

  const updateWaypoint = (index, field, value) => {
    const updated = waypoints.map((wp, i) => i === index ? { ...wp, [field]: value } : wp);
    onChange(updated);
  };

  const moveWaypoint = (index, direction) => {
    const updated = [...waypoints];
    const target = index + direction;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
    setExpanded(target);
  };

  const [uploadingIndex, setUploadingIndex] = useState(null); // null = new form, number = existing index

  const handleImageUpload = async (file, index) => {
    setUploadingIndex(index ?? 'new');
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (index === undefined) {
      setNewWp(p => ({ ...p, image_url: file_url }));
    } else {
      updateWaypoint(index, 'image_url', file_url);
    }
    setUploadingIndex(null);
  };

  const handlePaste = (e, field) => {
    if (field !== 'lat') return;
    const text = e.clipboardData.getData('text');
    const match = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) {
      e.preventDefault();
      setNewWp(prev => ({ ...prev, lat: match[1], lng: match[2] }));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold mb-1">Key Points Along the Trail</h3>
        <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Add important places: turnoffs, danger spots, viewpoints, water sources etc.
            Each point appears as a labelled marker on the walk's detail map.
          </span>
        </div>
      </div>

      {/* Add new waypoint form */}
      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 space-y-4">
        <Label className="text-slate-300 text-sm block font-medium">Add Key Point</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">Latitude *</Label>
            <Input
              type="number" step="0.000001"
              value={newWp.lat}
              onChange={e => setNewWp(p => ({ ...p, lat: e.target.value }))}
              onPaste={e => handlePaste(e, 'lat')}
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
            <Label className="text-slate-400 text-xs mb-1 block">Type *</Label>
            <Select value={newWp.type} onValueChange={v => setNewWp(p => ({ ...p, type: v }))}>
              <SelectTrigger className="bg-slate-700 border-slate-500 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAYPOINT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">Name *</Label>
            <Input
              value={newWp.name}
              onChange={e => setNewWp(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Rocky descent"
              className="bg-slate-700 border-slate-500 text-white"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Description</Label>
          <Textarea
            value={newWp.description}
            onChange={e => setNewWp(p => ({ ...p, description: e.target.value }))}
            placeholder="What should the walker know about this point?"
            rows={2}
            className="bg-slate-700 border-slate-500 text-white resize-none"
          />
        </div>

        {/* Image upload for new waypoint */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Photo (optional)</Label>
          {newWp.image_url ? (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-600">
              <img src={newWp.image_url} alt="waypoint" className="w-full h-full object-cover" />
              <button
                onClick={() => setNewWp(p => ({ ...p, image_url: '' }))}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer bg-slate-700 border border-dashed border-slate-500 rounded-lg px-3 py-2 text-slate-400 hover:text-white hover:border-slate-400 transition-colors text-sm w-full">
              {uploadingIndex === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploadingIndex === 'new' ? 'Uploading…' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} disabled={uploadingIndex !== null} />
            </label>
          )}
        </div>

        <Button onClick={addWaypoint} className="bg-amber-500 hover:bg-amber-600 gap-2 w-full">
          <Plus className="w-4 h-4" /> Add Key Point
        </Button>
      </div>

      {/* Existing waypoints */}
      {waypoints.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-600 rounded-lg">
          No key points yet. Add important places above.
        </div>
      ) : (
        <div className="space-y-2">
          {waypoints.map((wp, index) => {
            const typeInfo = WAYPOINT_TYPES.find(t => t.value === wp.type);
            return (
              <div key={index} className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-700/80"
                  onClick={() => setExpanded(expanded === index ? null : index)}
                >
                  {/* Order controls */}
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
                  <span className="text-xs text-slate-600 font-mono w-5 text-center">{index + 1}</span>
                  <span className="text-sm">{typeInfo?.label.split(' ')[0]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium">{wp.name}</span>
                    <span className={`ml-2 text-xs ${typeInfo?.color}`}>
                      {typeInfo?.label.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
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
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Name</Label>
                      <Input
                        value={wp.name}
                        onChange={e => updateWaypoint(index, 'name', e.target.value)}
                        className="bg-slate-700 border-slate-500 text-white h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Description</Label>
                      <Textarea
                        value={wp.description}
                        onChange={e => updateWaypoint(index, 'description', e.target.value)}
                        rows={2}
                        className="bg-slate-700 border-slate-500 text-white resize-none text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Type</Label>
                      <Select value={wp.type} onValueChange={v => updateWaypoint(index, 'type', v)}>
                        <SelectTrigger className="bg-slate-700 border-slate-500 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WAYPOINT_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs mb-1 block">Photo</Label>
                      {wp.image_url ? (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-600">
                          <img src={wp.image_url} alt="waypoint" className="w-full h-full object-cover" />
                          <button
                            onClick={() => updateWaypoint(index, 'image_url', '')}
                            className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-700 border border-dashed border-slate-500 rounded-lg px-3 py-2 text-slate-400 hover:text-white hover:border-slate-400 transition-colors text-sm w-full">
                          {uploadingIndex === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                          {uploadingIndex === index ? 'Uploading…' : 'Upload photo'}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0], index)} disabled={uploadingIndex !== null} />
                        </label>
                      )}
                    </div>
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