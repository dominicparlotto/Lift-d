import { useState, useMemo } from "react";
import { SKILL_TAGS, MOCK_POSTS, CLIP_POSTS, INITIAL_GYMS } from "../data/social";

const PASSWORD_RULES = [
  {label:"At least 8 characters", test:pw=>pw.length>=8},
  {label:"One uppercase letter", test:pw=>/[A-Z]/.test(pw)},
  {label:"One lowercase letter", test:pw=>/[a-z]/.test(pw)},
  {label:"One number", test:pw=>/[0-9]/.test(pw)},
  {label:"One special character", test:pw=>/[^A-Za-z0-9]/.test(pw)},
];

export default function AuthScreen({onAuth}){
  const [mode,setMode]=useState("splash");
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [name,setName]=useState(""); const [username,setUsername]=useState("");
  const [skill,setSkill]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const go=cb=>{setLoading(true);setErr("");setTimeout(()=>{setLoading(false);cb();},800);};

  const takenUsernames=useMemo(()=>{
    const s=new Set();
    MOCK_POSTS.forEach(p=>s.add(p.user.toLowerCase()));
    CLIP_POSTS.forEach(p=>s.add(p.user.toLowerCase()));
    INITIAL_GYMS.forEach(g=>g.leaderboard.forEach(l=>s.add(l.user.toLowerCase())));
    return s;
  },[]);
  const usernameTaken=username.trim()!==""&&takenUsernames.has(username.trim().toLowerCase());
  const passValid=PASSWORD_RULES.every(r=>r.test(pass));

  const signIn=()=>{if(!email||!pass){setErr("Fill in all fields.");return;}go(()=>onAuth({name:name||email.split("@")[0],username:username||email.split("@")[0],email,skill:"Powerlifter"}));};
  const continueToCredentials=()=>{if(!name||!email){setErr("Fill in all fields.");return;}setErr("");setMode("signup-credentials");};
  const signUp=()=>{
    if(!username||!pass){setErr("Fill in all fields.");return;}
    if(usernameTaken){setErr("That username is already taken.");return;}
    if(!passValid){setErr("Password does not meet all requirements.");return;}
    go(()=>onAuth({name,username,email,skill:skill||"Beginner"}));
  };
  if(mode==="splash")return(
    <div className="auth-screen"><div className="auth-glow-1"/><div className="auth-glow-2"/>
      <div className="auth-body" style={{justifyContent:"center"}}>
        <div className="auth-logo-wrap" style={{paddingTop:0}}>
          <div className="auth-logo-icon">🏋️</div>
          <div className="auth-logo-name">Lift'd</div>
          <div className="auth-logo-tag">Your fitness. Your community.</div>
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
        <div className="auth-logo-wrap" style={{paddingTop:44,paddingBottom:24}}><div className="auth-logo-icon">🏋️</div><div className="auth-logo-name">Lift'd</div></div>
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
        <div className="auth-logo-wrap" style={{paddingTop:32,paddingBottom:20}}><div className="auth-logo-icon">🏋️</div><div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px",textAlign:"center"}}>Create Account</div><div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Join thousands of athletes today.</div></div>
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
              <div style={{fontSize:12,fontWeight:600,marginTop:6,paddingLeft:2,color:usernameTaken?"#FF7A6E":"var(--accent3)"}}>
                {usernameTaken?"✕ Username is already taken":"✓ Username is available"}
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

