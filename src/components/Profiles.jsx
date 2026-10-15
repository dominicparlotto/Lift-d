import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { timeAgo } from "../utils/helpers";
import { Avatar, ActionSheet, ReportSheet, BlockSheet } from "./Moderation";
import { CommentsSheet, CommentIcon } from "./Reel";

// Instagram-style 3-column grid of a person's posts. Videos show a ▶, text-only posts show their caption.
export function PostGrid({posts,onOpen}){
  return(
    <div className="post-grid">
      {posts.map(p=>(
        <button key={p.id} className="post-tile-btn" onClick={()=>onOpen(p)} aria-label={p.content.slice(0,60)}>
          {p.mediaType==="image"&&p.mediaUrl?<img src={p.mediaUrl} alt="" loading="lazy"/>
            :p.mediaType==="video"&&p.mediaUrl?<><video src={p.mediaUrl+"#t=0.5"} muted playsInline preload="metadata"/><span className="post-tile-icon">▶</span></>
            :<span className="post-tile-text">{p.content}</span>}
        </button>
      ))}
    </div>
  );
}

// One post opened from a profile grid: media, caption, comments; delete your own, report/block others.
export function PostViewer({post,user,actions,onClose,onDeleted,onBlocked}){
  const [menu,setMenu]=useState(false);
  const [comments,setComments]=useState(false);
  const [count,setCount]=useState(post.commentCount||0);
  const [report,setReport]=useState(false); const [block,setBlock]=useState(false);
  const a=post.author||user;
  const mine=a.id===user.id;
  const options=mine
    ?[{icon:"🗑️",label:"Delete post",danger:true,onSelect:async()=>{if(await actions.deletePost(post.id)){onDeleted?.(post.id);onClose();}}}]
    :[{icon:"🚩",label:"Report post",onSelect:()=>setReport(true)},{icon:"🚫",label:`Block @${a.username}`,danger:true,onSelect:()=>setBlock(true)}];
  async function doBlock(){const ok=await actions.block(a.id);if(ok){onBlocked?.();onClose();}return ok;}
  return(
    <div className="modal-overlay player-overlay" onClick={onClose}>
      <div className="post-viewer" onClick={e=>e.stopPropagation()}>
        <div className="post-header" style={{padding:"12px 14px 0"}}>
          <Avatar profile={a} size={34}/>
          <div style={{flex:1,minWidth:0}}><div className="post-username">@{a.username}</div><div className="post-time">{timeAgo(post.createdAt)}</div></div>
          <button className="post-more" onClick={()=>setMenu(true)} aria-label="Post options">⋯</button>
          <button className="post-more" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {post.mediaType==="video"&&post.mediaUrl&&<video className="post-viewer-media" src={post.mediaUrl} controls autoPlay muted loop playsInline/>}
        {post.mediaType==="image"&&post.mediaUrl&&<img className="post-viewer-media" src={post.mediaUrl} alt=""/>}
        <div style={{padding:"10px 14px 14px"}}>
          <div className="feed-caption" style={{marginTop:0}}><strong>@{a.username}</strong> {post.content}</div>
          <button className="comment-link" onClick={()=>setComments(true)} style={{display:"flex",alignItems:"center",gap:6}}><CommentIcon size={16}/>{count>0?`View ${count===1?"1 comment":`all ${count} comments`}`:"Add a comment…"}</button>
        </div>
      </div>
      {menu&&<ActionSheet onClose={()=>setMenu(false)} options={options}/>}
      {report&&<ReportSheet target={{type:"post",id:post.id,userId:a.id,username:a.username}} onReport={actions.report} onBlock={doBlock} onClose={()=>setReport(false)}/>}
      {block&&<BlockSheet username={a.username} onConfirm={doBlock} onClose={()=>setBlock(false)}/>}
      {comments&&<CommentsSheet item={{...post,author:a}} user={user} actions={actions} onClose={()=>setComments(false)} onCount={setCount}/>}
    </div>
  );
}

// Someone else's profile. Private accounts show their header and counts, but posts only to approved followers.
export function UserProfile({userId,user,actions,onBack}){
  const [profile,setProfile]=useState(null); const [missing,setMissing]=useState(false);
  const [stats,setStats]=useState(null);
  const [posts,setPosts]=useState(null);
  const [open,setOpen]=useState(null);
  const [menu,setMenu]=useState(false); const [report,setReport]=useState(false); const [block,setBlock]=useState(false);
  const [blockedByMe,setBlockedByMe]=useState(false);
  const following=user.following.includes(userId), requested=user.requested.includes(userId);

  function load(){
    api.fetchProfile(userId).then(setProfile).catch(()=>setMissing(true));
    api.loadProfileStats(userId).then(setStats).catch(()=>{});
    api.loadUserPosts(userId).then(setPosts).catch(()=>setPosts([]));
    api.loadBlockedIds().then(ids=>setBlockedByMe(ids.includes(userId))).catch(()=>{});
  }
  useEffect(load,[userId]);
  // Follow / unfollow / request, then refresh counts and posts (a private account opens up once you follow).
  async function toggleFollow(){await actions.toggleFollow(userId);load();}

  async function doBlock(){const ok=await actions.block(userId);if(ok)onBack();return ok;}
  const locked=profile?.isPrivate&&!following&&userId!==user.id;

  if(missing)return(<div className="saved-empty" style={{paddingTop:60}}><div style={{fontSize:15,fontWeight:700,marginBottom:6}}>This account isn't available</div><button className="btn btn-sm" onClick={onBack}>← Back</button></div>);
  return(
    <div style={{height:"100%",overflowY:"auto"}}>
      <div className="header" style={{paddingBottom:6}}>
        <button className="link-btn" style={{margin:0,fontSize:14}} onClick={onBack}>← Back</button>
        {profile&&userId!==user.id&&!blockedByMe&&<button className="post-more" onClick={()=>setMenu(true)} aria-label="More">⋯</button>}
      </div>
      {!profile?<div className="comment-empty">Loading…</div>:<>
        <div className="user-profile-head">
          <Avatar profile={profile} size={78}/>
          <div className="user-profile-stats">
            {[["Posts",stats?.posts],["Followers",stats?.followers],["Following",stats?.following]].map(([l,v])=><div key={l}><div className="profile-stat-val">{v??"–"}</div><div className="profile-stat-lbl">{l}</div></div>)}
          </div>
        </div>
        <div style={{padding:"10px 20px 0"}}>
          <div className="profile-name" style={{display:"flex",alignItems:"center",gap:6}}>{profile.name}{profile.isPrivate&&<span title="Private account">🔒</span>}</div>
          <div className="profile-handle">@{profile.username}</div>
          {profile.bio&&<div className="profile-bio">{profile.bio}</div>}
          {(profile.skill||profile.location)&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{profile.skill&&<span className="skill-tag">{profile.skill}</span>}{profile.location&&<span style={{fontSize:12,color:"var(--muted)"}}>📍 {profile.location}</span>}</div>}
          {blockedByMe&&<button className="btn btn-ghost" style={{width:"100%",marginTop:14}} onClick={async()=>{if(await actions.unblock(userId)){setBlockedByMe(false);load();}}}>Unblock</button>}
          {userId!==user.id&&!blockedByMe&&<button className={`btn ${following||requested?"btn-ghost":""}`} style={{width:"100%",marginTop:14}} onClick={toggleFollow}>{following?"Following":requested?"Requested":profile.isPrivate?"Request to follow":"Follow"}</button>}
        </div>
        <div style={{height:1,background:"var(--line)",margin:"16px 0 2px"}}/>
        {blockedByMe?(
          <div className="saved-empty" style={{paddingTop:36}}><div style={{fontSize:36,marginBottom:10}}>🚫</div><div style={{fontSize:15,fontWeight:700,marginBottom:6}}>You blocked this account</div><div style={{fontSize:13}}>Unblock them to see their posts again.</div></div>
        ):locked?(
          <div className="saved-empty" style={{paddingTop:36}}><div style={{fontSize:36,marginBottom:10}}>🔒</div><div style={{fontSize:15,fontWeight:700,marginBottom:6}}>This account is private</div><div style={{fontSize:13}}>{requested?"Your follow request is waiting for approval.":"Follow this account to see their posts."}</div></div>
        ):posts===null?<div className="comment-empty">Loading…</div>
         :posts.length===0?<div className="saved-empty" style={{paddingTop:36}}><div style={{fontSize:36,marginBottom:10}}>📷</div><div style={{fontSize:14,fontWeight:600}}>No posts yet</div></div>
         :<PostGrid posts={posts} onOpen={setOpen}/>}
      </>}
      {open&&<PostViewer post={open} user={user} actions={actions} onClose={()=>setOpen(null)} onBlocked={onBack}/>}
      {menu&&profile&&<ActionSheet onClose={()=>setMenu(false)} options={[{icon:"🚩",label:"Report account",onSelect:()=>setReport(true)},{icon:"🚫",label:`Block @${profile.username}`,danger:true,onSelect:()=>setBlock(true)}]}/>}
      {report&&profile&&<ReportSheet target={{type:"profile",id:profile.id,userId:profile.id,username:profile.username}} onReport={actions.report} onBlock={doBlock} onClose={()=>setReport(false)}/>}
      {block&&profile&&<BlockSheet username={profile.username} onConfirm={doBlock} onClose={()=>setBlock(false)}/>}
    </div>
  );
}
