import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, Ticket, Mountain, MapPin, Clock, Route, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const WALK_TYPE_LABELS = { B: 'Base', C1: 'C1 Extension', C2: 'C2 Extension' };
const WALK_TYPE_COLORS = {
  B: 'bg-blue-900/40 text-blue-300 border-blue-700',
  C1: 'bg-amber-900/40 text-amber-300 border-amber-700',
  C2: 'bg-purple-900/40 text-purple-300 border-purple-700',
};
const DIFFICULTY_COLORS = {
  easy: 'bg-green-900/40 text-green-300 border-green-700',
  moderate: 'bg-amber-900/40 text-amber-300 border-amber-700',
  challenging: 'bg-orange-900/40 text-orange-300 border-orange-700',
  difficult: 'bg-red-900/40 text-red-300 border-red-700',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="bg-slate-800 border-slate-700 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </Card>
  );
}

export default function WalksDashboard({ walks }) {
  const totalWalks = walks.length;
  const teaserWalks = walks.filter(w => w.is_free_preview);
  const voucherWalks = walks.filter(w => !w.is_free_preview && w.walk_type === 'B');
  const withGpx = walks.filter(w => w.gpx_file_uri || w.gpx_url);

  // Group by region
  const byRegion = walks.reduce((acc, w) => {
    const r = w.region || 'Unknown';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Mountain} label="Total Walks" value={totalWalks} color="bg-slate-600" />
        <StatCard icon={Sparkles} label="Free Teasers" value={teaserWalks.length} color="bg-emerald-600" />
        <StatCard icon={Ticket} label="Voucher-Gated" value={voucherWalks.length} color="bg-amber-600" />
        <StatCard icon={CheckCircle2} label="GPX Ready" value={withGpx.length} color="bg-blue-600" />
      </div>

      {/* Region breakdown */}
      {Object.keys(byRegion).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">By Region</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byRegion).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
              <div key={region} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-white font-medium">{region}</span>
                <span className="text-xs text-slate-400">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Walk table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">All Walks</h3>
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Walk</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Stats</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Access</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">GPX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {walks.map(walk => (
                <tr key={walk.id} className="bg-slate-900/50 hover:bg-slate-800/60 transition-colors">
                  {/* Walk name + code */}
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-slate-400 mb-0.5">{walk.code}</div>
                    <div className="font-medium text-white truncate max-w-[180px]">{walk.name}</div>
                    {walk.region && <div className="text-xs text-slate-500 mt-0.5">{walk.region}</div>}
                  </td>

                  {/* Type + difficulty */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={`text-xs w-fit ${WALK_TYPE_COLORS[walk.walk_type] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                        {WALK_TYPE_LABELS[walk.walk_type] || walk.walk_type || '—'}
                      </Badge>
                      {walk.difficulty && (
                        <Badge variant="outline" className={`text-xs w-fit capitalize ${DIFFICULTY_COLORS[walk.difficulty] || ''}`}>
                          {walk.difficulty}
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Stats */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-1 text-xs text-slate-400">
                      {walk.distance_km && (
                        <span className="flex items-center gap-1"><Route className="w-3 h-3" />{walk.distance_km} km</span>
                      )}
                      {walk.duration_hours && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{walk.duration_hours}h</span>
                      )}
                      {walk.elevation_gain_m && (
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{walk.elevation_gain_m}m</span>
                      )}
                    </div>
                  </td>

                  {/* Access type */}
                  <td className="px-4 py-3 text-center">
                    {walk.is_free_preview ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-900/40 border border-emerald-700 px-2 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" /> Teaser
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-900/40 border border-amber-700 px-2 py-1 rounded-full">
                        <Ticket className="w-3 h-3" /> Voucher
                      </span>
                    )}
                  </td>

                  {/* GPX status */}
                  <td className="px-4 py-3 text-center">
                    {(walk.gpx_file_uri || walk.gpx_url) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400/60 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
              {walks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No walks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}