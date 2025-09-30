import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Virtual table không dùng rAF/timer. Dựa vào onScroll + math.
 */
export function VirtualTable({ itemCount, itemSize, height, overscan = 10, renderItem }) {
  const ref = useRef(null);
  const [win, setWin] = useState({ start: 0, end: Math.min(itemCount, Math.ceil(height / itemSize) + overscan) });

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop;
    const start = Math.max(0, Math.floor(top / itemSize) - overscan);
    const visible = Math.ceil(height / itemSize) + overscan * 2;
    const end = Math.min(itemCount, start + visible);
    setWin((prev) => (prev.start !== start || prev.end !== end ? { start, end } : prev));
  }, [height, itemCount, itemSize, overscan]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // init
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const items = useMemo(() => {
    const arr = [];
    for (let i = win.start; i < win.end; i++) arr.push(renderItem(i));
    return arr;
  }, [win.start, win.end, renderItem]);

  const top = win.start * itemSize;
  const total = itemCount * itemSize;

  return (
    <div ref={ref} style={{
      height,
      overflow: "auto",
      border: "1px solid #1e2a35",
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      background: "#0b0f14",
      contain: "strict"
    }}>
      <div style={{ height: total, position: "relative" }}>
        <div style={{ position: "absolute", top, left: 0, right: 0 }}>
          {items}
        </div>
      </div>
    </div>
  );
}
