import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./SlidingTabs.css";

const NO_TABS = [];

export default function SlidingTabs({
  items,
  tabs,
  value,
  onChange,
  fullWidth = false,
  className = "",
}) {
  const tabList = useMemo(() => items ?? tabs ?? NO_TABS, [items, tabs]);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 4, width: 0 });

  /* Callers almost always build `items` inline (e.g. from `t(...)`), so the
     array identity changes on every parent render. Keeping the latest list in a
     ref lets `updateIndicator` stay referentially stable, so the layout effect
     and the ResizeObserver below are not torn down and rebuilt every render. */
  const latestRef = useRef({ tabList, value });
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    latestRef.current = { tabList, value };
  }, [tabList, value]);

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const { tabList: latestTabs, value: activeValue } = latestRef.current;
    const index = latestTabs.findIndex((item) => (item.id ?? item.key ?? item.value) === activeValue);
    const el = index >= 0 ? itemRefs.current[index] : null;
    if (!el) return;

    const left = el.offsetLeft;
    const width = el.offsetWidth;

    /* Bail out when nothing moved: storing a fresh object every time would
       schedule a render that in turn re-runs this effect. */
    setIndicator((prev) => (prev.left === left && prev.width === width ? prev : { left, width }));

    /* Keep the active pill inside the horizontal scroll port. Skipped on the
       first pass so mounting the strip can never nudge the page. */
    if (!mountedRef.current) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, []);

  /* Re-measure when the active tab or the tab set changes (including label or
     width changes from a language switch). */
  useLayoutEffect(updateIndicator, [updateIndicator, value, tabList]);

  useLayoutEffect(() => {
    mountedRef.current = true;
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(list);
    itemRefs.current.forEach((node) => node && ro.observe(node));
    window.addEventListener("resize", updateIndicator);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator, tabList.length]);

  return (
    <div
      ref={listRef}
      className={`sliding-tabs ${fullWidth ? "sliding-tabs--full" : ""} ${className}`.trim()}
      role="tablist"
    >
      <span
        className="sliding-tabs__indicator"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.width ? 1 : 0,
        }}
      />
      {tabList.map((item, index) => {
        const itemId = item.id ?? item.key ?? item.value ?? String(index);
        const active = itemId === value;
        return (
          <button
            key={itemId}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sliding-tabs__item ${active ? "is-active" : ""}`}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            onClick={() => onChange?.(itemId)}
          >
            {item.icon}
            {item.label}
            {item.alert > 0 ? (
              <span className="sliding-tabs__badge sliding-tabs__badge--alert">{item.alert}</span>
            ) : item.badge != null && item.badge !== false ? (
              <span className="sliding-tabs__badge">{item.badge}</span>
            ) : null}
            {item.extra}
          </button>
        );
      })}
    </div>
  );
}
