import { hasProfanity, PROFANITY_MESSAGE } from "./profanity";

// Client-side input rules. The database enforces the same username format (profiles.username check),
// and Supabase Auth stores passwords securely on the server.
export const PASSWORD_RULES = [
  {label:"At least 8 characters", test:pw=>pw.length>=8},
  {label:"One uppercase letter", test:pw=>/[A-Z]/.test(pw)},
  {label:"One lowercase letter", test:pw=>/[a-z]/.test(pw)},
  {label:"One number", test:pw=>/[0-9]/.test(pw)},
  {label:"One special character", test:pw=>/[^A-Za-z0-9]/.test(pw)},
];

export function validateUsername(name){const u=name.trim();if(!u)return"Username is required.";if(!/^[a-zA-Z0-9_.]{3,20}$/.test(u))return"Use 3–20 letters, numbers, _ or . (no spaces).";if(hasProfanity(u,true))return"That username isn't allowed — please pick another";return"";}

// Turns Supabase Auth errors into plain-English messages.
export function friendlyAuthError(err){
  const m=(err?.message||"").toLowerCase();
  if(m.includes("invalid login credentials"))return"Incorrect email or password.";
  if(m.includes("email not confirmed"))return"Please confirm your email first — check your inbox for the link.";
  if(m.includes("already registered")||m.includes("already been registered"))return"An account with that email already exists. Sign in instead.";
  if(m.includes("banned"))return"This account has been suspended for breaking our Terms of Use. If you think this is a mistake, email support@joinliftd.com.";
  if(m.includes("objectionable_language"))return PROFANITY_MESSAGE;
  if(m.includes("database error saving new user"))return"That username was just taken — please choose another.";
  if(m.includes("not authorized"))return"Sign-up emails aren't enabled yet. Please try again soon.";
  if(m.includes("rate limit")||m.includes("too many"))return"Too many attempts — please wait a few minutes and try again.";
  if(m.includes("failed to fetch")||m.includes("network"))return"Can't reach the server — check your connection and try again.";
  return err?.message||"Something went wrong. Please try again.";
}
