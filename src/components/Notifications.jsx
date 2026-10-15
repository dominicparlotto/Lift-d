import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { timeAgo } from "../utils/helpers";
import { Sheet, Avatar } from "./Moderation";

const TEXT={
  like:"liked your post.",
  comment:"commented:",
  follow:"started following you.",
  follow_request:"wants to follow you.",
  follow_accepted:"accepted your follow request.",
};

// The 🔔 inbox: likes, comments, new followers, follow requests (approve/decline right here), approvals.
// Opening it marks everything read.
export default function NotificationsSheet({user,actions,onClose,onOpenPost,onOpenProfile,onGoToProfile}){
  const [items,setItems]=useState(null);
  const [answered,setAnswered]=useState({}); // follow requests handled in this sheet

  useEffect(()=>{
    api.loadNotifications().then(list=>{
      setItems(list);
      if(list.some(n=>!n.read))api.markNotificationsRead().then(()=>actions.setUnread(0)).catch(()=>{});
      else actions.setUnread(0);
    }).catch(e=>{console.error(e);setItems([]);actions.flash("Couldn't load notifications.");});
  },[]);

  async function open(n){
    if(n.postId){
      const post=await api.loadPost(n.postId).catch(()=>null);
      if(post){onClose();onOpenPost(post);}else actions.flash("That post isn't available anymore.");
    }else if(n.type==="follow_request")onGoToProfile();
    else if(n.actor)onOpenProfile(n.actor.id);
  }
  async function answer(n,approve){
    const ok=await (approve?actions.approveFollower(n.actor.id):actions.declineFollower(n.actor.id));
    if(ok)setAnswered(a=>({...a,[n.id]:approve?"Approved":"Declined"}));
  }

  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Notifications</div>
      {items===null&&<div className="comment-empty">Loading…</div>}
      {items?.length===0&&<div className="comment-empty"><div style={{fontSize:32,marginBottom:6}}>🔔</div>Nothing yet. Likes, comments and new followers show up here.</div>}
      <div className="notif-list">
        {items?.map(n=>(
          <div key={n.id} className={`notif ${n.read?"":"unread"}`} role="button" tabIndex={0} onClick={()=>open(n)} onKeyDown={e=>{if(e.key==="Enter")open(n);}}>
            <Avatar profile={n.actor} size={38}/>
            <div style={{flex:1,minWidth:0}}>
              <div className="notif-text"><strong>@{n.actor.username}</strong> {TEXT[n.type]}{n.type==="comment"&&n.body&&<span> “{n.body}”</span>} <span className="notif-time">{timeAgo(n.createdAt)}</span></div>
              {n.type==="follow_request"&&(answered[n.id]
                ?<div className="notif-time" style={{marginTop:4}}>{answered[n.id]}</div>
                :<div style={{display:"flex",gap:6,marginTop:6}} onClick={e=>e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={()=>answer(n,true)}>Approve</button>
                  <button className="btn btn-sm btn-ghost" onClick={()=>answer(n,false)}>Decline</button>
                </div>)}
            </div>
            {n.post?.mediaType==="image"&&n.post.mediaUrl&&<img className="notif-thumb" src={n.post.mediaUrl} alt=""/>}
            {n.post?.mediaType==="video"&&n.post.mediaUrl&&<video className="notif-thumb" src={n.post.mediaUrl+"#t=0.5"} muted playsInline preload="metadata"/>}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
