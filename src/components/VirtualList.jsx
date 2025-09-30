import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";


/**
* Simple virtualization without requestAnimationFrame or timers.
* Uses scrollTop math and fixed item height to render a windowed slice.
*/
export function VirtualList({ itemCount, itemSize, height, overscan = 8, renderItem }) {
const containerRef = useRef(null);
const [state, setState] = useState({ start: 0, end: Math.min(itemCount, Math.ceil(height / itemSize) + overscan) });


const onScroll = useCallback(() => {
const el = containerRef.current;
if (!el) return;
const scrollTop = el.scrollTop;
const start = Math.max(0, Math.floor(scrollTop / itemSize) - overscan);
const viewportCount = Math.ceil(height / itemSize) + overscan * 2;
const end = Math.min(itemCount, start + viewportCount);


// Reduce state churn: only update when index window changes
setState((prev) => (prev.start !== start || prev.end !== end ? { start, end } : prev));
}, [height, itemCount, itemSize, overscan]);


useEffect(() => {
const el = containerRef.current;
if (!el) return;
// Passive listener for better scroll perf
el.addEventListener("scroll", onScroll, { passive: true });
// Initialize window once mounted
onScroll();
return () => el.removeEventListener("scroll", onScroll);
}, [onScroll]);


const items = useMemo(() => {
const arr = [];
for (let i = state.start; i < state.end; i++) {
arr.push(renderItem(i));
}
return arr;
}, [state.start, state.end, renderItem]);


const top = state.start * itemSize;
const totalHeight = itemCount * itemSize;


return (
<div
ref={containerRef}
className="w-full overflow-auto bg-neutral-950"
style={{ height, contain: "strict" }}
>
<div style={{ height: totalHeight, position: "relative" }}>
<div style={{ position: "absolute", top, left: 0, right: 0 }}>{items}</div>
</div>
</div>
);
}