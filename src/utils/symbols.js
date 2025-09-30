export const DEFAULT_SYMBOLS = [
  "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA",
  "AMD","NFLX","ORCL","INTC","CSCO","ADBE","CRM",
  ...Array.from({ length: 300 }, (_, i) => `SYM${i+1}`)
];
