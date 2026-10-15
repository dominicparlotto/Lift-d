// Display units. Everything is stored in lbs and miles (so leaderboards compare like with like);
// these convert for display and for what people type in. The choice lives in user.nutrition.units.
const LB_PER_KG=2.20462, KM_PER_MI=1.609344;
const round1=n=>Math.round(n*10)/10;

export const unitsOf=user=>user?.nutrition?.units==="metric"?"metric":"imperial";
export const isMetric=u=>u==="metric";

export const wLabel=u=>isMetric(u)?"kg":"lbs";
export const dLabel=u=>isMetric(u)?"km":"mi";
// lbs → number in the user's units
export const wShow=(lbs,u)=>isMetric(u)?round1((+lbs||0)/LB_PER_KG):round1(+lbs||0);
// what the user typed → lbs (kept to 2 decimals so 100 kg round-trips to 100 kg)
export const wStore=(v,u)=>{const n=parseFloat(v);if(!(n>=0))return NaN;return isMetric(u)?Math.round(n*LB_PER_KG*100)/100:n;};
export const dShow=(mi,u)=>isMetric(u)?round1((+mi||0)*KM_PER_MI):round1(+mi||0);
export const dStore=(v,u)=>{const n=parseFloat(v);if(!(n>=0))return NaN;return isMetric(u)?Math.round(n/KM_PER_MI*100)/100:n;};
// Formatted: "185 lbs", "84 kg", "3.1 mi", "5 km"
export const fmtW=(lbs,u)=>`${wShow(lbs,u).toLocaleString()} ${wLabel(u)}`;
export const fmtD=(mi,u)=>`${dShow(mi,u).toLocaleString()} ${dLabel(u)}`;
