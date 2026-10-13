import { useState } from "react";
import { Sheet } from "./Moderation";
import { ACTIVITY, CAL_FLOOR, LB_PER_KG, CM_PER_IN, ageFrom, hasStats, targetsFor, resolveTargets, macroCalories, maintenanceCalories } from "../utils/nutrition";

const fieldLabel={fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)",marginBottom:6};
const fmt=n=>Math.round(n).toLocaleString();

// Turns saved (metric) stats into editable fields in the user's units, and back.
function toDraft(n){
  const imperial=n.units!=="metric";
  const inches=n.heightCm?n.heightCm/CM_PER_IN:null;
  return{
    units:n.units||"imperial", sex:n.sex||"", activity:n.activity||"",
    age:n.birthYear?String(ageFrom(n.birthYear)):"",
    ft:inches?String(Math.floor(Math.round(inches)/12)):"", inch:inches?String(Math.round(inches)%12):"",
    cm:n.heightCm?String(Math.round(n.heightCm)):"",
    weight:n.weightKg?String(Math.round(imperial?n.weightKg*LB_PER_KG:n.weightKg)):"",
  };
}
function statsFromDraft(d){
  const imperial=d.units==="imperial";
  const age=parseInt(d.age,10);
  const heightCm=imperial?((parseInt(d.ft,10)||0)*12+(parseFloat(d.inch)||0))*CM_PER_IN:parseFloat(d.cm);
  const w=parseFloat(d.weight);
  const weightKg=imperial?w/LB_PER_KG:w;
  return{
    sex:d.sex||null, activity:d.activity||null, units:d.units,
    birthYear:age>=13&&age<=100?new Date().getFullYear()-age:null,
    heightCm:heightCm>=90&&heightCm<=250?Math.round(heightCm*10)/10:null,
    weightKg:weightKg>=25&&weightKg<=350?Math.round(weightKg*10)/10:null,
  };
}

// Set body stats (for personal targets) and/or custom daily targets.
export default function GoalSettings({nutrition,initialTab="stats",onSave,onClose}){
  const [tab,setTab]=useState(initialTab);
  const [d,setD]=useState(()=>toDraft(nutrition));
  const start=nutrition.custom||resolveTargets({...nutrition,goal:nutrition.goal==="custom"?"maintenance":nutrition.goal});
  const [custom,setCustom]=useState({cals:String(start.cals),protein:String(start.protein),carbs:String(start.carbs),fat:String(start.fat)});
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const set=(k,v)=>{setD(p=>({...p,[k]:v}));setErr("");};
  const setC=(k,v)=>{setCustom(p=>({...p,[k]:v.replace(/[^0-9]/g,"").slice(0,5)}));setErr("");};

  // Switching units converts what's already typed.
  function switchUnits(u){
    if(u===d.units)return;
    const s=statsFromDraft(d);
    setD(toDraft({...nutrition,...s,units:u}));
  }

  const stats=statsFromDraft(d);
  const preview={...nutrition,...stats};
  const complete=hasStats(preview);
  const typed=d.age||d.weight||d.ft||d.cm;
  const missing=[!stats.sex&&"sex",!stats.birthYear&&"age (13–100)",!stats.heightCm&&"height",!stats.weightKg&&"weight",!stats.activity&&"activity level"].filter(Boolean);

  const c={cals:+custom.cals||0,protein:+custom.protein||0,carbs:+custom.carbs||0,fat:+custom.fat||0};
  const macroCals=macroCalories(c);
  const floor=CAL_FLOOR[stats.sex||"unspecified"];

  async function save(){
    let next;
    if(tab==="stats"){
      if(!complete){setErr(`Add your ${missing.join(", ")}.`);return;}
      const weightChanged=stats.weightKg!==nutrition.weightKg;
      next={...nutrition,...stats,weightUpdatedAt:weightChanged||!nutrition.weightUpdatedAt?Date.now():nutrition.weightUpdatedAt,
        goal:nutrition.goal==="custom"&&!nutrition.custom?"maintenance":nutrition.goal};
    }else{
      if(c.cals<500||c.cals>10000){setErr("Enter daily calories between 500 and 10,000.");return;}
      // Keep any stats typed on the other tab too.
      next={...nutrition,...(complete?stats:{units:d.units}),custom:c,goal:"custom"};
    }
    setBusy(true);
    const ok=await onSave(next);
    setBusy(false);
    if(ok)onClose();
  }

  return(
    <Sheet onClose={busy?undefined:onClose}>
      <div className="modal-title">Your daily goals</div>
      <div className="modal-sub">🔒 Only you can see this. It's never shown on your profile.</div>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["stats","Your stats"],["custom","Custom targets"]].map(([id,l])=><button key={id} className={`filter-pill ${tab===id?"active":""}`} onClick={()=>{setTab(id);setErr("");}}>{l}</button>)}
      </div>
      {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}

      {tab==="stats"?<>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,color:"var(--muted)"}}>We'll work out your Cut, Maintain and Bulk targets.</div>
            <div className="unit-toggle">{[["imperial","lb/ft"],["metric","kg/cm"]].map(([u,l])=><button key={u} className={d.units===u?"active":""} onClick={()=>switchUnits(u)}>{l}</button>)}</div>
          </div>
          <div><div style={fieldLabel}>Sex</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["male","Male"],["female","Female"],["unspecified","Prefer not to say"]].map(([v,l])=><button key={v} className={`filter-pill ${d.sex===v?"active":""}`} onClick={()=>set("sex",v)}>{l}</button>)}</div>
            <div className="field-hint">Used in the calorie formula — bodies of different sizes burn different amounts.</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr",gap:8}}>
            <div><div style={fieldLabel}>Age</div><input className="input-field" style={{width:"100%"}} inputMode="numeric" placeholder="25" value={d.age} onChange={e=>set("age",e.target.value.replace(/[^0-9]/g,"").slice(0,3))}/></div>
            <div><div style={fieldLabel}>Height</div>
              {d.units==="imperial"
                ?<div style={{display:"flex",gap:6}}><input className="input-field" style={{width:"100%",minWidth:0}} inputMode="numeric" placeholder="5 ft" value={d.ft} onChange={e=>set("ft",e.target.value.replace(/[^0-9]/g,"").slice(0,1))} aria-label="Feet"/><input className="input-field" style={{width:"100%",minWidth:0}} inputMode="numeric" placeholder="10 in" value={d.inch} onChange={e=>set("inch",e.target.value.replace(/[^0-9]/g,"").slice(0,2))} aria-label="Inches"/></div>
                :<input className="input-field" style={{width:"100%"}} inputMode="numeric" placeholder="178 cm" value={d.cm} onChange={e=>set("cm",e.target.value.replace(/[^0-9]/g,"").slice(0,3))}/>}
            </div>
            <div><div style={fieldLabel}>Weight</div><input className="input-field" style={{width:"100%"}} inputMode="decimal" placeholder={d.units==="imperial"?"170 lb":"77 kg"} value={d.weight} onChange={e=>set("weight",e.target.value.replace(/[^0-9.]/g,"").slice(0,5))}/></div>
          </div>
          <div><div style={fieldLabel}>Activity level</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{ACTIVITY.map(a=>(
              <button key={a.id} className={`reason-option ${d.activity===a.id?"sel":""}`} onClick={()=>set("activity",a.id)}>
                <span className="reason-radio"/><span style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:1}}><span>{a.label}</span><span style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>{a.hint}</span></span>
              </button>
            ))}</div>
          </div>
        </div>
        {complete?<div className="target-preview">
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Your maintenance is about <strong style={{color:"var(--text)"}}>{fmt(Math.round(maintenanceCalories(preview)/10)*10)} calories</strong> a day.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[["cut","🔥 Cut"],["maintenance","⚖️ Maintain"],["bulk","📈 Bulk"]].map(([g,l])=>{const t=targetsFor(g,preview);return(
              <div key={g} className="target-tile"><div style={{fontSize:11,color:"var(--muted)",fontWeight:700}}>{l}</div><div style={{fontSize:17,fontWeight:800,margin:"2px 0"}}>{fmt(t.cals)}</div><div style={{fontSize:10,color:"var(--muted)"}}>P {t.protein} · C {t.carbs} · F {t.fat}</div></div>
            );})}
          </div>
          <div className="field-hint" style={{marginTop:10}}>These are estimates — real needs vary by a few hundred calories. If your weight isn't moving the way you want after 2–3 weeks, adjust or set custom targets.</div>
        </div>:typed?<div className="field-hint" style={{marginBottom:4}}>Still needed: {missing.join(", ")}.</div>:null}
      </>:<>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:14,lineHeight:1.5}}>Following a coach's plan or your own numbers? Set exactly what you want to hit each day.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[["cals","Calories","kcal"],["protein","Protein","g"],["carbs","Carbs","g"],["fat","Fat","g"]].map(([k,l,u])=>(
            <div key={k}><div style={fieldLabel}>{l} ({u})</div><input className="input-field" style={{width:"100%"}} inputMode="numeric" value={custom[k]} onChange={e=>setC(k,e.target.value)}/></div>
          ))}
        </div>
        <div className="field-hint">Your macros add up to <strong style={{color:"var(--text)"}}>{fmt(macroCals)} kcal</strong>{c.cals>0&&Math.abs(macroCals-c.cals)>c.cals*0.1?` — that's ${macroCals>c.cals?"more":"less"} than your ${fmt(c.cals)} calorie target.`:"."}</div>
        {c.cals>0&&c.cals<floor&&<div className="field-hint" style={{color:"#FFB86B",marginTop:6}}>That's very low. Most adults shouldn't eat under {fmt(floor)} calories a day without a doctor or dietitian.</div>}
      </>}

      <button className="btn" style={{width:"100%",marginTop:16}} onClick={save} disabled={busy}>{busy?"Saving…":tab==="stats"?"Save my stats":"Use custom targets"}</button>
    </Sheet>
  );
}
