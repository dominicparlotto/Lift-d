import { useState, useRef } from "react";
import ClipsView from "./ClipsView";
import { INITIAL_GYMS } from "../data/social";
import { makeInvite, initials, timeAgo } from "../utils/helpers";

export default function SocialTab({user,posts,actions}){
  const [liked,setLiked]=useState({});
  const [saved,setSaved]=useState({});
  const [boosted,setBoosted]=useState({});
  const [view,setView]=useState("feed");
  const [searchQ,setSearchQ]=useState("");
  const [selectedGym,setSelectedGym]=useState(null);
  const [activeChannel,setActiveChannel]=useState("general");
  const [activeLbGym,setActiveLbGym]=useState(null);
  const [gyms,setGyms]=useState(INITIAL_GYMS);
  const [messages,setMessages]=useState({general:[{user:"alex_lifts",text:"Morning everyone! Leg day 💪",time:"8:02am"},{user:"sarahfitness",text:"Nice! I'll be in around noon",time:"8:15am"},{user:"musclemike",text:"Anyone want to team up for bench?",time:"9:30am"}],powerlifting:[{user:"biglifts99",text:"Comp is in 3 weeks, who's competing?",time:"7:00am"}],nutrition:[{user:"sarahfitness",text:"Anyone tried high protein overnight oats?",time:"6:45am"}]});
  const [msgInput,setMsgInput]=useState("");
  const [showUpload,setShowUpload]=useState(false);
  const [posting,setPosting]=useState(false);
  const [uploadCaption,setUploadCaption]=useState("");
  const [uploadFile,setUploadFile]=useState(null);
  const [showAddGym,setShowAddGym]=useState(false);
  const [newGymName,setNewGymName]=useState(""); const [newGymLoc,setNewGymLoc]=useState("");
  const [showAddCh,setShowAddCh]=useState(false); const [newCh,setNewCh]=useState("");
  const [copiedId,setCopiedId]=useState(null);
  const [filterMuscle,setFilterMuscle]=useState("All");
  const [filterSkill,setFilterSkill]=useState("All");
  const [filterEquip,setFilterEquip]=useState("All");
  const [showFilters,setShowFilters]=useState(false);
  const fileRef=useRef();

  const filteredPosts=posts.filter(p=>{
    if(searchQ&&!p.content.toLowerCase().includes(searchQ.toLowerCase())&&!p.author.username.toLowerCase().includes(searchQ.toLowerCase()))return false;
    if(filterMuscle!=="All"&&p.muscle!==filterMuscle&&p.muscle!=="All")return false;
    if(filterSkill!=="All"&&p.skill!==filterSkill&&p.skill!=="All")return false;
    return true;
  });

  function sendMsg(){if(!msgInput.trim())return;setMessages(prev=>({...prev,[activeChannel]:[...(prev[activeChannel]||[]),{user:user?.username||"You",text:msgInput,time:"now"}]}));setMsgInput("");}
  async function submitPost(){if(!uploadCaption.trim()||posting)return;setPosting(true);const ok=await actions.createPost({content:uploadCaption.trim(),hasVideo:!!uploadFile});setPosting(false);if(ok){setUploadCaption("");setUploadFile(null);setShowUpload(false);}}
  const toggleFollow=id=>actions.toggleFollow(id);
  const toggleSaveClip=id=>actions.toggleSaveClip(id);
  function addGym(){if(!newGymName.trim())return;const newG={id:Date.now(),name:newGymName,location:newGymLoc||"Unknown",members:1,channels:["general"],invite:makeInvite(newGymName),leaderboard:[{user:user?.username||"you",score:0}]};setGyms(prev=>[...prev,newG]);setNewGymName("");setNewGymLoc("");setShowAddGym(false);}
  function addChannel(){if(!newCh.trim()||!selectedGym)return;const ch=newCh.toLowerCase().replace(/\s+/g,"-");setGyms(prev=>prev.map(g=>g.id===selectedGym.id?{...g,channels:[...g.channels,ch]}:g));setSelectedGym(prev=>({...prev,channels:[...prev.channels,ch]}));setActiveChannel(ch);setNewCh("");setShowAddCh(false);}

  if(selectedGym){
    const cg=gyms.find(g=>g.id===selectedGym.id)||selectedGym;
    const lbView=activeLbGym===cg.id;
    return(
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 64px)"}}>
        <div className="header" style={{paddingBottom:8}}><div><button onClick={()=>setSelectedGym(null)} style={{background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:13,fontWeight:700,marginBottom:4}}>← Back</button><div className="header-title" style={{fontSize:17}}>{cg.name}</div><div className="header-sub">{cg.members} members</div></div><div style={{display:"flex",gap:8}}><button className="btn btn-sm btn-ghost" onClick={()=>setActiveLbGym(lbView?null:cg.id)}>🏆</button><button className="btn btn-sm" onClick={()=>setShowAddCh(true)}>+ Ch.</button></div></div>
        <div className="invite-box"><span>🔗</span><span className="invite-link">liftd.app/join/{cg.invite}</span><button className="copy-btn" onClick={()=>{setCopiedId(cg.id);setTimeout(()=>setCopiedId(null),2000);}}>{copiedId===cg.id?"✓ Copied!":"Copy"}</button></div>
        {lbView?(
          <div style={{flex:1,overflow:"auto",padding:"12px 16px"}}>
            <div className="card-title" style={{marginBottom:14}}>🏆 Leaderboard — Weekly Volume (lbs)</div>
            {cg.leaderboard.map((e,i)=>(
              <div key={i} className="lb-row">
                <div className={`lb-rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                <div className="lb-name">@{e.user}</div>
                <div className="lb-score">{e.score.toLocaleString()} lbs</div>
                {i===0&&<span style={{fontSize:18}}>👑</span>}
              </div>
            ))}
          </div>
        ):(
          <div className="chat-wrap" style={{flexDirection:"column",height:"auto",flex:1}}>
            {cg.liveNow?.length>0&&<div className="invite-box" style={{background:"rgba(62,207,207,0.08)",borderColor:"rgba(62,207,207,0.25)",flexShrink:0}}><span>🟢</span><span className="invite-link" style={{color:"var(--text)"}}>{cg.liveNow.length} {cg.liveNow.length===1?"person is":"people are"} at the gym right now</span></div>}
          <div className="chat-wrap" style={{flex:1}}>
            <div className="channels"><div className="channel-label">Channels</div>{cg.channels.map(ch=><div key={ch} className={`channel-item ${activeChannel===ch?"active":""}`} onClick={()=>setActiveChannel(ch)}>#{ch}</div>)}<button className="add-channel-btn" onClick={()=>setShowAddCh(true)}>+ Add</button></div>
            <div className="messages"><div className="msg-list">{(messages[activeChannel]||[{user:"liftdbot",text:`Welcome to #${activeChannel}! 👋`,time:"now"}]).map((m,i)=><div key={i} className="msg"><div className="msg-header"><span className="msg-user">{m.user}</span><span className="msg-time">{m.time}</span></div><div className="msg-text">{m.text}</div></div>)}</div><div className="msg-input-wrap"><input className="msg-input" placeholder={`Message #${activeChannel}`} value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()}/><button className="btn btn-sm" onClick={sendMsg}>Send</button></div></div>
          </div>
          </div>
        )}
        {showAddCh&&<div className="modal-overlay" onClick={()=>setShowAddCh(false)}><div className="modal-sheet" onClick={e=>e.stopPropagation()}><div className="modal-handle"/><div className="modal-title">Add Channel</div><input className="input-field" style={{width:"100%",marginBottom:14}} placeholder="channel-name" value={newCh} onChange={e=>setNewCh(e.target.value)}/><button className="btn" style={{width:"100%"}} onClick={addChannel}>Create Channel</button></div></div>}
      </div>
    );
  }

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div className="search-wrap">
        <div className="search-container"><svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="search-input" placeholder="Search posts, people, gyms…" value={searchQ} onChange={e=>{setSearchQ(e.target.value);setView(e.target.value?"search":"feed");}}/></div>
        <div className="chip-row">{[["feed","🎬 Feed"],["clips","▶ Clips"],["community","🏋️ Community"]].map(([v,l])=><button key={v} className={`chip ${view===v?"active":""}`} onClick={()=>{setView(v);setSearchQ("");}}>{l}</button>)}{(view==="feed"||view==="clips")&&<button className={`chip ${showFilters?"active":""}`} onClick={()=>setShowFilters(p=>!p)}>⚙ Filter</button>}</div>
        {showFilters&&(view==="feed"||view==="clips")&&<div style={{paddingTop:8}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted2)",marginBottom:6}}>Muscle Group</div>
          <div className="filter-row">{["All","Chest","Back","Legs","Shoulders","Arms","Core","Cardio"].map(m=><button key={m} className={`filter-pill ${filterMuscle===m?"active":""}`} onClick={()=>setFilterMuscle(m)}>{m}</button>)}</div>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted2)",marginBottom:6,marginTop:8}}>Skill Level</div>
          <div className="filter-row">{["All","Beginner","Intermediate","Advanced"].map(s=><button key={s} className={`filter-pill ${filterSkill===s?"active":""}`} onClick={()=>setFilterSkill(s)}>{s}</button>)}</div>
        </div>}
      </div>

      {view==="clips"?(
        <div style={{flex:1,overflow:"hidden"}}><ClipsView savedClips={user.savedClips} onSave={toggleSaveClip} filterMuscle={filterMuscle} filterSkill={filterSkill} filterEquip={filterEquip}/></div>
      ):view==="community"?(
        <div style={{flex:1,overflow:"auto"}}>
          <div style={{padding:"8px 16px 4px"}}><div className="gps-banner" onClick={()=>setSelectedGym(gyms[0])}><span style={{fontSize:20}}>📍</span><div className="gps-text">Near <strong>Iron Valley Gym</strong> · Athens, GA<br/><span style={{fontSize:11,color:"var(--muted)"}}>Tap to join their chat</span></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>
          <div style={{padding:"8px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span className="section-title">Gyms & Communities</span><button className="btn btn-sm" onClick={()=>setShowAddGym(true)}>+ Add Gym</button></div>
          {gyms.map(g=><div key={g.id} className="gym-card" onClick={()=>{setSelectedGym(g);setActiveChannel(g.channels[0]||"general");setActiveLbGym(null);}}><div><div className="gym-name">{g.name}</div><div className="gym-loc">📍 {g.location}</div></div><div style={{textAlign:"right"}}><div className="gym-badge">{g.members} members</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{g.channels.length} ch · 🏆 LB</div></div></div>)}
          {showAddGym&&<div className="modal-overlay" onClick={()=>setShowAddGym(false)}><div className="modal-sheet" onClick={e=>e.stopPropagation()}><div className="modal-handle"/><div className="modal-title">Add a Gym</div><div className="modal-sub">Create a gym community on Lift'd. An invite link will be generated automatically.</div><div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}><input className="input-field" style={{width:"100%"}} placeholder="Gym name" value={newGymName} onChange={e=>setNewGymName(e.target.value)}/><input className="input-field" style={{width:"100%"}} placeholder="Location (e.g. Athens, GA)" value={newGymLoc} onChange={e=>setNewGymLoc(e.target.value)}/></div><button className="btn" style={{width:"100%"}} onClick={addGym}>Create Gym Community</button></div></div>}
        </div>
      ):(
        <div style={{flex:1,overflow:"auto"}}>
          <div style={{padding:"10px 16px 4px",display:"flex",justifyContent:"flex-end"}}><button className="btn btn-sm" onClick={()=>setShowUpload(true)}>📹 Post</button></div>
          {posts.length===0&&<div className="saved-empty"><div style={{fontSize:40,marginBottom:12}}>🎬</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No posts yet</div><div style={{fontSize:12,marginBottom:16}}>Be the first to share a workout, PR, or tip.</div><button className="btn btn-sm" onClick={()=>setShowUpload(true)}>📹 Create a post</button></div>}
          {posts.length>0&&filteredPosts.length===0&&<div className="saved-empty"><div style={{fontSize:14}}>No posts match your search or filters.</div></div>}
          {filteredPosts.map(post=>{
            const a=post.author;
            const following=user.following.includes(a.id);
            return(
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-avatar" style={{background:"var(--grad)",overflow:"hidden"}}>{a.avatar?<img src={a.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(a.name)}</div>
                <div style={{flex:1}}>
                  <div className="post-username">@{a.username}</div>
                  <div className="post-time">{timeAgo(post.createdAt)}</div>
                </div>
                {a.id!==user.id&&<button className="follow-btn" style={{background:following?"var(--glass)":"var(--grad)",border:following?"1px solid var(--border)":"none",color:"#fff",padding:"5px 12px"}} onClick={()=>toggleFollow(a.id)}>
                  {following?"Following":"Follow"}
                </button>}
              </div>
              {post.hasVideo&&<div className="post-video"><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 40%,#4F8EF728 0%,transparent 65%)"}}/><div className="play-btn"><svg width="14" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>}
              <div className="post-content">{post.content}</div>
              <div className="post-actions">
                <button className={`action-btn ${liked[post.id]?"liked":""}`} onClick={()=>setLiked(p=>({...p,[post.id]:!p[post.id]}))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={liked[post.id]?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {liked[post.id]?1:0}
                </button>
                <button className={`action-btn ${saved[post.id]?"saved":""}`} onClick={()=>setSaved(p=>({...p,[post.id]:!p[post.id]}))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={saved[post.id]?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  Save
                </button>
                <button className={`action-btn ${boosted[post.id]?"boosted":""}`} onClick={()=>setBoosted(p=>({...p,[post.id]:!p[post.id]}))}>
                  <span style={{fontSize:14}}>⚡</span>
                  {boosted[post.id]?"Boosted!":"Boost"}
                </button>
                <button className="action-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
              </div>
            </div>
            );
          })}
          {showUpload&&<div className="modal-overlay" onClick={()=>setShowUpload(false)}><div className="modal-sheet" onClick={e=>e.stopPropagation()}><div className="modal-handle"/><div className="modal-title">New Post</div><div className="modal-sub">Share a workout clip. Videos must be under 5 minutes.</div><input ref={fileRef} type="file" accept="video/*,image/*" style={{display:"none"}} onChange={e=>setUploadFile(e.target.files[0])}/>{uploadFile?(<div style={{borderRadius:16,overflow:"hidden",height:130,background:"var(--glass)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,position:"relative"}}><div style={{fontSize:40}}>🎥</div><div style={{position:"absolute",bottom:10,left:14,fontSize:11,color:"var(--muted)"}}>{uploadFile.name}</div><button onClick={()=>setUploadFile(null)} style={{position:"absolute",top:10,right:12,background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:24,height:24,color:"#fff",cursor:"pointer",fontSize:12}}>✕</button></div>):(<div className="upload-area" onClick={()=>fileRef.current.click()}><div style={{fontSize:32,marginBottom:8}}>📹</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Tap to upload video</div><div style={{fontSize:12,color:"var(--muted)"}}>MP4, MOV · max 5 minutes</div></div>)}<textarea className="input-field" placeholder="Write a caption…" value={uploadCaption} onChange={e=>setUploadCaption(e.target.value)} style={{width:"100%",minHeight:80,resize:"none",marginBottom:14}}/><button className="btn" style={{width:"100%"}} onClick={submitPost} disabled={posting}>{posting?"Posting…":"Share Post"}</button></div></div>}
        </div>
      )}
    </div>
  );
}

