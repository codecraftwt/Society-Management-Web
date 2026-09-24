import { useCallback, useLayoutEffect, useRef, useState } from "react";
import "./SlidingTabs.css";

export default function SlidingTabs({
  items,
  tabs,
  value,
  onChange,
  fullWidth = false,
  className = "",
}) {
  const tabList = items ?? tabs ?? [];
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 4, width: 0 });

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    const index = tabList.findIndex((item) => item.id === value);
    const el = itemRefs.current[index];
    if (!list || !el) return;
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });
  }, [tabList, value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => updateIndicator());
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
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sliding-tabs__item ${active ? "is-active" : ""}`}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            onClick={() => onChange?.(item.id)}
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
