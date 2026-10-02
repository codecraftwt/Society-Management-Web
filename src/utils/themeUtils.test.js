import { describe, it, expect } from "vitest";
import {
  isValidHexColor,
  hexToRgb,
  rgbToString,
  adjustBrightness,
  deriveThemeTokens,
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
});
