/**
 * Driving Audio Tour route export utilities.
 *
 * Handles validation, GPX generation and KML generation for driving audio tours.
 * Both exports are produced from the same edited route data — the user never
 * edits the route twice.
 */

export const WAYPOINT_ROLE_COLOURS = {
  primary_start: '#22c55e',
  primary_stop: '#ef4444',
  secondary: '#3b82f6',
};

export const WAYPOINT_ROLE_LABELS = {
  primary_start: 'Primary-Start',
  primary_stop: 'Primary-Stop',
  secondary: 'Secondary',
};

export function getRoleColour(role) {
  return WAYPOINT_ROLE_COLOURS[role] || '#6366f1';
}

export function getRoleLabel(role) {
  return WAYPOINT_ROLE_LABELS[role] || role || 'Secondary';
}

/**
 * Build a Segment ID from a tour code and a 2-digit segment number.
 * Returns null if either part is invalid.
 */
export function buildSegmentId(tourCode, segmentNumber) {
  const code = (tourCode || '').trim().toUpperCase();
  const num = String(segmentNumber || '').padStart(2, '0').slice(-2);
  if (!/^[A-Z]{3}$/.test(code)) return null;
  if (!/^\d{2}$/.test(num)) return null;
  return `${code}${num}`;
}

/**
 * Validate a driving audio tour route.
 * Returns an array of error strings (empty if valid).
 */
export function validateDrivingTour(walk) {
  const errors = [];
  const tourCode = (walk.code || '').trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(tourCode)) {
    errors.push('Tour Code must be exactly 3 uppercase letters (A–Z).');
  }

  if (!walk.name?.trim()) {
    errors.push('Tour Name is required.');
  }

  const waypoints = walk.waypoints || [];

  if (waypoints.length === 0) {
    errors.push('At least one waypoint is required.');
    return errors;
  }

  // Collect all segment IDs to check the 99-segment limit
  const segmentIds = waypoints
    .map(wp => wp.segment_id)
    .filter(id => id);
  const uniqueSegments = new Set(segmentIds);

  if (uniqueSegments.size > 99) {
    errors.push('A tour cannot contain more than 99 narrated segments.');
  }

  let hasPrimaryStart = false;

  waypoints.forEach((wp, i) => {
    const idx = i + 1;
    const prefix = `Waypoint ${idx}`;

    if (isNaN(Number(wp.lat)) || wp.lat == null) {
      errors.push(`${prefix}: Latitude is required.`);
    }
    if (isNaN(Number(wp.lng)) || wp.lng == null) {
      errors.push(`${prefix}: Longitude is required.`);
    }

    if (!wp.waypoint_role) {
      errors.push(`${prefix}: Waypoint Role is required.`);
    } else if (wp.waypoint_role === 'primary_start') {
      hasPrimaryStart = true;
    }

    // Validate segment ID format
    if (wp.segment_id) {
      if (!/^[A-Z]{3}\d{2}$/.test(wp.segment_id)) {
        errors.push(`${prefix}: Segment ID "${wp.segment_id}" must be Tour Code + 2-digit number (e.g. BOR03).`);
      } else if (tourCode && !wp.segment_id.startsWith(tourCode)) {
        errors.push(`${prefix}: Segment ID "${wp.segment_id}" does not start with Tour Code "${tourCode}".`);
      }
    }

    // Average segment speed required on Primary-Start
    if (wp.waypoint_role === 'primary_start') {
      const speed = Number(wp.avg_segment_speed_kmh);
      if (isNaN(speed) || speed <= 0) {
        errors.push(`${prefix}: Average Segment Speed is required on Primary-Start waypoints.`);
      }
    }

    if (!wp.segment_title?.trim()) {
      errors.push(`${prefix}: Segment Title is required.`);
    }
  });

  if (!hasPrimaryStart) {
    errors.push('At least one Primary-Start waypoint is required.');
  }

  return errors;
}

function xmlEscape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a Magical Crete GPX file for a driving audio tour.
 *
 * Includes Segment ID, Segment Title, Waypoint Role, Waypoint Colour and
 * Average Segment Speed (where present).
 */
export function generateGpx(walk) {
  const tourCode = (walk.code || '').trim().toUpperCase();
  const tourName = walk.name || 'Driving Audio Tour';
  const description = walk.description || '';
  const trailPath = walk.trail_path || [];
  const waypoints = walk.waypoints || [];

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<gpx version="1.1" creator="Magical Crete Route Editor"');
  lines.push('  xmlns="http://www.topografix.com/GPX/1/1"');
  lines.push('  xmlns:mc="https://magicalcrete.com/gpx/extensions">');

  // Metadata
  lines.push('  <metadata>');
  lines.push(`    <name>${xmlEscape(tourName)}</name>`);
  if (description) {
    lines.push(`    <desc>${xmlEscape(description)}</desc>`);
  }
  lines.push('  </metadata>');

  // Route track from trail_path
  if (trailPath.length > 0) {
    lines.push('  <trk>');
    lines.push(`    <name>${xmlEscape(tourName)}</name>`);
    lines.push('    <trkseg>');
    for (const pt of trailPath) {
      const ele = pt.elevation != null ? `\n        <ele>${pt.elevation}</ele>` : '';
      lines.push(`      <trkpt lat="${pt.lat}" lon="${pt.lng}">${ele}`);
      lines.push('      </trkpt>');
    }
    lines.push('    </trkseg>');
    lines.push('  </trk>');
  }

  // Waypoints with driving-tour extension data
  for (const wp of waypoints) {
    const ele = wp.elevation != null ? `\n    <ele>${wp.elevation}</ele>` : '';
    const wpName = wp.segment_id
      ? `${wp.segment_id} — ${wp.segment_title || ''}`.trim()
      : (wp.name || wp.segment_title || '');

    lines.push(`  <wpt lat="${wp.lat}" lon="${wp.lng}">${ele}`);

    if (wpName) {
      lines.push(`    <name>${xmlEscape(wpName)}</name>`);
    }
    if (wp.description) {
      lines.push(`    <desc>${xmlEscape(wp.description)}</desc>`);
    }

    // Driving tour extension data
    lines.push('    <extensions>');
    if (wp.waypoint_role) {
      lines.push(`      <mc:role>${xmlEscape(wp.waypoint_role)}</mc:role>`);
    }
    if (wp.segment_id) {
      lines.push(`      <mc:segmentId>${xmlEscape(wp.segment_id)}</mc:segmentId>`);
    }
    if (wp.segment_title) {
      lines.push(`      <mc:segmentTitle>${xmlEscape(wp.segment_title)}</mc:segmentTitle>`);
    }
    if (wp.waypoint_colour) {
      lines.push(`      <mc:colour>${xmlEscape(wp.waypoint_colour)}</mc:colour>`);
    }
    if (wp.avg_segment_speed_kmh != null && !isNaN(Number(wp.avg_segment_speed_kmh))) {
      lines.push(`      <mc:avgSpeedKmh>${Number(wp.avg_segment_speed_kmh)}</mc:avgSpeedKmh>`);
    }
    lines.push('    </extensions>');

    lines.push('  </wpt>');
  }

  lines.push('</gpx>');
  return lines.join('\n');
}

/**
 * Generate a KML file for a driving audio tour.
 *
 * Contains one LineString for the complete route and one Placemark per
 * waypoint. Coordinates are in KML order: longitude, latitude, elevation.
 */
export function generateKml(walk) {
  const tourName = walk.name || 'Driving Audio Tour';
  const description = walk.description || '';
  const trailPath = walk.trail_path || [];
  const waypoints = walk.waypoints || [];

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
  lines.push('  <Document>');
  lines.push(`    <name>${xmlEscape(tourName)}</name>`);
  if (description) {
    lines.push(`    <description>${xmlEscape(description)}</description>`);
  }

  // Route LineString
  if (trailPath.length > 1) {
    lines.push('    <Placemark>');
    lines.push(`      <name>${xmlEscape(tourName)} — Route</name>`);
    lines.push('      <LineString>');
    lines.push('        <tessellate>1</tessellate>');
    const coords = trailPath
      .map(pt => `${pt.lng},${pt.lat},${pt.elevation || 0}`)
      .join(' ');
    lines.push(`        <coordinates>${coords}</coordinates>`);
    lines.push('      </LineString>');
    lines.push('    </Placemark>');
  }

  // Waypoint Placemarks
  for (const wp of waypoints) {
    const wpName = wp.segment_id
      ? `${wp.segment_id} — ${wp.segment_title || ''}`.trim()
      : (wp.name || wp.segment_title || 'Waypoint');

    const descParts = [];
    if (wp.segment_title) descParts.push(`Segment: ${wp.segment_title}`);
    if (wp.waypoint_role) descParts.push(`Role: ${getRoleLabel(wp.waypoint_role)}`);
    if (wp.description) descParts.push(wp.description);
    const kmlDesc = descParts.join(' — ');

    lines.push('    <Placemark>');
    lines.push(`      <name>${xmlEscape(wpName)}</name>`);
    if (kmlDesc) {
      lines.push(`      <description>${xmlEscape(kmlDesc)}</description>`);
    }
    lines.push('      <Point>');
    lines.push(`        <coordinates>${wp.lng},${wp.lat},${wp.elevation || 0}</coordinates>`);
    lines.push('      </Point>');
    lines.push('    </Placemark>');
  }

  lines.push('  </Document>');
  lines.push('</kml>');
  return lines.join('\n');
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}