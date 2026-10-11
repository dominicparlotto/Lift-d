import { INITIAL_GYMS } from "../data/social";

// Prototype account store: accounts live in this browser's localStorage until there's a real backend.
// Passwords are salted + PBKDF2-hashed so plain text is never stored — but this is NOT production
// security (everything is client-side). A real launch needs server-side auth.
const ACCOUNTS_KEY="liftd.accounts.v1";
const SESSION_KEY="liftd.session.v1";

export const PASSWORD_RULES = [
  {label:"At least 8 characters", test:pw=>pw.length>=8},
  {label:"One uppercase letter", test:pw=>/[A-Z]/.test(pw)},
  {label:"One lowercase letter", test:pw=>/[a-z]/.test(pw)},
  {label:"One number", test:pw=>/[0-9]/.test(pw)},
  {label:"One special character", test:pw=>/[^A-Za-z0-9]/.test(pw)},
];

// Everything a brand-new account starts with — no stats, no history.
export const EMPTY_DATA={bio:"",location:"",avatar:null,posts:[],workouts:{},food:{},savedClips:[],following:[],friends:{}};

// Usernames already used by community members in the gym mock data.
const RESERVED=new Set(INITIAL_GYMS.flatMap(g=>[...g.leaderboard,...(g.liveNow||[])].map(u=>u.user.toLowerCase())));

export function loadAccounts(){try{return JSON.parse(localStorage.getItem(ACCOUNTS_KEY))||{};}catch{return{};}}
export function saveAccounts(accounts){try{localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(accounts));}catch{/* storage full or blocked — keep working in memory */}}
export function loadSession(){try{return localStorage.getItem(SESSION_KEY);}catch{return null;}}
export function saveSession(id){try{if(id)localStorage.setItem(SESSION_KEY,id);else localStorage.removeItem(SESSION_KEY);}catch{/* ignore */}}

export function validateUsername(name){const u=name.trim();if(!u)return"Username is required.";if(!/^[a-zA-Z0-9_.]{3,20}$/.test(u))return"Use 3–20 letters, numbers, _ or . (no spaces).";return"";}
export function isUsernameTaken(accounts,username,exceptId){const u=username.trim().toLowerCase();if(!u)return false;if(RESERVED.has(u))return true;return Object.values(accounts).some(a=>a.id!==exceptId&&a.username.toLowerCase()===u);}
export function isEmailTaken(accounts,email){const e=email.trim().toLowerCase();return Object.values(accounts).some(a=>a.email.toLowerCase()===e);}
export function findAccount(accounts,login){const l=login.trim().toLowerCase();return Object.values(accounts).find(a=>a.email.toLowerCase()===l||a.username.toLowerCase()===l)||null;}

const toHex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
export function newSalt(){return toHex(crypto.getRandomValues(new Uint8Array(16)));}
export async function hashPassword(password,salt){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:100000,hash:"SHA-256"},key,256);
  return toHex(bits);
}

export function newAccount({name,username,email,skill,salt,passwordHash}){
  return{id:crypto.randomUUID(),name,username,email,skill,salt,passwordHash,createdAt:Date.now(),...EMPTY_DATA};
}
