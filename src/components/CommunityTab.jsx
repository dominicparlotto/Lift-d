import { useState, useEffect } from "react";
import { GymList, GymRoom } from "./GymCommunity";
import * as api from "../lib/api";

// Bottom-nav Community tab: find/join gyms, then each gym's chat, leaderboard and live check-ins.
export default function CommunityTab({user,actions,joinCode,onJoinHandled}){
  const [openGymId,setOpenGymId]=useState(null);

  // Opened from a gym invite link (…/app/#join=CODE): join that gym and open it.
  useEffect(()=>{
    if(!joinCode)return;
    (async()=>{
      try{
        const gymId=await api.findGymByInvite(joinCode);
        if(!gymId){actions.flash("That invite link isn't valid anymore.");return;}
        await api.joinGym(gymId);
        setOpenGymId(gymId);
      }catch(e){console.error(e);actions.flash("Couldn't open that invite — try again.");}
      finally{onJoinHandled();}
    })();
  },[joinCode]);

  if(openGymId)return <GymRoom gymId={openGymId} user={user} actions={actions} onBack={()=>setOpenGymId(null)}/>;
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div className="header" style={{paddingBottom:4}}><div><div className="header-title">Community</div><div className="header-sub">Your gym's crew — chat, check in, compete</div></div></div>
      <GymList user={user} actions={actions} onOpen={setOpenGymId}/>
    </div>
  );
}
