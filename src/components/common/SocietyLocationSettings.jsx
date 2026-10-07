import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  MdCheckCircle,
  MdClose,
  MdExplore,
  MdGpsFixed,
  MdInfoOutline,
  MdOpenInNew,
  MdPlace,
  MdSearch,
  MdTune,
  MdWarningAmber,
  MdRefresh,
  MdShield,
} from "react-icons/md";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  RADIUS_DEFAULT,
  RADIUS_MAX,
  RADIUS_MIN,
  fmtCoord,
  fmtRadius,
  formatDistance,
  geocodeResultToPoint,
  generateSmartLocationCandidates,
  haversineDistanceKm,
  photonFeatureToPoint,
  parseCoordString,
  progressiveSearchQueries,
  resolvePoint,
  resolveRadius,
  reverseGeocode,
  toCoordFields,
  toGeofencePayload,
  toNumber,
} from "../../utils/societyLocation";
import SocietyLocationMap from "./SocietyLocationMap";
import "./SocietyLocationSettings.css";

const RADIUS_PRESETS = [30, 50, 100, 150, 200];

const GEOCODE_URL =
  import.meta.env.VITE_GEOCODE_URL || "https://nominatim.openstreetmap.org";

function ErrorIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function SocietyLocationSettings() {
  const { t } = useLang();

  /* ── Form State ────────────────────────────────────────────────────────── */
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState(String(RADIUS_DEFAULT));
  const [address, setAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [locationTitle, setLocationTitle] = useState("");

  /* ── Request & UI State ─────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [flyCount, setFlyCount] = useState(0);

  /* ── Address search & Autocomplete ─────────────────────────────────────── */
  const [results, setResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const resultsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  /* ── Validation ────────────────────────────────────────────────────────── */
  const point = resolvePoint({ latitude, longitude });
  const radiusState = resolveRadius(radius);

  const latNum = point.lat;
  const lngNum = point.lng;

  const latError =
    latitude.trim() && latNum === null
      ? t("asLocErrLat", "Latitude must be a number between -90 and 90.")
      : "";
  const lngError =
    longitude.trim() && lngNum === null
      ? t("asLocErrLng", "Longitude must be a number between -180 and 180.")
      : "";
  const radiusError = radiusState.valid
    ? ""
    : t(
        "asLocErrRadius",
        `Radius must be between ${RADIUS_MIN} and ${RADIUS_MAX} meters.`
      );

  const coordsValid = point.valid;
  const radiusValid = radiusState.valid;
  const canSave = coordsValid && radiusValid && !saving && !loading;

  /* ── Reverse Geocode Sync ───────────────────────────────────────────────── */
  const revTimerRef = useRef(null);
  const syncAddressFromCoords = useCallback((lat, lng) => {
    if (lat == null || lng == null) return;
    if (revTimerRef.current) clearTimeout(revTimerRef.current);
    revTimerRef.current = setTimeout(async () => {
      try {
        const geo = await reverseGeocode(lat, lng);
        if (!aliveRef.current) return;
        if (geo && geo.formattedAddress) {
          setAddress(geo.formattedAddress);
          setCurrentAddress(geo.formattedAddress);
          if (geo.title && geo.title !== 'Pinned Location') {
            setLocationTitle(geo.title);
          }
        }
      } catch (e) {
        // Ignore reverse geocode failures
      }
    }, 450);
  }, []);

  /* ── Coordinate Sync ───────────────────────────────────────────────────── */
  const setCoordinates = useCallback((lat, lng, fly = false) => {
    const fields = toCoordFields(lat, lng);
    setLatitude(fields.latitude);
    setLongitude(fields.longitude);
    setNotice("");
    syncAddressFromCoords(lat, lng);
    if (fly) {
      setFlyCount((c) => c + 1);
    }
  }, [syncAddressFromCoords]);

  const handleMapMove = useCallback((lat, lng) => {
    const fields = toCoordFields(lat, lng);
    setLatitude(fields.latitude);
    setLongitude(fields.longitude);
    setNotice("");
    syncAddressFromCoords(lat, lng);
  }, [syncAddressFromCoords]);

  /* ── Load Geofence from API ────────────────────────────────────────────── */
  const applyGeofence = useCallback((geo) => {
    const lat = toNumber(geo?.latitude);
    const lng = toNumber(geo?.longitude);
    const rad = toNumber(geo?.radius_meters);
    setLatitude(lat === null ? "" : fmtCoord(lat));
    setLongitude(lng === null ? "" : fmtCoord(lng));
    if (rad !== null) setRadius(fmtRadius(rad));
    setSavedData({
      latitude: lat,
      longitude: lng,
      radius: rad || RADIUS_DEFAULT,
      isConfigured: lat !== null && lng !== null,
    });
    if (lat !== null && lng !== null) {
      syncAddressFromCoords(lat, lng);
    }
  }, [syncAddressFromCoords]);

  const loadGeofence = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await API.get("/societies/geofence");
      if (!aliveRef.current) return;
      applyGeofence(res?.data?.geofence);
      if (res?.data?.address) {
        setCurrentAddress(res.data.address);
      }
    } catch (err) {
      if (!aliveRef.current) return;
      setLoadError(
        err?.response?.data?.message ||
          t("asLocLoadFail", "Could not load the society location.")
      );
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [applyGeofence, t]);

  useEffect(() => {
    loadGeofence();
  }, [loadGeofence]);

  /* ── Geolocation (Device Location) ─────────────────────────────────────── */
  const geoSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const handleUseCurrentLocation = useCallback(() => {
    if (!geoSupported) return;
    setLocating(true);
    setNotice("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!aliveRef.current) return;
        setCoordinates(pos.coords.latitude, pos.coords.longitude, true);
        setAddress("");
        setNotice(t("asLocGeoOk", "Coordinates filled from your device's current location."));
        setLocating(false);
      },
      (err) => {
        if (!aliveRef.current) return;
        setLocating(false);
        setNotice(
          err?.code === 1
            ? t(
                "asLocGeoDenied",
                "Location permission denied. Please enter coordinates manually."
              )
            : t("asLocGeoFail", "Could not determine your current location.")
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [geoSupported, setCoordinates, t]);

  /* ── Live Smart Location Search (Nearest prioritized first) ─────────────── */
  const fetchLocationSuggestions = useCallback(
    async (query) => {
      const q = String(query || "").trim();
      if (!q) return [];

      // 1. Direct coordinate string check
      const coordPair = parseCoordString(q);
      if (coordPair) {
        return [
          {
            id: `coord-${coordPair.lat}-${coordPair.lng}`,
            title: `Coordinates: ${fmtCoord(coordPair.lat)}, ${fmtCoord(coordPair.lng)}`,
            subtitle: "Direct latitude and longitude input",
            label: `${fmtCoord(coordPair.lat)}, ${fmtCoord(coordPair.lng)}`,
            lat: coordPair.lat,
            lng: coordPair.lng,
            isCoord: true,
          },
        ];
      }

      // Proximity reference center
      const refLat = latNum != null ? latNum : 16.7024;
      const refLng = lngNum != null ? lngNum : 74.2523;

      const candidates = generateSmartLocationCandidates(q);
      const seenLabels = new Set();
      const rawItems = [];

      for (const cand of candidates) {
        // A. Photon with location bias (returns local near matches first)
        try {
          const bias = refLat && refLng ? `&lat=${refLat}&lon=${refLng}` : "";
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(cand)}${bias}&limit=6`,
            { headers: { Accept: "application/json" } }
          );
          if (photonRes.ok) {
            const data = await photonRes.json();
            if (Array.isArray(data?.features)) {
              data.features.forEach((feat) => {
                const pt = photonFeatureToPoint(feat);
                if (pt && !seenLabels.has(pt.label)) {
                  seenLabels.add(pt.label);
                  rawItems.push(pt);
                }
              });
            }
          }
        } catch {
          // Continue
        }

        // B. Nominatim fallback / expansion
        if (rawItems.length < 4) {
          try {
            const params = new URLSearchParams({
              format: "jsonv2",
              q: cand,
              limit: "4",
              addressdetails: "1",
            });
            const nomRes = await fetch(`${GEOCODE_URL}/search?${params}`, {
              headers: { Accept: "application/json", "Accept-Language": "en" },
            });
            if (nomRes.ok) {
              const data = await nomRes.json();
              if (Array.isArray(data)) {
                data.forEach((item) => {
                  const pt = geocodeResultToPoint(item);
                  if (pt && !seenLabels.has(pt.label)) {
                    seenLabels.add(pt.label);
                    rawItems.push(pt);
                  }
                });
              }
            }
          } catch {
            // Continue
          }
        }

        if (rawItems.length >= 6) break;
      }

      // Attach proximity distance and rank closest matches to the top
      const withDistance = rawItems.map((item) => {
        const distKm = haversineDistanceKm(refLat, refLng, item.lat, item.lng);
        return {
          ...item,
          distanceKm: distKm,
          distanceText: formatDistance(distKm),
        };
      });

      withDistance.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });

      return withDistance;
    },
    [latNum, lngNum]
  );

  const handleAddressChange = (e) => {
    const val = e.target.value;
    setAddress(val);
    setHighlightIndex(-1);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const q = val.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }

    const coordPair = parseCoordString(q);
    if (coordPair) {
      setResults([
        {
          id: `coord-${coordPair.lat}-${coordPair.lng}`,
          title: `Coordinates: ${fmtCoord(coordPair.lat)}, ${fmtCoord(coordPair.lng)}`,
          subtitle: "Direct latitude and longitude input",
          label: `${fmtCoord(coordPair.lat)}, ${fmtCoord(coordPair.lng)}`,
          lat: coordPair.lat,
          lng: coordPair.lng,
          isCoord: true,
        },
      ]);
      setSearchOpen(true);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await fetchLocationSuggestions(q);
        if (!aliveRef.current) return;
        setResults(suggestions);
        setSearchOpen(suggestions.length > 0);
        if (suggestions.length === 0) {
          setNotice(t("asLocNoResults", "No matching location found."));
        } else {
          setNotice("");
        }
      } catch {
        if (aliveRef.current) {
          setResults([]);
          setSearchOpen(false);
        }
      } finally {
        if (aliveRef.current) setSearching(false);
      }
    }, 320);
  };

  const handleManualSearch = async () => {
    const q = address.trim();
    if (!q) return;
    setSearching(true);
    setNotice("");
    try {
      const suggestions = await fetchLocationSuggestions(q);
      if (!aliveRef.current) return;
      setResults(suggestions);
      setSearchOpen(suggestions.length > 0);
      if (suggestions.length === 0) {
        setNotice(t("asLocNoResults", "No matching location found."));
      }
    } catch {
      if (aliveRef.current) {
        setNotice(t("asLocSearchFail", "Location search failed. Please try again."));
      }
    } finally {
      if (aliveRef.current) setSearching(false);
    }
  };

  const handlePickResult = useCallback(
    (item) => {
      if (!item) return;
      setCoordinates(item.lat, item.lng, true);
      setAddress(item.title || item.label);
      setLocationTitle(item.title || "");
      setCurrentAddress(item.label || item.subtitle || item.title);
      setResults([]);
      setSearchOpen(false);
      setHighlightIndex(-1);
      setNotice(
        t("asLocPicked", "Location set: {{place}}", {
          place: item.title || item.label,
        })
      );
    },
    [setCoordinates, t]
  );

  const handleClearSearch = () => {
    setAddress("");
    setResults([]);
    setSearchOpen(false);
    setHighlightIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!searchOpen || results.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleManualSearch();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        handlePickResult(results[highlightIndex]);
      } else {
        handlePickResult(results[0]);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onDocDown = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [searchOpen]);

  /* ── Save Geofence ─────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!canSave) return;
    const payload = toGeofencePayload({
      latitude,
      longitude,
      radius,
      address: currentAddress || address,
    });
    if (!payload) return;

    setSaving(true);
    setNotice("");
    setSaved(false);
    try {
      const res = await API.put("/societies/geofence", payload);
      if (!aliveRef.current) return;
      toast.success(t("asLocSaved", "Society location saved successfully."));
      setSaved(true);
      if (res?.data?.address) {
        setCurrentAddress(res.data.address);
      }
      setSavedData({
        latitude: point.lat,
        longitude: point.lng,
        radius: toNumber(radius),
        isConfigured: true,
      });
      setTimeout(() => {
        if (aliveRef.current) setSaved(false);
      }, 3000);
    } catch (err) {
      if (!aliveRef.current) return;
      toast.error(
        err?.response?.data?.message ||
          t("asLocSaveFail", "Could not save the society location.")
      );
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  }

  const hasUnsavedChanges =
    Boolean(
      savedData?.isConfigured &&
      coordsValid &&
      radiusValid &&
      (Math.abs((savedData.latitude || 0) - (latNum || 0)) > 0.000001 ||
        Math.abs((savedData.longitude || 0) - (lngNum || 0)) > 0.000001 ||
        Math.abs((savedData.radius || 0) - (radiusState.value || 0)) > 0.1)
    );

  const coordsSummary =
    coordsValid && radiusValid
      ? `${fmtCoord(latNum)}, ${fmtCoord(lngNum)}`
      : "";

  return (
    <div className="set-loc">
      <div className="set-ws set-ws--loc">
        {/* ══ Left Column: Config Panel ═════════════════════════════════ */}
        <div className="set-loc__panel">
          {loading ? (
            <div className="set-loc__loading">
              <span className="set-spinner" />
              <p>{t("loadingProfile", "Loading…")}</p>
            </div>
          ) : (
            <>
              {/* ── 0. Current Saved Location Summary Banner ── */}
              <div className="set-loc__current-card">
                <div className="set-loc__current-head">
                  <div className="set-loc__current-title-wrap">
                    <span className="set-loc__current-icon">
                      <MdPlace size={17} />
                    </span>
                    <div className="set-loc__current-text-box">
                      <div className="set-loc__current-title">
                        {locationTitle || savedData?.societyName || (savedData?.isConfigured ? t("asLocConfigured", "Society Location Configured") : t("asLocNotConfigured", "No Location Configured"))}
                      </div>
                      <div className="set-loc__current-address">
                        {currentAddress || (savedData?.isConfigured ? t("asLocAddressSyncing", "Detecting address…") : t("asLocNotSetSub", "Pin your society on the map to set location"))}
                      </div>
                    </div>
                  </div>
                  <div className={"set-loc__status-chip " + (savedData?.isConfigured ? "is-configured" : "is-empty")}>
                    <span className="set-loc__status-dot" />
                    <span>
                      {savedData?.isConfigured
                        ? t("asLocActive", "Configured & Active")
                        : t("asLocNotSet", "Not Set Yet")}
                    </span>
                  </div>
                </div>

                {hasUnsavedChanges && (
                  <div className="set-loc__unsaved-alert">
                    <MdWarningAmber size={14} />
                    <span>
                      {t("asLocUnsavedWarn", "You have unsaved changes. Click 'Save Location' to apply.")}
                    </span>
                  </div>
                )}
              </div>

              {/* ── 1. Search Location ── */}
              <div className="set-group set-loc__group">
                <div className="set-group__head">
                  <span className="set-group__title">
                    <MdSearch size={16} aria-hidden="true" />
                    {t("asLocSearchTitle", "Find your society")}
                  </span>
                  {geoSupported && (
                    <button
                      type="button"
                      className="set-loc__gps-btn"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      title={t("asLocUseCurrent", "Use Current Location")}
                    >
                      <MdGpsFixed
                        className={locating ? "set-spin-icon" : ""}
                        size={13}
                        aria-hidden="true"
                      />
                      <span>{locating ? t("asLocLocating", "Locating…") : "My GPS"}</span>
                    </button>
                  )}
                </div>

                <div className="set-f set-loc__search" ref={resultsRef}>
                  <label className="set-f__label" htmlFor="set-loc-address">
                    {t("asLocAddress", "Address / Search Location")}
                  </label>
                  <div className="set-field">
                    <span className="set-field__icon set-loc__field-icon-red" aria-hidden="true">
                      <MdPlace size={17} />
                    </span>
                    <input
                      id="set-loc-address"
                      className="set-field__input"
                      value={address}
                      onChange={handleAddressChange}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => {
                        if (results.length > 0) setSearchOpen(true);
                      }}
                      placeholder={t(
                        "asLocAddressPh",
                        "Search an address, landmark, colony, or lat,lng"
                      )}
                      autoComplete="off"
                    />

                    <div className="set-field__actions-wrap">
                      {address && (
                        <button
                          type="button"
                          className="set-loc__clear-btn"
                          onClick={handleClearSearch}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <MdClose size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="set-field__action-btn"
                        onClick={handleManualSearch}
                        disabled={searching || !address.trim()}
                        aria-label={t("asLocSearchBtn", "Search location")}
                      >
                        {searching ? (
                          <span className="set-spinner set-loc__spin-xs" />
                        ) : (
                          <MdSearch size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {searchOpen && results.length > 0 && (
                    <ul className="set-loc__results" role="listbox">
                      {results.map((item, i) => (
                        <li
                          key={item.id || `${item.lat}-${item.lng}-${i}`}
                          role="option"
                          aria-selected={highlightIndex === i}
                        >
                          <button
                            type="button"
                            className={`set-loc__result${
                              highlightIndex === i ? " is-highlighted" : ""
                            }`}
                            onClick={() => handlePickResult(item)}
                          >
                            <MdPlace size={16} aria-hidden="true" />
                            <span className="set-loc__result-text">
                              <span className="set-loc__result-name">
                                {item.title || item.label}
                              </span>
                              {item.subtitle && item.subtitle !== item.title && (
                                <span className="set-loc__result-sub">
                                  {item.subtitle}
                                </span>
                              )}
                              <span className="set-loc__result-meta">
                                <span className="set-loc__result-coords">
                                  {fmtCoord(item.lat)}, {fmtCoord(item.lng)}
                                </span>
                                {item.distanceText && (
                                  <span className="set-loc__result-dist">
                                    {item.distanceText}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {notice && (
                  <span className="set-loc__notice" role="status">
                    <MdInfoOutline size={14} aria-hidden="true" />
                    {notice}
                  </span>
                )}
              </div>

              {/* ── 2. Coordinates ── */}
              <div className="set-group set-loc__group set-loc__group--coords">
                <div className="set-group__head">
                  <span className="set-group__title">
                    <span className="set-group__icon-box set-group__icon-box--blue">
                      <MdExplore size={15} aria-hidden="true" />
                    </span>
                    {t("asLocCoordsTitle", "Society Coordinates")}
                  </span>
                  <span className={`set-group__tag ${coordsValid ? "set-group__tag--live" : "set-group__tag--req"}`}>
                    <span className="set-group__tag-dot" />
                    {coordsValid ? t("asLocSynced", "Live Synced") : t("asLocRequired", "Required")}
                  </span>
                </div>

                <div className="set-grid set-grid--2 set-loc__coords-grid">
                  <div className="set-f set-loc__coord-col">
                    <label className="set-f__label" htmlFor="set-loc-lat">
                      {t("asLocLat", "Latitude")}
                      <span className="set-f__req">*</span>
                    </label>
                    <div className={`set-loc__coord-card ${latError ? "has-error" : ""}`}>
                      <span className="set-loc__coord-tag set-loc__coord-tag--lat">LAT</span>
                      <input
                        id="set-loc-lat"
                        className="set-loc__coord-val"
                        value={latitude}
                        onChange={(e) => {
                          setLatitude(e.target.value);
                          setNotice("");
                        }}
                        placeholder="16.7024768"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={latError ? "true" : undefined}
                      />
                    </div>
                    {latError && (
                      <span className="set-f__err" role="alert">
                        <ErrorIcon />
                        {latError}
                      </span>
                    )}
                  </div>

                  <div className="set-f set-loc__coord-col">
                    <label className="set-f__label" htmlFor="set-loc-lng">
                      {t("asLocLng", "Longitude")}
                      <span className="set-f__req">*</span>
                    </label>
                    <div className={`set-loc__coord-card ${lngError ? "has-error" : ""}`}>
                      <span className="set-loc__coord-tag set-loc__coord-tag--lng">LNG</span>
                      <input
                        id="set-loc-lng"
                        className="set-loc__coord-val"
                        value={longitude}
                        onChange={(e) => {
                          setLongitude(e.target.value);
                          setNotice("");
                        }}
                        placeholder="74.2523944"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={lngError ? "true" : undefined}
                      />
                    </div>
                    {lngError && (
                      <span className="set-f__err" role="alert">
                        <ErrorIcon />
                        {lngError}
                      </span>
                    )}
                  </div>
                </div>

                <div className="set-loc__hint">
                  <MdInfoOutline size={13} aria-hidden="true" />
                  <span>
                    {t(
                      "asLocCoordsHint",
                      "Type coordinates or drag the pin on the map — both stay in sync."
                    )}
                  </span>
                </div>
              </div>

              {/* ── 3. Radius & Presets ── */}
              <div className="set-group set-loc__group set-loc__group--radius">
                <div className="set-group__head">
                  <span className="set-group__title">
                    <span className="set-group__icon-box set-group__icon-box--green">
                      <MdTune size={15} aria-hidden="true" />
                    </span>
                    {t("asLocRadiusTitle", "Punch-in Radius")}
                  </span>
                  <span className="set-loc__radius-badge">
                    <span className="set-loc__radius-dot" />
                    {radiusState.valid ? `${radiusState.value} m` : "—"}
                  </span>
                </div>

                <div className="set-loc__radius-control-row">
                  <div className="set-loc__slider-wrap">
                    <input
                      type="range"
                      id="set-loc-radius-slider"
                      className={`set-loc__slider ${radiusError ? "set-loc__slider--err" : ""}`}
                      min={RADIUS_MIN}
                      max={RADIUS_MAX}
                      step={1}
                      value={radiusState.sliderValue}
                      onChange={(e) => {
                        setRadius(e.target.value);
                        setNotice("");
                      }}
                      aria-label={t("asLocRadiusSlider", "Radius in meters")}
                    />
                  </div>

                  <div className={`set-loc__radius-box ${radiusError ? "has-error" : ""}`}>
                    <input
                      id="set-loc-radius-number"
                      className="set-loc__radius-input-val"
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      value={radius}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9]/g, "");
                        setRadius(sanitized);
                        setNotice("");
                      }}
                      placeholder="50"
                      autoComplete="off"
                    />
                    <span className="set-loc__radius-unit">m</span>
                  </div>
                </div>

                {/* Modern Segmented Preset Chips */}
                <div className="set-loc__presets-bar">
                  <span className="set-loc__presets-label">Presets:</span>
                  <div className="set-loc__presets-chips">
                    {RADIUS_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`set-loc__preset-chip ${
                          Number(radius) === m ? "is-active" : ""
                        }`}
                        onClick={() => {
                          setRadius(String(m));
                          setNotice("");
                        }}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                {radiusError ? (
                  <span className="set-f__err" role="alert">
                    <ErrorIcon />
                    {radiusError}
                  </span>
                ) : (
                  <div className="set-loc__hint">
                    <MdShield size={13} aria-hidden="true" />
                    <span>
                      {t(
                        "asLocRadiusHint",
                        `Guards can punch in within ${RADIUS_MIN}–${RADIUS_MAX} meters of this point.`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* ── 4. Action Footer ── */}
              <div className="set-loc__foot">
                {loadError ? (
                  <span className="set-loc__notice set-loc__notice--err" role="alert">
                    <MdWarningAmber size={14} />
                    {loadError}
                  </span>
                ) : (
                  <span className="set-loc__foot-hint">
                    <MdInfoOutline size={13} />
                    <span>
                      {coordsValid && radiusValid
                        ? t(
                            "asLocReady",
                            "Drag marker or tap map to fine-tune, then save."
                          )
                        : t("asLocIncomplete", "Enter valid coordinates to save.")}
                    </span>
                  </span>
                )}

                <div className="set-loc__actions-group">
                  {saved && (
                    <span className="set-loc__saved-pill">
                      <MdCheckCircle size={14} />
                      {t("asLocSavedShort", "Saved")}
                    </span>
                  )}
                  <button
                    type="button"
                    className="set-loc__btn set-loc__btn--ghost"
                    onClick={loadGeofence}
                    disabled={saving || loading}
                    title="Reset to saved coordinates"
                  >
                    <MdRefresh size={15} />
                    <span>{t("asLocReset", "Reset")}</span>
                  </button>
                  <button
                    type="button"
                    className="set-loc__btn set-loc__btn--save"
                    onClick={handleSave}
                    disabled={!canSave}
                  >
                    {saving ? (
                      <span className="set-spinner set-loc__spin-btn" />
                    ) : (
                      <MdCheckCircle size={15} />
                    )}
                    <span>
                      {saving ? t("saving", "Saving…") : t("asLocSaveBtn", "Save Location")}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ══ Right Column: Google Maps Interactive Preview ═════════════ */}
        <div className="set-loc__mapwrap">
          <div className="set-loc__map-head">
            <div className="set-loc__map-title-row">
              <span className="set-loc__live-dot" aria-hidden="true" />
              <span className="set-loc__map-title">
                {t("asLocMapTitle", "Google Maps Location Preview")}
              </span>
            </div>
          </div>

          <div className="set-loc__map">
            {loading ? (
              <div className="set-loc__map-loading">
                <span className="set-spinner" />
              </div>
            ) : (
              <SocietyLocationMap
                latitude={latNum}
                longitude={lngNum}
                radius={radiusValid ? radiusState.value : RADIUS_DEFAULT}
                onMove={handleMapMove}
                flyCount={flyCount}
                mapLabel={t("asLocLayerMap", "Map")}
                satelliteLabel={t("asLocLayerSat", "Satellite")}
                terrainLabel={t("asLocLayerTerrain", "Terrain")}
              />
            )}
          </div>

          <p className="set-loc__map-foot">
            <MdOpenInNew size={13} aria-hidden="true" />
            <span>
              {t(
                "asLocMapFoot",
                "Drag the red pin or click anywhere on the Google map to fine-tune your society's location."
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
