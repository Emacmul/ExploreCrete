/**
 * Offline storage for walks using IndexedDB.
 * Saves full walk data + map tiles so the walk is usable without any connection.
 */

const DB_NAME = 'creteWalksOffline';
const DB_VERSION = 1;
const STORE_WALKS = 'walks';
const STORE_TILES = 'tiles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_WALKS)) {
        db.createObjectStore(STORE_WALKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TILES)) {
        db.createObjectStore(STORE_TILES, { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveWalkOffline(walk) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WALKS, 'readwrite');
    tx.objectStore(STORE_WALKS).put({ ...walk, _savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineWalk(walkId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WALKS, 'readonly');
    const req = tx.objectStore(STORE_WALKS).get(walkId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineWalks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WALKS, 'readonly');
    const req = tx.objectStore(STORE_WALKS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOfflineWalk(walkId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WALKS, 'readwrite');
    tx.objectStore(STORE_WALKS).delete(walkId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function isWalkSavedOffline(walkId) {
  const walk = await getOfflineWalk(walkId);
  return !!walk;
}

/**
 * Returns true if the server walk's updated_date is newer than what we have stored.
 */
export async function isWalkOutdated(serverWalk) {
  const stored = await getOfflineWalk(serverWalk.id);
  if (!stored) return false;
  if (!serverWalk.updated_date) return false;
  const serverTime = new Date(serverWalk.updated_date).getTime();
  const storedTime = stored._savedAt || 0;
  return serverTime > storedTime;
}

export async function cacheTile(url, blob) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_TILES, 'readwrite');
    tx.objectStore(STORE_TILES).put({ url, blob, cachedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getCachedTile(url) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_TILES, 'readonly');
    const req = tx.objectStore(STORE_TILES).get(url);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => resolve(null);
  });
}

/**
 * Pre-cache all map tiles for a given trail bounding box at zoom levels 12–16.
 * Returns { total, cached } counts.
 */
export async function preCacheWalkTiles(walk, onProgress) {
  const tileUrl = (z, x, y) =>
    `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  // Build bounding box from trail path + waypoints
  const points = [
    ...(walk.trail_path || []),
    ...(walk.waypoints || []),
    { lat: walk.start_lat, lng: walk.start_lng },
  ].filter(p => p.lat && p.lng);

  if (points.length === 0) return { total: 0, cached: 0 };

  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats) - 0.02;
  const maxLat = Math.max(...lats) + 0.02;
  const minLng = Math.min(...lngs) - 0.02;
  const maxLng = Math.max(...lngs) + 0.02;

  const lat2tile = (lat, zoom) =>
    Math.floor(((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, zoom));
  const lng2tile = (lng, zoom) =>
    Math.floor((lng + 180) / 360 * Math.pow(2, zoom));

  const tilesToFetch = [];
  for (let z = 12; z <= 16; z++) {
    const x0 = lng2tile(minLng, z);
    const x1 = lng2tile(maxLng, z);
    const y0 = lat2tile(maxLat, z);
    const y1 = lat2tile(minLat, z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        tilesToFetch.push({ z, x, y });
      }
    }
  }

  let cached = 0;
  const total = tilesToFetch.length;

  // Batch fetch with concurrency limit of 4
  const batchSize = 4;
  for (let i = 0; i < tilesToFetch.length; i += batchSize) {
    const batch = tilesToFetch.slice(i, i + batchSize);
    await Promise.all(batch.map(async ({ z, x, y }) => {
      const url = tileUrl(z, x, y);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          await cacheTile(url, blob);
          cached++;
        }
      } catch { /* skip on error */ }
      if (onProgress) onProgress(Math.round((cached / total) * 100));
    }));
  }

  return { total, cached };
}