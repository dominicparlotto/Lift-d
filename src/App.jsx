import { useState, useEffect } from "react";
import "./styles.css";
import AuthScreen, { NewPasswordScreen } from "./components/AuthScreen";
import NutritionTab from "./components/NutritionTab";
import SocialTab from "./components/SocialTab";
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
    addFood:food=>attempt(async()=>{
      const day=dateKey();const saved=await api.insertFood(day,food);
      patch(u=>({food:{...u.food,[day]:[...(u.food[day]||[]),saved]}}));
    }),
    removeFood:id=>attempt(async()=>{
      await api.deleteFood(id);
      patch(u=>({food:Object.fromEntries(Object.entries(u.food).map(([d,list])=>[d,list.filter(f=>f.id!==id)]))}));
    }),
    createPost:post=>attempt(async()=>{
      const saved=await api.insertPost(post);
      patch(u=>({posts:[saved,...u.posts]}));
      setPosts(ps=>[{...saved,author:user},...ps]);
    }),
    // Follow + save flip instantly in the UI, then roll back if the server rejects it.
    toggleFollow:async id=>{
      const on=user.following.includes(id);
      const flip=()=>patch(u=>({following:u.following.includes(id)?u.following.filter(f=>f!==id):[...u.following,id]}));
      flip();
      if(!await attempt(()=>on?api.unfollow(user.id,id):api.follow(id)))flip();
    },
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
  };

  if(recovering)return(<div style={shell}><NewPasswordScreen onDone={()=>setRecovering(false)}/></div>);
  if(session===undefined||(session&&!user&&!loadError))return(<div style={shell}><div className="app-loading"><img src="../favicon.svg" alt="" width="64" height="64"/><div>Loading…</div></div></div>);
  if(!session)return(<div style={shell}><AuthScreen/></div>);
  if(loadError)return(<div style={shell}><div className="app-loading"><div style={{color:"var(--text)",fontWeight:700}}>{loadError}</div><div style={{display:"flex",gap:10,marginTop:8}}><button className="btn" onClick={()=>setReloadKey(k=>k+1)}>Try again</button><button className="btn btn-ghost" onClick={actions.signOut}>Sign out</button></div></div></div>);

  const tabs=[
    {id:"nutrition",label:"Nutrition",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><path d="M12 8v4l3 3"/></svg>},
    {id:"social",label:"Feed",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>},
    {id:"workout",label:"Workout",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>},
    {id:"profile",label:"Profile",icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
  ];

  return(
    <div className="app">
      <div className="glow-top"/><div className="glow-bottom"/>
      <div className="content">
        {tab==="nutrition"&&<NutritionTab user={user} actions={actions} onOpenProfile={()=>setTab("profile")}/>}
        {tab==="social"&&<SocialTab user={user} posts={posts} actions={actions}/>}
        {tab==="workout"&&<WorkoutTab user={user} actions={actions}/>}
        {tab==="profile"&&<ProfileTab user={user} actions={actions}/>}
      </div>
      {toast&&<div className="toast" role="status">{toast}</div>}
      <nav className="nav">{tabs.map(t=><button key={t.id} className={`nav-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.icon}{t.label}<div className="nav-bar"/></button>)}</nav>
    </div>
  );
}
