import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, Clock, Route, TrendingUp, MapPin, AlertTriangle, 
  Eye, Droplets, TreePine, Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WalkDetailMap from '../map/WalkDetailMap';
import DownloadButton from './DownloadButton';
import OfflineBadge from './OfflineBadge';
import { useOfflineWalks } from '../offline/useOfflineWalks';

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  challenging: 'bg-orange-100 text-orange-700',
  difficult: 'bg-red-100 text-red-700',
};

const waypointIcons = {
  start: { icon: Navigation, color: 'text-green-600', bg: 'bg-green-100' },
  end: { icon: MapPin, color: 'text-red-600', bg: 'bg-red-100' },
  turnoff: { icon: Navigation, color: 'text-amber-600', bg: 'bg-amber-100' },
  danger: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  viewpoint: { icon: Eye, color: 'text-purple-600', bg: 'bg-purple-100' },
  water: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' },
  rest_area: { icon: TreePine, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  landmark: { icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-100' },
};

export default function WalkDetail({ walk, onClose }) {
  if (!walk) return null;

  const waypoints = walk.waypoints || [];
  const { isDownloaded } = useOfflineWalks();
  const downloaded = isDownloaded(walk.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="h-full flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">
                {walk.code}
              </span>
              <h2 className="text-xl font-bold mt-2">{walk.name}</h2>
              {walk.region && (
                <p className="text-blue-100 text-sm mt-1">{walk.region}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 -mt-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Stats bar */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            {walk.difficulty && (
              <Badge className={`${difficultyColors[walk.difficulty]} border-0`}>
                {walk.difficulty}
              </Badge>
            )}
            {walk.distance_km && (
              <div className="flex items-center gap-1.5">
                <Route className="w-4 h-4" />
                <span>{walk.distance_km} km</span>
              </div>
            )}
            {walk.duration_hours && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{walk.duration_hours}h</span>
              </div>
            )}
            {walk.elevation_gain_m && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>{walk.elevation_gain_m}m</span>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Map */}
            <div className="h-64 rounded-xl overflow-hidden border">
              <WalkDetailMap walk={walk} />
            </div>

            {/* Description */}
            {walk.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About this walk</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{walk.description}</p>
              </div>
            )}

            {/* Waypoints */}
            {waypoints.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Key Points</h3>
                <div className="space-y-2">
                  {waypoints.map((waypoint, index) => {
                    const config = waypointIcons[waypoint.type] || waypointIcons.landmark;
                    const Icon = config.icon;
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          waypoint.type === 'danger' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{waypoint.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {waypoint.type?.replace('_', ' ')}
                            </Badge>
                          </div>
                          {waypoint.description && (
                            <p className="text-sm text-gray-600 mt-1">{waypoint.description}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}