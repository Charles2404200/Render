let sockets = [];  
let onTick = null;

/** Snapshot tất cả giá hiện tại -> { symbol(lowercase): priceString } */
export async function fetchSnapshot() {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    const data = await res.json();
    const snap = {};
    for (const it of data) {
      snap[it.symbol.toLowerCase()] = Number(it.price).toFixed(2);
    }
    return snap;
  } catch (e) {
    console.error("❌ Snapshot error:", e);
    return {};
  }
}

/**
 * Chạy WS cho toàn bộ symbols.
 * - symbols: string[] (lowercase, đã lọc TRADING + SPOT)
 */
export function initBinanceStream(callback, symbols, opts = {}) {
  closeBinanceStream(); // clear cũ

  if (!Array.isArray(symbols) || symbols.length === 0) return;
  onTick = callback;

  const MAX_PER_SOCKET = opts.maxPerSocket ?? 900;
  const BATCH_SIZE = opts.batchSize ?? 200;        // gửi subscribe mỗi lô
  const THROTTLE_MS = opts.throttleMs ?? 250;      // delay giữa các lô

  // Dedup + chuẩn hóa lowercase
  const uniq = Array.from(new Set(symbols.map((s) => s.toLowerCase())));
  // Chia group theo maxPerSocket
  for (let i = 0; i < uniq.length; i += MAX_PER_SOCKET) {
    const group = uniq.slice(i, i + MAX_PER_SOCKET);
    openSocketForGroup(group, { BATCH_SIZE, THROTTLE_MS });
  }
}

/** Đóng socket và hủy các timer throttle */
export function closeBinanceStream() {
  sockets.forEach(({ ws, timers }) => {
    try { ws.close(); } catch {}
    if (timers) timers.forEach((t) => clearTimeout(t));
  });
  sockets = [];
  onTick = null;
}


function openSocketForGroup(group, cfg) {
  const ws = new WebSocket("wss://stream.binance.com:9443/ws");
  const meta = { ws, group, timers: [] };
  sockets.push(meta);

  ws.onopen = () => {
    // Gửi SUBSCRIBE theo lô, có throttle để tránh server đóng
    const params = group.map((s) => `${s}@trade`);
    for (let i = 0; i < params.length; i += cfg.BATCH_SIZE) {
      const slice = params.slice(i, i + cfg.BATCH_SIZE);
      const timer = setTimeout(() => {
        safeSend(ws, {
          method: "SUBSCRIBE",
          params: slice,
          id: Date.now() + i,
        });
      }, Math.floor(i / cfg.BATCH_SIZE) * cfg.THROTTLE_MS);
      meta.timers.push(timer);
    }
    console.log(`✅ WS connected: ${group.length} symbols`);
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);

      // /ws trả event trực tiếp
      if (msg && msg.s && msg.p) {
        const sym = String(msg.s).toLowerCase();
        const price = Number(msg.p).toFixed(2);
        onTick && onTick({ s: sym, p: price });
        return;
      }

      if (msg && msg.data && msg.data.s && msg.data.p) {
        const sym = String(msg.data.s).toLowerCase();
        const price = Number(msg.data.p).toFixed(2);
        onTick && onTick({ s: sym, p: price });
      }
    } catch (e) {
      console.error("❌ WS parse error:", e);
    }
  };

  ws.onerror = (e) => {
    console.warn("⚠️ WS error:", e?.message || e);
  };

  ws.onclose = () => {
    console.warn("⚠️ WS closed, reconnecting group...");
    meta.timers.forEach((t) => clearTimeout(t));
    meta.timers = [];
    setTimeout(() => {
      // Xóa socket cũ khỏi danh sách
      sockets = sockets.filter((s) => s !== meta);
      openSocketForGroup(group, cfg);
    }, 2500);
  };
}

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (e) {
    console.error("❌ WS send error:", e);
  }
}
