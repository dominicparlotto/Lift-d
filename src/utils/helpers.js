export function makeInvite(n){return n.toLowerCase().replace(/\s+/g,"-")+"-"+Math.random().toString(36).slice(2,8);}
export function scaleFood(food,g){return{calories:Math.round(food.cal*g/100),protein:+(food.p*g/100).toFixed(1),carbs:+(food.c*g/100).toFixed(1),fat:+(food.f*g/100).toFixed(1)};}
export function sumLog(log,k){return +log.reduce((a,b)=>a+b[k],0).toFixed(1);}
