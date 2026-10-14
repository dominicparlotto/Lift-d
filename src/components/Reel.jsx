import { useState, useRef, useEffect } from "react";
import * as api from "../lib/api";
import { timeAgo } from "../utils/helpers";
import { Sheet, Avatar, ReportSheet } from "./Moderation";

// Pieces shared by the full-screen Clips view and clip cards in the Feed, so a clip looks the same in both.

// The clip's video, cropped to fill its frame. focusX (0–100) picks the horizontal crop so the person stays
// in frame when a landscape video fills a vertical frame. Plays while `active`; paused clips show a ▶ button.
export function ReelVideo({clip,active,mounted=true,muted,onTap}){
  const ref=useRef(null);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    const v=ref.current;if(!v)return;
    if(active)v.play().catch(()=>setPaused(true));
    else{v.pause();v.currentTime=0;}
  },[active,mounted]);
  useEffect(()=>{if(ref.current)ref.current.muted=muted;},[muted]);
  // Browsers pause video when you switch apps/tabs; resume the playing clip when you come back.
  useEffect(()=>{
    if(!active)return;
    const onVisible=()=>{if(document.visibilityState==="visible")ref.current?.play().catch(()=>{});};
    document.addEventListener("visibilitychange",onVisible);
    return ()=>document.removeEventListener("visibilitychange",onVisible);
  },[active]);
  // Tap to play/pause — also the fallback when autoplay is blocked (e.g. iPhone Low Power Mode).
  function togglePlay(e){e?.stopPropagation();const v=ref.current;if(!v)return;if(v.paused)v.play().catch(()=>{});else v.pause();}
  return <>
    {mounted&&<video ref={ref} src={clip.videoUrl} muted={muted} loop playsInline preload={active?"auto":"metadata"} onClick={onTap||togglePlay}
      onPlay={()=>setPaused(false)} onPause={()=>setPaused(true)}
      style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:`${clip.focusX??50}% 50%`}}/>}
    {active&&paused&&<button className="clip-play" onClick={togglePlay} aria-label="Play">▶</button>}
  </>;
}

// Which coaching cue is showing; rotates every 2.6s while the clip is active.
export function useCue(clip,active){
  const [i,setI]=useState(0);
  const n=clip?.cues?.length||0;
  useEffect(()=>{
    setI(0);
    if(!active||n<2)return;
    const t=setInterval(()=>setI(k=>(k+1)%n),2600);
    return ()=>clearInterval(t);
  },[clip?.key,active,n]);
  return n?i%n:0;
}

export function CueBadge({clip,index}){
  if(!clip.cues?.length)return null;
  return <div key={index} className="clip-cue"><span className="clip-cue-count">CUE {index+1}/{clip.cues.length}</span>{clip.cues[index]}</div>;
}

// Instagram-style comments sheet for a post or clip. onCount reports the latest count so cards stay in sync.
export function CommentsSheet({item,user,actions,onClose,onCount}){
  const [comments,setComments]=useState(null);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [reportTarget,setReportTarget]=useState(null);
  const listRef=useRef(null);
  // You can remove your own comments, any comment on your own post, and admins can remove any.
  const ownsItem=item.kind!=="curated"&&item.author?.id===user.id;
  const canDelete=c=>c.authorId===user.id||ownsItem||user.isAdmin;

  useEffect(()=>{
    api.loadComments(item).then(list=>{setComments(list);onCount(list.length);})
      .catch(e=>{console.error(e);setComments([]);actions.flash("Couldn't load comments.");});
  },[item.id]);

  async function post(){
    const content=text.trim();
    if(!content||busy)return;
    setBusy(true);
    try{
      const saved=await api.addComment(item,content);
      const next=[...(comments||[]),saved];
      setComments(next);onCount(next.length);setText("");
      setTimeout(()=>listRef.current?.scrollTo({top:listRef.current.scrollHeight,behavior:"smooth"}),0);
    }catch(e){console.error(e);actions.flash("Couldn't post your comment — try again.");}
    setBusy(false);
  }
  async function remove(c){
    try{await api.deleteComment(c.id);const next=comments.filter(x=>x.id!==c.id);setComments(next);onCount(next.length);}
    catch(e){console.error(e);actions.flash("Couldn't delete the comment.");}
  }
  async function block(userId){
    const ok=await actions.block(userId);
    if(ok){const next=comments.filter(x=>x.authorId!==userId);setComments(next);onCount(next.length);}
    return ok;
  }

  return(
    <Sheet onClose={onClose}>
      <div className="modal-title" style={{textAlign:"center",marginBottom:12}}>Comments</div>
      <div ref={listRef} className="comment-list">
        {comments===null&&<div className="comment-empty">Loading…</div>}
        {comments?.length===0&&<div className="comment-empty"><div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>No comments yet</div>Start the conversation.</div>}
        {comments?.map(c=>(
          <div key={c.id} className="comment">
            <Avatar profile={c.author} size={32}/>
            <div style={{flex:1,minWidth:0}}>
              <div className="comment-meta"><strong>@{c.author.username}</strong><span>{timeAgo(c.createdAt)}</span></div>
              <div className="comment-text">{c.content}</div>
              <div className="comment-actions">
                {canDelete(c)&&<button onClick={()=>remove(c)}>Delete</button>}
                {c.authorId!==user.id&&<button onClick={()=>setReportTarget({type:"comment",id:c.id,userId:c.authorId,username:c.author.username})}>Report</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="comment-input">
        <Avatar profile={user} size={32}/>
        <input className="input-field" maxLength={1000} placeholder="Add a comment…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")post();}} aria-label="Add a comment"/>
        <button className="comment-post" onClick={post} disabled={!text.trim()||busy}>{busy?"…":"Post"}</button>
      </div>
      {reportTarget&&<ReportSheet target={reportTarget} onReport={actions.report} onBlock={block} onClose={()=>setReportTarget(null)}/>}
    </Sheet>
  );
}

export const CommentIcon=({size=22,color="currentColor"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>
);

// One clip in a pop-up player — e.g. "▶ Form" from the workout log. Same video, crop and cues as Clips.
export function ClipPlayer({clip,user,actions,onClose}){
  const [muted,setMuted]=useState(true);
  const cueIdx=useCue(clip,true);
  const saved=user.savedClips.includes(clip.key);
  useEffect(()=>{const onKey=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",onKey);return ()=>document.removeEventListener("keydown",onKey);},[]);
  return(
    <div className="modal-overlay player-overlay" onClick={onClose}>
      <div className="player" onClick={e=>e.stopPropagation()} role="dialog" aria-label={clip.title}>
        <div className="player-frame">
          <ReelVideo clip={clip} active muted={muted}/>
          <div className="reel-frame-shade"/>
          {clip.cues.length>0&&<div className={clip.cuePosition==="top"?"reel-cue-top":"reel-cue-bottom"} style={clip.cuePosition==="top"?{top:58}:undefined}><CueBadge clip={clip} index={cueIdx}/></div>}
          <button className="player-close" onClick={onClose} aria-label="Close">✕</button>
          <button className="reel-mute" onClick={()=>setMuted(m=>!m)} aria-label={muted?"Turn sound on":"Turn sound off"}>{muted?"🔇":"🔊"}</button>
        </div>
        <div className="player-info">
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,marginBottom:4}}><span className="learn-badge">FORM TIPS</span>Lift'd Learn</div>
          <div style={{fontSize:15,fontWeight:700,lineHeight:1.35}}>{clip.title}</div>
          {clip.description&&<div style={{fontSize:13,color:"var(--muted)",marginTop:3,lineHeight:1.45}}>{clip.description}</div>}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,gap:10}}>
            <button className={`btn btn-sm ${saved?"":"btn-ghost"}`} onClick={()=>actions.toggleSaveClip(clip.key)}>{saved?"🔖 Saved":"🔖 Save for the gym"}</button>
            {clip.credit&&<span style={{fontSize:11,color:"var(--muted2)"}}>{clip.credit}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
