import { useState, useEffect } from "react";
import { SKILL_TAGS } from "../data/social";
import { supabase } from "../lib/supabase";
import { isUsernameAvailable } from "../lib/api";
import { PASSWORD_RULES, validateUsername, friendlyAuthError } from "../utils/validation";
import PasswordInput from "./PasswordInput";
import { hasProfanity, PROFANITY_MESSAGE } from "../utils/profanity";

export const TERMS_URL="https://joinliftd.com/terms/", PRIVACY_URL="https://joinliftd.com/privacy/";

// Logo mark lives at the site root (public/favicon.svg); the app is served from /app/, so it's one level up.
const LOGO="../favicon.svg";
// Where links in sign-up / password-reset emails send people back to (this app page).
const appUrl=()=>`${window.location.origin}${window.location.pathname}`;
const backBtn={background:"none",border:"none",color:"var(--accent)",font:"700 14px var(--font)",cursor:"pointer",marginBottom:20};

function PasswordChecklist({pass}){
  if(!pass)return null;
  return <div style={{marginTop:8,paddingLeft:2,display:"flex",flexDirection:"column",gap:4}}>{PASSWORD_RULES.map(r=>{const ok=r.test(pass);return <div key={r.label} style={{fontSize:12,fontWeight:600,color:ok?"var(--accent3)":"var(--muted)"}}>{ok?"✓":"○"} {r.label}</div>;})}</div>;
}

// Live "is this username free?" check against the database, debounced while typing.
export function useUsernameStatus(username,currentUsername=""){
  const name=username.trim();
  const formatError=name?validateUsername(name):"";
  const unchanged=!!currentUsername&&name.toLowerCase()===currentUsername.toLowerCase();
  const [result,setResult]=useState({name:"",available:null});
  useEffect(()=>{
    if(!name||formatError||unchanged)return;
    let alive=true;
    const t=setTimeout(()=>isUsernameAvailable(name).then(available=>{if(alive)setResult({name,available});}).catch(()=>{if(alive)setResult({name,available:null});}),350);
    return ()=>{alive=false;clearTimeout(t);};
  },[name,formatError,unchanged]);
  if(!name||unchanged)return{state:"idle",message:""};
  if(formatError)return{state:"invalid",message:formatError};
  if(result.name!==name)return{state:"checking",message:"Checking…"};
  if(result.available===false)return{state:"taken",message:"Username is already taken"};
  if(result.available===true)return{state:"available",message:"Username is available"};
  return{state:"unknown",message:"Couldn't check username right now"};
}

export default function AuthScreen(){
  // The homepage links to app/#signup and app/#signin to open the right screen directly.
  const [mode,setMode]=useState(()=>({"#signup":"signup","#signin":"signin"})[window.location.hash]||"splash");
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [name,setName]=useState(""); const [username,setUsername]=useState("");
  const [skill,setSkill]=useState(""); const [agreed,setAgreed]=useState(false);
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const usernameStatus=useUsernameStatus(username);
  const passValid=PASSWORD_RULES.every(r=>r.test(pass));
  const go=m=>{setErr("");setMode(m);};

  // On success Supabase fires a sign-in event and App takes over from here.
  async function signIn(){
    if(!email.trim()||!pass){setErr("Fill in all fields.");return;}
    setLoading(true);setErr("");
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password:pass});
    setLoading(false);
    if(error)setErr(friendlyAuthError(error));
  }
  function continueToCredentials(){
    if(!name.trim()||!email.trim()){setErr("Fill in all fields.");return;}
    if(!/^\S+@\S+\.\S+$/.test(email.trim())){setErr("Enter a valid email address.");return;}
    if(hasProfanity(name,true)){setErr(PROFANITY_MESSAGE);return;}
    go("signup-credentials");
  }
  async function signUp(){
    if(!username||!pass){setErr("Fill in all fields.");return;}
    if(usernameStatus.state==="invalid"){setErr(usernameStatus.message);return;}
    if(usernameStatus.state==="taken"){setErr("That username is already taken.");return;}
    if(!passValid){setErr("Password does not meet all requirements.");return;}
    if(!agreed){setErr("Please confirm you're 13 or older and agree to the Terms of Use and Privacy Policy.");return;}
    setLoading(true);setErr("");
    try{
      if(!await isUsernameAvailable(username)){setLoading(false);setErr("That username is already taken.");return;}
      const {data,error}=await supabase.auth.signUp({email:email.trim(),password:pass,options:{
        data:{username:username.trim(),name:name.trim(),skill:skill||"Beginner",terms_accepted_at:new Date().toISOString()},
        emailRedirectTo:appUrl(),
      }});
      setLoading(false);
      if(error){setErr(friendlyAuthError(error));return;}
      // With email confirmation on, there's no session until they click the link in their inbox.
      if(!data.session)go("check-email");
    }catch(e){setLoading(false);setErr(friendlyAuthError(e));}
  }
  async function sendReset(){
    if(!/^\S+@\S+\.\S+$/.test(email.trim())){setErr("Enter the email address you signed up with.");return;}
    setLoading(true);setErr("");
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:appUrl()});
    setLoading(false);
    if(error){setErr(friendlyAuthError(error));return;}
    go("reset-sent");
  }

  if(mode==="splash")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body" style={{justifyContent:"center"}}>
        <div className="auth-logo-wrap" style={{paddingTop:0}}>
          <img className="auth-logo-mark" src={LOGO} alt="Lift'd logo"/>
          <div className="auth-logo-name">Lift'd</div>
          <div className="auth-logo-tag">Lift together</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="auth-btn" onClick={()=>go("signup")}>Create New Account</button>
        </div>
      </div>
      <div className="auth-footer">Already have an account? <button onClick={()=>go("signin")}>Sign In</button></div>
    </div>
  );
  if(mode==="check-email"||mode==="reset-sent")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body" style={{justifyContent:"center",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>📬</div>
        <div style={{fontSize:24,fontWeight:800,letterSpacing:"-0.5px",marginBottom:10}}>Check your email</div>
        <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6,marginBottom:28}}>
          {mode==="check-email"
            ?<>We sent a link to <strong style={{color:"var(--text)"}}>{email.trim()}</strong>. Tap it to finish creating your account.</>
            :<>If an account exists for <strong style={{color:"var(--text)"}}>{email.trim()}</strong>, we sent a link to reset your password.</>}
        </div>
        <button className="auth-btn" onClick={()=>go("signin")}>Back to Sign In</button>
      </div>
    </div>
  );
  if(mode==="forgot")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body"><div style={{paddingTop:56,marginBottom:28}}><button onClick={()=>go("signin")} style={backBtn}>← Back</button><div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",marginBottom:8}}>Reset Password</div><div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>Enter your email and we'll send a reset link.</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}<input className="auth-input" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><button className="auth-btn" onClick={sendReset} disabled={loading}>{loading?"Sending…":"Send Reset Link"}</button></div>
      </div>
    </div>
  );
  if(mode==="signin")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body">
        <div className="auth-logo-wrap" style={{paddingTop:44,paddingBottom:24}}><img className="auth-logo-mark" src={LOGO} alt="Lift'd logo"/><div className="auth-logo-name">Lift'd</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
          <input className="auth-input" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
          <PasswordInput className="auth-input" autoComplete="current-password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}/>
          <div className="auth-forgot"><button onClick={()=>go("forgot")}>Forgot password?</button></div>
          <button className="auth-btn" onClick={signIn} disabled={loading}>{loading?"Signing in…":"Sign In"}</button>
        </div>
      </div>
      <div className="auth-footer">Don't have an account? <button onClick={()=>go("signup")}>Sign Up</button></div>
    </div>
  );
  if(mode==="signup")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body">
        <div className="auth-logo-wrap" style={{paddingTop:32,paddingBottom:20}}><img className="auth-logo-mark" src={LOGO} alt="Lift'd logo"/><div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px",textAlign:"center"}}>Create Account</div><div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Free — start tracking in under a minute.</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
          <input className="auth-input" autoComplete="name" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>
          <input className="auth-input" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
          <select className="auth-input" value={skill} onChange={e=>setSkill(e.target.value)} style={{cursor:"pointer"}}>
            <option value="">Experience level…</option>
            {SKILL_TAGS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button className="auth-btn" onClick={continueToCredentials}>Continue</button>
        </div>
      </div>
      <div className="auth-footer">Already have an account? <button onClick={()=>go("signin")}>Sign In</button></div>
    </div>
  );
  const bad=["invalid","taken"].includes(usernameStatus.state);
  return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body">
        <div style={{paddingTop:32,marginBottom:8}}><button onClick={()=>go("signup")} style={backBtn}>← Back</button><div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px"}}>Choose Username & Password</div><div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Almost done — secure your account.</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
          <div>
            <input className="auth-input" autoComplete="username" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)}/>
            {usernameStatus.message&&<div style={{fontSize:12,fontWeight:600,marginTop:6,paddingLeft:2,color:bad?"#FF7A6E":usernameStatus.state==="available"?"var(--accent3)":"var(--muted)"}}>{bad?"✕ ":usernameStatus.state==="available"?"✓ ":""}{usernameStatus.message}</div>}
          </div>
          <div>
            <PasswordInput className="auth-input" autoComplete="new-password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}/>
            <PasswordChecklist pass={pass}/>
          </div>
          <label className="auth-agree">
            <input type="checkbox" checked={agreed} onChange={e=>{setAgreed(e.target.checked);setErr("");}}/>
            <span>I'm 13 or older and agree to the <a href={TERMS_URL} target="_blank" rel="noopener">Terms of Use</a> and <a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy Policy</a>. Lift'd has zero tolerance for abusive or objectionable content.</span>
          </label>
          <button className="auth-btn" onClick={signUp} disabled={loading}>{loading?"Creating…":"Create Account"}</button>
        </div>
      </div>
      <div className="auth-footer">Already have an account? <button onClick={()=>go("signin")}>Sign In</button></div>
    </div>
  );
}

// Shown after opening a password-reset link: Supabase has signed the user in just to set a new password.
export function NewPasswordScreen({onDone}){
  const [pass,setPass]=useState(""); const [confirm,setConfirm]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [done,setDone]=useState(false);
  async function save(){
    if(!PASSWORD_RULES.every(r=>r.test(pass))){setErr("Password does not meet all requirements.");return;}
    if(pass!==confirm){setErr("Passwords don't match.");return;}
    setLoading(true);setErr("");
    const {error}=await supabase.auth.updateUser({password:pass});
    setLoading(false);
    if(error){setErr(friendlyAuthError(error));return;}
    setDone(true);
  }
  return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body" style={done?{justifyContent:"center",textAlign:"center"}:undefined}>
        {done?(<>
          <div style={{fontSize:48,marginBottom:16}}>✅</div>
          <div style={{fontSize:24,fontWeight:800,letterSpacing:"-0.5px",marginBottom:10}}>Password updated</div>
          <div style={{fontSize:14,color:"var(--muted)",marginBottom:28}}>You're signed in with your new password.</div>
          <button className="auth-btn" onClick={onDone}>Continue to Lift'd</button>
        </>):(<>
          <div style={{paddingTop:56,marginBottom:28}}><div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",marginBottom:8}}>Set a new password</div><div style={{fontSize:14,color:"var(--muted)"}}>Choose a new password for your account.</div></div>
          <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
            <div><PasswordInput className="auth-input" autoComplete="new-password" placeholder="New password" value={pass} onChange={e=>setPass(e.target.value)}/><PasswordChecklist pass={pass}/></div>
            <PasswordInput className="auth-input" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>
            <button className="auth-btn" onClick={save} disabled={loading}>{loading?"Saving…":"Save new password"}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}
