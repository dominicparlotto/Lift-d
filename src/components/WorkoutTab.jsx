import { useState, useRef, useEffect } from "react";
import { WORKOUTS } from "../data/workouts";
import WhoIsTraining from "./WhoIsTraining";
import { ClipPlayer } from "./Reel";
import PRShareSheet from "./PRShare";
import * as api from "../lib/api";
import { dateKey, shortDate, currentWeek, setVolume, bestSets } from "../utils/helpers";


export default function WorkoutTab({user,actions}){
  const [muscleGroup,setMuscleGroup]=useState("Chest");
  const [selectedEx,setSelectedEx]=useState(null);
  const [sets,setSets]=useState({});
  const [adding,setAdding]=useState(false); const [newEx,setNewEx]=useState(""); const [addingBusy,setAddingBusy]=useState(false);
  const [confirmRemove,setConfirmRemove]=useState(null); // id of a custom exercise waiting for a second tap to remove
  const [openDay,setOpenDay]=useState(null); // null = normal view; dateKey = focused day
  const [exIdx,setExIdx]=useState(0);
  const [view,setView]=useState("stats");
  const [exSearch,setExSearch]=useState("");
  const [prPage,setPrPage]=useState(0);
  const [saving,setSaving]=useState(false);
  const carouselRef=useRef(null);
  // Learning clips linked to exercises → "▶ Form" buttons in the log.
  const [learnClips,setLearnClips]=useState(null);
  const [playing,setPlaying]=useState(null); // clip open in the pop-up player
  const [sharePR,setSharePR]=useState(null); // PR being turned into a shareable card
  useEffect(()=>{if(view==="log"&&learnClips===null)api.loadLearnClips().then(setLearnClips).catch(e=>{console.error(e);setLearnClips([]);});},[view]);
  const formClip=name=>(learnClips||[]).find(c=>c.exercises.includes(name));
  // Workouts are saved to the account, keyed by date ("2026-10-11" → exercises done that day).
  const workouts=user.workouts;
  const todayKey=dateKey();
  const week=currentWeek();
  // The user's own exercises (private to them) come first, then the built-in list.
  const custom=user.customExercises.filter(c=>c.group===muscleGroup);
  const allExercises=[...custom.map(c=>c.name),...WORKOUTS[muscleGroup].filter(e=>!custom.some(c=>c.name.toLowerCase()===e.toLowerCase()))];
  const customByName=Object.fromEntries(custom.map(c=>[c.name,c]));
  const exercises=allExercises.filter(e=>!exSearch||e.toLowerCase().includes(exSearch.toLowerCase()));
  const blankSets=()=>[{weight:"",reps:"",done:false},{weight:"",reps:"",done:false},{weight:"",reps:"",done:false}];
  function getSets(ex){return sets[ex]||blankSets();}
  function editSets(ex,fn){setSets(prev=>({...prev,[ex]:fn(prev[ex]||blankSets())}));}
  function updateSet(ex,i,f,v){editSets(ex,s=>s.map((x,j)=>j===i?{...x,[f]:v}:x));}
  function addSet(ex){editSets(ex,s=>[...s,{weight:"",reps:"",done:false}]);}
  // Remove a set added by mistake (always keep at least one).
  function removeSet(ex,i){editSets(ex,s=>s.length>1?s.filter((_,j)=>j!==i):s);}
  function toggleCheck(ex,i){editSets(ex,s=>s.map((x,j)=>j===i?{...x,done:!x.done}:x));}

  function openAdd(){setNewEx(exSearch.trim());setAdding(true);}
  async function addExercise(){
    const name=newEx.trim().replace(/\s+/g," ");
    if(name.length<2){actions.flash("Enter an exercise name.");return;}
    const existing=allExercises.find(e=>e.toLowerCase()===name.toLowerCase());
    if(existing){setAdding(false);setExSearch("");setSelectedEx(existing);actions.flash(`${existing} is already in ${muscleGroup}.`);return;}
    setAddingBusy(true);
    const ok=await actions.addCustomExercise(muscleGroup,name);
    setAddingBusy(false);
    if(ok){setAdding(false);setNewEx("");setExSearch("");setSelectedEx(name);}
  }
  async function removeExercise(c){
    if(confirmRemove!==c.id){setConfirmRemove(c.id);return;}
    setConfirmRemove(null);
    if(await actions.removeCustomExercise(c.id)&&selectedEx===c.name)setSelectedEx(null);
  }
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
  const records=Object.entries(bestSets(workouts)).map(([exercise,b])=>({exercise,weight:b.weight,reps:b.reps,dateKey:b.dateKey,date:b.dateKey===todayKey?"Today":shortDate(b.dateKey),isNewPR:b.dateKey===todayKey})).sort((a,b)=>b.weight-a.weight);
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
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:800,color:r.isNewPR?"var(--accent3)":"var(--text)"}}>{r.weight}lbs × {r.reps}</div>
                        {r.isNewPR&&<div style={{fontSize:10,color:"var(--accent3)",fontWeight:700}}>NEW PR 🎉</div>}
                      </div>
                      <button className="pr-row-share" onClick={()=>setSharePR({exercise:r.exercise,weight:r.weight,reps:r.reps,dateKey:r.dateKey})} aria-label={`Share ${r.exercise} PR`}>📤</button>
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
          <div className="muscle-tabs">{Object.keys(WORKOUTS).map(g=><button key={g} className={`muscle-tab ${muscleGroup===g?"active":""}`} onClick={()=>{setMuscleGroup(g);setSelectedEx(null);setExSearch("");setAdding(false);setConfirmRemove(null);}}>{g}</button>)}</div>
          <div style={{padding:"0 16px 10px"}}><input className="input-field" style={{width:"100%"}} placeholder={`Search ${allExercises.length} exercises…`} value={exSearch} onChange={e=>setExSearch(e.target.value)}/></div>
          {/* Add your own exercise (only you see it) */}
          {adding?(
            <div className="custom-ex-form">
              <input className="input-field" style={{flex:1,minWidth:0}} autoFocus maxLength={60} placeholder={`New ${muscleGroup.toLowerCase()} exercise`} value={newEx} onChange={e=>setNewEx(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addExercise();if(e.key==="Escape")setAdding(false);}}/>
              <button className="btn btn-sm" onClick={addExercise} disabled={addingBusy}>{addingBusy?"…":"Add"}</button>
              <button className="btn btn-sm btn-ghost" onClick={()=>setAdding(false)}>Cancel</button>
            </div>
          ):(
            <button className="custom-ex-add" onClick={openAdd}>+ {exSearch.trim()&&exercises.length===0?`Add "${exSearch.trim()}" to ${muscleGroup}`:`Add your own ${muscleGroup.toLowerCase()} exercise`}<span>Only you'll see it</span></button>
          )}
          {exercises.map(ex=>{const mine=customByName[ex];return(
            <div key={ex}>
              <div className={`exercise-row ${selectedEx===ex?"selected":""}`} onClick={()=>{setSelectedEx(selectedEx===ex?null:ex);setConfirmRemove(null);}}>
                <div style={{minWidth:0}}><div className="exercise-name">{ex}{mine&&<span className="custom-ex-tag">Yours</span>}</div><div className="exercise-sets">{getSets(ex).filter(s=>s.weight).length} sets logged</div></div>
                {formClip(ex)&&<button className="form-btn" onClick={e=>{e.stopPropagation();setPlaying(formClip(ex));}} aria-label={`Watch ${ex} form clip`}>▶ Form</button>}
                {mine&&<button className={`custom-ex-remove ${confirmRemove===mine.id?"confirm":""}`} onClick={e=>{e.stopPropagation();removeExercise(mine);}}>{confirmRemove===mine.id?"Remove?":"✕"}</button>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polyline points={selectedEx===ex?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
              </div>
              {selectedEx===ex&&<div className="set-logger"><div className="set-logger-header"><span>{ex}</span><div style={{display:"flex",gap:6}}>{formClip(ex)&&<button className="add-set-btn" onClick={()=>setPlaying(formClip(ex))}>▶ Form</button>}<button className="add-set-btn" onClick={()=>addSet(ex)}>+ Set</button></div></div>{getSets(ex).map((s,i,all)=><div key={i} className="set-row"><div className="set-num">{i+1}</div><input className="set-input" inputMode="decimal" placeholder="lbs" value={s.weight} onChange={e=>updateSet(ex,i,"weight",e.target.value)}/><input className="set-input" inputMode="numeric" placeholder="reps" value={s.reps} onChange={e=>updateSet(ex,i,"reps",e.target.value)}/><div className="set-label">weight × reps</div><button className={`set-done ${s.done?"checked":""}`} onClick={()=>toggleCheck(ex,i)} aria-label={`Mark set ${i+1} done`}>✓</button>{all.length>1&&<button className="set-remove" onClick={()=>removeSet(ex,i)} aria-label={`Delete set ${i+1}`}>✕</button>}</div>)}<div style={{padding:"12px 16px"}}><button className="btn" style={{width:"100%"}} onClick={logWorkout} disabled={saving}>{saving?"Saving…":"Save Exercise to Today"}</button></div></div>}
            </div>
          );})}
          {exercises.length===0&&<div style={{padding:"24px 20px",textAlign:"center",color:"var(--muted)",fontSize:14}}>No exercises found for "{exSearch}" — add it above.</div>}
        </div>
      )}
      {playing&&<ClipPlayer clip={playing} user={user} actions={actions} onClose={()=>setPlaying(null)}/>}
      {sharePR&&<PRShareSheet pr={sharePR} user={user} actions={actions} onClose={()=>setSharePR(null)}/>}
    </div>
  );
}
