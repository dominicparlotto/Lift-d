import { useState, useRef, useEffect } from "react";
import { Sheet } from "./Moderation";

const MAX_MB=50, MAX_VIDEO_SECONDS=180;

// Create a post (caption + optional photo/video). Used from the Feed and the Profile "+" button.
// Every post shows on your profile and in the Feed; videos also show in Clips (photos don't).
export default function NewPostSheet({user,actions,onClose,onPosted}){
  const [caption,setCaption]=useState("");
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null); // object URL for the chosen photo/video
  const [muscle,setMuscle]=useState("All");
  const [err,setErr]=useState(""); const [posting,setPosting]=useState(false);
  const fileRef=useRef();
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);

  function clear(){setFile(null);setPreview(null);}
  // Check the file before uploading: photos/videos only, ≤50 MB, videos ≤3 minutes.
  async function pick(f){
    setErr("");
    if(!f)return;
    const isVideo=f.type.startsWith("video/"),isImage=f.type.startsWith("image/");
    if(!isVideo&&!isImage){setErr("Choose a photo or a video.");return;}
    if(f.size>MAX_MB*1024*1024){setErr(`That file is ${(f.size/1048576).toFixed(0)} MB — the limit is ${MAX_MB} MB. Try a shorter clip.`);return;}
    const url=URL.createObjectURL(f);
    if(isVideo){
      const seconds=await new Promise(res=>{const v=document.createElement("video");v.preload="metadata";v.onloadedmetadata=()=>res(v.duration);v.onerror=()=>res(0);v.src=url;});
      if(seconds>MAX_VIDEO_SECONDS){URL.revokeObjectURL(url);setErr("Videos can be up to 3 minutes long.");return;}
    }
    setFile(f);setPreview(url);
  }
  async function submit(){
    if(posting)return;
    if(!caption.trim()){setErr("Add a caption.");return;}
    setPosting(true);setErr("");
    const ok=await actions.createPost({content:caption.trim(),file,muscle});
    setPosting(false);
    if(ok){onPosted?.();onClose();}
  }
  const isVideo=file?.type.startsWith("video/");

  return(
    <Sheet onClose={posting?undefined:onClose}>
      <div className="modal-title">New Post</div>
      <div className="modal-sub">Share a PR, a lift video, or a tip. Videos up to 3 minutes and 50 MB.</div>
      <input ref={fileRef} type="file" accept="video/*,image/*" style={{display:"none"}} onChange={e=>{pick(e.target.files[0]);e.target.value="";}}/>
      {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
      {file?(
        <div className="upload-preview">
          {isVideo?<video src={preview} controls playsInline muted/>:<img src={preview} alt=""/>}
          {!posting&&<button className="upload-remove" onClick={clear} aria-label="Remove file">✕</button>}
        </div>
      ):(
        <div className="upload-area" onClick={()=>fileRef.current.click()}><div style={{fontSize:32,marginBottom:8}}>📸</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Add a photo or video</div><div style={{fontSize:12,color:"var(--muted)"}}>Optional · MP4, MOV, JPG, PNG</div></div>
      )}
      <textarea className="input-field" maxLength={2000} placeholder="Write a caption…" value={caption} onChange={e=>setCaption(e.target.value)} style={{width:"100%",minHeight:80,resize:"none",marginBottom:12}}/>
      <select className="input-field" style={{width:"100%",marginBottom:10,cursor:"pointer"}} value={muscle} onChange={e=>setMuscle(e.target.value)} aria-label="Muscle group">
        <option value="All">Muscle group (optional)</option>
        {["Chest","Back","Legs","Shoulders","Arms","Core","Cardio"].map(m=><option key={m} value={m}>{m}</option>)}
      </select>
      <div className="field-hint" style={{marginBottom:14}}>
        {isVideo?"Shows on your profile, in the Feed, and in Clips.":"Shows on your profile and in the Feed."}
        {user.isPrivate&&" Your account is private — only your approved followers will see it."}
      </div>
      <button className="btn" style={{width:"100%"}} onClick={submit} disabled={posting}>{posting?(file?"Uploading…":"Posting…"):"Share Post"}</button>
    </Sheet>
  );
}
