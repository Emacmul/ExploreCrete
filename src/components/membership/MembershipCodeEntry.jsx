import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TIER_LABELS, TIER_COLORS, TIER_BG } from '@/lib/membership';
import { CheckCircle2, AlertCircle, Loader2, Star } from 'lucide-react';

/**
 * Inline membership code entry form.
 * onTierChanged(tier) is called after a successful save.
 */
export default function MembershipCodeEntry({ appUser, onTierChanged }) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentTier = appUser?.membership_tier;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const res = await base44.functions.invoke('verifyMembershipKey', { membershipKey: code.trim() });
    const { valid, tier } = res.data;
    if (!valid || !tier) {
      setError('Code not recognised or invalid. Please check it and try again.');
      setSaving(false);
      return;
    }
    await base44.entities.AppUser.update(appUser.id, {
      membership_code: code.trim().toUpperCase(),
      membership_tier: tier,
    });
    setSuccess(`Membership updated to ${TIER_LABELS[tier]}!`);
    setCode('');
    setSaving(false);
    onTierChanged?.(tier);
  };

  return (
    <div className="space-y-3">
      {currentTier && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${TIER_BG[currentTier]}`}>
          <Star className={`w-4 h-4 ${TIER_COLORS[currentTier]}`} />
          <span className={`text-sm font-semibold ${TIER_COLORS[currentTier]}`}>
            Current: {TIER_LABELS[currentTier]}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); setSuccess(''); }}
          placeholder={currentTier ? 'Enter new membership code' : 'Enter your membership code'}
          className="font-mono uppercase text-sm"
          disabled={saving}
        />
        <Button type="submit" disabled={saving || !code.trim()} size="sm" className="shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Your code was provided when you joined Magical Crete. Entering a new code upgrades your membership instantly.
      </p>
    </div>
  );
}