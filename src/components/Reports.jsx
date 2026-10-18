import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { timeAgo } from "../utils/helpers";
import { Sheet, ActionSheet, Avatar } from "./Moderation";

const REASON_LABEL={spam:"Spam or scam",harassment:"Harassment or bullying",hate:"Hate speech or symbols",nudity:"Nudity or sexual content",violence:"Violence or threats",self_harm:"Self-harm or eating disorder",misinformation:"Dangerous misinformation",other:"Something else"};
const TYPE_LABEL={post:"Post",comment:"Comment",message:"Chat message",dm:"Direct message",profile:"Account"};
const STATUS_LABEL={open:"Open",dismissed:"Dismissed",actioned:"Actioned"};

// Admin-only: everything people have reported. Remove the content, ban the account, or dismiss.
// Acting on one report closes every open report on the same thing.
export default function ReportsInbox({actions,onClose}){
  const [view,setView]=useState("open");
  const [items,setItems]=useState(null);
  const [banned,setBanned]=useState(null);
  const [busy,setBusy]=useState(null); // report id being handled
  const [confirm,setConfirm]=useState(null); // {report, action} waiting for "are you sure"
  const [menu,setMenu]=useState(null);

  function load(){
    if(view==="banned"){setBanned(null);api.adminBannedUsers().then(setBanned).catch(fail);}
    else{setItems(null);api.adminReports(view).then(setItems).catch(fail);}
  }
  function fail(e){console.error(e);setItems([]);setBanned([]);actions.flash("Couldn't load reports.");}
  useEffect(load,[view]);

  async function resolve(r,action){
    setBusy(r.id);
    try{
      await api.resolveReport(r.id,action);
      actions.flash(action==="dismiss"?"Report dismissed.":action==="remove"?"Content removed.":action==="ban"?`@${r.targetUsername} is banned.`:`Removed, and @${r.targetUsername} is banned.`);
      load();
    }catch(e){console.error(e);actions.flash("Couldn't do that — try again.");}
    setBusy(null);
  }
  async function unban(u){
    try{await api.adminUnban(u.id);setBanned(list=>list.filter(x=>x.id!==u.id));actions.flash(`@${u.username} can sign in again.`);}
    catch(e){console.error(e);actions.flash("Couldn't unban — try again.");}
  }

  // What can be done to a report depends on what was reported and whether it's still there.
  function options(r){
    const canRemove=["post","comment","message","dm"].includes(r.targetType)&&!r.contentGone;
    const canBan=r.targetUserId&&!r.targetBanned;
    const o=[];
    if(canRemove)o.push({icon:"🗑️",label:`Remove ${TYPE_LABEL[r.targetType].toLowerCase()}`,onSelect:()=>setConfirm({r,action:"remove"})});
    if(canRemove&&canBan)o.push({icon:"⛔",label:`Remove & ban @${r.targetUsername}`,danger:true,onSelect:()=>setConfirm({r,action:"remove_ban"})});
    else if(canBan)o.push({icon:"⛔",label:`Ban @${r.targetUsername}`,danger:true,onSelect:()=>setConfirm({r,action:"ban"})});
    o.push({icon:"✓",label:"Dismiss — nothing wrong",onSelect:()=>resolve(r,"dismiss")});
    return o;
  }

  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Reports</div>
      <div className="modal-sub">Only admins can see this. Review reports within 24 hours — Apple expects objectionable content to be removed quickly.</div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["open","Open"],["all","All"],["banned","Banned"]].map(([id,l])=><button key={id} className={`filter-pill ${view===id?"active":""}`} onClick={()=>setView(id)}>{l}</button>)}
      </div>

      {view==="banned"?(<>
        {banned===null&&<div className="comment-empty">Loading…</div>}
        {banned?.length===0&&<div className="comment-empty">No banned accounts.</div>}
        {banned?.map(u=>(
          <div key={u.id} className="food-item">
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><Avatar profile={u} size={34}/><div style={{minWidth:0}}><div className="food-name">{u.name}</div><div className="food-amount">@{u.username} · banned {timeAgo(u.bannedAt)}</div></div></div>
            <button className="btn btn-sm btn-ghost" onClick={()=>unban(u)}>Unban</button>
          </div>
        ))}
      </>):(<>
        {items===null&&<div className="comment-empty">Loading…</div>}
        {items?.length===0&&<div className="comment-empty"><div style={{fontSize:32,marginBottom:6}}>✅</div>{view==="open"?"No open reports. All clear.":"No reports yet."}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {items?.map(r=>(
            <div key={r.id} className="feedback-item">
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                <span className="tag">{TYPE_LABEL[r.targetType]||r.targetType}</span>
                <span style={{fontSize:13,fontWeight:700}}>{REASON_LABEL[r.reason]||r.reason}</span>
                {r.reportCount>1&&<span className="tag" style={{background:"rgba(255,122,110,0.14)",color:"#FF7A6E",borderColor:"rgba(255,122,110,0.3)"}}>{r.reportCount} reports</span>}
                <span style={{marginLeft:"auto",fontSize:11,color:"var(--muted2)"}}>{timeAgo(r.createdAt)}</span>
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>
                {r.targetUsername?<>Against <strong style={{color:"var(--text)"}}>@{r.targetUsername}</strong>{r.targetBanned&&" (banned)"}</>:"Account deleted"}
                {" · "}by @{r.reporter||"deleted account"}
                {r.status!=="open"&&<> · <strong>{STATUS_LABEL[r.status]}</strong></>}
              </div>
              {r.contentGone&&r.targetType!=="profile"?<div className="report-preview" style={{fontStyle:"italic",color:"var(--muted)"}}>Already removed.</div>:(
                <div className="report-preview">
                  {r.mediaType==="image"&&r.mediaUrl&&<img src={r.mediaUrl} alt=""/>}
                  {r.mediaType==="video"&&r.mediaUrl&&<video src={r.mediaUrl} controls muted playsInline preload="metadata"/>}
                  {r.preview&&<div style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{r.preview}</div>}
                </div>
              )}
              {r.details&&<div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>Reporter's note: “{r.details}”</div>}
              {r.status==="open"&&<button className="btn btn-sm" style={{width:"100%",marginTop:10}} disabled={busy===r.id} onClick={()=>setMenu(r)}>{busy===r.id?"Working…":"Take action"}</button>}
            </div>
          ))}
        </div>
      </>)}

      {menu&&<ActionSheet title={`${TYPE_LABEL[menu.targetType]} by @${menu.targetUsername||"deleted account"}`} options={options(menu)} onClose={()=>setMenu(null)}/>}
      {confirm&&<Sheet onClose={()=>setConfirm(null)}>
        <div className="modal-title">{confirm.action==="remove"?"Remove this content?":`Ban @${confirm.r.targetUsername}?`}</div>
        <div className="modal-sub">{confirm.action==="remove"?"It's deleted for everyone. This can't be undone."
          :`They're signed out everywhere and can't sign back in. Their profile, posts and comments are hidden from everyone. You can unban them later from the Banned tab.${confirm.action==="remove_ban"?" The reported content is deleted too.":""}`}</div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setConfirm(null)}>Cancel</button>
          <button className="btn-danger" style={{flex:1,marginTop:0}} onClick={()=>{const c=confirm;setConfirm(null);resolve(c.r,c.action);}}>{confirm.action==="remove"?"Remove":"Ban"}</button>
        </div>
      </Sheet>}
    </Sheet>
  );
}
