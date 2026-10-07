import { describe, it, expect } from "vitest";
import {
  COORD_PRECISION,
  LAT_MAX,
  LAT_MIN,
  LNG_MAX,
  LNG_MIN,
  RADIUS_DEFAULT,
  RADIUS_MAX,
  RADIUS_MIN,
  circleBoundsSize,
  fmtCoord,
  fmtRadius,
  geocodeResultToPoint,
  isValidRadius,
  parseCoord,
  parseLat,
  parseLng,
  progressiveSearchQueries,
  resolvePoint,
  resolveRadius,
  toCoordFields,
  toGeofencePayload,
  toNumber,
} from "./societyLocation";

/* A real Nominatim /search response, trimmed to the fields the UI reads. */
const NOMINATIM_RESULT = {
  lat: "19.1172495",
  lon: "72.8339680",
  display_name:
    "Andheri West, K/W Ward, Mumbai Zone 3, Mumbai, Maharashtra, India",
  place_id: 248680466,
};

describe("societyLocation", () => {
  describe("toNumber", () => {
    it("accepts numbers and numeric strings", () => {
      expect(toNumber(19.076)).toBe(19.076);
      expect(toNumber("72.8777")).toBe(72.8777);
      expect(toNumber(0)).toBe(0);
    });

    it("rejects blanks and non-finite values", () => {
      expect(toNumber(null)).toBeNull();
      expect(toNumber(undefined)).toBeNull();
      expect(toNumber("")).toBeNull();
      expect(toNumber("abc")).toBeNull();
      expect(toNumber(Infinity)).toBeNull();
      expect(toNumber(NaN)).toBeNull();
    });
  });

  /* ── Flow 1: manual coordinates ────────────────────────────────────────── */

  describe("parseCoord", () => {
    it("accepts values inside the range", () => {
      expect(parseCoord("19.0760", LAT_MIN, LAT_MAX)).toBe(19.076);
      expect(parseCoord(" 72.8777 ", LNG_MIN, LNG_MAX)).toBe(72.8777);
    });

    it("accepts the exact range boundaries", () => {
      expect(parseLat(String(LAT_MAX))).toBe(90);
      expect(parseLat(String(LAT_MIN))).toBe(-90);
      expect(parseLng(String(LNG_MAX))).toBe(180);
      expect(parseLng(String(LNG_MIN))).toBe(-180);
    });

    it("rejects values outside the range", () => {
      expect(parseLat("91")).toBeNull();
      expect(parseLat("-91")).toBeNull();
      expect(parseLng("181")).toBeNull();
      expect(parseLng("-181")).toBeNull();
    });

    it("rejects empty and non-numeric input", () => {
      expect(parseLat("")).toBeNull();
      expect(parseLat("   ")).toBeNull();
      expect(parseLat(null)).toBeNull();
      expect(parseLat("abc")).toBeNull();
      expect(parseLat("19,076")).toBeNull();
    });

    it("distinguishes negative and positive ranges", () => {
      expect(parseLat("-45.5")).toBe(-45.5);
      expect(parseLng("-122.4")).toBe(-122.4);
    });
  });

  describe("fmtCoord", () => {
    it("renders at DECIMAL(10, 7) precision", () => {
      expect(COORD_PRECISION).toBe(7);
      expect(fmtCoord(19.076)).toBe("19.0760000");
      expect(fmtCoord(72.833968)).toBe("72.8339680");
      expect(fmtCoord(0)).toBe("0.0000000");
      expect(fmtCoord(-45.5)).toBe("-45.5000000");
    });

    it("rounds sub-precision input to 7 decimals", () => {
      expect(fmtCoord(19.123456789)).toBe("19.1234568");
    });

    it("returns an empty string for missing values", () => {
      expect(fmtCoord(null)).toBe("");
      expect(fmtCoord(undefined)).toBe("");
      expect(fmtCoord("")).toBe("");
    });

    it("round-trips through parseLat without losing value", () => {
      const raw = "19.0760";
      expect(parseLat(fmtCoord(parseLat(raw)))).toBe(parseLat(raw));
    });
  });

  describe("resolvePoint (manual coordinates -> map)", () => {
    it("resolves a valid pair into the marker position", () => {
      const p = resolvePoint({ latitude: "19.0760", longitude: "72.8777" });
      expect(p.valid).toBe(true);
      expect(p.lat).toBe(19.076);
      expect(p.lng).toBe(72.8777);
    });

    it("is invalid until BOTH fields are valid", () => {
      expect(resolvePoint({ latitude: "19.0760", longitude: "" }).valid).toBe(false);
      expect(resolvePoint({ latitude: "", longitude: "72.8777" }).valid).toBe(false);
      expect(resolvePoint({ latitude: "", longitude: "" }).valid).toBe(false);
    });

    it("is invalid when either value is out of range", () => {
      expect(resolvePoint({ latitude: "91", longitude: "72" }).valid).toBe(false);
      expect(resolvePoint({ latitude: "19", longitude: "181" }).valid).toBe(false);
    });
  });

  describe("progressiveSearchQueries", () => {
    it("tries the full address first, then progressively shorter tails", () => {
      expect(
        progressiveSearchQueries(
          "Rukmini Nagar, Front Of Datta Mandir, 2103/47 E, Shahupuri, Kolhapur, Maharashtra 416005"
        )
      ).toEqual([
        "Rukmini Nagar, Front Of Datta Mandir, 2103/47 E, Shahupuri, Kolhapur, Maharashtra 416005",
        "Front Of Datta Mandir, 2103/47 E, Shahupuri, Kolhapur, Maharashtra 416005",
        "2103/47 E, Shahupuri, Kolhapur, Maharashtra 416005",
        "Shahupuri, Kolhapur, Maharashtra 416005",
        "Kolhapur, Maharashtra 416005",
      ]);
    });

    it("keeps a short query as-is", () => {
      expect(progressiveSearchQueries("Shahupuri")).toEqual(["Shahupuri"]);
      expect(progressiveSearchQueries("")).toEqual([]);
      expect(progressiveSearchQueries("   ")).toEqual([]);
    });

    it("capstones at the maximum attempt count", () => {
      const many = progressiveSearchQueries("a, b, c, d, e, f, g, h, i, j", 3);
      expect(many).toEqual(["a, b, c, d, e, f, g, h, i, j", "b, c, d, e, f, g, h, i, j", "c, d, e, f, g, h, i, j"]);
    });

    it("matches reality: the street/area tail is what resolves (16.7002439, 74.2365115)",
      () => {
        const tail = progressiveSearchQueries(
          "Rukmini Nagar, Front Of Datta Mandir, 2103/47 E, Shahupuri, Kolhapur, Maharashtra 416005",
          4
        )[3];
        expect(tail).toBe("Shahupuri, Kolhapur, Maharashtra 416005");
        // Mirrors the geocoder's real answer for that tail, so picking the
        // degraded result still lands the pin on the right area.
        const point = geocodeResultToPoint({
          lat: "16.7002439",
          lon: "74.2365115",
          display_name: "Shahupuri, Rajarampuri, Kolhapur, Maharashtra, India",
        });
        expect(point.valid).toBe(true);
        expect(point.lat).toBeCloseTo(16.7002439, 7);
        expect(point.lng).toBeCloseTo(74.2365115, 7);
      }
    );
  });

  /* ── Flow 2: address -> coordinates ────────────────────────────────────── */

  describe("geocodeResultToPoint (address search -> fields)", () => {
    it("maps a Nominatim result onto valid coordinates", () => {
      const p = geocodeResultToPoint(NOMINATIM_RESULT);
      expect(p).not.toBeNull();
      expect(p.valid).toBe(true);
      expect(p.lat).toBeCloseTo(19.1172495, 7);
      expect(p.lng).toBeCloseTo(72.833968, 7);
      expect(p.label).toBe(NOMINATIM_RESULT.display_name);
    });

    it("returns null for a malformed result", () => {
      expect(geocodeResultToPoint(null)).toBeNull();
      expect(geocodeResultToPoint({})).toBeNull();
      expect(geocodeResultToPoint({ lat: "19.1" })).toBeNull();
      expect(geocodeResultToPoint({ lat: "abc", lon: "72" })).toBeNull();
    });

    it("rejects a result whose coordinates are out of range", () => {
      expect(geocodeResultToPoint({ lat: "91", lon: "72" })).toBeNull();
      expect(geocodeResultToPoint({ lat: "19", lon: "181" })).toBeNull();
    });

    it("survives the array shape the search endpoint returns", () => {
      const [first] = [NOMINATIM_RESULT];
      expect(geocodeResultToPoint(first).valid).toBe(true);
    });

    it("feeds straight into the coordinate fields", () => {
      const p = geocodeResultToPoint(NOMINATIM_RESULT);
      const fields = toCoordFields(p.lat, p.lng);
      expect(fields.latitude).toBe("19.1172495");
      expect(fields.longitude).toBe("72.8339680");
      expect(resolvePoint(fields).valid).toBe(true);
    });
  });

  /* ── Flow 3: marker drag -> coordinates ────────────────────────────────── */

  describe("toCoordFields (marker drag -> fields)", () => {
    it("formats a dragged position at storage precision", () => {
      const fields = toCoordFields(18.5204, 73.8567);
      expect(fields.latitude).toBe("18.5204000");
      expect(fields.longitude).toBe("73.8567000");
    });

    it("keeps all 7 decimals the backend stores", () => {
      const fields = toCoordFields(18.5204001, 73.8567001);
      expect(fields.latitude).toBe("18.5204001");
      expect(fields.longitude).toBe("73.8567001");
    });

    it("round-trips back to the same map position", () => {
      const before = { latitude: 18.5204, longitude: 73.8567 };
      const after = toCoordFields(before.latitude, before.longitude);
      const p = resolvePoint(after);
      expect(p.lat).toBeCloseTo(before.latitude, 7);
      expect(p.lng).toBeCloseTo(before.longitude, 7);
    });

    it("accepts the extreme positions Leaflet can drag to", () => {
      const north = resolvePoint(toCoordFields(85, 179));
      expect(north.valid).toBe(true);
      const southWest = resolvePoint(toCoordFields(-85, -179));
      expect(southWest.valid).toBe(true);
    });
  });

  /* ── Flow 4: radius -> circle ──────────────────────────────────────────── */

  describe("isValidRadius", () => {
    it("accepts the backend-supported range", () => {
      expect(isValidRadius(1)).toBe(true);
      expect(isValidRadius(50)).toBe(true);
      expect(isValidRadius(200)).toBe(true);
      expect(isValidRadius("120")).toBe(true);
      expect(isValidRadius("50.5")).toBe(true);
    });

    it("rejects values outside 1..200", () => {
      expect(isValidRadius(0)).toBe(false);
      expect(isValidRadius(-5)).toBe(false);
      expect(isValidRadius(201)).toBe(false);
      expect(isValidRadius(1000)).toBe(false);
    });

    it("rejects blanks and non-numeric input", () => {
      expect(isValidRadius("")).toBe(false);
      expect(isValidRadius(null)).toBe(false);
      expect(isValidRadius("wide")).toBe(false);
    });

    it("mirrors the backend constants exactly", () => {
      expect(RADIUS_MIN).toBe(1);
      expect(RADIUS_MAX).toBe(200);
    });
  });

  describe("fmtRadius", () => {
    it("keeps whole metres clean", () => {
      expect(fmtRadius(50)).toBe("50");
      expect(fmtRadius("120")).toBe("120");
      expect(fmtRadius(1)).toBe("1");
      expect(fmtRadius(200)).toBe("200");
    });

    it("keeps a genuine half metre but drops float noise", () => {
      expect(fmtRadius(50.5)).toBe("50.5");
      expect(fmtRadius(50.04)).toBe("50");
      expect(fmtRadius(50.06)).toBe("50.1");
    });

    it("returns an empty string for missing values", () => {
      expect(fmtRadius(null)).toBe("");
      expect(fmtRadius("")).toBe("");
      expect(fmtRadius("abc")).toBe("");
    });
  });

  describe("resolveRadius", () => {
    it("keeps a valid value for the circle", () => {
      const r = resolveRadius("75");
      expect(r.valid).toBe(true);
      expect(r.value).toBe(75);
      expect(r.sliderValue).toBe(75);
    });

    it("falls back to the default while the field is empty or invalid", () => {
      expect(resolveRadius("").valid).toBe(false);
      expect(resolveRadius("").sliderValue).toBe(RADIUS_DEFAULT);
      expect(resolveRadius("abc").sliderValue).toBe(RADIUS_DEFAULT);
      expect(resolveRadius("999").sliderValue).toBe(RADIUS_DEFAULT);
    });

    it("grows and shrinks the circle with the value", () => {
      const small = resolveRadius("25").value;
      const large = resolveRadius("175").value;
      expect(large).toBeGreaterThan(small);
      expect(circleBoundsSize(large)).toBeGreaterThan(circleBoundsSize(small));
    });
  });

  describe("circleBoundsSize", () => {
    it("is the diameter, so the circle is centred on the marker", () => {
      expect(circleBoundsSize(50)).toBe(100);
      expect(circleBoundsSize(200)).toBe(400);
    });

    it("never returns less than a usable Leaflet bounds size", () => {
      expect(circleBoundsSize(0)).toBe(2);
      expect(circleBoundsSize(-10)).toBe(2);
      expect(circleBoundsSize(null)).toBe(RADIUS_DEFAULT * 2);
    });
  });

  /* ── Flow 5: save payload ──────────────────────────────────────────────── */

  describe("toGeofencePayload", () => {
    it("builds the exact body the geofence endpoint expects", () => {
      expect(
        toGeofencePayload({
          latitude: "19.0760000",
          longitude: "72.8777000",
          radius: "75",
        })
      ).toEqual({
        latitude: 19.076,
        longitude: 72.8777,
        radius_meters: 75,
      });
    });

    it("returns null when the form is not saveable", () => {
      expect(toGeofencePayload({ latitude: "", longitude: "", radius: "50" })).toBeNull();
      expect(toGeofencePayload({ latitude: "91", longitude: "72", radius: "50" })).toBeNull();
      expect(toGeofencePayload({ latitude: "19", longitude: "72", radius: "0" })).toBeNull();
      expect(toGeofencePayload({ latitude: "19", longitude: "72", radius: "201" })).toBeNull();
    });

    it("includes address in payload when provided", () => {
      expect(
        toGeofencePayload({
          latitude: "19.0760000",
          longitude: "72.8777000",
          radius: "75",
          address: "Green Meadows Society, Wakad, Pune",
        })
      ).toEqual({
        latitude: 19.076,
        longitude: 72.8777,
        radius_meters: 75,
        address: "Green Meadows Society, Wakad, Pune",
      });
    });

    it("round-trips a load response back into a save payload", () => {
      // Shape returned by GET /societies/geofence.
      const loaded = {
        latitude: 18.5204,
        longitude: 73.8567,
        radius_meters: 120,
      };
      const fields = {
        latitude: fmtCoord(loaded.latitude),
        longitude: fmtCoord(loaded.longitude),
        radius: fmtRadius(loaded.radius_meters),
      };
      const payload = toGeofencePayload(fields);
      expect(payload.latitude).toBe(loaded.latitude);
      expect(payload.longitude).toBe(loaded.longitude);
      expect(payload.radius_meters).toBe(loaded.radius_meters);
    });
  });
});
