import { useState, useRef, useEffect, useCallback } from "react";
import { CLIP_POSTS } from "../data/social";

export default function ClipsView({savedClips,onSave,filterMuscle,filterSkill,filterEquip}){
  const [idx,setIdx]=useState(0);
  const [liked,setLiked]=useState({});
  const [followed,setFollowed]=useState({});
  const [cueIdx,setCueIdx]=useState(0);
  const touchStart=useRef(null);
  const containerRef=useRef(null);
  const videoRefs=useRef({});
  const filtered=CLIP_POSTS.filter(c=>{
    if(filterMuscle&&filterMuscle!=="All"&&c.muscle!==filterMuscle&&c.muscle!=="All")return false;
    if(filterSkill&&filterSkill!=="All"&&c.skill!==filterSkill&&c.skill!=="All")return false;
    if(filterEquip&&filterEquip!=="All"&&filterEquip!=="None"&&c.equipment!==filterEquip&&c.equipment!=="All")return false;
    return true;
  });
  // Play only the active clip; pause + rewind the rest.
  useEffect(()=>{
    filtered.forEach((c,i)=>{const v=videoRefs.current[c.id];if(!v)return;if(i===idx){v.play().catch(()=>{});}else{v.pause();v.currentTime=0;}});
    setCueIdx(0);
  },[idx,filtered.length]);
  // Rotate the on-video coaching cue for the active clip.
  useEffect(()=>{
    const active=filtered[idx];
    if(!active?.cues?.length)return;
    const t=setInterval(()=>setCueIdx(k=>(k+1)%active.cues.length),2600);
    return ()=>clearInterval(t);
  },[idx,filtered]);
  const handleWheel=useCallback(e=>{e.preventDefault();if(e.deltaY>30)setIdx(i=>Math.min(i+1,filtered.length-1));else if(e.deltaY<-30)setIdx(i=>Math.max(i-1,0));},[filtered.length]);
  useEffect(()=>{const el=containerRef.current;if(!el)return;el.addEventListener("wheel",handleWheel,{passive:false});return()=>el.removeEventListener("wheel",handleWheel);},[handleWheel]);
  const handleTouchStart=e=>touchStart.current=e.touches[0].clientY;
  const handleTouchEnd=e=>{if(!touchStart.current)return;const dy=touchStart.current-e.changedTouches[0].clientY;if(Math.abs(dy)>50){setIdx(i=>dy>0?Math.min(i+1,filtered.length-1):Math.max(i-1,0));}touchStart.current=null;};
  const colors=["#0a1a3a","#12082a","#0a2020","#0a1228","#150830"];
  if(filtered.length===0)return<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"var(--muted)"}}><div style={{fontSize:40}}>🎬</div><div style={{fontSize:14}}>No clips match your filters</div></div>;
  return(
    <div ref={containerRef} style={{height:"100%",overflow:"hidden",position:"relative",userSelect:"none"}} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {filtered.map((c,i)=>(
        <div key={c.id} style={{position:"absolute",inset:0,transform:`translateY(${(i-idx)*100}%)`,transition:"transform 0.42s cubic-bezier(.4,0,.2,1)",display:"flex",flexDirection:"column"}}>
          {/* Gradient acts as poster/fallback behind the video while it loads */}
          <div style={{position:"absolute",inset:0,background:`linear-gradient(160deg,${colors[i%colors.length]} 0%,#080C18 100%)`}}/>
          <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 40% 30%,${c.color}30 0%,transparent 60%)`}}/>
          {c.videoUrl&&<video ref={el=>{if(el)videoRefs.current[c.id]=el;}} src={c.videoUrl} muted loop playsInline preload="metadata" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(8,12,24,0.35) 0%,transparent 22%,transparent 55%,rgba(8,12,24,0.55) 100%)"}}/>
          {/* Coaching-cue overlay — the "creative effort" layer that also makes clips instructional */}
          {c.cues?.length>0&&i===idx&&(
            <div style={{position:"absolute",top:"32%",left:16,right:66,zIndex:10,pointerEvents:"none"}}>
              <div key={cueIdx} className="clip-cue">
                <span style={{color:"var(--accent3)",fontWeight:800,marginRight:8,fontSize:12}}>{c.isCoach?"COACH CUE":"TIP"} {(cueIdx%c.cues.length)+1}/{c.cues.length}</span>
                {c.cues[cueIdx%c.cues.length]}
              </div>
            </div>
          )}
          {c.isCoach&&<div style={{position:"absolute",top:16,left:14,background:"linear-gradient(135deg,#f59e0b,#ef4444)",borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:800,color:"#fff",letterSpacing:"0.5px",zIndex:10}}>✓ COACH</div>}
          <div style={{position:"absolute",top:16,right:14,background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"4px 8px",fontSize:11,fontFamily:"var(--mono)",fontWeight:600,color:"#fff",zIndex:10}}>Max 5:00</div>
          <div style={{position:"absolute",right:14,bottom:110,display:"flex",flexDirection:"column",gap:18,alignItems:"center",zIndex:10}}>
            {[
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={liked[c.id]?"#FF7A6E":"none"} stroke={liked[c.id]?"#FF7A6E":"white"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,count:c.likes+(liked[c.id]?1:0),action:()=>setLiked(p=>({...p,[c.id]:!p[c.id]}))},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={savedClips.includes(c.id)?"#FFD700":"none"} stroke={savedClips.includes(c.id)?"#FFD700":"white"} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,count:"Save",action:()=>onSave(c.id)},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,count:Math.floor(c.likes*0.08)},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,count:"Share"},
            ].map((a,j)=>(
              <div key={j} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} onClick={a.action}>
                <div style={{width:44,height:44,background:"rgba(255,255,255,0.12)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(255,255,255,0.2)"}}>{a.icon}</div>
                <span style={{fontSize:11,fontWeight:600,color:"rgba(238,242,255,0.9)"}}>{typeof a.count==="number"&&a.count>=1000?(a.count/1000).toFixed(1)+"k":a.count}</span>
              </div>
            ))}
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:58,padding:"16px 16px 24px",background:"linear-gradient(to top,rgba(8,12,24,0.92) 0%,transparent 100%)",zIndex:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${c.color},${c.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",border:"2px solid rgba(255,255,255,0.3)"}}>{c.avatar}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}>@{c.user}{c.isCoach&&<span style={{background:"linear-gradient(135deg,#f59e0b,#ef4444)",borderRadius:4,padding:"1px 5px",fontSize:8,fontWeight:800,color:"#fff"}}>✓</span>}</div></div>
              <button className="follow-btn" style={{background:followed[c.user]?"var(--glass)":"var(--grad)",border:followed[c.user]?"1px solid var(--border)":"none",color:"#fff"}} onClick={()=>setFollowed(p=>({...p,[c.user]:!p[c.user]}))}>
                {followed[c.user]?"Following":"Follow"}
              </button>
            </div>
            <div style={{fontSize:13,lineHeight:1.5,marginBottom:6}}>{c.content}</div>
            <div style={{display:"flex",gap:6,marginBottom:8}}>{c.muscle!=="All"&&<span style={{padding:"2px 8px",borderRadius:12,background:"rgba(255,255,255,0.12)",fontSize:10,fontWeight:600}}>{c.muscle}</span>}{c.equipment!=="All"&&<span style={{padding:"2px 8px",borderRadius:12,background:"rgba(255,255,255,0.12)",fontSize:10,fontWeight:600}}>{c.equipment}</span>}</div>
            {c.music&&<div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"rgba(238,242,255,0.8)"}}><span className="clip-music-note">♪</span><span style={{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{c.music.title} · {c.music.source}</span></div>}
          </div>
          <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:5,zIndex:10}}>
            {filtered.map((_,j)=><div key={j} style={{width:3,borderRadius:2,background:j===idx?"#fff":"rgba(255,255,255,0.3)",height:j===idx?16:4,transition:"all 0.3s"}}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}

