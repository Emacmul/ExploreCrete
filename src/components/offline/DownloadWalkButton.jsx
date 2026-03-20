import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Loader2, FileQuestion } from 'lucide-react';
import VoucherGate from '../walks/VoucherGate';

const VOUCHER_KEY = 'crete_walks_voucher_unlocked';

function getUnlocked() {
  try { return JSON.parse(localStorage.getItem(VOUCHER_KEY) || '[]'); }
  catch { return []; }
}

function markUnlocked(walkId) {
  const list = getUnlocked();
  if (!list.includes(walkId)) {
    localStorage.setItem(VOUCHER_KEY, JSON.stringify([...list, walkId]));
  }
}

export default function DownloadWalkButton({ walk }) {
  const [voucherUnlocked, setVoucherUnlocked] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setVoucherUnlocked(getUnlocked().includes(walk.id));
  }, [walk.id]);

  const handleDownloadGpx = async () => {
    if (!walk.gpx_url) return;
    setDownloading(true);
    try {
      const response = await fetch(walk.gpx_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${walk.code || walk.name}.gpx`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } finally {
      setDownloading(false);
    }
  };

  const handleVoucherSuccess = () => {
    markUnlocked(walk.id);
    setVoucherUnlocked(true);
    setShowVoucher(false);
    handleDownloadGpx();
  };

  // No GPX URL configured
  if (!walk.gpx_url) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <FileQuestion className="w-4 h-4" />
        <span>GPX file not yet available</span>
      </div>
    );
  }

  if (showVoucher) {
    return <VoucherGate walk={walk} onSuccess={handleVoucherSuccess} onCancel={() => setShowVoucher(false)} />;
  }

  if (voucherUnlocked) {
    return (
      <div className="flex items-center gap-2">
        {downloaded && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>GPX downloaded!</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadGpx}
          disabled={downloading}
          className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'Downloading…' : downloaded ? 'Download again' : 'Download GPX'}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowVoucher(true)}
      className="gap-2 border-amber-300 text-amber-600 hover:bg-amber-50"
    >
      <Download className="w-4 h-4" />
      Enter code to download GPX
    </Button>
  );
}