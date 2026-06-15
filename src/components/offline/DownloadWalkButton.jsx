import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Loader2, FileQuestion } from 'lucide-react';
import VoucherGate from '../walks/VoucherGate';
import { base44 } from '@/api/base44Client';

const VOUCHER_KEY = 'crete_walks_voucher_unlocked';
const CLAIMED_KEY = 'crete_walks_member_claimed';

function getStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function markStored(key, walkId) {
  const list = getStored(key);
  if (!list.includes(walkId)) {
    localStorage.setItem(key, JSON.stringify([...list, walkId]));
  }
}

export default function DownloadWalkButton({ walk }) {
  const [voucherUnlocked, setVoucherUnlocked] = useState(false);
  const [memberClaimed, setMemberClaimed] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [checkingMember, setCheckingMember] = useState(true);
  const [showVoucher, setShowVoucher] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setVoucherUnlocked(getStored(VOUCHER_KEY).includes(walk.id));
    setMemberClaimed(getStored(CLAIMED_KEY).includes(walk.id));

    const checkMembership = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setIsMember(false);
          setCheckingMember(false);
          return;
        }

        const user = await base44.auth.me();
        const appUsers = await base44.entities.AppUser.filter({ user_id: user.id });
        setIsMember(appUsers[0]?.is_member === true);
      } catch {
        setIsMember(false);
      } finally {
        setCheckingMember(false);
      }
    };

    checkMembership();
  }, [walk.id]);

  const handleDownloadGpx = async () => {
    setDownloading(true);

    try {
      let url;

      if (walk.gpx_file_uri) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: walk.gpx_file_uri,
        });
        url = signed_url;
      } else if (walk.gpx_url) {
        url = walk.gpx_url;
      } else {
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${walk.code || walk.name}.gpx`;
      a.click();

      URL.revokeObjectURL(objectUrl);
      setDownloaded(true);
    } finally {
      setDownloading(false);
    }
  };

  const handleVoucherSuccess = () => {
    markStored(VOUCHER_KEY, walk.id);
    setVoucherUnlocked(true);
    setShowVoucher(false);
    handleDownloadGpx();
  };

  const handleMemberClaim = () => {
    markStored(CLAIMED_KEY, walk.id);
    setMemberClaimed(true);
    handleDownloadGpx();
  };

  const isSampleWalk = walk.is_sample_walk === true;
  const isCommunityWalk = walk.walk_category === 'community';
  const isMemberIncluded = walk.is_member_included === true;

  if (!walk.gpx_file_uri && !walk.gpx_url) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <FileQuestion className="w-4 h-4" />
        <span>GPX file not yet available</span>
      </div>
    );
  }

  if (showVoucher) {
    return (
      <VoucherGate
        walk={walk}
        onSuccess={handleVoucherSuccess}
        onCancel={() => setShowVoucher(false)}
      />
    );
  }

  if (isSampleWalk || isCommunityWalk || voucherUnlocked || memberClaimed) {
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

  if (isMemberIncluded) {
    if (checkingMember) {
      return (
        <Button variant="outline" size="sm" disabled className="gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking membership…
        </Button>
      );
    }

    if (isMember) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMemberClaim}
          disabled={downloading}
          className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'Downloading…' : 'Claim included walk'}
        </Button>
      );
    }
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