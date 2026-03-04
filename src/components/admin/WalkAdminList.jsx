import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Mountain, Loader2 } from 'lucide-react';

const difficultyColors = {
  easy: 'bg-green-900 text-green-300',
  moderate: 'bg-amber-900 text-amber-300',
  challenging: 'bg-orange-900 text-orange-300',
  difficult: 'bg-red-900 text-red-300',
};

export default function WalkAdminList({ walks, isLoading, onNew, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const handleDelete = (walk) => {
    if (confirmDelete === walk.id) {
      onDelete(walk.id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(walk.id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 mt-2">
        <div>
          <h2 className="text-xl font-bold text-white">Walks</h2>
          <p className="text-slate-400 text-sm">{walks.length} walks in database</p>
        </div>
        <Button onClick={onNew} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Plus className="w-4 h-4" /> Add New Walk
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : walks.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Mountain className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No walks yet</p>
          <p className="text-sm">Click "Add New Walk" to create the first trail</p>
        </div>
      ) : (
        <div className="space-y-3">
          {walks.map(walk => (
            <div key={walk.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-sm bg-slate-700 text-amber-300 px-3 py-1 rounded font-bold shrink-0">
                  {walk.code}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{walk.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {walk.region && <span className="text-xs text-slate-400">{walk.region}</span>}
                    {walk.difficulty && (
                      <Badge className={`text-xs ${difficultyColors[walk.difficulty]}`}>
                        {walk.difficulty}
                      </Badge>
                    )}
                    {walk.distance_km && <span className="text-xs text-slate-500">{walk.distance_km} km</span>}
                    <span className="text-xs text-slate-600">
                      {(walk.waypoints || []).length} waypoints · {(walk.trail_path || []).length} path pts
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(walk)}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(walk)}
                  className={confirmDelete === walk.id
                    ? 'text-white bg-red-600 hover:bg-red-700'
                    : 'text-slate-400 hover:text-red-400 hover:bg-slate-700'}
                >
                  {confirmDelete === walk.id ? 'Confirm?' : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}