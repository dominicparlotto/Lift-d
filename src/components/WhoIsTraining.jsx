import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { WORKOUTS } from "../data/workouts";
import { Avatar } from "./Moderation";

const PAGE_SIZE=4;
const arrowBtn=disabled=>({background:"none",border:"none",color:disabled?"var(--muted2)":"var(--accent)",cursor:disabled?"default":"pointer",fontSize:16,fontWeight:700,padding:0,lineHeight:1});
const tagStyle={color:"var(--accent3)",background:"rgba(62,207,207,0.14)",borderColor:"rgba(62,207,207,0.24)"};

// Live list of people checked in at your gym, with check-in/out and mutual friend requests.
export default function WhoIsTraining({user,actions}){
  const [gyms,setGyms]=useState(null); // gyms the user belongs to
  const [gymId,setGymId]=useState(null);
  const [checkins,setCheckins]=useState([]);
  const [mine,setMine]=useState(null); // the user's own active check-in (any gym)
  const [friends,setFriends]=useState({added:[],addedMe:[]});
  const [muscle,setMuscle]=useState("Chest");
  const [busy,setBusy]=useState(false);
  const [page,setPage]=useState(0);

  useEffect(()=>{
    Promise.all([api.loadGyms(user.id),api.loadMyCheckin(user.id),api.loadFriendAdds(user.id)]).then(([all,me,fr])=>{
      const joined=all.filter(g=>g.role);
      setGyms(joined);setMine(me);setFriends(fr);
      setGymId(me&&joined.some(g=>g.id===me.gymId)?me.gymId:joined[0]?.id||null);
    }).catch(e=>{console.error(e);setGyms([]);actions.flash("Couldn't load who's training.");});
  },[user.id]);

  // Keep the list live: refresh on any check-in change, and every minute so old check-ins expire.
  useEffect(()=>{
    if(!gymId)return;
    let alive=true;
    const refresh=()=>{
      api.loadCheckins(gymId).then(list=>{if(alive)setCheckins(list);}).catch(()=>{});
      api.loadMyCheckin(user.id).then(me=>{if(alive)setMine(me);}).catch(()=>{});
      api.loadFriendAdds(user.id).then(fr=>{if(alive)setFriends(fr);}).catch(()=>{});
    };
    refresh();
    const unsubscribe=api.subscribeToCheckins(refresh);
    const timer=setInterval(refresh,60000);
    return ()=>{alive=false;unsubscribe();clearInterval(timer);};
  },[gymId]);

  async function checkIn(){
    setBusy(true);
    try{await api.checkIn(user.id,gymId,muscle);setMine({userId:user.id,gymId,muscle,checkedInAt:Date.now()});setCheckins(await api.loadCheckins(gymId));}
    catch(e){console.error(e);actions.flash("Couldn't check in — try again.");}
    setBusy(false);
  }
  async function checkOut(){
    setBusy(true);
    try{await api.checkOut(user.id);setMine(null);setCheckins(list=>list.filter(c=>c.userId!==user.id));}
    catch(e){console.error(e);actions.flash("Couldn't check out — try again.");}
    setBusy(false);
  }
  async function addFriend(id){
    setFriends(f=>({...f,added:[...f.added,id]}));
    try{await api.addFriend(id);}
    catch(e){console.error(e);setFriends(f=>({...f,added:f.added.filter(x=>x!==id)}));actions.flash("Couldn't send the friend request.");}
  }

  const gym=gyms?.find(g=>g.id===gymId);
  const others=checkins.filter(c=>c.userId!==user.id);
  const pageCount=Math.max(1,Math.ceil(others.length/PAGE_SIZE));
  const p=Math.min(page,pageCount-1);
  const paged=others.slice(p*PAGE_SIZE,p*PAGE_SIZE+PAGE_SIZE);
  const hereNow=mine&&mine.gymId===gymId;
  const minutesAgo=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"just now":m<60?`${m}m ago`:`${Math.floor(m/60)}h ago`;};

  return(
    <div className="card">
      <div className="card-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <span>Who's training{gym?` at ${gym.name}`:""} 🟢</span>
        {pageCount>1&&<div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <button onClick={()=>setPage(Math.max(0,p-1))} disabled={p===0} style={arrowBtn(p===0)}>‹</button>
          <span style={{fontSize:9,color:"var(--muted2)",fontWeight:700,letterSpacing:"0.5px"}}>{p+1}/{pageCount}</span>
          <button onClick={()=>setPage(Math.min(pageCount-1,p+1))} disabled={p===pageCount-1} style={arrowBtn(p===pageCount-1)}>›</button>
        </div>}
      </div>

      {gyms===null&&<div style={{color:"var(--muted)",fontSize:13}}>Loading…</div>}
      {gyms?.length===0&&<div style={{color:"var(--muted)",fontSize:13,lineHeight:1.6}}>Join your gym in <strong style={{color:"var(--text)"}}>Feed → Community</strong> to check in and see who's training there right now.</div>}

      {gym&&<>
        {gyms.length>1&&<select className="input-field" style={{width:"100%",marginBottom:12,cursor:"pointer"}} value={gymId} onChange={e=>{setGymId(e.target.value);setPage(0);}}>{gyms.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>}

        {hereNow?(
          <div className="checkin-row here"><div><div style={{fontWeight:700,fontSize:14}}>✅ You're checked in</div><div style={{fontSize:12,color:"var(--muted)"}}>{mine.muscle?`${mine.muscle} · `:""}since {minutesAgo(mine.checkedInAt)}</div></div><button className="btn btn-sm btn-ghost" onClick={checkOut} disabled={busy}>Check out</button></div>
        ):(
          <div className="checkin-row">
            <select className="input-field" style={{flex:1,minWidth:0,cursor:"pointer"}} value={muscle} onChange={e=>setMuscle(e.target.value)} aria-label="What are you training?">{Object.keys(WORKOUTS).map(g=><option key={g} value={g}>{g} day</option>)}</select>
            <button className="btn btn-sm" onClick={checkIn} disabled={busy}>{busy?"…":"I'm here"}</button>
          </div>
        )}
        {mine&&!hereNow&&<div style={{fontSize:11,color:"var(--muted2)",margin:"-4px 0 8px"}}>Checking in here will check you out of your other gym.</div>}

        {others.length===0&&<div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>No one else is checked in right now.</div>}
        {paged.map(c=>{
          const iAdded=friends.added.includes(c.userId), theyAdded=friends.addedMe.includes(c.userId);
          return(
            <div key={c.userId} className="food-item">
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><Avatar profile={c.profile} size={34}/><div style={{minWidth:0}}><div className="food-name">@{c.profile.username}</div><div className="food-amount">{c.muscle?`${c.muscle} day · `:""}{minutesAgo(c.checkedInAt)}</div></div></div>
              {iAdded&&theyAdded?<span className="tag" style={tagStyle}>✓ Friends</span>
                :iAdded?<button className="btn btn-sm btn-ghost" disabled>Requested</button>
                :<button className="btn btn-sm" onClick={()=>addFriend(c.userId)}>{theyAdded?"Add back":"Add Friend"}</button>}
            </div>
          );
        })}
        <div style={{fontSize:11,color:"var(--muted2)",marginTop:10}}>Check-ins last {api.CHECKIN_HOURS} hours. You're only connected as friends once you've both added each other.</div>
      </>}
    </div>
  );
}
