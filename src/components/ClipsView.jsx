import { useState, useRef, useEffect, useCallback } from "react";
import * as api from "../lib/api";
import { SKILL_TAGS } from "../data/social";
import { WORKOUTS } from "../data/workouts";
import { Sheet, ActionSheet, ReportSheet, BlockSheet, Avatar } from "./Moderation";
import { ReelVideo, useCue, CueBadge, CommentIcon } from "./Reel";

const MUSCLES=["All","Chest","Back","Legs","Shoulders","Arms","Core","Glutes","Cardio","Full Body"];
const EQUIPMENT=["All","Barbell","Dumbbell","Kettlebell","Machine","Cable","Bodyweight","Bands","None"];
const ALL_EXERCISES=[...new Set(Object.values(WORKOUTS).flat())].sort();
const fieldLabel={fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)",marginBottom:6};

// Short-form feed: curated learning clips (with on-screen coaching cues) + members' video posts.
export default function ClipsView({user,actions,clips,onChanged,filterMuscle,filterSkill,startKey,onStartHandled,onOpenComments,commentCountFor}){
  const [idx,setIdx]=useState(0);
  const [liked,setLiked]=useState({});
  const [muted,setMuted]=useState(true);
  const [expanded,setExpanded]=useState(null); // key of the clip whose full caption is showing
  const [menu,setMenu]=useState(null);
  const [reportTarget,setReportTarget]=useState(null);
  const [blockTarget,setBlockTarget]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [framing,setFraming]=useState(null); // clip being re-framed (admin)
  const scrollerRef=useRef(null);
  const filtered=(clips||[]).filter(c=>{
    if(filterMuscle&&filterMuscle!=="All"&&c.muscle!==filterMuscle&&c.muscle!=="All")return false;
    if(filterSkill&&filterSkill!=="All"&&c.skill!==filterSkill&&c.skill!=="All")return false;
    return true;
  });
  const current=Math.min(idx,Math.max(0,filtered.length-1));
  const idxRef=useRef(0); idxRef.current=current;
  const cueIdx=useCue(filtered[current],true);

  // Touch: native scroll-snap (styles.css) — the clip follows your finger and every swipe stops on the next clip, like Reels.
  const onScroll=()=>{const el=scrollerRef.current;if(el&&el.clientHeight)setIdx(Math.round(el.scrollTop/el.clientHeight));};
  const goTo=useCallback((i,smooth=true)=>{
    const el=scrollerRef.current;if(!el)return;
    const n=Math.max(0,Math.min(i,filtered.length-1));
    el.scrollTo({top:n*el.clientHeight,behavior:smooth?"smooth":"auto"});setIdx(n);
  },[filtered.length]);
  // Mouse wheel / trackpad: exactly one clip per gesture. A trackpad flick keeps firing wheel events for
  // a second or more (momentum), so after one step we ignore the rest until the wheel goes quiet.
  useEffect(()=>{
    const el=scrollerRef.current;if(!el)return;
    const g={last:0,used:false,until:0};
    const onWheel=e=>{
      if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      e.preventDefault();
      const now=Date.now();
      if(now-g.last>200)g.used=false; // a pause means a new gesture
      g.last=now;
      if(g.used||now<g.until||Math.abs(e.deltaY)<4){g.used=true;return;}
      g.used=true;g.until=now+450;
      goTo(idxRef.current+(e.deltaY>0?1:-1));
    };
    const onKey=e=>{
      if(e.target!==el)return; // don't hijack typing in a sheet
      if(e.key==="ArrowDown"||e.key==="PageDown"){e.preventDefault();goTo(idxRef.current+1);}
      else if(e.key==="ArrowUp"||e.key==="PageUp"){e.preventDefault();goTo(idxRef.current-1);}
    };
    el.addEventListener("wheel",onWheel,{passive:false});
    el.addEventListener("keydown",onKey);
    el.focus({preventScroll:true});
    return ()=>{el.removeEventListener("wheel",onWheel);el.removeEventListener("keydown",onKey);};
  },[goTo,filtered.length>0]);
  // New filters → back to the first clip.
  useEffect(()=>{goTo(0,false);},[filterMuscle,filterSkill]);
  // Opened from a Feed post: jump straight to that clip.
  useEffect(()=>{
    if(!startKey||!filtered.length)return;
    const i=filtered.findIndex(c=>c.key===startKey);
    if(i>=0)goTo(i,false);
    onStartHandled?.();
  },[startKey,filtered.length]);

  function menuFor(c){
    if(c.kind==="curated")return user.isAdmin?[
      {icon:"🖼️",label:"Edit clip (framing & exercises)",onSelect:()=>setFraming(c)},
      {icon:"🗑️",label:"Delete clip",danger:true,onSelect:async()=>{try{await api.deleteCuratedClip(c.id,c.videoPath);onChanged();}catch(e){console.error(e);actions.flash("Couldn't delete the clip.");}}},
    ]:[];
    if(c.author?.id===user.id)return[{icon:"🗑️",label:"Delete post",danger:true,onSelect:async()=>{if(await actions.deletePost(c.id))onChanged();}}];
    return[
      {icon:"🚩",label:"Report video",onSelect:()=>setReportTarget({type:"post",id:c.id,userId:c.author.id,username:c.author.username})},
      {icon:"🚫",label:`Block @${c.author.username}`,danger:true,onSelect:()=>setBlockTarget({userId:c.author.id,username:c.author.username})},
    ];
  }
  async function block(userId){const ok=await actions.block(userId);if(ok)onChanged();return ok;}

  const adminBtn=user.isAdmin&&<button className="btn btn-sm" style={{position:"absolute",top:14,left:14,zIndex:20}} onClick={()=>setShowAdd(true)}>+ Add clip</button>;
  const sheets=<>
    {menu&&<ActionSheet onClose={()=>setMenu(null)} options={menuFor(menu)}/>}
    {reportTarget&&<ReportSheet target={reportTarget} onReport={actions.report} onBlock={block} onClose={()=>setReportTarget(null)}/>}
    {blockTarget&&<BlockSheet username={blockTarget.username} onConfirm={()=>block(blockTarget.userId)} onClose={()=>setBlockTarget(null)}/>}
    {showAdd&&<AddClipSheet actions={actions} onClose={()=>setShowAdd(false)} onAdded={()=>{setShowAdd(false);goTo(0,false);onChanged();}}/>}
    {framing&&<FramingSheet clip={framing} actions={actions} onClose={()=>setFraming(null)} onSaved={()=>{setFraming(null);onChanged();}}/>}
  </>;

  if(clips===null)return<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)"}}>Loading clips…</div>;
  if(filtered.length===0)return(
    <div style={{height:"100%",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,color:"var(--muted)",padding:24,textAlign:"center"}}>
      {adminBtn}
      <div style={{fontSize:40}}>🎬</div>
      <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{(clips||[]).length===0?"No clips yet":"No clips match your filters"}</div>
      {(clips||[]).length===0&&<div style={{fontSize:13,maxWidth:280}}>Post a video of your lift from the Feed and it'll show up here for your crew.</div>}
      {sheets}
    </div>
  );

  return(
    <div style={{height:"100%",position:"relative",userSelect:"none",background:"#000"}}>
      {adminBtn}
      <button className="clip-mute" onClick={()=>setMuted(m=>!m)} aria-label={muted?"Turn sound on":"Turn sound off"}>{muted?"🔇":"🔊"}</button>
      <div ref={scrollerRef} className="clip-scroller" tabIndex={0} onScroll={onScroll} aria-label="Clips — swipe or use the arrow keys for the next one">
      {filtered.map((c,i)=>{
        const saved=user.savedClips.includes(c.key);
        const options=menuFor(c);
        const active=i===current;
        const cue=active&&c.cues.length>0&&<CueBadge clip={c} index={cueIdx}/>;
        const open=expanded===c.key;
        const comments=commentCountFor?.(c)??c.commentCount??0;
        return(
        <div key={c.key} className="clip-slide">
          <ReelVideo clip={c} active={active} mounted={Math.abs(i-current)<=1} muted={muted}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(8,12,24,0.35) 0%,transparent 18%,transparent 62%,rgba(8,12,24,0.55) 100%)",pointerEvents:"none"}}/>
          {/* Coaching cues sit where they won't cover the lifter: above their head on full-body shots, down with the caption on close-ups. */}
          {cue&&c.cuePosition==="top"&&<div className="reel-cue-top" style={{top:62}}>{cue}</div>}
          <div style={{position:"absolute",right:12,bottom:96,display:"flex",flexDirection:"column",gap:16,alignItems:"center",zIndex:10}}>
            {[
              {label:"Like",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={liked[c.key]?"#FF7A6E":"none"} stroke={liked[c.key]?"#FF7A6E":"white"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,count:liked[c.key]?"Liked":"Like",action:()=>setLiked(p=>({...p,[c.key]:!p[c.key]}))},
              ...(onOpenComments?[{label:"Comments",icon:<CommentIcon color="white"/>,count:comments||"Comment",action:()=>onOpenComments(c)}]:[]),
              {label:"Save",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={saved?"#FFD700":"none"} stroke={saved?"#FFD700":"white"} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,count:saved?"Saved":"Save",action:()=>actions.toggleSaveClip(c.key)},
              ...(options.length?[{label:"More",icon:<span style={{color:"#fff",fontSize:20,fontWeight:800,lineHeight:1}}>⋯</span>,count:"More",action:()=>setMenu(c)}]:[]),
            ].map(a=>(
              <button key={a.label} className="clip-action" onClick={a.action} aria-label={a.label}>
                <span className="clip-action-icon">{a.icon}</span>
                <span style={{fontSize:11,fontWeight:600,color:"rgba(238,242,255,0.9)"}}>{a.count}</span>
              </button>
            ))}
          </div>
          {/* Compact caption like Reels: two lines, tap to see the rest. */}
          <div className="reel-caption" onClick={()=>setExpanded(open?null:c.key)}>
            {cue&&c.cuePosition!=="top"&&<div style={{marginBottom:10}}>{cue}</div>}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              {c.kind==="curated"
                ?<><img src="../favicon.svg" alt="" width="30" height="30" style={{borderRadius:8}}/><div style={{fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>Lift'd Learn<span className="learn-badge">FORM TIPS</span></div></>
                :<><Avatar profile={c.author} size={30}/><div style={{fontWeight:700,fontSize:13}}>@{c.author.username}</div></>}
            </div>
            <div className={open?"":"clamp-2"} style={{fontSize:13,lineHeight:1.45}}>
              <span style={{fontWeight:c.kind==="curated"?700:400}}>{c.title}</span>
              {c.description&&<span style={{color:"rgba(238,242,255,0.75)"}}> {c.description}</span>}
            </div>
            {open&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>{[c.muscle,c.equipment,c.skill].filter(t=>t&&t!=="All").map(t=><span key={t} style={{padding:"2px 8px",borderRadius:12,background:"rgba(255,255,255,0.12)",fontSize:10,fontWeight:600}}>{t}</span>)}</div>}
            {(c.music||c.credit)&&<div style={{display:"flex",alignItems:"center",gap:7,fontSize:10,color:"rgba(238,242,255,0.65)",marginTop:5}}>{c.music&&<><span className="clip-music-note">♪</span><span>{c.music.title}{c.music.source?` · ${c.music.source}`:""}</span></>}{c.music&&c.credit&&<span>·</span>}{c.credit&&<span>{c.credit}</span>}</div>}
          </div>
        </div>
        );
      })}
      </div>
      <div style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:5,zIndex:10,pointerEvents:"none"}}>
        {filtered.map((_,j)=><div key={j} style={{width:3,borderRadius:2,background:j===current?"#fff":"rgba(255,255,255,0.3)",height:j===current?16:4,transition:"all 0.3s"}}/>)}
      </div>
      {sheets}
    </div>
  );
}

// Live 9:16 preview of how a clip is cropped and where its cue sits, with the controls to change both.
function FramingPicker({videoUrl,focusX,cuePosition,onChange}){
  return(
    <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:4}}>
      <div style={{position:"relative",width:110,aspectRatio:"9/16",borderRadius:12,overflow:"hidden",background:"#000",flexShrink:0}}>
        <video src={videoUrl} muted autoPlay loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:`${focusX}% 50%`}}/>
        <div style={{position:"absolute",left:6,right:6,[cuePosition==="top"?"top":"bottom"]:8,height:14,borderRadius:5,background:"rgba(8,12,24,0.7)",border:"1px solid rgba(255,255,255,0.3)"}}/>
      </div>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>
        <div><div style={fieldLabel}>Keep in frame</div>
          <input type="range" min={0} max={100} value={focusX} onChange={e=>onChange({focusX:+e.target.value,cuePosition})} style={{width:"100%"}} aria-label="Horizontal framing"/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted2)"}}><span>Left</span><span>Center</span><span>Right</span></div>
        </div>
        <div><div style={fieldLabel}>Coaching cue</div>
          <div style={{display:"flex",gap:6}}>{[["top","Top"],["bottom","Bottom"]].map(([v,l])=><button key={v} type="button" className={`filter-pill ${cuePosition===v?"active":""}`} onClick={()=>onChange({focusX,cuePosition:v})}>{l}</button>)}</div>
          <div style={{fontSize:11,color:"var(--muted2)",marginTop:6,lineHeight:1.4}}>Put it where it won't cover the lifter — top for full-body shots, bottom for close-ups.</div>
        </div>
      </div>
    </div>
  );
}

// Which workout-log exercises a clip teaches — those exercises get a "▶ Form" button in the Workout tab.
function ExercisePicker({value,onChange}){
  const [q,setQ]=useState("");
  const add=name=>{const match=ALL_EXERCISES.find(e=>e.toLowerCase()===name.trim().toLowerCase());if(match&&!value.includes(match))onChange([...value,match]);setQ("");};
  const suggestions=q.trim().length>=2?ALL_EXERCISES.filter(e=>e.toLowerCase().includes(q.trim().toLowerCase())&&!value.includes(e)).slice(0,6):[];
  return(
    <div>
      <div style={fieldLabel}>Teaches these exercises</div>
      {value.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{value.map(e=><button key={e} type="button" className="filter-pill active" onClick={()=>onChange(value.filter(x=>x!==e))}>{e} ✕</button>)}</div>}
      <input className="input-field" style={{width:"100%"}} placeholder="Search the exercise list…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add(suggestions[0]||q);}}}/>
      {suggestions.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{suggestions.map(e=><button key={e} type="button" className="filter-pill" onClick={()=>add(e)}>+ {e}</button>)}</div>}
      <div className="field-hint">These exercises show a ▶ Form button in everyone's workout log.</div>
    </div>
  );
}

// Admin-only: edit an existing learning clip's framing and linked exercises.
function FramingSheet({clip,actions,onClose,onSaved}){
  const [f,setF]=useState({focusX:clip.focusX??50,cuePosition:clip.cuePosition||"bottom"});
  const [exercises,setExercises]=useState(clip.exercises||[]);
  const [busy,setBusy]=useState(false);
  async function save(){
    setBusy(true);
    try{await api.updateClip(clip.id,{...f,exercises});onSaved();}
    catch(e){console.error(e);actions.flash("Couldn't save the clip — try again.");setBusy(false);}
  }
  return(
    <Sheet onClose={busy?undefined:onClose}>
      <div className="modal-title">Edit clip</div>
      <div className="modal-sub">{clip.title}</div>
      <FramingPicker videoUrl={clip.videoUrl} {...f} onChange={setF}/>
      <div style={{marginTop:16}}><ExercisePicker value={exercises} onChange={setExercises}/></div>
      <button className="btn" style={{width:"100%",marginTop:16}} onClick={save} disabled={busy}>{busy?"Saving…":"Save"}</button>
    </Sheet>
  );
}

// Admin-only: add a curated learning clip (video + coaching cues).
function AddClipSheet({actions,onAdded,onClose}){
  const [file,setFile]=useState(null); const [preview,setPreview]=useState(null);
  const [form,setForm]=useState({title:"",description:"",muscle:"All",skill:"All",equipment:"All",cues:"",credit:"",focusX:50,cuePosition:"bottom",exercises:[]});
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const fileRef=useRef();
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  function pick(f){
    setErr("");
    if(!f)return;
    if(!f.type.startsWith("video/")){setErr("Choose a video file.");return;}
    if(f.size>50*1024*1024){setErr("Videos must be under 50 MB.");return;}
    setFile(f);setPreview(URL.createObjectURL(f));
  }
  async function save(){
    if(!file){setErr("Choose a video.");return;}
    if(!form.title.trim()){setErr("Add a title.");return;}
    setBusy(true);setErr("");
    try{
      await api.addCuratedClip({file,title:form.title.trim(),description:form.description.trim(),muscle:form.muscle,skill:form.skill,equipment:form.equipment,
        cues:form.cues.split("\n").map(c=>c.trim()).filter(Boolean).slice(0,8),credit:form.credit.trim(),focusX:form.focusX,cuePosition:form.cuePosition,exercises:form.exercises});
      onAdded();
    }catch(e){console.error(e);setErr("Couldn't add the clip — check your connection and try again.");setBusy(false);}
  }
  return(
    <Sheet onClose={busy?undefined:onClose}>
      <div className="modal-title">Add a learning clip</div>
      <div className="modal-sub">Visible to everyone in Clips and the Feed. Add 2–5 short coaching cues; they rotate on screen while the video plays.</div>
      {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
      <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{pick(e.target.files[0]);e.target.value="";}}/>
      {file?<div style={{marginBottom:16}}><FramingPicker videoUrl={preview} focusX={form.focusX} cuePosition={form.cuePosition} onChange={f=>setForm(p=>({...p,...f}))}/></div>
        :<div className="upload-area" onClick={()=>fileRef.current.click()}><div style={{fontSize:32,marginBottom:8}}>🎬</div><div style={{fontSize:14,fontWeight:600}}>Choose a video (under 50 MB)</div></div>}
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
        <div><div style={fieldLabel}>Title</div><input className="input-field" style={{width:"100%"}} maxLength={120} placeholder="e.g. Cable fly: squeeze, don't swing" value={form.title} onChange={e=>set("title",e.target.value)}/></div>
        <div><div style={fieldLabel}>Description (optional)</div><input className="input-field" style={{width:"100%"}} maxLength={500} value={form.description} onChange={e=>set("description",e.target.value)}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><div style={fieldLabel}>Muscle</div><select className="input-field" style={{width:"100%"}} value={form.muscle} onChange={e=>set("muscle",e.target.value)}>{MUSCLES.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><div style={fieldLabel}>Level</div><select className="input-field" style={{width:"100%"}} value={form.skill} onChange={e=>set("skill",e.target.value)}>{["All",...SKILL_TAGS.slice(0,3)].map(m=><option key={m}>{m}</option>)}</select></div>
          <div><div style={fieldLabel}>Equipment</div><select className="input-field" style={{width:"100%"}} value={form.equipment} onChange={e=>set("equipment",e.target.value)}>{EQUIPMENT.map(m=><option key={m}>{m}</option>)}</select></div>
        </div>
        <div><div style={fieldLabel}>Coaching cues (one per line)</div><textarea className="input-field" style={{width:"100%",minHeight:96,resize:"vertical"}} placeholder={"Soft bend in the elbows\nSqueeze your chest at the middle\nControl the way back"} value={form.cues} onChange={e=>set("cues",e.target.value)}/></div>
        <ExercisePicker value={form.exercises} onChange={v=>set("exercises",v)}/>
        <div><div style={fieldLabel}>Video credit</div><input className="input-field" style={{width:"100%"}} maxLength={120} placeholder="e.g. Video: Mixkit" value={form.credit} onChange={e=>set("credit",e.target.value)}/></div>
      </div>
      <button className="btn" style={{width:"100%"}} onClick={save} disabled={busy}>{busy?"Uploading…":"Add clip"}</button>
    </Sheet>
  );
}
