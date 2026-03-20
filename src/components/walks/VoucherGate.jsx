import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function VoucherGate({ walk, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    // Find matching, unused code for this walk
    const results = await base44.entities.VoucherCode.filter({
      walk_id: walk.id,
      code: trimmed,
      used: false,
    });

    if (!results || results.length === 0) {
      setError('Invalid or already-used voucher code. Please check and try again.');
      setLoading(false);
      return;
    }

    const voucher = results[0];
    const user = await base44.auth.me();

    // Mark as used
    await base44.entities.VoucherCode.update(voucher.id, {
      used: true,
      used_by: user?.email || 'unknown',
      used_at: new Date().toISOString(),
    });

    setLoading(false);
    onSuccess();
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
          <Ticket className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-amber-900 text-sm">Voucher Required</p>
          <p className="text-xs text-amber-700">Enter your voucher code to unlock this walk for offline download.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
          placeholder="CW-XXXX-XXXX-XXXX"
          className="font-mono text-sm bg-white border-amber-300 focus:border-amber-500"
          onKeyDown={e => e.key === 'Enter' && handleRedeem()}
        />
        <Button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-1"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Unlock
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {onCancel && (
        <button type="button" onClick={onCancel} className="text-xs text-amber-600 hover:underline self-start">
          Cancel
        </button>
      )}
    </div>
  );
}