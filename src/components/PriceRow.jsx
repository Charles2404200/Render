import React, { useMemo } from "react";

function fmt(n) { return n == null ? "—" : (Math.abs(n) >= 100 ? n.toFixed(1) : n.toFixed(3)); }
function timeStr(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false });
}

export function PriceRow({ symbol, last, ts, change }) {
  const color = last == null ? "#9fb2c2" : change > 0 ? "#36d399" : change < 0 ? "#f87272" : "#cbd5e1";
  const bg = change > 0 ? "rgba(36, 177, 117, .07)" : change < 0 ? "rgba(217, 70, 70, .07)" : "transparent";
  const changeText = useMemo(() => (change == null || last == null ? "—" :
    `${change > 0 ? "+" : ""}${fmt(change)}`), [change, last]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "170px 1fr 1fr 1fr 1fr",
      alignItems: "center",
      height: 44,
      padding: "0 10px",
      fontSize: 14,
      borderBottom: "1px solid #13202b",
      background: bg,
      willChange: "contents",
      contain: "content"
    }}>
      <div style={{ fontWeight: 700, letterSpacing: .5 }}>{symbol}</div>
      <div style={{ color, fontVariantNumeric: "tabular-nums" }}>{fmt(last)}</div>
      <div style={{ color, fontVariantNumeric: "tabular-nums" }}>{changeText}</div>
      <div style={{ color: "#88a1b5" }}>{timeStr(ts)}</div>
      <div style={{ color: "#88a1b5" }}>—</div>
    </div>
  );
}
