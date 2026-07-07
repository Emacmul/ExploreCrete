import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download, Trash2, ChevronDown, ChevronUp,
  MapPin, Radio, Volume2, AlertTriangle, Flag,
} from 'lucide-react';
import * as tourLogService from '@/lib/tourLogService';

const ENTRY_META = {
  session_start: { icon: Flag, color: 'text-blue-400' },
  session_stop: { icon: Flag, color: 'text-blue-400' },
  gps_fix: { icon: MapPin, color: 'text-slate-400' },
  trigger_check: { icon: Radio, color: 'text-purple-400' },
  audio_play: { icon: Volume2, color: 'text-green-400' },
  audio_skip: { icon: Volume2, color: 'text-slate-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
};

function fmtElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function entryLabel(entry) {
  const d = entry.data;
  switch (entry.type) {
    case 'session_start':
      return `Session start — "${d.walkName}"`;
    case 'session_stop':
      return `Session stop — ${fmtElapsed(d.duration)} total`;
    case 'gps_fix':
      return `${d.lat.toFixed(5)}, ${d.lng.toFixed(5)} (±${Math.round(d.accuracy || 0)}m)`;
    case 'trigger_check': {
      const parts = [`${d.waypointId}`, `${d.distance}m/${d.triggerRadius}m`];
      if (d.useBearing) parts.push(d.bearingOk ? 'bearing ✓' : 'bearing ✗');
      parts.push(`→ ${d.result}`);
      return parts.join(' · ');
    }
    case 'audio_play':
      return `${d.waypointId}`;
    case 'audio_skip':
      return `${d.waypointId} (${d.reason})`;
    case 'warning':
      return d.message;
    default:
      return entry.type;
  }
}

export default function TourDebugLog() {
  const [entries, setEntries] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    return tourLogService.subscribe(setEntries);
  }, []);

  const triggerCount = entries.filter(e => e.type === 'trigger_check').length;
  const fireCount = entries.filter(e => e.type === 'trigger_check' && e.data.result === 'fire').length;
  const audioCount = entries.filter(e => e.type === 'audio_play').length;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/60 transition-colors"
      >
        <Radio className="w-4 h-4 text-purple-400 shrink-0" />
        <span className="text-slate-200 text-sm font-medium">Audit Log</span>
        <span className="text-xs text-slate-500">
          {entries.length} events · {triggerCount} checks · {fireCount} fired · {audioCount} played
        </span>
        <div className="ml-auto flex items-center gap-1">
          {entries.length > 0 && (
            <>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => { e.stopPropagation(); tourLogService.downloadLog(); }}
                className="w-7 h-7 text-slate-400 hover:text-blue-400"
                title="Download log"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => { e.stopPropagation(); tourLogService.clearLog(); }}
                className="w-7 h-7 text-slate-400 hover:text-red-400"
                title="Clear log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {/* Log entries */}
      {expanded && (
        <ScrollArea className="max-h-64 border-t border-slate-700">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-600 text-sm">
              No log entries yet. Start a tour to begin recording.
            </div>
          ) : (
            <div className="px-2 py-1">
              {[...entries].reverse().map((entry) => {
                const meta = ENTRY_META[entry.type] || ENTRY_META.gps_fix;
                const Icon = meta.icon;
                const isResult = entry.type === 'trigger_check';
                const resultColor = isResult
                  ? entry.data.result === 'fire'
                    ? 'text-green-400'
                    : 'text-slate-500'
                  : '';
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 px-2 py-1 text-xs font-mono border-b border-slate-800/50 last:border-0"
                  >
                    <span className="text-slate-600 shrink-0 w-14">
                      {fmtElapsed(entry.elapsed)}
                    </span>
                    <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${meta.color}`} />
                    <span className={`text-slate-300 ${resultColor}`}>
                      {entryLabel(entry)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}