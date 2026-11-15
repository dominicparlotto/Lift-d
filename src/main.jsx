import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { initNative } from "./lib/native";
import { getTheme } from "./utils/theme";

initNative(getTheme()); // iPhone app only: status bar, link handling (no-op on the website)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
