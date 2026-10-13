import { useState, useRef, useEffect, useCallback } from "react";
import * as api from "../lib/api";
import { SKILL_TAGS } from "../data/social";
import { Sheet, ActionSheet, ReportSheet, BlockSheet, Avatar } from "./Moderation";

const MUSCLES=["All","Chest","Back","Legs","Shoulders","Arms","Core","Glutes","Cardio","Full Body"];
const EQUIPMENT=["All","Barbell","Dumbbell","Kettlebell","Machine","Cable","Bodyweight","Bands","None"];
const fieldLabel={fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)",marginBottom:6};

// Short-form feed: curated learning clips (with on-screen coaching cues) + members' video posts.
export default function ClipsView({user,actions,clips,onChanged,filterMuscle,filterSkill,startKey,onStartHandled}){
  const [idx,setIdx]=useState(0);
  const [liked,setLiked]=useState({});
  const [cueIdx,setCueIdx]=useState(0);
  const [muted,setMuted]=useState(true);
  const [paused,setPaused]=useState(false); // whether the on-screen clip is paused
  const [menu,setMenu]=useState(null);
  const [reportTarget,setReportTarget]=useState(null);
  const [blockTarget,setBlockTarget]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const scrollerRef=useRef(null);
  const videoRefs=useRef({});
  const filtered=(clips||[]).filter(c=>{
    if(filterMuscle&&filterMuscle!=="All"&&c.muscle!==filterMuscle&&c.muscle!=="All")return false;
    if(filterSkill&&filterSkill!=="All"&&c.skill!==filterSkill&&c.skill!=="All")return false;
    return true;
  });
  const current=Math.min(idx,Math.max(0,filtered.length-1));

  const idxRef=useRef(0); idxRef.current=current;

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
  // Opened from "Watch in Clips" on a Feed post: jump straight to that clip.
  useEffect(()=>{
    if(!startKey||!filtered.length)return;
    const i=filtered.findIndex(c=>c.key===startKey);
    if(i>=0)goTo(i,false);
    onStartHandled?.();
  },[startKey,filtered.length]);

  // Play only the clip on screen; pause + rewind the rest.
  useEffect(()=>{
    filtered.forEach((c,i)=>{const v=videoRefs.current[c.key];if(!v)return;if(i===current){v.play().catch(()=>{});}else{v.pause();v.currentTime=0;}});
    setCueIdx(0);
  },[current,filtered.length]);
  useEffect(()=>{Object.values(videoRefs.current).forEach(v=>{if(v)v.muted=muted;});},[muted]);
  // Browsers pause video when you switch apps/tabs; resume the on-screen clip when you come back.
  useEffect(()=>{
    const onVisible=()=>{if(document.visibilityState==="visible")currentVideo()?.play().catch(()=>{});};
    document.addEventListener("visibilitychange",onVisible);
    return ()=>document.removeEventListener("visibilitychange",onVisible);
  },[current,filtered]);
  const currentVideo=()=>{const c=filtered[current];return c?videoRefs.current[c.key]:null;};
  // Tap to play/pause — also the fallback when autoplay is blocked (e.g. iPhone Low Power Mode).
  function togglePlay(){const v=currentVideo();if(!v)return;if(v.paused)v.play().catch(()=>{});else v.pause();}
  // Rotate the on-screen coaching cue.
  useEffect(()=>{
    const active=filtered[current];
    if(!active?.cues?.length)return;
    const t=setInterval(()=>setCueIdx(k=>(k+1)%active.cues.length),2600);
    return ()=>clearInterval(t);
  },[current,filtered]);

  function menuFor(c){
    if(c.kind==="curated")return user.isAdmin?[{icon:"🗑️",label:"Delete clip",danger:true,onSelect:async()=>{try{await api.deleteCuratedClip(c.id,c.videoPath);onChanged();}catch(e){console.error(e);actions.flash("Couldn't delete the clip.");}}}]:[];
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
        return(
        <div key={c.key} className="clip-slide">
          {Math.abs(i-current)<=1&&<video ref={el=>{if(el)videoRefs.current[c.key]=el;}} src={c.videoUrl} muted={muted} loop playsInline preload={i===current?"auto":"metadata"} onClick={togglePlay} onPlay={()=>{if(i===current)setPaused(false);}} onPause={()=>{if(i===current)setPaused(true);}} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
          {i===current&&paused&&<button className="clip-play" onClick={togglePlay} aria-label="Play">▶</button>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(8,12,24,0.35) 0%,transparent 22%,transparent 55%,rgba(8,12,24,0.6) 100%)",pointerEvents:"none"}}/>
          {/* Coaching-cue overlay on curated clips — the on-screen instruction layer */}
          {c.cues.length>0&&i===current&&(
            <div style={{position:"absolute",top:"30%",left:16,right:66,zIndex:10,pointerEvents:"none"}}>
              <div key={cueIdx} className="clip-cue"><span style={{color:"var(--accent3)",fontWeight:800,marginRight:8,fontSize:12}}>CUE {(cueIdx%c.cues.length)+1}/{c.cues.length}</span>{c.cues[cueIdx%c.cues.length]}</div>
            </div>
          )}
          <div style={{position:"absolute",right:14,bottom:110,display:"flex",flexDirection:"column",gap:18,alignItems:"center",zIndex:10}}>
            {[
              {label:"Like",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={liked[c.key]?"#FF7A6E":"none"} stroke={liked[c.key]?"#FF7A6E":"white"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,count:liked[c.key]?"Liked":"Like",action:()=>setLiked(p=>({...p,[c.key]:!p[c.key]}))},
              {label:"Save",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={saved?"#FFD700":"none"} stroke={saved?"#FFD700":"white"} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,count:saved?"Saved":"Save",action:()=>actions.toggleSaveClip(c.key)},
              ...(options.length?[{label:"More",icon:<span style={{color:"#fff",fontSize:20,fontWeight:800,lineHeight:1}}>⋯</span>,count:"More",action:()=>setMenu(c)}]:[]),
            ].map(a=>(
              <button key={a.label} className="clip-action" onClick={a.action} aria-label={a.label}>
                <span className="clip-action-icon">{a.icon}</span>
                <span style={{fontSize:11,fontWeight:600,color:"rgba(238,242,255,0.9)"}}>{a.count}</span>
              </button>
            ))}
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:58,padding:"16px 16px 24px",background:"linear-gradient(to top,rgba(8,12,24,0.92) 0%,transparent 100%)",zIndex:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              {c.kind==="curated"
                ?<><img src="../favicon.svg" alt="" width="38" height="38" style={{borderRadius:10}}/><div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}>Lift'd Learn<span className="learn-badge">FORM TIPS</span></div></>
                :<><Avatar profile={c.author} size={38}/><div style={{fontWeight:700,fontSize:14}}>@{c.author.username}</div></>}
            </div>
            <div style={{fontSize:14,fontWeight:c.kind==="curated"?700:400,lineHeight:1.5,marginBottom:c.description?4:6}}>{c.title}</div>
            {c.description&&<div style={{fontSize:12,color:"rgba(238,242,255,0.75)",lineHeight:1.5,marginBottom:6}}>{c.description}</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>{[c.muscle,c.equipment,c.skill].filter(t=>t&&t!=="All").map(t=><span key={t} style={{padding:"2px 8px",borderRadius:12,background:"rgba(255,255,255,0.12)",fontSize:10,fontWeight:600}}>{t}</span>)}</div>
            {(c.music||c.credit)&&<div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"rgba(238,242,255,0.7)"}}>{c.music&&<><span className="clip-music-note">♪</span><span>{c.music.title}{c.music.source?` · ${c.music.source}`:""}</span></>}{c.music&&c.credit&&<span>·</span>}{c.credit&&<span>{c.credit}</span>}</div>}
          </div>
        </div>
        );
      })}
      </div>
      <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:5,zIndex:10,pointerEvents:"none"}}>
        {filtered.map((_,j)=><div key={j} style={{width:3,borderRadius:2,background:j===current?"#fff":"rgba(255,255,255,0.3)",height:j===current?16:4,transition:"all 0.3s"}}/>)}
      </div>
      {sheets}
    </div>
  );
}

// Admin-only: add a curated learning clip (video + coaching cues).
function AddClipSheet({actions,onAdded,onClose}){
  const [file,setFile]=useState(null); const [preview,setPreview]=useState(null);
  const [form,setForm]=useState({title:"",description:"",muscle:"All",skill:"All",equipment:"All",cues:"",credit:""});
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
        cues:form.cues.split("\n").map(c=>c.trim()).filter(Boolean).slice(0,8),credit:form.credit.trim()});
      onAdded();
    }catch(e){console.error(e);setErr("Couldn't add the clip — check your connection and try again.");setBusy(false);}
  }
  return(
    <Sheet onClose={busy?undefined:onClose}>
      <div className="modal-title">Add a learning clip</div>
      <div className="modal-sub">Visible to everyone in Clips. Add 2–5 short coaching cues; they rotate on screen while the video plays.</div>
      {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
      <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{pick(e.target.files[0]);e.target.value="";}}/>
      {file?<div className="upload-preview"><video src={preview} controls playsInline muted/></div>
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
        <div><div style={fieldLabel}>Video credit</div><input className="input-field" style={{width:"100%"}} maxLength={120} placeholder="e.g. Video: Mixkit" value={form.credit} onChange={e=>set("credit",e.target.value)}/></div>
      </div>
      <button className="btn" style={{width:"100%"}} onClick={save} disabled={busy}>{busy?"Uploading…":"Add clip"}</button>
    </Sheet>
  );
}
