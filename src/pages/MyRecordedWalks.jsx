import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Footprints, Lock, Star, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { hasTier, TIER_LABELS, TIER_COLORS } from '@/lib/membership';
import MembershipCodeEntry from '@/components/membership/MembershipCodeEntry';
import WalkRecorder from '@/components/recorded/WalkRecorder';
import RecordedWalkCard from '@/components/recorded/RecordedWalkCard';

export default function MyRecordedWalks() {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      const u = await base44.auth.me();
      setUser(u);
      const appUsers = await base44.entities.AppUser.filter({ user_id: u.id });
      setAppUser(appUsers[0] || null);
      setIsLoading(false);
    };
    init();
  }, []);

  const tier = appUser?.membership_tier || 'wanderer';
  const canRecord = hasTier(tier, 'pathfinder');

  const { data: myWalks = [] } = useQuery({
    queryKey: ['recorded-walks', user?.id],
    queryFn: () => base44.entities.RecordedWalk.filter({ owner_user_id: user.id }, '-recorded_at'),
    enabled: !!user && canRecord,
  });

  const handleTierChanged = async (newTier) => {
    // Refresh appUser
    const appUsers = await base44.entities.AppUser.filter({ user_id: user.id });
    setAppUser(appUsers[0] || null);
    queryClient.invalidateQueries({ queryKey: ['recorded-walks'] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-amber-600" />
              <h1 className="font-bold text-gray-900">My Recorded Walks</h1>
            </div>
          </div>
          {canRecord && !showRecorder && (
            <Button
              onClick={() => setShowRecorder(true)}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" /> Record Walk
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {/* ── RECORDER ── */}
          {showRecorder && canRecord && (
            <motion.div key="recorder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-[calc(100vh-120px)]">
              <WalkRecorder
                user={user}
                appUser={appUser}
                onSaved={() => {
                  setShowRecorder(false);
                  queryClient.invalidateQueries({ queryKey: ['recorded-walks'] });
                }}
                onCancel={() => setShowRecorder(false)}
              />
            </motion.div>
          )}

          {/* ── GATED: no membership code / wanderer / explorer ── */}
          {!showRecorder && !canRecord && (
            <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mt-8 bg-white rounded-2xl border shadow-sm overflow-hidden">
                {/* Hero */}
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-white text-center">
                  <Footprints className="w-14 h-14 mx-auto mb-3 opacity-90" />
                  <h2 className="text-2xl font-bold mb-2">My Recorded Walks</h2>
                  <p className="text-amber-100 text-sm max-w-xs mx-auto">
                    Record your own walks, track your distance and time, and build your personal trail library.
                  </p>
                </div>

                {/* Tier info */}
                <div className="p-6 space-y-5">
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">Pathfinder membership required</p>
                      <p className="text-amber-700 text-xs mt-1">
                        This feature is available to <strong>Pathfinder</strong> and <strong>Wayfinder</strong> members.
                        {tier !== 'wanderer' && tier !== 'explorer'
                          ? ''
                          : ` You're currently a ${TIER_LABELS[tier]}.`
                        }
                      </p>
                    </div>
                  </div>

                  {/* What you get */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What you get</p>
                    {[
                      { tier: 'pathfinder', label: 'Pathfinder', perks: ['Record walks with live GPS map', 'Track time & distance', 'Pause for breaks, resume anytime', 'Save & name your walks'] },
                      { tier: 'wayfinder', label: 'Wayfinder', perks: ['Everything in Pathfinder', 'Add photos & notes to walks', 'Share walks with other members', 'GPX file generated automatically'] },
                    ].map(({ tier: t, label, perks }) => (
                      <div key={t} className="border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className={`w-4 h-4 ${TIER_COLORS[t]}`} />
                          <span className={`font-semibold text-sm ${TIER_COLORS[t]}`}>{label}</span>
                        </div>
                        <ul className="space-y-1">
                          {perks.map(p => (
                            <li key={p} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-green-500 mt-0.5">✓</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Code entry */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Already have a membership code?</p>
                    {appUser && (
                      <MembershipCodeEntry appUser={appUser} onTierChanged={handleTierChanged} />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── WALK LIST ── */}
          {!showRecorder && canRecord && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">

              {/* Membership badge + code update */}
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${TIER_COLORS[tier]}`} />
                    <span className={`font-semibold text-sm ${TIER_COLORS[tier]}`}>{TIER_LABELS[tier]} member</span>
                  </div>
                </div>
                {appUser && (
                  <MembershipCodeEntry appUser={appUser} onTierChanged={handleTierChanged} />
                )}
              </div>

              {/* Walks */}
              {myWalks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Footprints className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-semibold text-gray-500 mb-1">No recorded walks yet</p>
                  <p className="text-sm mb-6">Tap "Record Walk" to start tracking your first walk.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myWalks.map(walk => (
                    <RecordedWalkCard key={walk.id} walk={walk} isOwner />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}