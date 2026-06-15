/**
 * Simplified walk access utilities for Magical Crete
 *
 * New model:
 *
 * - Everyone sees all approved walks.
 * - Sample walks are free for everyone.
 * - Community walks are free for everyone.
 * - Official walks may be:
 *      - Included for members
 *      - Purchased individually by non-members
 *
 * Access checking for purchases/downloads is handled elsewhere.
 */

/**
 * Return all approved walks.
 */
export function getAccessibleWalks(walks) {
  return walks.filter(w => w.approved !== false);
}

/**
 * Community walk?
 */
export function isCommunityWalk(walk) {
  return walk.walk_category === 'community';
}

/**
 * Official Magical Crete walk?
 */
export function isOfficialWalk(walk) {
  return walk.walk_category === 'official';
}

/**
 * Free sample walk?
 */
export function isSampleWalk(walk) {
  return walk.is_sample_walk === true;
}

/**
 * Included in membership programme?
 */
export function isMemberIncludedWalk(walk) {
  return walk.is_member_included === true;
}

/**
 * Walk requires admin approval?
 */
export function requiresReview(walk) {
  return walk.requires_review === true;
}

/**
 * Walk approved and visible?
 */
export function isApproved(walk) {
  return walk.approved !== false;
}