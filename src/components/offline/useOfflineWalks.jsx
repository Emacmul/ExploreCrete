import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'crete_walks_offline';

function getStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function useOfflineWalks() {
  const [offlineWalks, setOfflineWalks] = useState(getStored);

  useEffect(() => {
    const handler = () => setOfflineWalks(getStored());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const downloadWalk = useCallback((walk) => {
    const stored = getStored();
    stored[walk.id] = { ...walk, downloaded_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setOfflineWalks({ ...stored });
  }, []);

  const removeWalk = useCallback((walkId) => {
    const stored = getStored();
    delete stored[walkId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setOfflineWalks({ ...stored });
  }, []);

  const isDownloaded = useCallback((walkId) => {
    return !!offlineWalks[walkId];
  }, [offlineWalks]);

  const getOfflineWalk = useCallback((walkId) => {
    return offlineWalks[walkId] || null;
  }, [offlineWalks]);

  const getAllOfflineWalks = useCallback(() => {
    return Object.values(offlineWalks);
  }, [offlineWalks]);

  return { downloadWalk, removeWalk, isDownloaded, getOfflineWalk, getAllOfflineWalks, offlineWalks };
}