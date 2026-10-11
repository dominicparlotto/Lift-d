import { useState } from "react";
import { BADGES } from "../data/badges";
import { CLIP_POSTS, MY_POSTS, PR_ANNOUNCEMENTS } from "../data/social";

export default function ProfileTab({user,onSignOut,savedClips}){
  const [tab,setTab]=useState("posts");
  const [notifs,setNotifs]=useState(true);
  const [priv,setPriv]=useState(false);
  const [dark,setDark]=useState(true);
  const [units,setUnits]=useState("imperial");
  const [sharedPR,setSharedPR]=useState({});
  const [boostCounts,setBoostCounts]=useState({pr1:12,pr2:8,pr3:24});
  const initials=(user?.name||"JD").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const skillTag=user?.skill||"Powerlifter";
  return(
    <div>
      <div className="profile-banner"><div className="profile-avatar-wrap"><div className="profile-avatar-ring"><div className="profile-avatar-inner">{initials}</div></div></div><div className="profile-actions-top"><button className="btn-outline btn-sm">Edit Profile</button></div></div>
      <div className="profile-info">
        <div className="profile-name">{user?.name||"Jordan Davis"}</div>
        <div className="profile-handle">@{user?.username||"jordandavis_lifts"}<span style={{marginLeft:8,background:"linear-gradient(135deg,#f59e0b,#ef4444)",borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:800,color:"#fff",verticalAlign:"middle"}}>✓ COACH</span></div>
        <div className="profile-bio">Powerlifter & nutrition nerd 🏋️‍♂️ | Athens, GA | Chasing PRs one rep at a time</div>
        <div className="skill-tags"><span className="skill-tag">{skillTag}</span><span className="skill-tag">Barbell</span><span className="skill-tag">Strength</span></div>
        <div className="profile-meta"><div className="profile-meta-item">📍 <span>Athens, GA</span></div><div className="profile-meta-item">🔥 <span>4-Day Streak</span></div></div>
      </div>
      <div className="profile-stats"><div className="profile-stat"><div className="profile-stat-val">148</div><div className="profile-stat-lbl">Workouts</div></div><div className="profile-stat"><div className="profile-stat-val">312</div><div className="profile-stat-lbl">Followers</div></div><div className="profile-stat"><div className="profile-stat-val">189</div><div className="profile-stat-lbl">Following</div></div><div className="profile-stat"><div className="profile-stat-val">3</div><div className="profile-stat-lbl">PRs</div></div></div>
      <div className="profile-tabs">{[["posts","Posts"],["prs","PRs"],["badges","Badges"],["saved","Saved"],["settings","Settings"]].map(([id,lbl])=><button key={id} className={`profile-tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{lbl}</button>)}</div>

      {tab==="posts"&&(<div><div className="posts-grid">{MY_POSTS.map(post=><div key={post.id} className="post-tile"><div style={{position:"absolute",inset:0,background:"radial-gradient(circle,var(--accent) 0%,var(--accent2) 100%)",opacity:0.12}}/><div className="post-tile-emoji">{post.emoji}</div><div className="post-tile-meta"><div className="post-tile-likes"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{post.likes}</div></div></div>)}</div>{MY_POSTS.map(post=><div key={post.id} style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><div style={{display:"flex",gap:12,alignItems:"flex-start"}}><div style={{width:40,height:40,borderRadius:12,background:"var(--glass)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{post.emoji}</div><div style={{flex:1}}><div style={{fontSize:13,lineHeight:1.5,marginBottom:6}}>{post.content}</div><div style={{display:"flex",gap:14}}><span style={{fontSize:11,color:"var(--muted)"}}>{post.time}</span><span style={{fontSize:11,color:"var(--muted)"}}>❤️ {post.likes}</span><span style={{fontSize:11,color:"var(--muted)"}}>💬 {post.comments}</span></div></div></div></div>)}<div style={{height:24}}/></div>)}

      {tab==="prs"&&(<div style={{padding:"12px 0"}}>
        <div style={{padding:"0 16px 12px",fontSize:13,color:"var(--muted)"}}>Your PRs are auto-shared as cards. Tap Share to post to your feed.</div>
        {PR_ANNOUNCEMENTS.map(pr=>(
          <div key={pr.id} className="pr-card">
            <div className="pr-title">🏆 NEW PERSONAL RECORD</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:36}}>{pr.emoji}</div>
              <div>
                <div className="pr-exercise">{pr.exercise}</div>
                <div className="pr-weight">{pr.weight}<span style={{fontSize:20,fontWeight:600}}> {pr.unit}</span></div>
                <div className="pr-delta">↑ {pr.weight-pr.prev}{pr.unit} from previous · {pr.date}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:14,alignItems:"center"}}>
              <button style={{background:"rgba(255,140,0,0.15)",border:"1px solid rgba(255,140,0,0.3)",borderRadius:10,padding:"6px 14px",color:"#FF8C00",fontSize:12,fontWeight:700,fontFamily:"var(--font)",cursor:"pointer"}} onClick={()=>setBoostCounts(p=>({...p,[pr.id]:(p[pr.id]||0)+1}))}>⚡ Boost {boostCounts[pr.id]||0}</button>
              <button className="pr-share-btn" onClick={()=>setSharedPR(p=>({...p,[pr.id]:true}))}>{sharedPR[pr.id]?"✓ Shared!":"📤 Share Card"}</button>
            </div>
          </div>
        ))}
      </div>)}

      {tab==="badges"&&(<div style={{padding:"16px 16px 24px"}}>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>Earn badges by hitting milestones. Earned badges show on your profile.</div>
        <div className="badge-grid">{BADGES.map(b=><div key={b.id} className={`badge-card ${b.earned?"earned":"locked"}`}><div className="badge-icon">{b.earned?b.icon:"🔒"}</div><div><div className="badge-name">{b.name}</div><div className="badge-desc">{b.desc}</div>{b.earned&&<div style={{fontSize:10,color:"var(--accent3)",fontWeight:600,marginTop:4}}>✓ Earned</div>}</div></div>)}</div>
      </div>)}

      {tab==="saved"&&(<div style={{padding:"12px 0 24px"}}>
        <div style={{padding:"0 16px 10px",fontSize:13,color:"var(--muted)"}}>Tutorials and clips you've bookmarked for reference at the gym.</div>
        {savedClips.length===0&&<div className="saved-empty"><div style={{fontSize:40,marginBottom:12}}>🔖</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No saved content yet</div><div style={{fontSize:12}}>Tap the bookmark icon on any clip or post to save it here.</div></div>}
        {savedClips.map((cid,i)=>{const clip=CLIP_POSTS.find(c=>c.id===cid);if(!clip)return null;return(
          <div key={i} className="saved-item"><div className="saved-thumb" style={{background:`linear-gradient(135deg,${clip.color}44,${clip.color}22)`}}>{clip.emoji}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{clip.content}</div><div style={{fontSize:12,color:"var(--muted)"}}>@{clip.user} · {clip.muscle}</div></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        );})}
      </div>)}

      {tab==="settings"&&(<div style={{paddingTop:16}}>
        <div className="settings-section"><div className="settings-section-label">Account</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(79,142,247,0.15)"}}>👤</div><div><div className="settings-label">Edit Profile</div><div className="settings-sub">Name, bio, skill tags</div></div></div><div className="settings-right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>🔒</div><div><div className="settings-label">Change Password</div></div></div><div className="settings-right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(192,132,252,0.15)"}}>🔗</div><div><div className="settings-label">Connected Apps</div><div className="settings-sub">Apple Health, Strava</div></div></div><div className="settings-right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div></div></div>
        <div className="settings-section"><div className="settings-section-label">Privacy</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(79,142,247,0.15)"}}>🔐</div><div><div className="settings-label">Private Account</div></div></div><label className="toggle"><input type="checkbox" checked={priv} onChange={e=>setPriv(e.target.checked)}/><div className="toggle-track"/><div className="toggle-thumb"/></label></div><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(255,122,110,0.15)"}}>🚫</div><div><div className="settings-label">Blocked Accounts</div></div></div><div className="settings-right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div></div></div>
        <div className="settings-section"><div className="settings-section-label">Notifications</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>🔔</div><div><div className="settings-label">Push Notifications</div></div></div><label className="toggle"><input type="checkbox" checked={notifs} onChange={e=>setNotifs(e.target.checked)}/><div className="toggle-track"/><div className="toggle-thumb"/></label></div></div></div>
        <div className="settings-section"><div className="settings-section-label">Preferences</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(192,132,252,0.15)"}}>🌙</div><div><div className="settings-label">Dark Mode</div></div></div><label className="toggle"><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/><div className="toggle-track"/><div className="toggle-thumb"/></label></div><div className="settings-row" onClick={()=>setUnits(u=>u==="imperial"?"metric":"imperial")}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>📏</div><div><div className="settings-label">Units</div></div></div><div className="settings-right"><span style={{fontSize:12,fontWeight:600,color:"var(--accent)"}}>{units==="imperial"?"lbs / ft":"kg / cm"}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div></div></div>
        <div style={{padding:"0 16px 12px"}}><button className="btn-outline" style={{width:"100%",padding:"13px",marginBottom:10}} onClick={onSignOut}>Sign Out</button></div>
        <div style={{padding:"0 16px 32px"}}><button className="btn-danger">Delete Account</button></div>
      </div>)}
    </div>
  );
}

