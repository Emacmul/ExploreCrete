import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, CheckCircle2, XCircle, Download } from 'lucide-react';

export default function RedeemCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // { walk_name, gpx_url }
  const [downloading, setDownloading] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const results = await base44.entities.VoucherCode.filter({ code: trimmed, used: false });

    if (!results || results.length === 0) {
      setError('Invalid or already-used code. Please check and try again.');
      setLoading(false);
      return;
    }

    const voucher = results[0];
    const user = await base44.auth.me();

    await base44.entities.VoucherCode.update(voucher.id, {
      used: true,
      used_by: user?.email || 'unknown',
      used_at: new Date().toISOString(),
    });

    setLoading(false);
    setSuccess({ walk_name: voucher.walk_name, gpx_url: voucher.gpx_url });
    setCode('');

    // Auto-trigger download
    triggerDownload(voucher.gpx_url, voucher.walk_name);
  };

  const triggerDownload = async (gpx_url, walk_name) => {
    if (!gpx_url) return;
    setDownloading(true);
    const response = await fetch(gpx_url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${walk_name || 'walk'}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-xl">
          <Ticket className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Redeem Your Walk Code</h3>
          <p className="text-xs text-gray-500">Enter the code you received to download your GPX file</p>
        </div>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircle2 className="w-5 h-5" />
            Code redeemed — {success.walk_name}!
          </div>
          <p className="text-green-600 text-sm mb-3">Your GPX file download has started automatically.</p>
          {success.gpx_url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerDownload(success.gpx_url, success.walk_name)}
              disabled={downloading}
              className="gap-2 border-green-300 text-green-700 hover:bg-green-100"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download again
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="Enter your code (e.g. WALK-A1B2-C3D4)"
              className="font-mono text-sm"
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
            />
            <Button
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Redeem
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}