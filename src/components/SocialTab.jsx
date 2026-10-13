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
  const [showUpload,setShowUpload]=useState(false);
  const [posting,setPosting]=useState(false);
  const [uploadCaption,setUploadCaption]=useState("");
  const [uploadFile,setUploadFile]=useState(null);
  const [filterMuscle,setFilterMuscle]=useState("All");
  const [filterSkill,setFilterSkill]=useState("All");
  const [filterEquip]=useState("All");
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

  const filteredPosts=posts.filter(p=>{
    if(searchQ&&!p.content.toLowerCase().includes(searchQ.toLowerCase())&&!p.author.username.toLowerCase().includes(searchQ.toLowerCase()))return false;
    if(filterMuscle!=="All"&&p.muscle!==filterMuscle&&p.muscle!=="All")return false;
    if(filterSkill!=="All"&&p.skill!==filterSkill&&p.skill!=="All")return false;
    return true;
  });

  async function submitPost(){if(!uploadCaption.trim()||posting)return;setPosting(true);const ok=await actions.createPost({content:uploadCaption.trim(),hasVideo:!!uploadFile});setPosting(false);if(ok){setUploadCaption("");setUploadFile(null);setShowUpload(false);}}
  const postMenuOptions=post=>post.author.id===user.id
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
        <div style={{flex:1,overflow:"hidden"}}><ClipsView savedClips={user.savedClips} onSave={actions.toggleSaveClip} filterMuscle={filterMuscle} filterSkill={filterSkill} filterEquip={filterEquip}/></div>
      ):view==="community"?(
        <GymList user={user} actions={actions} onOpen={setOpenGymId}/>
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
                {a.id!==user.id&&<button className="follow-btn" style={{background:following?"var(--glass)":"var(--grad)",border:following?"1px solid var(--border)":"none",color:"#fff",padding:"5px 12px"}} onClick={()=>actions.toggleFollow(a.id)}>
                  {following?"Following":"Follow"}
                </button>}
                <button className="post-more" onClick={()=>setPostMenu(post)} aria-label="Post options">⋯</button>
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

      {postMenu&&<ActionSheet onClose={()=>setPostMenu(null)} options={postMenuOptions(postMenu)}/>}
      {reportTarget&&<ReportSheet target={reportTarget} onReport={actions.report} onBlock={actions.block} onClose={()=>setReportTarget(null)}/>}
      {blockTarget&&<BlockSheet username={blockTarget.username} onConfirm={()=>actions.block(blockTarget.userId)} onClose={()=>setBlockTarget(null)}/>}
    </div>
  );
}
