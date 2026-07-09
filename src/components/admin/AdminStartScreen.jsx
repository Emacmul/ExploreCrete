import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Footprints, MapPin, Car, ChevronRight, ShieldCheck, Mic,
  LayoutDashboard, List, Users, Plus, AlertCircle,
} from 'lucide-react';
import { TOUR_CATEGORIES, getTourCategory } from '@/lib/tourCategories';

const CATEGORY_ICONS = { Footprints, MapPin, Car };

/**
 * Determine if a tour has waypoints that still need narration scripts.
 */
function needsNarration(walk) {
  if (walk.route_type !== 'driving_audio_tour') return false;
  const wps = walk.waypoints || [];
  if (wps.length === 0) return false;
  return wps.some(wp => !wp.narration_script);
}

/**
 * Determine if a tour is unfinished (admin view).
 */
function isTourUnfinished(walk) {
  const wps = walk.waypoints || [];
  if (wps.length === 0) return true;
  return wps.some(wp =>
    !wp.narration_script ||
    (wp.trigger_audio && !wp.audio_clip_url)
  );
}

function TourRow({ walk, onContinue }) {
  const cat = getTourCategory(walk.tour_category);
  const missingNarration = (walk.waypoints || []).filter(wp => !wp.narration_script).length;
  const missingAudio = (walk.waypoints || []).filter(wp => wp.trigger_audio && !wp.audio_clip_url).length;

  return (
    <button
      onClick={() => onContinue(walk)}
      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-slate-700/60 transition-colors text-left group"
    >
      <span className="font-mono text-xs bg-slate-700 text-amber-300 px-2 py-1 rounded font-bold shrink-0">
        {walk.code}
      </span>
      <span className="font-mono text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded font-bold shrink-0">
        {walk.tour_category || 'WHT'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{walk.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {missingNarration > 0 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {missingNarration} script{missingNarration !== 1 ? 's' : ''} missing
            </span>
          )}
          {missingAudio > 0 && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {missingAudio} audio missing
            </span>
          )}
          {missingNarration === 0 && missingAudio === 0 && (
            <span className="text-xs text-green-400">Complete</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
    </button>
  );
}

export default function AdminStartScreen({ userRole, walks, onNewTour, onContinueTour, onManageUsers, onDashboard, onManageWalks }) {
  const isNarrator = userRole === 'narrator';
  const unfinishedWalks = walks
    .filter(isNarrator ? needsNarration : isTourUnfinished)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* New Tour section - admin only */}
      {!isNarrator && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">New Tour</h2>
          <div className="space-y-2">
            {TOUR_CATEGORIES.map((cat, index) => {
              const Icon = CATEGORY_ICONS[cat.icon] || MapPin;
              const colourMap = {
                emerald: 'from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800',
                amber: 'from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800',
                blue: 'from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800',
              };
              return (
                <motion.button
                  key={cat.code}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onNewTour(cat.code)}
                  className={`w-full bg-gradient-to-r ${colourMap[cat.color]} text-white rounded-xl p-4 shadow-lg flex items-center gap-3 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] text-left`}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-white/25 px-1.5 py-0.5 rounded font-bold">{cat.code}</span>
                      <span className="font-bold">{cat.label}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-0.5">{cat.description}</p>
                  </div>
                  <Plus className="w-5 h-5 opacity-70 shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue Working section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">
          {isNarrator ? 'Tours Needing Narration' : 'Continue Working'}
        </h2>
        {unfinishedWalks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">{isNarrator ? 'No tours need narration right now' : 'No unfinished tours'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unfinishedWalks.map(walk => (
              <TourRow key={walk.id} walk={walk} onContinue={onContinueTour} />
            ))}
          </div>
        )}
      </div>

      {/* Admin tools - admin only */}
      {!isNarrator && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Admin Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" onClick={onDashboard} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 gap-2 h-auto py-3 justify-start">
              <LayoutDashboard className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <p className="font-medium">Dashboard</p>
                <p className="text-xs text-slate-400">Overview & stats</p>
              </div>
            </Button>
            <Button variant="outline" onClick={onManageWalks} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 gap-2 h-auto py-3 justify-start">
              <List className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <p className="font-medium">Manage Tours</p>
                <p className="text-xs text-slate-400">All tours</p>
              </div>
            </Button>
            <Button variant="outline" onClick={onManageUsers} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 gap-2 h-auto py-3 justify-start">
              <Users className="w-5 h-5 text-purple-400" />
              <div className="text-left">
                <p className="font-medium">Manage Users</p>
                <p className="text-xs text-slate-400">Narrators & admins</p>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}