import React from "react";
import VirtualPriceGrid from "./components/VirtualPriceGrid";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <span className="logo">⚡ Lê Anh Minh - POC</span>
      </header>
      <main className="main">
        <VirtualPriceGrid />
      </main>
    </div>
  );
}
