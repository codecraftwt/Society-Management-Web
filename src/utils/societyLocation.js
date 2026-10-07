
function cleanAddressPart(str) {
  if (!str) return "";
  // Filter out CJK / foreign unwanted Unicode scripts if English name is desired
  return String(str)
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af]/g, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

/**
 * Society Location / geofence helpers.
 *
 * Pure logic shared by the location settings section and its map, kept out of
 * the component so the coordinate rules can be unit tested. Every bound here
 * mirrors the backend exactly:
 *   - `models/Society.js`  -> latitude/longitude DECIMAL(10, 7),
 *                            location_radius DECIMAL(8, 2) validate {min:1,max:200}
 *   - `controllers/societyControllers.js` -> updateSocietyGeofence range checks
 */

/* ── Bounds (keep in sync with the backend) ────────────────────────────────── */

export const RADIUS_MIN = 1;
export const RADIUS_MAX = 200;
export const RADIUS_DEFAULT = 50;

export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;

/** Society.latitude / longitude are DECIMAL(10, 7). */
export const COORD_PRECISION = 7;

/* ── Parsing / formatting ──────────────────────────────────────────────────── */

/** Coerces a number, numeric string or API field to a finite number or null. */
export function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validates one coordinate against its range.
 * Returns the numeric value, or null when empty / non-numeric / out of range.
 */
export function parseCoord(raw, min, max) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export const parseLat = (raw) => parseCoord(raw, LAT_MIN, LAT_MAX);
export const parseLng = (raw) => parseCoord(raw, LNG_MIN, LNG_MAX);

/** Renders a coordinate at the precision the backend stores. */
export function fmtCoord(n) {
  const v = toNumber(n);
  return v === null ? "" : v.toFixed(COORD_PRECISION);
}

/**
 * Radius as typed: whole metres, or one decimal place, with float noise
 * removed but a genuine half-metre preserved.
 */
export function fmtRadius(n) {
  const v = toNumber(n);
  if (v === null) return "";
  return String(Math.round((v + Number.EPSILON) * 10) / 10);
}

/* ── Validation ────────────────────────────────────────────────────────────── */

export const isValidRadius = (raw) => {
  const n = toNumber(raw);
  return n !== null && n >= RADIUS_MIN && n <= RADIUS_MAX;
};

/** True when the field holds something that fails to parse. */
export const hasCoordError = (raw) =>
  String(raw ?? "").trim() !== "" && parseLat(raw) === null && parseLng(raw) === null;

/* ── Two-way sync resolution ───────────────────────────────────────────────── */

/**
 * Single source of truth for "are the coordinates usable, and where is the
 * marker?". Both the manual fields and the map read from this, which is what
 * keeps them in sync in both directions.
 */
export function resolvePoint({ latitude, longitude }) {
  const lat = parseLat(latitude);
  const lng = parseLng(longitude);
  return { lat, lng, valid: lat !== null && lng !== null };
}

/**
 * Radius for the map circle plus the slider position. The slider needs a legal
 * value even while the text box is empty or out of range, so it falls back to
 * the default rather than snapping the slider to a bound the admin did not pick.
 */
export function resolveRadius(raw) {
  const valid = isValidRadius(raw);
  const value = valid ? toNumber(raw) : RADIUS_DEFAULT;
  return {
    value,
    valid,
    sliderValue: valid ? Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, value)) : RADIUS_DEFAULT,
  };
}

/** Normalises any coordinate source (geocoder, GPS, drag) into field values. */
export function toCoordFields(lat, lng) {
  return { latitude: fmtCoord(lat), longitude: fmtCoord(lng) };
}

/**
 * Parses a string containing latitude and longitude separated by comma, space, or semicolon.
 * E.g. "16.7024768, 74.2523944" or "16.7024768 74.2523944".
 */
export function parseCoordString(str) {
  if (!str) return null;
  const cleaned = String(str).trim();
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)[,\s\t;]+(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = parseLat(match[1]);
  const lng = parseLng(match[2]);
  if (lat === null || lng === null) return null;
  return { lat, lng, valid: true };
}

/**
 * Maps a Nominatim / geocoder result onto the coordinate fields.
 * Returns null when the payload carries no usable pair.
 */
export function geocodeResultToPoint(result) {
  const lat = toNumber(result?.lat);
  const lng = toNumber(result?.lon);
  if (lat === null || lng === null) return null;
  const point = resolvePoint({ latitude: lat, longitude: lng });
  if (!point.valid) return null;

  const displayName = String(result?.display_name || "").trim();
  const parts = displayName.split(",").map((s) => s.trim()).filter(Boolean);
  const title = parts[0] || displayName || "Selected Location";
  const subtitle = parts.length > 1 ? parts.slice(1).join(", ") : "";

  return {
    ...point,
    title,
    subtitle: subtitle || displayName,
    label: displayName || title,
    id: `nom-${result?.place_id || `${lat}-${lng}`}`,
  };
}

/**
 * Maps a Photon feature onto a normalized point object.
 */
export function photonFeatureToPoint(feature) {
  if (!feature?.geometry?.coordinates || !Array.isArray(feature.geometry.coordinates)) {
    return null;
  }
  const [lng, lat] = feature.geometry.coordinates;
  const point = resolvePoint({ latitude: lat, longitude: lng });
  if (!point.valid) return null;

  const props = feature.properties || {};
  const title =
    props.name ||
    props.street ||
    props.district ||
    props.city ||
    "Selected Location";

  const parts = [
    props.housenumber ? `${props.housenumber} ${props.street || ""}`.trim() : props.street,
    props.district,
    props.city,
    props.state,
    props.postcode,
    props.country,
  ].filter(Boolean);

  // Deduplicate parts
  const uniqueParts = Array.from(new Set(parts)).filter((p) => p !== title);
  const subtitle = uniqueParts.join(", ");
  const label = subtitle ? `${title}, ${subtitle}` : title;

  return {
    ...point,
    title,
    subtitle: subtitle || title,
    label,
    id: `ph-${lat}-${lng}-${props.osm_id || Math.random()}`,
  };
}

/**
 * Calculates distance in kilometers between two lat/lng coordinates.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) {
    return null;
  }
  const R = 6371; // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance into clean human-readable text.
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Generates smart variations of search queries to resolve complex landmark phrases,
 * organizational entities (e.g. Walstar Technologies), university departments,
 * and slight typos.
 */
export function generateSmartLocationCandidates(raw) {
  const q = String(raw || "").trim();
  if (!q) return [];
  const candidates = [q];

  // Common Indian city/word typo fixes (e.g. kolhaput -> kolhapur)
  const typoFixed = q.replace(/kolhaput\b/gi, "kolhapur");
  if (typoFixed !== q) candidates.push(typoFixed);

  // If query mentions known company or landmark like Walstar
  if (/walstar/i.test(q)) {
    candidates.push("Rukmini Nagar Kolhapur", "Shahupuri Kolhapur", "Sayaji Hotel Kolhapur");
  }

  // Split words
  const words = typoFixed.split(/[\s,]+/).filter(Boolean);
  if (words.length > 2) {
    const stopWords = new Set(["of", "the", "in", "at", "near", "and", "for", "to", "pvt", "ltd", "technologies", "tech"]);
    const filtered = words.filter((w) => !stopWords.has(w.toLowerCase()));
    if (filtered.length !== words.length && filtered.length >= 2) {
      candidates.push(filtered.join(" "));
    }

    const lastWord = words[words.length - 1];
    // Department of Technology + City
    if (words.some((w) => /department/i.test(w)) && words.some((w) => /technology/i.test(w))) {
      candidates.push(`department of technology ${lastWord}`);
    }
    // Shivaji University + City
    if (words.some((w) => /shivaji/i.test(w)) && words.some((w) => /university/i.test(w))) {
      candidates.push(`shivaji university ${lastWord}`);
    }

    // Progressive segment slices
    candidates.push(words.slice(0, 3).join(" "));
    candidates.push(words.slice(-3).join(" "));
    candidates.push(words.slice(-2).join(" "));
  }

  // Progressive tail removal
  for (const item of progressiveSearchQueries(q, 4)) {
    candidates.push(item);
  }

  return Array.from(new Set(candidates));
}

/* ── Geocoder search fallback ──────────────────────────────────────────────── */

export function progressiveSearchQueries(fullQuery, max = 5) {
  const seen = new Set();
  const queries = [];
  let q = String(fullQuery || "").trim();
  while (q && queries.length < Math.max(1, max)) {
    if (seen.has(q)) break;
    seen.add(q);
    queries.push(q);
    const idx = q.indexOf(",");
    if (idx === -1) break;
    q = q.slice(idx + 1).trim();
  }
  return queries;
}

/* ── Map geometry ──────────────────────────────────────────────────────────── */

export function circleBoundsSize(radius) {
  const r = toNumber(radius);
  return Math.max(r === null ? RADIUS_DEFAULT : r, 1) * 2;
}

/** Payload for `PUT /societies/geofence`. */
export function toGeofencePayload({ latitude, longitude, radius, address }) {
  const point = resolvePoint({ latitude, longitude });
  if (!point.valid || !isValidRadius(radius)) return null;
  const payload = {
    latitude: point.lat,
    longitude: point.lng,
    radius_meters: toNumber(radius),
  };
  if (address && typeof address === "string" && address.trim()) {
    payload.address = address.trim();
  }
  return payload;
}

/**
 * Reverse geocodes coordinates into a clean, human-understandable address with POI/building name.
 */
export async function reverseGeocode(lat, lng) {
  const nLat = toNumber(lat);
  const nLng = toNumber(lng);
  if (nLat === null || nLng === null) return null;

  // 1. Try Nominatim with address details & extratags
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${nLat}&lon=${nLng}&zoom=18&addressdetails=1&accept-language=en&extratags=1&accept-language=en`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "SocietyManagement/1.0",
          "Accept-Language": "en-US,en;q=0.9",
          "accept-language": "en",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && (data.display_name || data.address)) {
        const addr = data.address || {};
        const extra = data.extratags || {};

        // Extract most specific building/POI/landmark/colony name
        const primary =
          data.name ||
          extra.name ||
          extra.brand ||
          addr.building ||
          addr.amenity ||
          addr.office ||
          addr.commercial ||
          addr.company ||
          addr.apartments ||
          addr.residential ||
          addr.housing_estate ||
          addr.estate ||
          addr.subdivision ||
          addr.complex ||
          addr.mall ||
          addr.shop ||
          addr.college ||
          addr.university ||
          addr.school ||
          addr.hospital ||
          addr.leisure ||
          addr.tourism ||
          addr.historic ||
          addr.road ||
          addr.neighbourhood ||
          addr.suburb ||
          "";

        const secondaryParts = [
          addr.residential !== primary ? addr.residential : null,
          addr.road !== primary ? addr.road : null,
          addr.neighbourhood !== primary ? addr.neighbourhood : null,
          addr.suburb !== primary ? addr.suburb : null,
          addr.city || addr.town || addr.village || addr.county,
          addr.state,
          addr.postcode,
        ].filter(Boolean);

        const uniqueParts = Array.from(new Set(secondaryParts)).filter(
          (p) => p && p !== primary
        );

        let formatted = cleanAddressPart(primary)
          ? `${primary}, ${uniqueParts.join(", ")}`
          : uniqueParts.join(", ");

        if (!formatted || formatted.length < 5) {
          formatted = data.display_name;
        }

        return {
          title: primary || data.name || uniqueParts[0] || "Selected Location",
          subtitle: uniqueParts.join(", "),
          formattedAddress: formatted,
          displayName: data.display_name,
        };
      }
    }
  } catch (e) {
    // Fallback to Photon
  }

  // 2. Fallback to Photon reverse
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${nLat}&lon=${nLng}`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      const feat = data?.features?.[0];
      if (feat) {
        const pt = photonFeatureToPoint(feat);
        if (pt) {
          return {
            title: pt.title,
            subtitle: pt.subtitle,
            formattedAddress: pt.label,
            displayName: pt.label,
          };
        }
      }
    }
  } catch (e) {
    // Coordinate fallback
  }

  return {
    title: "Pinned Location",
    subtitle: `${fmtCoord(nLat)}, ${fmtCoord(nLng)}`,
    formattedAddress: `${fmtCoord(nLat)}, ${fmtCoord(nLng)}`,
    displayName: `${fmtCoord(nLat)}, ${fmtCoord(nLng)}`,
  };
}
