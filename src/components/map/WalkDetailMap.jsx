import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Waypoint icons by type
const waypointConfig = {
  start: { color: '#22c55e', icon: '🚩', label: 'Start' },
  end: { color: '#ef4444', icon: '🏁', label: 'End' },
  turnoff: { color: '#f59e0b', icon: '↪️', label: 'Turn' },
  danger: { color: '#dc2626', icon: '⚠️', label: 'Danger' },
  viewpoint: { color: '#8b5cf6', icon: '👁️', label: 'View' },
  water: { color: '#3b82f6', icon: '💧', label: 'Water' },
  rest_area: { color: '#10b981', icon: '🪑', label: 'Rest' },
  landmark: { color: '#6366f1', icon: '📍', label: 'Landmark' },
};

const createWaypointIcon = (type) => {
  const config = waypointConfig[type] || waypointConfig.landmark;
  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `<div class="flex flex-col items-center">
      <div class="w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-lg" style="background-color: ${config.color}">
        ${config.icon}
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function FitBoundsToTrail({ trailPath, waypoints }) {
  const map = useMap();
  
  useEffect(() => {
    if (trailPath && trailPath.length > 0) {
      const bounds = L.latLngBounds(trailPath.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (waypoints && waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, trailPath, waypoints]);
  
  return null;
}

export default function WalkDetailMap({ walk }) {
  const trailPath = walk.trail_path || [];
  const waypoints = walk.waypoints || [];
  
  const center = trailPath.length > 0 
    ? [trailPath[0].lat, trailPath[0].lng]
    : [walk.start_lat, walk.start_lng];

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '300px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBoundsToTrail trailPath={trailPath} waypoints={waypoints} />
      
      {/* Trail line */}
      {trailPath.length > 1 && (
        <Polyline
          positions={trailPath.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5',
          }}
        />
      )}
      
      {/* Waypoints */}
      {waypoints.map((waypoint, index) => (
        <Marker
          key={index}
          position={[waypoint.lat, waypoint.lng]}
          icon={createWaypointIcon(waypoint.type)}
        >
          <Popup>
            <div className="text-center p-2 min-w-[150px]">
              <span 
                className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: waypointConfig[waypoint.type]?.color || '#6366f1' }}
              >
                {waypointConfig[waypoint.type]?.label || waypoint.type}
              </span>
              <p className="font-semibold mt-2">{waypoint.name}</p>
              {waypoint.description && (
                <p className="text-xs text-gray-600 mt-1">{waypoint.description}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}