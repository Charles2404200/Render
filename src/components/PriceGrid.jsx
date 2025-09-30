import React, { useEffect, useState } from "react";
import { connectBinance } from "../hooks/useBinanceStream";
import "./PriceGrid.css";

const symbols = [
  "btcusdt", "ethusdt", "bnbusdt", "xrpusdt", "adausdt", "dogeusdt",
  "solusdt", "maticusdt", "dotusdt", "ltcusdt", "avaxusdt", "uniusdt",
  "linkusdt", "xlmusdt", "etcusdt", "atomusdt", "filusdt", "vetusdt",
  "nearusdt", "icpusdt"
];

const GRID_ROWS = 20;
const GRID_COLS = 10;

export default function PriceGrid() {
  const [prices, setPrices] = useState({});
  const [flash, setFlash] = useState({});

  useEffect(() => {
    const ws = connectBinance(symbols, (data) => {
      const { s: symbol, p: price } = data;
      const priceNum = parseFloat(price).toFixed(2);

      setPrices((prev) => {
        const oldPrice = prev[symbol];
        if (oldPrice && oldPrice !== priceNum) {
          setFlash((f) => ({
            ...f,
            [symbol]: priceNum > oldPrice ? "up" : "down",
          }));
          setTimeout(() => {
            setFlash((f) => ({ ...f, [symbol]: null }));
          }, 500);
        }
        return { ...prev, [symbol]: priceNum };
      });
    });

    return () => ws.close();
  }, []);

  const grid = [];
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const sym = symbols[i % symbols.length].toUpperCase();
    const price = prices[sym] || "--";
    const flashClass =
      flash[sym] === "up" ? "flash-green" : flash[sym] === "down" ? "flash-red" : "";

    grid.push(
      <div key={i} className={`cell ${flashClass}`}>
        <div className="symbol">{sym}</div>
        <div className="price">{price}</div>
      </div>
    );
  }

  return <div className="grid">{grid}</div>;
}
