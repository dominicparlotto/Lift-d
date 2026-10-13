import { useState } from "react";

// A password field with an eye button to show/hide what you're typing. Takes the same props as <input>.
export default function PasswordInput({style,...props}){
  const [show,setShow]=useState(false);
  return(
    <div className="pw-wrap">
      <input {...props} type={show?"text":"password"} autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{...style,width:"100%",paddingRight:46}}/>
      <button type="button" className="pw-toggle" onClick={()=>setShow(s=>!s)} aria-label={show?"Hide password":"Show password"} aria-pressed={show}>
        {show
          ?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          :<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
      </button>
    </div>
  );
}
