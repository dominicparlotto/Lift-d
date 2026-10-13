import { useState, useRef, useEffect } from "react";
import ClipsView from "./ClipsView";
import { GymList, GymRoom } from "./GymCommunity";
import { ActionSheet, ReportSheet, BlockSheet } from "./Moderation";
import * as api from "../lib/api";
import { initials, timeAgo } from "../utils/helpers";

export default function SocialTab({user,posts,actions,joinCode,onJoinHandled}){
  const [liked,setLiked]=useState({});
  const [saved,setSaved]=useState({});
  const [boosted,setBoosted]=useState({});
  const [view,setView]=useState("feed");
  const [searchQ,setSearchQ]=useState("");
  const [openGymId,setOpenGymId]=useState(null);
  const [clips,setClips]=useState(null); // null = not loaded yet
  const [showUpload,setShowUpload]=useState(false);
  const [posting,setPosting]=useState(false);
  const [uploadCaption,setUploadCaption]=useState("");
  const [uploadFile,setUploadFile]=useState(null);
  const [uploadPreview,setUploadPreview]=useState(null); // object URL for the chosen photo/video
  const [uploadMuscle,setUploadMuscle]=useState("All");
  const [uploadErr,setUploadErr]=useState("");
  const [filterMuscle,setFilterMuscle]=useState("All");
  const [filterSkill,setFilterSkill]=useState("All");
  const [showFilters,setShowFilters]=useState(false);
  const [postMenu,setPostMenu]=useState(null);
  const [reportTarget,setReportTarget]=useState(null);
  const [blockTarget,setBlockTarget]=useState(null);
  const fileRef=useRef();

  // Opened from a gym invite link (…/app/#join=CODE): join that gym and open it.
  useEffect(()=>{
    if(!joinCode)return;
    (async()=>{
      try{
        const gymId=await api.findGymByInvite(joinCode);
        if(!gymId){actions.flash("That invite link isn't valid anymore.");return;}
        await api.joinGym(gymId);
        setView("community");setOpenGymId(gymId);
      }catch(e){console.error(e);actions.flash("Couldn't open that invite — try again.");}
      finally{onJoinHandled();}
    })();
  },[joinCode]);

  // Clips (learning clips + members' videos) load for both Clips and the Feed — everything in Clips also shows in the Feed.
  const loadClips=()=>api.loadClips().then(setClips).catch(e=>{console.error(e);setClips([]);actions.flash("Couldn't load clips.");});
  useEffect(()=>{if(view!=="community")loadClips();},[view]);
  const [clipStart,setClipStart]=useState(null); // clip key to open when jumping from the Feed into Clips
  const watchInClips=key=>{setClipStart(key);setView("clips");};

  // Feed = members' posts + learning clips, newest first. (Members' video posts are already in both places.)
  const feedItems=[...posts.map(p=>({...p,feedKey:p.id})),...(clips||[]).filter(c=>c.kind==="curated").map(c=>({...c,feedKey:c.key}))]
    .sort((a,b)=>b.createdAt-a.createdAt);
  const filteredPosts=feedItems.filter(p=>{
    const q=searchQ.toLowerCase();
    const text=p.kind==="curated"?`${p.title} ${p.description||""} lift'd learn`:`${p.content} ${p.author.username}`;
    if(q&&!text.toLowerCase().includes(q))return false;
    if(filterMuscle!=="All"&&p.muscle!==filterMuscle&&p.muscle!=="All")return false;
    if(filterSkill!=="All"&&p.skill!==filterSkill&&p.skill!=="All")return false;
    return true;
  });

  const MAX_MB=50, MAX_VIDEO_SECONDS=180;
  function clearUpload(){if(uploadPreview)URL.revokeObjectURL(uploadPreview);setUploadFile(null);setUploadPreview(null);}
  // Check the file before uploading: photos/videos only, ≤50 MB, videos ≤3 minutes.
  async function pickUpload(file){
    setUploadErr("");
    if(!file)return;
    const isVideo=file.type.startsWith("video/"),isImage=file.type.startsWith("image/");
    if(!isVideo&&!isImage){setUploadErr("Choose a photo or a video.");return;}
    if(file.size>MAX_MB*1024*1024){setUploadErr(`That file is ${(file.size/1048576).toFixed(0)} MB — the limit is ${MAX_MB} MB. Try a shorter clip.`);return;}
    const url=URL.createObjectURL(file);
    if(isVideo){
      const seconds=await new Promise(res=>{const v=document.createElement("video");v.preload="metadata";v.onloadedmetadata=()=>res(v.duration);v.onerror=()=>res(0);v.src=url;});
      if(seconds>MAX_VIDEO_SECONDS){URL.revokeObjectURL(url);setUploadErr("Videos can be up to 3 minutes long.");return;}
    }
    clearUpload();setUploadFile(file);setUploadPreview(url);
  }
  function closeUpload(){if(posting)return;clearUpload();setUploadErr("");setShowUpload(false);}
  async function submitPost(){
    if(posting)return;
    if(!uploadCaption.trim()){setUploadErr("Add a caption.");return;}
    setPosting(true);setUploadErr("");
    const ok=await actions.createPost({content:uploadCaption.trim(),file:uploadFile,muscle:uploadMuscle});
    setPosting(false);
    if(ok){setUploadCaption("");setUploadMuscle("All");clearUpload();setShowUpload(false);}
  }
  const postMenuOptions=post=>post.kind==="curated"
    ?[{icon:"🗑️",label:"Delete clip",danger:true,onSelect:async()=>{try{await api.deleteCuratedClip(post.id,post.videoPath);loadClips();}catch(e){console.error(e);actions.flash("Couldn't delete the clip.");}}}]
    :post.author.id===user.id
    ?[{icon:"🗑️",label:"Delete post",danger:true,onSelect:()=>actions.deletePost(post.id)}]
    :[{icon:"🚩",label:"Report post",onSelect:()=>setReportTarget({type:"post",id:post.id,userId:post.author.id,username:post.author.username})},
      {icon:"🚫",label:`Block @${post.author.username}`,danger:true,onSelect:()=>setBlockTarget({userId:post.author.id,username:post.author.username})}];

  if(openGymId)return <GymRoom gymId={openGymId} user={user} actions={actions} onBack={()=>setOpenGymId(null)}/>;

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div className="search-wrap">
        <div className="search-container"><svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="search-input" placeholder="Search posts and people…" value={searchQ} onChange={e=>{setSearchQ(e.target.value);setView("feed");}}/></div>
        <div className="chip-row">{[["feed","🎬 Feed"],["clips","▶ Clips"],["community","🏋️ Community"]].map(([v,l])=><button key={v} className={`chip ${view===v?"active":""}`} onClick={()=>{setView(v);setSearchQ("");}}>{l}</button>)}{(view==="feed"||view==="clips")&&<button className={`chip ${showFilters?"active":""}`} onClick={()=>setShowFilters(p=>!p)}>⚙ Filter</button>}</div>
        {showFilters&&(view==="feed"||view==="clips")&&<div style={{paddingTop:8}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted2)",marginBottom:6}}>Muscle Group</div>
          <div className="filter-row">{["All","Chest","Back","Legs","Shoulders","Arms","Core","Cardio"].map(m=><button key={m} className={`filter-pill ${filterMuscle===m?"active":""}`} onClick={()=>setFilterMuscle(m)}>{m}</button>)}</div>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted2)",marginBottom:6,marginTop:8}}>Skill Level</div>
          <div className="filter-row">{["All","Beginner","Intermediate","Advanced"].map(s=><button key={s} className={`filter-pill ${filterSkill===s?"active":""}`} onClick={()=>setFilterSkill(s)}>{s}</button>)}</div>
        </div>}
      </div>

      {view==="clips"?(
        <div style={{flex:1,overflow:"hidden"}}><ClipsView user={user} actions={actions} clips={clips} onChanged={loadClips} filterMuscle={filterMuscle} filterSkill={filterSkill} startKey={clipStart} onStartHandled={()=>setClipStart(null)}/></div>
      ):view==="community"?(
        <GymList user={user} actions={actions} onOpen={setOpenGymId}/>
      ):(
        <div style={{flex:1,overflow:"auto"}}>
          <div style={{padding:"10px 16px 4px",display:"flex",justifyContent:"flex-end"}}><button className="btn btn-sm" onClick={()=>setShowUpload(true)}>📹 Post</button></div>
          {feedItems.length===0&&<div className="saved-empty"><div style={{fontSize:40,marginBottom:12}}>🎬</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No posts yet</div><div style={{fontSize:12,marginBottom:16}}>Be the first to share a workout, PR, or tip.</div><button className="btn btn-sm" onClick={()=>setShowUpload(true)}>📹 Create a post</button></div>}
          {feedItems.length>0&&filteredPosts.length===0&&<div className="saved-empty"><div style={{fontSize:14}}>No posts match your search or filters.</div></div>}
          {filteredPosts.map(post=>{
            if(post.kind==="curated")return <LearnCard key={post.feedKey} clip={post} user={user} actions={actions} liked={liked[post.key]} onLike={()=>setLiked(p=>({...p,[post.key]:!p[post.key]}))} onMenu={()=>setPostMenu(post)} onWatch={()=>watchInClips(post.key)}/>;
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
                {a.id!==user.id&&<button className="follow-btn" style={{background:following?"var(--glass)":"var(--grad)",border:following?"1px solid var(--border)":"none",color:"#fff",padding:"5px 12px"}} onClick={()=>actions.toggleFollow(a.id)}>
                  {following?"Following":"Follow"}
                </button>}
                <button className="post-more" onClick={()=>setPostMenu(post)} aria-label="Post options">⋯</button>
              </div>
              {post.mediaType==="video"&&post.mediaUrl&&<video className="post-media" src={post.mediaUrl} controls playsInline preload="metadata"/>}
              {post.mediaType==="image"&&post.mediaUrl&&<img className="post-media" src={post.mediaUrl} alt="" loading="lazy"/>}
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
                {post.mediaType==="video"&&post.mediaUrl&&<button className="action-btn" style={{marginLeft:"auto"}} onClick={()=>watchInClips(`post:${post.id}`)}>▶ Clips</button>}
              </div>
            </div>
            );
          })}
          {showUpload&&<div className="modal-overlay" onClick={closeUpload}><div className="modal-sheet" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/><div className="modal-title">New Post</div>
            <div className="modal-sub">Share a PR, a lift video, or a tip with your crew. Videos up to 3 minutes and 50 MB.</div>
            <input ref={fileRef} type="file" accept="video/*,image/*" style={{display:"none"}} onChange={e=>{pickUpload(e.target.files[0]);e.target.value="";}}/>
            {uploadErr&&<div className="auth-error" style={{marginBottom:12}}>{uploadErr}</div>}
            {uploadFile?(
              <div className="upload-preview">
                {uploadFile.type.startsWith("video/")?<video src={uploadPreview} controls playsInline muted/>:<img src={uploadPreview} alt=""/>}
                {!posting&&<button className="upload-remove" onClick={clearUpload} aria-label="Remove file">✕</button>}
              </div>
            ):(
              <div className="upload-area" onClick={()=>fileRef.current.click()}><div style={{fontSize:32,marginBottom:8}}>📹</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Add a photo or video</div><div style={{fontSize:12,color:"var(--muted)"}}>Optional · MP4, MOV, JPG, PNG</div></div>
            )}
            <textarea className="input-field" maxLength={2000} placeholder="Write a caption…" value={uploadCaption} onChange={e=>setUploadCaption(e.target.value)} style={{width:"100%",minHeight:80,resize:"none",marginBottom:12}}/>
            <select className="input-field" style={{width:"100%",marginBottom:14,cursor:"pointer"}} value={uploadMuscle} onChange={e=>setUploadMuscle(e.target.value)} aria-label="Muscle group">
              <option value="All">Muscle group (optional)</option>
              {["Chest","Back","Legs","Shoulders","Arms","Core","Cardio"].map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <button className="btn" style={{width:"100%"}} onClick={submitPost} disabled={posting}>{posting?(uploadFile?"Uploading…":"Posting…"):"Share Post"}</button>
          </div></div>}
        </div>
      )}

      {postMenu&&(postMenu.kind!=="curated"||user.isAdmin)&&<ActionSheet onClose={()=>setPostMenu(null)} options={postMenuOptions(postMenu)}/>}
      {reportTarget&&<ReportSheet target={reportTarget} onReport={actions.report} onBlock={actions.block} onClose={()=>setReportTarget(null)}/>}
      {blockTarget&&<BlockSheet username={blockTarget.username} onConfirm={()=>actions.block(blockTarget.userId)} onClose={()=>setBlockTarget(null)}/>}
    </div>
  );
}

// A Lift'd Learn clip in the Feed: the video, its coaching cues as a list, and a jump into Clips.
function LearnCard({clip:c,user,actions,liked,onLike,onMenu,onWatch}){
  const saved=user.savedClips.includes(c.key);
  const tags=[c.muscle,c.equipment,c.skill].filter(t=>t&&t!=="All");
  return(
    <div className="post-card">
      <div className="post-header">
        <img className="post-avatar" src="../favicon.svg" alt="" style={{borderRadius:10}}/>
        <div style={{flex:1}}>
          <div className="post-username">Lift'd Learn<span className="learn-badge">FORM TIPS</span></div>
          <div className="post-time">{timeAgo(c.createdAt)}</div>
        </div>
        {user.isAdmin&&<button className="post-more" onClick={onMenu} aria-label="Clip options">⋯</button>}
      </div>
      <video className="post-media" src={c.videoUrl} controls playsInline muted preload="metadata"/>
      <div className="post-content"><div style={{fontWeight:700}}>{c.title}</div>{c.description&&<div style={{color:"var(--muted)",fontSize:13,marginTop:2}}>{c.description}</div>}</div>
      {c.cues.length>0&&<ol className="feed-cues">{c.cues.map((cue,i)=><li key={i}>{cue}</li>)}</ol>}
      {(tags.length>0||c.credit)&&<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        {tags.map(t=><span key={t} className="tag">{t}</span>)}
        {c.credit&&<span style={{fontSize:11,color:"var(--muted2)",marginLeft:"auto"}}>{c.credit}</span>}
      </div>}
      <div className="post-actions">
        <button className={`action-btn ${liked?"liked":""}`} onClick={onLike}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {liked?1:0}
        </button>
        <button className={`action-btn ${saved?"saved":""}`} onClick={()=>actions.toggleSaveClip(c.key)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          {saved?"Saved":"Save"}
        </button>
        <button className="action-btn" style={{marginLeft:"auto"}} onClick={onWatch}>▶ Watch in Clips</button>
      </div>
    </div>
  );
}
