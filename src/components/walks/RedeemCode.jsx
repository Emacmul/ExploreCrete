import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, CheckCircle2, XCircle, Download } from 'lucide-react';

export default function RedeemCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // { walk_name, walk_id, voucher_id, file_uri, filename }
  const [downloading, setDownloading] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    // 1. Check code is valid and unused
    const results = await base44.entities.VoucherCode.filter({ code: trimmed, used: false });

    if (!results || results.length === 0) {
      setError('Invalid or already-used code. Please check and try again.');
      setLoading(false);
      return;
    }

    const voucher = results[0];

    // 2. Get the walk to find the GPX file URI
    const walks = await base44.entities.Walk.filter({ id: voucher.walk_id });
    const walk = walks?.[0];

    if (!walk?.gpx_file_uri) {
      setError('GPX file not yet available for this walk. Please contact support.');
      setLoading(false);
      return;
    }

    // 3. Mark code as used
    const user = await base44.auth.me();
    await base44.entities.VoucherCode.update(voucher.id, {
      used: true,
      used_by: user?.email || 'unknown',
      used_at: new Date().toISOString(),
    });

    setLoading(false);
    const successData = {
      walk_name: voucher.walk_name || walk.name,
      file_uri: walk.gpx_file_uri,
      filename: walk.gpx_filename || `${walk.name}.gpx`,
    };
    setSuccess(successData);
    setCode('');

    // 4. Auto-trigger download with signed URL
    triggerDownload(successData.file_uri, successData.filename);
  };

  const triggerDownload = async (file_uri, filename) => {
    setDownloading(true);
    // Generate a signed URL that expires in 5 minutes
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
    const a = document.createElement('a');
    a.href = signed_url;
    a.download = filename;
    a.click();
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerDownload(success.file_uri, success.filename)}
            disabled={downloading}
            className="gap-2 border-green-300 text-green-700 hover:bg-green-100"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download again
          </Button>
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