import { useState, useRef, useEffect } from "react";
import { BADGES } from "../data/badges";
import { SKILL_TAGS } from "../data/social";
import * as api from "../lib/api";
import { PASSWORD_RULES } from "../utils/validation";
import { useUsernameStatus } from "./AuthScreen";
import PasswordInput from "./PasswordInput";
import { FeedbackSheet, FeedbackInbox } from "./Feedback";
import ReportsInbox from "./Reports";
import PRShareSheet from "./PRShare";
import { getTheme, setTheme } from "../utils/theme";
import { pushSupport, isPushOn, enablePush, disablePush } from "../lib/push";
import { unitsOf, fmtW, wShow, wLabel } from "../utils/units";
import { BlockedAccountsSheet, DeleteAccountSheet, Sheet, Avatar } from "./Moderation";
import NewPostSheet from "./NewPostSheet";
import { PostGrid, PostViewer } from "./Profiles";
import { ClipPlayer } from "./Reel";
import { initials, timeAgo, shortDate, dateKey, currentWeek, bestSets, trainingStats, squareImageDataUrl } from "../utils/helpers";
import { hasProfanity, PROFANITY_MESSAGE } from "../utils/profanity";

const avatarImg={width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover",display:"block"};
const fieldLabel={fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)",marginBottom:6};
const chevron=<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;

export default function ProfileTab({user,actions,startSheet,onStartHandled}){
  const [tab,setTab]=useState("posts");
  // Push notifications for this device (real Web Push; see src/lib/push.js).
  const [push,setPush]=useState({on:false,busy:false,support:pushSupport()});
  const [showNewPost,setShowNewPost]=useState(false);
  const [openPost,setOpenPost]=useState(null); // own post opened from the grid
  const [playing,setPlaying]=useState(null); // saved clip being watched
  const [requests,setRequests]=useState([]); const [showRequests,setShowRequests]=useState(false);
  const [dark,setDark]=useState(()=>getTheme()==="dark");
  const [cardPR,setCardPR]=useState(null); // PR being turned into a shareable image
  const [showFeedback,setShowFeedback]=useState(false); const [showInbox,setShowInbox]=useState(false);
  const [showReports,setShowReports]=useState(false);
  // Opened from a report notification / #reports link.
  useEffect(()=>{if(startSheet==="reports"){if(user.isAdmin)setShowReports(true);onStartHandled?.();}},[startSheet]);
  const units=unitsOf(user);
  const [sharedPR,setSharedPR]=useState({});
  const [showEdit,setShowEdit]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [showBlocked,setShowBlocked]=useState(false);
  const [showDelete,setShowDelete]=useState(false);
  const [savedItems,setSavedItems]=useState(null);

  // Saved tab: look up the user's saved clips (learning clips + members' videos).
  useEffect(()=>{
    if(tab!=="saved")return;
    api.loadClips().then(all=>setSavedItems(all.filter(c=>user.savedClips.includes(c.key)))).catch(()=>setSavedItems([]));
  },[tab,user.savedClips.length]);

  useEffect(()=>{if(tab==="settings")isPushOn().then(on=>setPush(p=>({...p,on,support:pushSupport()}))).catch(()=>{});},[tab]);
  async function togglePush(on){
    setPush(p=>({...p,busy:true}));
    try{
      if(on)await enablePush();else await disablePush();
      setPush({on,busy:false,support:pushSupport()});
      actions.flash(on?"Push notifications are on for this device.":"Push notifications are off for this device.");
    }catch(e){
      setPush({on:false,busy:false,support:pushSupport()});
      const why=e?.message;
      actions.flash(why==="denied"?"Notifications are blocked — allow them for Lift'd in your browser or phone settings, then try again."
        :why==="needs-install"?"On iPhone, add Lift'd to your Home Screen first (Share → Add to Home Screen), open it from there, then turn this on."
        :why==="unsupported"?"This browser doesn't support push notifications — you'll still see everything in the 🔔 inbox."
        :why==="dismissed"?"No problem — turn it on whenever you're ready.":"Couldn't turn on notifications — try again.");
    }
  }
  const pushSub=push.support==="needs-install"?"iPhone: add Lift'd to your Home Screen first"
    :push.support==="denied"?"Blocked in your browser settings"
    :push.support==="unsupported"?"Not supported in this browser — check the 🔔 inbox"
    :push.on?"Likes, comments and followers on this device":"Get alerts on this device";

  // Follow requests (people waiting to follow a private account).
  useEffect(()=>{api.loadFollowRequests(user.id).then(setRequests).catch(()=>{});},[user.id,user.isPrivate]);
  async function answer(p,approve){
    if(await (approve?actions.approveFollower(p.id):actions.declineFollower(p.id)))setRequests(r=>r.filter(x=>x.id!==p.id));
  }

  // Everything below is derived from what the user has actually logged — a new account shows zeros.
  const stats=trainingStats(user.workouts);
  const weekDays=currentWeek().filter(d=>(user.workouts[d.key]||[]).length>0).length;
  const badgeStats={...stats,weekDays,accountAgeDays:(Date.now()-user.createdAt)/86400000};
  const todayKey=dateKey();
  const prs=Object.entries(bestSets(user.workouts)).map(([exercise,b])=>({exercise,...b})).sort((a,b)=>b.weight-a.weight);

  async function sharePR(pr){
    setSharedPR(p=>({...p,[pr.exercise]:"sending"}));
    const ok=await actions.createPost({content:`🏆 New PR: ${pr.exercise} — ${fmtW(pr.weight,units)} × ${pr.reps}`});
    setSharedPR(p=>({...p,[pr.exercise]:ok?"done":undefined}));
  }

  return(
    <div>
      <div className="profile-banner"><div className="profile-avatar-wrap"><div className="profile-avatar-ring"><div className="profile-avatar-inner">{user.avatar?<img src={user.avatar} alt="" style={avatarImg}/>:initials(user.name)}</div></div></div><div className="profile-actions-top"><button className="btn-outline btn-sm" onClick={()=>setShowEdit(true)}>Edit Profile</button><button className="new-post-btn" onClick={()=>setShowNewPost(true)} aria-label="New post">＋</button></div></div>
      <div className="profile-info">
        <div className="profile-name" style={{display:"flex",alignItems:"center",gap:6}}>{user.name}{user.isPrivate&&<span title="Private account" style={{fontSize:14}}>🔒</span>}</div>
        <div className="profile-handle">@{user.username}</div>
        {user.bio?<div className="profile-bio">{user.bio}</div>:<button onClick={()=>setShowEdit(true)} style={{background:"none",border:"none",padding:0,marginTop:8,color:"var(--accent)",font:"600 13px var(--font)",cursor:"pointer"}}>+ Add a bio</button>}
        {user.skill&&<div className="skill-tags"><span className="skill-tag">{user.skill}</span></div>}
        {(user.location||weekDays>0)&&<div className="profile-meta">{user.location&&<div className="profile-meta-item">📍 <span>{user.location}</span></div>}{weekDays>0&&<div className="profile-meta-item">🔥 <span>{weekDays}-Day Streak</span></div>}</div>}
      </div>
      <div className="profile-stats"><div className="profile-stat"><div className="profile-stat-val">{stats.daysTrained}</div><div className="profile-stat-lbl">Workouts</div></div><div className="profile-stat"><div className="profile-stat-val">{user.followersCount}</div><div className="profile-stat-lbl">Followers</div></div><div className="profile-stat"><div className="profile-stat-val">{user.following.length}</div><div className="profile-stat-lbl">Following</div></div><div className="profile-stat"><div className="profile-stat-val">{stats.prCount}</div><div className="profile-stat-lbl">PRs</div></div></div>
      {requests.length>0&&<button className="requests-card" onClick={()=>setShowRequests(true)}><Avatar profile={requests[0]} size={30}/><div style={{flex:1,textAlign:"left"}}><div style={{fontWeight:700,fontSize:14}}>Follow requests</div><div style={{fontSize:12,color:"var(--muted)"}}>@{requests[0].username}{requests.length>1?` + ${requests.length-1} more`:""}</div></div><span className="requests-count">{requests.length}</span></button>}
      <div className="profile-tabs">{[["posts","Posts"],["prs","PRs"],["badges","Badges"],["saved","Saved"],["settings","Settings"]].map(([id,lbl])=><button key={id} className={`profile-tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{lbl}</button>)}</div>

      {tab==="posts"&&(<div>
        {user.posts.length===0?<div className="saved-empty"><div style={{fontSize:40,marginBottom:12}}>📸</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No posts yet</div><div style={{fontSize:12,marginBottom:14}}>Share a lift video, a photo, or a PR.</div><button className="btn btn-sm" onClick={()=>setShowNewPost(true)}>＋ Create a post</button></div>
          :<PostGrid posts={user.posts} onOpen={setOpenPost}/>}
        <div style={{height:24}}/>
      </div>)}

      {tab==="prs"&&(<div style={{padding:"12px 0"}}>
        {prs.length===0?(
          <div className="saved-empty"><div style={{fontSize:40,marginBottom:12}}>🏆</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No PRs yet</div><div style={{fontSize:12}}>Log a workout and your best lift on each exercise shows up here.</div></div>
        ):(<>
          <div style={{padding:"0 16px 12px",fontSize:13,color:"var(--muted)"}}>Your heaviest set on each lift. Share it to your story or post it to your feed.</div>
          {prs.map(pr=>(
            <div key={pr.exercise} className="pr-card">
              <div className="pr-title">🏆 PERSONAL RECORD</div>
              <div className="pr-exercise">{pr.exercise}</div>
              <div className="pr-weight">{wShow(pr.weight,units)}<span style={{fontSize:20,fontWeight:600}}> {wLabel(units)}</span> <span style={{fontSize:16,fontWeight:600,color:"var(--muted)"}}>× {pr.reps}</span></div>
              <div className="pr-delta">{pr.dateKey===todayKey?"Today":shortDate(pr.dateKey)}</div>
              <div className="pr-actions"><button className="pr-share-btn ghost" onClick={()=>setCardPR(pr)}>📸 Story</button><button className="pr-share-btn" disabled={!!sharedPR[pr.exercise]} onClick={()=>sharePR(pr)}>{sharedPR[pr.exercise]==="done"?"✓ Shared!":sharedPR[pr.exercise]==="sending"?"Sharing…":"📤 Share to Feed"}</button></div>
            </div>
          ))}
        </>)}
      </div>)}

      {tab==="badges"&&(<div style={{padding:"16px 16px 24px"}}>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>Earn badges by hitting milestones. Earned badges show on your profile.</div>
        <div className="badge-grid">{BADGES.map(b=>{const earned=b.test(badgeStats);return<div key={b.id} className={`badge-card ${earned?"earned":"locked"}`}><div className="badge-icon">{earned?b.icon:"🔒"}</div><div><div className="badge-name">{b.name}</div><div className="badge-desc">{b.desc}</div>{earned&&<div style={{fontSize:10,color:"var(--accent3)",fontWeight:600,marginTop:4}}>✓ Earned</div>}</div></div>;})}</div>
      </div>)}

      {tab==="saved"&&(<div style={{padding:"12px 0 24px"}}>
        <div style={{padding:"0 16px 10px",fontSize:13,color:"var(--muted)"}}>Tutorials and clips you've bookmarked for reference at the gym.</div>
        {user.savedClips.length===0&&<div className="saved-empty"><div style={{fontSize:40,marginBottom:12}}>🔖</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No saved content yet</div><div style={{fontSize:12}}>Tap the bookmark icon on any clip to save it here.</div></div>}
        {user.savedClips.length>0&&savedItems===null&&<div style={{padding:"8px 16px",color:"var(--muted)",fontSize:13}}>Loading…</div>}
        {savedItems?.map(c=>(
          <div key={c.key} className="saved-item" role="button" tabIndex={0} style={{cursor:"pointer"}} onClick={()=>setPlaying(c)} onKeyDown={e=>{if(e.key==="Enter")setPlaying(c);}}><div className="saved-thumb" style={{background:"linear-gradient(135deg,rgba(36,129,215,0.35),rgba(13,27,42,0.6))"}}><video src={c.videoUrl+"#t=0.5"} muted playsInline preload="metadata" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${c.focusX??50}% 50%`,borderRadius:"inherit"}}/><span className="saved-play">▶</span></div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{c.title}</div><div style={{fontSize:12,color:"var(--muted)"}}>{c.kind==="curated"?"Lift'd Learn":`@${c.author.username}`}{c.muscle&&c.muscle!=="All"?` · ${c.muscle}`:""}</div></div>{chevron}</div>
        ))}
      </div>)}

      {tab==="settings"&&(<div style={{paddingTop:16}}>
        <div className="settings-section"><div className="settings-section-label">Account</div><div className="settings-list">
          <div className="settings-row" onClick={()=>setShowEdit(true)}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(79,142,247,0.15)"}}>👤</div><div><div className="settings-label">Edit Profile</div><div className="settings-sub">Photo, name, username, bio</div></div></div><div className="settings-right">{chevron}</div></div>
          <div className="settings-row" onClick={()=>setShowPassword(true)}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>🔒</div><div><div className="settings-label">Change Password</div></div></div><div className="settings-right">{chevron}</div></div>
        </div></div>
        <div className="settings-section"><div className="settings-section-label">Privacy</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(79,142,247,0.15)"}}>🔐</div><div><div className="settings-label">Private Account</div><div className="settings-sub">{user.isPrivate?"Only approved followers see your posts":"Anyone can see your posts"}</div></div></div><label className="toggle"><input type="checkbox" checked={!!user.isPrivate} onChange={e=>actions.setPrivate(e.target.checked)}/><div className="toggle-track"/><div className="toggle-thumb"/></label></div><div className="settings-row" onClick={()=>setShowBlocked(true)}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(255,122,110,0.15)"}}>🚫</div><div><div className="settings-label">Blocked Accounts</div></div></div><div className="settings-right">{chevron}</div></div></div></div>
        <div className="settings-section"><div className="settings-section-label">Notifications</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>🔔</div><div><div className="settings-label">Push Notifications</div><div className="settings-sub">{push.busy?"Updating…":pushSub}</div></div></div><label className="toggle"><input type="checkbox" checked={push.on} disabled={push.busy} onChange={e=>togglePush(e.target.checked)}/><div className="toggle-track"/><div className="toggle-thumb"/></label></div></div></div>
        <div className="settings-section"><div className="settings-section-label">Preferences</div><div className="settings-list"><div className="settings-row"><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(192,132,252,0.15)"}}>🌙</div><div><div className="settings-label">Dark Mode</div><div className="settings-sub">{dark?"On":"Off — light mode"}</div></div></div><label className="toggle"><input type="checkbox" checked={dark} onChange={e=>{setDark(e.target.checked);setTheme(e.target.checked?"dark":"light");}}/><div className="toggle-track"/><div className="toggle-thumb"/></label></div><div className="settings-row" onClick={()=>actions.saveNutrition({...user.nutrition,units:units==="imperial"?"metric":"imperial"})}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>📏</div><div><div className="settings-label">Units</div></div></div><div className="settings-right"><span style={{fontSize:12,fontWeight:600,color:"var(--accent)"}}>{units==="imperial"?"lbs · mi · ft":"kg · km · cm"}</span>{chevron}</div></div></div></div>
        <div className="settings-section"><div className="settings-section-label">Support</div><div className="settings-list">
          <div className="settings-row" onClick={()=>setShowFeedback(true)}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(79,142,247,0.15)"}}>💬</div><div><div className="settings-label">Send Feedback</div><div className="settings-sub">Report a bug or suggest an idea</div></div></div><div className="settings-right">{chevron}</div></div>
          <a className="settings-row" href="https://joinliftd.com/terms/" target="_blank" rel="noopener" style={{textDecoration:"none",color:"inherit"}}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(192,132,252,0.15)"}}>📄</div><div><div className="settings-label">Terms of Use</div></div></div><div className="settings-right">{chevron}</div></a>
          <a className="settings-row" href="https://joinliftd.com/privacy/" target="_blank" rel="noopener" style={{textDecoration:"none",color:"inherit"}}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>🛡️</div><div><div className="settings-label">Privacy Policy</div></div></div><div className="settings-right">{chevron}</div></a>
        </div></div>
        {user.isAdmin&&<div className="settings-section"><div className="settings-section-label">Admin</div><div className="settings-list">
          <div className="settings-row" onClick={()=>setShowReports(true)}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(255,122,110,0.15)"}}>🚩</div><div><div className="settings-label">Reports</div><div className="settings-sub">Remove content or ban accounts</div></div></div><div className="settings-right">{chevron}</div></div>
          <div className="settings-row" onClick={()=>setShowInbox(true)}><div className="settings-row-left"><div className="settings-icon" style={{background:"rgba(62,207,207,0.15)"}}>📥</div><div><div className="settings-label">Feedback Inbox</div><div className="settings-sub">Read what people sent</div></div></div><div className="settings-right">{chevron}</div></div>
        </div></div>}
        <div style={{padding:"0 16px 12px"}}><button className="btn-outline" style={{width:"100%",padding:"13px",marginBottom:10}} onClick={actions.signOut}>Sign Out</button></div>
        <div style={{padding:"0 16px 32px"}}><button className="btn-danger" onClick={()=>setShowDelete(true)}>Delete Account</button></div>
      </div>)}

      {showNewPost&&<NewPostSheet user={user} actions={actions} onClose={()=>setShowNewPost(false)} onPosted={()=>setTab("posts")}/>}
      {openPost&&<PostViewer post={openPost} user={user} actions={actions} onClose={()=>setOpenPost(null)}/>}
      {playing&&<ClipPlayer clip={playing} user={user} actions={actions} onClose={()=>setPlaying(null)}/>}
      {showRequests&&<Sheet onClose={()=>setShowRequests(false)}>
        <div className="modal-title">Follow requests</div>
        <div className="modal-sub">Approve people to let them see your posts.</div>
        {requests.length===0&&<div className="comment-empty">No pending requests.</div>}
        {requests.map(p=>(
          <div key={p.id} className="food-item">
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><Avatar profile={p} size={34}/><div style={{minWidth:0}}><div className="food-name">{p.name}</div><div className="food-amount">@{p.username}</div></div></div>
            <div style={{display:"flex",gap:6}}><button className="btn btn-sm" onClick={()=>answer(p,true)}>Approve</button><button className="btn btn-sm btn-ghost" onClick={()=>answer(p,false)}>Decline</button></div>
          </div>
        ))}
        <button className="btn btn-ghost" style={{width:"100%",marginTop:14}} onClick={()=>setShowRequests(false)}>Done</button>
      </Sheet>}
      {cardPR&&<PRShareSheet pr={cardPR} units={units} user={user} actions={actions} onClose={()=>setCardPR(null)}/>}
      {showFeedback&&<FeedbackSheet actions={actions} onClose={()=>setShowFeedback(false)}/>}
      {showReports&&<ReportsInbox actions={actions} onClose={()=>setShowReports(false)}/>}
      {showInbox&&<FeedbackInbox actions={actions} onClose={()=>setShowInbox(false)}/>}
      {showEdit&&<EditProfileModal user={user} onClose={()=>setShowEdit(false)} onSave={async(fields,avatar)=>{if(await actions.updateProfile(fields,avatar))setShowEdit(false);}}/>}
      {showPassword&&<ChangePasswordModal onClose={()=>setShowPassword(false)} onSave={actions.changePassword}/>}
      {showBlocked&&<BlockedAccountsSheet onUnblock={actions.unblock} onClose={()=>setShowBlocked(false)}/>}
      {showDelete&&<DeleteAccountSheet onDelete={actions.deleteAccount} onClose={()=>setShowDelete(false)}/>}
    </div>
  );
}

function EditProfileModal({user,onSave,onClose}){
  const [form,setForm]=useState({name:user.name,username:user.username,bio:user.bio,location:user.location,skill:user.skill||"",avatar:user.avatar});
  const [err,setErr]=useState(""); const [saving,setSaving]=useState(false);
  const fileRef=useRef();
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const uname=form.username.trim();
  const unameStatus=useUsernameStatus(form.username,user.username);
  const unameBad=["invalid","taken"].includes(unameStatus.state);

  async function pickPhoto(e){
    const f=e.target.files[0];e.target.value="";
    if(!f)return;
    if(!f.type.startsWith("image/")){setErr("Please choose an image file.");return;}
    try{set("avatar",await squareImageDataUrl(f));setErr("");}catch{setErr("Couldn't read that image — try a different one.");}
  }
  async function save(){
    if(!form.name.trim()){setErr("Name is required.");return;}
    if(hasProfanity(form.name,true)||hasProfanity(form.bio)){setErr(PROFANITY_MESSAGE);return;}
    if(unameBad){setErr(unameStatus.message+".");return;}
    if(unameStatus.state==="checking"){setErr("Still checking that username — try again in a second.");return;}
    setSaving(true);setErr("");
    // Only send the photo if it changed: a new data URL uploads, null removes it.
    const avatar=form.avatar===user.avatar?undefined:form.avatar;
    await onSave({name:form.name.trim(),username:uname,bio:form.bio.trim(),location:form.location.trim(),skill:form.skill},avatar);
    setSaving(false);
  }

  return(
    <div className="modal-overlay" onClick={onClose}><div className="modal-sheet" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/><div className="modal-title">Edit Profile</div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,margin:"10px 0 18px"}}>
        <div className="profile-avatar-ring" style={{width:88,height:88}}><div className="profile-avatar-inner" style={{fontSize:26}}>{form.avatar?<img src={form.avatar} alt="" style={avatarImg}/>:initials(form.name)}</div></div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={pickPhoto}/>
        <div style={{display:"flex",gap:8}}><button className="btn-outline btn-sm" onClick={()=>fileRef.current.click()}>{form.avatar?"Change photo":"Add photo"}</button>{form.avatar&&<button className="btn-outline btn-sm" onClick={()=>set("avatar",null)}>Remove</button>}</div>
      </div>
      {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
        <div><div style={fieldLabel}>Name</div><input className="input-field" style={{width:"100%"}} value={form.name} onChange={e=>set("name",e.target.value)}/></div>
        <div><div style={fieldLabel}>Username</div><input className="input-field" style={{width:"100%"}} value={form.username} onChange={e=>set("username",e.target.value)}/>
          {unameStatus.message&&<div style={{fontSize:12,fontWeight:600,marginTop:6,color:unameBad?"#FF7A6E":unameStatus.state==="available"?"var(--accent3)":"var(--muted)"}}>{unameBad?"✕ ":unameStatus.state==="available"?"✓ ":""}{unameStatus.message}</div>}</div>
        <div><div style={{...fieldLabel,display:"flex",justifyContent:"space-between"}}><span>Bio</span><span style={{letterSpacing:0}}>{form.bio.length}/150</span></div><textarea className="input-field" maxLength={150} placeholder="Tell people about your training…" value={form.bio} onChange={e=>set("bio",e.target.value)} style={{width:"100%",minHeight:72,resize:"none"}}/></div>
        <div><div style={fieldLabel}>Location</div><input className="input-field" style={{width:"100%"}} placeholder="e.g. Athens, GA" value={form.location} onChange={e=>set("location",e.target.value)}/></div>
        <div><div style={fieldLabel}>Experience level</div><select className="input-field" style={{width:"100%",cursor:"pointer"}} value={form.skill} onChange={e=>set("skill",e.target.value)}>{SKILL_TAGS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button><button className="btn" style={{flex:1}} onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</button></div>
    </div></div>
  );
}

function ChangePasswordModal({onSave,onClose}){
  const [cur,setCur]=useState(""); const [next,setNext]=useState(""); const [confirm,setConfirm]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);

  async function submit(){
    if(!cur||!next||!confirm){setErr("Fill in all fields.");return;}
    if(!PASSWORD_RULES.every(r=>r.test(next))){setErr("New password doesn't meet all the requirements.");return;}
    if(next===cur){setErr("New password must be different from your current one.");return;}
    if(next!==confirm){setErr("New passwords don't match.");return;}
    setBusy(true);setErr("");
    const error=await onSave(cur,next);
    setBusy(false);
    if(error)setErr(error);else setDone(true);
  }

  return(
    <div className="modal-overlay" onClick={onClose}><div className="modal-sheet" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      {done?(
        <div style={{textAlign:"center",padding:"10px 0 4px"}}>
          <div style={{fontSize:40,marginBottom:10}}>✅</div>
          <div className="modal-title">Password updated</div>
          <div className="modal-sub">Use your new password the next time you sign in.</div>
          <button className="btn" style={{width:"100%"}} onClick={onClose}>Done</button>
        </div>
      ):(<>
        <div className="modal-title">Change Password</div>
        <div className="modal-sub">Enter your current password, then choose a new one.</div>
        {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
          <div><div style={fieldLabel}>Current password</div><PasswordInput className="input-field" style={{width:"100%"}} value={cur} onChange={e=>setCur(e.target.value)}/></div>
          <div><div style={fieldLabel}>New password</div><PasswordInput className="input-field" style={{width:"100%"}} value={next} onChange={e=>setNext(e.target.value)}/>
            {next&&<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>{PASSWORD_RULES.map(r=>{const ok=r.test(next);return<div key={r.label} style={{fontSize:12,fontWeight:600,color:ok?"var(--accent3)":"var(--muted)"}}>{ok?"✓":"○"} {r.label}</div>;})}</div>}</div>
          <div><div style={fieldLabel}>Confirm new password</div><PasswordInput className="input-field" style={{width:"100%"}} value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            {confirm&&next!==confirm&&<div style={{fontSize:12,fontWeight:600,marginTop:6,color:"#FF7A6E"}}>✕ Passwords don't match</div>}</div>
        </div>
        <div style={{display:"flex",gap:10}}><button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button><button className="btn" style={{flex:1}} onClick={submit} disabled={busy}>{busy?"Updating…":"Update Password"}</button></div>
      </>)}
    </div></div>
  );
}
