import { useState, useRef } from "react";
import { WORKOUTS } from "../data/workouts";
import WhoIsTraining from "./WhoIsTraining";
import { dateKey, shortDate, currentWeek, setVolume, bestSets } from "../utils/helpers";


export default function WorkoutTab({user,actions}){
  const [muscleGroup,setMuscleGroup]=useState("Chest");
  const [selectedEx,setSelectedEx]=useState(null);
  const [sets,setSets]=useState({});
  const [checked,setChecked]=useState({});
  const [openDay,setOpenDay]=useState(null); // null = normal view; dateKey = focused day
  const [exIdx,setExIdx]=useState(0);
  const [view,setView]=useState("stats");
  const [exSearch,setExSearch]=useState("");
  const [prPage,setPrPage]=useState(0);
  const [saving,setSaving]=useState(false);
  const carouselRef=useRef(null);
  // Workouts are saved to the account, keyed by date ("2026-10-11" → exercises done that day).
  const workouts=user.workouts;
  const todayKey=dateKey();
  const week=currentWeek();
  const exercises=WORKOUTS[muscleGroup].filter(e=>!exSearch||e.toLowerCase().includes(exSearch.toLowerCase()));
  function getSets(ex){return sets[ex]||[{weight:"",reps:""},{weight:"",reps:""},{weight:"",reps:""}];}
  function updateSet(ex,i,f,v){setSets(prev=>{const s=[...(prev[ex]||[{weight:"",reps:""},{weight:"",reps:""},{weight:"",reps:""}])];s[i]={...s[i],[f]:v};return{...prev,[ex]:s};});}
  function addSet(ex){setSets(prev=>({...prev,[ex]:[...getSets(ex),{weight:"",reps:""}]}));}
  function toggleCheck(ex,i){const k=`${ex}-${i}`;setChecked(prev=>({...prev,[k]:!prev[k]}));}
  // Finishing an exercise saves its completed sets into today's workout.
  async function logWorkout(){
    if(!selectedEx||saving)return;
    const s=getSets(selectedEx).filter(s=>s.weight&&s.reps).map(s=>({weight:parseFloat(s.weight),reps:parseInt(s.reps)}));
    if(!s.length)return;
    setSaving(true);
    const ok=await actions.logWorkout({exercise:selectedEx,group:muscleGroup,sets:s});
    setSaving(false);
    if(!ok)return; // keep the entered sets so nothing is lost
    setSets(prev=>{const n={...prev};delete n[selectedEx];return n;});
    setSelectedEx(null);
    setView("stats");
  }

  function toggleDay(key){setOpenDay(prev=>prev===key?null:key);setExIdx(0);if(carouselRef.current)carouselRef.current.scrollLeft=0;}
  function onCarouselScroll(e){const el=e.currentTarget;setExIdx(Math.round(el.scrollLeft/el.clientWidth));}
  function slide(dir){if(carouselRef.current)carouselRef.current.scrollBy({left:dir*carouselRef.current.clientWidth,behavior:"smooth"});}

  const daysTrained=week.filter(d=>(workouts[d.key]||[]).length>0).length;

  // Today's totals (normal view)
  const todayLog=workouts[todayKey]||[];
  const todayVolume=todayLog.reduce((a,w)=>a+setVolume(w.sets),0);
  const todaySets=todayLog.reduce((a,w)=>a+w.sets.length,0);

  // Focused day
  const focusLog=openDay?(workouts[openDay]||[]):[];
  const focusVolume=focusLog.reduce((a,w)=>a+setVolume(w.sets),0);
  const focusSets=focusLog.reduce((a,w)=>a+w.sets.length,0);
  const focusLabel=openDay===todayKey?"Today":openDay?week.find(d=>d.key===openDay)?.label:"";

  // Personal records — heaviest set per exercise across everything the user has logged
  const records=Object.entries(bestSets(workouts)).map(([exercise,b])=>({exercise,weight:b.weight,reps:b.reps,date:b.dateKey===todayKey?"Today":shortDate(b.dateKey),isNewPR:b.dateKey===todayKey})).sort((a,b)=>b.weight-a.weight);
  const PR_PAGE_SIZE=5;
  const prPageCount=Math.max(1,Math.ceil(records.length/PR_PAGE_SIZE));
  const clampedPrPage=Math.min(prPage,prPageCount-1);
  const pagedRecords=records.slice(clampedPrPage*PR_PAGE_SIZE,clampedPrPage*PR_PAGE_SIZE+PR_PAGE_SIZE);


  return(
    <div>
      <div className="header"><div><div className="header-title">Workout</div><div className="header-sub">Track your session</div></div><div style={{display:"flex",gap:8}}>{["stats","log"].map(v=><button key={v} className={`btn btn-sm ${view!==v?"btn-ghost":""}`} onClick={()=>setView(v)}>{v==="stats"?"Stats":"Log"}</button>)}</div></div>
      {view==="stats"?(
        <div>
          {/* Week day scroll — tap a day to open it, tap again (or ✕) to close */}
          <div className="card">
            <div className="card-title">This Week — tap a day</div>
            <div className="week-scroll">
              {week.map(d=>{
                const has=(workouts[d.key]||[]).length>0;
                return(
                  <button key={d.key} className={`day-pill ${openDay===d.key?"sel":""}`} onClick={()=>toggleDay(d.key)}>
                    <span className="day-pill-dow">{d.short}</span>
                    <span className="day-pill-date">{d.date}</span>
                    <span className={`day-pill-dot ${has?"has":""} ${d.key===todayKey?"today":""}`}/>
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:12}}>🔥 {daysTrained} days trained this week · keep the streak alive!</div>
          </div>

          {openDay!=null?(
            /* ===== Focused day: swipeable carousel of that day's exercises ===== */
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px 10px"}}>
                <div>
                  <div style={{fontSize:17,fontWeight:800,letterSpacing:"-0.3px"}}>{focusLabel}'s Workout</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{focusLog.length} exercises · {focusSets} sets · {focusVolume.toLocaleString()} lbs</div>
                </div>
                <button onClick={()=>setOpenDay(null)} style={{width:32,height:32,borderRadius:"50%",background:"var(--glass)",border:"1px solid var(--border)",color:"var(--text)",fontSize:15,cursor:"pointer",flexShrink:0}}>✕</button>
              </div>
              {focusLog.length===0?(
                <div className="card" style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"28px 18px"}}>No workouts logged on {focusLabel}.</div>
              ):(
                <div>
                  <div className="ex-carousel" ref={carouselRef} onScroll={onCarouselScroll}>
                    {focusLog.map((w,i)=>{
                      const top=Math.max(...w.sets.map(s=>parseFloat(s.weight)||0));
                      return(
                        <div className="ex-slide" key={i}>
                          <div className="ex-slide-card">
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                              <span className="card-title" style={{margin:0}}>Exercise {i+1} of {focusLog.length}</span>
                              <span className="tag">{w.group}</span>
                            </div>
                            <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.3px",marginBottom:3}}>{w.exercise}</div>
                            <div style={{fontSize:12,color:"var(--accent3)",fontWeight:600,marginBottom:16}}>Top set {top} lbs · {setVolume(w.sets).toLocaleString()} lbs volume</div>
                            {w.sets.map((s,j)=>(
                              <div key={j} className="set-line">
                                <span className="set-line-num">Set {j+1}</span>
                                <span className="set-line-val">{s.weight} lbs <span style={{color:"var(--muted)"}}>×</span> {s.reps} reps</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {focusLog.length>1&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginTop:2}}>
                      <button onClick={()=>slide(-1)} disabled={exIdx===0} style={{background:"none",border:"none",color:exIdx===0?"var(--muted2)":"var(--accent)",fontSize:22,fontWeight:700,cursor:exIdx===0?"default":"pointer",lineHeight:1}}>‹</button>
                      <div style={{display:"flex",gap:6}}>{focusLog.map((_,i)=><div key={i} style={{width:i===exIdx?18:6,height:6,borderRadius:3,background:i===exIdx?"var(--accent)":"var(--border2)",transition:"all 0.25s"}}/>)}</div>
                      <button onClick={()=>slide(1)} disabled={exIdx===focusLog.length-1} style={{background:"none",border:"none",color:exIdx===focusLog.length-1?"var(--muted2)":"var(--accent)",fontSize:22,fontWeight:700,cursor:exIdx===focusLog.length-1?"default":"pointer",lineHeight:1}}>›</button>
                    </div>
                  )}
                  <div style={{textAlign:"center",fontSize:11,color:"var(--muted2)",marginTop:8}}>← swipe to see each exercise →</div>
                </div>
              )}
            </div>
          ):(
            /* ===== Normal view ===== */
            <div>
              <div className="stat-grid">
                <div className="stat-card"><div className="stat-val">{todayLog.length}</div><div className="stat-lbl">Exercises</div><div className="stat-change">Today</div></div>
                <div className="stat-card"><div className="stat-val">{todaySets}</div><div className="stat-lbl">Total Sets</div><div className="stat-change">Today</div></div>
                <div className="stat-card"><div className="stat-val">{todayVolume>=1000?(todayVolume/1000).toFixed(1)+"k":todayVolume||0}</div><div className="stat-lbl">Volume (lbs)</div><div className="stat-change">Today</div></div>
                <div className="stat-card"><div style={{fontSize:26,WebkitTextFillColor:"initial"}}>🔥</div><div className="stat-lbl">{daysTrained}-Day Streak</div><div className="stat-change">This week</div></div>
              </div>

              {/* Personal records */}
              <div className="card">
                <div className="card-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>Personal Records</span>
                  {prPageCount>1&&(
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={()=>setPrPage(p=>Math.max(0,p-1))} disabled={clampedPrPage===0} style={{background:"none",border:"none",color:clampedPrPage===0?"var(--muted2)":"var(--accent)",cursor:clampedPrPage===0?"default":"pointer",fontSize:16,fontWeight:700,padding:0,lineHeight:1}}>‹</button>
                      <span style={{fontSize:9,color:"var(--muted2)",fontWeight:700,letterSpacing:"0.5px"}}>{clampedPrPage+1}/{prPageCount}</span>
                      <button onClick={()=>setPrPage(p=>Math.min(prPageCount-1,p+1))} disabled={clampedPrPage===prPageCount-1} style={{background:"none",border:"none",color:clampedPrPage===prPageCount-1?"var(--muted2)":"var(--accent)",cursor:clampedPrPage===prPageCount-1?"default":"pointer",fontSize:16,fontWeight:700,padding:0,lineHeight:1}}>›</button>
                    </div>
                  )}
                </div>
                {records.length===0&&<div style={{color:"var(--muted)",fontSize:13,padding:"6px 0"}}>No records yet — log a workout and your best lift on each exercise shows up here.</div>}
                {pagedRecords.map(r=>(
                  <div key={r.exercise} className="food-item">
                    <div><div className="food-name">{r.exercise}</div><div className="food-amount">{r.date}</div></div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:800,color:r.isNewPR?"var(--accent3)":"var(--text)"}}>{r.weight}lbs × {r.reps}</div>
                      {r.isNewPR&&<div style={{fontSize:10,color:"var(--accent3)",fontWeight:700}}>NEW PR 🎉</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Who's training now (live) */}
              <WhoIsTraining user={user} actions={actions}/>
            </div>
          )}
        </div>
      ):(
        <div>
          <div style={{padding:"4px 16px 10px",fontSize:12,color:"var(--muted)"}}>Logging to <strong style={{color:"var(--accent3)"}}>Today</strong> — finish an exercise's sets and Save to add it to the day.</div>
          <div className="muscle-tabs">{Object.keys(WORKOUTS).map(g=><button key={g} className={`muscle-tab ${muscleGroup===g?"active":""}`} onClick={()=>{setMuscleGroup(g);setSelectedEx(null);setExSearch("");}}>{g}</button>)}</div>
          <div style={{padding:"0 16px 10px"}}><input className="input-field" style={{width:"100%"}} placeholder={`Search ${WORKOUTS[muscleGroup].length} exercises…`} value={exSearch} onChange={e=>setExSearch(e.target.value)}/></div>
          {exercises.map(ex=>(
            <div key={ex}>
              <div className={`exercise-row ${selectedEx===ex?"selected":""}`} onClick={()=>setSelectedEx(selectedEx===ex?null:ex)}>
                <div><div className="exercise-name">{ex}</div><div className="exercise-sets">{getSets(ex).filter(s=>s.weight).length} sets logged</div></div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polyline points={selectedEx===ex?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
              </div>
              {selectedEx===ex&&<div className="set-logger"><div className="set-logger-header"><span>{ex}</span><button className="add-set-btn" onClick={()=>addSet(ex)}>+ Set</button></div>{getSets(ex).map((s,i)=><div key={i} className="set-row"><div className="set-num">{i+1}</div><input className="set-input" placeholder="lbs" value={s.weight} onChange={e=>updateSet(ex,i,"weight",e.target.value)}/><input className="set-input" placeholder="reps" value={s.reps} onChange={e=>updateSet(ex,i,"reps",e.target.value)}/><div className="set-label">weight × reps</div><button className={`set-done ${checked[`${ex}-${i}`]?"checked":""}`} onClick={()=>toggleCheck(ex,i)}>✓</button></div>)}<div style={{padding:"12px 16px"}}><button className="btn" style={{width:"100%"}} onClick={logWorkout} disabled={saving}>{saving?"Saving…":"Save Exercise to Today"}</button></div></div>}
            </div>
          ))}
          {exercises.length===0&&<div style={{padding:"32px 20px",textAlign:"center",color:"var(--muted)",fontSize:14}}>No exercises found for "{exSearch}"</div>}
        </div>
      )}
    </div>
  );
}
