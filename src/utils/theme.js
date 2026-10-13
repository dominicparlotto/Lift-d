// Dark (default) or light colours. Saved on this device; app/index.html applies it before the app draws.
const KEY="liftd.theme";
const BAR={dark:"#080C18",light:"#F3F5FA"};

export function getTheme(){
  try{return localStorage.getItem(KEY)==="light"?"light":"dark";}catch{return "dark";}
}
export function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",BAR[theme]);
  try{localStorage.setItem(KEY,theme);}catch{/* storage unavailable — still applies for this visit */}
}
