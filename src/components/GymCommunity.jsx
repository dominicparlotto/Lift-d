import { useState, useEffect, useRef } from "react";
import * as api from "../lib/api";
import { timeAgo, currentWeek } from "../utils/helpers";
import { unitsOf, fmtW, fmtD } from "../utils/units";
import { Sheet, ActionSheet, ReportSheet, BlockSheet } from "./Moderation";

const backBtn={background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:13,fontWeight:700,marginBottom:4,padding:0};
const plural=(n,word)=>`${n} ${word}${n===1?"":"s"}`;

function GymCard({gym,onOpen,action}){
  return(
    <div className="gym-card" onClick={onOpen}>
      <div style={{minWidth:0}}><div className="gym-name">{gym.name}</div><div className="gym-loc">📍 {gym.location||"Location not set"}</div></div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
        <div className="gym-badge">{plural(gym.memberCount,"member")}</div>
        {gym.liveCount>0&&<div style={{fontSize:11,color:"var(--accent3)",fontWeight:700}}>🟢 {gym.liveCount} training now</div>}
        {action}
      </div>
    </div>
  );
}

// Community tab: your gyms, every other gym on Lift'd (join with one tap), and "Add Gym".
export function GymList({user,actions,onOpen}){
  const [gyms,setGyms]=useState(null);
  const [query,setQuery]=useState("");
  const [joining,setJoining]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const [name,setName]=useState(""); const [location,setLocation]=useState("");
  const [creating,setCreating]=useState(false); const [createErr,setCreateErr]=useState("");

  useEffect(()=>{api.loadGyms(user.id).then(setGyms).catch(e=>{console.error(e);setGyms([]);actions.flash("Couldn't load gyms — check your connection.");});},[user.id]);

  const matches=g=>!query||`${g.name} ${g.location}`.toLowerCase().includes(query.toLowerCase());
  const mine=(gyms||[]).filter(g=>g.role&&matches(g));
  const others=(gyms||[]).filter(g=>!g.role&&matches(g));

  async function join(gym){
    setJoining(gym.id);
    try{await api.joinGym(gym.id);onOpen(gym.id);}
    catch(e){console.error(e);actions.flash("Couldn't join that gym — try again.");setJoining(null);}
  }
  async function create(){
    if(name.trim().length<2){setCreateErr("Enter your gym's name.");return;}
    setCreating(true);setCreateErr("");
    try{const id=await api.createGym(name.trim(),location.trim());onOpen(id);}
    catch(e){console.error(e);setCreateErr("Couldn't create the gym — try again.");setCreating(false);}
  }

  return(
    <div style={{flex:1,overflow:"auto"}}>
      <div style={{padding:"8px 16px 4px"}}><input className="input-field" style={{width:"100%"}} placeholder="Find your gym by name or city…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      {gyms===null&&<div className="saved-empty">Loading gyms…</div>}
      {mine.length>0&&<>
        <div style={{padding:"12px 16px 6px"}}><span className="section-title">Your gyms</span></div>
        {mine.map(g=><GymCard key={g.id} gym={g} onOpen={()=>onOpen(g.id)}/>)}
      </>}
      {gyms!==null&&<>
        <div style={{padding:"14px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span className="section-title">{mine.length?"Other gyms":"Find your gym"}</span><button className="btn btn-sm" onClick={()=>setShowCreate(true)}>+ Add Gym</button></div>
        {others.length===0&&<div className="saved-empty" style={{padding:"18px 24px"}}><div style={{fontSize:13}}>{gyms.length===0?"No gyms on Lift'd yet — add yours and invite your gym crew.":query?"No gyms match that search. Add it if it's missing!":"You've joined every gym so far."}</div></div>}
        {others.map(g=><GymCard key={g.id} gym={g} onOpen={()=>onOpen(g.id)} action={<button className="btn btn-sm" disabled={joining===g.id} onClick={e=>{e.stopPropagation();join(g);}}>{joining===g.id?"Joining…":"Join"}</button>}/>)}
      </>}
      {showCreate&&<Sheet onClose={()=>setShowCreate(false)}>
        <div className="modal-title">Add your gym</div>
        <div className="modal-sub">Create a community for your gym. You'll get an invite link to share with people who train there.</div>
        {createErr&&<div className="auth-error" style={{marginBottom:12}}>{createErr}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          <input className="input-field" style={{width:"100%"}} maxLength={80} placeholder="Gym name" value={name} onChange={e=>setName(e.target.value)}/>
          <input className="input-field" style={{width:"100%"}} maxLength={80} placeholder="City (e.g. Austin, TX)" value={location} onChange={e=>setLocation(e.target.value)}/>
        </div>
        <button className="btn" style={{width:"100%"}} onClick={create} disabled={creating}>{creating?"Creating…":"Create gym community"}</button>
      </Sheet>}
    </div>
  );
}

// One gym: live chat (members only), weekly leaderboard, who's training count, invite link.
export function GymRoom({gymId,user,actions,onBack}){
  const [gym,setGym]=useState(null); const [error,setError]=useState(false);
  const [channels,setChannels]=useState([]); const [channelId,setChannelId]=useState(null);
  const [messages,setMessages]=useState([]); const [loadingMsgs,setLoadingMsgs]=useState(false);
  const [input,setInput]=useState(""); const [sending,setSending]=useState(false);
  const [liveCount,setLiveCount]=useState(0);
  const [view,setView]=useState("chat"); const [board,setBoard]=useState(null);
  const [copied,setCopied]=useState(false); const [joining,setJoining]=useState(false);
  const [showAddCh,setShowAddCh]=useState(false); const [newCh,setNewCh]=useState(""); const [chErr,setChErr]=useState("");
  const [menu,setMenu]=useState(null); // "gym" or a message
  const [reportTarget,setReportTarget]=useState(null); const [blockTarget,setBlockTarget]=useState(null);
  const listRef=useRef(null);
  const profiles=useRef({}); // author cache for live messages
  const member=!!gym?.role;
  const channelName=channels.find(c=>c.id===channelId)?.name||"general";

  const loadGym=()=>api.loadGym(gymId,user.id).then(setGym).catch(e=>{console.error(e);setError(true);});
  useEffect(()=>{loadGym();},[gymId]);

  useEffect(()=>{
    if(!member)return;
    api.loadChannels(gymId).then(chs=>{setChannels(chs);setChannelId(id=>chs.some(c=>c.id===id)?id:chs[0]?.id||null);})
      .catch(e=>{console.error(e);actions.flash("Couldn't load channels.");});
  },[gymId,member]);

  // How many people are checked in here, kept live.
  useEffect(()=>{
    const refresh=()=>api.loadCheckins(gymId).then(list=>setLiveCount(list.length)).catch(()=>{});
    refresh();
    const unsubscribe=api.subscribeToCheckins(refresh);
    const timer=setInterval(refresh,60000); // also drops check-ins as they expire
    return ()=>{unsubscribe();clearInterval(timer);};
  },[gymId]);

  // Messages for the open channel, then new ones arrive live.
  useEffect(()=>{
    if(!channelId)return;
    let alive=true;
    setLoadingMsgs(true);setMessages([]);
    api.loadMessages(channelId).then(list=>{
      if(!alive)return;
      list.forEach(m=>{if(m.author)profiles.current[m.authorId]=m.author;});
      setMessages(list);setLoadingMsgs(false);
    }).catch(e=>{console.error(e);if(alive){setLoadingMsgs(false);actions.flash("Couldn't load messages.");}});
    const unsubscribe=api.subscribeToMessages(channelId,async m=>{
      let author=profiles.current[m.authorId];
      if(!author){try{author=await api.fetchProfile(m.authorId);profiles.current[m.authorId]=author;}catch{/* show without a name */}}
      if(alive)setMessages(list=>list.some(x=>x.id===m.id)?list:[...list,{...m,author}]);
    });
    return ()=>{alive=false;unsubscribe();};
  },[channelId]);

  useEffect(()=>{const el=listRef.current;if(el)el.scrollTop=el.scrollHeight;},[messages.length,view]);

  useEffect(()=>{
    if(view==="board"&&member)api.loadLeaderboards(gymId,currentWeek()[0].key).then(setBoard).catch(e=>{console.error(e);setBoard([]);actions.flash("Couldn't load the leaderboard.");});
  },[view,gymId,member]);

  async function send(){
    const text=input.trim();
    if(!text||sending||!channelId)return;
    setSending(true);
    try{
      const m=await api.sendMessage(channelId,text);
      profiles.current[m.authorId]=m.author;
      setMessages(list=>list.some(x=>x.id===m.id)?list:[...list,m]);
      setInput("");
    }catch(e){console.error(e);actions.flash("Couldn't send — check your connection.");}
    setSending(false);
  }
  async function addChannel(){
    const name=newCh.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").slice(0,30);
    if(!name){setChErr("Use letters, numbers and dashes.");return;}
    try{const ch=await api.createChannel(gymId,name);setChannels(c=>[...c,ch]);setChannelId(ch.id);setNewCh("");setChErr("");setShowAddCh(false);}
    catch(e){setChErr(e?.code==="23505"?"That channel already exists.":"Couldn't create the channel — try again.");}
  }
  async function join(){
    setJoining(true);
    try{await api.joinGym(gymId);await loadGym();}catch(e){console.error(e);actions.flash("Couldn't join — try again.");}
    setJoining(false);
  }
  async function leave(){
    try{await api.leaveGym(user.id,gymId);onBack();}catch(e){console.error(e);actions.flash("Couldn't leave the gym — try again.");}
  }
  const inviteLink=()=>`${window.location.origin}${window.location.pathname}#join=${gym.inviteCode}`;
  function copyInvite(){
    const done=()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);};
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(inviteLink()).then(done).catch(()=>actions.flash("Couldn't copy — press and hold the link to copy it."));
    else actions.flash("Couldn't copy — press and hold the link to copy it.");
  }
  async function block(userId){
    const ok=await actions.block(userId);
    if(ok)setMessages(list=>list.filter(m=>m.authorId!==userId));
    return ok;
  }
  async function removeMessage(m){
    try{await api.deleteMessage(m.id);setMessages(list=>list.filter(x=>x.id!==m.id));}catch(e){console.error(e);actions.flash("Couldn't delete the message.");}
  }

  if(error)return(<div className="saved-empty" style={{paddingTop:80}}><div style={{marginBottom:14}}>Couldn't load this gym.</div><button className="btn btn-sm" onClick={onBack}>← Back to gyms</button></div>);
  if(!gym)return(<div className="saved-empty" style={{paddingTop:80}}>Loading…</div>);

  const msgMenuFor=m=>m.authorId===user.id
    ?[{icon:"🗑️",label:"Delete message",danger:true,onSelect:()=>removeMessage(m)}]
    :[{icon:"🚩",label:"Report message",onSelect:()=>setReportTarget({type:"message",id:m.id,userId:m.authorId,username:m.author?.username||"member"})},
      {icon:"🚫",label:`Block @${m.author?.username||"member"}`,danger:true,onSelect:()=>setBlockTarget({userId:m.authorId,username:m.author?.username||"member"})}];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 64px)"}}>
      <div className="header" style={{paddingBottom:8,gap:10}}>
        <div style={{minWidth:0}}><button onClick={onBack} style={backBtn}>← Gyms</button><div className="header-title" style={{fontSize:17}}>{gym.name}</div><div className="header-sub">{plural(gym.memberCount,"member")}{gym.location?` · ${gym.location}`:""}</div></div>
        {member&&<div style={{display:"flex",gap:8,flexShrink:0}}><button className={`btn btn-sm ${view==="board"?"":"btn-ghost"}`} onClick={()=>setView(v=>v==="board"?"chat":"board")} aria-label="Leaderboard">🏆</button><button className="btn btn-sm btn-ghost" onClick={()=>setMenu("gym")} aria-label="Gym options">⋯</button></div>}
      </div>
      {member&&<div className="invite-box"><span>🔗</span><span className="invite-link">{window.location.host}{window.location.pathname}#join={gym.inviteCode}</span><button className="copy-btn" onClick={copyInvite}>{copied?"✓ Copied!":"Copy"}</button></div>}
      {liveCount>0&&<div className="invite-box" style={{background:"rgba(62,207,207,0.08)",borderColor:"rgba(62,207,207,0.25)",flexShrink:0}}><span>🟢</span><span className="invite-link" style={{color:"var(--text)"}}>{liveCount} {liveCount===1?"person is":"people are"} training here now</span></div>}

      {!member?(
        <div style={{padding:"28px 24px",textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:12}}>🏋️</div>
          <div style={{fontSize:20,fontWeight:800,marginBottom:8}}>Join {gym.name}</div>
          <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6,marginBottom:22}}>Members can chat, see who's training right now, add workout buddies, and compete on the weekly leaderboard.</div>
          <button className="btn" style={{width:"100%"}} onClick={join} disabled={joining}>{joining?"Joining…":"Join gym"}</button>
        </div>
      ):view==="board"?(
        <Leaderboards board={board} user={user}/>
      ):(
        <div className="chat-wrap" style={{flex:1,height:"auto",minHeight:0}}>
          <div className="channels"><div className="channel-label">Channels</div>{channels.map(ch=><div key={ch.id} className={`channel-item ${channelId===ch.id?"active":""}`} onClick={()=>setChannelId(ch.id)}>#{ch.name}</div>)}<button className="add-channel-btn" onClick={()=>setShowAddCh(true)}>+ Add</button></div>
          <div className="messages">
            <div className="msg-list" ref={listRef}>
              {loadingMsgs&&<div style={{color:"var(--muted)",fontSize:13,padding:12}}>Loading…</div>}
              {!loadingMsgs&&messages.length===0&&<div style={{color:"var(--muted)",fontSize:13,padding:12}}>No messages in #{channelName} yet — say hi 👋</div>}
              {messages.map(m=>(
                <div key={m.id} className="msg">
                  <div className="msg-header"><span className="msg-user">{m.authorId===user.id?"You":`@${m.author?.username||"member"}`}</span><span className="msg-time">{timeAgo(m.createdAt)}</span><button className="msg-more" onClick={()=>setMenu(m)} aria-label="Message options">⋯</button></div>
                  <div className="msg-text">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="msg-input-wrap"><input className="msg-input" maxLength={1000} placeholder={`Message #${channelName}`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/><button className="btn btn-sm" onClick={send} disabled={sending||!input.trim()}>Send</button></div>
          </div>
        </div>
      )}

      {menu==="gym"&&<ActionSheet title={gym.name} onClose={()=>setMenu(null)} options={[
        {icon:"🔗",label:"Copy invite link",onSelect:copyInvite},
        {icon:"#",label:"New channel",onSelect:()=>setShowAddCh(true)},
        {icon:"🚪",label:"Leave gym",danger:true,onSelect:leave},
      ]}/>}
      {menu&&menu!=="gym"&&<ActionSheet onClose={()=>setMenu(null)} options={msgMenuFor(menu)}/>}
      {reportTarget&&<ReportSheet target={reportTarget} onReport={actions.report} onBlock={block} onClose={()=>setReportTarget(null)}/>}
      {blockTarget&&<BlockSheet username={blockTarget.username} onConfirm={()=>block(blockTarget.userId)} onClose={()=>setBlockTarget(null)}/>}
      {showAddCh&&<Sheet onClose={()=>setShowAddCh(false)}>
        <div className="modal-title">New channel</div>
        {chErr&&<div className="auth-error" style={{marginBottom:12}}>{chErr}</div>}
        <input className="input-field" style={{width:"100%",marginBottom:14}} maxLength={30} placeholder="e.g. powerlifting" value={newCh} onChange={e=>setNewCh(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addChannel()}/>
        <button className="btn" style={{width:"100%"}} onClick={addChannel}>Create channel</button>
      </Sheet>}
    </div>
  );
}

// Gym competitions, all from what members log in the Workout tab. Weekly boards reset every Monday.
const BOARDS=[
  {id:"volume",label:"🏋️ Volume",title:"This week's volume",value:e=>e.volume,show:(e,u)=>fmtW(Math.round(e.volume),u),
   note:"Weight × reps from every lift logged this week (Mon–Sun)."},
  {id:"miles",label:"🏃 Distance",title:"Distance run this week",value:e=>e.miles,show:(e,u)=>fmtD(e.miles,u),
   note:"Miles from runs logged this week — Running Treadmill, Running Outdoor and Sprint Intervals."},
  {id:"streak",label:"🔥 5-day weeks",title:"5-day week streak",value:e=>e.streak*1000+e.fiveDayWeeks*10+e.daysThisWeek,
   show:e=>`${e.streak} ${e.streak===1?"week":"weeks"}`,sub:e=>`${e.daysThisWeek} ${e.daysThisWeek===1?"day":"days"} this week${e.daysThisWeek<5?` (${5-e.daysThisWeek} to go)`:" ✓"} · ${e.fiveDayWeeks} five-day ${e.fiveDayWeeks===1?"week":"weeks"} total`,
   note:"Weeks in a row with at least 5 different days of logged workouts. This week counts once you hit day 5."},
];
function Leaderboards({board,user}){
  const units=unitsOf(user);
  const [id,setId]=useState("volume");
  const b=BOARDS.find(x=>x.id===id);
  const rows=(board||[]).filter(e=>b.value(e)>0||e.userId===user.id).sort((x,y)=>b.value(y)-b.value(x)||x.username.localeCompare(y.username));
  const ranked=rows.filter(e=>b.value(e)>0);
  const me=rows.find(e=>e.userId===user.id);
  const myRank=me&&b.value(me)>0?ranked.indexOf(me)+1:null;
  return(
    <div style={{flex:1,overflow:"auto",padding:"12px 16px"}}>
      <div className="board-tabs">{BOARDS.map(x=><button key={x.id} className={`board-tab ${id===x.id?"active":""}`} onClick={()=>setId(x.id)}>{x.label}</button>)}</div>
      <div className="card-title" style={{margin:"14px 0 10px"}}>🏆 {b.title}</div>
      {board===null&&<div style={{color:"var(--muted)",fontSize:13}}>Loading…</div>}
      {board&&ranked.length===0&&<div className="comment-empty">No one's on the board yet — log a workout to claim #1.</div>}
      {ranked.slice(0,25).map((e,i)=>(
        <div key={e.userId} className={`lb-row ${e.userId===user.id?"lb-me":""}`}>
          <div className={`lb-rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
          <div className="lb-name" style={{minWidth:0}}>@{e.username}{e.userId===user.id?" (you)":""}{b.sub&&<div style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>{b.sub(e)}</div>}</div>
          <div className="lb-score">{b.show(e,units)}</div>
        </div>
      ))}
      {me&&(!myRank||myRank>25)&&<div className="lb-row lb-me" style={{marginTop:8}}>
        <div className="lb-rank">{myRank||"–"}</div>
        <div className="lb-name">You{b.sub&&<div style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>{b.sub(me)}</div>}</div>
        <div className="lb-score">{b.show(me,units)}</div>
      </div>}
      <div style={{fontSize:11,color:"var(--muted2)",marginTop:12,lineHeight:1.5}}>{b.note} Updates as members log in the Workout tab. Only members of this gym can see it.</div>
    </div>
  );
}
