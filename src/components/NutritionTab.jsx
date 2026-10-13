import { useState } from "react";
import { FOOD_DB_INIT } from "../data/foodDb";
import { scaleFood, sumLog, dateKey, initials } from "../utils/helpers";

export default function NutritionTab({user,actions,onOpenProfile}){
  const [foodDB,setFoodDB]=useState(FOOD_DB_INIT);
  // Food is saved to the account per day; this tab shows and edits today's entries.
  const todayKey=dateKey();
  const log=user.food[todayKey]||[];
  const [query,setQuery]=useState(""); const [grams,setGrams]=useState("");
  const [suggestions,setSuggestions]=useState([]); const [selectedFood,setSelectedFood]=useState(null);
  const [goal,setGoal]=useState("maintenance");
  // Last 7 days of logged calories, ending today.
  const history=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=dateKey(d);return{key:k,day:d.toLocaleDateString("en-US",{weekday:"short"}),cals:sumLog(user.food[k]||[],"calories")};});
  const [showAddFood,setShowAddFood]=useState(false);
  const [newFood,setNewFood]=useState({name:"",cal:"",p:"",c:"",f:"",fi:""});
  const goals={cut:{cals:1800,protein:180,carbs:120,fat:60},maintenance:{cals:2400,protein:160,carbs:250,fat:80},bulk:{cals:3000,protein:200,carbs:350,fat:100}};
  const G=goals[goal];
  const totals={calories:sumLog(log,"calories"),protein:sumLog(log,"protein"),carbs:sumLog(log,"carbs"),fat:sumLog(log,"fat")};
  const maxCal=Math.max(1,...history.map(h=>h.cals));
  function handleQuery(v){setQuery(v);setSelectedFood(null);setSuggestions(v.length<2?[]:Object.keys(foodDB).filter(k=>k.includes(v.toLowerCase())).slice(0,10));}
  function selectFood(name){setSelectedFood(name);setQuery(name.charAt(0).toUpperCase()+name.slice(1));setSuggestions([]);}
  const portion=()=>Math.min(5000,Math.max(1,parseFloat(grams)||100));
  async function addFood(){const g=portion();const key=selectedFood||query.toLowerCase();const food=foodDB[key];if(!food)return;if(await actions.addFood({name:query,grams:g,...scaleFood(food,g)})){setQuery("");setGrams("");setSelectedFood(null);}}
  function removeFood(id){actions.removeFood(id);}
  async function submitNewFood(){if(!newFood.name||!newFood.cal)return;const key=newFood.name.toLowerCase().trim();const entry={cal:+newFood.cal,p:+newFood.p||0,c:+newFood.c||0,f:+newFood.f||0,fi:+newFood.fi||0,cat:"Custom"};setFoodDB(prev=>({...prev,[key]:entry}));const g=portion();if(await actions.addFood({name:newFood.name,grams:g,...scaleFood(entry,g)})){setNewFood({name:"",cal:"",p:"",c:"",f:"",fi:""});setQuery("");setGrams("");setShowAddFood(false);}}
  return(
    <div>
      <div className="header"><div><div className="header-title"><span className="liftd-logo">Lift'd</span></div><div className="header-sub">Nutrition · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div></div><button className="avatar-btn" onClick={onOpenProfile} style={{overflow:"hidden",padding:0}}>{user.avatar?<img src={user.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(user.name)}</button></div>
      <div className="goal-row">{["cut","maintenance","bulk"].map(g=><button key={g} className={`goal-btn ${goal===g?"active":""}`} onClick={()=>setGoal(g)}>{g==="cut"?"🔥 Cut":g==="maintenance"?"⚖️ Maintain":"📈 Bulk"}</button>)}</div>
      <div className="macro-grid"><div className="macro-pill cals"><div className="val">{totals.calories}</div><div className="lbl">kcal</div></div><div className="macro-pill prot"><div className="val">{totals.protein}g</div><div className="lbl">Protein</div></div><div className="macro-pill carb"><div className="val">{totals.carbs}g</div><div className="lbl">Carbs</div></div><div className="macro-pill fat"><div className="val">{totals.fat}g</div><div className="lbl">Fat</div></div></div>
      <div className="card"><div className="card-title">Daily Goals — {goal}</div>{[["Calories",totals.calories,G.cals,"linear-gradient(90deg,#4F8EF7,#6C63FF)"],["Protein",totals.protein,G.protein,"linear-gradient(90deg,#FF7A6E,#FF9A8B)"],["Carbs",totals.carbs,G.carbs,"linear-gradient(90deg,#3ECFCF,#5BE0E0)"],["Fat",totals.fat,G.fat,"linear-gradient(90deg,#C084FC,#D4A0FF)"]].map(([lbl,val,max,grad])=><div className="prog-wrap" key={lbl}><div className="prog-label"><span>{lbl}</span><span style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:11}}>{val}/{max}{lbl==="Calories"?"":"g"}</span></div><div className="prog-track"><div className="prog-fill" style={{width:`${Math.min(100,(val/max)*100)}%`,background:grad}}/></div></div>)}</div>
      <div className="add-food-form">
        <div className="input-row"><input className="input-field" placeholder={`Search ${Object.keys(foodDB).length}+ foods…`} value={query} onChange={e=>handleQuery(e.target.value)}/><input className="input-field" placeholder="g" value={grams} onChange={e=>setGrams(e.target.value)} style={{width:64,flex:"none"}}/><button className="btn" onClick={addFood}>+</button></div>
        {suggestions.length>0&&<div className="suggestions">{suggestions.map(s=><div key={s} className="suggestion-item" onClick={()=>selectFood(s)}><span>{s.charAt(0).toUpperCase()+s.slice(1)}</span><span className="suggestion-cat">{foodDB[s].cat}</span></div>)}</div>}
        {query.length>=2&&suggestions.length===0&&<div style={{padding:"8px 4px",fontSize:12,color:"var(--muted)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>"{query}" not found</span><button className="btn btn-sm" onClick={()=>{setNewFood(p=>({...p,name:query}));setShowAddFood(true);}}>+ Add Custom</button></div>}
      </div>
      <div className="card"><div className="card-title">Today's Log</div>{log.length===0&&<div style={{color:"var(--muted)",fontSize:13}}>Nothing logged yet — search a food above to add it.</div>}{log.map(f=><div key={f.id} className="food-item"><div><div className="food-name">{f.name}</div><div className="food-amount">{f.grams}g · P:{f.protein}g C:{f.carbs}g F:{f.fat}g</div></div><div style={{display:"flex",alignItems:"center"}}><span className="food-cals">{f.calories}</span><button className="delete-btn" onClick={()=>removeFood(f.id)}>✕</button></div></div>)}</div>
      <div className="card"><div className="card-title">Last 7 Days</div><div className="trend-chart">{history.map(h=><div key={h.key} className="bar-wrap"><div className="bar" style={{height:`${(h.cals/maxCal)*80}px`}}/><div className="bar-lbl">{h.day}</div></div>)}</div></div>
      <div className="ai-card"><div className="card-title" style={{marginBottom:10}}>✦ AI Insight</div><div className="ai-text">{log.length===0?"Log your first meal today to get personalized tips.":<>{goal==="cut"&&`You're ${Math.max(0,G.protein-totals.protein)}g short on protein. Try chicken breast or whey.`}{goal==="bulk"&&`You need ${Math.max(0,G.cals-totals.calories)} more calories. Almonds + whole milk will get you close.`}{goal==="maintenance"&&`Nice balance today. Consider adding fiber-rich foods like broccoli or berries.`}</>}</div></div>
      {showAddFood&&<div className="modal-overlay" onClick={()=>setShowAddFood(false)}><div className="modal-sheet" onClick={e=>e.stopPropagation()}><div className="modal-handle"/><div className="modal-title">Add Custom Food</div><div className="modal-sub">Enter nutrition per 100g. It'll be saved for future searches.</div><div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}><input className="input-field" style={{width:"100%"}} placeholder="Food name" value={newFood.name} onChange={e=>setNewFood(p=>({...p,name:e.target.value}))}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><input className="input-field" placeholder="Calories (per 100g)" value={newFood.cal} onChange={e=>setNewFood(p=>({...p,cal:e.target.value}))}/><input className="input-field" placeholder="Protein (g)" value={newFood.p} onChange={e=>setNewFood(p=>({...p,p:e.target.value}))}/><input className="input-field" placeholder="Carbs (g)" value={newFood.c} onChange={e=>setNewFood(p=>({...p,c:e.target.value}))}/><input className="input-field" placeholder="Fat (g)" value={newFood.f} onChange={e=>setNewFood(p=>({...p,f:e.target.value}))}/><input className="input-field" placeholder="Fiber (g)" value={newFood.fi} onChange={e=>setNewFood(p=>({...p,fi:e.target.value}))}/><input className="input-field" placeholder="Grams to log" value={grams} onChange={e=>setGrams(e.target.value)}/></div></div><button className="btn" style={{width:"100%"}} onClick={submitNewFood}>Add & Log Food</button></div></div>}
    </div>
  );
}

