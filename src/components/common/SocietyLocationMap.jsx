import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  MdAdd,
  MdRemove,
  MdCenterFocusStrong,
  MdMap,
  MdSatelliteAlt,
  MdTerrain,
} from "react-icons/md";

/**
 * SocietyLocationMap
 *
 * Fully featured Google Maps style interactive map:
 * - Google Road, Hybrid Satellite, and Terrain tile layers
 * - Smooth Google Maps style zoom (+/-) and re-center controls
 * - High resolution zoom up to level 21
 * - Google red pin marker with precision tip anchor and drag support
 * - Dynamic geofence radius circle overlay
 * - Non-intrusive pan & zoom handling (does not fight user gestures)
 */

const FALLBACK_CENTER = [20.5937, 78.9629];
const FALLBACK_ZOOM = 5;

/* ── Google Maps Tile Servers ────────────────────────────────────────────── */
const GOOGLE_ROAD_URL =
  import.meta.env.VITE_MAP_ROAD_URL ||
  "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
const GOOGLE_SAT_URL =
  import.meta.env.VITE_MAP_SAT_URL ||
  "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
const GOOGLE_TERRAIN_URL =
  import.meta.env.VITE_MAP_TERRAIN_URL ||
  "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}";

const GOOGLE_SUBDOMAINS = ["mt0", "mt1", "mt2", "mt3"];
const GOOGLE_ATTR =
  '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>';

const LAYERS = [
  {
    id: "road",
    name: "Map",
    icon: MdMap,
    url: GOOGLE_ROAD_URL,
    subdomains: GOOGLE_SUBDOMAINS,
    attribution: GOOGLE_ATTR,
  },
  {
    id: "satellite",
    name: "Satellite",
    icon: MdSatelliteAlt,
    url: GOOGLE_SAT_URL,
    subdomains: GOOGLE_SUBDOMAINS,
    attribution: GOOGLE_ATTR,
  },
  {
    id: "terrain",
    name: "Terrain",
    icon: MdTerrain,
    url: GOOGLE_TERRAIN_URL,
    subdomains: GOOGLE_SUBDOMAINS,
    attribution: GOOGLE_ATTR,
  },
];

/* ── Google-style Red Pin ─────────────────────────────────────────────────── */
const PIN_SVG =
  '<svg width="34" height="48" viewBox="0 0 34 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.45));">' +
  '<path d="M17 0C7.611 0 0 7.611 0 17C0 28.5 17 48 17 48C17 48 34 28.5 34 17C34 7.611 26.389 0 17 0Z" fill="#EA4335"/>' +
  '<path d="M17 2C8.716 2 2 8.716 2 17C2 26.8 15.5 43.6 17 45.4C18.5 43.6 32 26.8 32 17C32 8.716 25.284 2 17 2Z" fill="#EA4335"/>' +
  '<circle cx="17" cy="16.5" r="6.5" fill="#FFFFFF"/>' +
  '<circle cx="17" cy="16.5" r="4.2" fill="#C5221F"/>' +
  '</svg>';

/** Map click / pick listener */
function PickHandler({ onMove }) {
  useMapEvents({
    click: (e) => {
      onMove(e.latlng.lat, e.latlng.lng, "click");
    },
  });
  return null;
}

/** Controls smooth viewport framing on initial load, search selection, or external updates */
function ViewController({ latitude, longitude, radius, flyCount, ready }) {
  const map = useMap();
  const initialFrameDone = useRef(false);
  const lastFlyRef = useRef(flyCount);

  // Initial bounds framing
  useEffect(() => {
    if (!ready || latitude == null || longitude == null) return;
    if (!initialFrameDone.current) {
      initialFrameDone.current = true;
      map.invalidateSize();
      const bounds = L.latLng(latitude, longitude).toBounds(
        Math.max(radius || 50, 1) * 2.5
      );
      map.fitBounds(bounds, { padding: [40, 40], animate: false, maxZoom: 17 });
    }
  }, [map, ready, latitude, longitude, radius]);

  // Trigger smooth flight to location when user picks a search result or hits GPS
  useEffect(() => {
    if (!ready || latitude == null || longitude == null) return;
    if (flyCount !== lastFlyRef.current) {
      lastFlyRef.current = flyCount;
      map.invalidateSize();
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 17), {
        duration: 0.9,
      });
    }
  }, [map, ready, latitude, longitude, flyCount]);

  return null;
}

/** Custom Google Maps styled floating zoom and center controls */
function GoogleMapControls({ onRecenter, hasPoint }) {
  const map = useMap();

  return (
    <div className="set-loc__map-controls">
      {hasPoint && (
        <button
          type="button"
          className="set-loc__ctrl-btn set-loc__ctrl-btn--recenter"
          onClick={onRecenter}
          title="Center on society location"
          aria-label="Center on society location"
        >
          <MdCenterFocusStrong size={19} />
        </button>
      )}

      <div className="set-loc__zoom-box">
        <button
          type="button"
          className="set-loc__ctrl-btn set-loc__ctrl-btn--top"
          onClick={() => map.zoomIn()}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <MdAdd size={20} />
        </button>
        <div className="set-loc__ctrl-divider" />
        <button
          type="button"
          className="set-loc__ctrl-btn set-loc__ctrl-btn--bottom"
          onClick={() => map.zoomOut()}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <MdRemove size={20} />
        </button>
      </div>
    </div>
  );
}

/** Map / Satellite / Terrain pill switcher */
function LayerToggle({ layer, setLayer, mapLabel = "Map", satelliteLabel = "Satellite", terrainLabel = "Terrain" }) {
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  const getLabel = (id) => {
    if (id === "road") return mapLabel;
    if (id === "satellite") return satelliteLabel;
    return terrainLabel;
  };

  return (
    <div
      className="set-loc__layers"
      onPointerDown={stop}
      onClick={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      role="group"
      aria-label="Map layers"
    >
      {LAYERS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`set-loc__layer${layer === id ? " is-active" : ""}`}
          onClick={() => setLayer(id)}
          aria-pressed={layer === id}
        >
          <Icon size={14} aria-hidden="true" />
          <span>{getLabel(id)}</span>
        </button>
      ))}
    </div>
  );
}

/** Announces when Leaflet map instance is fully mounted and measured */
function ReadySignal({ onReady }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

export default function SocietyLocationMap({
  latitude,
  longitude,
  radius,
  onMove,
  onReady,
  flyCount = 0,
  mapLabel = "Map",
  satelliteLabel = "Satellite",
  terrainLabel = "Terrain",
}) {
  const [ready, setReady] = useState(false);
  const mapRef = useRef(null);
  const [layer, setLayer] = useState("road");
  const activeLayer = LAYERS.find((l) => l.id === layer) || LAYERS[0];

  const handleReady = useCallback(() => {
    setReady(true);
    onReady?.();
  }, [onReady]);

  // Google Pin icon
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "set-loc-google-pin",
        html: PIN_SVG,
        iconSize: [34, 48],
        iconAnchor: [17, 48],
      }),
    []
  );

  const hasPoint = latitude != null && longitude != null;
  const center = hasPoint ? [latitude, longitude] : FALLBACK_CENTER;

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !hasPoint) return;
    mapRef.current.flyTo([latitude, longitude], Math.max(mapRef.current.getZoom(), 17), {
      duration: 0.6,
    });
  }, [hasPoint, latitude, longitude]);

  return (
    <div className="set-loc__map-canvas-wrap" style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        ref={mapRef}
        className="set-loc__leaflet" style={{ width: "100%", height: "100%", minHeight: "380px" }}
        center={center}
        zoom={hasPoint ? 17 : FALLBACK_ZOOM}
        minZoom={3}
        maxZoom={21}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={activeLayer.id}
          url={activeLayer.url}
          subdomains={activeLayer.subdomains}
          maxZoom={21}
          maxNativeZoom={20}
          attribution={activeLayer.attribution}
        />

        {hasPoint && (
          <>
            <Circle
              center={[latitude, longitude]}
              radius={Math.max(radius || 50, 1)}
              pathOptions={{
                color: "#10b981",
                weight: 2,
                opacity: 0.9,
                fillColor: "#10b981",
                fillOpacity: 0.16,
              }}
            />
            <Marker
              position={[latitude, longitude]}
              icon={icon}
              draggable
              keyboard
              title="Society location"
              eventHandlers={{
                drag: (e) => {
                  const p = e.target.getLatLng();
                  onMove(p.lat, p.lng, "drag");
                },
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  onMove(p.lat, p.lng, "dragend");
                },
              }}
            />
          </>
        )}

        <PickHandler onMove={onMove} />

        <LayerToggle
          layer={layer}
          setLayer={setLayer}
          mapLabel={mapLabel}
          satelliteLabel={satelliteLabel}
          terrainLabel={terrainLabel}
        />

        <GoogleMapControls onRecenter={handleRecenter} hasPoint={hasPoint} />

        <ViewController
          latitude={latitude}
          longitude={longitude}
          radius={radius}
          flyCount={flyCount}
          ready={ready}
        />

        <ReadySignal onReady={handleReady} />
      </MapContainer>
    </div>
  );
}