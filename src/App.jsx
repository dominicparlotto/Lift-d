import { useState, useEffect } from "react";
import "./styles.css";
import AuthScreen, { NewPasswordScreen } from "./components/AuthScreen";
import NutritionTab from "./components/NutritionTab";
import SocialTab from "./components/SocialTab";
import CommunityTab from "./components/CommunityTab";
import WorkoutTab from "./components/WorkoutTab";
import ProfileTab from "./components/ProfileTab";
import { supabase } from "./lib/supabase";
import * as api from "./lib/api";
import { dateKey } from "./utils/helpers";
import { friendlyAuthError } from "./utils/validation";

const shell={maxWidth:430,margin:"0 auto",height:"100vh",overflow:"auto",background:"var(--bg)"};

export default function App(){
  const [session,setSession]=useState(undefined); // undefined = still checking for a saved login
  const [recovering,setRecovering]=useState(false); // opened from a password-reset email
  const [user,setUser]=useState(null);
  const [loadError,setLoadError]=useState("");
  const [reloadKey,setReloadKey]=useState(0);
  const [posts,setPosts]=useState([]);
  const [tab,setTab]=useState("nutrition");
  const [toast,setToast]=useState("");
  // Gym invite links look like …/app/#join=CODE. Remember the code through sign-in/sign-up.
  const [joinCode,setJoinCode]=useState(()=>{
    const fromLink=window.location.hash.match(/^#join=([A-Za-z0-9]+)$/)?.[1];
    try{if(fromLink)sessionStorage.setItem("liftd.join",fromLink);return fromLink||sessionStorage.getItem("liftd.join");}
    catch{return fromLink||null;}
  });
  // Also catch invite links opened while the app is already loaded (only the #hash changes, no page reload).
  useEffect(()=>{
    const onHash=()=>{const code=window.location.hash.match(/^#join=([A-Za-z0-9]+)$/)?.[1];if(code)setJoinCode(code);};
    window.addEventListener("hashchange",onHash);
    return ()=>window.removeEventListener("hashchange",onHash);
  },[]);
  function clearJoinCode(){
    setJoinCode(null);
    try{sessionStorage.removeItem("liftd.join");}catch{/* storage unavailable */}
    if(window.location.hash.startsWith("#join="))window.history.replaceState(null,"",window.location.pathname);
  }

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      setSession(s);
      if(event==="PASSWORD_RECOVERY")setRecovering(true);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // Load the account whenever a different user signs in (not on routine token refreshes).
  const uid=session?.user?.id;
  useEffect(()=>{
    if(!session){setUser(null);return;}
    let alive=true;
    setLoadError("");
    api.loadUserData(session.user).then(u=>{if(alive)setUser(u);}).catch(e=>{console.error(e);if(alive)setLoadError("Couldn't load your account. Check your connection and try again.");});
    return ()=>{alive=false;};
  },[uid,reloadKey]);

  useEffect(()=>{
    if(user&&tab==="social")api.loadFeed().then(setPosts).catch(e=>{console.error(e);flash("Couldn't load the feed.");});
  },[tab,user?.id]);
  // An invite link opens the Community tab, where the gym is joined and opened.
  useEffect(()=>{if(user&&joinCode)setTab("community");},[user?.id,joinCode]);

  function flash(msg){setToast(msg);setTimeout(()=>setToast(t=>t===msg?"":t),3500);}
  // Runs a save; on failure shows a message and returns false so the screen can keep the user's input.
  async function attempt(fn,fail="Couldn't save — check your connection and try again."){
    try{await fn();return true;}
    catch(e){console.error(e);flash(typeof fail==="function"?fail(e):fail);return false;}
  }
  const patch=fn=>setUser(u=>u&&{...u,...fn(u)});

  const actions={
    logWorkout:entry=>attempt(async()=>{
      const day=dateKey();const saved=await api.insertWorkout(day,entry);
      patch(u=>({workouts:{...u.workouts,[day]:[...(u.workouts[day]||[]),saved]}}));
    }),
    addCustomExercise:(group,name)=>attempt(async()=>{
      const saved=await api.addCustomExercise(group,name);
      patch(u=>({customExercises:[...u.customExercises,saved]}));
    },e=>e?.code==="23505"?"You already have an exercise with that name.":"Couldn't add the exercise — check your connection and try again."),
    removeCustomExercise:id=>attempt(async()=>{
      await api.deleteCustomExercise(id);
      patch(u=>({customExercises:u.customExercises.filter(x=>x.id!==id)}));
    },"Couldn't remove the exercise — try again."),
    addFood:food=>attempt(async()=>{
      const day=dateKey();const saved=await api.insertFood(day,food);
      patch(u=>({food:{...u.food,[day]:[...(u.food[day]||[]),saved]}}));
    }),
    removeFood:id=>attempt(async()=>{
      await api.deleteFood(id);
      patch(u=>({food:Object.fromEntries(Object.entries(u.food).map(([d,list])=>[d,list.filter(f=>f.id!==id)]))}));
    }),
    // post: {content, file?, muscle?} — a photo/video file is uploaded first, then the post is saved.
    createPost:({file,...post})=>attempt(async()=>{
      let media=null;
      if(file)media=await api.uploadPostMedia(user.id,file);
      try{
        const saved=await api.insertPost({...post,mediaType:media?.mediaType,mediaPath:media?.path,mediaUrl:media?.url});
        patch(u=>({posts:[saved,...u.posts]}));
        setPosts(ps=>[{...saved,author:user},...ps]);
      }catch(e){
        if(media)await api.removePostMedia(media.path).catch(()=>{}); // don't leave an orphaned upload
        throw e;
      }
    },e=>/exceeded|too large|payload/i.test(e?.message||"")?"That file is too big — keep videos under 50 MB.":"Couldn't share your post — check your connection and try again."),
    // Body stats / goal / custom targets: shown instantly, rolled back if the save fails.
    saveNutrition:async next=>{
      const prev=user.nutrition;
      patch(()=>({nutrition:next}));
      const ok=await attempt(()=>api.saveNutrition(user.id,next),"Couldn't save your goals — check your connection and try again.");
      if(!ok)patch(()=>({nutrition:prev}));
      return ok;
    },
    // Follow + save flip instantly in the UI, then roll back if the server rejects it.
    // Follow / unfollow / cancel a request. Private accounts get a request ("requested") until they approve it.
    toggleFollow:async id=>{
      const was=user.following.includes(id)?"following":user.requested.includes(id)?"requested":null;
      const set=state=>patch(u=>({following:state==="following"?[...u.following.filter(f=>f!==id),id]:u.following.filter(f=>f!==id),requested:state==="requested"?[...u.requested.filter(f=>f!==id),id]:u.requested.filter(f=>f!==id)}));
      if(was){set(null);if(!await attempt(()=>api.unfollow(user.id,id)))set(was);return;}
      set("following");
      try{const status=await api.follow(id);set(status==="pending"?"requested":"following");}
      catch(e){console.error(e);set(null);flash("Couldn't follow — try again.");}
    },
    // Private account: only approved followers see your posts.
    setPrivate:on=>attempt(async()=>{
      const profile=await api.updateProfileRow(user.id,{is_private:on});
      patch(()=>profile);
      flash(on?"Your account is private — only approved followers can see your posts.":"Your account is public.");
    },"Couldn't change your privacy setting — try again."),
    approveFollower:followerId=>attempt(async()=>{await api.approveFollower(user.id,followerId);patch(u=>({followersCount:u.followersCount+1}));},"Couldn't approve — try again."),
    declineFollower:followerId=>attempt(()=>api.removeFollower(user.id,followerId),"Couldn't decline — try again."),
    toggleSaveClip:async id=>{
      const on=user.savedClips.includes(id);
      const flip=()=>patch(u=>({savedClips:u.savedClips.includes(id)?u.savedClips.filter(c=>c!==id):[...u.savedClips,id]}));
      flip();
      if(!await attempt(()=>on?api.unsaveClip(user.id,id):api.saveClip(id)))flip();
    },
    // avatar: undefined = unchanged, null = remove, data URL string = new photo
    updateProfile:(fields,avatar)=>attempt(async()=>{
      const row={name:fields.name,username:fields.username,bio:fields.bio,location:fields.location,skill:fields.skill};
      if(typeof avatar==="string")row.avatar_url=await api.uploadAvatar(user.id,avatar);
      else if(avatar===null){await api.removeAvatars(user.id);row.avatar_url=null;}
      const profile=await api.updateProfileRow(user.id,row);
      patch(()=>profile);
    },e=>e?.code==="23505"?"That username was just taken — please choose another.":"Couldn't save your profile — check your connection and try again."),
    // Returns an error message, or null on success.
    changePassword:async(current,next)=>{
      const {error:wrong}=await supabase.auth.signInWithPassword({email:user.email,password:current});
      if(wrong){const msg=friendlyAuthError(wrong);return msg==="Incorrect email or password."?"Current password is incorrect.":msg;}
      const {error}=await supabase.auth.updateUser({password:next});
      return error?friendlyAuthError(error):null;
    },
    signOut:async()=>{
      await supabase.auth.signOut();
      setTab("nutrition");setPosts([]);
      window.history.replaceState(null,"",window.location.pathname); // drop #signup/#signin so the start screen shows
    },
    flash,
    deletePost:id=>attempt(async()=>{
      const mediaPath=(user.posts.find(p=>p.id===id)||posts.find(p=>p.id===id))?.mediaPath;
      await api.deletePost(id,mediaPath);
      patch(u=>({posts:u.posts.filter(p=>p.id!==id)}));
      setPosts(ps=>ps.filter(p=>p.id!==id));
    },"Couldn't delete the post — try again."),
    report:r=>attempt(()=>api.reportContent(r),"Couldn't send your report — try again."),
    // Blocking also unfollows them and removes their posts from view (the database hides them from then on).
    block:userId=>attempt(async()=>{
      await api.blockUser(userId); // the database also removes follows and friend links both ways
      patch(u=>({following:u.following.filter(f=>f!==userId),requested:u.requested.filter(f=>f!==userId)}));
      setPosts(ps=>ps.filter(p=>p.author.id!==userId));
      flash("Blocked. You won't see each other's posts or messages.");
    },"Couldn't block — try again."),
    unblock:userId=>attempt(()=>api.unblockUser(user.id,userId),"Couldn't unblock — try again."),
    deleteAccount:()=>attempt(async()=>{
      await api.deleteMyAccount(user.id);
      await supabase.auth.signOut().catch(()=>{}); // the account is already gone; this just clears the local session
      setTab("nutrition");setPosts([]);setUser(null);
      window.history.replaceState(null,"",window.location.pathname);
    },"Couldn't delete your account — check your connection and try again."),
  };

  if(recovering)return(<div style={shell}><NewPasswordScreen onDone={()=>setRecovering(false)}/></div>);
  if(session===undefined||(session&&!user&&!loadError))return(<div style={shell}><div className="app-loading"><img src="../favicon.svg" alt="" width="64" height="64"/><div>Loading…</div></div></div>);
  if(!session)return(<div style={shell}><AuthScreen/></div>);
  if(loadError)return(<div style={shell}><div className="app-loading"><div style={{color:"var(--text)",fontWeight:700}}>{loadError}</div><div style={{display:"flex",gap:10,marginTop:8}}><button className="btn" onClick={()=>setReloadKey(k=>k+1)}>Try again</button><button className="btn btn-ghost" onClick={actions.signOut}>Sign out</button></div></div></div>);

  const tabs=[
    {id:"nutrition",label:"Nutrition",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><path d="M12 8v4l3 3"/></svg>},
    {id:"social",label:"Feed",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>},
    {id:"community",label:"Community",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
    {id:"workout",label:"Workout",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>},
    {id:"profile",label:"Profile",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
  ];

  return(
    <div className="app">
      <div className="glow-top"/><div className="glow-bottom"/>
      <div className="content">
        {tab==="nutrition"&&<NutritionTab user={user} actions={actions} onOpenProfile={()=>setTab("profile")}/>}
        {tab==="social"&&<SocialTab user={user} posts={posts} actions={actions} onGoToProfile={()=>setTab("profile")}/>}
        {tab==="community"&&<CommunityTab user={user} actions={actions} joinCode={joinCode} onJoinHandled={clearJoinCode}/>}
        {tab==="workout"&&<WorkoutTab user={user} actions={actions}/>}
        {tab==="profile"&&<ProfileTab user={user} actions={actions}/>}
      </div>
      {toast&&<div className="toast" role="status">{toast}</div>}
      <nav className="nav">{tabs.map(t=><button key={t.id} className={`nav-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.icon}{t.label}<div className="nav-bar"/></button>)}</nav>
    </div>
  );
}
