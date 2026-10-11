import { useState } from "react";
import "./styles.css";
import AuthScreen from "./components/AuthScreen";
import NutritionTab from "./components/NutritionTab";
import SocialTab from "./components/SocialTab";
import WorkoutTab from "./components/WorkoutTab";
import ProfileTab from "./components/ProfileTab";

export default function App(){
  const [user,setUser]=useState(null);
  const [tab,setTab]=useState("nutrition");
  const [savedClips,setSavedClips]=useState([]);
  function toggleSaveClip(id){setSavedClips(prev=>prev.includes(id)?prev.filter(c=>c!==id):[...prev,id]);}

  if(!user)return(<div style={{maxWidth:430,margin:"0 auto",height:"100vh",overflow:"auto",background:"var(--bg)"}}><AuthScreen onAuth={u=>setUser(u)}/></div>);

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
        {tab==="nutrition"&&<NutritionTab/>}
        {tab==="social"&&<SocialTab user={user} savedClips={savedClips} onSaveClip={toggleSaveClip}/>}
        {tab==="workout"&&<WorkoutTab/>}
        {tab==="profile"&&<ProfileTab user={user} onSignOut={()=>setUser(null)} savedClips={savedClips}/>}
      </div>
      <nav className="nav">{tabs.map(t=><button key={t.id} className={`nav-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.icon}{t.label}<div className="nav-bar"/></button>)}</nav>
    </div>
  );
}
