import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Trash2, Loader2, WifiOff } from 'lucide-react';
import { saveWalkOffline, isWalkSavedOffline, removeOfflineWalk, preCacheWalkTiles } from './offlineStorage';
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
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voucherUnlocked, setVoucherUnlocked] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);

  useEffect(() => {
    isWalkSavedOffline(walk.id).then(isSaved => {
      setSaved(isSaved);
      // If already saved, no need for voucher again
      if (isSaved) setVoucherUnlocked(true);
    });
    // Check if previously unlocked in this session/device
    setVoucherUnlocked(getUnlocked().includes(walk.id));
  }, [walk.id]);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    await saveWalkOffline(walk);
    await preCacheWalkTiles(walk, setProgress);
    setSaved(true);
    setDownloading(false);
  };

  const handleVoucherSuccess = () => {
    markUnlocked(walk.id);
    setVoucherUnlocked(true);
    setShowVoucher(false);
    handleDownload();
  };

  const handleRemove = async () => {
    await removeOfflineWalk(walk.id);
    setSaved(false);
    // Remove from unlocked so they need a voucher again if they want to re-download
    const list = getUnlocked().filter(id => id !== walk.id);
    localStorage.setItem(VOUCHER_KEY, JSON.stringify(list));
    setVoucherUnlocked(false);
  };

  if (downloading) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <div className="flex-1">
          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-blue-600 mt-1">Saving for offline… {progress}%</p>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>Available offline</span>
          <CheckCircle className="w-4 h-4" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="text-gray-400 hover:text-red-500 h-7 px-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  if (showVoucher) {
    return <VoucherGate walk={walk} onSuccess={handleVoucherSuccess} />;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowVoucher(true)}
      className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
    >
      <Download className="w-4 h-4" />
      Save offline
    </Button>
  );
}