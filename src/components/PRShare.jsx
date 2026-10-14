import { useState, useEffect } from "react";
import { makePRCard } from "../utils/prCard";
import { Sheet } from "./Moderation";

// Preview a PR card image, then share it (Instagram/TikTok story, messages…) or save it.
export default function PRShareSheet({pr,user,actions,onClose}){
  const [blob,setBlob]=useState(null); const [url,setUrl]=useState(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let made=null;
    makePRCard(pr,user.username).then(b=>{if(!b)throw new Error("no image");made=URL.createObjectURL(b);setBlob(b);setUrl(made);}).catch(e=>{console.error(e);setFailed(true);});
    return ()=>{if(made)URL.revokeObjectURL(made);};
  },[pr.exercise,pr.weight,pr.reps]);

  const fileName=`liftd-pr-${pr.exercise.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.png`;
  const file=blob&&new File([blob],fileName,{type:"image/png"});
  const canShare=!!(file&&navigator.canShare&&navigator.canShare({files:[file]}));
  async function share(){
    try{await navigator.share({files:[file],title:"New PR on Lift'd",text:`New PR: ${pr.exercise} — ${pr.weight} lbs × ${pr.reps} 🏆 joinliftd.com`});}
    catch(e){if(e.name!=="AbortError"){console.error(e);actions.flash("Couldn't open sharing — save the image instead.");}}
  }

  return(
    <Sheet onClose={onClose}>
      <div className="modal-title">Share your PR</div>
      <div className="modal-sub">Post it to your Instagram or TikTok story, or send it to your group chat.</div>
      <div className="pr-preview">{url?<img src={url} alt={`PR card: ${pr.exercise} ${pr.weight} lbs × ${pr.reps}`}/>:<div className="comment-empty">{failed?"Couldn't make the image — try again.":"Making your card…"}</div>}</div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        {canShare&&<button className="btn" style={{flex:1}} onClick={share}>📤 Share</button>}
        {url&&<a className={`btn ${canShare?"btn-ghost":""}`} style={{flex:1,textAlign:"center",textDecoration:"none"}} href={url} download={fileName}>⬇️ Save image</a>}
      </div>
      {!canShare&&url&&<div className="field-hint" style={{textAlign:"center"}}>Save the image, then add it to your story from your photos.</div>}
    </Sheet>
  );
}
