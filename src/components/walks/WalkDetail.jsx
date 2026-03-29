import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, Clock, Route, TrendingUp, MapPin, AlertTriangle, 
  Eye, Droplets, TreePine, Navigation, Crosshair, ShieldAlert, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WalkDetailMap from '../map/WalkDetailMap';
import DownloadWalkButton from '../offline/DownloadWalkButton';
import { getExtensionsForWalk, hasTier } from '@/lib/membership';

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
  kafeneon: { icon: TreePine, color: 'text-amber-600', bg: 'bg-amber-100' },
  wildlife_spot: { icon: Eye, color: 'text-green-600', bg: 'bg-green-100' },
  church: { icon: MapPin, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  ruins: { icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-100' },
  abandoned_settlement: { icon: MapPin, color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function WalkDetail({ walk, onClose, allWalks = [], userTier = 'wanderer' }) {
  const [followGps, setFollowGps] = React.useState(false);
  const [activeExtensions, setActiveExtensions] = React.useState([]);
  if (!walk) return null;

  const waypoints = walk.waypoints || [];
  const { accessible: accessibleExts, locked: lockedExts } = walk.walk_type === 'B'
    ? getExtensionsForWalk(walk, allWalks, userTier)
    : { accessible: [], locked: [] };
  const hasLockedExtensions = lockedExts.length > 0;

  const toggleExtension = (extId) => {
    setActiveExtensions(prev =>
      prev.includes(extId) ? prev.filter(id => id !== extId) : [...prev, extId]
    );
  };

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
            <div className="flex items-center gap-1 -mt-1 -mr-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFollowGps(f => !f)}
                title={followGps ? 'Stop following GPS' : 'Follow my location'}
                className={`${followGps ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/20'}`}
              >
                <Crosshair className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
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
            {/* Offline download */}
            <div className="flex items-center justify-between">
              <DownloadWalkButton walk={walk} />
              {followGps && (
                <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5" /> Tracking location
                </span>
              )}
            </div>

            {/* Extension toggles (Pathfinder/Wayfinder) */}
            {accessibleExts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {accessibleExts.map(ext => {
                  const isActive = activeExtensions.includes(ext.id);
                  const color = ext.walk_type === 'C1' ? 'amber' : 'purple';
                  return (
                    <button
                      key={ext.id}
                      onClick={() => toggleExtension(ext.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isActive
                          ? color === 'amber'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-purple-500 border-purple-500 text-white'
                          : color === 'amber'
                            ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                            : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : color === 'amber' ? 'bg-amber-400' : 'bg-purple-400'}`} />
                      {ext.walk_type} extension{ext.name ? `: ${ext.name}` : ''}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Map */}
            <div className="h-64 rounded-xl overflow-hidden border">
              <WalkDetailMap
                walk={walk}
                followGps={followGps}
                extensions={accessibleExts}
                activeExtensions={activeExtensions}
              />
            </div>

            {/* Teaser banner for locked extensions */}
            {hasLockedExtensions && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800">
                  This walk has {lockedExts.length > 1 ? `${lockedExts.length} extensions` : 'an extension'} available.{' '}
                  <a
                    href="https://magicalcrete.com/home-v2/memberships/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline hover:text-amber-900"
                  >
                    Upgrade your membership
                  </a>{' '}
                  to unlock {lockedExts.map(e => e.walk_type).join(' & ')} routes.
                </p>
              </div>
            )}

            {/* Safety Notes */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="font-bold text-red-700">Before You Set Off</h3>
              </div>
              <p className="text-red-700 text-sm leading-relaxed whitespace-pre-line">
                {walk.safety_notes ||
                  `Essential equipment: sun hat, sturdy walking shoes or boots, walking poles, and a minimum of 2 litres of water per person.\n\nMobile signal may be unreliable. Download the GPX file and load it into a navigation app before departure.\n\nUnder Greek law, the cost of any search and rescue operation is charged to the individual. Do not attempt any walk unprepared.`}
              </p>
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
                          {waypoint.image_url && (
                            <img
                              src={waypoint.image_url}
                              alt={waypoint.name}
                              className="mt-2 w-full max-w-xs h-32 object-cover rounded-lg border"
                            />
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