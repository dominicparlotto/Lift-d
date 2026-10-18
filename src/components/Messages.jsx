import { useState, useEffect, useRef } from "react";
import * as api from "../lib/api";
import { hasProfanity, isProfanityError, PROFANITY_MESSAGE } from "../utils/profanity";
import { Sheet, ActionSheet, ReportSheet, BlockSheet, Avatar } from "./Moderation";

const back=<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
export const PlaneIcon=({size=18})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const compose=<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;

// Short "time since" for the inbox list (Instagram style: 5m, 3h, 2d, 4w).
function ago(ms){
  const s=Math.max(0,(Date.now()-ms)/1000);
  if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;if(s<604800)return`${Math.floor(s/86400)}d`;return`${Math.floor(s/604800)}w`;
}
const clockTime=ms=>new Date(ms).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
function dayLabel(ms){
  const d=new Date(ms), today=new Date(); const y=new Date();y.setDate(today.getDate()-1);
  if(d.toDateString()===today.toDateString())return`Today ${clockTime(ms)}`;
  if(d.toDateString()===y.toDateString())return`Yesterday ${clockTime(ms)}`;
  return`${d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"})}, ${clockTime(ms)}`;
}

// All your conversations. "Requests" holds first messages from people you don't follow until you accept them.
export function MessagesInbox({user,actions,onBack}){
  const [threads,setThreads]=useState(null);
  const [tab,setTab]=useState("chats");
  const [q,setQ]=useState("");
  const [composing,setComposing]=useState(false);

  function load(){api.loadInbox().then(setThreads).catch(e=>{console.error(e);setThreads([]);actions.flash("Couldn't load your messages.");});}
  useEffect(()=>{load();return api.subscribeToThreads(()=>load());},[]);

  const requests=(threads||[]).filter(t=>t.isRequest);
  const shown=(threads||[]).filter(t=>(tab==="requests")===t.isRequest)
    .filter(t=>!q.trim()||`${t.other.username} ${t.other.name}`.toLowerCase().includes(q.trim().toLowerCase().replace(/^@/,"")));

  return(
    <div className="dm-screen">
      <div className="dm-header">
        <button className="dm-icon-btn" onClick={onBack} aria-label="Back">{back}</button>
        <div className="dm-title">{user.username}</div>
        <button className="dm-icon-btn" onClick={()=>setComposing(true)} aria-label="New message">{compose}</button>
      </div>
      <div style={{padding:"0 16px 10px"}}><input className="search-input dm-search" placeholder="Search messages" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="dm-tabs">
        <button className={`dm-tab ${tab==="chats"?"active":""}`} onClick={()=>setTab("chats")}>Messages</button>
        <button className={`dm-tab ${tab==="requests"?"active":""}`} onClick={()=>setTab("requests")}>Requests{requests.length>0&&<span className="dm-tab-count">{requests.length}</span>}</button>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {threads===null&&<div className="comment-empty">Loading…</div>}
        {threads&&shown.length===0&&(tab==="requests"
          ?<div className="saved-empty" style={{paddingTop:40}}><div style={{fontSize:36,marginBottom:10}}>📨</div><div style={{fontSize:14,fontWeight:700,marginBottom:6}}>No message requests</div><div style={{fontSize:12,lineHeight:1.5}}>Messages from people you don't follow land here first. They won't know you've seen them until you accept.</div></div>
          :q.trim()?<div className="comment-empty">No conversations match “{q.trim()}”.</div>
          :<div className="saved-empty" style={{paddingTop:40}}><div style={{marginBottom:10,display:"flex",justifyContent:"center"}}><PlaneIcon size={36}/></div><div style={{fontSize:14,fontWeight:700,marginBottom:6}}>No messages yet</div><div style={{fontSize:12,marginBottom:14}}>Message your gym crew — find a spotter, plan a session, share a PR.</div><button className="btn btn-sm" onClick={()=>setComposing(true)}>Send a message</button></div>)}
        {shown.map(t=>(
          <button key={t.id} className={`dm-row ${t.unread?"unread":""}`} onClick={()=>actions.openChat(t.other.id)}>
            <Avatar profile={t.other} size={52}/>
            <div style={{flex:1,minWidth:0,textAlign:"left"}}>
              <div className="dm-row-name">{t.other.name||t.other.username}</div>
              <div className="dm-row-preview"><span className="dm-row-text">{t.preview==null?"Message unsent":`${t.fromMe?"You: ":""}${t.preview}`}</span><span style={{flexShrink:0}}>{"\u00a0· "}{ago(t.lastMessageAt)}</span></div>
            </div>
            {t.unread&&<span className="dm-dot" aria-label="Unread"/>}
          </button>
        ))}
      </div>
      {composing&&<NewMessageSheet user={user} onPick={id=>{setComposing(false);actions.openChat(id);}} onClose={()=>setComposing(false)}/>}
    </div>
  );
}

// Pick someone to message (searches all accounts; anyone who blocked you is left out by the database).
function NewMessageSheet({user,onPick,onClose}){
  const [q,setQ]=useState(""); const [people,setPeople]=useState([]); const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!q.trim()){setPeople([]);return;}
    let alive=true;setBusy(true);
    const t=setTimeout(()=>api.searchProfiles(q).then(r=>{if(alive){setPeople(r.filter(p=>p.id!==user.id));setBusy(false);}}).catch(()=>{if(alive)setBusy(false);}),250);
    return ()=>{alive=false;clearTimeout(t);};
  },[q]);
  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">New message</div>
      <input className="input-field" autoFocus style={{width:"100%",marginBottom:12}} placeholder="Search name or @username" value={q} onChange={e=>setQ(e.target.value)}/>
      {busy&&people.length===0&&<div className="comment-empty">Searching…</div>}
      {!busy&&q.trim()&&people.length===0&&<div className="comment-empty">No accounts found.</div>}
      {people.map(p=>(
        <button key={p.id} className="dm-row" style={{padding:"8px 0"}} onClick={()=>onPick(p.id)}>
          <Avatar profile={p} size={40}/>
          <div style={{flex:1,minWidth:0,textAlign:"left"}}><div className="dm-row-name">{p.name}</div><div className="dm-row-preview">@{p.username}</div></div>
        </button>
      ))}
    </Sheet>
  );
}

// One conversation. Opened from the inbox, a profile's "Message" button, or a push notification (#dm=<user id>).
export function ChatView({userId,user,actions,onBack}){
  const [profile,setProfile]=useState(null);
  const [threadId,setThreadId]=useState(null);
  const [thread,setThread]=useState(null); // inbox row: request state + read receipts (null until the first message)
  const [messages,setMessages]=useState(null);
  const [text,setText]=useState(""); const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const [menu,setMenu]=useState(false); const [msgMenu,setMsgMenu]=useState(null);
  const [report,setReport]=useState(null); const [block,setBlock]=useState(false);
  const listRef=useRef(null);
  const isRequest=!!thread?.isRequest;

  const scrollDown=(smooth)=>setTimeout(()=>{const el=listRef.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:smooth?"smooth":"auto"});},0);
  const refreshThread=id=>api.loadThread(id).then(t=>{setThread(t);return t;}).catch(()=>null);

  useEffect(()=>{
    let alive=true, unsubs=[];
    api.fetchProfile(userId).then(p=>{if(alive)setProfile(p);}).catch(()=>{if(alive)setError("This account isn't available.");});
    api.openThread(userId).then(async id=>{
      if(!alive)return;
      setThreadId(id);
      const [msgs,t]=await Promise.all([api.loadDMs(id),refreshThread(id)]);
      if(!alive)return;
      setMessages(msgs);scrollDown(false);
      // Requests stay "unseen" until accepted (like Instagram), so the sender doesn't get a read receipt.
      if(t&&!t.isRequest&&t.unread)api.markThreadRead(id).then(actions.refreshDMs).catch(()=>{});
      unsubs.push(api.subscribeToDMs(id,m=>{
        setMessages(list=>list&&!list.some(x=>x.id===m.id)?[...list,m]:list);scrollDown(true);
        if(m.senderId!==user.id)refreshThread(id).then(t2=>{if(t2&&!t2.isRequest)api.markThreadRead(id).then(actions.refreshDMs).catch(()=>{});});
      }));
      // Read receipts / accepted request on the other side.
      unsubs.push(api.subscribeToThreads(row=>{if(row?.id===id)refreshThread(id);}));
    }).catch(e=>{console.error(e);if(alive){setError(e?.code==="42501"?"You can't message this account.":"Couldn't open this chat — check your connection.");setMessages([]);}});
    return ()=>{alive=false;unsubs.forEach(u=>u());};
  },[userId]);

  async function send(){
    const content=text.trim();
    if(!content||sending||!threadId)return;
    if(hasProfanity(content)){actions.flash(PROFANITY_MESSAGE);return;}
    setSending(true);
    try{
      const m=await api.sendDM(threadId,content);
      setMessages(list=>list.some(x=>x.id===m.id)?list:[...list,m]);setText("");scrollDown(true);
      refreshThread(threadId).then(()=>actions.refreshDMs());
    }catch(e){console.error(e);actions.flash(isProfanityError(e)?PROFANITY_MESSAGE:e?.code==="42501"?"You can't message this account.":"Couldn't send — check your connection.");}
    setSending(false);
  }
  async function accept(){
    setThread(t=>t&&{...t,isRequest:false}); // show the message box right away
    try{await api.acceptThread(threadId);await api.markThreadRead(threadId);refreshThread(threadId);actions.refreshDMs();}
    catch(e){console.error(e);setThread(t=>t&&{...t,isRequest:true});actions.flash("Couldn't accept — try again.");}
  }
  async function deleteChat(){
    try{await api.hideThread(threadId);actions.refreshDMs();onBack();}
    catch(e){console.error(e);actions.flash("Couldn't delete the chat — try again.");}
  }
  async function unsend(m){
    try{await api.unsendDM(m.id);setMessages(list=>list.filter(x=>x.id!==m.id));refreshThread(threadId);}
    catch(e){console.error(e);actions.flash("Couldn't unsend — try again.");}
  }
  async function doBlock(){const ok=await actions.block(userId);if(ok){actions.refreshDMs();onBack();}return ok;}

  const name=profile?.username||"…";
  // "Seen" under the newest message when it's mine and they've read it (like Instagram).
  const last=messages?.[messages.length-1];
  const seenId=last&&last.senderId===user.id&&thread?.otherReadAt&&last.createdAt<=thread.otherReadAt?last.id:null;

  return(
    <div className="dm-screen">
      <div className="dm-header">
        <button className="dm-icon-btn" onClick={onBack} aria-label="Back">{back}</button>
        <button className="profile-link dm-chat-who" onClick={()=>profile&&actions.openProfile(userId)}>
          <Avatar profile={profile} size={34}/>
          <div style={{minWidth:0}}><div className="dm-chat-name">{profile?.name||name}</div><div className="dm-chat-handle">@{name}</div></div>
        </button>
        {profile&&!error&&<button className="dm-icon-btn" onClick={()=>setMenu(true)} aria-label="Chat options">⋯</button>}
      </div>

      <div className="dm-messages" ref={listRef}>
        {profile&&<div className="dm-intro">
          <Avatar profile={profile} size={72}/>
          <div style={{fontWeight:800,fontSize:16,marginTop:8}}>{profile.name}</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>@{profile.username}{profile.skill?` · ${profile.skill}`:""}</div>
          <button className="btn btn-sm btn-ghost" style={{marginTop:10}} onClick={()=>actions.openProfile(userId)}>View profile</button>
        </div>}
        {error&&<div className="comment-empty">{error}</div>}
        {messages===null&&!error&&<div className="comment-empty">Loading…</div>}
        {messages?.map((m,i)=>{
          const mine=m.senderId===user.id, prev=messages[i-1];
          const gap=!prev||m.createdAt-prev.createdAt>60*60*1000;
          return(
            <div key={m.id}>
              {gap&&<div className="dm-time-sep">{dayLabel(m.createdAt)}</div>}
              <div className={`dm-bubble-row ${mine?"mine":""}`}>
                <button className={`dm-bubble ${mine?"mine":""}`} onClick={()=>setMsgMenu(m)} title={clockTime(m.createdAt)}>{m.content}</button>
              </div>
              {m.id===seenId&&<div className="dm-seen">Seen</div>}
            </div>
          );
        })}
        {thread?.waiting&&<div className="dm-note">Your message was sent as a request. @{name} will see it once they accept.</div>}
      </div>

      {isRequest?(
        <div className="dm-request-bar">
          <div style={{fontSize:13,color:"var(--muted)",textAlign:"center",marginBottom:10,lineHeight:1.45}}><strong style={{color:"var(--text)"}}>@{name}</strong> wants to send you a message. They won't know you've seen it until you accept.</div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" style={{flex:1,color:"#FF7A6E"}} onClick={()=>setBlock(true)}>Block</button>
            <button className="btn btn-ghost" style={{flex:1}} onClick={deleteChat}>Delete</button>
            <button className="btn" style={{flex:1}} onClick={accept}>Accept</button>
          </div>
        </div>
      ):!error&&(
        <div className="dm-input-bar">
          <textarea className="dm-input" rows={1} maxLength={2000} placeholder="Message…" value={text} disabled={!threadId}
            onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
          <button className="dm-send" onClick={send} disabled={!text.trim()||sending||!threadId}>Send</button>
        </div>
      )}

      {menu&&<ActionSheet onClose={()=>setMenu(false)} options={[
        {icon:"👤",label:"View profile",onSelect:()=>actions.openProfile(userId)},
        {icon:"🚩",label:`Report @${name}`,onSelect:()=>setReport({type:"profile",id:userId,userId,username:name})},
        {icon:"🗑️",label:"Delete chat",onSelect:deleteChat},
        {icon:"🚫",label:`Block @${name}`,danger:true,onSelect:()=>setBlock(true)},
      ]}/>}
      {msgMenu&&<ActionSheet title={msgMenu.content.length>80?msgMenu.content.slice(0,79)+"…":msgMenu.content} onClose={()=>setMsgMenu(null)} options={msgMenu.senderId===user.id
        ?[{icon:"↩️",label:"Unsend",danger:true,onSelect:()=>unsend(msgMenu)}]
        :[{icon:"🚩",label:"Report message",onSelect:()=>setReport({type:"dm",id:msgMenu.id,userId,username:name})}]}/>}
      {report&&<ReportSheet target={report} onReport={actions.report} onBlock={doBlock} onClose={()=>setReport(null)}/>}
      {block&&<BlockSheet username={name} onConfirm={doBlock} onClose={()=>setBlock(false)}/>}
    </div>
  );
}
