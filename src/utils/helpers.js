export function makeInvite(n){return n.toLowerCase().replace(/\s+/g,"-")+"-"+Math.random().toString(36).slice(2,8);}
export function scaleFood(food,g){return{calories:Math.round(food.cal*g/100),protein:+(food.p*g/100).toFixed(1),carbs:+(food.c*g/100).toFixed(1),fat:+(food.f*g/100).toFixed(1)};}
export function sumLog(log,k){return +log.reduce((a,b)=>a+b[k],0).toFixed(1);}

// Local-date key, e.g. "2026-10-11" — workouts and food logs are stored per day under these.
export function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
export function shortDate(key){const [y,m,d]=key.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"short",day:"numeric"});}
// The current Mon–Sun week.
export function currentWeek(today=new Date()){
  const mon=new Date(today.getFullYear(),today.getMonth(),today.getDate()-((today.getDay()+6)%7));
  return Array.from({length:7},(_,i)=>{const d=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i);return{key:dateKey(d),short:"MTWTFSS"[i],label:d.toLocaleDateString("en-US",{weekday:"long"}),date:d.getDate()};});
}
export function timeAgo(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;}
export function initials(name){return (name||"").split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";}

export const setVolume=s=>s.reduce((a,x)=>a+(parseFloat(x.weight)||0)*(parseInt(x.reps)||0),0);
// Heaviest set per exercise across every logged day.
export function bestSets(workouts){
  const best={};
  Object.entries(workouts||{}).forEach(([key,day])=>(day||[]).forEach(w=>w.sets.forEach(s=>{const wt=parseFloat(s.weight)||0;if(!best[w.exercise]||wt>best[w.exercise].weight)best[w.exercise]={weight:wt,reps:parseInt(s.reps)||0,dateKey:key};})));
  return best;
}
// Lifetime numbers derived from the workout log (drives profile stats + badges).
export function trainingStats(workouts){
  const days=Object.values(workouts||{});
  const entries=days.flat();
  const best=bestSets(workouts);
  return{
    daysTrained:days.filter(d=>d&&d.length).length,
    totalSets:entries.reduce((a,w)=>a+w.sets.length,0),
    totalVolume:entries.reduce((a,w)=>a+setVolume(w.sets),0),
    prCount:Object.keys(best).length,
    bestSquat:Math.max(0,...Object.entries(best).filter(([ex])=>/squat/i.test(ex)).map(([,b])=>b.weight)),
    nightOwl:entries.some(w=>w.loggedAt&&new Date(w.loggedAt).getHours()>=22),
  };
}

// Center-crops an image file to a small square JPEG data URL, so profile photos stay small enough to store.
export function squareImageDataUrl(file,size=256){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement("canvas");c.width=c.height=size;
      const m=Math.min(img.width,img.height);
      c.getContext("2d").drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,size,size);
      URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",0.85));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read image"));};
    img.src=url;
  });
}
