/**
 * Membership tier utilities for Magical Crete
 *
 * Tiers (lowest → highest):
 *   wanderer   (T1) — WAN-
 *   explorer   (T2) — EXP-
 *   pathfinder (T3) — PATH-
 *   wayfinder  (T4) — WAY-
 */

export const TIER_ORDER = ['wanderer', 'explorer', 'pathfinder', 'wayfinder'];

export const TIER_LABELS = {
  wanderer: 'Wanderer',
  explorer: 'Explorer',
  pathfinder: 'Pathfinder',
  wayfinder: 'Wayfinder',
};

export const TIER_COLORS = {
  wanderer: 'text-slate-500',
  explorer: 'text-blue-600',
  pathfinder: 'text-amber-600',
  wayfinder: 'text-purple-600',
};

export const TIER_BG = {
  wanderer: 'bg-slate-100',
  explorer: 'bg-blue-50',
  pathfinder: 'bg-amber-50',
  wayfinder: 'bg-purple-50',
};

const PREFIX_TO_TIER = {
  'WAN-': 'wanderer',
  'EXP-': 'explorer',
  'PATH-': 'pathfinder',
  'WAY-': 'wayfinder',
};

/**
 * Parses a membership code and returns the tier, or null if invalid.
 */
export function parseMembershipCode(code) {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  for (const [prefix, tier] of Object.entries(PREFIX_TO_TIER)) {
    if (upper.startsWith(prefix)) return tier;
  }
  return null;
}

/**
 * Returns true if the user's tier meets or exceeds the required tier.
 */
export function hasTier(userTier, requiredTier) {
  const userIdx = TIER_ORDER.indexOf(userTier || 'wanderer');
  const reqIdx = TIER_ORDER.indexOf(requiredTier);
  return userIdx >= reqIdx;
}