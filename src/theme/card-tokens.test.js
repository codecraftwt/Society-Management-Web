import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Guards the invariants of src/theme/card-tokens.css that Phase 2 migration
 * depends on. Runs in vitest's `environment: "node"` (vite.config.js:69-72)
 * with no jsdom, matching the convention of themeUtils.test.js.
 *
 * Component render tests are NOT possible without adding @testing-library/react
 * and jsdom, which is deliberately out of scope for Phase 1.
 */

const here = dirname(fileURLToPath(import.meta.url));
const rawCss = readFileSync(resolve(here, "../theme/card-tokens.css"), "utf8");

// Assertions run against declarations only. The file's comments legitimately
// mention !important and var(--x-rgb) while explaining what the CSS avoids.
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");

const TONES = ["neutral", "brand", "success", "warning", "danger", "info"];
const TIERS = [
  ":root",
  "html.role-theme",
  "html.light",
  "html.light.role-theme",
];

describe("card-tokens.css namespace", () => {
  it("uses only the --ui-card-* namespace", () => {
    const declared = [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    const offenders = declared.filter((name) => !name.startsWith("--ui-card-"));
    expect(offenders).toEqual([]);
  });

  it("never declares a --stat-* token", () => {
    // --stat-* stays defective until its own dedicated phase; inheriting it
    // here would bake the bug into the global foundation.
    expect(css).not.toMatch(/^\s*--stat-/m);
  });

  it("introduces none of the forbidden token families", () => {
    for (const prefix of ["--kpi-", "--dashboard-", "--metric-", "--stats-", "--society-", "--theme-", "--dynamic-"]) {
      expect(css).not.toContain(`${prefix}`);
    }
  });

  it("redefines no pre-existing theme token", () => {
    const protectedTokens = [
      "--accent",
      "--accent-hover",
      "--accent-dark",
      "--accent-light",
      "--accent-soft",
      "--accent-light-bg",
      "--accent-rgb",
      "--card-bg",
      "--card-inner-bg",
      "--card-inner-bg-hover",
      "--card-inner-border",
      "--glass-border",
      "--shadow-sm",
      "--shadow-hover",
      "--text-primary",
      "--text-secondary",
      "--success",
      "--warning",
      "--danger",
      "--info",
      "--blur",
      "--radius-lg",
    ];
    for (const token of protectedTokens) {
      const declaration = new RegExp(`^\\s*${token}\\s*:`, "m");
      expect(css, `${token} must not be redefined`).not.toMatch(declaration);
    }
  });
});

describe("card-tokens.css tone coverage", () => {
  it("defines all six semantic tones", () => {
    for (const tone of TONES) {
      expect(css).toContain(`--ui-card-tone-${tone}-color:`);
      expect(css).toContain(`--ui-card-tone-${tone}-bg:`);
      expect(css).toContain(`--ui-card-tone-${tone}-border:`);
    }
  });

  it("sources every tone from the bill section's --stat-* tokens", () => {
    // Requested behaviour: the global card must be identical to the
    // /superadmin/manage-bills `.stat-card`, so each tone aliases the same
    // token triple that section uses (index.css:2620-2693, role-theme.css:
    // 92-106 dark / 202-216 auth light, light.css:94-108 public light).
    // brand->purple, success->green, warning->amber, danger->red, info->blue.
    const map = {
      brand: "purple",
      success: "green",
      warning: "amber",
      danger: "red",
      info: "blue",
    };
    for (const [tone, stat] of Object.entries(map)) {
      for (const role of ["bg", "border", "color"]) {
        expect(css, `${tone} -> ${stat} ${role}`).toMatch(
          new RegExp(`--ui-card-tone-${tone}-${role}:\\s*var\\(--stat-${stat}-${role}\\)`),
        );
      }
    }
  });

  it("declares each tone exactly once, so a tier cannot fork it", () => {
    // All four tiers inherit through --stat-*. A second declaration of the
    // same tone in a tier block would silently fork the palette per theme.
    for (const tone of TONES) {
      for (const role of ["bg", "border", "color"]) {
        const hits = [...css.matchAll(new RegExp(`--ui-card-tone-${tone}-${role}:`, "g"))];
        expect(hits.length, `--ui-card-tone-${tone}-${role} declared ${hits.length}x`).toBe(1);
      }
    }
  });

  it("never references a tone-class variable from a tier block", () => {
    // Regression guard. A var() inside a custom property is substituted at
    // computed-value time on the element where that property is DECLARED.
    // --ui-card-tone-color only exists on the .ui-stat-card--tone-* classes, a
    // descendant of <html>, so referencing it from :root or a tier block
    // resolves to the guaranteed-invalid value and silently drops the whole
    // declaration. That bug rendered every card with no background at all.
    const tierBlocks = [...css.matchAll(/(^|\n)(:root|html\.[a-z.-]+)\s*\{([\s\S]*?)\n\}/g)];
    expect(tierBlocks.length).toBeGreaterThan(0);
    for (const block of tierBlocks) {
      expect(block[3], `${block[2]} must not read a tone-class variable`).not.toMatch(
        /var\(--ui-card-tone-color/,
      );
    }
  });
});

describe("card-tokens.css tiering", () => {
  it("declares every tier the existing architecture uses", () => {
    for (const tier of TIERS) {
      expect(css).toContain(`${tier} {`);
    }
  });

  it("separates the authenticated-light tier on two classes", () => {
    // html.light and html.role-theme are both (0,1,1) and the <html> element
    // can carry both, so the combined tier must exist and must be the most
    // specific one (index.css:16-19).
    expect(css).toMatch(/html\.light\.role-theme\s*\{/);
  });

  it("still declares a separate authenticated-light tier", () => {
    // The tinting itself now comes from --stat-*, but the glass decoration and
    // the border drop still differ there, so the tier must remain.
    const block = css.slice(css.indexOf("html.light.role-theme {"));
    expect(block).toContain("--ui-card-stat-border-width: 0px");
  });
});

describe("card-tokens.css hygiene", () => {
  it("uses no !important", () => {
    expect(css).not.toContain("!important");
  });

  it("references only theme variables that exist", () => {
    const referenced = [...new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]))];
    const known = [
      "--accent", "--accent-soft",
      "--card-bg", "--glass-border", "--blur",
      "--shadow-sm", "--shadow-hover",
      "--text-primary", "--text-secondary",
      "--success", "--warning", "--danger", "--info",
      // --stat-* are owned by the bill section; the card system only aliases
      // them. Existence is asserted below rather than assumed.
      "--stat-purple-bg", "--stat-purple-border", "--stat-purple-color",
      "--stat-green-bg", "--stat-green-border", "--stat-green-color",
      "--stat-amber-bg", "--stat-amber-border", "--stat-amber-color",
      "--stat-red-bg", "--stat-red-border", "--stat-red-color",
      "--stat-blue-bg", "--stat-blue-border", "--stat-blue-color",
    ];
    const external = referenced.filter((name) => !known.includes(name) && !name.startsWith("--ui-card-"));
    expect(external).toEqual([]);
  });

  it("only aliases --stat-* tokens that are actually defined somewhere", () => {
    // The hygiene allowlist above would happily accept a typo, so verify each
    // referenced --stat-* is declared in one of the real theme stylesheets.
    const sources = ["index.css", "light.css", "theme/role-theme.css"].map((rel) =>
      readFileSync(resolve(here, "..", rel), "utf8"),
    );
    const referenced = [...new Set(
      [...css.matchAll(/var\((--stat-[a-z0-9-]+)\)/g)].map((m) => m[1]),
    )];
    expect(referenced.length).toBeGreaterThan(0);
    for (const token of referenced) {
      const declared = sources.some((s) => new RegExp(`^\\s*${token}\\s*:`, "m").test(s));
      expect(declared, `${token} is referenced but never declared`).toBe(true);
    }
  });

  it("defines the shared shine keyframe exactly once", () => {
    expect(css.match(/@keyframes uiCardShine/g)).toHaveLength(1);
  });
});