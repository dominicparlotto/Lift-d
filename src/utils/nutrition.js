// Daily calorie + macro targets from body stats. Maintenance uses the Mifflin-St Jeor equation (the standard
// estimate most nutrition apps use) times an activity factor; cut/bulk adjust from there.

export const ACTIVITY=[
  {id:"sedentary",label:"Sedentary",hint:"Desk job, little or no exercise",factor:1.2},
  {id:"light",label:"Lightly active",hint:"Exercise 1–3 days a week",factor:1.375},
  {id:"moderate",label:"Moderately active",hint:"Exercise 3–5 days a week",factor:1.55},
  {id:"very",label:"Very active",hint:"Hard training 6–7 days a week",factor:1.725},
  {id:"extra",label:"Extremely active",hint:"Physical job plus daily training",factor:1.9},
];
export const GOALS=[
  {id:"cut",label:"🔥 Cut",name:"Cut"},
  {id:"maintenance",label:"⚖️ Maintain",name:"Maintain"},
  {id:"bulk",label:"📈 Bulk",name:"Bulk"},
  {id:"custom",label:"✏️ Custom",name:"Custom"},
];
// Generic targets for people who haven't entered their stats yet.
export const DEFAULT_TARGETS={cut:{cals:1800,protein:180,carbs:120,fat:60},maintenance:{cals:2400,protein:160,carbs:250,fat:80},bulk:{cals:3000,protein:200,carbs:350,fat:100}};
// Never suggest less than this (general guidance for adults without medical supervision).
export const CAL_FLOOR={male:1500,female:1200,unspecified:1350};

export const LB_PER_KG=2.20462, CM_PER_IN=2.54;
export const ageFrom=birthYear=>new Date().getFullYear()-birthYear;
export const hasStats=n=>!!(n&&n.sex&&n.birthYear&&n.heightCm&&n.weightKg&&n.activity);
const round10=x=>Math.round(x/10)*10;

export function maintenanceCalories(n){
  const sexAdj=n.sex==="male"?5:n.sex==="female"?-161:-78; // "prefer not to say" uses the midpoint
  const bmr=10*n.weightKg+6.25*n.heightCm-5*ageFrom(n.birthYear)+sexAdj;
  return bmr*(ACTIVITY.find(a=>a.id===n.activity)?.factor||1.2);
}

// Cut = 20% below maintenance (~0.5–1 lb/week), bulk = 10% above (a lean bulk).
// Protein 2.2 g/kg on a cut (protects muscle), 1.8 g/kg otherwise, capped at 35% of calories;
// fat 25% on a cut / 30% otherwise; carbs fill the rest.
export function targetsFor(goal,n){
  const tdee=maintenanceCalories(n);
  const raw=goal==="cut"?tdee*0.8:goal==="bulk"?tdee*1.1:tdee;
  const cals=round10(Math.max(raw,CAL_FLOOR[n.sex]||CAL_FLOOR.unspecified));
  const protein=Math.round(Math.min(n.weightKg*(goal==="cut"?2.2:1.8),cals*0.35/4));
  const fat=Math.round(cals*(goal==="cut"?0.25:0.3)/9);
  const carbs=Math.max(0,Math.round((cals-protein*4-fat*9)/4));
  return {cals,protein,carbs,fat};
}

// What the Nutrition tab tracks against: custom targets, else personal ones, else the generic defaults.
export function resolveTargets(n){
  const goal=n?.goal||"maintenance";
  if(goal==="custom"&&n.custom)return n.custom;
  const base=goal==="custom"?"maintenance":goal;
  return hasStats(n)?targetsFor(base,n):DEFAULT_TARGETS[base];
}
export const macroCalories=t=>(+t.protein||0)*4+(+t.carbs||0)*4+(+t.fat||0)*9;
