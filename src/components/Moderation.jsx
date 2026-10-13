import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { initials } from "../utils/helpers";

const REASONS=[
  ["spam","Spam or scam"],
  ["harassment","Harassment or bullying"],
  ["hate","Hate speech or symbols"],
  ["nudity","Nudity or sexual content"],
  ["violence","Violence or threats"],
  ["self_harm","Self-harm or eating disorder"],
  ["misinformation","Dangerous misinformation"],
  ["other","Something else"],
];

export function Sheet({onClose,children}){
  return <div className="modal-overlay" onClick={onClose}><div className="modal-sheet" onClick={e=>e.stopPropagation()}><div className="modal-handle"/>{children}</div></div>;
}

export function Avatar({profile,size=36}){
  return <div style={{width:size,height:size,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>{profile?.avatar?<img src={profile.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(profile?.name)}</div>;
}

// A short menu of actions (Report / Block / Delete …). options: [{label, icon, danger, onSelect}]
export function ActionSheet({title,options,onClose}){
  return(
    <Sheet onClose={onClose}>
      {title&&<div className="modal-sub" style={{textAlign:"center",marginBottom:14}}>{title}</div>}
      <div className="action-list">
        {options.map(o=><button key={o.label} className={`action-item ${o.danger?"danger":""}`} onClick={()=>{onClose();o.onSelect();}}><span>{o.icon}</span>{o.label}</button>)}
        <button className="action-item" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

// target: {type:"post"|"message"|"profile", id, userId, username}
export function ReportSheet({target,onReport,onBlock,onClose}){
  const [reason,setReason]=useState(""); const [details,setDetails]=useState("");
  const [busy,setBusy]=useState(false); const [done,setDone]=useState(false); const [blocked,setBlocked]=useState(false);
  const what=target.type==="profile"?`@${target.username}`:`this ${target.type}`;
  async function submit(){
    if(!reason||busy)return;
    setBusy(true);
    const ok=await onReport({targetType:target.type,targetId:target.id,reason,details:details.trim()});
    setBusy(false);
    if(ok)setDone(true);
  }
  if(done)return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:"center",padding:"6px 0 4px"}}>
        <div style={{fontSize:40,marginBottom:10}}>🛡️</div>
        <div className="modal-title">Thanks for reporting</div>
        <div className="modal-sub">Our team will review it. You can also block @{target.username} so you won't see each other's posts or messages.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!blocked&&<button className="btn-danger" onClick={async()=>{if(await onBlock(target.userId))setBlocked(true);}}>Block @{target.username}</button>}
          {blocked&&<div style={{fontSize:13,fontWeight:700,color:"var(--accent3)",marginBottom:4}}>✓ Blocked @{target.username}</div>}
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </Sheet>
  );
  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Report {what}</div>
      <div className="modal-sub">Why are you reporting it? Reports are private — @{target.username} won't know it was you.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {REASONS.map(([id,label])=><button key={id} className={`reason-option ${reason===id?"sel":""}`} onClick={()=>setReason(id)}><span className="reason-radio"/>{label}</button>)}
      </div>
      {reason&&<textarea className="input-field" maxLength={500} placeholder="Anything else we should know? (optional)" value={details} onChange={e=>setDetails(e.target.value)} style={{width:"100%",minHeight:64,resize:"none",marginBottom:14}}/>}
      <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button><button className="btn" style={{flex:1}} onClick={submit} disabled={!reason||busy}>{busy?"Sending…":"Submit report"}</button></div>
    </Sheet>
  );
}

export function BlockSheet({username,onConfirm,onClose}){
  const [busy,setBusy]=useState(false);
  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Block @{username}?</div>
      <div className="modal-sub">You won't see each other's posts or chat messages, and they won't be told you blocked them. You can unblock anytime in Settings → Blocked Accounts.</div>
      <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button><button className="btn-danger" style={{flex:1,width:"auto"}} disabled={busy} onClick={async()=>{setBusy(true);const ok=await onConfirm();setBusy(false);if(ok)onClose();}}>{busy?"Blocking…":"Block"}</button></div>
    </Sheet>
  );
}

export function BlockedAccountsSheet({onUnblock,onClose}){
  const [list,setList]=useState(null); const [error,setError]=useState(false);
  useEffect(()=>{api.loadBlocked().then(setList).catch(()=>setError(true));},[]);
  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Blocked accounts</div>
      <div className="modal-sub">People you've blocked can't see your posts or messages, and you won't see theirs.</div>
      {error&&<div className="auth-error">Couldn't load your blocked accounts.</div>}
      {!error&&list===null&&<div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>Loading…</div>}
      {list?.length===0&&<div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>You haven't blocked anyone.</div>}
      {list?.map(p=>(
        <div key={p.id} className="food-item">
          <div style={{display:"flex",alignItems:"center",gap:10}}><Avatar profile={p} size={34}/><div><div className="food-name">{p.name}</div><div className="food-amount">@{p.username}</div></div></div>
          <button className="btn btn-sm btn-ghost" onClick={async()=>{if(await onUnblock(p.id))setList(l=>l.filter(x=>x.id!==p.id));}}>Unblock</button>
        </div>
      ))}
      <button className="btn btn-ghost" style={{width:"100%",marginTop:14}} onClick={onClose}>Done</button>
    </Sheet>
  );
}

export function DeleteAccountSheet({onDelete,onClose}){
  const [typed,setTyped]=useState(""); const [busy,setBusy]=useState(false);
  const ready=typed.trim().toUpperCase()==="DELETE";
  return(
    <Sheet onClose={busy?undefined:onClose}>
      <div className="modal-title">Delete your account?</div>
      <div className="modal-sub">This permanently deletes your profile, photo, workouts, food log, posts, messages, gym memberships and friends. It can't be undone.</div>
      <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:6}}>Type DELETE to confirm</div>
      <input className="input-field" style={{width:"100%",marginBottom:16}} value={typed} onChange={e=>setTyped(e.target.value)} placeholder="DELETE" autoCapitalize="characters"/>
      <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1}} onClick={onClose} disabled={busy}>Cancel</button><button className="btn-danger" style={{flex:1,width:"auto",opacity:ready?1:0.5}} disabled={!ready||busy} onClick={async()=>{setBusy(true);const ok=await onDelete();if(!ok)setBusy(false);}}>{busy?"Deleting…":"Delete forever"}</button></div>
    </Sheet>
  );
}
