import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { timeAgo } from "../utils/helpers";
import { Sheet, Avatar } from "./Moderation";

const CATEGORIES=[["bug","🐞 Bug"],["idea","💡 Idea"],["other","💬 Other"]];
const label=id=>CATEGORIES.find(c=>c[0]===id)?.[1]||id;

// Settings → Send Feedback.
export function FeedbackSheet({actions,onClose}){
  const [category,setCategory]=useState("idea");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false); const [sent,setSent]=useState(false); const [err,setErr]=useState("");
  async function send(){
    if(!message.trim()){setErr("Write a few words first.");return;}
    setBusy(true);setErr("");
    try{await api.sendFeedback({category,message:message.trim()});setSent(true);}
    catch(e){console.error(e);setErr("Couldn't send — check your connection and try again.");}
    setBusy(false);
  }
  if(sent)return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:"center",padding:"6px 0 4px"}}>
        <div style={{fontSize:40,marginBottom:10}}>🙌</div>
        <div className="modal-title">Thanks for the feedback!</div>
        <div className="modal-sub">We read every message — it helps shape what we build next.</div>
        <button className="btn" style={{width:"100%"}} onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
  return(
    <Sheet onClose={busy?undefined:onClose}>
      <div className="modal-title">Send feedback</div>
      <div className="modal-sub">Found a bug or have an idea? Tell us — your username is included so we can follow up.</div>
      {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
      <div style={{display:"flex",gap:6,marginBottom:12}}>{CATEGORIES.map(([id,l])=><button key={id} className={`filter-pill ${category===id?"active":""}`} onClick={()=>setCategory(id)}>{l}</button>)}</div>
      <textarea className="input-field" autoFocus maxLength={2000} placeholder={category==="bug"?"What happened, and what did you expect?":category==="idea"?"What would make Lift'd better for you?":"What's on your mind?"} value={message} onChange={e=>{setMessage(e.target.value);setErr("");}} style={{width:"100%",minHeight:130,resize:"vertical",marginBottom:6}}/>
      <div className="field-hint" style={{textAlign:"right",marginBottom:14}}>{message.length}/2000</div>
      <button className="btn" style={{width:"100%"}} onClick={send} disabled={busy}>{busy?"Sending…":"Send feedback"}</button>
    </Sheet>
  );
}

// Admin-only: read what people have sent.
export function FeedbackInbox({actions,onClose}){
  const [items,setItems]=useState(null);
  const [filter,setFilter]=useState("all");
  useEffect(()=>{api.loadFeedback().then(setItems).catch(e=>{console.error(e);setItems([]);actions.flash("Couldn't load feedback.");});},[]);
  async function remove(id){
    try{await api.deleteFeedback(id);setItems(list=>list.filter(f=>f.id!==id));}
    catch(e){console.error(e);actions.flash("Couldn't delete that — try again.");}
  }
  const shown=(items||[]).filter(f=>filter==="all"||f.category===filter);
  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Feedback inbox</div>
      <div className="modal-sub">Only admins can see this.</div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>{[["all","All"],...CATEGORIES].map(([id,l])=><button key={id} className={`filter-pill ${filter===id?"active":""}`} onClick={()=>setFilter(id)}>{l}{items&&id!=="all"?` ${items.filter(f=>f.category===id).length}`:""}</button>)}</div>
      {items===null&&<div className="comment-empty">Loading…</div>}
      {items&&shown.length===0&&<div className="comment-empty">No feedback yet.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {shown.map(f=>(
          <div key={f.id} className="feedback-item">
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <Avatar profile={f.author} size={26}/>
              <div style={{fontSize:12,fontWeight:700,flex:1,minWidth:0}}>{f.author?`@${f.author.username}`:"Deleted account"}<span style={{color:"var(--muted2)",fontWeight:500}}> · {timeAgo(f.createdAt)}</span></div>
              <span className="tag">{label(f.category)}</span>
            </div>
            <div style={{fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{f.message}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6,gap:10}}>
              <span className="field-hint" style={{margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.device}</span>
              <button className="link-btn" style={{margin:0,color:"var(--muted)"}} onClick={()=>remove(f.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
