// src/components/VirtualPriceGrid.jsx
import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import {
  fetchSnapshot,
  initBinanceStream,
  closeBinanceStream,
} from "../hooks/useBinanceStream";
import "./PriceGrid.css";

const TOTAL_ROWS = 2000;
const TOTAL_COLS = 50;

// Ô giá (memo: chỉ re-render khi props đổi)
const Cell = memo(function Cell({
  row,
  col,
  sym,
  price,
  flash, // { dir: 'up'|'down', until: ts } | undefined
  ROW_HEIGHT,
  COL_WIDTH,
}) {
  const activeFlash =
    flash && Date.now() < flash.until
      ? flash.dir === "up"
        ? "flash-green"
        : "flash-red"
      : "";

  return (
    <div
      className={`cell ${activeFlash}`}
      style={{
        position: "absolute",
        transform: `translate3d(${col * COL_WIDTH}px, ${row * ROW_HEIGHT}px, 0)`,
        width: COL_WIDTH,
        height: ROW_HEIGHT,
      }}
    >
      <div className="symbol">{sym?.toUpperCase()}</div>
      <div className="price">{price ?? "--"}</div>
    </div>
  );
});

export default function VirtualPriceGrid() {
  const [symbols, setSymbols] = useState([]);
  const [gridSymbols, setGridSymbols] = useState([]);
  const [prices, setPrices] = useState({});
  const [flash, setFlash] = useState({}); // { [sym]: {dir, until} }
  const [scroll, setScroll] = useState({ top: 0, left: 0 });

  const viewportRef = useRef(null);
  const priceBufferRef = useRef({}); // { [sym]: priceString }

  // 1) Load symbols + snapshot
  useEffect(() => {
    async function loadData() {
      try {
        const [infoRes, snapshot] = await Promise.all([
          fetch("https://api.binance.com/api/v3/exchangeInfo"),
          fetchSnapshot(),
        ]);
        const info = await infoRes.json();
        const usdtSymbols = info.symbols
          .filter((s) => s.symbol.endsWith("USDT"))
          .map((s) => s.symbol.toLowerCase());

        // mapping grid: lặp đầy đủ symbol thật
        const totalCells = TOTAL_ROWS * TOTAL_COLS;
        const fixedMap = Array.from({ length: totalCells }, (_, i) => {
          return usdtSymbols[i % usdtSymbols.length];
        });

        setSymbols(usdtSymbols);
        setGridSymbols(fixedMap);
        setPrices(snapshot);
        // init buffer bằng snapshot để lần đầu render mượt
        priceBufferRef.current = {};
      } catch (err) {
        console.error("❌ Load error:", err);
      }
    }
    loadData();
  }, []);

  // 2) WebSocket → ghi vào buffer (không re-render)
  useEffect(() => {
    if (symbols.length === 0) return;
    initBinanceStream((tick) => {
      // tick: { s, p } (lowercase)
      priceBufferRef.current[tick.s] = tick.p;
    }, symbols);
    return () => closeBinanceStream();
  }, [symbols]);

  // 3) Mỗi animation frame: flush buffer vào state (batch)
  useEffect(() => {
    let rafId;
    const loop = () => {
      const updates = priceBufferRef.current;
      if (updates && Object.keys(updates).length > 0) {
        setPrices((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          const newFlash = {};
          for (const s in updates) {
            const oldVal = prev[s];
            const newVal = updates[s];
            if (oldVal && newVal && oldVal !== newVal) {
              newFlash[s] = {
                dir: parseFloat(newVal) > parseFloat(oldVal) ? "up" : "down",
                until: Date.now() + 350, // 350ms flash
              };
            }
            next[s] = newVal;
          }
          // merge flash một lần (không tạo nhiều setTimeout)
          if (Object.keys(newFlash).length) {
            setFlash((f) => ({ ...f, ...newFlash }));
          }
          priceBufferRef.current = {};
          return next;
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 4) Cleanup flash nhẹ (1 interval chung), không per-cell timeout
  useEffect(() => {
    const id = setInterval(() => {
      setFlash((prev) => {
        const now = Date.now();
        let changed = false;
        const next = { ...prev };
        for (const k in next) {
          if (next[k] && next[k].until <= now) {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  // 5) Scroll handler
  const onScroll = useCallback((e) => {
    const el = e.currentTarget;
    if (!el) return;
    setScroll({ top: el.scrollTop, left: el.scrollLeft });
  }, []);

  // 6) Viewport sizing
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const ROW_HEIGHT = Math.floor(viewportH / 22); // giảm một chút để hiển thị thêm
  const COL_WIDTH = Math.floor(viewportW / 12);
  const rowBuf = 2; // buffer nhỏ để giảm DOM
  const colBuf = 2;

  const startRow = Math.floor(scroll.top / ROW_HEIGHT);
  const endRow = Math.min(
    TOTAL_ROWS,
    startRow + Math.ceil(viewportH / ROW_HEIGHT) + rowBuf
  );

  const startCol = Math.floor(scroll.left / COL_WIDTH);
  const endCol = Math.min(
    TOTAL_COLS,
    startCol + Math.ceil(viewportW / COL_WIDTH) + colBuf
  );

  // 7) Render cells trong viewport
  const items = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const idx = row * TOTAL_COLS + col;
      const sym = gridSymbols[idx];
      if (!sym) continue;
      items.push(
        <Cell
          key={`${row}-${col}`}
          row={row}
          col={col}
          sym={sym}
          price={prices[sym]}
          flash={flash[sym]}
          ROW_HEIGHT={ROW_HEIGHT}
          COL_WIDTH={COL_WIDTH}
        />
      );
    }
  }

  return (
    <div ref={viewportRef} className="viewport" onScroll={onScroll}>
      <div
        style={{
          position: "relative",
          width: TOTAL_COLS * COL_WIDTH,
          height: TOTAL_ROWS * ROW_HEIGHT,
        }}
      >
        {items}
      </div>
    </div>
  );
}
