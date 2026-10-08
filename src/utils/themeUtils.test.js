import { describe, it, expect } from "vitest";
import {
  isValidHexColor,
  hexToRgb,
  rgbToString,
  adjustBrightness,
  deriveThemeTokens,
  CARD_STYLES,
  QUICK_LINK_STYLES,
  normalizeCardStyle,
  normalizeQuickLinkStyle,
} from "./themeUtils";


describe("themeUtils", () => {
  describe("isValidHexColor", () => {
    it("accepts valid 3, 6, and 8 character HEX colors", () => {
      expect(isValidHexColor("#fff")).toBe(true);
      expect(isValidHexColor("#7c3aed")).toBe(true);
      expect(isValidHexColor("#7c3aedff")).toBe(true);
      expect(isValidHexColor("#000000")).toBe(true);
    });

    it("rejects invalid HEX colors, CSS functions, and arbitrary strings", () => {
      expect(isValidHexColor("")).toBe(false);
      expect(isValidHexColor(null)).toBe(false);
      expect(isValidHexColor(undefined)).toBe(false);
      expect(isValidHexColor("rgb(10, 20, 30)")).toBe(false);
      expect(isValidHexColor("rgba(10, 20, 30, 0.5)")).toBe(false);
      expect(isValidHexColor("javascript:alert(1)")).toBe(false);
      expect(isValidHexColor("#12")).toBe(false);
      expect(isValidHexColor("#12345")).toBe(false);
      expect(isValidHexColor("red")).toBe(false);
    });
  });

  describe("hexToRgb & rgbToString", () => {
    it("parses 6-digit hex color correctly", () => {
      const rgb = hexToRgb("#7c3aed");
      expect(rgb).toEqual({ r: 124, g: 58, b: 237 });
      expect(rgbToString(rgb)).toBe("124, 58, 237");
    });

    it("parses 3-digit hex color correctly", () => {
      const rgb = hexToRgb("#fff");
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
      expect(rgbToString(rgb)).toBe("255, 255, 255");
    });

    it("returns null for invalid hex", () => {
      expect(hexToRgb("invalid")).toBeNull();
      expect(rgbToString(null)).toBeNull();
    });
  });

  describe("adjustBrightness", () => {
    it("brightens and darkens colors deterministically", () => {
      const dark = adjustBrightness("#7c3aed", -20);
      expect(isValidHexColor(dark)).toBe(true);
      expect(dark).not.toBe("#7c3aed");

      const light = adjustBrightness("#7c3aed", 20);
      expect(isValidHexColor(light)).toBe(true);
      expect(light).not.toBe("#7c3aed");
    });
  });

  describe("deriveThemeTokens", () => {
    it("generates CSS variable tokens with --accent and --accent-rgb", () => {
      const tokens = deriveThemeTokens("#7c3aed", "#8b5cf6");
      expect(tokens).not.toBeNull();
      expect(tokens["--accent"]).toBe("#7c3aed");
      expect(tokens["--accent-rgb"]).toBe("124, 58, 237");
      expect(tokens["--accent-hover"]).toBeDefined();
      expect(tokens["--accent-light"]).toBe("#8b5cf6");
      expect(tokens["--accent-soft"]).toContain("rgba(124, 58, 237,");
      expect(tokens["--acct-violet"]).toBe("#8b5cf6");
    });

    it("returns null when primary color is invalid", () => {
      expect(deriveThemeTokens("not-a-color")).toBeNull();
    });
  });

  describe("CARD_STYLES & QUICK_LINK_STYLES", () => {
    it("contains at least 8 distinct card styles including default", () => {
      expect(CARD_STYLES.length).toBeGreaterThanOrEqual(10);
      const ids = CARD_STYLES.map((s) => s.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "default",
          "solid",
          "glass",
          "aurora",
          "floating",
          "neon",
          "gradient",
          "neumorphic",
          "accent-rail",
          "minimal",
        ]),
      );
      CARD_STYLES.forEach((s) => {
        expect(s.id).toBeDefined();
        expect(s.name).toBeDefined();
        expect(s.description).toBeDefined();
      });
    });

    it("contains at least 8 distinct quick link styles including default", () => {
      expect(QUICK_LINK_STYLES.length).toBeGreaterThanOrEqual(10);
      const ids = QUICK_LINK_STYLES.map((s) => s.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "default",
          "solid",
          "glass",
          "aurora",
          "floating",
          "neon",
          "gradient",
          "neumorphic",
          "accent-rail",
          "minimal",
        ]),
      );
      QUICK_LINK_STYLES.forEach((s) => {
        expect(s.id).toBeDefined();
        expect(s.name).toBeDefined();
      });
    });

    it("normalizes legacy style identifiers correctly", () => {
      expect(normalizeCardStyle("current")).toBe("default");
      expect(normalizeCardStyle("aurora-glass")).toBe("aurora");
      expect(normalizeCardStyle("floating-3d")).toBe("floating");
      expect(normalizeCardStyle("glass")).toBe("glass");
      expect(normalizeCardStyle("solid")).toBe("solid");

      expect(normalizeQuickLinkStyle("current")).toBe("default");
      expect(normalizeQuickLinkStyle("glass-tile")).toBe("glass");
      expect(normalizeQuickLinkStyle("aurora-tile")).toBe("aurora");
      expect(normalizeQuickLinkStyle("neon-edge")).toBe("neon");
      expect(normalizeQuickLinkStyle("solid")).toBe("solid");
    });
  });

});

