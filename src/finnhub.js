// src/finnhub.js
import { startTransition } from "react";
import { createStore } from "./store/priceStore";

export const priceStore = createStore();

/**
 * Kết nối Finnhub WebSocket và stream giá về store
 * @param {string[]} symbols - danh sách mã cần subscribe
 */
export function connectFinnhub(symbols = []) {
  const token = import.meta.env.VITE_FINNHUB_TOKEN;

  if (!token) {
    console.error("⚠️ Missing Finnhub token. Add VITE_FINNHUB_TOKEN in .env");
    return () => {};
  }

  const ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
  const channel = new MessageChannel();
  const pending = new Map();
  let scheduled = false;

  const flush = () => {
    if (pending.size === 0) return;
    const batch = [];
    pending.forEach((v, k) => batch.push([k, v]));
    pending.clear();
    scheduled = false;
    startTransition(() => priceStore.applyBatch(batch));
  };

  channel.port1.onmessage = flush;

  ws.onopen = () => {
    console.log("✅ WebSocket connected to Finnhub");
    symbols.forEach((sym) => {
      ws.send(JSON.stringify({ type: "subscribe", symbol: sym }));
    });
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "trade") {
      for (const t of msg.data) {
        pending.set(t.s, { price: t.p, ts: t.t });
      }
      if (!scheduled) {
        scheduled = true;
        channel.port2.postMessage(0);
      }
    }
  };

  ws.onerror = (err) => {
    console.error("❌ WebSocket error", err);
  };

  ws.onclose = () => {
    console.warn("⚠️ WebSocket closed");
  };

  return () => {
    try {
      symbols.forEach((sym) => {
        ws.send(JSON.stringify({ type: "unsubscribe", symbol: sym }));
      });
    } catch {}
    ws.close();
  };
}
