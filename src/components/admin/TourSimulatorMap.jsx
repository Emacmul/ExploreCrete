import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoleColour } from '@/lib/routeExport';

function FitBounds({ trailPath, waypoints }) {
  const map = useMap();
  useEffect(() => {
    const pts = trailPath?.length > 0
      ? trailPath.map(p => [p.lat, p.lng])
      : waypoints?.map(w => [w.lat, w.lng]);
    if (pts?.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
    }
  }, [map, trailPath, waypoints]);
  return null;
}

const carIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 12px rgba(59,130,246,0.6);display:flex;align-items:center;justify-content:center;font-size:18px;">🚗</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function wpIcon(colour, emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${colour};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function TourSimulatorMap({ trailPath, waypoints, triggered, currentPos }) {
  const center = trailPath.length > 0
    ? [trailPath[0].lat, trailPath[0].lng]
    : waypoints.length > 0
      ? [waypoints[0].lat, waypoints[0].lng]
      : [35.24, 24.81];

  return (
    <MapContainer center={center} zoom={13} className="w-full h-full" style={{ minHeight: '350px' }}>
      <TileLayer
        url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <FitBounds trailPath={trailPath} waypoints={waypoints} />

      {trailPath.length > 1 && (
        <Polyline
          positions={trailPath.map(p => [p.lat, p.lng])}
          pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }}
        />
      )}

      {waypoints.map((wp, i) => {
        const isTriggered = triggered[i];
        const hasAudio = wp.trigger_audio;
        const colour = isTriggered ? '#22c55e' : (hasAudio ? '#a855f7' : getRoleColour(wp.waypoint_role));
        const emoji = isTriggered ? '✅' : (hasAudio ? '🔊' : '📍');

        return (
          <React.Fragment key={i}>
            <Marker position={[wp.lat, wp.lng]} icon={wpIcon(colour, emoji)} />
            {hasAudio && (
              <Circle
                center={[wp.lat, wp.lng]}
                radius={Number(wp.trigger_radius_m) || 150}
                pathOptions={{
                  color: isTriggered ? '#22c55e' : '#a855f7',
                  fillColor: isTriggered ? '#22c55e' : '#a855f7',
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '4, 4',
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {currentPos && (
        <Marker position={[currentPos.lat, currentPos.lng]} icon={carIcon} />
      )}
    </MapContainer>
  );
}