import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MdRefresh, MdWarning } from "react-icons/md";
import StatCard from "./StatCard.jsx";
import RecordCard from "./RecordCard.jsx";

/**
 * Render tests for the Phase 1 primitives.
 *
 * Uses react-dom/server's renderToStaticMarkup, which needs no DOM, so this
 * runs under the repo's existing vitest `environment: "node"`
 * (vite.config.js:69-72) WITHOUT adding @testing-library/react or jsdom.
 */

const html = (element) => renderToStaticMarkup(element);

describe("StatCard", () => {
  it("renders the label and the value", () => {
    const out = html(<StatCard label="Residents" value={1250} />);
    expect(out).toContain("Residents");
    expect(out).toContain("1250");
    expect(out).toContain(
      'class="ui-stat-card ui-stat-card--tone-neutral ui-stat-card--variant-base ui-stat-card--layout-stacked"',
    );
  });

  it("renders the optional description only when supplied", () => {
    expect(html(<StatCard label="A" value={1} />)).not.toContain("ui-stat-card__desc");
    const withDesc = html(<StatCard label="A" value={1} description="Live count" />);
    expect(withDesc).toContain("ui-stat-card__desc");
    expect(withDesc).toContain("Live count");
  });

  it("renders no icon slot when icon is omitted", () => {
    expect(html(<StatCard label="A" value={1} />)).not.toContain("ui-stat-card__icon");
  });

  it("accepts an icon component and hides it from assistive tech", () => {
    const out = html(<StatCard label="A" value={1} icon={MdRefresh} />);
    expect(out).toContain("ui-stat-card__icon");
    expect(out).toContain('aria-hidden="true"');
  });

  it("accepts a pre-built icon element", () => {
    const out = html(<StatCard label="A" value={1} icon={<MdRefresh size={12} />} />);
    expect(out).toContain("ui-stat-card__icon");
  });

  it("supports every semantic tone", () => {
    for (const tone of ["neutral", "brand", "success", "warning", "danger", "info"]) {
      expect(html(<StatCard label="A" value={1} tone={tone} />)).toContain(
        `ui-stat-card--tone-${tone}`,
      );
    }
  });

  it("supports both variants", () => {
    expect(html(<StatCard label="A" value={1} variant="sheen" />)).toContain(
      "ui-stat-card--variant-sheen",
    );
  });

  it("renders a div when there is no action", () => {
    expect(html(<StatCard label="A" value={1} />)).toMatch(/^<div/);
  });

  it("renders a real button when onClick is supplied", () => {
    const out = html(<StatCard label="A" value={1} onClick={() => {}} />);
    expect(out).toMatch(/^<button/);
    expect(out).toContain('type="button"');
  });

  it("adds role and tabIndex when a non-interactive tag is forced with onClick", () => {
    const out = html(<StatCard label="A" value={1} as="div" onClick={() => {}} />);
    expect(out).toMatch(/^<div/);
    expect(out).toContain('role="button"');
    expect(out).toContain('tabindex="0"');
  });

  it("marks selection with aria-pressed and selected state", () => {
    const out = html(<StatCard label="A" value={1} interactive selected />);
    expect(out).toContain("ui-stat-card--selected");
    expect(out).toContain('aria-pressed="true"');
  });

  it("marks a disabled native button with the disabled attribute", () => {
    const out = html(<StatCard label="A" value={1} onClick={() => {}} disabled />);
    expect(out).toContain("disabled");
    expect(out).toContain("ui-stat-card--disabled");
  });

  it("merges className and applies style", () => {
    const out = html(
      <StatCard label="A" value={1} className="extra" style={{ marginTop: "4px" }} />,
    );
    expect(out).toContain("extra");
    expect(out).toContain("margin-top:4px");
  });

  it("passes through native attributes", () => {
    expect(html(<StatCard label="A" value={1} data-testid="kpi" />)).toContain(
      'data-testid="kpi"',
    );
  });
});

describe("StatCard layout", () => {
  it("defaults to the stacked layout", () => {
    expect(html(<StatCard label="A" value={1} />)).toContain("ui-stat-card--layout-stacked");
    expect(html(<StatCard label="A" value={1} />)).not.toContain("ui-stat-card--has-icon");
  });

  it("emits the inline layout and the has-icon modifier", () => {
    const out = html(<StatCard layout="inline" label="A" value={1} icon={MdRefresh} />);
    expect(out).toContain("ui-stat-card--layout-inline");
    expect(out).toContain("ui-stat-card--has-icon");
  });

  it("keeps the icon-less inline card free of the has-icon modifier", () => {
    const out = html(<StatCard layout="inline" label="A" value={1} />);
    expect(out).toContain("ui-stat-card--layout-inline");
    expect(out).not.toContain("ui-stat-card--has-icon");
  });

  it("preserves child order in both layouts", () => {
    for (const layout of ["stacked", "inline"]) {
      const out = html(<StatCard layout={layout} label="L" value="V" description="D" />);
      expect(out.indexOf(">V<")).toBeLessThan(out.indexOf(">L<"));
      expect(out.indexOf(">L<")).toBeLessThan(out.indexOf(">D<"));
    }
  });

  it("maps the resident overview tones to semantic tones", () => {
    // ResidentOverview.jsx previously hardcoded #3B82F6 / #10B981 / #F59E0B.
    const out = html(
      <>
        <StatCard layout="inline" label="a" value={1} tone="info" />
        <StatCard layout="inline" label="b" value={1} tone="success" />
        <StatCard layout="inline" label="c" value={1} tone="warning" />
      </>,
    );
    expect(out).toContain("ui-stat-card--tone-info");
    expect(out).toContain("ui-stat-card--tone-success");
    expect(out).toContain("ui-stat-card--tone-warning");
    expect(out).not.toMatch(/#3B82F6|#10B981|#F59E0B/);
  });
});

describe("RecordCard", () => {
  it("renders an article by default", () => {
    expect(html(<RecordCard title="Complaint" />)).toMatch(/^<article/);
  });

  it("renders title, description and body children", () => {
    const out = html(
      <RecordCard title="Complaint" description="Water leakage">
        <p>Block A</p>
      </RecordCard>,
    );
    expect(out).toContain("ui-record-card__title");
    expect(out).toContain("Complaint");
    expect(out).toContain("Water leakage");
    expect(out).toContain("ui-record-card__body");
    expect(out).toContain("Block A");
  });

  it("uses a real heading element in the article shell", () => {
    expect(html(<RecordCard title="Complaint" />)).toContain("<h3");
  });

  it("omits every unused slot", () => {
    const out = html(<RecordCard title="Bare" />);
    expect(out).not.toContain("ui-record-card__badge");
    expect(out).not.toContain("ui-record-card__footer");
    expect(out).not.toContain("ui-record-card__icon");
  });

  it("renders the badge slot", () => {
    expect(html(<RecordCard title="X" badge={<span>Open</span>} />)).toContain(
      "ui-record-card__badge",
    );
  });

  it("renders meta items and an actions row in the footer", () => {
    const out = html(
      <RecordCard
        title="X"
        meta={["12 Mar", null, "Block A"]}
        actions={<button type="button">View</button>}
      />,
    );
    expect(out).toContain("ui-record-card__footer");
    expect(out).toContain("ui-record-card__meta-item");
    expect(out).toContain("12 Mar");
    expect(out).toContain("Block A");
    expect(out).toContain("ui-record-card__actions");
    expect(out).toContain("View");
  });

  it("accepts an icon component or element", () => {
    expect(html(<RecordCard title="X" icon={MdWarning} />)).toContain(
      "ui-record-card__icon",
    );
    expect(html(<RecordCard title="X" icon={<MdWarning size={14} />} />)).toContain(
      "ui-record-card__icon",
    );
  });

  it("supports every semantic tone", () => {
    for (const tone of ["neutral", "brand", "success", "warning", "danger", "info"]) {
      expect(html(<RecordCard title="X" tone={tone} />)).toContain(
        `ui-record-card--tone-${tone}`,
      );
    }
  });

  it("switches to a button shell on onClick and keeps content valid", () => {
    const out = html(<RecordCard title="Complaint" description="Leak" onClick={() => {}} />);
    expect(out).toMatch(/^<button/);
    expect(out).toContain('type="button"');
    // a button may not contain block-level or heading content
    expect(out).not.toContain("<h3");
    expect(out).not.toContain("<div");
    expect(out).toContain("ui-record-card__title");
  });

  it("adds role and tabIndex when a non-interactive tag is forced with onClick", () => {
    const out = html(<RecordCard title="X" as="div" onClick={() => {}} />);
    expect(out).toContain('role="button"');
    expect(out).toContain('tabindex="0"');
  });

  it("marks selection with aria-pressed", () => {
    const out = html(<RecordCard title="X" interactive selected />);
    expect(out).toContain("ui-record-card--selected");
    expect(out).toContain('aria-pressed="true"');
  });

  it("marks a disabled native button with the disabled attribute", () => {
    const out = html(<RecordCard title="X" onClick={() => {}} disabled />);
    expect(out).toContain("disabled");
  });

  it("merges className and applies style", () => {
    const out = html(
      <RecordCard title="X" className="extra" style={{ marginTop: "4px" }} />,
    );
    expect(out).toContain("extra");
    expect(out).toContain("margin-top:4px");
  });

  it("passes through native attributes", () => {
    expect(html(<RecordCard title="X" data-testid="rec" />)).toContain('data-testid="rec"');
  });

  it("marks decorative layers aria-hidden", () => {
    expect(html(<RecordCard title="X" />)).toContain(
      'class="ui-record-card__blob" aria-hidden="true"',
    );
  });
});