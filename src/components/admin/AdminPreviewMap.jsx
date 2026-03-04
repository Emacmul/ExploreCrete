import React from 'react';
import WalkDetailMap from '../map/WalkDetailMap';
import { MapPin } from 'lucide-react';

export default function AdminPreviewMap({ walk }) {
  const hasStart = walk.start_lat && walk.start_lng && 
    !isNaN(Number(walk.start_lat)) && !isNaN(Number(walk.start_lng));

  const previewWalk = {
    ...walk,
    start_lat: Number(walk.start_lat),
    start_lng: Number(walk.start_lng),
    trail_path: walk.trail_path || [],
    waypoints: walk.waypoints || [],
  };

  if (!hasStart) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-slate-500 border border-dashed border-slate-600 rounded-xl">
        <MapPin className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">No GPS coordinates yet</p>
        <p className="text-sm">Add a starting point in "Basic Details" to preview the map</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold mb-1">Map Preview</h3>
        <p className="text-slate-400 text-sm">This is how the walk will appear to users.</p>
      </div>
      <div className="h-96 rounded-xl overflow-hidden border border-slate-600">
        <WalkDetailMap walk={previewWalk} />
      </div>
      <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 text-sm text-slate-400">
        <span className="text-slate-300 font-medium">Trail points: </span>{(walk.trail_path || []).length} · 
        <span className="text-slate-300 font-medium"> Key points: </span>{(walk.waypoints || []).length}
      </div>
    </div>
  );
}