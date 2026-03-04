import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Mountain } from 'lucide-react';
import WalkCard from './WalkCard';
import OfflineWalksBanner from '../offline/OfflineWalksBanner';

export default function WalkList({ walks, selectedWalk, onWalkSelect, searchQuery, onSearchChange, isOnline }) {
  const filteredWalks = walks.filter(walk => 
    walk.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    walk.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    walk.region?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-amber-500 rounded-lg">
            <Mountain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">Crete Walks</h2>
            <p className="text-xs text-slate-400">{walks.length} trails available</p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search walks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:bg-slate-700"
          />
        </div>
      </div>

      {/* Walk list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredWalks.length > 0 ? (
            filteredWalks.map(walk => (
              <WalkCard
                key={walk.id}
                walk={walk}
                isSelected={selectedWalk?.id === walk.id}
                onClick={() => onWalkSelect(walk)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Mountain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No walks found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}