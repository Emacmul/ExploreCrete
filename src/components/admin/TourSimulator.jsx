import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, Gauge, Clock, Volume2, AlertTriangle, CheckCircle2, MapPin, Radio } from 'lucide-react';
import { calculateBearing, isBearingInRange } from '@/lib/routeExport';
import TourSimulatorMap from './TourSimulatorMap';

const R_EARTH = 6371000;
const TICK_MS = 100;

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

function buildPath(path) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dist = haversine(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    segments.push({ start: path[i], end: path[i + 1], dist, cumStart: total });
    total += dist;
  }
  return { segments, total };
}

function posAtDistance(segments, total, dist) {
  if (dist <= 0) return segments[0]?.start || null;
  if (dist >= total) return segments[segments.length - 1]?.end || null;
  for (const seg of segments) {
    if (dist <= seg.cumStart + seg.dist) {
      const r = seg.dist > 0 ? (dist - seg.cumStart) / seg.dist : 0;
      return {
        lat: seg.start.lat + (seg.end.lat - seg.start.lat) * r,
        lng: seg.start.lng + (seg.end.lng - seg.start.lng) * r,
      };
    }
  }
  return segments[segments.length - 1]?.end || null;
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function TourSimulator({ form }) {
  const trailPath = form.trail_path || [];
  const waypoints = (form.waypoints || []).filter(wp => wp.lat && wp.lng);

  const [speed, setSpeed] = useState(50);
  const [simMult, setSimMult] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPos, setCurrentPos] = useState(trailPath[0] || null);
  const [distTraveled, setDistTraveled] = useState(0);
  const [simTime, setSimTime] = useState(0);
  const [triggered, setTriggered] = useState({});
  const [triggerLog, setTriggerLog] = useState([]);
  const [tourComplete, setTourComplete] = useState(false);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const distRef = useRef(0);
  const prevPosRef = useRef(trailPath[0] || null);
  const triggeredRef = useRef({});
  const simTimeRef = useRef(0);
  const speedRef = useRef(speed);
  const multRef = useRef(simMult);
  const tickRef = useRef(null);

  const pathData = useMemo(() => buildPath(trailPath), [trailPath]);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { multRef.current = simMult; }, [simMult]);

  const stopSim = () => {
    setIsPlaying(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    distRef.current = 0;
    simTimeRef.current = 0;
    triggeredRef.current = {};
    setDistTraveled(0);
    setSimTime(0);
    setTriggered({});
    setTriggerLog([]);
    setTourComplete(false);
    if (audioRef.current) audioRef.current.pause();
    const startPos = trailPath[0];
    if (startPos) { setCurrentPos(startPos); prevPosRef.current = startPos; }
  };

  // Reset when trail path changes
  useEffect(() => {
    stopSim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailPath]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  tickRef.current = () => {
    const speedMs = (speedRef.current * 1000) / 3600;
    const delta = speedMs * multRef.current * (TICK_MS / 1000);
    const newDist = distRef.current + delta;

    if (newDist >= pathData.total) {
      distRef.current = pathData.total;
      setDistTraveled(pathData.total);
      const endPos = trailPath[trailPath.length - 1];
      if (endPos) { setCurrentPos(endPos); prevPosRef.current = endPos; }
      setIsPlaying(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setTourComplete(true);
      return;
    }

    const newPos = posAtDistance(pathData.segments, pathData.total, newDist);
    if (!newPos) return;

    // Check geofences
    waypoints.forEach((wp, i) => {
      if (!wp.trigger_audio || !wp.audio_clip_url) return;
      if (wp.trigger_once !== false && triggeredRef.current[i]) return;

      const d = haversine(newPos.lat, newPos.lng, wp.lat, wp.lng);
      const radius = Number(wp.trigger_radius_m) || 150;
      if (d > radius) return;

      if (wp.use_bearing && prevPosRef.current) {
        const moveBearing = calculateBearing(
          prevPosRef.current.lat, prevPosRef.current.lng,
          newPos.lat, newPos.lng
        );
        if (!isBearingInRange(moveBearing, Number(wp.bearing_direction) || 0, Number(wp.bearing_tolerance) || 30)) return;
      }

      triggeredRef.current[i] = true;
      const wasPlaying = audioRef.current && !audioRef.current.paused;
      if (audioRef.current) {
        audioRef.current.src = wp.audio_clip_url;
        audioRef.current.play().catch(() => {});
      }
      setTriggered({ ...triggeredRef.current });
      setTriggerLog(prev => [...prev, {
        wp, index: i, distance: newDist, simTime: simTimeRef.current,
        distFromCenter: d, overlap: wasPlaying,
      }]);
    });

    distRef.current = newDist;
    prevPosRef.current = newPos;
    simTimeRef.current += TICK_MS * multRef.current;
    setCurrentPos(newPos);
    setDistTraveled(newDist);
    setSimTime(simTimeRef.current);
  };

  const startSim = () => {
    if (pathData.total === 0 || trailPath.length < 2) return;
    setTourComplete(false);
    setIsPlaying(true);
    intervalRef.current = setInterval(() => tickRef.current(), TICK_MS);
  };

  const pauseSim = () => {
    setIsPlaying(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const progressPct = pathData.total > 0 ? Math.min(100, (distTraveled / pathData.total) * 100) : 0;
  const realDurationSec = pathData.total > 0 && speed > 0 ? (pathData.total / 1000) / speed * 3600 : 0;
  const simDurationSec = realDurationSec / simMult;
  const audioTriggerCount = waypoints.filter(wp => wp.trigger_audio).length;

  if (trailPath.length < 2) {
    return (
      <div className="bg-slate-700/50 rounded-xl border border-purple-600/40 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Gauge className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Simulate Tour</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <MapPin className="w-10 h-10 mb-3 opacity-40" />
          <p className="font-medium">No trail path available</p>
          <p className="text-sm">Add a trail path in the "Trail Path" tab to simulate this tour.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/50 rounded-xl border border-purple-600/40 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Gauge className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-semibold">Simulate Tour</h3>
        {audioTriggerCount > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-purple-300 bg-purple-900/40 px-2 py-1 rounded-full">
            <Radio className="w-3 h-3" /> {audioTriggerCount} audio trigger{audioTriggerCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm">
        Drive a virtual marker along the route at the chosen speed. Audio triggers fire
        exactly as they would on a real tour — test trigger placement from your desk.
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-400 text-xs mb-1.5 block">Driving Speed (km/h)</Label>
          <div className="flex gap-2 items-center">
            {[30, 50, 80].map(s => (
              <Button
                key={s}
                size="sm"
                variant={speed === s ? 'default' : 'outline'}
                onClick={() => setSpeed(s)}
                className={speed === s ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-slate-500 text-slate-300'}
              >
                {s}
              </Button>
            ))}
            <input
              type="number"
              value={speed}
              onChange={e => setSpeed(Math.max(1, Number(e.target.value) || 0))}
              className="w-16 bg-slate-800 border border-slate-600 text-white rounded px-2 text-sm h-8 text-center"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-400 text-xs mb-1.5 block">Simulation Speed</Label>
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(m => (
              <Button
                key={m}
                size="sm"
                variant={simMult === m ? 'default' : 'outline'}
                onClick={() => setSimMult(m)}
                className={simMult === m ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-slate-500 text-slate-300'}
              >
                {m}×
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
          <Gauge className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-white text-sm font-semibold">{speed} km/h</div>
          <div className="text-slate-500 text-xs">Speed</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
          <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-white text-sm font-semibold">{fmtTime(simTime)}</div>
          <div className="text-slate-500 text-xs">Sim Time</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
          <MapPin className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <div className="text-white text-sm font-semibold">{fmtDist(distTraveled)}</div>
          <div className="text-slate-500 text-xs">of {fmtDist(pathData.total)}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
          <Volume2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-white text-sm font-semibold">
            {Object.keys(triggered).length}/{audioTriggerCount}
          </div>
          <div className="text-slate-500 text-xs">Triggered</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>~{fmtTime(realDurationSec * 1000)} real time</span>
          <span>~{fmtTime(simDurationSec * 1000)} sim time at {simMult}×</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <Button onClick={startSim} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Play className="w-4 h-4" /> {tourComplete ? 'Replay' : distTraveled > 0 ? 'Resume' : 'Start'}
          </Button>
        ) : (
          <Button onClick={pauseSim} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
            <Pause className="w-4 h-4" /> Pause
          </Button>
        )}
        <Button onClick={stopSim} variant="outline" className="border-slate-500 text-slate-300 gap-2">
          <Square className="w-4 h-4" /> Reset
        </Button>
        {tourComplete && (
          <span className="flex items-center gap-1.5 text-green-400 text-sm ml-auto">
            <CheckCircle2 className="w-4 h-4" /> Tour complete
          </span>
        )}
      </div>

      {/* Map */}
      <div className="h-80 rounded-xl overflow-hidden border border-slate-600">
        <TourSimulatorMap
          trailPath={trailPath}
          waypoints={waypoints}
          triggered={triggered}
          currentPos={currentPos}
        />
      </div>

      {/* Trigger log */}
      {triggerLog.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300 font-medium text-sm">Trigger Log</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {triggerLog.map((entry, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${entry.overlap ? 'bg-red-900/30 border border-red-700/40' : 'bg-slate-700/50'}`}
              >
                <span className="text-slate-500 font-mono shrink-0">{fmtTime(entry.simTime)}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-200 font-medium">
                    {entry.wp.segment_id || entry.wp.name || `Waypoint ${entry.index + 1}`}
                  </span>
                  {entry.wp.segment_title && (
                    <span className="text-slate-400"> — {entry.wp.segment_title}</span>
                  )}
                  <div className="text-slate-500 mt-0.5">
                    Triggered at {fmtDist(entry.distance)} · {Math.round(entry.distFromCenter)}m from centre
                    {entry.wp.use_bearing && ' · bearing ✓'}
                  </div>
                </div>
                {entry.overlap && (
                  <span className="flex items-center gap-1 text-red-400 shrink-0" title="Audio was still playing from previous trigger">
                    <AlertTriangle className="w-3.5 h-3.5" /> Overlap
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}