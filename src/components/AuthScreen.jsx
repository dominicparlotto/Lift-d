import { useState } from "react";
import { SKILL_TAGS } from "../data/social";
import { PASSWORD_RULES, validateUsername, isUsernameTaken, isEmailTaken, findAccount, hashPassword, newSalt, newAccount } from "../utils/accounts";

// Logo mark lives at the site root (public/favicon.svg); the app is served from /app/, so it's one level up.
const LOGO="../favicon.svg";

export default function AuthScreen({accounts,onCreateAccount,onSignIn}){
  // The homepage links to app/#signup and app/#signin to open the right screen directly.
  const [mode,setMode]=useState(()=>({"#signup":"signup","#signin":"signin"})[window.location.hash]||"splash");
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [name,setName]=useState(""); const [username,setUsername]=useState("");
  const [skill,setSkill]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const go=cb=>{setLoading(true);setErr("");setTimeout(()=>{setLoading(false);cb();},800);};

  const usernameError=username.trim()?validateUsername(username):"";
  const usernameTaken=!usernameError&&isUsernameTaken(accounts,username);
  const passValid=PASSWORD_RULES.every(r=>r.test(pass));

  const signIn=async()=>{
    if(!email||!pass){setErr("Fill in all fields.");return;}
    setLoading(true);setErr("");
    const acc=findAccount(accounts,email);
    const ok=acc&&await hashPassword(pass,acc.salt)===acc.passwordHash;
    if(!ok){setLoading(false);setErr("Incorrect email/username or password.");return;}
    go(()=>onSignIn(acc.id));
  };
  const continueToCredentials=()=>{
    if(!name.trim()||!email.trim()){setErr("Fill in all fields.");return;}
    if(!/^\S+@\S+\.\S+$/.test(email.trim())){setErr("Enter a valid email address.");return;}
    if(isEmailTaken(accounts,email)){setErr("An account with that email already exists. Sign in instead.");return;}
    setErr("");setMode("signup-credentials");
  };
  const signUp=async()=>{
    if(!username||!pass){setErr("Fill in all fields.");return;}
    const uErr=validateUsername(username);
    if(uErr){setErr(uErr);return;}
    if(usernameTaken){setErr("That username is already taken.");return;}
    if(!passValid){setErr("Password does not meet all requirements.");return;}
    setLoading(true);setErr("");
    const salt=newSalt();
    const account=newAccount({name:name.trim(),username:username.trim(),email:email.trim(),skill:skill||"Beginner",salt,passwordHash:await hashPassword(pass,salt)});
    go(()=>onCreateAccount(account));
  };
  if(mode==="splash")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body" style={{justifyContent:"center"}}>
        <div className="auth-logo-wrap" style={{paddingTop:0}}>
          <img className="auth-logo-mark" src={LOGO} alt="Lift'd logo"/>
          <div className="auth-logo-name">Lift'd</div>
          <div className="auth-logo-tag">Lift together</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="auth-btn" onClick={()=>setMode("signup")}>Create New Account</button>
        </div>
      </div>
      <div className="auth-footer">Already have an account? <button onClick={()=>setMode("signin")}>Sign In</button></div>
    </div>
  );
  if(mode==="forgot")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body"><div style={{paddingTop:56,marginBottom:28}}><button onClick={()=>setMode("signin")} style={{background:"none",border:"none",color:"var(--accent)",font:"700 14px var(--font)",cursor:"pointer",marginBottom:20}}>← Back</button><div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",marginBottom:8}}>Reset Password</div><div style={{fontSize:14,color:"var(--muted)",lineHeight:1.6}}>Enter your email and we'll send a reset link.</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}<input className="auth-input" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><button className="auth-btn" onClick={()=>{if(!email){setErr("Enter your email.");return;}setMode("signin");}}>Send Reset Link</button></div>
      </div>
    </div>
  );
  if(mode==="signin")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body">
        <div className="auth-logo-wrap" style={{paddingTop:44,paddingBottom:24}}><img className="auth-logo-mark" src={LOGO} alt="Lift'd logo"/><div className="auth-logo-name">Lift'd</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
          <input className="auth-input" placeholder="Email or username" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input className="auth-input" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}/>
          <div className="auth-forgot"><button onClick={()=>setMode("forgot")}>Forgot password?</button></div>
          <button className="auth-btn" onClick={signIn} disabled={loading}>{loading?"Signing in…":"Sign In"}</button>
        </div>
      </div>
      <div className="auth-footer">Don't have an account? <button onClick={()=>setMode("signup")}>Sign Up</button></div>
    </div>
  );
  if(mode==="signup")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body">
        <div className="auth-logo-wrap" style={{paddingTop:32,paddingBottom:20}}><img className="auth-logo-mark" src={LOGO} alt="Lift'd logo"/><div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px",textAlign:"center"}}>Create Account</div><div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Free — start tracking in under a minute.</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
          <input className="auth-input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>
          <input className="auth-input" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
          <select className="auth-input" value={skill} onChange={e=>setSkill(e.target.value)} style={{cursor:"pointer"}}>
            <option value="">Experience level…</option>
            {SKILL_TAGS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button className="auth-btn" onClick={continueToCredentials} disabled={loading}>Continue</button>
        </div>
      </div>
      <div className="auth-footer">Already have an account? <button onClick={()=>setMode("signin")}>Sign In</button></div>
    </div>
  );
  return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body">
        <div style={{paddingTop:32,marginBottom:8}}><button onClick={()=>{setErr("");setMode("signup");}} style={{background:"none",border:"none",color:"var(--accent)",font:"700 14px var(--font)",cursor:"pointer",marginBottom:20}}>← Back</button><div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px"}}>Choose Username & Password</div><div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Almost done — secure your account.</div></div>
        <div className="auth-form">{err&&<div className="auth-error">{err}</div>}
          <div>
            <input className="auth-input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)}/>
            {username.trim()!==""&&(
              <div style={{fontSize:12,fontWeight:600,marginTop:6,paddingLeft:2,color:usernameError||usernameTaken?"#FF7A6E":"var(--accent3)"}}>
                {usernameError?`✕ ${usernameError}`:usernameTaken?"✕ Username is already taken":"✓ Username is available"}
              </div>
            )}
          </div>
          <div>
            <input className="auth-input" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}/>
            {pass.trim()!==""&&(
              <div style={{marginTop:8,paddingLeft:2,display:"flex",flexDirection:"column",gap:4}}>
                {PASSWORD_RULES.map(r=>{
                  const ok=r.test(pass);
                  return <div key={r.label} style={{fontSize:12,fontWeight:600,color:ok?"var(--accent3)":"var(--muted)"}}>{ok?"✓":"○"} {r.label}</div>;
                })}
              </div>
            )}
          </div>
          <button className="auth-btn" onClick={signUp} disabled={loading}>{loading?"Creating…":"Create Account"}</button>
          <div className="auth-terms">By signing up you agree to our <span style={{color:"var(--accent)"}}>Terms</span> and <span style={{color:"var(--accent)"}}>Privacy Policy</span>.</div>
        </div>
      </div>
      <div className="auth-footer">Already have an account? <button onClick={()=>setMode("signin")}>Sign In</button></div>
    </div>
  );
}

